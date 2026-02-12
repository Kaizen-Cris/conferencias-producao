'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  status: string
  criado_em: string
}

export default function PendentesPage() {
  const [lista, setLista] = useState<Mov[]>([])
  const [loading, setLoading] = useState(true)

  async function carregarPendentes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_em')
      .in('status', ['PENDENTE', 'AJUSTADO'])
      .order('criado_em', { ascending: false })

    console.log('PENDENTES DATA:', data)
    console.log('PENDENTES ERROR:', error)

    setLista((data as Mov[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregarPendentes()
  }, [])

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Pendentes</h1>

      <button onClick={carregarPendentes} style={{ marginBottom: 16 }}>
        Atualizar
      </button>

      {loading && <p>Carregando...</p>}

      {!loading && lista.length === 0 && <p>Nenhuma pendência.</p>}

      {!loading && lista.length > 0 && (
        <table
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
                Criado em
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr
                key={m.id}
                style={{ cursor: 'pointer' }}
                onClick={() => (window.location.href = `/conferir/${m.id}`)}
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
    </div>
  )
}
