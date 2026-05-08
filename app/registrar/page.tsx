'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Menu from '../../components/menu'
import { onlyDigits } from '../../lib/onlyDigits'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../../lib/auth'
import { sanitizeText } from '../../lib/sanitize'
import Popup from '../../components/popup'

type ItemRow = {
  id: string
  nome: string
  qtd_por_caixa: number | null
}

export default function RegistrarPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [guardLoading, setGuardLoading] = useState(true)

  const [lote, setLote] = useState('')
  const [caixas, setCaixas] = useState('')
  const [unidadesAvulsas, setUnidadesAvulsas] = useState('0')

  const [itens, setItens] = useState<ItemRow[]>([])
  const [itemId, setItemId] = useState('')
  const [itemBusca, setItemBusca] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Sucesso')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('warning')
  const [isSaving, setIsSaving] = useState(false)

  const itemSelecionado = useMemo(() => itens.find((x) => x.id === itemId) ?? null, [itens, itemId])
  const qtdPorCaixa = useMemo(() => {
    if (!itemSelecionado) return ''
    const qtdPadrao = Number(itemSelecionado.qtd_por_caixa)
    return Number.isFinite(qtdPadrao) && qtdPadrao > 0 ? String(qtdPadrao) : ''
  }, [itemSelecionado])

  function showAlert(message: string, title = 'Alerta') {
  setPopupTitle(title)
  setPopupMessage(message)
  setPopupVariant('alert')
  setPopupOpen(true)
  }

  function showSucess(message: string, title = 'Sucesso') {
  setPopupTitle(title)
  setPopupMessage(message)
  setPopupVariant('success')
  setPopupOpen(true)
  }

  const totalUnidades = useMemo(() => {
    const c = Number(caixas || 0)
    const q = Number(qtdPorCaixa || 0)
    const a = Number(unidadesAvulsas || 0)

    const cOk = Number.isFinite(c) ? c : 0
    const qOk = Number.isFinite(q) ? q : 0
    const aOk = Number.isFinite(a) ? a : 0

    return cOk * qOk + aOk
  }, [caixas, qtdPorCaixa, unidadesAvulsas])

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
    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    async function carregarItens() {
      if (!role) return

      const { data, error } = await supabase
        .from('itens')
        .select('id,nome,qtd_por_caixa')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      console.log('ITENS DATA:', data)
      console.log('ITENS ERROR:', error)

      setItens((data as ItemRow[]) ?? [])
    }

    carregarItens()
  }, [role])

  async function handleSalvarMovimentacao() {
    if (isSaving) return

    setIsSaving(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      showAlert('Você precisa estar logado.')
      router.replace('/')
      setIsSaving(false)
      return
    }

    if (!itemId) {
      showAlert('Selecione um item.')
      setIsSaving(false)
      return
    }

    if (!itemSelecionado) {
      showAlert('Item inválido. Recarregue a página e tente novamente.')
      setIsSaving(false)
      return
    }

    const qtdPadrao = Number(itemSelecionado.qtd_por_caixa)
    if (!Number.isFinite(qtdPadrao) || qtdPadrao <= 0) {
      showAlert('Este item está sem quantidade por caixa cadastrada. Atualize o item antes de registrar.')
      setIsSaving(false)
      return
    }

    if (!lote.trim()) {
      showAlert('Preencha o lote.')
      setIsSaving(false)
      return
    }

    if (totalUnidades <= 0) {
      showAlert('Informe caixas e quantidade por caixa (e/ou unidades avulsas). O total deve ser maior que zero.')
      setIsSaving(false)
      return
    }

    const caixasNum = Number(caixas || 0)
    const avulsasNum = Number(unidadesAvulsas || 0)

    const { error } = await supabase.from('movimentacoes').insert([
      {
        item: itemSelecionado.nome,
        lote: lote.trim(),
        qtd_informada: totalUnidades,
        caixas: caixasNum,
        qtd_por_caixa: qtdPadrao,
        unidades_avulsas: avulsasNum,
        status: 'PENDENTE',
        criado_por: userId,
      },
    ])

    if (error) {
      console.log('INSERT ERROR:', error)
      showAlert('Erro ao salvar movimentação. Veja o console.')
      setIsSaving(false)
      return
    }

    showSucess('Movimentação salva com sucesso!', 'Sucesso')

    setItemId('')
    setItemBusca('')
    setLote('')
    setCaixas('')
    setUnidadesAvulsas('0')
    setIsSaving(false)
  }

  const buscaSanitizada = sanitizeText(itemBusca, { maxLen: 80 }).toLowerCase()
  const itensFiltrados = itens.filter((x) => x.nome.toLowerCase().includes(buscaSanitizada))

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
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        variant={popupVariant}
        onClose={() => setPopupOpen(false)}
      />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Registrar Movimentação</h1>
          </div>

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            Status inicial será <b>PENDENTE</b>.
          </p>

          <label>Item</label>

          <input
            className="input"
            value={itemBusca}
            onChange={(e) => setItemBusca(e.target.value)}
            placeholder="Buscar item..."
            style={{ marginTop: 8 }}
          />

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
            placeholder={itemSelecionado ? 'Carregado automaticamente' : 'Selecione um item'}
            inputMode="numeric"
            disabled
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

          <button className="btn" onClick={handleSalvarMovimentacao} disabled={isSaving} style={{ width: '100%' }}>
            {isSaving ? 'Salvando...' : 'Salvar movimentação'}
          </button>
        </div>
      </div>
    </div>
  )
}
