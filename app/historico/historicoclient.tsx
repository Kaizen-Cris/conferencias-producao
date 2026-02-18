'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Menu from '../../components/menu'
import StatusBadge from '../../components/statusbadge'

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

  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [diaFiltro, setDiaFiltro] = useState<string>('')

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

    if (busca.trim()) {
      const b = busca.trim().toLowerCase()
      rows = rows.filter((m) => `${m.item} ${m.lote}`.toLowerCase().includes(b))
    }

    setLista(rows)
    setLoading(false)
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
    if (role !== 'ADMIN' && role !== 'OPERADOR' && role !== 'CONFERENTE') carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFiltro, diaFiltro])

  if (authLoading) {
    return (
      <div>
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </div>
    )
  }

  if (role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1 style={{ marginTop: 0 }}>Histórico</h1>
            <p>Você não tem permissão para acessar esta página.</p>
          </div>
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
            </select>

            <input
              className="input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por item ou lote"
              style={{ flex: 1 }}
            />

            <button className="btn" onClick={carregar}>Buscar</button>
          </div>

          {loading && <p>Carregando...</p>}

          {!loading && lista.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum registro.</p>}

          {!loading && lista.length > 0 && (
            <>
              <div className="show-mobile">
                {lista.map((m) => (
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
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((m) => (
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
