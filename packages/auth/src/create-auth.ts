import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import type { Database } from '@gerpain/db'
import * as schema from '@gerpain/db/schema'

export type CreateAuthOptions = {
  db: Database
  baseURL: string
  secret: string
  appName: string
  /** Operator sign-up is invite-only by default. */
  disableSignUp?: boolean
  /** Skip TanStack cookie plugin (CLI, seeds, tests). */
  serverOnly?: boolean
}

const betterAuthSchema = {
  user: schema.user,
  session: schema.session,
  account: schema.account,
  verification: schema.verification,
  organization: schema.organization,
  member: schema.member,
  invitation: schema.invitation,
}

export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: options.appName,
    baseURL: options.baseURL,
    secret: options.secret,
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: betterAuthSchema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      disableSignUp: options.disableSignUp ?? true,
    },
    plugins: [
      ...(options.serverOnly ? [] : [tanstackStartCookies()]),
      organization(),
    ],
    advanced: {
      disableCSRFCheck: options.serverOnly ?? false,
    },
    experimental: { joins: true },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']

export const AUTH_PACKAGE_READY = true as const
