import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import { getDayActivity } from '#/services/day-activity'
import { getDashboardSummary } from '#/services/dashboard'
import { orgContext } from './context'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const summary = orgContext
  .input(
    z.object({
      bakeryId: z.string().uuid(),
      date: dateSchema.optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    const bakery = await getBakeryForOrg(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )

    if (!bakery) {
      throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
    }

    const date =
      input.date ??
      new Date().toISOString().slice(0, 10)

    return getDashboardSummary(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      date,
    })
  })

export const dayActivity = orgContext
  .input(
    z.object({
      bakeryId: z.string().uuid(),
      startDate: dateSchema,
      endDate: dateSchema,
    }),
  )
  .handler(async ({ context, input }) => {
    const bakery = await getBakeryForOrg(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )

    if (!bakery) {
      throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
    }

    return getDayActivity(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      startDate: input.startDate,
      endDate: input.endDate,
    })
  })
