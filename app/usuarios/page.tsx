'use client'

import { useEffect, useState } from 'react'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'

type Role = 'OPERADOR' | 'CONFERENTE' | 'ADMIN'

export default function UsuariosPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newRole, setNewRole] = useState<Role>('OPERADOR')
  const [msg, setMsg] = useState<string | null>(null)

  const [showPass, setShowPass] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  
  useEffect(() => {
    ;(async () => {
        setLoading(true)
        const r = await getMyRole()
        setRole(r as Role | null)
        setLoading(false)
    })()
    }, [])

    useEffect(() => {
    if (role === 'ADMIN') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role])

  async function loadUsers() {
    setLoadingUsers(true)
    setMsg(null)

    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) {
        setMsg('Você precisa estar logado.')
        setLoadingUsers(false)
        return
    }

    const res = await fetch('/api/admin/list-users', {
        headers: { Authorization: `Bearer ${token}` },
    })

    const json = await res.json()
    setLoadingUsers(false)

    if (!res.ok) {
        setMsg(json.error || 'Erro ao listar usuários.')
        return
    }

    setUsers(json.users || [])
    }

  async function toggleUser(userId: string, nextDisabled: boolean) {
    const ok = confirm(nextDisabled ? 'Desativar este usuário?' : 'Ativar este usuário?')
    if (!ok) return

    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) {
        setMsg('Você precisa estar logado.')
        return
    }

    const res = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, is_disabled: nextDisabled }),
    })

    const json = await res.json()
    if (!res.ok) {
        setMsg(json.error || 'Erro ao atualizar usuário.')
        return
    }

    // atualiza na tela sem recarregar tudo
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_disabled: nextDisabled } : u))
    }


  async function handleCreate() {
    setMsg(null)

    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) {
      setMsg('Você precisa estar logado.')
      return
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, role: newRole }),
    })

    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error || 'Erro ao criar usuário.')
      return
    }

    setMsg('Usuário criado com sucesso!')
    setEmail('')
    setPassword('')
    setNewRole('OPERADOR')
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
                <button
                type="button"
                className="uEye"
                onClick={() => setShowPass((v) => !v)}
                >
                {showPass ? 'Ocultar' : 'Mostrar'}
                </button>
            </div>
            </div>

            <div className="uField">
            <label>Perfil</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                <option value="OPERADOR">OPERADOR</option>
                <option value="CONFERENTE">CONFERENTE</option>
                <option value="ADMIN">ADMIN</option>
            </select>
            </div>
        </div>

        <div className="uActions">
            <button className="uBtn uBtnPrimary" onClick={handleCreate} type="button">
            Criar usuário
            </button>

            <button
            className="uBtn uBtnGhost"
            type="button"
            onClick={() => {
                setEmail('')
                setPassword('')
                setNewRole('OPERADOR' as any)
                setMsg(null)
            }}
            >
            Limpar
            </button>
        </div>

        {msg && <div className="uAlert">{msg}</div>}

        <hr className="uHr" />

        <h2 className="uTitle2">Usuários cadastrados</h2>

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




        {msg && <div className="alert">{msg}</div>}
        </div>

    </>
  )
}
