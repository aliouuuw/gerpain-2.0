import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'

import { db } from '../client'
import * as schema from '../schema/index'

const betterAuthSchema = {
  user: schema.user,
  session: schema.session,
  account: schema.account,
  verification: schema.verification,
  organization: schema.organization,
  member: schema.member,
  invitation: schema.invitation,
}

/** Seed/CLI auth — no TanStack cookies, CSRF disabled for server-side API calls. */
export function createSeedAuth() {
  return betterAuth({
    appName: process.env.VITE_APP_NAME ?? 'Gerpain',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    secret:
      process.env.BETTER_AUTH_SECRET ??
      'dev-only-change-me-before-production!!',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: betterAuthSchema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      disableSignUp: false,
    },
    advanced: {
      disableCSRFCheck: true,
    },
    plugins: [organization()],
    experimental: { joins: true },
  })
}
