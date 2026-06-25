import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import { listDeliveryRuns } from '#/services/deliveries'
import { orgContext } from './context'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const listRunsInput = z.object({
  bakeryId: z.string().uuid(),
  date: dateSchema.optional(),
  employeeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
})

export const listRuns = orgContext
  .input(listRunsInput)
  .handler(async ({ context, input }) => {
    const bakery = await getBakeryForOrg(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )

    if (!bakery) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Boulangerie introuvable',
      })
    }

    return listDeliveryRuns(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      date: input.date,
      employeeId: input.employeeId,
      locationId: input.locationId,
    })
  })
