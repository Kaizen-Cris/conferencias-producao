'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Menu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <div className="menu-bar">
        <div className="menu-title">Conferências</div>

        {/* MENU DESKTOP */}
        <div className="menu-desktop">
          <button onClick={() => go('/')}>Registrar</button>
          <button onClick={() => go('/pendentes')}>Pendentes</button>
          <button onClick={() => go('/divergencias')}>Divergências</button>
          <button onClick={() => go('/historico')}>Histórico</button>
          <button onClick={() => go('/dashboard')}>Dashboard</button>

          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>

        {/* BOTÃO HAMBURGER */}
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>

      {/* MENU MOBILE */}
      {open && (
        <div className="menu-mobile">
          <button onClick={() => go('/')}>Registrar</button>
          <button onClick={() => go('/pendentes')}>Pendentes</button>
          <button onClick={() => go('/divergencias')}>Divergências</button>
          <button onClick={() => go('/historico')}>Histórico</button>
          <button onClick={() => go('/dashboard')}>Dashboard</button>

          <button className="logout-btn-mobile" onClick={handleLogout}>
            Sair
          </button>
        </div>
      )}
    </>
  )
}
