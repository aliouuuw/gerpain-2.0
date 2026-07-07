import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

export type ToastContextValue = {
  push: (toast: { message: string; variant?: ToastVariant }) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 4500

function nextToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: { message: string; variant?: ToastVariant }) => {
      const id = nextToastId()
      const item: ToastItem = {
        id,
        message: toast.message,
        variant: toast.variant ?? 'info',
      }
      setToasts((current) => [...current, item])
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer)
      activeTimers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message) => push({ message, variant: 'success' }),
      error: (message) => push({ message, variant: 'error' }),
      info: (message) => push({ message, variant: 'info' }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.variant}`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <p className="toast__message">{toast.message}</p>
            <button
              type="button"
              className="toast__dismiss"
              aria-label="Fermer"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function toastErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue',
): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
