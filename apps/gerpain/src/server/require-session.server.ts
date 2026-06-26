import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth, type AppSession } from '#/server/auth'

export async function getSessionFromRequest(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })

  return session?.user ? session : null
}
