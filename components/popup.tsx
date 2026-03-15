'use client'

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
  if (!open) return null

  const palette =
    variant === 'success'
      ? { border: '#10b981', bg: '#ecfdf5', title: '#047857', icon: '✓' }
      : variant === 'alert'
        ? { border: '#ef4444', bg: '#fef2f2', title: '#b91c1c', icon: '!' }
        : variant === 'confirm'
          ? { border: '#2563eb', bg: '#eff6ff', title: '#1d4ed8', icon: '?' }
          : { border: '#f59e0b', bg: '#fffbeb', title: '#92400e', icon: '!' }

  const fallbackTitle =
    variant === 'success'
      ? 'Sucesso'
      : variant === 'alert'
        ? 'Alerta'
        : variant === 'confirm'
          ? 'Confirmação'
          : 'Aviso'

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
            <h3 className="modal-title" style={{ color: palette.title, margin: 0 }}>
              {title || fallbackTitle}
            </h3>
            <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
              {variant === 'success' ? 'Operação concluída' : variant === 'alert' ? 'Atenção necessária' : variant === 'confirm' ? 'Confirme para continuar' : 'Verifique esta informação'}
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ margin: 0, fontSize: 14 }}>
          {message}
        </div>

        <div className="modal-actions">
          {showCancel && (
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
              if (onConfirm) onConfirm()
              onClose()
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
