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

export default function DivergenciasPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState('')


  async function carregar() {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .eq('status', 'DIVERGENTE')
      .order('criado_em', { ascending: false })

    console.log('DIVERGENCIAS DATA:', data)
    console.log('DIVERGENCIAS ERROR:', error)

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

      if (r === 'OPERADOR' || r === 'ADMIN') {
        carregar()
      }
    }

    init()
  }, [])

  if (authLoading) {
      return (
        <div>
          
          <div className="container">
            <div className="card">Carregando...</div>
          </div>
        </div>
      )
    }

  if (role !== 'OPERADOR' && role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1>Divergências</h1>
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
            <h1 style={{ margin: 0 }}>Divergências</h1>
            <button className="btn" onClick={carregar}>Atualizar</button>
          </div>

          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por item ou lote"
          />


          {loading && <p>Carregando...</p>}

          {!loading && lista.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>
              Nenhuma divergência no momento.
            </p>
          )}

          {!loading && lista.length > 0 && (
            <>
              {/* MOBILE: cards */}
              <div className="show-mobile list">
                {lista.map((m) => (
                  <div
                    key={m.id}
                    className="list-item"
                    onClick={() => router.push(`/ajustar/${m.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="top">
                      <div className="li-title">{m.item}</div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="meta">
                      <div><b>Lote:</b> {m.lote}</div>
                      <div><b>Total:</b> {m.qtd_informada} un</div>
                      <div><b>Criado em:</b> {new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
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
                        onClick={() => router.push(`/ajustar/${m.id}`)}
                        title="Clique para ajustar"
                      >
                        <td>{m.item}</td>
                        <td>{m.lote}</td>
                        <td>{m.qtd_informada}</td>
                        <td><StatusBadge status={m.status} /></td>
                        <td>{new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td>
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


