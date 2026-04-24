'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import { removeAccents } from '../../lib/sanitize'
import Menu from '../../components/menu'
import StatusBadge from '../../components/statusbadge'
import Popup from '../../components/popup'

type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  status: string
  criado_em: string
}

function brDayToUtcRange(diaYYYYMMDD: string) {
  const start = new Date(`${diaYYYYMMDD}T00:00:00-03:00`).toISOString()
  const end = new Date(`${diaYYYYMMDD}T00:00:00-03:00`)
  end.setDate(end.getDate() + 1)
  return { startISO: start, endISO: end.toISOString() }
}

export default function HistoricoClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaParam = searchParams.get('dia') // YYYY-MM-DD

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Alerta')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupConfirmText, setPopupConfirmText] = useState('OK')
  const [popupShowCancel, setPopupShowCancel] = useState(false)
  const [popupAction, setPopupAction] = useState<null | (() => void)>(null)
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('alert')

  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [diaFiltro, setDiaFiltro] = useState<string>('')
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false)
  const isAdmin = role === 'ADMIN'
  const isConferente = role === 'CONFERENTE'
  const isSupervisor = role === 'SUPERVISOR'
  const canDelete = isAdmin || isConferente || isSupervisor

  async function carregar() {
    setLoading(true)

    let q = supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .order('criado_em', { ascending: false })
      .limit(200)

    if (statusFiltro !== 'TODOS') q = q.eq('status', statusFiltro)

    if (diaFiltro) {
      const { startISO, endISO } = brDayToUtcRange(diaFiltro)
      q = q.gte('criado_em', startISO).lt('criado_em', endISO)
    }

    const { data } = await q
    let rows = ((data as Mov[]) ?? [])

    if (!mostrarExcluidos) {
      rows = rows.filter((m) => (m.status || '').toUpperCase() !== 'EXCLUIDO')
    }

    setLista(rows)
    setLoading(false)
  }

  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return lista

    const buscaSemAcento = removeAccents(busca.trim()).toLowerCase()
    return lista.filter((m) => 
      removeAccents(m.item).toLowerCase().includes(buscaSemAcento) ||
      removeAccents(m.lote).toLowerCase().includes(buscaSemAcento)
    )
  }, [busca, lista])

  function showAlert(message: string, title = 'Alerta') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupConfirmText('OK')
    setPopupShowCancel(false)
    setPopupAction(null)
    setPopupVariant('alert')
    setPopupOpen(true)
  }

  function showConfirm(message: string, onConfirm: () => void, title = 'Alerta') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupConfirmText('Excluir')
    setPopupShowCancel(true)
    setPopupAction(() => onConfirm)
    setPopupVariant('confirm')
    setPopupOpen(true)
  }

  async function excluirMov(id: string) {
    if (!canDelete) {
      showAlert('Apenas administradores, conferentes e supervisores podem excluir registros.')
      return
    }
    setDeletingId(id)
    const { error } = await supabase
      .from('movimentacoes')
      .update({ status: 'EXCLUIDO' })
      .eq('id', id)
    setDeletingId(null)
    if (error) {
      showAlert('Não foi possível excluir. Verifique suas permissões e tente novamente.')
      return
    }
    setLista((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'EXCLUIDO' } : m)))
  }

  function showRestoreConfirm(message: string, onConfirm: () => void, title = 'Confirmar Restauração') {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupConfirmText('Restaurar')
    setPopupShowCancel(true)
    setPopupAction(() => onConfirm)
    setPopupVariant('confirm')
    setPopupOpen(true)
  }

  async function restaurarMov(id: string) {
    if (!isAdmin) {
      showAlert('Apenas administradores podem restaurar registros excluídos.')
      return
    }
    setRestoringId(id)
    const { error } = await supabase
      .from('movimentacoes')
      .update({ status: 'PENDENTE' })
      .eq('id', id)
    setRestoringId(null)
    if (error) {
      showAlert('Não foi possível restaurar. Verifique suas permissões e tente novamente.')
      return
    }
    setLista((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'PENDENTE' } : m)))
  }

  // role
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setAuthLoading(true)
      const r = await getMyRole()
      if (!mounted) return
      setRole(r)
      setAuthLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  // URL -> state
  useEffect(() => {
    if (diaParam) setDiaFiltro(diaParam)
    else setDiaFiltro('')
  }, [diaParam])

  // reload on filters
  useEffect(() => {
    if (role === 'OPERADOR' || role === 'ADMIN' || role === 'CONFERENTE' || role === 'SUPERVISOR') carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFiltro, diaFiltro, mostrarExcluidos])

  if (authLoading) {
    return (
      <div>
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
        confirmText={popupConfirmText}
        showCancel={popupShowCancel}
        variant={popupVariant}
        onConfirm={popupAction ?? undefined}
        onClose={() => {
          setPopupOpen(false)
          setPopupAction(null)
        }}
      />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Histórico</h1>
            <button className="btn" onClick={carregar}>Atualizar</button>
          </div>

          <div className="filters-row">
            {diaFiltro && (
              <div className="filters-chip">
                <span className="badge reconferir">Dia: {diaFiltro}</span>
                <button
                  className="btn"
                  type="button"
                  onClick={() => router.push('/historico')}
                >
                  Limpar dia
                </button>
              </div>
            )}

            <select className="select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="RECONFERIR">Reconferir</option>
              <option value="DIVERGENTE">Divergente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="EXCLUIDO">Excluído</option>
            </select>

            <input
              className="input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por item ou lote"
              style={{ flex: 1 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setMostrarExcluidos((prev) => !prev)
              }}
              style={{
                backgroundColor: mostrarExcluidos ? '#dc3545' : '#28a745',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {mostrarExcluidos ? 'Ocultar excluídos' : 'Mostrar excluídos'}
            </button>
          </div>

          {loading && <p>Carregando...</p>}

          {!loading && listaFiltrada.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum registro.</p>}

          {!loading && listaFiltrada.length > 0 && (
            <>
              <div className="show-mobile">
                {listaFiltrada.map((m) => (
                  <div
                    key={m.id}
                    className="list-item"
                    onClick={() => router.push(`/movimentacao/${m.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="top">
                      <div style={{ fontWeight: 700 }}>{m.item}</div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="meta">
                      <div><b>Lote:</b> {m.lote}</div>
                      <div><b>Total:</b> {m.qtd_informada} un</div>
                      <div><b>Data:</b> {new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                    </div>

                    {canDelete && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            showConfirm('Tem certeza que deseja excluir este registro?', () => excluirMov(m.id))
                          }}
                          disabled={deletingId === m.id || (m.status || '').toUpperCase() === 'EXCLUIDO'}
                        >
                          {deletingId === m.id
                            ? 'Excluindo...'
                            : (m.status || '').toUpperCase() === 'EXCLUIDO'
                              ? 'Excluído'
                              : 'Excluir'}
                        </button>
                        {isAdmin && (m.status || '').toUpperCase() === 'EXCLUIDO' && (
                          <button
                            className="btn"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              showRestoreConfirm('Tem certeza que deseja restaurar este registro?', () => restaurarMov(m.id))
                            }}
                            disabled={restoringId === m.id}
                            style={{ backgroundColor: '#28a745', color: '#fff' }}
                          >
                            {restoringId === m.id ? 'Restaurando...' : 'Restaurar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hide-mobile">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Lote</th>
                      <th>Total (un)</th>
                      <th>Status</th>
                      <th>Criado em</th>
                      {canDelete && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {listaFiltrada.map((m) => (
                      <tr
                        key={m.id}
                        className="row-clickable"
                        title="Clique para ver detalhes"
                        onClick={() => router.push(`/movimentacao/${m.id}`)}
                      >
                        <td style={{ padding: '8px 0' }}>{m.item}</td>
                        <td>{m.lote}</td>
                        <td>{m.qtd_informada}</td>
                        <td><StatusBadge status={m.status} /></td>
                        <td>{new Date(m.criado_em).toLocaleString()}</td>
                        {canDelete && (
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="btn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  showConfirm('Tem certeza que deseja excluir este registro?', () => excluirMov(m.id))
                                }}
                                disabled={deletingId === m.id || (m.status || '').toUpperCase() === 'EXCLUIDO'}
                              >
                                {deletingId === m.id
                                  ? 'Excluindo...'
                                  : (m.status || '').toUpperCase() === 'EXCLUIDO'
                                    ? 'Excluído'
                                    : 'Excluir'}
                              </button>
                              {isAdmin && (m.status || '').toUpperCase() === 'EXCLUIDO' && (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    showRestoreConfirm('Tem certeza que deseja restaurar este registro?', () => restaurarMov(m.id))
                                  }}
                                  disabled={restoringId === m.id}
                                  style={{ backgroundColor: '#28a745', color: '#fff' }}
                                >
                                  {restoringId === m.id ? 'Restaurando...' : 'Restaurar'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
