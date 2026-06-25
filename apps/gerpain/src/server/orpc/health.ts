import { os } from '@orpc/server'
import { z } from 'zod'

export const publicContext = os.$context<{ headers: Headers }>()

export const health = publicContext
  .input(z.object({}).optional())
  .handler(async () => ({
    ok: true as const,
    service: 'gerpain' as const,
    version: '0.0.0' as const,
  }))
