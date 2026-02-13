'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Menu from '../../components/menu'  


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
  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)


  async function carregar() {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .eq('status', 'DIVERGENTE')
      .order('criado_em', { ascending: false })

    console.log('DIVERGENCIAS DATA:', data)
    console.log('DIVERGENCIAS ERROR:', error)

    setLista((data as Mov[]) ?? [])
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
    return <div style={{ padding: 40 }}>Carregando...</div>
  }

  if (role !== 'OPERADOR' && role !== 'ADMIN') {
    return (
      <div style={{ padding: 40 }}>
        <h1>Divergências</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div>
      <Menu />
      <div style={{ padding: 40, maxWidth: 900 }}>
        <h1>Divergências</h1>

        <button onClick={carregar} style={{ marginBottom: 16 }}>
          Atualizar
        </button>

        {loading && <p>Carregando...</p>}
        {!loading && lista.length === 0 && <p>Nenhuma divergência.</p>}

        {!loading && lista.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Item</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Lote</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Informado (un)</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr
                  key={m.id}
                  className="row-clickable"
                  onClick={() => router.push(`/ajustar/${m.id}`)}
                >
                  <td style={{ padding: '8px 0' }}>{m.item}</td>
                  <td>{m.lote}</td>
                  <td>{m.qtd_informada}</td>
                  <td>{new Date(m.criado_em).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={() => router.push('/pendentes')}>Ir para Pendentes</button>
        </div>
      </div>
    </div>    
  )
}
