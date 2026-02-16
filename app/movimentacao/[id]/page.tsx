'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'
import StatusBadge from '../../../components/statusbadge'

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
  conferido_em: string
  profiles?: { nome: string | null } | null
}

type Ajuste = {
  id: string
  movimentacao_id: string
  qtd_antiga: number
  qtd_nova: number
  motivo: string
  ajustado_por: string
  tipo: string
  ajustado_em: string
  profiles?: { nome: string | null } | null
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function userLabel(name?: string | null, fallbackId?: string) {
  if (name && name.trim()) return name.trim()
  if (!fallbackId) return 'Usuário'
  return `Usuário (${fallbackId.slice(0, 8)}…)`
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
      .select('id,item,lote,qtd_informada,caixas,qtd_por_caixa,unidades_avulsas,status,criado_por,criado_em')
      .eq('id', id)
      .single()

    console.log('MOV DETALHE:', movData, movErr)
    setMov((movData as Mov) ?? null)

    const { data: confData, error: confErr } = await supabase
      .from('conferencias')
      .select(`
        id,
        movimentacao_id,
        qtd_conferida,
        conferido_por,
        modo,
        fase,
        conferido_em,
        profiles:conferido_por ( nome )
      `)
      .eq('movimentacao_id', id)
      .order('fase', { ascending: true })

    console.log('CONF DETALHE:', confData, confErr)
    setConfs((confData as Conf[]) ?? [])

    const { data: ajData, error: ajErr } = await supabase
      .from('ajustes')
      .select(`
        id,
        movimentacao_id,
        qtd_antiga,
        qtd_nova,
        motivo,
        ajustado_por,
        tipo,
        ajustado_em,
        profiles:ajustado_por ( nome )
      `)
      .eq('movimentacao_id', id)
      .order('ajustado_em', { ascending: true })

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

      if (r === 'ADMIN') carregarTudo(String(movId))
      else setLoading(false)
    }

    init()
  }, [movId])

  const timeline = useMemo(() => {
    const items: Array<{ when: string | null; label: string; detail?: string }> = []

    if (mov) {
      items.push({
        when: mov.criado_em ?? null,
        label: 'Movimentação criada',
        detail: `Total: ${mov.qtd_informada} | Status: ${mov.status}`,
      })
    }

    confs.forEach((c) => {
      items.push({
        when: c.conferido_em ?? null,
        label: `Conferência (fase ${c.fase})`,
        detail: `Qtd: ${c.qtd_conferida} | Por: ${userLabel(c.profiles?.nome ?? null, c.conferido_por)}`,
      })
    })

    ajustes.forEach((a) => {
      items.push({
        when: a.ajustado_em ?? null,
        label: 'Ajuste realizado',
        detail: `De ${a.qtd_antiga} para ${a.qtd_nova} | Motivo: ${a.motivo} | Por: ${userLabel(
          a.profiles?.nome ?? null,
          a.ajustado_por
        )}`,
      })
    })

    items.sort((x, y) => {
      const ax = x.when ? new Date(x.when).getTime() : 0
      const ay = y.when ? new Date(y.when).getTime() : 0
      return ax - ay
    })

    return items
  }, [mov, confs, ajustes])

  if (!movId || authLoading || loading) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </div>
    )
  }

  if (role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1 style={{ marginTop: 0 }}>Detalhe</h1>
            <p>Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!mov) {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">Movimentação não encontrada.</div>
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
            <h1 style={{ margin: 0 }}>Movimentação</h1>
            <button className="btn" onClick={() => router.push('/historico')}>
              Voltar
            </button>
          </div>

          <div className="card" style={{ boxShadow: 'none', marginBottom: 12 }}>
            <div><b>ID:</b> {mov.id}</div>
            <div><b>Item:</b> {mov.item}</div>
            <div><b>Lote:</b> {mov.lote}</div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>Status:</b> <StatusBadge status={mov.status} />
            </div>

            <div><b>Criado em:</b> {fmtDate(mov.criado_em)}</div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />

            <div><b>Caixas:</b> {mov.caixas ?? 0}</div>
            <div><b>Qtd/caixa:</b> {mov.qtd_por_caixa ?? 0}</div>
            <div><b>Avulsas:</b> {mov.unidades_avulsas ?? 0}</div>
            <div><b>Total (un):</b> {mov.qtd_informada}</div>
          </div>

          <h2 style={{ marginTop: 0 }}>Conferências</h2>

          {confs.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhuma conferência registrada.</p>}

          {confs.length > 0 && (
            <table className="table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Quantidade</th>
                  <th>Conferido por</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {confs.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fase}</td>
                    <td>{c.qtd_conferida}</td>
                    <td style={{ fontSize: 13 }}>
                      {userLabel(c.profiles?.nome ?? null, c.conferido_por)}
                    </td>
                    <td>{fmtDate(c.conferido_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ marginTop: 0 }}>Ajustes</h2>

          {ajustes.length === 0 && <p style={{ color: 'var(--muted)' }}>Nenhum ajuste registrado.</p>}

          {ajustes.length > 0 && (
            <table className="table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>De</th>
                  <th>Para</th>
                  <th>Motivo</th>
                  <th>Ajustado por</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr key={a.id}>
                    <td>{a.qtd_antiga}</td>
                    <td>{a.qtd_nova}</td>
                    <td>{a.motivo}</td>
                    <td style={{ fontSize: 13 }}>
                      {userLabel(a.profiles?.nome ?? null, a.ajustado_por)}
                    </td>
                    <td>{fmtDate(a.ajustado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ marginTop: 0 }}>Linha do tempo</h2>
          <div className="card" style={{ boxShadow: 'none' }}>
            {timeline.map((t, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 0',
                  borderBottom: idx === timeline.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                <div><b>{fmtDate(t.when)}</b> — {t.label}</div>
                {t.detail && <div style={{ color: 'var(--muted)' }}>{t.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
