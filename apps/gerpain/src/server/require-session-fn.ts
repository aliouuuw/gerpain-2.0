import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import type { AppSession } from '#/server/auth'

import { getSessionFromRequest } from '#/server/require-session.server'

export const requireSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppSession> => {
    const session = await getSessionFromRequest()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return session
  },
)

export const getOptionalSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppSession | null> => {
    return getSessionFromRequest()
  },
)
