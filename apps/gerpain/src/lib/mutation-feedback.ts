import type { ToastContextValue } from '#/lib/toast'
import { toastErrorMessage } from '#/lib/toast'

export function mutationSuccess(toast: ToastContextValue, message: string) {
  return () => toast.success(message)
}

export function mutationError(
  toast: ToastContextValue,
  fallback = 'Une erreur est survenue',
) {
  return (error: unknown) => toast.error(toastErrorMessage(error, fallback))
}
