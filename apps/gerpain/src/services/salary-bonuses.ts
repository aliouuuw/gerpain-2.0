import { and, desc, eq } from 'drizzle-orm'

import { type Database, type DbOrTx, salaryBonuses } from '@gerpain/db'

import { getEmployee } from '#/services/employees'

export class SalaryBonusServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'INVALID_STATE',
    message: string,
  ) {
    super(message)
    this.name = 'SalaryBonusServiceError'
  }
}

export type SalaryBonusListItem = {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  reason: string | null
  duePeriod: string
  status: string
  paidAt: Date | null
}

export type CreateSalaryBonusInput = {
  employeeId: string
  amount: number
  duePeriod: string
  reason?: string
}

export type DueSalaryBonus = {
  id: string
  employeeId: string
  amount: number
  reason: string | null
  duePeriod: string
}

export async function listDueSalaryBonuses(
  db: Database,
  organizationId: string,
  bakeryId: string,
  periodLabel: string,
): Promise<DueSalaryBonus[]> {
  const rows = await db
    .select({
      id: salaryBonuses.id,
      employeeId: salaryBonuses.employeeId,
      amount: salaryBonuses.amount,
      reason: salaryBonuses.reason,
      duePeriod: salaryBonuses.duePeriod,
    })
    .from(salaryBonuses)
    .where(
      and(
        eq(salaryBonuses.organizationId, organizationId),
        eq(salaryBonuses.bakeryId, bakeryId),
        eq(salaryBonuses.duePeriod, periodLabel),
        eq(salaryBonuses.status, 'scheduled'),
      ),
    )

  return rows
}

export async function listSalaryBonuses(
  db: Database,
  organizationId: string,
  bakeryId: string,
  filters?: { employeeId?: string; status?: 'scheduled' | 'paid' | 'cancelled' },
): Promise<SalaryBonusListItem[]> {
  const conditions = [
    eq(salaryBonuses.organizationId, organizationId),
    eq(salaryBonuses.bakeryId, bakeryId),
  ]
  if (filters?.employeeId) {
    conditions.push(eq(salaryBonuses.employeeId, filters.employeeId))
  }
  if (filters?.status) {
    conditions.push(eq(salaryBonuses.status, filters.status))
  }

  const rows = await db.query.salaryBonuses.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryBonuses.duePeriod), desc(salaryBonuses.createdAt)],
    with: {
      employee: {
        columns: { firstName: true, lastName: true },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    amount: row.amount,
    reason: row.reason,
    duePeriod: row.duePeriod,
    status: row.status,
    paidAt: row.paidAt,
  }))
}

export async function createSalaryBonus(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: CreateSalaryBonusInput,
  createdByUserId?: string,
): Promise<SalaryBonusListItem> {
  const employee = await getEmployee(db, organizationId, bakeryId, input.employeeId)
  if (!employee) {
    throw new SalaryBonusServiceError('NOT_FOUND', 'Agent introuvable')
  }

  const now = new Date()
  const [row] = await db
    .insert(salaryBonuses)
    .values({
      organizationId,
      bakeryId,
      employeeId: input.employeeId,
      amount: input.amount,
      reason: input.reason ?? null,
      duePeriod: input.duePeriod,
      status: 'scheduled',
      createdBy: createdByUserId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!row) {
    throw new Error('Failed to create salary bonus')
  }

  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employee.fullName,
    amount: row.amount,
    reason: row.reason,
    duePeriod: row.duePeriod,
    status: row.status,
    paidAt: row.paidAt,
  }
}

export async function cancelSalaryBonus(
  db: Database,
  organizationId: string,
  bakeryId: string,
  bonusId: string,
): Promise<SalaryBonusListItem> {
  const row = await db.query.salaryBonuses.findFirst({
    where: and(
      eq(salaryBonuses.id, bonusId),
      eq(salaryBonuses.organizationId, organizationId),
      eq(salaryBonuses.bakeryId, bakeryId),
    ),
    with: {
      employee: {
        columns: { firstName: true, lastName: true },
      },
    },
  })

  if (!row) {
    throw new SalaryBonusServiceError('NOT_FOUND', 'Prime introuvable')
  }

  if (row.status !== 'scheduled') {
    throw new SalaryBonusServiceError(
      'INVALID_STATE',
      'Seules les primes prévues peuvent être annulées',
    )
  }

  const now = new Date()
  const [updated] = await db
    .update(salaryBonuses)
    .set({
      status: 'cancelled',
      updatedAt: now,
    })
    .where(
      and(
        eq(salaryBonuses.id, bonusId),
        eq(salaryBonuses.organizationId, organizationId),
        eq(salaryBonuses.status, 'scheduled'),
      ),
    )
    .returning()

  if (!updated) {
    throw new SalaryBonusServiceError(
      'INVALID_STATE',
      'Cette prime ne peut plus être annulée',
    )
  }

  return {
    id: updated.id,
    employeeId: updated.employeeId,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    amount: updated.amount,
    reason: updated.reason,
    duePeriod: updated.duePeriod,
    status: updated.status,
    paidAt: updated.paidAt,
  }
}

export async function markSalaryBonusesPaidInTx(
  tx: DbOrTx,
  organizationId: string,
  bonusIds: string[],
  payrollRunId: string,
  paidAt: Date,
): Promise<void> {
  if (bonusIds.length === 0) return

  for (const bonusId of bonusIds) {
    await tx
      .update(salaryBonuses)
      .set({
        status: 'paid',
        payrollRunId,
        paidAt,
        updatedAt: paidAt,
      })
      .where(
        and(
          eq(salaryBonuses.id, bonusId),
          eq(salaryBonuses.organizationId, organizationId),
          eq(salaryBonuses.status, 'scheduled'),
        ),
      )
  }
}
