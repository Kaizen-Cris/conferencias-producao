'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Menu from '../../components/menu'
import { onlyDigits } from '../../lib/onlyDigits'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../../lib/auth'

type ItemRow = { id: string; nome: string }

export default function RegistrarPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [guardLoading, setGuardLoading] = useState(true)

  // form movimentação
  const [lote, setLote] = useState('')
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [unidadesAvulsas, setUnidadesAvulsas] = useState('0')

  // itens
  const [itens, setItens] = useState<ItemRow[]>([])
  const [itemId, setItemId] = useState('')
  const [itemBusca, setItemBusca] = useState('')

  const totalUnidades = useMemo(() => {
    const c = Number(caixas || 0)
    const q = Number(qtdPorCaixa || 0)
    const a = Number(unidadesAvulsas || 0)

    const cOk = Number.isFinite(c) ? c : 0
    const qOk = Number.isFinite(q) ? q : 0
    const aOk = Number.isFinite(a) ? a : 0

    return cOk * qOk + aOk
  }, [caixas, qtdPorCaixa, unidadesAvulsas])

  // Guard: garante que conferente não entra aqui
  useEffect(() => {
    let mounted = true

    async function guard() {
      setGuardLoading(true)

      const { data } = await supabase.auth.getSession()
      const s = data.session

      if (!mounted) return

      if (!s) {
        router.replace('/')
        return
      }

      const r = await getMyRole()
      if (!mounted) return

      if (r === 'CONFERENTE') {
        router.replace('/pendentes')
        return
      }

      setRole(r)
      setGuardLoading(false)
    }

    guard()
    return () => { mounted = false }
  }, [router])

  // carregar itens (somente quando passou no guard)
  useEffect(() => {
    async function carregarItens() {
      if (!role) return

      const { data, error } = await supabase
        .from('itens')
        .select('id,nome')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      console.log('ITENS DATA:', data)
      console.log('ITENS ERROR:', error)

      setItens((data as ItemRow[]) ?? [])
    }

    carregarItens()
  }, [role])

  async function handleSalvarMovimentacao() {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      alert('Você precisa estar logado.')
      router.replace('/')
      return
    }

    if (!itemId) {
      alert('Selecione um item.')
      return
    }

    const itemSelecionado = itens.find((x) => x.id === itemId)
    if (!itemSelecionado) {
      alert('Item inválido. Recarregue a página e tente novamente.')
      return
    }

    if (!lote.trim()) {
      alert('Preencha o lote.')
      return
    }

    if (totalUnidades <= 0) {
      alert('Informe caixas e quantidade por caixa (e/ou unidades avulsas). O total deve ser maior que zero.')
      return
    }

    const caixasNum = Number(caixas || 0)
    const qtdPorCaixaNum = Number(qtdPorCaixa || 0)
    const avulsasNum = Number(unidadesAvulsas || 0)

    const { error } = await supabase.from('movimentacoes').insert([
      {
        item: itemSelecionado.nome,
        lote: lote.trim(),
        qtd_informada: totalUnidades,
        caixas: caixasNum,
        qtd_por_caixa: qtdPorCaixaNum,
        unidades_avulsas: avulsasNum,
        status: 'PENDENTE',
        criado_por: userId,
      },
    ])

    if (error) {
      console.log('INSERT ERROR:', error)
      alert('Erro ao salvar movimentação. Veja o console.')
      return
    }

    alert('Movimentação salva com sucesso!')

    setItemId('')
    setItemBusca('')
    setLote('')
    setCaixas('')
    setQtdPorCaixa('')
    setUnidadesAvulsas('0')
  }

  const itensFiltrados = itens.filter((x) =>
    x.nome.toLowerCase().includes(itemBusca.trim().toLowerCase())
  )

  if (guardLoading) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
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
            <h1 style={{ margin: 0 }}>Registrar Movimentação</h1>
          </div>

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            Status inicial será <b>PENDENTE</b>.
          </p>

          <label>Item</label>

          {/* se quiser reativar a busca futuramente, só descomentar */}
          {/* <input className="input" value={itemBusca} onChange={(e) => setItemBusca(e.target.value)} placeholder="Buscar item..." /> */}

          <select
            className="select"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
          >
            <option value="">Selecione um item</option>
            {itensFiltrados.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>

          <label>Lote</label>
          <input
            className="input"
            value={lote}
            onChange={(e) => setLote(onlyDigits(e.target.value))}
            placeholder="Ex: 6000"
          />

          <label>Caixas</label>
          <input
            className="input"
            value={caixas}
            onChange={(e) => setCaixas(onlyDigits(e.target.value))}
            placeholder="Ex: 4"
            inputMode="numeric"
          />

          <label>Quantidade por caixa</label>
          <input
            className="input"
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(onlyDigits(e.target.value))}
            placeholder="Ex: 12"
            inputMode="numeric"
          />

          <label>Unidades avulsas (opcional)</label>
          <input
            className="input"
            value={unidadesAvulsas}
            onChange={(e) => setUnidadesAvulsas(onlyDigits(e.target.value))}
            placeholder="Ex: 3"
            inputMode="numeric"
          />

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            <b>Total em unidades:</b> {totalUnidades}
          </p>

          <button className="btn" onClick={handleSalvarMovimentacao} style={{ width: '100%' }}>
            Salvar movimentação
          </button>
        </div>
      </div>
    </div>
  )
}
