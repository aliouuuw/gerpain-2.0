import type { session as sessionTable } from '@gerpain/db/schema'

import type { AppSession } from '#/server/auth'

type SessionRow = AppSession['session'] &
  Pick<typeof sessionTable.$inferSelect, 'activeOrganizationId'>

export function activeOrganizationId(
  session: AppSession,
): string | null | undefined {
  return (session.session as SessionRow).activeOrganizationId ?? null
}
