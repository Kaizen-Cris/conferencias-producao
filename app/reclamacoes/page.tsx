'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import Menu from '../../components/menu'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../../lib/auth'
import { sanitizeText, removeAccents } from '../../lib/sanitize'
import Popup from '../../components/popup'
import { FaFilter as Filter, FaSync as Sync } from 'react-icons/fa'

type ItemRow = {
  id: string
  nome: string
  qtd_por_caixa: number | null
}

type ReclamacaoRow = {
  id: string
  cliente: string
  produto: string
  lote: string
  descricao: string
  codigo_rastreio: string | null
  status: string
  criado_em: string
  criado_por: string
}

const STATUS_OPTIONS = ['EM ANÁLISE', 'A ENVIAR', 'ENVIADA', 'ENTREGUE']

export default function ReclamacoesPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [guardLoading, setGuardLoading] = useState(true)

const [reclamacoes, setReclamacoes] = useState<ReclamacaoRow[]>([])
  const [busca, setBusca] = useState('')
  const [mostrarPendentes, setMostrarPendentes] = useState(true)
  const [mostrarEnviados, setMostrarEnviados] = useState(false)
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Sucesso')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('warning')
  const [formPopupOpen, setFormPopupOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<ReclamacaoRow | null>(null)
  const [popupAction, setPopupAction] = useState<(() => void) | null>(null)

  const [cliente, setCliente] = useState('')
  const [lote, setLote] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigoRastreio, setCodigoRastreio] = useState('')
  const [status, setStatus] = useState('EM ANÁLISE')

  const [itens, setItens] = useState<ItemRow[]>([])
  const [itemId, setItemId] = useState('')
  const [itemBusca, setItemBusca] = useState('')

  const buscaSanitizada = sanitizeText(itemBusca, { maxLen: 80 }).toLowerCase()
  const itensFiltrados = itens.filter((x) => x.nome.toLowerCase().includes(buscaSanitizada))

  const itemSelecionado = useMemo(() => itens.find((x) => x.id === itemId) ?? null, [itens, itemId])

  const isAdmin = role === 'ADMIN'
  const isQualidade = role === 'QUALIDADE'
  const canInclude = isAdmin || isQualidade

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

      if (r !== 'ADMIN' && r !== 'QUALIDADE') {
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

  const reclamacoesFiltradas = useMemo(() => {
    let resultado = reclamacoes

    if (mostrarPendentes) {
      resultado = resultado.filter(c => c.status === 'EM ANÁLISE' || c.status === 'A ENVIAR')
    } else if (mostrarEnviados) {
      resultado = resultado.filter(c => c.status === 'ENVIADA' || c.status === 'ENTREGUE')
    } else if (mostrarExcluidos) {
      resultado = resultado.filter(c => c.status === 'EXCLUIDO')
    } else {
      resultado = []
    }

    if (busca.trim()) {
      const buscaSemAcento = removeAccents(sanitizeText(busca, { maxLen: 80 })).toLowerCase()
      resultado = resultado.filter(c => 
        removeAccents(c.cliente || '').toLowerCase().includes(buscaSemAcento) ||
        removeAccents(c.produto).toLowerCase().includes(buscaSemAcento) ||
        removeAccents(c.lote).toLowerCase().includes(buscaSemAcento) ||
        removeAccents(c.descricao).toLowerCase().includes(buscaSemAcento) ||
        removeAccents(c.codigo_rastreio || '').toLowerCase().includes(buscaSemAcento)
      )
    }

    return resultado
  }, [busca, mostrarPendentes, mostrarEnviados, mostrarExcluidos, reclamacoes])

  async function carregarReclamacoes() {
    if (!role) return

    const { data, error } = await supabase
      .from('reclamacoes')
      .select('id,cliente,produto,lote,descricao,codigo_rastreio,status,criado_em,criado_por')
      .order('criado_em', { ascending: false })

    if (error) {
      console.log('ERRO AO CARREGAR RECLAMAÇÕES:', error)
      return
    }

    setReclamacoes(data as ReclamacaoRow[] ?? [])
  }

  useEffect(() => {
    carregarReclamacoes()
  }, [role])

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

  function showConfirm(message: string, onConfirm: () => void, title = 'Confirmar') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupVariant('confirm')
    setPopupAction(() => onConfirm)
    setPopupOpen(true)
  }

  async function excluirReclamacao(id: string) {
    if (!role || (role !== 'ADMIN' && role !== 'QUALIDADE')) {
      showError('Apenas administradores e qualidade podem excluir registros.')
      return
    }
    const { error } = await supabase
      .from('reclamacoes')
      .update({ status: 'EXCLUIDO' })
      .eq('id', id)
    if (error) {
      showError('Não foi possível excluir. Verifique suas permissões.')
      return
    }
    setReclamacoes(prev => prev.map(c => c.id === id ? { ...c, status: 'EXCLUIDO' } : c))
  }

  function iniciarEdicao(c: ReclamacaoRow) {
    const itemEncontrado = itens.find(x => x.nome === c.produto)
    setEditData(c)
    setEditingId(c.id)
    setCliente(c.cliente)
    setItemId(itemEncontrado?.id || '')
    setItemBusca(c.produto)
    setLote(c.lote)
    setDescricao(c.descricao)
    setCodigoRastreio(c.codigo_rastreio || '')
    setStatus(c.status)
    setFormPopupOpen(true)
  }

  async function handleSalvarEdicao() {
    if (!editData) return

    const { error } = await supabase
      .from('reclamacoes')
      .update({
        cliente: cliente.trim(),
        produto: itemSelecionado?.nome || editData.produto,
        lote: lote.trim(),
        descricao: descricao.trim(),
        codigo_rastreio: codigoRastreio.trim() || null,
        status: status,
      })
      .eq('id', editData.id)

    if (error) {
      showError('Erro ao salvar edição.')
      return
    }

    setReclamacoes(prev => prev.map(c => {
      if (c.id === editData.id) {
        return {
          ...c,
          cliente: cliente.trim(),
          produto: itemSelecionado?.nome || editData.produto,
          lote: lote.trim(),
          descricao: descricao.trim(),
          codigo_rastreio: codigoRastreio.trim() || null,
          status: status,
        }
      }
      return c
    }))
    cancelarEdicao()
    showAlert('Reclamação atualizada com sucesso!')
  }

  function cancelarEdicao() {
    setEditingId(null)
    setEditData(null)
    setCliente('')
    setItemId('')
    setItemBusca('')
    setLote('')
    setDescricao('')
    setCodigoRastreio('')
    setStatus('EM ANÁLISE')
    setFormPopupOpen(false)
  }

  async function handleSalvarReclamacao() {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user?.id
    const userName = session.session?.user?.user_metadata?.name ?? 'Usuário'

    if (!userId) {
      showError('Você precisa estar logado.')
      router.replace('/')
      return
    }

    if (!cliente.trim()) {
      showError('Preencha o cliente.')
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

    if (!descricao.trim()) {
      showError('Preencha a descrição.')
      return
    }

    const { error } = await supabase.from('reclamacoes').insert([
      {
        cliente: cliente.trim(),
        produto: itemSelecionado.nome,
        lote: lote.trim(),
        descricao: descricao.trim(),
        codigo_rastreio: codigoRastreio.trim() || null,
        status: status,
        criado_por: userName,
      },
    ])

    if (error) {
      console.log('INSERT ERROR:', error)
      showError('Erro ao salvar reclamação. Veja o console.')
      return
    }

    showAlert('Reclamação salva com sucesso!', 'Sucesso')

    setCliente('')
    setItemId('')
    setItemBusca('')
    setLote('')
    setDescricao('')
    setCodigoRastreio('')
    setStatus('EM ANÁLISE')

    const { data: refreshData, error: refreshError } = await supabase
      .from('reclamacoes')
      .select('id,cliente,produto,lote,descricao,codigo_rastreio,status,criado_em,criado_por')
      .order('criado_em', { ascending: false })

    if (!refreshError) {
      setReclamacoes(refreshData as ReclamacaoRow[] ?? [])
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'EM ANÁLISE': return '#dc3545'
      case 'A ENVIAR': return '#ffc107'
      case 'ENVIADA': return '#17a2b8'
      case 'ENTREGUE': return '#28a745'
      default: return '#6c757d'
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
            <h1 style={{ margin: 0 }}>Reclamações</h1>
            <button 
              className="btn" 
              onClick={carregarReclamacoes}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px' }}
            >
              <Sync /> Atualizar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                className="input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Produto, lote, descrição, rastreio..."
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {canInclude && (
              <button 
                className="btn" 
                onClick={() => setFormPopupOpen(true)}
                style={{ flex: 1, background: '#28a745', border: 'none', color: 'white' }}
              >
                Nova reclamação
              </button>
              )}
              
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
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    padding: '16px',
                    zIndex: 100,
                    marginTop: 8,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 14, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      Filtrar por status
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: mostrarPendentes ? '#f8f9fa' : 'transparent', transition: 'background 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={mostrarPendentes}
                        onChange={(e) => setMostrarPendentes(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#28a745' }}
                      />
                      <span style={{ fontWeight: 500, color: '#495057' }}>Pendentes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: mostrarEnviados ? '#f8f9fa' : 'transparent', transition: 'background 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={mostrarEnviados}
                        onChange={(e) => setMostrarEnviados(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#17a2b8' }}
                      />
                      <span style={{ fontWeight: 500, color: '#495057' }}>Enviados</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: mostrarExcluidos ? '#f8f9fa' : 'transparent', transition: 'background 0.2s' }}>
                      <input
                        type="checkbox"
                        checked={mostrarExcluidos}
                        onChange={(e) => setMostrarExcluidos(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#dc3545' }}
                      />
                      <span style={{ fontWeight: 500, color: '#495057' }}>Excluídos</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h2>Registro de reclamações</h2>
            {reclamacoesFiltradas.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Nenhuma reclamação encontradas.</p>
            ) : (
              <>
                <div className="show-mobile">
                  {reclamacoesFiltradas.map((c) => (
                    <div 
                      key={c.id} 
                      className="list-item"
                      style={{ marginBottom: 12 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{c.cliente}</div>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 'bold',
                          color: getStatusColor(c.status),
                        }}>
                          {c.status}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        <b>Produto:</b> {c.produto}
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        <b>Lote:</b> {c.lote}
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        <b>Criado em:</b> {new Date(c.criado_em).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(isAdmin || isQualidade) && (
                          <>
                            <button 
                              className="btn" 
                              onClick={() => iniciarEdicao(c)}
                              style={{ flex: 1 }}
                            >
                              Editar status
                            </button>
                            <button 
                              className="btn" 
                              onClick={() => showConfirm('Tem certeza que deseja excluir?', () => excluirReclamacao(c.id))}
                              style={{ flex: 1, background: '#dc3545', border: 'none', color: 'white' }}
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hide-mobile">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Cliente</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Produto</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Lote</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Criado em</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reclamacoesFiltradas.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '8px' }}>{c.cliente}</td>
                          <td style={{ padding: '8px' }}>{c.produto}</td>
                          <td style={{ padding: '8px' }}>{c.lote}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ color: getStatusColor(c.status), fontWeight: 'bold' }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '8px' }}>{new Date(c.criado_em).toLocaleString()}</td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(isAdmin || isQualidade) && (
                                <>
                                  <button 
                                    className="btn" 
                                    onClick={() => iniciarEdicao(c)}
                                    style={{ padding: '4px 8px', fontSize: 12 }}
                                  >
                                    Editar
                                  </button>
                                  <button 
                                    className="btn" 
                                    onClick={() => showConfirm('Tem certeza que deseja excluir?', () => excluirReclamacao(c.id))}
                                    style={{ padding: '4px 8px', fontSize: 12, background: '#dc3545', border: 'none', color: 'white' }}
                                  >
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: formPopupOpen ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar reclamação' : 'Nova reclamação'}</h2>

              <label>Cliente</label>
              <input
                className="input"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                style={{ marginTop: 8, marginBottom: 12 }}
              />

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
              
              <label>Descrição</label>
              <textarea
                className="input"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da reclamação"
                style={{ marginTop: 8, marginBottom: 12, minHeight: '80px' }}
              />
              
              <label>Código de Rastreio (opcional)</label>
              <input
                className="input"
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value)}
                placeholder="Código de rastreio"
                style={{ marginTop: 8, marginBottom: 12 }}
              />
              
              <label>Status</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
             
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn" 
                  onClick={editingId ? handleSalvarEdicao : handleSalvarReclamacao}
                  style={{ flex: 1 }}
                >
                  {editingId ? 'Salvar' : 'Salvar reclamação'}
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