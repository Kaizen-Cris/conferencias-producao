'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import Popup from '../../components/popup'

type Role = 'ADMIN' | 'OPERADOR' | 'CONFERENTE'

type BackupFile = {
  name: string
  created_at?: string | null
  updated_at?: string | null
}

export default function ConfiguracaoPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [myEmail, setMyEmail] = useState('')
  const [myPassword, setMyPassword] = useState('')
  const [changingPass, setChangingPass] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [popupAction, setPopupAction] = useState<null | (() => void)>(null)

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
      const r = await getMyRole()
      if (mounted) setRole(r as Role | null)
      setLoading(false)
    }

    init()
    return () => {
      mounted = false
    }
  }, [router])

  async function getTokenOrFail() {
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) {
      setBackupMsg('Você precisa estar logado.')
      return null
    }
    return token
  }

  async function loadBackups() {
    setLoadingBackups(true)
    setBackupMsg(null)

    const token = await getTokenOrFail()
    if (!token) {
      setLoadingBackups(false)
      return
    }

    const res = await fetch('/api/admin/list-backups', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const json = await res.json().catch(() => ({}))
    setLoadingBackups(false)

    if (!res.ok) {
      return setBackupMsg(json?.error || 'Erro ao carregar backups.')
    }

    setBackupFiles((json?.files as BackupFile[]) || [])
  }

  function confirmRestore(file: BackupFile) {
    setPopupMessage(
      `Restaurar o backup "${file.name}"? Isso pode sobrescrever registros existentes com o mesmo ID.`
    )
    setPopupAction(() => () => doRestore(file.name))
    setPopupOpen(true)
  }

  async function doRestore(fileName: string) {
    setRestoring(true)
    setBackupMsg(null)

    const token = await getTokenOrFail()
    if (!token) {
      setRestoring(false)
      return
    }

    const res = await fetch('/api/admin/restore-backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ file: fileName }),
    })

    const json = await res.json().catch(() => ({}))
    setRestoring(false)

    if (!res.ok) {
      return setBackupMsg(json?.error || 'Erro ao restaurar backup.')
    }

    setBackupMsg(`Backup restaurado! Registros processados: ${json?.count ?? 0}.`)
  }

  useEffect(() => {
    if (role === 'ADMIN') loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

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
      <Popup
        open={popupOpen}
        title="Alerta"
        message={popupMessage}
        confirmText="Restaurar"
        cancelText="Cancelar"
        showCancel
        variant="alert"
        onConfirm={popupAction ?? undefined}
        onClose={() => {
          setPopupOpen(false)
          setPopupAction(null)
        }}
      />

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

          {role === 'ADMIN' && (
            <>
              <hr className="uHr" />

              <div className="uHeader">
                <div>
                  <h2 className="uTitle2">Backups (admin)</h2>
                  <p className="uSub">Restaure backups diários das movimentações.</p>
                </div>

                <button className="uBtn" onClick={loadBackups} disabled={loadingBackups} type="button">
                  {loadingBackups ? 'Atualizando...' : 'Atualizar lista'}
                </button>
              </div>

              {backupMsg && <div className="uAlert">{backupMsg}</div>}

              {backupFiles.length === 0 && !loadingBackups && (
                <p style={{ color: 'var(--muted)' }}>Nenhum backup encontrado.</p>
              )}

              <div className="uList">
                {backupFiles.map((f) => (
                  <div key={f.name} className="uRow">
                    <div className="uRowLeft">
                      <div className="uEmail">{f.name}</div>
                      <div className="uMeta">
                        <span className="uBadge">BACKUP</span>
                        {f.created_at && (
                          <span className="uBadge">
                            {new Date(f.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="uBtn uBtnDanger"
                      onClick={() => confirmRestore(f)}
                      disabled={restoring}
                    >
                      {restoring ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
