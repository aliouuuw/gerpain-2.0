import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  closePayroll,
  getPayrollRun,
  listPayrollRuns,
  PayrollServiceError,
  previewPayroll,
} from '#/services/payroll'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const periodDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const periodInput = bakeryIdInput.extend({
  startDate: periodDateSchema,
  endDate: periodDateSchema,
})

function mapPayrollError(error: unknown): never {
  if (error instanceof PayrollServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'ALREADY_CLOSED'
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

export const preview = orgContext
  .input(periodInput)
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return previewPayroll(db, {
      organizationId: context.legacyOrganizationId,
      bakeryId: input.bakeryId,
      startDate: input.startDate,
      endDate: input.endDate,
    })
  })

export const list = orgContext
  .input(bakeryIdInput)
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listPayrollRuns(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
    )
  })

export const get = orgContext
  .input(
    bakeryIdInput.extend({
      runId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await getPayrollRun(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.runId,
      )
    } catch (error) {
      mapPayrollError(error)
    }
  })

export const close = orgContext
  .input(periodInput)
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const closedByUserId = await legacyUserIdForEmail(context.user.email)

    try {
      return await closePayroll(
        db,
        {
          organizationId: context.legacyOrganizationId,
          bakeryId: input.bakeryId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        closedByUserId ?? undefined,
      )
    } catch (error) {
      mapPayrollError(error)
    }
  })
