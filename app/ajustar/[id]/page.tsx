'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'
import { onlyDigits } from '../../../lib/onlyDigits'

type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  caixas: number | null
  qtd_por_caixa: number | null
  unidades_avulsas: number
  status: string
  criado_por: string
  criado_em: string
}

export default function AjustarPage() {
  const params = useParams()
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const movIdRaw = params?.id
  const movId = Array.isArray(movIdRaw) ? movIdRaw[0] : movIdRaw

  const [mov, setMov] = useState<Mov | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)


  // campos de ajuste
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [avulsas, setAvulsas] = useState('0')
  const [motivo, setMotivo] = useState('')

  const totalUnidades = useMemo(() => {
    const c = Number(caixas || 0)
    const q = Number(qtdPorCaixa || 0)
    const a = Number(avulsas || 0)

    const cOk = Number.isFinite(c) ? c : 0
    const qOk = Number.isFinite(q) ? q : 0
    const aOk = Number.isFinite(a) ? a : 0

    return cOk * qOk + aOk
  }, [caixas, qtdPorCaixa, avulsas])

  async function carregar(id: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select(
        'id,item,lote,qtd_informada,caixas,qtd_por_caixa,unidades_avulsas,status,criado_por,criado_em'
      )
      .eq('id', id)
      .single()

    console.log('MOV AJUSTE DATA:', data)
    console.log('MOV AJUSTE ERROR:', error)

    const m = (data as Mov) ?? null
    setMov(m)

    if (m) {
      setCaixas(String(m.caixas ?? ''))
      setQtdPorCaixa(String(m.qtd_por_caixa ?? ''))
      setAvulsas(String(m.unidades_avulsas ?? 0))
    }

    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      // ✅ se ainda não tem id, não tenta carregar, mas também não “pisca”
      if (!movId) {
        setLoading(false)
        return
      }

      // ✅ se não tem permissão, não carrega e desliga loading
      if (r !== 'OPERADOR' && r !== 'ADMIN') {
        setLoading(false)
        return
      }

      // ✅ autorizado: carrega
      await carregar(String(movId))
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movId])

  async function salvarAjuste() {
    if (saving) return
    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id

      if (!userId) {
        alert('Você precisa estar logado.')
        return
      }

      if (!mov) return

      if (!motivo.trim()) {
        alert('Informe o motivo do ajuste (obrigatório).')
        return
      }

      if (totalUnidades <= 0) {
        alert('O total em unidades deve ser maior que zero.')
        return
      }

      const caixasOk = Number(caixas || 0)
      const qtdPorCaixaOk = Number(qtdPorCaixa || 0)
      const avulsasOk = Number(avulsas || 0)

      const { error: errAjuste } = await supabase.from('ajustes').insert([
        {
          movimentacao_id: mov.id,
          qtd_antiga: mov.qtd_informada,
          qtd_nova: totalUnidades,
          motivo: motivo.trim(),
          ajustado_por: userId,
          tipo: 'OPERADOR',
        },
      ])

      if (errAjuste) {
        console.log('AJUSTE ERROR:', errAjuste)
        alert('Erro ao salvar ajuste. Veja o console.')
        return
      }

      const { error: errMov } = await supabase
        .from('movimentacoes')
        .update({
          qtd_informada: totalUnidades,
          caixas: caixasOk,
          qtd_por_caixa: qtdPorCaixaOk,
          unidades_avulsas: avulsasOk,
          status: 'RECONFERIR',
        })
        .eq('id', mov.id)

      if (errMov) {
        console.log('UPDATE MOV ERROR:', errMov)
        alert('Erro ao atualizar movimentação. Veja o console.')
        return
      }

      alert('Ajuste salvo! Status: RECONFERIR')
      router.push('/divergencias')
    } finally {
      setSaving(false)
    }
  }


  // ✅ UM ÚNICO “loading state” visual (sem piscar layout)
  if (authLoading || loading) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </div>
    )
  }

  // ✅ Permissão
  if (role !== 'OPERADOR' && role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1 style={{ marginTop: 0 }}>Ajustar</h1>
            <p>Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Não encontrado / id inválido
  if (!movId || !mov) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Movimentação não encontrada.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Menu />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Ajustar Divergência</h1>

            <button className="btn" disabled={saving} onClick={() => router.push('/divergencias')}>
              Voltar
            </button>
          </div>

          <div className="card" style={{ boxShadow: 'none', marginBottom: 12 }}>
            <div><b>Item:</b> {mov.item}</div>
            <div><b>Lote:</b> {mov.lote}</div>
            <div><b>Informado atual:</b> {mov.qtd_informada} unidades</div>
            <div><b>Status:</b> {mov.status}</div>
          </div>

          <label>Caixas</label>
          <input
            className="input"
            value={caixas}
            onChange={(e) => setCaixas(onlyDigits(e.target.value))}
            disabled={saving}
            placeholder="Ex: 2"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <label>Quantidade por caixa</label>
          <input
            className="input"
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(onlyDigits(e.target.value))}
            disabled={saving}
            placeholder="Ex: 10"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <label>Unidades avulsas</label>
          <input
            className="input"
            value={avulsas}
            onChange={(e) => setAvulsas(onlyDigits(e.target.value))}
            disabled={saving}
            placeholder="Ex: 3"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            <b>Total em unidades:</b> {totalUnidades}
          </p>

          <label>Motivo do ajuste (obrigatório)</label>
          <textarea
            className="textarea"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={saving}
            placeholder="Ex: conferência anterior digitada incorretamente / caixa incompleta / etc."
            rows={3}
          />

          <div style={{ height: 12 }} />

          <button
            className="btn"
            onClick={salvarAjuste}
            disabled={saving}
            style={{ width: '100%', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Salvando...' : 'Salvar ajuste'}
          </button>

        </div>
      </div>
    </div>
  )
}
