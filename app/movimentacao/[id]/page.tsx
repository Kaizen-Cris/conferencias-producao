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

    items.sort((x, y) => new Date(x.when).getTime() - new Date(y.when).getTime())
    return items
  }, [mov, confs, ajustes])

  // ✅ Tela padrão de carregamento
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

  // ✅ Permissão
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

  // ✅ Não encontrado
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

          {/* RESUMO */}
          <div className="card" style={{ boxShadow: 'none', marginBottom: 12 }}>
            <div><b>ID:</b> {mov.id}</div>
            <div><b>Item:</b> {mov.item}</div>
            <div><b>Lote:</b> {mov.lote}</div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>Status:</b> <StatusBadge status={mov.status} />
            </div>

            <div><b>Criado em:</b> {new Date(mov.criado_em).toLocaleString()}</div>

            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />

            <div><b>Caixas:</b> {mov.caixas ?? 0}</div>
            <div><b>Qtd/caixa:</b> {mov.qtd_por_caixa ?? 0}</div>
            <div><b>Avulsas:</b> {mov.unidades_avulsas ?? 0}</div>
            <div><b>Total (un):</b> {mov.qtd_informada}</div>
          </div>

          {/* CONFERÊNCIAS */}
          <h2 style={{ marginTop: 0 }}>Conferências</h2>
          {confs.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>Nenhuma conferência registrada.</p>
          )}

          {confs.length > 0 && (
            <table className="table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Qtd</th>
                  <th>Conferido por</th>
                  <th>Quando</th>
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

          {/* AJUSTES */}
          <h2 style={{ marginTop: 0 }}>Ajustes</h2>
          {ajustes.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>Nenhum ajuste registrado.</p>
          )}

          {ajustes.length > 0 && (
            <table className="table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>De</th>
                  <th>Para</th>
                  <th>Motivo</th>
                  <th>Quando</th>
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

          {/* TIMELINE */}
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
                <div><b>{new Date(t.when).toLocaleString()}</b> — {t.label}</div>
                {t.detail && <div style={{ color: 'var(--muted)' }}>{t.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
