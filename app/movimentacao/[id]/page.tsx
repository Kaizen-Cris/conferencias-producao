'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'

type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  caixas: number | null
  qtd_por_caixa: number | null
  unidades_avulsas: number
  status: string
  criado_por: string
  criado_em: string
}

type Conf = {
  id: string
  movimentacao_id: string
  qtd_conferida: number
  conferido_por: string
  modo: string
  fase: number
  criado_em: string
}

type Ajuste = {
  id: string
  movimentacao_id: string
  qtd_antiga: number
  qtd_nova: number
  motivo: string
  ajustado_por: string
  tipo: string
  criado_em: string
}

export default function MovimentacaoDetalhePage() {
  const params = useParams()
  const router = useRouter()

  const movIdRaw = params?.id
  const movId = Array.isArray(movIdRaw) ? movIdRaw[0] : movIdRaw

  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [mov, setMov] = useState<Mov | null>(null)
  const [confs, setConfs] = useState<Conf[]>([])
  const [ajustes, setAjustes] = useState<Ajuste[]>([])
  const [loading, setLoading] = useState(true)

  async function carregarTudo(id: string) {
    setLoading(true)

    const { data: movData, error: movErr } = await supabase
      .from('movimentacoes')
      .select(
        'id,item,lote,qtd_informada,caixas,qtd_por_caixa,unidades_avulsas,status,criado_por,criado_em'
      )
      .eq('id', id)
      .single()

    console.log('MOV DETALHE:', movData, movErr)
    setMov((movData as Mov) ?? null)

    const { data: confData, error: confErr } = await supabase
      .from('conferencias')
      .select('id,movimentacao_id,qtd_conferida,conferido_por,modo,fase,criado_em')
      .eq('movimentacao_id', id)
      .order('fase', { ascending: true })

    console.log('CONF DETALHE:', confData, confErr)
    setConfs((confData as Conf[]) ?? [])

    const { data: ajData, error: ajErr } = await supabase
      .from('ajustes')
      .select('id,movimentacao_id,qtd_antiga,qtd_nova,motivo,ajustado_por,tipo,criado_em')
      .eq('movimentacao_id', id)
      .order('criado_em', { ascending: true })

    console.log('AJUSTES DETALHE:', ajData, ajErr)
    setAjustes((ajData as Ajuste[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (!movId) return

      // no MVP: só ADMIN acessa o detalhe
      if (r === 'ADMIN') {
        carregarTudo(String(movId))
      }
    }

    init()
  }, [movId])

  const timeline = useMemo(() => {
    const items: Array<{ when: string; label: string; detail?: string }> = []

    if (mov) {
      items.push({
        when: mov.criado_em,
        label: 'Movimentação criada',
        detail: `Total: ${mov.qtd_informada} | Status: ${mov.status}`,
      })
    }

    confs.forEach((c) => {
      items.push({
        when: c.criado_em,
        label: `Conferência (fase ${c.fase})`,
        detail: `Qtd: ${c.qtd_conferida} | Por: ${c.conferido_por}`,
      })
    })

    ajustes.forEach((a) => {
      items.push({
        when: a.criado_em,
        label: 'Ajuste realizado',
        detail: `De ${a.qtd_antiga} para ${a.qtd_nova} | Motivo: ${a.motivo}`,
      })
    })

    // ordenar por data
    items.sort((x, y) => new Date(x.when).getTime() - new Date(y.when).getTime())
    return items
  }, [mov, confs, ajustes])

  if (authLoading) return <div style={{ padding: 40 }}>Carregando...</div>

  if (role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div style={{ padding: 40 }}>
          <h1>Detalhe</h1>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  if (!movId) return <div style={{ padding: 40 }}>Carregando...</div>
  if (loading) return <div style={{ padding: 40 }}>Carregando...</div>
  if (!mov) return <div style={{ padding: 40 }}>Movimentação não encontrada.</div>

  return (
    <div>
      <Menu />
      <div style={{ padding: 40, maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Movimentação</h1>
          <button onClick={() => router.push('/historico')}>Voltar</button>
        </div>

        <div style={{ padding: 12, border: '1px solid #ddd', marginBottom: 16 }}>
          <div><b>ID:</b> {mov.id}</div>
          <div><b>Item:</b> {mov.item}</div>
          <div><b>Lote:</b> {mov.lote}</div>
          <div><b>Status:</b> {mov.status}</div>
          <div><b>Criado em:</b> {new Date(mov.criado_em).toLocaleString()}</div>
          <hr />
          <div><b>Caixas:</b> {mov.caixas ?? 0}</div>
          <div><b>Qtd/caixa:</b> {mov.qtd_por_caixa ?? 0}</div>
          <div><b>Avulsas:</b> {mov.unidades_avulsas ?? 0}</div>
          <div><b>Total (un):</b> {mov.qtd_informada}</div>
        </div>

        <h2>Conferências</h2>
        {confs.length === 0 && <p>Nenhuma conferência registrada.</p>}
        {confs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Fase</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Qtd</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Conferido por</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Quando</th>
              </tr>
            </thead>
            <tbody>
              {confs.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: '8px 0' }}>{c.fase}</td>
                  <td>{c.qtd_conferida}</td>
                  <td style={{ fontFamily: 'monospace' }}>{c.conferido_por}</td>
                  <td>{new Date(c.criado_em).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Ajustes</h2>
        {ajustes.length === 0 && <p>Nenhum ajuste registrado.</p>}
        {ajustes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>De</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Para</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Motivo</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>Quando</th>
              </tr>
            </thead>
            <tbody>
              {ajustes.map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: '8px 0' }}>{a.qtd_antiga}</td>
                  <td>{a.qtd_nova}</td>
                  <td>{a.motivo}</td>
                  <td>{new Date(a.criado_em).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Linha do tempo</h2>
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          {timeline.map((t, idx) => (
            <div key={idx} style={{ padding: '8px 0', borderBottom: idx === timeline.length - 1 ? 'none' : '1px solid #eee' }}>
              <div><b>{new Date(t.when).toLocaleString()}</b> — {t.label}</div>
              {t.detail && <div style={{ opacity: 0.8 }}>{t.detail}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
