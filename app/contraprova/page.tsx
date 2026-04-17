'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Menu from '../../components/menu'
import { onlyDigits } from '../../lib/onlyDigits'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../../lib/auth'
import { sanitizeText } from '../../lib/sanitize'
import Popup from '../../components/popup'
import DatePickerInput from '@/components/DatePickerInput'
import { FaFilter as Filter, FaUpload as Upload, FaSync as Sync, FaPrint as Print } from 'react-icons/fa'
import * as XLSX from 'xlsx'

type ItemRow = {
  id: string
  nome: string
  qtd_por_caixa: number | null
}

type ContraprovaRow = {
  id: string
  produto: string
  lote: string
  data_retirada: string
  data_vencimento: string
  criado_em: string
  criado_por: string
  status?: string
}

export default function ContraprovaPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [guardLoading, setGuardLoading] = useState(true)

  const [contraprovas, setContraprovas] = useState<ContraprovaRow[]>([])
  const [contraprovasFiltradas, setContraprovasFiltradas] = useState<ContraprovaRow[]>([])
  const [busca, setBusca] = useState('')
  const [mostrarVencidas, setMostrarVencidas] = useState(false)
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  const [itens, setItens] = useState<ItemRow[]>([])
  const [itemId, setItemId] = useState('')
  const [itemBusca, setItemBusca] = useState('')
  const [lote, setLote] = useState('')
  const [dataRetirada, setDataRetirada] = useState<Date | null>(null)
  const [dataVencimento, setDataVencimento] = useState<Date | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Sucesso')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('warning')
  const [formPopupOpen, setFormPopupOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<ContraprovaRow | null>(null)
  const [popupAction, setPopupAction] = useState<(() => void) | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const buscaSanitizada = sanitizeText(itemBusca, { maxLen: 80 }).toLowerCase()
  const itensFiltrados = itens.filter((x) => x.nome.toLowerCase().includes(buscaSanitizada))

  const itemSelecionado = useMemo(() => itens.find((x) => x.id === itemId) ?? null, [itens, itemId])
  const isAdmin = role === 'ADMIN'

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

      // Only allow CONFERENTE, ADMIN and QUALIDADE (read-only)
      if (r !== 'CONFERENTE' && r !== 'ADMIN' && r !== 'QUALIDADE') {
        router.replace('/')
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

  const aplicarFiltros = useCallback(() => {
    const agora = new Date()
    let filtradas = [...contraprovas]

    if (busca.trim()) {
      const buscaSanitizada = sanitizeText(busca, { maxLen: 80 }).toLowerCase()
      filtradas = filtradas.filter(c => 
        c.produto.toLowerCase().includes(buscaSanitizada) ||
        c.lote.toLowerCase().includes(buscaSanitizada)
      )
    }

    if (!mostrarVencidas) {
      filtradas = filtradas.filter(c => {
        const vencimento = new Date(c.data_vencimento)
        return vencimento >= agora
      })
    }

    if (!mostrarExcluidos) {
      filtradas = filtradas.filter(c => (c.status || '').toUpperCase() !== 'EXCLUIDO')
    }

    setContraprovasFiltradas(filtradas)
  }, [busca, mostrarVencidas, mostrarExcluidos, contraprovas])

  async function carregarContraprovas() {
    if (!role) return

    const { data, error } = await supabase
      .from('contraprovas')
      .select('id,produto,lote,data_retirada,data_vencimento,criado_em,criado_por,status')
      .order('data_retirada', { ascending: false })
      .order('criado_em', { ascending: false })

    if (error) {
      console.log('ERRO AO CARREGAR CONTRA PROVAS:', error)
      return
    }

    setContraprovas(data as ContraprovaRow[] ?? [])
    aplicarFiltros()
  }

  useEffect(() => {
    carregarContraprovas()
  }, [role, aplicarFiltros])

  useEffect(() => {
    aplicarFiltros()
  }, [mostrarVencidas, mostrarExcluidos])

  useEffect(() => {
    async function carregarItens() {
      if (!role) return

      const { data, error } = await supabase
        .from('itens')
        .select('id,nome,qtd_por_caixa')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) {
        console.log('ERRO AO CARREGAR ITENS:', error)
        return
      }

      setItens(data as ItemRow[] ?? [])
    }

    carregarItens()
   }, [role])

  function showAlert(message: string, title = 'Sucesso') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupVariant('success')
    setPopupOpen(true)
  }

  function showError(message: string) {
    setPopupTitle('Erro')
    setPopupMessage(message)
    setPopupVariant('alert')
    setPopupOpen(true)
  }

  function gerarRelatorioValidos() {
    const agora = new Date()
    const validos = contraprovas.filter(c => {
      const isExcluido = (c.status || '').toUpperCase() === 'EXCLUIDO'
      const isVencido = new Date(c.data_vencimento) < agora
      return !isExcluido && !isVencido
    })

    if (validos.length === 0) {
      showError('Nenhuma contraprova válida para imprimir.')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Contraprovas Válidas</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #eee; }
          .print-date { text-align: center; margin-bottom: 20px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Contraprovas Válidas</h1>
        <p class="print-date">Data de geração: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Lote</th>
              <th>Data Retirada</th>
              <th>Data Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${validos.map(c => `
              <tr>
                <td>${c.produto}</td>
                <td>${c.lote}</td>
                <td>${new Date(c.data_retirada).toLocaleDateString()}</td>
                <td>${new Date(c.data_vencimento).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
  }

  function showConfirm(message: string, onConfirm: () => void, title = 'Confirmar') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupVariant('confirm')
    setPopupAction(() => onConfirm)
    setPopupOpen(true)
  }

  async function excluirContraprova(id: string) {
    if (!role || (role !== 'ADMIN' && role !== 'CONFERENTE')) {
      showError('Apenas administradores e conferentes podem excluir registros.')
      return
    }
    setDeletingId(id)
    const { error } = await supabase
      .from('contraprovas')
      .update({ status: 'EXCLUIDO' })
      .eq('id', id)
    setDeletingId(null)
    if (error) {
      showError('Não foi possível excluir. Verifique suas permissões.')
      return
    }
    setContraprovas(prev => prev.map(c => c.id === id ? { ...c, status: 'EXCLUIDO' } : c))
    aplicarFiltros()
  }

  async function restaurarContraprova(id: string) {
    if (!isAdmin) {
      showError('Apenas administradores podem restaurar registros.')
      return
    }
    const { error } = await supabase
      .from('contraprovas')
      .update({ status: null })
      .eq('id', id)
    if (error) {
      showError('Não foi possível restaurar.')
      return
    }
    setContraprovas(prev => prev.map(c => c.id === id ? { ...c, status: undefined } : c))
    aplicarFiltros()
  }

  function iniciarEdicao(c: ContraprovaRow) {
    if (!isAdmin) {
      showError('Apenas administradores podem editar registros.')
      return
    }
    setEditData(c)
    setEditingId(c.id)
    setItemBusca(c.produto)
    setLote(c.lote)
    setDataRetirada(new Date(c.data_retirada))
    setDataVencimento(new Date(c.data_vencimento))
    const itemEncontrado = itens.find(x => x.nome === c.produto)
    setItemId(itemEncontrado?.id || '')
    setFormPopupOpen(true)
  }

  async function handleSalvarEdicao() {
    if (!editData) return
    
    const { error } = await supabase
      .from('contraprovas')
      .update({
        produto: itemSelecionado?.nome || editData.produto,
        lote: lote.trim(),
        data_retirada: dataRetirada?.toISOString(),
        data_vencimento: dataVencimento?.toISOString(),
      })
      .eq('id', editData.id)

    if (error) {
      showError('Erro ao salvar edição.')
      return
    }

    setContraprovas(prev => prev.map(c => {
      if (c.id === editData.id) {
        return {
          ...c,
          produto: itemSelecionado?.nome || editData.produto,
          lote: lote.trim(),
          data_retirada: dataRetirada?.toISOString() || c.data_retirada,
          data_vencimento: dataVencimento?.toISOString() || c.data_vencimento,
        }
      }
      return c
    }))
    aplicarFiltros()
    cancelarEdicao()
    showAlert('Contraprova atualizada com sucesso!')
  }

  function cancelarEdicao() {
    setEditingId(null)
    setEditData(null)
    setItemId('')
    setItemBusca('')
    setLote('')
    setDataRetirada(null)
    setDataVencimento(null)
    setFormPopupOpen(false)
  }

  async function handleSalvarContraprova() {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id
    const userName = session.session?.user?.user_metadata?.name ?? 'Usuário'

    if (!userId) {
      showError('Você precisa estar logado.')
      router.replace('/')
      return
    }

    if (!itemId) {
      showError('Selecione um produto.')
      return
    }

    if (!itemSelecionado) {
      showError('Produto inválido. Recarregue a página e tente novamente.')
      return
    }

    if (!lote.trim()) {
      showError('Preencha o lote.')
      return
    }

    if (!dataRetirada) {
      showError('Selecione a data de retirada.')
      return
    }

    if (!dataVencimento) {
      showError('Selecione a data de vencimento.')
      return
    }

    const { error } = await supabase.from('contraprovas').insert([
      {
        produto: itemSelecionado.nome,
        lote: lote.trim(),
        data_retirada: dataRetirada.toISOString(),
        data_vencimento: dataVencimento.toISOString(),
        criado_por: userName,
        status: null,
      },
    ])

    if (error) {
      console.log('INSERT ERROR:', error)
      showError('Erro ao salvar contraprova. Veja o console.')
      return
    }

    showAlert('Contraprova salva com sucesso!', 'Sucesso')

    // Reset form
    setItemId('')
    setItemBusca('')
    setLote('')
    setDataRetirada(null)
    setDataVencimento(null)

    // Refresh data
    const { data: refreshData, error: refreshError } = await supabase
      .from('contraprovas')
      .select('id,produto,lote,data_retirada,data_vencimento,criado_em,criado_por')
      .order('criado_em', { ascending: false })

    if (!refreshError) {
      setContraprovas(refreshData as ContraprovaRow[] ?? [])
      aplicarFiltros()
    }
  }

  async function handleImportarExcel(file: File) {
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
      
      const { data: session } = await supabase.auth.getSession()
      const userName = session.session?.user?.user_metadata?.name ?? 'Usuário'

      let salvos = 0
      let erros = 0

      for (const row of data) {
        const produto = String(row['Produto'] || row['produto'] || row['PRODUTO'] || '').trim()
        const lote = String(row['Lote'] || row['lote'] || row['LOTE'] || '').trim()
        const dataRetiradaStr = row['Data de Retirada'] || row['data_retirada'] || row['DATA DE RETIRADA'] || ''
        const dataVencimentoStr = row['Data de Vencimento'] || row['data_vencimento'] || row['DATA DE VENCIMENTO'] || ''

        if (!produto || !lote) {
          erros++
          continue
        }

        let dataRetirada: Date | null = null
        let dataVencimento: Date | null = null

        if (dataRetiradaStr) {
          if (typeof dataRetiradaStr === 'number') {
            dataRetirada = new Date((dataRetiradaStr - 25569) * 86400 * 1000)
          } else if (typeof dataRetiradaStr === 'string') {
            dataRetirada = new Date(dataRetiradaStr)
          }
        }

        if (dataVencimentoStr) {
          if (typeof dataVencimentoStr === 'number') {
            dataVencimento = new Date((dataVencimentoStr - 25569) * 86400 * 1000)
          } else if (typeof dataVencimentoStr === 'string') {
            dataVencimento = new Date(dataVencimentoStr)
          }
        }

        if (!dataRetirada || !dataVencimento || isNaN(dataRetirada.getTime()) || isNaN(dataVencimento.getTime())) {
          erros++
          continue
        }

        const { error: insertError } = await supabase.from('contraprovas').insert([
          {
            produto,
            lote,
            data_retirada: dataRetirada.toISOString(),
            data_vencimento: dataVencimento.toISOString(),
            criado_por: userName,
            status: null,
          },
        ])

        if (insertError) {
          console.log('ERRO AO IMPORTAR:', insertError)
          erros++
        } else {
          salvos++
        }
      }

      if (salvos > 0) {
        const { data: refreshData } = await supabase
          .from('contraprovas')
          .select('id,produto,lote,data_retirada,data_vencimento,criado_em,criado_por,status')
.order('data_retirada', { ascending: false })

        setContraprovas(refreshData as ContraprovaRow[] ?? [])
        aplicarFiltros()
      }

      showAlert(`Importação concluída: ${salvos} registros salvos, ${erros} erros.`)
    } catch (err) {
      console.log('ERRO AO LER EXCEL:', err)
      showError('Erro ao ler arquivo Excel.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
        onClose={() => {
          setPopupOpen(false)
          setPopupAction(null)
        }}
        onConfirm={popupAction ?? undefined}
      />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0 }}>Contraprova</h1>
            <button 
              className="btn" 
              onClick={gerarRelatorioValidos}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', background: '#007bff', border: 'none', color: 'white' }}
            >
              <Print /> Imprimir válidas
            </button>
            <button 
              className="btn" 
              onClick={carregarContraprovas}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px' }}
            >
              <Sync /> Atualizar
            </button>
          </div>

          {/* Busca e ações */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar histórico</label>
              <input
                className="input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Produto, lote..."
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button 
                className="btn" 
                onClick={() => setFormPopupOpen(true)}
                style={{ flex: 1, background: '#28a745', border: 'none', color: 'white' }}
              >
                Incluir lançamento
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportarExcel(file)
                }}
                style={{ display: 'none' }}
              />
              <button 
                className="btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Upload /> {importing ? 'Importando...' : 'Importar Excel'}
              </button>
              <div style={{ position: 'relative', flex: 1 }}>
                <button 
                  className="btn" 
                  onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Filter /> Filtros
                </button>
                {filterMenuOpen && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    background: 'white', 
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '12px',
                    zIndex: 100,
                    marginTop: 4,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mostrarVencidas}
                        onChange={(e) => setMostrarVencidas(e.target.checked)}
                      />
                      Mostrar vencidas
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mostrarExcluidos}
                        onChange={(e) => setMostrarExcluidos(e.target.checked)}
                      />
                      Mostrar excluídos
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Histórico */}
          <div style={{ marginBottom: 20 }}>
            <h2>Histórico de lançamentos</h2>
            {contraprovasFiltradas.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Nenhum lançamento encontrado.</p>
            ) : (
              <>
                {/* Mobile */}
                <div className="show-mobile">
                  {contraprovasFiltradas.map((c) => {
                    const isExcluido = (c.status || '').toUpperCase() === 'EXCLUIDO'
                    const isVencido = new Date(c.data_vencimento) < new Date()
                    return (
                      <div 
                        key={c.id} 
                        className="list-item"
                        style={{ opacity: isExcluido ? 0.6 : 1, marginBottom: 12 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{c.produto}</div>
                          <div style={{ 
                            fontSize: 12, 
                            fontWeight: 'bold',
                            color: isExcluido ? '#dc3545' : isVencido ? '#dc3545' : '#28a745',
                          }}>
                            {isExcluido ? 'EXCLUÍDO' : isVencido ? 'VENCIDO' : 'VÁLIDO'}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                          <b>Lote:</b> {c.lote}
                        </div>
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                          <b>Retirada:</b> {new Date(c.data_retirada).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                          <b>Vencimento:</b> {new Date(c.data_vencimento).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!isExcluido && isAdmin && (
                            <button 
                              className="btn" 
                              onClick={() => iniciarEdicao(c)}
                              style={{ flex: 1 }}
                            >
                              Editar
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              className="btn" 
                              onClick={() => showConfirm('Tem certeza que deseja excluir?', () => excluirContraprova(c.id))}
                              disabled={deletingId === c.id || isExcluido}
                              style={{ flex: 1, background: isExcluido ? '#6c757d' : '#dc3545', border: 'none', color: 'white' }}
                            >
                              {deletingId === c.id ? '...' : isExcluido ? 'Excluído' : 'Excluir'}
                            </button>
                          )}
                          {isExcluido && isAdmin && (
                            <button 
                              className="btn" 
                              onClick={() => showConfirm('Restaurar este registro?', () => restaurarContraprova(c.id))}
                              style={{ flex: 1, background: '#28a745', border: 'none', color: 'white' }}
                            >
                              Restaurar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop */}
                <div className="hide-mobile">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Produto</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Lote</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Data de Retirada</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Data de Vencimento</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contraprovasFiltradas.map((c) => {
                        const isExcluido = (c.status || '').toUpperCase() === 'EXCLUIDO'
                        const isVencido = new Date(c.data_vencimento) < new Date()
                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6', opacity: isExcluido ? 0.6 : 1 }}>
                            <td style={{ padding: '8px' }}>{c.produto}</td>
                            <td style={{ padding: '8px' }}>{c.lote}</td>
                            <td style={{ padding: '8px' }}>{new Date(c.data_retirada).toLocaleDateString()}</td>
                            <td style={{ padding: '8px' }}>
                              {new Date(c.data_vencimento).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {isExcluido ? (
                                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>EXCLUÍDO</span>
                              ) : isVencido ? (
                                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>VENCIDO</span>
                              ) : (
                                <span style={{ color: '#28a745', fontWeight: 'bold' }}>VÁLIDO</span>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {!isExcluido && isAdmin && (
                                  <button 
                                    className="btn" 
                                    onClick={() => iniciarEdicao(c)}
                                    style={{ padding: '4px 8px', fontSize: 12 }}
                                  >
                                    Editar
                                  </button>
                                )}
                                {isAdmin && (
                                  <button 
                                    className="btn" 
                                    onClick={() => showConfirm('Tem certeza que deseja excluir?', () => excluirContraprova(c.id))}
                                    disabled={deletingId === c.id || isExcluido}
                                    style={{ padding: '4px 8px', fontSize: 12, background: isExcluido ? '#6c757d' : '#dc3545', border: 'none', color: 'white' }}
                                  >
                                    {deletingId === c.id ? '...' : isExcluido ? 'Excluído' : 'Excluir'}
                                  </button>
                                )}
                                {isExcluido && isAdmin && (
                                  <button 
                                    className="btn" 
                                    onClick={() => showConfirm('Restaurar este registro?', () => restaurarContraprova(c.id))}
                                    style={{ padding: '4px 8px', fontSize: 12, background: '#28a745', border: 'none', color: 'white' }}
                                  >
                                    Restaurar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

{/* Popup para incluir/editar lançamento */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: formPopupOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
                <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar lançamento' : 'Incluir lançamento'}</h2>
                
                <label>Produto</label>
                <input
                  className="input"
                  value={itemBusca}
                  onChange={(e) => setItemBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  style={{ marginTop: 8 }}
                  disabled={!!editingId}
                />
                
                <select
                  className="select"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
                  disabled={!!editingId}
                >
                  <option value="">Selecione um produto</option>
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
                  onChange={(e) => setLote(e.target.value.toUpperCase().replace(/[^0-9A-Z\/]/g, ''))}
                  placeholder="Ex: 6000/AB"
                  style={{ marginTop: 8, marginBottom: 12 }}
                />
                
                 <label>Data de Retirada</label>
                 <DatePickerInput
                   value={dataRetirada}
                   onChange={(date) => setDataRetirada(date)}
                   placeholder="dd/mm/aaaa"
                   style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
                 />
                 
                 <label>Data de Vencimento</label>
                 <DatePickerInput
                   value={dataVencimento}
                   onChange={(date) => setDataVencimento(date)}
                   placeholder="dd/mm/aaaa"
                   style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
                 />
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    className="btn" 
                    onClick={editingId ? handleSalvarEdicao : handleSalvarContraprova}
                    style={{ flex: 1 }}
                  >
                    {editingId ? 'Salvar edição' : 'Salvar lançamento'}
                  </button>
                  <button 
                    className="btn" 
                    onClick={cancelarEdicao}
                    style={{ flex: 1, background: '#6c757d', border: 'none' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}