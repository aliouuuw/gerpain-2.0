"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react"

import { Button } from "@/components/Button"
import { cx } from "@/lib/utils"

interface ToastProps {
  variant?: "success" | "error" | "warning" | "info"
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
}

interface ToastProviderProps {
  children: React.ReactNode
}

interface ToastItem extends ToastProps {
  id: string
}

const ToastContext = React.createContext<
  | {
      notify: (toast: ToastProps) => void
      dismiss: (id: string) => void
    }
  | undefined
>(undefined)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const variantStyles = {
  success: "border-[var(--success)]/30 bg-[var(--success-subtle)] text-[var(--success)]",
  error: "border-[var(--error)]/30 bg-[var(--error-subtle)] text-[var(--error)]",
  warning: "border-[var(--warning)]/30 bg-[var(--warning-subtle)] text-[var(--warning)]",
  info: "border-[var(--info)]/30 bg-[var(--info-subtle)] text-[var(--info)]",
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const ToastCard = ({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) => {
  const Icon = icons[toast.variant ?? "info"]

  return (
    <div
      className={cx(
        "flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-lg)]",
        "bg-[var(--card)] text-[var(--foreground)]",
        variantStyles[toast.variant ?? "info"]
      )}
      role="status"
    >
      <Icon className="mt-0.5 size-5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{toast.description}</p>
        )}
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs"
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex size-7 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
        aria-label="Fermer la notification"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = React.useCallback((toast: ToastProps) => {
    const id = createId()
    const nextToast: ToastItem = {
      id,
      duration: 5000,
      variant: "info",
      ...toast,
    }
    setToasts((prev) => [nextToast, ...prev].slice(0, 5))

    if (nextToast.duration) {
      window.setTimeout(() => dismiss(id), nextToast.duration)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <div
        className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

export type { ToastProps, ToastProviderProps }
