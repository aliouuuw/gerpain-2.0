import type { ReactNode } from 'react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmVariant = 'primary',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <div className="confirm-dialog__body">{children}</div>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="table-action"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              confirmVariant === 'danger'
                ? 'btn-danger btn-sm'
                : 'btn-primary btn-sm'
            }
            disabled={loading || confirmDisabled}
            onClick={onConfirm}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
