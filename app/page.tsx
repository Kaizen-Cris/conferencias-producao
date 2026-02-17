'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { getMyRole } from '../lib/auth'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Se já estiver logado, manda pra rota certa
  useEffect(() => {
    let mounted = true

    async function go() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (!data.session) return

      const role = await getMyRole()
      if (!mounted) return

      if (role === 'CONFERENTE') router.replace('/pendentes')
      else router.replace('/registrar')
    }

    go()
    return () => { mounted = false }
  }, [router])

  async function handleLogin() {
    setAuthMsg(null)

    if (!email.trim() || !password.trim()) {
      setAuthMsg('Preencha email e senha.')
      return
    }

    setAuthLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setAuthLoading(false)

    if (error) {
      const msg = (error.message || '').toLowerCase()

      if (msg.includes('invalid login credentials')) {
        setAuthMsg('Email ou senha inválidos.')
        return
      }

      if (msg.includes('email not confirmed')) {
        setAuthMsg('Seu email ainda não foi confirmado. Verifique sua caixa de entrada.')
        return
      }

      setAuthMsg(`Erro ao entrar: ${error.message}`)
      return
    }

    if (data.session) {
      const role = await getMyRole()
      if (role === 'CONFERENTE') router.replace('/pendentes')
      else router.replace('/registrar')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Login</h1>

        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', marginBottom: 10, width: '100%' }}
        />

        <div className="uPassWrap">
          <input
            className="input"
            type={showPass ? 'text' : 'password'}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />
          <button
            type="button"
            className="uEye"
            onClick={() => setShowPass((v) => !v)}
          >
            {showPass ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        <div className="login-actions">
          <button className="btn" onClick={handleLogin} disabled={authLoading}>
            {authLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            className="btn-link"
            onClick={() => router.push('/esqueci-senha')}
          >
            Esqueci minha senha
          </button>
        </div>

        {authMsg && <p className="authMsg">{authMsg}</p>}
      </div>
    </div>
  )
}
