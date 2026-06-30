import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { bakerySettingsSchema } from '#/lib/bakery-settings'
import {
  BakeryServiceError,
  getBakeryForOrg,
  listBakeries,
  updateBakery,
} from '#/services/bakeries'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

function mapBakeryError(error: unknown): never {
  if (error instanceof BakeryServiceError) {
    throw new ORPCError('NOT_FOUND', { message: error.message })
  }
  throw error
}

export const list = orgContext.input(z.object({}).optional()).handler(
  async ({ context }) => {
    return listBakeries(db, context.legacyOrganizationId)
  },
)

export const get = orgContext
  .input(z.object({ bakeryId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    const bakery = await getBakeryForOrg(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )
    if (!bakery) {
      throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
    }
    return bakery
  })

export const update = orgContext
  .input(
    z.object({
      bakeryId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      address: z.string().max(500).nullable().optional(),
      phone: z.string().max(50).nullable().optional(),
      settings: bakerySettingsSchema.optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    const { bakeryId, ...fields } = input

    try {
      return await updateBakery(
        db,
        context.legacyOrganizationId,
        bakeryId,
        fields,
      )
    } catch (error) {
      mapBakeryError(error)
    }
  })
