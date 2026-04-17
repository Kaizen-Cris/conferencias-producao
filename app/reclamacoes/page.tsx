'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Menu from '../../components/menu'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../../lib/auth'
import { sanitizeText } from '../../lib/sanitize'
import Popup from '../../components/popup'
import DatePickerInput from '@/components/DatePickerInput'
import { FaFilter as Filter, FaSync as Sync } from 'react-icons/fa'

type ReclamacaoRow = {
  id: string
  produto: string
  lote: string
  descricao: string
  codigo_rastreio: string | null
  status: string
  criado_em: string
  criado_por: string
}

const STATUS_OPTIONS = ['EM ABERTO', 'EM PROCESSO', 'ENVIADA', 'ENTREGUE']

export default function ReclamacoesPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [guardLoading, setGuardLoading] = useState(true)

  const [reclamacoes, setReclamacoes] = useState<ReclamacaoRow[]>([])
  const [reclamacoesFiltradas, setReclamacoesFiltradas] = useState<ReclamacaoRow[]>([])
  const [busca, setBusca] = useState('')
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Sucesso')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('warning')
  const [formPopupOpen, setFormPopupOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<ReclamacaoRow | null>(null)
  const [popupAction, setPopupAction] = useState<(() => void) | null>(null)

  const [produto, setProduto] = useState('')
  const [lote, setLote] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigoRastreio, setCodigoRastreio] = useState('')
  const [status, setStatus] = useState('EM ABERTO')

  const isAdmin = role === 'ADMIN'
  const isQualidade = role === 'QUALIDADE'

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

  const aplicarFiltros = useCallback(() => {
    let filtradas = [...reclamacoes]

    if (busca.trim()) {
      const buscaSanitizada = sanitizeText(busca, { maxLen: 80 }).toLowerCase()
      filtradas = filtradas.filter(c => 
        c.produto.toLowerCase().includes(buscaSanitizada) ||
        c.lote.toLowerCase().includes(buscaSanitizada) ||
        c.descricao.toLowerCase().includes(buscaSanitizada) ||
        (c.codigo_rastreio || '').toLowerCase().includes(buscaSanitizada)
      )
    }

    if (!mostrarTodas) {
      filtradas = filtradas.filter(c => c.status !== 'ENTREGUE')
    }

    setReclamacoesFiltradas(filtradas)
  }, [busca, mostrarTodas, reclamacoes])

  async function carregarReclamacoes() {
    if (!role) return

    const { data, error } = await supabase
      .from('reclamacoes')
      .select('id,produto,lote,descricao,codigo_rastreio,status,criado_em,criado_por')
      .order('criado_em', { ascending: false })

    if (error) {
      console.log('ERRO AO CARREGAR RECLAMAÇÕES:', error)
      return
    }

    setReclamacoes(data as ReclamacaoRow[] ?? [])
    aplicarFiltros()
  }

  useEffect(() => {
    carregarReclamacoes()
  }, [role, aplicarFiltros])

  useEffect(() => {
    aplicarFiltros()
  }, [mostrarTodas])

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

  function iniciarEdicao(c: ReclamacaoRow) {
    setEditData(c)
    setEditingId(c.id)
    setProduto(c.produto)
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
        produto: produto.trim(),
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
          produto: produto.trim(),
          lote: lote.trim(),
          descricao: descricao.trim(),
          codigo_rastreio: codigoRastreio.trim() || null,
          status: status,
        }
      }
      return c
    }))
    aplicarFiltros()
    cancelarEdicao()
    showAlert('Reclamação atualizada com sucesso!')
  }

  function cancelarEdicao() {
    setEditingId(null)
    setEditData(null)
    setProduto('')
    setLote('')
    setDescricao('')
    setCodigoRastreio('')
    setStatus('EM ABERTO')
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

    if (!produto.trim()) {
      showError('Preencha o produto.')
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
        produto: produto.trim(),
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

    setProduto('')
    setLote('')
    setDescricao('')
    setCodigoRastreio('')
    setStatus('EM ABERTO')

    const { data: refreshData, error: refreshError } = await supabase
      .from('reclamacoes')
      .select('id,produto,lote,descricao,codigo_rastreio,status,criado_em,criado_por')
      .order('criado_em', { ascending: false })

    if (!refreshError) {
      setReclamacoes(refreshData as ReclamacaoRow[] ?? [])
      aplicarFiltros()
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'EM ABERTO': return '#dc3545'
      case 'EM PROCESSO': return '#ffc107'
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
              <button 
                className="btn" 
                onClick={() => setFormPopupOpen(true)}
                style={{ flex: 1, background: '#28a745', border: 'none', color: 'white' }}
              >
                Nova reclamação
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mostrarTodas}
                        onChange={(e) => setMostrarTodas(e.target.checked)}
                      />
                      Mostrar entregues
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
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{c.produto}</div>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 'bold',
                          color: getStatusColor(c.status),
                        }}>
                          {c.status}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        <b>Lote:</b> {c.lote}
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        <b>Descrição:</b> {c.descricao}
                      </div>
                      {c.codigo_rastreio && (
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                          <b>Rastreio:</b> {c.codigo_rastreio}
                        </div>
                      )}
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                        <b>Criado em:</b> {new Date(c.criado_em).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(isAdmin || isQualidade) && (
                          <button 
                            className="btn" 
                            onClick={() => iniciarEdicao(c)}
                            style={{ flex: 1 }}
                          >
                            Editar status
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hide-mobile">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Produto</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Lote</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Descrição</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Rastreio</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Criado em</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #dee2e6' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reclamacoesFiltradas.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '8px' }}>{c.produto}</td>
                          <td style={{ padding: '8px' }}>{c.lote}</td>
                          <td style={{ padding: '8px' }}>{c.descricao}</td>
                          <td style={{ padding: '8px' }}>{c.codigo_rastreio || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ color: getStatusColor(c.status), fontWeight: 'bold' }}>{c.status}</span>
                          </td>
                          <td style={{ padding: '8px' }}>{new Date(c.criado_em).toLocaleString()}</td>
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(isAdmin || isQualidade) && (
                                <button 
                                  className="btn" 
                                  onClick={() => iniciarEdicao(c)}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                >
                                  Editar
                                </button>
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
              
              <label>Produto</label>
              <input
                className="input"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="Nome do produto"
                style={{ marginTop: 8, marginBottom: 12 }}
                disabled={!!editingId}
              />
              
              <label>Lote</label>
              <input
                className="input"
                value={lote}
                onChange={(e) => setLote(e.target.value.toUpperCase())}
                placeholder="Lote"
                style={{ marginTop: 8, marginBottom: 12 }}
                disabled={!!editingId}
              />
              
              <label>Descrição</label>
              <textarea
                className="input"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da reclamação"
                style={{ marginTop: 8, marginBottom: 12, minHeight: '80px' }}
                disabled={!!editingId}
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