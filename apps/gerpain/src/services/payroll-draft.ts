import { and, eq } from 'drizzle-orm'

import {
  type Database,
  type DbOrTx,
  payrollRunLines,
  payrollRuns,
} from '@gerpain/db'

import { getEmployee } from '#/services/employees'
import {
  PayrollServiceError,
  type PayrollLinePreview,
  type PayrollLineSnapshot,
  type PayrollPeriodInput,
  snapshotFromPreview,
} from '#/services/payroll'
import { periodLabelFromEndDate } from '#/lib/period'
import {
  netAfterDeductions,
  type PayrollDeductionLine,
} from '#/lib/payroll-deduction-lines'

export type PayrollLineSource = 'computed' | 'manual' | 'override'

export type PayrollLineDetailSnapshot = PayrollLineSnapshot & {
  source?: 'manual' | 'override'
  manualReason?: string | null
  computedSnapshot?: PayrollLineSnapshot
}

export type SaveDraftPayrollLineInput = {
  employeeId: string
  baseSalary: number
  commissionAmount: number
  bonusAmount: number
  advanceDeduction: number
  collectionDeduction: number
  grossAmount: number
  netAmount: number
  manualReason?: string
  source: 'manual' | 'override'
  deductions?: PayrollDeductionLine[]
  computedSnapshot?: PayrollLineSnapshot
}

export type DraftPayrollLineResult = {
  draftRunId: string
  lineId: string
}

function parseDetailSnapshot(raw: unknown): PayrollLineDetailSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as PayrollLineDetailSnapshot
}

function snapshotFieldsFromDetail(
  detail: PayrollLineDetailSnapshot | null,
): Pick<
  PayrollLinePreview,
  | 'commissionUnitsSold'
  | 'commissionUnitsCommissioned'
  | 'commissionValidatedRuns'
  | 'commissionProducts'
  | 'bonuses'
  | 'advanceInstallments'
  | 'collectionBalance'
  | 'advanceInstallmentIds'
  | 'bonusIds'
  | 'deductions'
> {
  if (!detail) {
    return {
      commissionUnitsSold: 0,
      commissionUnitsCommissioned: 0,
      commissionValidatedRuns: 0,
      commissionProducts: [],
      bonuses: [],
      advanceInstallments: [],
      collectionBalance: null,
      advanceInstallmentIds: [],
      bonusIds: [],
      deductions: [],
    }
  }

  return {
    commissionUnitsSold: detail.commissionUnitsSold ?? 0,
    commissionUnitsCommissioned: detail.commissionUnitsCommissioned ?? 0,
    commissionValidatedRuns: detail.commissionValidatedRuns ?? 0,
    commissionProducts: detail.commissionProducts ?? [],
    bonuses: detail.bonuses ?? [],
    advanceInstallments: detail.advanceInstallments ?? [],
    collectionBalance: detail.collectionBalance ?? null,
    advanceInstallmentIds: detail.advanceInstallmentIds ?? [],
    bonusIds: detail.bonusIds ?? [],
    deductions: detail.deductions ?? [],
  }
}

export function mergePayrollLinesWithDraft(
  computedLines: PayrollLinePreview[],
  draftLines: PayrollLinePreview[],
): PayrollLinePreview[] {
  const draftByEmployee = new Map(
    draftLines.map((line) => [line.employeeId, line]),
  )
  const merged = computedLines.map((line) => {
    const draft = draftByEmployee.get(line.employeeId)
    if (!draft) {
      return { ...line, lineSource: 'computed' as const }
    }
    draftByEmployee.delete(line.employeeId)
    return draft
  })

  for (const draftOnly of draftByEmployee.values()) {
    merged.push(draftOnly)
  }

  return merged.sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, 'fr'),
  )
}

function draftDbLineToPreview(
  row: {
    id: string
    employeeId: string
    baseSalary: number
    commissionAmount: number
    bonusAmount: number
    advanceDeduction: number
    collectionDeduction: number
    grossAmount: number
    netAmount: number
    detailSnapshot: unknown
    employee: {
      firstName: string
      lastName: string
      role: string
    }
  },
): PayrollLinePreview {
  const detail = parseDetailSnapshot(row.detailSnapshot)
  const source = detail?.source ?? 'manual'

  return {
    employeeId: row.employeeId,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    role: row.employee.role,
    baseSalary: row.baseSalary,
    commissionAmount: row.commissionAmount,
    bonusAmount: row.bonusAmount,
    advanceDeduction: row.advanceDeduction,
    collectionDeduction: row.collectionDeduction,
    grossAmount: row.grossAmount,
    netAmount: row.netAmount,
    ...snapshotFieldsFromDetail(detail),
    lineSource: source,
    manualReason: detail?.manualReason ?? null,
    draftLineId: row.id,
  }
}

