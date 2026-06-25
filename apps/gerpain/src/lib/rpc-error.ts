import { isDefinedError } from '@orpc/client'

function errorMessage(error: { message?: string }): string {
  return error.message ?? 'Une erreur est survenue'
}

export function formatRpcError(error: unknown): string {
  if (isDefinedError(error)) {
    return errorMessage(error)
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Une erreur est survenue'
}
