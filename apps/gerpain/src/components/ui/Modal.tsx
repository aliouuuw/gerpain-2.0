import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export type ModalProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  onClose: () => void
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <div className="modal__heading">
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
            {description ? (
              <p className="modal__description">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="modal__close"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
