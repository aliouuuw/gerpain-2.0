import { and, asc, desc, eq, isNull, or } from 'drizzle-orm'

import { post } from '@gerpain/bocal'
import {
  type Database,
  type DbOrTx,
  ledgerMovements,
  payrollRunLines,
  payrollRuns,
  salaryAdvanceInstallments,
  salaryAdvances,
} from '@gerpain/db'

import { getPeriodCommissionBreakdown, getPeriodCommissions } from '#/services/employee-commission'
import { getPeriodCollectionBalancesByEmployee, settleCashCollectionsPeriod } from '#/services/collections'
import { listEmployees } from '#/services/employees'
import {
  ensureLedgerAccountsForOrg,
  getLedgerAccountMap,
} from '#/services/ledger-accounts'
import {
  buildPayrollCollectionDeductionLines,
  buildPayrollPayoutLines,
} from '#/services/payroll-posting'
import { collectionShortfallDeduction } from '#/services/payroll-deductions'
import { paySalaryAdvanceInstallmentInTx } from '#/services/salary-advances'
import {
  type DueSalaryBonus,
  listDueSalaryBonuses,
  markSalaryBonusesPaidInTx,
} from '#/services/salary-bonuses'
import { periodLabelFromEndDate } from '#/lib/period'

export class PayrollServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'ALREADY_CLOSED' | 'INVALID_STATE' | 'LEDGER_NOT_CONFIGURED',
    message: string,
  ) {
    super(message)
    this.name = 'PayrollServiceError'
  }
}

export type PayrollPeriodInput = {
  organizationId: string
  bakeryId: string
  startDate: string
  endDate: string
}

export type PayrollAdvanceInstallmentPreview = {
  id: string
  amount: number
  installmentNumber: number
  duePeriod: string | null
}

export type PayrollBonusPreview = {
  id: string
  amount: number
  reason: string | null
  duePeriod: string
}

export type PayrollCommissionProductPreview = {
  productId: string
  productName: string
  unitsSold: number
  commissionPerUnit: number
  commissionAmount: number
}

export type PayrollCollectionBalancePreview = {
  totalExpected: number
  totalCollected: number
  solde: number
  collectionCount: number
}

export type PayrollLinePreview = {
  employeeId: string
  employeeName: string
  role: string
  baseSalary: number
  commissionAmount: number
  commissionUnitsSold: number
  commissionUnitsCommissioned: number
  commissionValidatedRuns: number
  commissionProducts: PayrollCommissionProductPreview[]
  bonusAmount: number
  bonuses: PayrollBonusPreview[]
  advanceDeduction: number
  advanceInstallments: PayrollAdvanceInstallmentPreview[]
  collectionBalance: PayrollCollectionBalancePreview | null
  collectionDeduction: number
  grossAmount: number
  netAmount: number
  advanceInstallmentIds: string[]
  bonusIds: string[]
}

/** Frozen at close — commission/cash detail for audit without recomputing. */
export type PayrollLineSnapshot = {
  commissionUnitsSold: number
  commissionUnitsCommissioned: number
  commissionValidatedRuns: number
  commissionProducts: PayrollCommissionProductPreview[]
  bonuses: PayrollBonusPreview[]
  advanceInstallments: PayrollAdvanceInstallmentPreview[]
  collectionBalance: PayrollCollectionBalancePreview | null
  advanceInstallmentIds: string[]
  bonusIds: string[]
}

function snapshotFromPreview(line: PayrollLinePreview): PayrollLineSnapshot {
  return {
    commissionUnitsSold: line.commissionUnitsSold,
    commissionUnitsCommissioned: line.commissionUnitsCommissioned,
    commissionValidatedRuns: line.commissionValidatedRuns,
    commissionProducts: line.commissionProducts,
    bonuses: line.bonuses,
    advanceInstallments: line.advanceInstallments,
    collectionBalance: line.collectionBalance,
    advanceInstallmentIds: line.advanceInstallmentIds,
    bonusIds: line.bonusIds,
  }
}

function parseLineSnapshot(raw: unknown): PayrollLineSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as PayrollLineSnapshot
}

function snapshotFields(
  snapshot: PayrollLineSnapshot | null,
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
> {
  if (!snapshot) {
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
    }
  }
  return {
    commissionUnitsSold: snapshot.commissionUnitsSold,
    commissionUnitsCommissioned: snapshot.commissionUnitsCommissioned,
    commissionValidatedRuns: snapshot.commissionValidatedRuns,
    commissionProducts: snapshot.commissionProducts,
    bonuses: snapshot.bonuses,
    advanceInstallments: snapshot.advanceInstallments,
    collectionBalance: snapshot.collectionBalance,
    advanceInstallmentIds: snapshot.advanceInstallmentIds,
    bonusIds: snapshot.bonusIds,
  }
}

