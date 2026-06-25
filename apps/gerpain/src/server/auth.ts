import { createAuth } from '@gerpain/auth'
import { db } from '@gerpain/db'

import { env } from '#/env'

export const auth = createAuth({
  db,
  appName: env.VITE_APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
})

export type AppSession = typeof auth.$Infer.Session
