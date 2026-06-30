import { ORPCError } from '@orpc/server'
import { z } from 'zod'

import { db, legacyUserIdForEmail } from '@gerpain/db'

import { getBakeryForOrg } from '#/services/bakeries'
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  LeaveRequestServiceError,
  listLeaveRequests,
  rejectLeaveRequest,
} from '#/services/leave-requests'
import { assertManagerRole } from '#/server/permissions'
import { orgContext } from './context'

const bakeryIdInput = z.object({
  bakeryId: z.string().uuid(),
})

const leaveTypeSchema = z.enum(['annual', 'sick', 'other'])
const leaveStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

function mapLeaveError(error: unknown): never {
  if (error instanceof LeaveRequestServiceError) {
    throw new ORPCError(
      error.code === 'NOT_FOUND'
        ? 'NOT_FOUND'
        : error.code === 'INVALID_STATE'
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
      status: leaveStatusSchema.optional(),
      fromDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      toDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    return listLeaveRequests(
      db,
      context.legacyOrganizationId,
      input.bakeryId,
      {
        employeeId: input.employeeId,
        status: input.status,
        fromDate: input.fromDate,
        toDate: input.toDate,
      },
    )
  })

export const create = orgContext
  .input(
    bakeryIdInput.extend({
      employeeId: z.string().uuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: leaveTypeSchema.optional(),
      reason: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    const { bakeryId, ...fields } = input

    try {
      return await createLeaveRequest(
        db,
        context.legacyOrganizationId,
        bakeryId,
        fields,
      )
    } catch (error) {
      mapLeaveError(error)
    }
  })

export const approve = orgContext
  .input(
    bakeryIdInput.extend({
      requestId: z.string().uuid(),
      reviewNote: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      const reviewedByUserId = await legacyUserIdForEmail(context.user.email)
      return await approveLeaveRequest(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.requestId,
        reviewedByUserId,
        input.reviewNote,
      )
    } catch (error) {
      mapLeaveError(error)
    }
  })

export const reject = orgContext
  .input(
    bakeryIdInput.extend({
      requestId: z.string().uuid(),
      reviewNote: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      const reviewedByUserId = await legacyUserIdForEmail(context.user.email)
      return await rejectLeaveRequest(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.requestId,
        reviewedByUserId,
        input.reviewNote,
      )
    } catch (error) {
      mapLeaveError(error)
    }
  })

export const cancel = orgContext
  .input(
    bakeryIdInput.extend({
      requestId: z.string().uuid(),
    }),
  )
  .handler(async ({ context, input }) => {
    assertManagerRole(context.memberRole)
    await assertBakery(context.legacyOrganizationId, input.bakeryId)

    try {
      return await cancelLeaveRequest(
        db,
        context.legacyOrganizationId,
        input.bakeryId,
        input.requestId,
      )
    } catch (error) {
      mapLeaveError(error)
    }
  })
