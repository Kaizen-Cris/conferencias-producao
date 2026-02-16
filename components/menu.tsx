'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Menu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      <div className="menu-bar">
        <div className="menu-title">Conferências</div>

        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

        <div className="menu-desktop">
          <button onClick={() => go('/')}>Registrar</button>
          <button onClick={() => go('/pendentes')}>Pendentes</button>
          <button onClick={() => go('/divergencias')}>Divergências</button>
          <button onClick={() => go('/historico')}>Histórico</button>
          <button onClick={() => go('/dashboard')}>Dashboard</button>
        </div>
      </div>

      {open && (
        <div className="menu-mobile">
          <button onClick={() => go('/')}>Registrar</button>
          <button onClick={() => go('/pendentes')}>Pendentes</button>
          <button onClick={() => go('/divergencias')}>Divergências</button>
          <button onClick={() => go('/historico')}>Histórico</button>
          <button onClick={() => go('/dashboard')}>Dashboard</button>
        </div>
      )}
    </>
  )
}
