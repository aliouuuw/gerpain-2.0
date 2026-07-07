import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  cancelSalaryAdvance,
  createSalaryAdvance,
  listSalaryAdvances,
  paySalaryAdvanceInstallment,
  paySalaryAdvanceRemainder,
  rollOverSalaryAdvanceInstallment,
  SalaryAdvanceServiceError,
} from '#/services/salary-advances'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const advanceStatusSchema = z.enum(['active', 'closed', 'cancelled'])
const repaymentMethodSchema = z.enum(['payroll_deduction', 'cash'])

function mapAdvanceError(error: unknown): never {
  if (error instanceof SalaryAdvanceServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'INVALID_STATE' || error.code === 'ALREADY_POSTED'
          ? 'CONFLICT'
          : 'BAD_REQUEST',
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
      employeeId: z.string().uuid().optional(),
      status: advanceStatusSchema.optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listSalaryAdvances(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
      {
        employeeId: input.employeeId,
        status: input.status,
      },
    )
  })

export const create = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
      totalAmount: z.number().int().positive(),
      installmentCount: z.number().int().min(1).max(24),
      notes: z.string().max(500).optional(),
      firstDuePeriod: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, ...fields } = input

    try {
      const createdByUserId = await legacyUserIdForEmail(context.user.email)
      return await createSalaryAdvance(
        db,
        context.legacyOrganizationId,
        bakeryId,
        fields,
        createdByUserId ?? undefined,
      )
    } catch (error) {
      mapAdvanceError(error)
    }
  })

export const payInstallment = orgContext
  .input(
    bakeryIdInput.extend({
      installmentId: z.string().uuid(),
      method: repaymentMethodSchema,
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      const createdByUserId = await legacyUserIdForEmail(context.user.email)
      return await paySalaryAdvanceInstallment(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.installmentId,
        input.method,
        createdByUserId ?? undefined,
      )
    } catch (error) {
      mapAdvanceError(error)
    }
  })

export const payRemainder = orgContext
  .input(
    bakeryIdInput.extend({
      advanceId: z.string().uuid(),
      method: repaymentMethodSchema,
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      const createdByUserId = await legacyUserIdForEmail(context.user.email)
      return await paySalaryAdvanceRemainder(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.advanceId,
        input.method,
        createdByUserId ?? undefined,
      )
    } catch (error) {
      mapAdvanceError(error)
    }
  })

export const rollOverInstallment = orgContext
  .input(
    bakeryIdInput.extend({
      installmentId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await rollOverSalaryAdvanceInstallment(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.installmentId,
      )
    } catch (error) {
      mapAdvanceError(error)
    }
  })

export const cancel = orgContext
  .input(
    bakeryIdInput.extend({
      advanceId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      const cancelledByUserId = await legacyUserIdForEmail(context.user.email)
      return await cancelSalaryAdvance(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.advanceId,
        cancelledByUserId ?? undefined,
      )
    } catch (error) {
      mapAdvanceError(error)
    }
  })
