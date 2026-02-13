'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getMyRole } from '../lib/auth'

export default function Menu() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    async function loadRole() {
      const r = await getMyRole()
      setRole(r)
    }
    loadRole()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!role) return null

  return (

      <div style={{ borderBottom: '1px solid var(--border)', background: 'white' }}>
        <div className="container" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(role === 'OPERADOR' || role === 'ADMIN') && (
            <button className="btn" onClick={() => router.push('/')}>
              Registrar
            </button>
          )}

          {(role === 'CONFERENTE' || role === 'ADMIN') && (
            <button className="btn" onClick={() => router.push('/pendentes')}>
              Pendentes
            </button>
          )}

          {(role === 'OPERADOR' || role === 'ADMIN') && (
            <button className="btn" onClick={() => router.push('/divergencias')}>
              Divergências
            </button>
          )}

          {role === 'ADMIN' && (
            <button className="btn" onClick={() => router.push('/historico')}>
              Histórico
            </button>
          )}

          {role === 'ADMIN' && (
            <button className="btn" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          )}


          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={logout}>Sair</button>
          </div>
        </div>
      </div>
  )
}
