'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getMyRole } from '../lib/auth'

type Role = 'ADMIN' | 'CONFERENTE' | 'OPERADOR' | null

type NavItem = {
  label: string
  path: string
  roles: Array<Exclude<Role, null>>
}

export default function Menu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>(null)

  // abas e permissões (ajuste se quiser)
  const items: NavItem[] = useMemo(
    () => [
      { label: 'Registrar', path: '/', roles: ['OPERADOR', 'ADMIN'] },
      { label: 'Pendentes', path: '/pendentes', roles: ['CONFERENTE', 'ADMIN'] },
      { label: 'Divergências', path: '/divergencias', roles: ['OPERADOR', 'ADMIN'] },
      { label: 'Histórico', path: '/historico', roles: ['ADMIN'] },
      { label: 'Dashboard', path: '/dashboard', roles: ['ADMIN'] },
    ],
    []
  )

  const allowedItems = useMemo(() => {
    if (!role) return []
    return items.filter((i) => i.roles.includes(role as Exclude<Role, null>))
  }, [items, role])

  useEffect(() => {
    let mounted = true

    async function init() {
      const r = await getMyRole()
      if (mounted) setRole(r as Role)
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function handleLogout() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  // Se ainda não carregou role, mostra menu mínimo (não vaza abas)
  const renderItems = role ? allowedItems : []

  return (
    <>
      <div className="menu-bar">
        <div className="menu-title">Conferências</div>

        {/* DESKTOP */}
        <div className="menu-desktop">
          {renderItems.map((i) => (
            <button
              key={i.path}
              onClick={() => go(i.path)}
              className={pathname === i.path ? 'menu-active' : undefined}
            >
              {i.label}
            </button>
          ))}

          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>

        {/* HAMBURGER */}
        <button className="menu-toggle" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>

      {/* MOBILE */}
      {open && (
        <div className="menu-mobile">
          {renderItems.map((i) => (
            <button
              key={i.path}
              onClick={() => go(i.path)}
              className={pathname === i.path ? 'menu-active-mobile' : undefined}
            >
              {i.label}
            </button>
          ))}

          <button className="logout-btn-mobile" onClick={handleLogout}>
            Sair
          </button>
        </div>
      )}
    </>
  )
}