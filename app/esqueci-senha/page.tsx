'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'

export default function EsqueciSenhaPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function enviar() {
    setMsg(null)

    if (!email.trim()) {
      setMsg('Informe seu email.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/resetar-senha`,
    })
    setLoading(false)

    if (error) {
      setMsg(`Erro ao enviar link: ${error.message}`)
    } else {
      setMsg('Se o email estiver cadastrado, você receberá um link em instantes.')
    }
  }

  return (
    <div>
      <Menu />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Recuperar senha</h1>

            <button className="btn" type="button" onClick={() => router.push('/')}>
              Voltar
            </button>
          </div>

          <p style={{ opacity: 0.8 }}>
            Informe seu email para receber o link de redefinição.
          </p>

          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@empresa.com"
            autoComplete="email"
          />

          <button style={{ marginTop: 14 }} onClick={enviar} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>

          {msg && <div className="authMsg">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
