import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'

import {
  type Database,
  type DbOrTx,
  employees,
  leaveRequests,
} from '@gerpain/db'

import { getEmployee } from '#/services/employees'

export class LeaveRequestServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'INVALID_DATES'
      | 'INVALID_STATE'
      | 'OVERLAP',
    message: string,
  ) {
    super(message)
    this.name = 'LeaveRequestServiceError'
  }
}

export type LeaveRequestType = 'annual' | 'sick' | 'other'
export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type LeaveRequestListItem = {
  id: string
  employeeId: string
  employeeName: string
  startDate: string
  endDate: string
  type: string
  status: string
  reason: string | null
  reviewNote: string | null
  reviewedAt: Date | null
  createdAt: Date
}

export type LeaveRequestInput = {
  employeeId: string
  startDate: string
  endDate: string
  type?: LeaveRequestType
  reason?: string
}

function assertValidDateRange(startDate: string, endDate: string) {
  if (startDate > endDate) {
    throw new LeaveRequestServiceError(
      'INVALID_DATES',
      'La date de fin doit être après la date de début',
    )
  }
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

async function assertNoOverlappingRequests(
  db: Database,
  organizationId: string,
  bakeryId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
) {
  const rows = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.organizationId, organizationId),
      eq(leaveRequests.bakeryId, bakeryId),
      eq(leaveRequests.employeeId, employeeId),
      inArray(leaveRequests.status, ['pending', 'approved']),
    ),
  })

  const conflict = rows.find(
    (row) =>
      row.id !== excludeId &&
      rangesOverlap(startDate, endDate, row.startDate, row.endDate),
  )

  if (conflict) {
    throw new LeaveRequestServiceError(
      'OVERLAP',
      'Une demande chevauche déjà cette période',
    )
  }
}

export async function getEmployeeIdsOnApprovedLeave(
  db: DbOrTx,
  organizationId: string,
  bakeryId: string,
  date: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ employeeId: leaveRequests.employeeId })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.organizationId, organizationId),
        eq(leaveRequests.bakeryId, bakeryId),
        eq(leaveRequests.status, 'approved'),
        lte(leaveRequests.startDate, date),
        gte(leaveRequests.endDate, date),
      ),
    )

  return new Set(rows.map((row) => row.employeeId))
}

export async function listLeaveRequests(
  db: Database,
  organizationId: string,
  bakeryId: string,
  options?: {
    employeeId?: string
    status?: LeaveRequestStatus
    fromDate?: string
    toDate?: string
  },
): Promise<LeaveRequestListItem[]> {
  const conditions = [
    eq(leaveRequests.organizationId, organizationId),
    eq(leaveRequests.bakeryId, bakeryId),
  ]

  if (options?.employeeId) {
    conditions.push(eq(leaveRequests.employeeId, options.employeeId))
  }
  if (options?.status) {
    conditions.push(eq(leaveRequests.status, options.status))
  }
  if (options?.fromDate) {
    conditions.push(gte(leaveRequests.endDate, options.fromDate))
  }
  if (options?.toDate) {
    conditions.push(lte(leaveRequests.startDate, options.toDate))
  }

  const rows = await db.query.leaveRequests.findMany({
    where: and(...conditions),
    orderBy: [desc(leaveRequests.startDate), desc(leaveRequests.createdAt)],
  })

  if (rows.length === 0) return []

  const employeeIds = [...new Set(rows.map((row) => row.employeeId))]
  const employeeRows = await db.query.employees.findMany({
    where: inArray(employees.id, employeeIds),
  })
  const nameById = new Map(
    employeeRows.map((row) => [
      row.id,
      `${row.firstName} ${row.lastName}`,
    ]),
  )

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: nameById.get(row.employeeId) ?? '—',
    startDate: row.startDate,
    endDate: row.endDate,
    type: row.type,
    status: row.status,
    reason: row.reason,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
  }))
}

