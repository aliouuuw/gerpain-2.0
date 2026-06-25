import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: isProduction
      ? z.string().min(32)
      : z
          .string()
          .min(32)
          .default('dev-only-change-me-before-production!!'),
    BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_APP_NAME: z.string().default('Gerpain'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  },
  emptyStringAsUndefined: true,
})
