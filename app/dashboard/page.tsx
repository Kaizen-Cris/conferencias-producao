'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Menu from '../../components/menu'

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
      <div style={{ padding: 40, maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Dashboard (últimos 7 dias)</h1>
          <button onClick={carregar}>Atualizar</button>
        </div>

        {loading && <p>Carregando...</p>}

        {!loading && (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 160 }}>
                <b>Total</b>
                <div style={{ fontSize: 24 }}>{total}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 160 }}>
                <b>Pendente</b>
                <div style={{ fontSize: 24 }}>{pendentes}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 160 }}>
                <b>Reconferir</b>
                <div style={{ fontSize: 24 }}>{reconferir}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 160 }}>
                <b>Divergente</b>
                <div style={{ fontSize: 24 }}>{divergentes}</div>
              </div>
              <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 160 }}>
                <b>Aprovado</b>
                <div style={{ fontSize: 24 }}>{aprovados}</div>
              </div>
            </div>

            <h2>Por dia</h2>
            {porDia.length === 0 && <p>Sem dados nos últimos 7 dias.</p>}

            {porDia.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Dia</th>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Total</th>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Pendente</th>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Reconferir</th>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Divergente</th>
                    <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Aprovado</th>
                  </tr>
                </thead>
                <tbody>
                  {porDia.map(([day, v]) => (
                    <tr key={day}>
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
