import type { AppSession } from '#/server/auth'

type SessionRow = AppSession['session'] & {
  activeOrganizationId?: string | null
}

export function activeOrganizationId(
  session: AppSession,
): string | null | undefined {
  return (session.session as SessionRow).activeOrganizationId
}
