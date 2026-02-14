'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function HistoricoPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [busca, setBusca] = useState('')

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

    // Busca simples no front (por enquanto)
    const { data, error } = await q

    console.log('HIST DATA:', data)
    console.log('HIST ERROR:', error)

    let rows = ((data as Mov[]) ?? [])

    if (busca.trim()) {
      const b = busca.trim().toLowerCase()
      rows = rows.filter((m) =>
        `${m.item} ${m.lote}`.toLowerCase().includes(b)
      )
    }

    setLista(rows)
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (r === 'ADMIN') {
        carregar()
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (role === 'ADMIN') carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro])

  if (authLoading) return <div style={{ padding: 40 }}>Carregando...</div>

  if (role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div style={{ padding: 40 }}>
          <h1>Histórico</h1>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Menu />
      <div style={{ padding: 40, maxWidth: 1000 }}>
        <div className="hstack" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Histórico</h1>
          <button className="btn" onClick={carregar}>Atualizar</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <select className="select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={{ maxWidth: 220 }}>
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
            style={{ flex: 1, minWidth: 240 }}
          />
        </div>


        {loading && <p>Carregando...</p>}

        {!loading && lista.length === 0 && <p>Nenhum registro.</p>}

        {!loading && lista.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Item</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Lote</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Total (un)</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Criado em</th>
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
        )}
      </div>
    </div>
  )
}
