import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  createLocation,
  deactivateLocation,
  getLocation,
  listLocations,
  LocationServiceError,
  updateLocation,
} from '#/services/locations'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const locationTypeSchema = z.enum(['shop', 'warehouse'])

const locationFieldsSchema = z.object({
  name: z.string().min(1).max(255),
  type: locationTypeSchema,
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
})

function mapLocationError(error: unknown): never {
  if (error instanceof LocationServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'BAD_REQUEST',
      { message: error.message },
    )
  }
  throw error
}

async function assertBakery(
  organizationId: string,
  bakeryId: string,
): Promise<void> {
  const bakery = await getBakeryForOrg(db, organizationId, bakeryId)
  if (!bakery) {
    throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
  }
}

export const list = orgContext
  .input(
    bakeryIdInput.extend({
      includeInactive: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listLocations(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
      { includeInactive: input.includeInactive },
    )
  })

export const get = orgContext
  .input(
    bakeryIdInput.extend({
      locationId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await getLocation(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.locationId,
      )
    } catch (error) {
      mapLocationError(error)
    }
  })

export const create = orgContext
  .input(bakeryIdInput.merge(locationFieldsSchema))
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, ...fields } = input
    return createLocation(
      db,
      context.legacyOrganizationId,
      bakeryId,
      fields,
    )
  })

export const update = orgContext
  .input(
    bakeryIdInput.extend({
      locationId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      type: locationTypeSchema.optional(),
      address: z.string().max(500).optional(),
      phone: z.string().max(50).optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, locationId, ...fields } = input

    try {
      return await updateLocation(
        db,
        context.legacyOrganizationId,
        bakeryId,
        locationId,
        fields,
      )
    } catch (error) {
      mapLocationError(error)
    }
  })

export const deactivate = orgContext
  .input(
    bakeryIdInput.extend({
      locationId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await deactivateLocation(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.locationId,
      )
    } catch (error) {
      mapLocationError(error)
    }
  })