function totalsFromLines(
  lines: PayrollLinePreview[],
  totals?: { gross?: number; net?: number },
): PayrollPreview['totals'] {
  return {
    gross:
      totals?.gross ??
      lines.reduce((sum, line) => sum + line.grossAmount, 0),
    net: totals?.net ?? lines.reduce((sum, line) => sum + line.netAmount, 0),
    commission: lines.reduce((sum, line) => sum + line.commissionAmount, 0),
    bonus: lines.reduce((sum, line) => sum + line.bonusAmount, 0),
    advanceDeduction: lines.reduce(
      (sum, line) => sum + line.advanceDeduction,
      0,
    ),
    collectionDeduction: lines.reduce(
      (sum, line) => sum + line.collectionDeduction,
      0,
    ),
  }
}

export type PayrollPreview = {
  startDate: string
  endDate: string
  periodLabel: string
  isClosed: boolean
  closedRunId: string | null
  lines: PayrollLinePreview[]
  totals: {
    gross: number
    net: number
    commission: number
    bonus: number
    advanceDeduction: number
    collectionDeduction: number
  }
}

export type PayrollRunSummary = {
  id: string
  startDate: string
  endDate: string
  periodLabel: string
  status: string
  totalGross: number
  totalNet: number
  closedAt: Date | null
  employeeCount: number
}

export type PayrollRunDetail = PayrollRunSummary & {
  lines: PayrollLinePreview[]
}

type AdvanceInstallmentDue = {
  id: string
  employeeId: string
  amount: number
  installmentNumber: number
  duePeriod: string | null
}

async function listDueAdvanceInstallments(
  db: Database,
  organizationId: string,
  bakeryId: string,
  periodLabel: string,
): Promise<AdvanceInstallmentDue[]> {
  const rows = await db
    .select({
      id: salaryAdvanceInstallments.id,
      employeeId: salaryAdvances.employeeId,
      amount: salaryAdvanceInstallments.amount,
      installmentNumber: salaryAdvanceInstallments.installmentNumber,
      duePeriod: salaryAdvanceInstallments.duePeriod,
      advanceId: salaryAdvances.id,
    })
    .from(salaryAdvanceInstallments)
    .innerJoin(
      salaryAdvances,
      eq(salaryAdvanceInstallments.advanceId, salaryAdvances.id),
    )
    .where(
      and(
        eq(salaryAdvanceInstallments.organizationId, organizationId),
        eq(salaryAdvances.bakeryId, bakeryId),
        eq(salaryAdvances.status, 'active'),
        eq(salaryAdvanceInstallments.status, 'scheduled'),
        or(
          eq(salaryAdvanceInstallments.duePeriod, periodLabel),
          isNull(salaryAdvanceInstallments.duePeriod),
        ),
      ),
    )
    .orderBy(
      asc(salaryAdvances.employeeId),
      asc(salaryAdvanceInstallments.installmentNumber),
    )

  const seenAdvanceWithoutPeriod = new Set<string>()
  const due: AdvanceInstallmentDue[] = []

  for (const row of rows) {
    if (row.duePeriod === periodLabel) {
      due.push({
        id: row.id,
        employeeId: row.employeeId,
        amount: row.amount,
        installmentNumber: row.installmentNumber,
        duePeriod: row.duePeriod,
      })
      continue
    }

    if (!row.duePeriod && !seenAdvanceWithoutPeriod.has(row.advanceId)) {
      seenAdvanceWithoutPeriod.add(row.advanceId)
      due.push({
        id: row.id,
        employeeId: row.employeeId,
        amount: row.amount,
        installmentNumber: row.installmentNumber,
        duePeriod: row.duePeriod,
      })
    }
  }

  return due
}

