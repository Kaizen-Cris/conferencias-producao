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

  async function carregarPendentes() {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .in('status', ['PENDENTE', 'RECONFERIR'])
      .order('criado_em', { ascending: false })
      .limit(200)

    console.log('PENDENTES DATA:', data)
    console.log('PENDENTES ERROR:', error)

    setLista((data as Mov[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (r === 'CONFERENTE' || r === 'ADMIN') {
        carregarPendentes()
      } else {
        setLoading(false)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (authLoading || loading) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </div>
    )
  }

  if (role !== 'CONFERENTE' && role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1 style={{ marginTop: 0 }}>Pendentes</h1>
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
            <h1 style={{ margin: 0 }}>Pendentes</h1>
            <button className="btn" onClick={carregarPendentes}>
              Atualizar
            </button>
          </div>

          {lista.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum pendente.</p>}

          {/* ===== MOBILE: cards (NÃO estoura tela) ===== */}
          <div className="show-mobile">
            <div className="list">
              {lista.map((m) => (
                <div
                  key={m.id}
                  className="list-item"
                  onClick={() => router.push(`/conferir/${m.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="top">
                    <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{m.item}</div>
                    <StatusBadge status={m.status} />
                  </div>

                  <div className="meta">
                    <div className="wrap"><b>Lote:</b> {m.lote}</div>
                    <div><b>Total:</b> {m.qtd_informada} un</div>
                    <div><b>Criado:</b> {new Date(m.criado_em).toLocaleString()}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                      <b>ID:</b> <span className="wrap">{m.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== DESKTOP: table ===== */}
          <div className="hide-mobile">
            {lista.length > 0 && (
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
    </div>
  )
}
