import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import { payrollDeductionTypes } from '#/lib/payroll-deduction-lines'
import {
  addPayrollDeduction,
  closePayroll,
  getPayrollRun,
  listPayrollRuns,
  PayrollServiceError,
  previewPayroll,
  removePayrollDeduction,
} from '#/services/payroll'
import {
  discardDraftPayrollRun,
  removeDraftPayrollLine,
  saveDraftPayrollLine,
} from '#/services/payroll-draft'
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

const draftLineInput = periodInput.extend({
  employeeId: z.string().uuid(),
  baseSalary: z.number().int().min(0),
  commissionAmount: z.number().int().min(0),
  bonusAmount: z.number().int().min(0),
  advanceDeduction: z.number().int().min(0),
  collectionDeduction: z.number().int().min(0),
  grossAmount: z.number().int().min(0),
  netAmount: z.number().int().min(0),
  manualReason: z.string().max(500).optional(),
  source: z.enum(['manual', 'override']),
  computedSnapshot: z
    .object({
      commissionUnitsSold: z.number().int().min(0),
      commissionUnitsCommissioned: z.number().int().min(0),
      commissionValidatedRuns: z.number().int().min(0),
      commissionProducts: z.array(
        z.object({
          productId: z.string().uuid(),
          productName: z.string(),
          unitsSold: z.number().int().min(0),
          commissionPerUnit: z.number().int().min(0),
          commissionAmount: z.number().int().min(0),
        }),
      ),
      bonuses: z.array(
        z.object({
          id: z.string().uuid(),
          amount: z.number().int().min(0),
          reason: z.string().nullable(),
          duePeriod: z.string(),
        }),
      ),
      advanceInstallments: z.array(
        z.object({
          id: z.string().uuid(),
          amount: z.number().int().min(0),
          installmentNumber: z.number().int().min(1),
          duePeriod: z.string().nullable(),
        }),
      ),
      collectionBalance: z
        .object({
          totalExpected: z.number().int().min(0),
          totalCollected: z.number().int().min(0),
          solde: z.number().int(),
          collectionCount: z.number().int().min(0),
        })
        .nullable(),
      advanceInstallmentIds: z.array(z.string().uuid()),
      bonusIds: z.array(z.string().uuid()),
      deductions: z
        .array(
          z.object({
            id: z.string().uuid(),
            type: z.enum(payrollDeductionTypes),
            label: z.string().min(1).max(120),
            amount: z.number().int().min(0),
          }),
        )
        .optional(),
    })
    .optional(),
  deductions: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.enum(payrollDeductionTypes),
        label: z.string().min(1).max(120),
        amount: z.number().int().min(0),
      }),
    )
    .optional(),
})

export const saveDraftLine = orgContext
  .input(draftLineInput)
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const {
      bakeryId,
      startDate,
      endDate,
      computedSnapshot,
      ...line
    } = input

    try {
      return await saveDraftPayrollLine(
        db,
        {
          organizationId: context.legacyOrganizationId,
          bakeryId,
          startDate,
          endDate,
        },
        {
          ...line,
          computedSnapshot: computedSnapshot
            ? { ...computedSnapshot, deductions: computedSnapshot.deductions ?? [] }
            : undefined,
        },
      )
    } catch (error) {
      mapPayrollError(error)
    }
  })

export const removeDraftLine = orgContext
  .input(
    periodInput.extend({
      lineId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      await removeDraftPayrollLine(
        db,
        {
          organizationId: context.legacyOrganizationId,
          bakeryId: input.bakeryId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        input.lineId,
      )
      return { ok: true as const }
    } catch (error) {
      mapPayrollError(error)
    }
  })

export const discardDraft = orgContext
  .input(periodInput)
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      await discardDraftPayrollRun(db, {
        organizationId: context.legacyOrganizationId,
        bakeryId: input.bakeryId,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      return { ok: true as const }
    } catch (error) {
      mapPayrollError(error)
    }
  })

export const addDeduction = orgContext
  .input(
    periodInput.extend({
      employeeId: z.string().uuid(),
      type: z.enum(payrollDeductionTypes),
      label: z.string().min(1).max(120),
      amount: z.number().int().min(1),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, startDate, endDate, employeeId, type, label, amount } =
      input

    try {
      return await addPayrollDeduction(
        db,
        {
          organizationId: context.legacyOrganizationId,
          bakeryId,
          startDate,
          endDate,
        },
        employeeId,
        { type, label, amount },
      )
    } catch (error) {
      mapPayrollError(error)
    }
  })

export const removeDeduction = orgContext
  .input(
    periodInput.extend({
      employeeId: z.string().uuid(),
      deductionId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, startDate, endDate, employeeId, deductionId } = input

    try {
      return await removePayrollDeduction(
        db,
        {
          organizationId: context.legacyOrganizationId,
          bakeryId,
          startDate,
          endDate,
        },
        employeeId,
        deductionId,
      )
    } catch (error) {
      mapPayrollError(error)
    }
  })
