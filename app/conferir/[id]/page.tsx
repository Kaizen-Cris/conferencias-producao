'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getMyRole } from '../../../lib/auth'
import Menu from '../../../components/menu'
import { onlyDigits } from '../../../lib/onlyDigits'
import Popup from '../../../components/popup'

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

  const movIdRaw = params?.id
  const movId = Array.isArray(movIdRaw) ? movIdRaw[0] : movIdRaw

  const [mov, setMov] = useState<Mov | null>(null)
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [avulsas, setAvulsas] = useState('')
  const [loading, setLoading] = useState(true)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Aviso')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupConfirmText, setPopupConfirmText] = useState('OK')
  const [popupAction, setPopupAction] = useState<null | (() => void)>(null)
  const [popupVariant, setPopupVariant] = useState<'success' | 'alert' | 'warning' | 'confirm'>('warning')

  function showAlert(
    message: string,
    title = 'Aviso',
    variant: 'success' | 'alert' | 'warning' | 'confirm' = 'warning',
    action?: () => void
  ) {
    setPopupTitle(title)
    setPopupMessage(message)
    setPopupVariant(variant)
    setPopupConfirmText(action ? 'Continuar' : 'OK')
    setPopupAction(action ? () => action : null)
    setPopupOpen(true)
  }

  const totalConferido = Number(caixas || 0) * Number(qtdPorCaixa || 0) + Number(avulsas || 0)

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
      showAlert('Você precisa estar logado.', 'Aviso', 'warning')
      return
    }

    if (!mov) return
    const fase = mov.status === 'RECONFERIR' ? 2 : 1

    if (userId === mov.criado_por) {
      showAlert('Você não pode conferir uma movimentação criada por você.', 'Aviso', 'warning')
      return
    }

    const qtdInt = totalConferido
    if (qtdInt <= 0) {
      showAlert('Informe a quantidade conferida (maior que zero).', 'Alerta', 'alert')
      return
    }

    const novoStatus = qtdInt === mov.qtd_informada ? 'APROVADO' : 'DIVERGENTE'

    const { data: confExistente, error: confErr } = await supabase
      .from('conferencias')
      .select('id')
      .eq('movimentacao_id', mov.id)
      .eq('fase', fase)
      .limit(1)

    if (confErr) {
      console.log('CONF CHECK ERROR:', confErr)
      showAlert('Erro ao verificar conferência existente. Veja o console.', 'Alerta', 'alert')
      return
    }

    if (confExistente && confExistente.length > 0) {
      showAlert(
        'Esta movimentação já foi conferida nesta fase. Se precisar, use o fluxo de divergência/ajuste.',
        'Alerta',
        'alert'
      )
      return
    }

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
      showAlert('Erro ao salvar conferência. Veja o console.', 'Alerta', 'alert')
      return
    }

    const { error: errMov } = await supabase
      .from('movimentacoes')
      .update({ status: novoStatus })
      .eq('id', mov.id)

    if (errMov) {
      console.log('STATUS ERROR:', errMov)
      showAlert('Erro ao atualizar status. Veja o console.', 'Alerta', 'alert')
      return
    }

    if (novoStatus === 'APROVADO') {
      showAlert(
        `Conferência salva! Status: ${novoStatus}.`,
        'Sucesso',
        'confirm',
        () => router.push('/pendentes')
      )
    } else {
      showAlert(
        `Conferência salva! Status: ${novoStatus}. Você será redirecionado para a lista de pendentes.`,
        'Alerta',
        'confirm',
        () => router.push('/pendentes')
      )
    }
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
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        confirmText={popupConfirmText}
        variant={popupVariant}
        onConfirm={popupAction ?? undefined}
        onClose={() => {
          setPopupOpen(false)
          setPopupAction(null)
        }}
      />

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