export async function createLeaveRequest(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: LeaveRequestInput,
): Promise<LeaveRequestListItem> {
  assertValidDateRange(input.startDate, input.endDate)
  await getEmployee(db, organizationId, bakeryId, input.employeeId)
  await assertNoOverlappingRequests(
    db,
    organizationId,
    bakeryId,
    input.employeeId,
    input.startDate,
    input.endDate,
  )

  const [created] = await db
    .insert(leaveRequests)
    .values({
      organizationId,
      bakeryId,
      employeeId: input.employeeId,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type ?? 'annual',
      reason: input.reason?.trim() || null,
      status: 'pending',
    })
    .returning()

  const match = (await listLeaveRequests(db, organizationId, bakeryId)).find(
    (row) => row.id === created!.id,
  )
  if (!match) {
    throw new LeaveRequestServiceError('NOT_FOUND', 'Demande introuvable')
  }
  return match
}

async function getLeaveRequestOrThrow(
  db: Database,
  organizationId: string,
  bakeryId: string,
  requestId: string,
) {
  const row = await db.query.leaveRequests.findFirst({
    where: and(
      eq(leaveRequests.id, requestId),
      eq(leaveRequests.organizationId, organizationId),
      eq(leaveRequests.bakeryId, bakeryId),
    ),
  })

  if (!row) {
    throw new LeaveRequestServiceError('NOT_FOUND', 'Demande introuvable')
  }

  return row
}

export async function approveLeaveRequest(
  db: Database,
  organizationId: string,
  bakeryId: string,
  requestId: string,
  reviewedByUserId: string | null,
  reviewNote?: string,
): Promise<LeaveRequestListItem> {
  const row = await getLeaveRequestOrThrow(
    db,
    organizationId,
    bakeryId,
    requestId,
  )

  if (row.status !== 'pending') {
    throw new LeaveRequestServiceError(
      'INVALID_STATE',
      'Seules les demandes en attente peuvent être approuvées',
    )
  }

  await assertNoOverlappingRequests(
    db,
    organizationId,
    bakeryId,
    row.employeeId,
    row.startDate,
    row.endDate,
    row.id,
  )

  const now = new Date()
  await db
    .update(leaveRequests)
    .set({
      status: 'approved',
      reviewedBy: reviewedByUserId,
      reviewedAt: now,
      reviewNote: reviewNote?.trim() || null,
      updatedAt: now,
    })
    .where(eq(leaveRequests.id, requestId))

  const updated = (await listLeaveRequests(db, organizationId, bakeryId)).find(
    (item) => item.id === requestId,
  )
  if (!updated) {
    throw new LeaveRequestServiceError('NOT_FOUND', 'Demande introuvable')
  }
  return updated
}

export async function rejectLeaveRequest(
  db: Database,
  organizationId: string,
  bakeryId: string,
  requestId: string,
  reviewedByUserId: string | null,
  reviewNote?: string,
): Promise<LeaveRequestListItem> {
  const row = await getLeaveRequestOrThrow(
    db,
    organizationId,
    bakeryId,
    requestId,
  )

  if (row.status !== 'pending') {
    throw new LeaveRequestServiceError(
      'INVALID_STATE',
      'Seules les demandes en attente peuvent être rejetées',
    )
  }

  const now = new Date()
  await db
    .update(leaveRequests)
    .set({
      status: 'rejected',
      reviewedBy: reviewedByUserId,
      reviewedAt: now,
      reviewNote: reviewNote?.trim() || null,
      updatedAt: now,
    })
    .where(eq(leaveRequests.id, requestId))

  const updated = (await listLeaveRequests(db, organizationId, bakeryId)).find(
    (item) => item.id === requestId,
  )
  if (!updated) {
    throw new LeaveRequestServiceError('NOT_FOUND', 'Demande introuvable')
  }
  return updated
}

export async function cancelLeaveRequest(
  db: Database,
  organizationId: string,
  bakeryId: string,
  requestId: string,
): Promise<LeaveRequestListItem> {
  const row = await getLeaveRequestOrThrow(
    db,
    organizationId,
    bakeryId,
    requestId,
  )

  if (row.status !== 'pending' && row.status !== 'approved') {
    throw new LeaveRequestServiceError(
      'INVALID_STATE',
      'Cette demande ne peut plus être annulée',
    )
  }

  const now = new Date()
  await db
    .update(leaveRequests)
    .set({
      status: 'cancelled',
      updatedAt: now,
    })
    .where(eq(leaveRequests.id, requestId))

  const updated = (await listLeaveRequests(db, organizationId, bakeryId)).find(
    (item) => item.id === requestId,
  )
  if (!updated) {
    throw new LeaveRequestServiceError('NOT_FOUND', 'Demande introuvable')
  }
  return updated
}
