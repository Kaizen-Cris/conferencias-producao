'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Menu from '../../components/menu'
import { useRouter } from 'next/navigation'


type Mov = {
  id: string
  status: string
  criado_em: string
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Mov[]>([])

  const router = useRouter()


  // últimos 7 dias
  const startISO = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6) // hoje + 6 dias anteriores = 7
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [])

  async function carregar() {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,status,criado_em')
      .gte('criado_em', startISO)
      .order('criado_em', { ascending: true })

    console.log('DASH DATA:', data)
    console.log('DASH ERROR:', error)

    setRows((data as Mov[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (r === 'ADMIN') carregar()
    }
    init()
  }, [])

  const total = rows.length
  const pendentes = rows.filter((r) => r.status === 'PENDENTE').length
  const reconferir = rows.filter((r) => r.status === 'RECONFERIR').length
  const divergentes = rows.filter((r) => r.status === 'DIVERGENTE').length
  const aprovados = rows.filter((r) => r.status === 'APROVADO').length

  const porDia = useMemo(() => {
    const map = new Map<string, { total: number; pend: number; rec: number; div: number; apr: number }>()
    rows.forEach((r) => {
      const day = toISODate(new Date(r.criado_em))
      const cur = map.get(day) ?? { total: 0, pend: 0, rec: 0, div: 0, apr: 0 }
      cur.total += 1
      if (r.status === 'PENDENTE') cur.pend += 1
      if (r.status === 'RECONFERIR') cur.rec += 1
      if (r.status === 'DIVERGENTE') cur.div += 1
      if (r.status === 'APROVADO') cur.apr += 1
      map.set(day, cur)
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  if (authLoading) return <div style={{ padding: 40 }}>Carregando...</div>

  if (role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div style={{ padding: 40 }}>
          <h1>Dashboard</h1>
          <p>Você não tem permissão para acessar esta página.</p>
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
            <h1 style={{ margin: 0 }}>Dashboard (últimos 7 dias)</h1>
            <button className="btn" onClick={carregar}>Atualizar</button>
          </div>

          {loading && <p>Carregando...</p>}

          {!loading && (
            <>
              <div className="grid-cards">
                <div className="card-kpi">
                  <div className="label">Total</div>
                  <div className="value">{total}</div>
                </div>

                <div className="card-kpi">
                  <div className="label">Pendentes</div>
                  <div className="value">{pendentes}</div>
                </div>

                <div className="card-kpi">
                  <div className="label">Reconferir</div>
                  <div className="value">{reconferir}</div>
                </div>

                <div className="card-kpi">
                  <div className="label">Divergentes</div>
                  <div className="value">{divergentes}</div>
                </div>

                <div className="card-kpi">
                  <div className="label">Aprovados</div>
                  <div className="value">{aprovados}</div>
                </div>
              </div>

              <h2 style={{ marginTop: 0 }}>Por dia</h2>
              {porDia.length === 0 && <p style={{ color: 'var(--muted)' }}>Sem dados nos últimos 7 dias.</p>}

              {porDia.length > 0 && (
                <>
                  {/* MOBILE: lista clicável */}
                  <div className="show-mobile list">
                    {porDia.map(([day, v]) => (
                      <div
                        key={day}
                        className="list-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/historico?dia=${day}`)}
                      >
                        <div className="top">
                          <div style={{ fontWeight: 800 }}>{day}</div>
                          <div className="badge aprovado">Total: {v.total}</div>
                        </div>

                        {/* Se quiser deixar mais limpo ainda, remove esse meta */}
                        <div className="meta">
                          <div><b>Pendente:</b> {v.pend}</div>
                          <div><b>Reconferir:</b> {v.rec}</div>
                          <div><b>Divergente:</b> {v.div}</div>
                          <div><b>Aprovado:</b> {v.apr}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP: tabela completa */}
                  <div className="hide-mobile">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Dia</th>
                          <th>Total</th>
                          <th>Pendente</th>
                          <th>Reconferir</th>
                          <th>Divergente</th>
                          <th>Aprovado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {porDia.map(([day, v]) => (
                          <tr key={day} className="row-clickable" onClick={() => router.push(`/historico?dia=${day}`)}>
                            <td style={{ padding: '8px 0' }}>{day}</td>
                            <td>{v.total}</td>
                            <td>{v.pend}</td>
                            <td>{v.rec}</td>
                            <td>{v.div}</td>
                            <td>{v.apr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>
                      Dica: clique em um dia para abrir o histórico filtrado.
                    </p>
                  </div>
                </>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )

}
