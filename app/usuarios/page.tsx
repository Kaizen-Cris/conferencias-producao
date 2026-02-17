'use client'

import { useEffect, useState } from 'react'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'

type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

type UiUser = {
  id: string
  email: string
  role: Role
  is_disabled: boolean
}

async function safeReadJson(res: Response) {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '')
    return { __notJson: true, text }
  }
  return res.json().catch(() => ({ __jsonParseFail: true }))
}

export default function UsuariosPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [newRole, setNewRole] = useState<Role>('OPERADOR')
  const [msg, setMsg] = useState<string | null>(null)

  const [showPass, setShowPass] = useState(false)
  const [users, setUsers] = useState<UiUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingRole(true)
      const r = await getMyRole()
      if (!mounted) return
      setRole(r as Role | null)
      setLoadingRole(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (role === 'ADMIN') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  async function getTokenOrFail() {
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) {
      setMsg('Você precisa estar logado.')
      return null
    }
    return token
  }

  async function loadUsers() {
    setLoadingUsers(true)
    setMsg(null)

    const token = await getTokenOrFail()
    if (!token) {
      setLoadingUsers(false)
      return
    }

    const res = await fetch('/api/admin/list-users', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const json: any = await safeReadJson(res)
    setLoadingUsers(false)

    if (!res.ok) {
      // tenta mostrar algo útil
      if (json?.error) return setMsg(json.error)
      if (json?.__notJson) return setMsg('Erro no servidor (resposta não-JSON). Verifique o console do Vercel/terminal.')
      return setMsg('Erro ao listar usuários.')
    }

    setUsers((json?.users as UiUser[]) || [])
  }

  async function toggleUser(userId: string, nextDisabled: boolean) {
    const ok = confirm(nextDisabled ? 'Desativar este usuário?' : 'Ativar este usuário?')
    if (!ok) return

    setMsg(null)

    const token = await getTokenOrFail()
    if (!token) return

    const res = await fetch('/api/admin/toggle-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, is_disabled: nextDisabled }),
    })

    const json: any = await safeReadJson(res)

    if (!res.ok) {
      if (json?.error) return setMsg(json.error)
      if (json?.__notJson) return setMsg('Erro no servidor (resposta não-JSON).')
      return setMsg('Erro ao atualizar usuário.')
    }

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_disabled: nextDisabled } : u)))
  }

  async function handleCreate() {
    setMsg(null)

    if (!email.trim()) return setMsg('Informe o email.')
    if (!password.trim() || password.trim().length < 8) return setMsg('Informe uma senha (mínimo recomendado: 8).')

    setCreating(true)

    const token = await getTokenOrFail()
    if (!token) {
      setCreating(false)
      return
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: email.trim(), password, role: newRole }),
    })

    const json: any = await safeReadJson(res)
    setCreating(false)

    if (!res.ok) {
      if (json?.error) return setMsg(json.error)
      if (json?.__notJson) return setMsg('Erro no servidor (resposta não-JSON).')
      return setMsg('Erro ao criar usuário.')
    }

    setMsg('Usuário criado com sucesso!')
    setEmail('')
    setPassword('')
    setNewRole('OPERADOR')
    setShowPass(false)

    // opcional: atualiza lista automaticamente
    loadUsers()
  }

  if (loadingRole) {
    return (
      <>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </>
    )
  }

  if (role !== 'ADMIN') {
    return (
      <>
        <Menu />
        <div className="container">
          <div className="card">
            <h1>Usuários</h1>
            <p>Você não tem permissão para acessar esta página.</p>
          </div>
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
              <h1>Usuários</h1>
              <p className="uSub">Crie novos acessos e defina o perfil (role).</p>
            </div>

            <button className="uBtn" onClick={loadUsers} disabled={loadingUsers} type="button">
              {loadingUsers ? 'Atualizando...' : 'Atualizar lista'}
            </button>
          </div>

          <div className="uForm">
            <div className="uField">
              <label>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: usuario@empresa.com"
                autoComplete="off"
              />
            </div>

            <div className="uField">
              <label>Senha</label>
              <div className="uPassWrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo recomendado: 8"
                />
                <button type="button" className="uEye" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            
          </div>

          <div className="uForm">
              <div className="uField">
                <label>Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: João"
                  autoComplete="off"
                />
              </div>
              <div className="uField">
                <label>Perfil</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                  <option value="OPERADOR">OPERADOR</option>
                  <option value="CONFERENTE">CONFERENTE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
          </div>

          <div className="uActions">
            <button className="uBtn uBtnPrimary" onClick={handleCreate} disabled={creating} type="button">
              {creating ? 'Criando...' : 'Criar usuário'}
            </button>

            <button
              className="uBtn uBtnGhost"
              type="button"
              onClick={() => {
                setEmail('')
                setPassword('')
                setNome('')
                setNewRole('OPERADOR')
                setMsg(null)
                setShowPass(false)
              }}
            >
              Limpar
            </button>
          </div>

          {msg && <div className="uAlert">{msg}</div>}

          <hr className="uHr" />

          <h2 className="uTitle2">Usuários cadastrados</h2>

          {users.length === 0 && !loadingUsers && (
            <p style={{ color: 'var(--muted)' }}>Nenhum usuário carregado. Clique em “Atualizar lista”.</p>
          )}

          <div className="uList">
            {users.map((u) => (
              <div key={u.id} className={`uRow ${u.is_disabled ? 'isDisabled' : ''}`}>
                <div className="uRowLeft">
                  <div className="uEmail">{u.email}</div>
                  <div className="uMeta">
                    <span className="uBadge">{u.role}</span>
                    {u.is_disabled && <span className="uBadge uBadgeOff">DESATIVADO</span>}
                  </div>
                </div>

                <button
                  type="button"
                  className={`uBtn ${u.is_disabled ? 'uBtnOk' : 'uBtnDanger'}`}
                  onClick={() => toggleUser(u.id, !u.is_disabled)}
                >
                  {u.is_disabled ? 'Ativar' : 'Desativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
