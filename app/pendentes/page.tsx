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

export default function PendentesPage() {
  const router = useRouter()
  
  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState('')

  async function carregarPendentes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .in('status', ['PENDENTE', 'RECONFERIR'])
      .order('criado_em', { ascending: false })

    console.log('PENDENTES DATA:', data)
    console.log('PENDENTES ERROR:', error)

    let rows = ((data as Mov[]) ?? [])

    if (busca.trim()) {
      const b = busca.trim().toLowerCase()
      rows = rows.filter((m) => `${m.item} ${m.lote}`.toLowerCase().includes(b))
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

      if (r === 'CONFERENTE' || r === 'ADMIN') {
        await carregarPendentes()
      }
    }

    init()
  }, [])

  if (authLoading) {
    return <div style={{ padding: 40 }}>Carregando...</div>
  }

  if (role !== 'CONFERENTE' && role !== 'ADMIN') {
    return (
      <div style={{ padding: 40 }}>
        <h1>Pendentes</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }


  return (
    <div>
      <Menu />
      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Pendentes</h1>
            <button className="btn" onClick={carregarPendentes}>Atualizar</button>
          </div>

          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por item ou lote"
          />

          {loading && <p>Carregando...</p>}

          {!loading && lista.length === 0 && <p>Nenhuma pendência.</p>}

          {!loading && lista.length > 0 && (
            <table 
              className="table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    Item
                  </th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    Lote
                  </th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    Total (un)
                  </th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    Status
                  </th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr
                    key={m.id}
                    className="row-clickable"
                    title="Clique para conferir"
                    onClick={() => router.push(`/conferir/${m.id}`)}
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
  </div>
  )
}
