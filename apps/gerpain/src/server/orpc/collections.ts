import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  CollectionServiceError,
  getCashCollection,
  listCashCollections,
  rejectCashCollection,
  settleCashCollectionsPeriod,
  submitCashCollection,
  updateCashCollection,
  validateCashCollection,
} from '#/services/collections'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function mapCollectionError(error: unknown): never {
  if (error instanceof CollectionServiceError) {
    const status =
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'INVALID_STATE' || error.code === 'ALREADY_POSTED'
          ? 'CONFLICT'
          : error.code === 'LEDGER_NOT_CONFIGURED'
            ? 'INTERNAL_SERVER_ERROR'
            : 'BAD_REQUEST'
    throw new ORPCError(status, { message: error.message })
  }
  throw error
}

const listInput = z.object({
  bakeryId: z.string().uuid(),
  date: dateSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: z
    .enum(['pending', 'submitted', 'validated', 'rejected'])
    .optional(),
  locationId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  isSettled: z.boolean().optional(),
})

export const list = orgContext.input(listInput).handler(async ({ context, input }) => {
  const bakery = await getBakeryForOrg(
    db,
    context.legacyOrganizationId,
    input.bakeryId,
  )

  if (!bakery) {
    throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
  }

  return listCashCollections(db, {
    organizationId: context.legacyOrganizationId,
    bakeryId: input.bakeryId,
    date: input.date,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    locationId: input.locationId,
    employeeId: input.employeeId,
    isSettled: input.isSettled,
  })
})

export const get = orgContext
  .input(z.object({ collectionId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    try {
      return await getCashCollection(
        db,
        context.legacyOrganizationId,
        input.collectionId,
      )
    } catch (error) {
      mapCollectionError(error)
    }
  })

export const update = orgContext
  .input(
    z.object({
      collectionId: z.string().uuid(),
      cashAmount: z.number().int().min(0).optional(),
      cardAmount: z.number().int().min(0).optional(),
      mobileAmount: z.number().int().min(0).optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    try {
      return await updateCashCollection(db, {
        organizationId: context.legacyOrganizationId,
        collectionId: input.collectionId,
        cashAmount: input.cashAmount,
        cardAmount: input.cardAmount,
        mobileAmount: input.mobileAmount,
        notes: input.notes,
      })
    } catch (error) {
      mapCollectionError(error)
    }
  })

export const submit = orgContext
  .input(z.object({ collectionId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    try {
      return await submitCashCollection(
        db,
        context.legacyOrganizationId,
        input.collectionId,
      )
    } catch (error) {
      mapCollectionError(error)
    }
  })

export const validate = orgContext
  .input(z.object({ collectionId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    try {
      const validatedByUserId = await legacyUserIdForEmail(context.user.email)
      return await validateCashCollection(
        db,
        context.legacyOrganizationId,
        input.collectionId,
        validatedByUserId,
      )
    } catch (error) {
      mapCollectionError(error)
    }
  })

export const reject = orgContext
  .input(
    z.object({
      collectionId: z.string().uuid(),
      reason: z.string().min(1),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    try {
      return await rejectCashCollection(
        db,
        context.legacyOrganizationId,
        input.collectionId,
        input.reason,
      )
    } catch (error) {
      mapCollectionError(error)
    }
  })

export const settle = orgContext
  .input(
    z.object({
      bakeryId: z.string().uuid(),
      date: dateSchema.optional(),
      startDate: dateSchema.optional(),
      endDate: dateSchema.optional(),
      employeeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    const bakery = await getBakeryForOrg(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )

    if (!bakery) {
      throw new ORPCError('NOT_FOUND', { message: 'Boulangerie introuvable' })
    }

    return settleCashCollectionsPeriod(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      date: input.date,
      startDate: input.startDate,
      endDate: input.endDate,
      employeeId: input.employeeId,
    })
  })
