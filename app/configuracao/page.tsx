'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'

export default function ConfiguracaoPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [myEmail, setMyEmail] = useState('')
  const [myPassword, setMyPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!mounted) return

      if (!session) {
        router.replace('/')
        return
      }

      setMyEmail(session.user?.email || '')
      setLoading(false)
    }

    init()
    return () => {
      mounted = false
    }
  }, [router])

  async function handleChangeMyPassword() {
    setMsg(null)

    if (!myPassword.trim() || myPassword.trim().length < 8) {
      return setMsg('Informe uma senha (mínimo recomendado: 8).')
    }

    setChangingPass(true)
    const { error } = await supabase.auth.updateUser({ password: myPassword.trim() })
    setChangingPass(false)

    if (error) return setMsg('Erro ao alterar senha. Tente novamente.')

    setMsg('Senha atualizada com sucesso!')
    setMyPassword('')
  }

  if (loading) {
    return (
      <>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Menu />

      <div className="container">
        <div className="card">
          <div className="uHeader">
            <div>
              <h1>Configuração</h1>
              <p className="uSub">Ajustes da sua conta.</p>
            </div>
          </div>

          <h2 className="uTitle2">Alterar minha senha</h2>

          <div className="uForm">
            <div className="uField">
              <label>Usuário conectado</label>
              <input value={myEmail} readOnly placeholder="carregando..." />
            </div>
            <div className="uField">
              <label>Nova senha</label>
              <input
                type="password"
                value={myPassword}
                onChange={(e) => setMyPassword(e.target.value)}
                placeholder="mínimo recomendado: 8"
              />
            </div>
          </div>

          <div className="uActions">
            <button
              className="uBtn uBtnPrimary"
              onClick={handleChangeMyPassword}
              disabled={changingPass}
              type="button"
            >
              {changingPass ? 'Alterando...' : 'Alterar minha senha'}
            </button>
          </div>

          {msg && <div className="uAlert">{msg}</div>}
        </div>
      </div>
    </>
  )
}
