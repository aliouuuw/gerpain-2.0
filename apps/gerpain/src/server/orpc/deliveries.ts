import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  DeliveryServiceError,
  getDeliveryRun,
  listDeliveryRuns,
  updateDeliveryItem,
  validateDeliveryRun,
} from '#/services/deliveries'
import { orgContext } from './context'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function mapDeliveryError(error: unknown): never {
  if (error instanceof DeliveryServiceError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'ALREADY_VALIDATED'
          ? 'CONFLICT'
          : 'BAD_REQUEST'
    throw new ORPCError(status, { message: error.message })
  }
  throw error
}

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

export const getRun = orgContext
  .input(z.object({ runId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    try {
      return await getDeliveryRun(
        db,
        context.legacyOrganizationId,
        input.runId,
      )
    } catch (error) {
      mapDeliveryError(error)
    }
  })

export const updateItem = orgContext
  .input(
    z.object({
      itemId: z.string().uuid(),
      quantityEntrusted: z.number().int().min(0).optional(),
      quantityReturned: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    try {
      return await updateDeliveryItem(db, {
        organizationId: context.legacyOrganizationId,
        itemId: input.itemId,
        quantityEntrusted: input.quantityEntrusted,
        quantityReturned: input.quantityReturned,
      })
    } catch (error) {
      mapDeliveryError(error)
    }
  })

export const validateRun = orgContext
  .input(z.object({ runId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    try {
      return await validateDeliveryRun(
        db,
        context.legacyOrganizationId,
        input.runId,
      )
    } catch (error) {
      mapDeliveryError(error)
    }
  })