async function buildPayrollLines(
  db: Database,
  input: PayrollPeriodInput,
): Promise<{
  periodLabel: string
  lines: PayrollLinePreview[]
  totals: PayrollPreview['totals']
}> {
  const periodLabel = periodLabelFromEndDate(input.endDate)

  const [activeEmployees, commissions, commissionBreakdown, collectionBalances, dueInstallments, dueBonuses] =
    await Promise.all([
    listEmployees(db, input.organizationId, input.bakeryId, {
      status: 'active',
    }),
    getPeriodCommissions(db, input),
    getPeriodCommissionBreakdown(db, input),
    getPeriodCollectionBalancesByEmployee(db, input),
    listDueAdvanceInstallments(
      db,
      input.organizationId,
      input.bakeryId,
      periodLabel,
    ),
    listDueSalaryBonuses(
      db,
      input.organizationId,
      input.bakeryId,
      periodLabel,
    ),
  ])

  const commissionByEmployee = new Map(
    commissions.map((row) => [row.employeeId, row]),
  )

  const commissionProductsByEmployee = new Map<
    string,
    PayrollCommissionProductPreview[]
  >()
  for (const row of commissionBreakdown) {
    const list = commissionProductsByEmployee.get(row.employeeId) ?? []
    list.push({
      productId: row.productId,
      productName: row.productName,
      unitsSold: row.unitsSold,
      commissionPerUnit: row.commissionPerUnit,
      commissionAmount: row.commissionDue,
    })
    commissionProductsByEmployee.set(row.employeeId, list)
  }

  const collectionBalanceByEmployee = new Map(
    collectionBalances.map((row) => [row.employeeId, row]),
  )

  const installmentsByEmployee = new Map<string, AdvanceInstallmentDue[]>()
  for (const installment of dueInstallments) {
    const list = installmentsByEmployee.get(installment.employeeId) ?? []
    list.push(installment)
    installmentsByEmployee.set(installment.employeeId, list)
  }

  const bonusesByEmployee = new Map<string, DueSalaryBonus[]>()
  for (const bonus of dueBonuses) {
    const list = bonusesByEmployee.get(bonus.employeeId) ?? []
    list.push(bonus)
    bonusesByEmployee.set(bonus.employeeId, list)
  }

  const lines: PayrollLinePreview[] = activeEmployees.map((employee) => {
    const baseSalary = employee.baseSalary ?? 0
    const commissionRow = commissionByEmployee.get(employee.id)
    const commissionAmount =
      employee.role === 'delivery' ? (commissionRow?.commissionDue ?? 0) : 0
    const commissionUnitsSold =
      employee.role === 'delivery' ? (commissionRow?.unitsSold ?? 0) : 0
    const commissionValidatedRuns =
      employee.role === 'delivery' ? (commissionRow?.validatedRuns ?? 0) : 0
    const commissionProducts =
      employee.role === 'delivery'
        ? (commissionProductsByEmployee.get(employee.id) ?? [])
        : []
    const commissionUnitsCommissioned = commissionProducts.reduce(
      (sum, row) =>
        row.commissionPerUnit > 0 ? sum + row.unitsSold : sum,
      0,
    )
    const collectionRow = collectionBalanceByEmployee.get(employee.id)
    const collectionBalance =
      employee.role === 'delivery' && collectionRow
        ? {
            totalExpected: collectionRow.totalExpected,
            totalCollected: collectionRow.totalCollected,
            solde: collectionRow.solde,
            collectionCount: collectionRow.collectionCount,
          }
        : null
    const employeeInstallments = installmentsByEmployee.get(employee.id) ?? []
    const advanceDeduction = employeeInstallments.reduce(
      (sum, row) => sum + row.amount,
      0,
    )
    const employeeBonuses = bonusesByEmployee.get(employee.id) ?? []
    const bonusAmount = employeeBonuses.reduce((sum, row) => sum + row.amount, 0)
    const collectionDeduction = collectionShortfallDeduction(collectionBalance)
    const grossAmount = baseSalary + commissionAmount + bonusAmount
    const netAmount = Math.max(
      grossAmount - advanceDeduction - collectionDeduction,
      0,
    )

    return {
      employeeId: employee.id,
      employeeName: employee.fullName,
      role: employee.role,
      baseSalary,
      commissionAmount,
      commissionUnitsSold,
      commissionUnitsCommissioned,
      commissionValidatedRuns,
      commissionProducts,
      bonusAmount,
      bonuses: employeeBonuses.map((row) => ({
        id: row.id,
        amount: row.amount,
        reason: row.reason,
        duePeriod: row.duePeriod,
      })),
      advanceDeduction,
      advanceInstallments: employeeInstallments.map((row) => ({
        id: row.id,
        amount: row.amount,
        installmentNumber: row.installmentNumber,
        duePeriod: row.duePeriod,
      })),
      collectionBalance,
      collectionDeduction,
      grossAmount,
      netAmount,
      advanceInstallmentIds: employeeInstallments.map((row) => row.id),
      bonusIds: employeeBonuses.map((row) => row.id),
    }
  })

  const totals = lines.reduce(
    (acc, line) => ({
      gross: acc.gross + line.grossAmount,
      net: acc.net + line.netAmount,
      commission: acc.commission + line.commissionAmount,
      bonus: acc.bonus + line.bonusAmount,
      advanceDeduction: acc.advanceDeduction + line.advanceDeduction,
      collectionDeduction: acc.collectionDeduction + line.collectionDeduction,
    }),
    {
      gross: 0,
      net: 0,
      commission: 0,
      bonus: 0,
      advanceDeduction: 0,
      collectionDeduction: 0,
    },
  )

  return { periodLabel, lines, totals }
}

