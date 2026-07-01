import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  createSalaryBonus,
  listSalaryBonuses,
  SalaryBonusServiceError,
} from '#/services/salary-bonuses'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const bonusStatusSchema = z.enum(['scheduled', 'paid', 'cancelled'])

function mapBonusError(error: unknown): never {
  if (error instanceof SalaryBonusServiceError) {
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
      employeeId: z.string().uuid().optional(),
      status: bonusStatusSchema.optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listSalaryBonuses(
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
      amount: z.number().int().positive(),
      duePeriod: z.string().regex(/^\d{4}-\d{2}$/),
      reason: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const createdByUserId = await legacyUserIdForEmail(context.user.email)

    try {
      return await createSalaryBonus(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        {
          employeeId: input.employeeId,
          amount: input.amount,
          duePeriod: input.duePeriod,
          reason: input.reason,
        },
        createdByUserId ?? undefined,
      )
    } catch (error) {
      mapBonusError(error)
    }
  })
