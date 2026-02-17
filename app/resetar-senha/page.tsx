'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'

export default function ResetarSenhaPage() {
  const router = useRouter()
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Quando o usuário abre via link do email, o Supabase cria uma sessão temporária.
  // Esse "ready" é só pra evitar salvar senha antes disso estar ok.
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setReady(!!data.session)
    })()
  }, [])

  async function salvar() {
    setMsg(null)

    if (!ready) {
      setMsg('Abra esta página usando o link enviado no email.')
      return
    }

    if (pass1.length < 8) {
      setMsg('Use uma senha com pelo menos 8 caracteres.')
      return
    }

    if (pass1 !== pass2) {
      setMsg('As senhas não conferem.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pass1 })

    if (error) {
      setMsg(`Erro ao atualizar senha: ${error.message}`)
      return
    }

    setMsg('Senha atualizada com sucesso! Você será redirecionado para o login.')
    setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/')
    }, 1200)
  }

  return (
    <div>
      <Menu />

      <div className="container">
        <div className="card">
            <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Redefinir senha</h1>
            <button className="btn" type="button" onClick={() => router.push('/')}>
                Voltar
            </button>
            </div>



          <h1>Redefinir senha</h1>
          <p style={{ opacity: 0.8 }}>
            Defina uma nova senha para acessar o sistema.
          </p>

          <label>Nova senha</label>
          <input
            type="password"
            value={pass1}
            onChange={(e) => setPass1(e.target.value)}
            placeholder="mínimo 8 caracteres"
          />

          <label>Confirmar nova senha</label>
          <input
            type="password"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            placeholder="repita a senha"
          />

          <button style={{ marginTop: 14 }} onClick={salvar}>
            Salvar nova senha
          </button>

          {msg && <div className="authMsg">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