export async function previewPayroll(
  db: Database,
  input: PayrollPeriodInput,
): Promise<PayrollPreview> {
  const [closedRun] = await db
    .select({ id: payrollRuns.id })
    .from(payrollRuns)
    .where(
      and(
        eq(payrollRuns.organizationId, input.organizationId),
        eq(payrollRuns.bakeryId, input.bakeryId),
        eq(payrollRuns.startDate, input.startDate),
        eq(payrollRuns.endDate, input.endDate),
        eq(payrollRuns.status, 'closed'),
      ),
    )
    .limit(1)

  if (closedRun) {
    const detail = await getPayrollRun(
      db,
      input.organizationId,
      input.bakeryId,
      closedRun.id,
    )
    return {
      startDate: detail.startDate,
      endDate: detail.endDate,
      periodLabel: detail.periodLabel,
      isClosed: true,
      closedRunId: detail.id,
      lines: detail.lines,
      totals: totalsFromLines(detail.lines, {
        gross: detail.totalGross,
        net: detail.totalNet,
      }),
    }
  }

  const { periodLabel, lines, totals } = await buildPayrollLines(db, input)

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    periodLabel,
    isClosed: false,
    closedRunId: null,
    lines,
    totals,
  }
}

export async function listPayrollRuns(
  db: Database,
  organizationId: string,
  bakeryId: string,
): Promise<PayrollRunSummary[]> {
  const runs = await db.query.payrollRuns.findMany({
    where: and(
      eq(payrollRuns.organizationId, organizationId),
      eq(payrollRuns.bakeryId, bakeryId),
      eq(payrollRuns.status, 'closed'),
    ),
    orderBy: [desc(payrollRuns.endDate)],
    with: {
      lines: {
        columns: { id: true },
      },
    },
  })

  return runs.map((run) => ({
    id: run.id,
    startDate: run.startDate,
    endDate: run.endDate,
    periodLabel: run.periodLabel,
    status: run.status,
    totalGross: run.totalGross,
    totalNet: run.totalNet,
    closedAt: run.closedAt,
    employeeCount: run.lines.length,
  }))
}

