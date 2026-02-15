'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'
import { onlyDigits } from '../../../lib/onlyDigits'


type Mov = {
  id: string
  item: string
  lote: string
  qtd_informada: number
  status: string
  criado_por: string
  criado_em: string
}

export default function ConferirPage() {
  const params = useParams()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)


  // params.id pode ser string ou string[]
  const movIdRaw = params?.id
  const movId = Array.isArray(movIdRaw) ? movIdRaw[0] : movIdRaw

  const [mov, setMov] = useState<Mov | null>(null)
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [avulsas, setAvulsas] = useState('')
  const [loading, setLoading] = useState(true)

  const n = (v: string) => {
  const x = Number(v)
  return Number.isFinite(x) ? Math.trunc(x) : 0
  }

  const totalConferido =
  Number(caixas || 0) * Number(qtdPorCaixa || 0) + Number(avulsas || 0)


  async function carregar(id: string) {
    setLoading(true)

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('id,item,lote,qtd_informada,status,criado_por,criado_em')
      .eq('id', id)
      .single()

    console.log('MOV DATA:', data)
    console.log('MOV ERROR:', error)

    setMov((data as Mov) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      setAuthLoading(true)
      const r = await getMyRole()
      setRole(r)
      setAuthLoading(false)

      if (!movId) return

      if (r === 'CONFERENTE' || r === 'ADMIN') {
        carregar(String(movId))
      }
    }

    init()
  }, [movId])

  async function confirmar() {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      alert('Você precisa estar logado.')
      return
    }

    if (!mov) return
    const fase = mov.status === 'RECONFERIR' ? 2 : 1

    // Regra de ouro: não pode conferir a própria movimentação
    if (userId === mov.criado_por) {
      alert('Você não pode conferir uma movimentação criada por você.')
      return
    }

    const qtdInt = totalConferido
    if (qtdInt <= 0) {
      alert('Informe a quantidade conferida (maior que zero).')
      return
    }

    const novoStatus = qtdInt === mov.qtd_informada ? 'APROVADO' : 'DIVERGENTE'

    // 0) impedir conferência duplicada

    const { data: confExistente, error: confErr } = await supabase
      .from('conferencias')
      .select('id')
      .eq('movimentacao_id', mov.id)
      .eq('fase', fase)
      .limit(1)

    if (confErr) {
      console.log('CONF CHECK ERROR:', confErr)
      alert('Erro ao verificar conferência existente. Veja o console.')
      return
    }

    if (confExistente && confExistente.length > 0) {
      alert('Esta movimentação já foi conferida nesta fase. Se precisar, use o fluxo de divergência/ajuste.')
      return
    }



    // 1) inserir conferência
    const { error: errConf } = await supabase.from('conferencias').insert([
      {
        movimentacao_id: mov.id,
        qtd_conferida: qtdInt,
        conferido_por: userId,
        modo: 'DIGITADO',
        fase,
      },
    ])

    if (errConf) {
      console.log('CONF ERROR:', errConf)
      alert('Erro ao salvar conferência. Veja o console.')
      return
    }

    // 2) atualizar status
    const { error: errMov } = await supabase
      .from('movimentacoes')
      .update({ status: novoStatus })
      .eq('id', mov.id)

    if (errMov) {
      console.log('STATUS ERROR:', errMov)
      alert('Erro ao atualizar status. Veja o console.')
      return
    }

    alert(`Conferência salva! Status: ${novoStatus}`)
    router.push('/pendentes')
  }

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

  if (role !== 'CONFERENTE' && role !== 'ADMIN') {
    return (
      <div>
        <Menu />
        <div className="container">
          <div className="card">
            <h1 style={{ marginTop: 0 }}>Conferir</h1>
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
            <h1 style={{ margin: 0 }}>Conferir</h1>

            <button className="btn" onClick={() => router.push('/pendentes')}>
              Voltar
            </button>
          </div>

          <div className="card" style={{ boxShadow: 'none', marginBottom: 12 }}>
            <div><b>Item:</b> {mov.item}</div>
            <div><b>Lote:</b> {mov.lote}</div>
            <div><b>Informado:</b> {mov.qtd_informada} unidades</div>
            <div><b>Status:</b> {mov.status}</div>
          </div>

          <label>Caixas</label>
          <input
            className="input"
            value={caixas}
            onChange={(e) => setCaixas(onlyDigits(e.target.value))}
            placeholder="Ex: 2"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <label>Quantidade por caixa</label>
          <input
            className="input"
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(onlyDigits(e.target.value))}
            placeholder="Ex: 10"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <label>Unidades avulsas (opcional)</label>
          <input
            className="input"
            value={avulsas}
            onChange={(e) => setAvulsas(onlyDigits(e.target.value))}
            placeholder="Ex: 3"
            inputMode="numeric"
          />

          <div style={{ height: 10 }} />

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            <b>Total conferido (unidades):</b> {totalConferido}
          </p>

          <button className="btn" onClick={confirmar} style={{ width: '100%' }}>
            Confirmar conferência
          </button>
        </div>
      </div>
    </div>
  )

}
