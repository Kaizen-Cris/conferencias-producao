'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Menu from '../../components/menu'
import StatusBadge from '../../components/statusbadge'
import { useSearchParams } from 'next/navigation'


type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  status: string
  criado_em: string
}

export default function HistoricoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaParam = searchParams.get('dia') // formato YYYY-MM-DD

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [diaFiltro, setDiaFiltro] = useState<string>('')

  function brDayToUtcRange(diaYYYYMMDD: string) {
    // Interpreta o "dia" no fuso do Brasil (-03:00) e converte para UTC via Date().
    // Usamos intervalo [start, end) (end exclusivo) que é o padrão mais seguro.
    const start = new Date(`${diaYYYYMMDD}T00:00:00-03:00`).toISOString()
    const end = new Date(`${diaYYYYMMDD}T00:00:00-03:00`)
    end.setDate(end.getDate() + 1)
    const endISO = end.toISOString()
    return { startISO: start, endISO }
  }

  
  async function carregar() {
    setLoading(true)

    let q = supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .order('criado_em', { ascending: false })
      .limit(200)

    if (statusFiltro !== 'TODOS') {
      q = q.eq('status', statusFiltro)
    }

    if (diaFiltro) {
      const { startISO: start, endISO: end } = brDayToUtcRange(diaFiltro)
      q = q.gte('criado_em', start).lt('criado_em', end)
    }


    const { data, error } = await q

    console.log('HIST DATA:', data)
    console.log('HIST ERROR:', error)

    let rows = ((data as Mov[]) ?? [])

    if (busca.trim()) {
      const b = busca.trim().toLowerCase()
      rows = rows.filter((m) => `${m.item} ${m.lote}`.toLowerCase().includes(b))
    }

    setLista(rows)
    setLoading(false)
  }

  useEffect(() => {
    if (diaParam) setDiaFiltro(diaParam)
    // só na primeira carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (r !== 'ADMIN') return

      // Se veio dia na URL, usa ele
      const diaFromUrl = searchParams.get('dia')
      if (diaFromUrl) {
        setDiaFiltro(diaFromUrl)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ Ao mudar filtro, recarrega automaticamente (mantém comportamento que você já tinha)
  useEffect(() => {
    if (role === 'ADMIN') {
      carregar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFiltro, diaFiltro])


  // ✅ Carregando padronizado com Menu + container/card
  if (authLoading) {
    return (
      <div>
        
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </div>
    )
  }

  // ✅ Sem permissão padronizado com Menu + container/card
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
                  onClick={() => {
                    setDiaFiltro('')
                    router.push('/historico')
                  }}
                >
                  Limpar dia
                </button>
              </div>
            )}

            
            <select
              className="select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
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
              style={{ flex: 1}}
            />

            {/* ✅ Busca só no front: botão reaplica sem ter que mexer em backend */}
            <button className="btn" onClick={carregar}>Buscar</button>
          </div>

          {loading && <p>Carregando...</p>}

          {!loading && lista.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>Nenhum registro.</p>
          )}

          {!loading && lista.length > 0 && (
            <>
              {/* MOBILE: cards */}
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

            {/* DESKTOP: table */}
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
