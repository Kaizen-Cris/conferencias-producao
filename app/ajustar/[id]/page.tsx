'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

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

  const movIdRaw = params?.id
  const movId = Array.isArray(movIdRaw) ? movIdRaw[0] : movIdRaw

  const [mov, setMov] = useState<Mov | null>(null)
  const [loading, setLoading] = useState(true)

  // campos de ajuste
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [avulsas, setAvulsas] = useState('0')
  const [motivo, setMotivo] = useState('')

  const totalUnidades = useMemo(() => {
    const c = parseInt(caixas || '0', 10)
    const q = parseInt(qtdPorCaixa || '0', 10)
    const a = parseInt(avulsas || '0', 10)

    const cOk = Number.isNaN(c) ? 0 : c
    const qOk = Number.isNaN(q) ? 0 : q
    const aOk = Number.isNaN(a) ? 0 : a

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

    // pré-preenche com valores atuais (se existirem)
    if (m) {
      setCaixas(String(m.caixas ?? ''))
      setQtdPorCaixa(String(m.qtd_por_caixa ?? ''))
      setAvulsas(String(m.unidades_avulsas ?? 0))
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!movId) return
    carregar(String(movId))
  }, [movId])

  async function salvarAjuste() {
    // 1) pegar usuário logado
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      alert('Você precisa estar logado.')
      return
    }

    if (!mov) return

    // 2) validações
    if (!motivo.trim()) {
      alert('Informe o motivo do ajuste (obrigatório).')
      return
    }

    if (totalUnidades <= 0) {
      alert('O total em unidades deve ser maior que zero.')
      return
    }

    const caixasInt = parseInt(caixas || '0', 10)
    const qtdPorCaixaInt = parseInt(qtdPorCaixa || '0', 10)
    const avulsasInt = parseInt(avulsas || '0', 10)

    const caixasOk = Number.isNaN(caixasInt) ? 0 : caixasInt
    const qtdPorCaixaOk = Number.isNaN(qtdPorCaixaInt) ? 0 : qtdPorCaixaInt
    const avulsasOk = Number.isNaN(avulsasInt) ? 0 : avulsasInt

    // 3) gravar ajuste (auditável)
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

    // 4) atualizar movimentação com novos números + status AJUSTADO
    const { error: errMov } = await supabase
      .from('movimentacoes')
      .update({
        qtd_informada: totalUnidades,
        caixas: caixasOk,
        qtd_por_caixa: qtdPorCaixaOk,
        unidades_avulsas: avulsasOk,
        status: 'AJUSTADO',
      })
      .eq('id', mov.id)

    if (errMov) {
      console.log('UPDATE MOV ERROR:', errMov)
      alert('Erro ao atualizar movimentação. Veja o console.')
      return
    }

    alert('Ajuste salvo! Status: AJUSTADO')
    router.push('/divergencias')
  }

  if (!movId) return <div style={{ padding: 40 }}>Carregando...</div>
  if (loading) return <div style={{ padding: 40 }}>Carregando...</div>
  if (!mov) return <div style={{ padding: 40 }}>Movimentação não encontrada.</div>

  return (
    <div style={{ padding: 40, maxWidth: 520 }}>
      <h1>Ajustar Divergência</h1>

      <div style={{ padding: 12, border: '1px solid #ddd', marginBottom: 16 }}>
        <div><b>Item:</b> {mov.item}</div>
        <div><b>Lote:</b> {mov.lote}</div>
        <div><b>Informado atual:</b> {mov.qtd_informada} unidades</div>
        <div><b>Status:</b> {mov.status}</div>
      </div>

      <label>Caixas</label>
      <input
        value={caixas}
        onChange={(e) => setCaixas(e.target.value)}
        placeholder="Ex: 2"
        inputMode="numeric"
        style={{ display: 'block', marginBottom: 10, width: '100%' }}
      />

      <label>Quantidade por caixa</label>
      <input
        value={qtdPorCaixa}
        onChange={(e) => setQtdPorCaixa(e.target.value)}
        placeholder="Ex: 10"
        inputMode="numeric"
        style={{ display: 'block', marginBottom: 10, width: '100%' }}
      />

      <label>Unidades avulsas</label>
      <input
        value={avulsas}
        onChange={(e) => setAvulsas(e.target.value)}
        placeholder="Ex: 3"
        inputMode="numeric"
        style={{ display: 'block', marginBottom: 10, width: '100%' }}
      />

      <p style={{ marginTop: 0, opacity: 0.85 }}>
        <b>Total em unidades:</b> {totalUnidades}
      </p>

      <label>Motivo do ajuste (obrigatório)</label>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ex: conferência anterior digitada incorretamente / caixa incompleta / etc."
        style={{ display: 'block', marginBottom: 16, width: '100%', minHeight: 80 }}
      />

      <button onClick={salvarAjuste} style={{ width: '100%' }}>
        Salvar ajuste
      </button>

      <button
        onClick={() => router.push('/divergencias')}
        style={{ width: '100%', marginTop: 10 }}
      >
        Voltar
      </button>
    </div>
  )
}
