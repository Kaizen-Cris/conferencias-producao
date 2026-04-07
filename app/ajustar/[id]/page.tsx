'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'
import { onlyDigits } from '../../../lib/onlyDigits'
import { sanitizeText } from '../../../lib/sanitize'
import Popup from '../../../components/popup'

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
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Sucesso')
  const [popupMessage, setPopupMessage] = useState('')


  // campos de ajuste
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixaItem, setQtdPorCaixaItem] = useState<number | null>(null)
  const [avulsas, setAvulsas] = useState('0')
  const [motivo, setMotivo] = useState('')

  const totalUnidades = useMemo(() => {
    const c = Number(caixas || 0)
    const q = Number(qtdPorCaixaItem || 0)
    const a = Number(avulsas || 0)

    const cOk = Number.isFinite(c) ? c : 0
    const qOk = Number.isFinite(q) ? q : 0
    const aOk = Number.isFinite(a) ? a : 0

    return cOk * qOk + aOk
  }, [caixas, qtdPorCaixaItem, avulsas])

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
      setAvulsas(String(m.unidades_avulsas ?? 0))

      const { data: itemData } = await supabase
        .from('itens')
        .select('qtd_por_caixa')
        .eq('nome', m.item)
        .eq('ativo', true)
        .single()

      if (itemData) {
        setQtdPorCaixaItem(itemData.qtd_por_caixa)
      }
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
      if (r !== 'OPERADOR' && r !== 'ADMIN' && r !== 'SUPERVISOR') {
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
        setPopupMessage('Você precisa estar logado.')
        setPopupOpen(true)
        return
      }

      if (!mov) return

      if (!motivo.trim()) {
        setPopupMessage('Informe o motivo do ajuste (obrigatório).')
        setPopupOpen(true)
        return
      }

      const motivoSanitizado = sanitizeText(motivo, { maxLen: 200 })
      if (!motivoSanitizado) {
        setPopupMessage('Informe o motivo do ajuste (obrigatório).')
        setPopupOpen(true)
        return
      }

      if (totalUnidades <= 0) {
        setPopupMessage('O total em unidades deve ser maior que zero.')
        setPopupOpen(true)
        return
      }

      const caixasOk = Number(caixas || 0)
      const qtdPorCaixaOk = qtdPorCaixaItem ?? 0
      const avulsasOk = Number(avulsas || 0)

      const { error: errAjuste } = await supabase.from('ajustes').insert([
        {
          movimentacao_id: mov.id,
          qtd_antiga: mov.qtd_informada,
          qtd_nova: totalUnidades,
          motivo: motivoSanitizado,
          ajustado_por: userId,
          tipo: 'OPERADOR',
        },
      ])

      if (errAjuste) {
        console.log('AJUSTE ERROR:', errAjuste)
        setPopupMessage('Erro ao salvar ajuste. Veja o console.')
        setPopupOpen(true)
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
        setPopupMessage('Erro ao atualizar movimentação. Veja o console.')
        setPopupOpen(true)
        return
      }

      setPopupMessage('Ajuste salvo! Status: RECONFERIR')
      setPopupOpen(true)
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
  if (role !== 'OPERADOR' && role !== 'ADMIN' && role !== 'SUPERVISOR') {
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
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        variant="success"
        onClose={() => setPopupOpen(false)}
      />

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
            value={qtdPorCaixaItem !== null && Number.isFinite(qtdPorCaixaItem) && qtdPorCaixaItem > 0 ? String(qtdPorCaixaItem) : ''}
            placeholder={qtdPorCaixaItem !== null ? 'Carregado automaticamente' : 'Carregando...'}
            inputMode="numeric"
            disabled
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