export async function getPayrollRun(
  db: DbOrTx,
  organizationId: string,
  bakeryId: string,
  runId: string,
): Promise<PayrollRunDetail> {
  const run = await db.query.payrollRuns.findFirst({
    where: and(
      eq(payrollRuns.id, runId),
      eq(payrollRuns.organizationId, organizationId),
      eq(payrollRuns.bakeryId, bakeryId),
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

  if (!run) {
    throw new PayrollServiceError('NOT_FOUND', 'Clôture de paie introuvable')
  }

  const lines: PayrollLinePreview[] = run.lines.map((line) => ({
    employeeId: line.employeeId,
    employeeName: `${line.employee.firstName} ${line.employee.lastName}`,
    role: line.employee.role,
    baseSalary: line.baseSalary,
    commissionAmount: line.commissionAmount,
    bonusAmount: line.bonusAmount,
    advanceDeduction: line.advanceDeduction,
    collectionDeduction: line.collectionDeduction,
    grossAmount: line.grossAmount,
    netAmount: line.netAmount,
    ...snapshotFields(parseLineSnapshot(line.detailSnapshot)),
  }))

  return {
    id: run.id,
    startDate: run.startDate,
    endDate: run.endDate,
    periodLabel: run.periodLabel,
    status: run.status,
    totalGross: run.totalGross,
    totalNet: run.totalNet,
    closedAt: run.closedAt,
    employeeCount: lines.length,
    lines,
  }
}

export async function closePayroll(
  db: Database,
  input: PayrollPeriodInput,
  closedByUserId?: string,
): Promise<PayrollRunDetail> {
  const preview = await previewPayroll(db, input)
  if (preview.isClosed) {
    throw new PayrollServiceError(
      'ALREADY_CLOSED',
      'Cette période est déjà clôturée',
    )
  }

  const payableLines = preview.lines.filter((line) => line.netAmount > 0)
  const hasSideEffects =
    preview.totals.advanceDeduction > 0 ||
    preview.totals.collectionDeduction > 0 ||
    preview.totals.bonus > 0

  if (
    preview.lines.length === 0 ||
    (payableLines.length === 0 &&
      !hasSideEffects &&
      preview.totals.gross === 0)
  ) {
    throw new PayrollServiceError(
      'INVALID_STATE',
      'Aucun montant à payer pour cette période',
    )
  }

  try {
    await ensureLedgerAccountsForOrg(db, input.organizationId)
  } catch {
    throw new PayrollServiceError(
      'LEDGER_NOT_CONFIGURED',
      'Comptes ledger manquants pour cette organisation',
    )
  }

  const now = new Date()

  return db.transaction(async (tx) => {
    const [existingClosed] = await tx
      .select({ id: payrollRuns.id })
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.organizationId, input.organizationId),
          eq(payrollRuns.bakeryId, input.bakeryId),
          eq(payrollRuns.startDate, input.startDate),
          eq(payrollRuns.endDate, input.endDate),
          eq(payrollRuns.status, 'closed'),
        ),
      )
      .limit(1)

    if (existingClosed) {
      throw new PayrollServiceError(
        'ALREADY_CLOSED',
        'Cette période est déjà clôturée',
      )
    }

    const [run] = await tx
      .insert(payrollRuns)
      .values({
        organizationId: input.organizationId,
        bakeryId: input.bakeryId,
        startDate: input.startDate,
        endDate: input.endDate,
        periodLabel: preview.periodLabel,
        status: 'closed',
        totalGross: preview.totals.gross,
        totalNet: preview.totals.net,
        closedAt: now,
        closedBy: closedByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!run) {
      throw new Error('Failed to create payroll run')
    }

    if (preview.lines.length > 0) {
      await tx.insert(payrollRunLines).values(
        preview.lines.map((line) => ({
          organizationId: input.organizationId,
          payrollRunId: run.id,
          employeeId: line.employeeId,
          baseSalary: line.baseSalary,
          commissionAmount: line.commissionAmount,
          bonusAmount: line.bonusAmount,
          advanceDeduction: line.advanceDeduction,
          collectionDeduction: line.collectionDeduction,
          grossAmount: line.grossAmount,
          netAmount: line.netAmount,
          detailSnapshot: snapshotFromPreview(line),
          createdAt: now,
        })),
      )
    }

    const allBonusIds = preview.lines.flatMap((line) => line.bonusIds)
    await markSalaryBonusesPaidInTx(
      tx,
      input.organizationId,
      allBonusIds,
      run.id,
      now,
    )

    for (const line of preview.lines) {
      for (const installmentId of line.advanceInstallmentIds) {
        await paySalaryAdvanceInstallmentInTx(
          tx,
          input.organizationId,
          input.bakeryId,
          installmentId,
          'payroll_deduction',
          closedByUserId,
        )
      }
    }

    const accounts = await getLedgerAccountMap(tx, input.organizationId)

    for (const line of preview.lines) {
      if (line.collectionDeduction <= 0) continue

      const deductionSourceId = `${run.id}:${line.employeeId}`
      const [existingDeduction] = await tx
        .select({ id: ledgerMovements.id })
        .from(ledgerMovements)
        .where(
          and(
            eq(ledgerMovements.organizationId, input.organizationId),
            eq(ledgerMovements.sourceType, 'payroll_collection_deduction'),
            eq(ledgerMovements.sourceId, deductionSourceId),
          ),
        )

      if (existingDeduction) {
        throw new PayrollServiceError(
          'INVALID_STATE',
          'Retenue caisse déjà comptabilisée pour cet agent',
        )
      }

      const deductionLines = buildPayrollCollectionDeductionLines(
        accounts,
        line.collectionDeduction,
      )
      await post(tx, {
        organizationId: input.organizationId,
        occurredAt: now,
        memo: `Retenue caisse — paie ${preview.periodLabel}`,
        sourceType: 'payroll_collection_deduction',
        sourceId: deductionSourceId,
        lines: deductionLines,
        createdBy: closedByUserId,
      })
    }

    const totalNetPayout = payableLines.reduce(
      (sum, line) => sum + line.netAmount,
      0,
    )

    if (totalNetPayout > 0) {
      const lines = buildPayrollPayoutLines(accounts, totalNetPayout)
      await post(tx, {
        organizationId: input.organizationId,
        occurredAt: now,
        memo: `Paie — ${preview.periodLabel}`,
        sourceType: 'payroll_run',
        sourceId: run.id,
        lines,
        createdBy: closedByUserId,
      })
    }

    await settleCashCollectionsPeriod(tx, {
      organizationId: input.organizationId,
      bakeryId: input.bakeryId,
      startDate: input.startDate,
      endDate: input.endDate,
    })

    return getPayrollRun(tx, input.organizationId, input.bakeryId, run.id)
  })
}