export async function loadDraftPayrollLines(
  db: Database,
  organizationId: string,
  bakeryId: string,
  startDate: string,
  endDate: string,
): Promise<PayrollLinePreview[]> {
  const draftRun = await db.query.payrollRuns.findFirst({
    where: and(
      eq(payrollRuns.organizationId, organizationId),
      eq(payrollRuns.bakeryId, bakeryId),
      eq(payrollRuns.startDate, startDate),
      eq(payrollRuns.endDate, endDate),
      eq(payrollRuns.status, 'draft'),
    ),
    with: {
      lines: {
        with: {
          employee: {
            columns: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (!draftRun) return []

  return draftRun.lines.map((line) => draftDbLineToPreview(line))
}

async function assertPeriodNotClosed(
  db: Database,
  input: PayrollPeriodInput,
): Promise<void> {
  const closed = await db.query.payrollRuns.findFirst({
    where: and(
      eq(payrollRuns.organizationId, input.organizationId),
      eq(payrollRuns.bakeryId, input.bakeryId),
      eq(payrollRuns.startDate, input.startDate),
      eq(payrollRuns.endDate, input.endDate),
      eq(payrollRuns.status, 'closed'),
    ),
    columns: { id: true },
  })

  if (closed) {
    throw new PayrollServiceError(
      'ALREADY_CLOSED',
      'Cette période est déjà clôturée',
    )
  }
}

export async function ensureDraftPayrollRun(
  db: DbOrTx,
  input: PayrollPeriodInput,
): Promise<{ id: string }> {
  const existing = await db.query.payrollRuns.findFirst({
    where: and(
      eq(payrollRuns.organizationId, input.organizationId),
      eq(payrollRuns.bakeryId, input.bakeryId),
      eq(payrollRuns.startDate, input.startDate),
      eq(payrollRuns.endDate, input.endDate),
      eq(payrollRuns.status, 'draft'),
    ),
    columns: { id: true },
  })

  if (existing) return existing

  const now = new Date()
  const periodLabel = periodLabelFromEndDate(input.endDate)
  const [run] = await db
    .insert(payrollRuns)
    .values({
      organizationId: input.organizationId,
      bakeryId: input.bakeryId,
      startDate: input.startDate,
      endDate: input.endDate,
      periodLabel,
      status: 'draft',
      totalGross: 0,
      totalNet: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: payrollRuns.id })

  if (!run) {
    throw new Error('Failed to create draft payroll run')
  }

  return run
}

function validateDraftAmounts(input: SaveDraftPayrollLineInput): void {
  const fields = [
    input.baseSalary,
    input.commissionAmount,
    input.bonusAmount,
    input.advanceDeduction,
    input.collectionDeduction,
    input.grossAmount,
    input.netAmount,
  ]

  if (fields.some((value) => value < 0 || !Number.isFinite(value))) {
    throw new PayrollServiceError(
      'INVALID_STATE',
      'Les montants doivent être positifs ou nuls',
    )
  }

  const expectedGross =
    input.baseSalary + input.commissionAmount + input.bonusAmount
  if (expectedGross !== input.grossAmount) {
    throw new PayrollServiceError(
      'INVALID_STATE',
      'Le brut doit être égal à base + commission + primes',
    )
  }

  const expectedNet = netAfterDeductions({
    grossAmount: input.grossAmount,
    advanceDeduction: input.advanceDeduction,
    collectionDeduction: input.collectionDeduction,
    deductions: input.deductions ?? [],
  })
  if (expectedNet !== input.netAmount) {
    throw new PayrollServiceError(
      'INVALID_STATE',
      'Le net doit être égal au brut moins les retenues',
    )
  }
}

function buildDetailSnapshot(
  input: SaveDraftPayrollLineInput,
): PayrollLineDetailSnapshot {
  const base = input.computedSnapshot ?? {
    commissionUnitsSold: 0,
    commissionUnitsCommissioned: 0,
    commissionValidatedRuns: 0,
    commissionProducts: [],
    bonuses: [],
    advanceInstallments: [],
    collectionBalance: null,
    advanceInstallmentIds: [],
    bonusIds: [],
    deductions: [],
  }

  return {
    ...base,
    deductions: input.deductions ?? base.deductions ?? [],
    source: input.source,
    manualReason: input.manualReason?.trim() || null,
    ...(input.source === 'override' && input.computedSnapshot
      ? { computedSnapshot: input.computedSnapshot }
      : {}),
  }
}

export async function saveDraftPayrollLine(
  db: Database,
  input: PayrollPeriodInput,
  line: SaveDraftPayrollLineInput,
): Promise<DraftPayrollLineResult> {
  await assertPeriodNotClosed(db, input)
  validateDraftAmounts(line)

  const employee = await getEmployee(
    db,
    input.organizationId,
    input.bakeryId,
    line.employeeId,
  ).catch(() => null)
  if (!employee) {
    throw new PayrollServiceError('NOT_FOUND', 'Agent introuvable')
  }

  return db.transaction(async (tx) => {
    const draftRun = await ensureDraftPayrollRun(tx, input)
    const now = new Date()
    const detailSnapshot = buildDetailSnapshot(line)

    const existingLine = await tx.query.payrollRunLines.findFirst({
      where: and(
        eq(payrollRunLines.payrollRunId, draftRun.id),
        eq(payrollRunLines.employeeId, line.employeeId),
      ),
      columns: { id: true },
    })

    if (existingLine) {
      const existingRow = await tx.query.payrollRunLines.findFirst({
        where: eq(payrollRunLines.id, existingLine.id),
        columns: { detailSnapshot: true },
      })
      const existingDetail = parseDetailSnapshot(existingRow?.detailSnapshot)
      const detailSnapshot = buildDetailSnapshot({
        ...line,
        deductions: line.deductions ?? existingDetail?.deductions ?? [],
        computedSnapshot:
          line.computedSnapshot ?? existingDetail?.computedSnapshot,
      })

      const [updated] = await tx
        .update(payrollRunLines)
        .set({
          baseSalary: line.baseSalary,
          commissionAmount: line.commissionAmount,
          bonusAmount: line.bonusAmount,
          advanceDeduction: line.advanceDeduction,
          collectionDeduction: line.collectionDeduction,
          grossAmount: line.grossAmount,
          netAmount: line.netAmount,
          detailSnapshot,
        })
        .where(eq(payrollRunLines.id, existingLine.id))
        .returning({ id: payrollRunLines.id })

      if (!updated) {
        throw new Error('Failed to update draft payroll line')
      }

      await tx
        .update(payrollRuns)
        .set({ updatedAt: now })
        .where(eq(payrollRuns.id, draftRun.id))

      return { draftRunId: draftRun.id, lineId: updated.id }
    }

    const [created] = await tx
      .insert(payrollRunLines)
      .values({
        organizationId: input.organizationId,
        payrollRunId: draftRun.id,
        employeeId: line.employeeId,
        baseSalary: line.baseSalary,
        commissionAmount: line.commissionAmount,
        bonusAmount: line.bonusAmount,
        advanceDeduction: line.advanceDeduction,
        collectionDeduction: line.collectionDeduction,
        grossAmount: line.grossAmount,
        netAmount: line.netAmount,
        detailSnapshot,
        createdAt: now,
      })
      .returning({ id: payrollRunLines.id })

    if (!created) {
      throw new Error('Failed to create draft payroll line')
    }

    await tx
      .update(payrollRuns)
      .set({ updatedAt: now })
      .where(eq(payrollRuns.id, draftRun.id))

    return { draftRunId: draftRun.id, lineId: created.id }
  })
}

export async function removeDraftPayrollLine(
  db: Database,
  input: PayrollPeriodInput,
  lineId: string,
): Promise<void> {
  await assertPeriodNotClosed(db, input)

  const line = await db.query.payrollRunLines.findFirst({
    where: and(
      eq(payrollRunLines.id, lineId),
      eq(payrollRunLines.organizationId, input.organizationId),
    ),
    with: {
      payrollRun: {
        columns: {
          id: true,
          bakeryId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
    },
  })

  if (
    !line ||
    line.payrollRun.bakeryId !== input.bakeryId ||
    line.payrollRun.startDate !== input.startDate ||
    line.payrollRun.endDate !== input.endDate ||
    line.payrollRun.status !== 'draft'
  ) {
    throw new PayrollServiceError('NOT_FOUND', 'Ligne manuelle introuvable')
  }

  await db.delete(payrollRunLines).where(eq(payrollRunLines.id, lineId))
}

export async function discardDraftPayrollRun(
  db: Database,
  input: PayrollPeriodInput,
): Promise<void> {
  await assertPeriodNotClosed(db, input)

  await db
    .delete(payrollRuns)
    .where(
      and(
        eq(payrollRuns.organizationId, input.organizationId),
        eq(payrollRuns.bakeryId, input.bakeryId),
        eq(payrollRuns.startDate, input.startDate),
        eq(payrollRuns.endDate, input.endDate),
        eq(payrollRuns.status, 'draft'),
      ),
    )
}

export async function deleteDraftPayrollRunInTx(
  tx: DbOrTx,
  input: PayrollPeriodInput,
): Promise<void> {
  await tx
    .delete(payrollRuns)
    .where(
      and(
        eq(payrollRuns.organizationId, input.organizationId),
        eq(payrollRuns.bakeryId, input.bakeryId),
        eq(payrollRuns.startDate, input.startDate),
        eq(payrollRuns.endDate, input.endDate),
        eq(payrollRuns.status, 'draft'),
      ),
    )
}

/** Build override snapshot from a computed preview line before admin edits. */
export function computedSnapshotForOverride(
  line: PayrollLinePreview,
): PayrollLineSnapshot {
  return snapshotFromPreview(line)
}
