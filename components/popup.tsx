'use client'

import { useEffect } from 'react'

type PopupProps = {
  open: boolean
  title?: string
  message: string
  variant?: 'success' | 'alert' | 'warning' | 'confirm'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  onConfirm?: () => void
  onClose: () => void
}

export default function Popup({
  open,
  title,
  message,
  variant = 'warning',
  confirmText = 'OK',
  cancelText = 'Cancelar',
  showCancel = false,
  onConfirm,
  onClose,
}: PopupProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const isConfirm = variant === 'confirm'
  const shouldShowCancel = showCancel || isConfirm

  const palette =
    variant === 'success'
      ? { border: '#10b981', bg: '#ecfdf5', title: '#047857', icon: 'OK' }
      : variant === 'alert'
        ? { border: '#ef4444', bg: '#fef2f2', title: '#b91c1c', icon: '!' }
        : variant === 'confirm'
          ? { border: '#ef4444', bg: '#fef2f2', title: '#b91c1c', icon: '?' }
          : { border: '#f59e0b', bg: '#fffbeb', title: '#92400e', icon: '!' }

  const fallbackTitle =
    variant === 'success'
      ? 'Sucesso'
      : variant === 'alert'
        ? 'Alerta'
        : variant === 'confirm'
          ? 'Confirmacao'
          : 'Aviso'

  const helperText =
    variant === 'success'
      ? 'Operacao concluida'
      : variant === 'alert'
        ? 'Atencao necessaria'
        : variant === 'confirm'
          ? 'Confirme para continuar'
          : 'Verifique esta informacao'

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      aria-describedby="popup-message"
      onClick={() => {
        if (!isConfirm) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#ffffff',
          border: `1px solid ${palette.border}33`,
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,.18)',
          padding: 18,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              background: palette.bg,
              color: palette.title,
              fontWeight: 900,
              border: `2px solid ${palette.border}`,
              fontSize: 18,
            }}
          >
            {palette.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 id="popup-title" className="modal-title" style={{ color: palette.title, margin: 0 }}>
              {title || fallbackTitle}
            </h3>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{helperText}</div>
          </div>
        </div>

        <div id="popup-message" className="modal-body" style={{ margin: 0, fontSize: 14 }}>
          {message}
        </div>

        <div className="modal-actions">
          {shouldShowCancel && (
            <button
              className="btn"
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                borderColor: '#e5e7eb',
                color: '#111827',
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            className="btn"
            type="button"
            onClick={() => {
              onClose()
              if (onConfirm) onConfirm()
            }}
            style={{
              background: palette.border,
              borderColor: palette.border,
              color: '#fff',
              boxShadow: `0 8px 18px ${palette.border}55`,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
