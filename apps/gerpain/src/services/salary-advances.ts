import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { post, reverse } from '@gerpain/bocal'
import {
  type Database,
  ledgerMovements,
  salaryAdvanceInstallments,
  salaryAdvances,
} from '@gerpain/db'
import type { SalaryAdvanceRepaymentMethod } from '@gerpain/db/schema'

import {
  buildAdvanceGrantLines,
  buildAdvanceRepaymentLines,
} from '#/services/advance-posting'
import { getEmployee } from '#/services/employees'
import {
  ensureLedgerAccountsForOrg,
  getLedgerAccountMap,
  LedgerAccountsError,
} from '#/services/ledger-accounts'
export class SalaryAdvanceServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'INVALID_AMOUNT'
      | 'LEDGER_NOT_CONFIGURED'
      | 'ALREADY_POSTED',
    message: string,
  ) {
    super(message)
    this.name = 'SalaryAdvanceServiceError'
  }
}

export type SalaryAdvanceInstallmentItem = {
  id: string
  installmentNumber: number
  amount: number
  duePeriod: string | null
  status: string
  paymentMethod: string | null
  paidAt: Date | null
}

export type SalaryAdvanceListItem = {
  id: string
  employeeId: string
  employeeName: string
  totalAmount: number
  remainingAmount: number
  installmentCount: number
  paidInstallments: number
  status: string
  grantedAt: Date
  notes: string | null
  installments: SalaryAdvanceInstallmentItem[]
}

export type CreateSalaryAdvanceInput = {
  employeeId: string
  totalAmount: number
  installmentCount: number
  notes?: string
  firstDuePeriod?: string
}

function splitInstallmentAmounts(
  totalAmount: number,
  count: number,
): number[] {
  const base = Math.floor(totalAmount / count)
  const remainder = totalAmount - base * count
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  )
}

function employeeDisplayName(
  employee: { firstName: string; lastName: string },
): string {
  return `${employee.firstName} ${employee.lastName}`.trim()
}

function remainingFromInstallments(
  installments: Array<{ amount: number; status: string }>,
): number {
  return installments
    .filter((row) => row.status === 'scheduled' || row.status === 'rolled_over')
    .reduce((sum, row) => sum + row.amount, 0)
}

function mapInstallment(
  row: typeof salaryAdvanceInstallments.$inferSelect,
): SalaryAdvanceInstallmentItem {
  return {
    id: row.id,
    installmentNumber: row.installmentNumber,
    amount: row.amount,
    duePeriod: row.duePeriod,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paidAt: row.paidAt,
  }
}

function mapAdvanceListItem(
  advance: typeof salaryAdvances.$inferSelect,
  employee: { firstName: string; lastName: string },
  installments: typeof salaryAdvanceInstallments.$inferSelect[],
): SalaryAdvanceListItem {
  const mapped = installments.map(mapInstallment)
  return {
    id: advance.id,
    employeeId: advance.employeeId,
    employeeName: employeeDisplayName(employee),
    totalAmount: advance.totalAmount,
    remainingAmount: remainingFromInstallments(installments),
    installmentCount: advance.installmentCount,
    paidInstallments: installments.filter((row) => row.status === 'paid')
      .length,
    status: advance.status,
    grantedAt: advance.grantedAt,
    notes: advance.notes,
    installments: mapped,
  }
}

async function assertLedgerReady(
  db: Database,
  organizationId: string,
): Promise<Awaited<ReturnType<typeof getLedgerAccountMap>>> {
  try {
    return await getLedgerAccountMap(db, organizationId)
  } catch (error) {
    if (error instanceof LedgerAccountsError) {
      throw new SalaryAdvanceServiceError(
        'LEDGER_NOT_CONFIGURED',
        error.message,
      )
    }
    throw error
  }
}

async function getAdvanceRow(
  db: Database,
  organizationId: string,
  bakeryId: string,
  advanceId: string,
) {
  const row = await db.query.salaryAdvances.findFirst({
    where: and(
      eq(salaryAdvances.id, advanceId),
      eq(salaryAdvances.organizationId, organizationId),
      eq(salaryAdvances.bakeryId, bakeryId),
    ),
    with: {
      employee: true,
      installments: {
        orderBy: [asc(salaryAdvanceInstallments.installmentNumber)],
      },
    },
  })

  if (!row) {
    throw new SalaryAdvanceServiceError(
      'NOT_FOUND',
      'Avance introuvable',
    )
  }

  return row
}

async function closeAdvanceIfComplete(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  advanceId: string,
) {
  const installments = await tx.query.salaryAdvanceInstallments.findMany({
    where: eq(salaryAdvanceInstallments.advanceId, advanceId),
  })

  const hasOpen = installments.some((row) => row.status === 'scheduled')
  if (!hasOpen) {
    await tx
      .update(salaryAdvances)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(salaryAdvances.id, advanceId))
  }
}

export async function listSalaryAdvances(
  db: Database,
  organizationId: string,
  bakeryId: string,
  options?: {
    employeeId?: string
    status?: 'active' | 'closed' | 'cancelled'
  },
): Promise<SalaryAdvanceListItem[]> {
  const conditions = [
    eq(salaryAdvances.organizationId, organizationId),
    eq(salaryAdvances.bakeryId, bakeryId),
  ]

  if (options?.employeeId) {
    conditions.push(eq(salaryAdvances.employeeId, options.employeeId))
  }
  if (options?.status) {
    conditions.push(eq(salaryAdvances.status, options.status))
  }

  const rows = await db.query.salaryAdvances.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryAdvances.grantedAt), desc(salaryAdvances.createdAt)],
    with: {
      employee: true,
      installments: {
        orderBy: [asc(salaryAdvanceInstallments.installmentNumber)],
      },
    },
  })

  return rows.map((row) =>
    mapAdvanceListItem(row, row.employee, row.installments),
  )
}

export async function createSalaryAdvance(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: CreateSalaryAdvanceInput,
  createdByUserId?: string,
): Promise<SalaryAdvanceListItem> {
  if (input.totalAmount <= 0) {
    throw new SalaryAdvanceServiceError(
      'INVALID_AMOUNT',
      'Le montant doit être positif',
    )
  }
  if (input.installmentCount < 1 || input.installmentCount > 24) {
    throw new SalaryAdvanceServiceError(
      'INVALID_AMOUNT',
      'Le nombre d\'échéances doit être entre 1 et 24',
    )
  }

  const employee = await getEmployee(
    db,
    organizationId,
    bakeryId,
    input.employeeId,
  )
  if (employee.status !== 'active') {
    throw new SalaryAdvanceServiceError(
      'INVALID_STATE',
      'L\'agent doit être actif pour recevoir une avance',
    )
  }

  const amounts = splitInstallmentAmounts(
    input.totalAmount,
    input.installmentCount,
  )
  const now = new Date()

  return db.transaction(async (tx) => {
    const accounts = await assertLedgerReady(tx, organizationId)

    const [advance] = await tx
      .insert(salaryAdvances)
      .values({
        organizationId,
        bakeryId,
        employeeId: input.employeeId,
        totalAmount: input.totalAmount,
        installmentCount: input.installmentCount,
        status: 'active',
        notes: input.notes?.trim() || null,
        grantedAt: now,
        createdBy: createdByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!advance) {
      throw new Error('Failed to create salary advance')
    }

    const installmentValues = amounts.map((amount, index) => ({
      organizationId,
      advanceId: advance.id,
      installmentNumber: index + 1,
      amount,
      duePeriod: input.firstDuePeriod ?? null,
      status: 'scheduled' as const,
      createdAt: now,
      updatedAt: now,
    }))

    const createdInstallments = await tx
      .insert(salaryAdvanceInstallments)
      .values(installmentValues)
      .returning()

    const lines = buildAdvanceGrantLines(accounts, input.totalAmount)
    await post(tx, {
      organizationId,
      occurredAt: now,
      memo: `Avance sur salaire — ${employeeDisplayName(employee)}`,
      sourceType: 'salary_advance',
      sourceId: advance.id,
      lines,
      createdBy: createdByUserId,
    })

    return mapAdvanceListItem(advance, employee, createdInstallments)
  })
}

async function assertInstallmentRepaymentNotPosted(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  organizationId: string,
  installmentId: string,
) {
  const [existing] = await tx
    .select({ id: ledgerMovements.id })
    .from(ledgerMovements)
    .where(
      and(
        eq(ledgerMovements.organizationId, organizationId),
        eq(ledgerMovements.sourceType, 'salary_advance_installment'),
        eq(ledgerMovements.sourceId, installmentId),
      ),
    )

  if (existing) {
    throw new SalaryAdvanceServiceError(
      'ALREADY_POSTED',
      'Cette échéance est déjà remboursée',
    )
  }
}

export async function paySalaryAdvanceInstallment(
  db: Database,
  organizationId: string,
  bakeryId: string,
  installmentId: string,
  method: SalaryAdvanceRepaymentMethod,
  createdByUserId?: string,
): Promise<SalaryAdvanceListItem> {
  return db.transaction(async (tx) => {
    const installment = await tx.query.salaryAdvanceInstallments.findFirst({
      where: and(
        eq(salaryAdvanceInstallments.id, installmentId),
        eq(salaryAdvanceInstallments.organizationId, organizationId),
      ),
    })

    if (!installment) {
      throw new SalaryAdvanceServiceError(
        'NOT_FOUND',
        'Échéance introuvable',
      )
    }

    if (installment.status !== 'scheduled') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Seules les échéances planifiées peuvent être remboursées',
      )
    }

    const advance = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      installment.advanceId,
    )

    if (advance.status !== 'active') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Cette avance n\'est plus active',
      )
    }

    await assertInstallmentRepaymentNotPosted(
      tx,
      organizationId,
      installmentId,
    )

    const accounts = await assertLedgerReady(tx, organizationId)
    const now = new Date()
    const lines = buildAdvanceRepaymentLines(
      accounts,
      installment.amount,
      method,
    )

    await post(tx, {
      organizationId,
      occurredAt: now,
      memo: `Remboursement avance — échéance ${installment.installmentNumber}`,
      sourceType: 'salary_advance_installment',
      sourceId: installmentId,
      lines,
      createdBy: createdByUserId,
    })

    await tx
      .update(salaryAdvanceInstallments)
      .set({
        status: 'paid',
        paymentMethod: method,
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(salaryAdvanceInstallments.id, installmentId))

    await closeAdvanceIfComplete(tx, advance.id)

    const refreshed = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advance.id,
    )
    return mapAdvanceListItem(
      refreshed,
      refreshed.employee,
      refreshed.installments,
    )
  })
}

export async function paySalaryAdvanceRemainder(
  db: Database,
  organizationId: string,
  bakeryId: string,
  advanceId: string,
  method: SalaryAdvanceRepaymentMethod,
  createdByUserId?: string,
): Promise<SalaryAdvanceListItem> {
  return db.transaction(async (tx) => {
    const advance = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advanceId,
    )

    if (advance.status !== 'active') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Cette avance n\'est plus active',
      )
    }

    const openInstallments = advance.installments.filter(
      (row) => row.status === 'scheduled',
    )

    if (openInstallments.length === 0) {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Aucun solde à rembourser',
      )
    }

    const totalRemaining = openInstallments.reduce(
      (sum, row) => sum + row.amount,
      0,
    )

    const accounts = await assertLedgerReady(tx, organizationId)
    const now = new Date()

    for (const installment of openInstallments) {
      await assertInstallmentRepaymentNotPosted(
        tx,
        organizationId,
        installment.id,
      )
    }

    for (const installment of openInstallments) {
      const lines = buildAdvanceRepaymentLines(
        accounts,
        installment.amount,
        method,
      )
      await post(tx, {
        organizationId,
        occurredAt: now,
        memo: `Remboursement avance — solde restant (éch. ${installment.installmentNumber})`,
        sourceType: 'salary_advance_installment',
        sourceId: installment.id,
        lines,
        createdBy: createdByUserId,
      })

      await tx
        .update(salaryAdvanceInstallments)
        .set({
          status: 'paid',
          paymentMethod: method,
          paidAt: now,
          updatedAt: now,
        })
        .where(eq(salaryAdvanceInstallments.id, installment.id))
    }

    await closeAdvanceIfComplete(tx, advance.id)

    const refreshed = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advanceId,
    )
    return mapAdvanceListItem(
      refreshed,
      refreshed.employee,
      refreshed.installments,
    )
  })
}

export async function rollOverSalaryAdvanceInstallment(
  db: Database,
  organizationId: string,
  bakeryId: string,
  installmentId: string,
): Promise<SalaryAdvanceListItem> {
  return db.transaction(async (tx) => {
    const installment = await tx.query.salaryAdvanceInstallments.findFirst({
      where: and(
        eq(salaryAdvanceInstallments.id, installmentId),
        eq(salaryAdvanceInstallments.organizationId, organizationId),
      ),
    })

    if (!installment) {
      throw new SalaryAdvanceServiceError(
        'NOT_FOUND',
        'Échéance introuvable',
      )
    }

    if (installment.status !== 'scheduled') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Seules les échéances planifiées peuvent être reportées',
      )
    }

    const advance = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      installment.advanceId,
    )

    if (advance.status !== 'active') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Cette avance n\'est plus active',
      )
    }

    const nextInstallment = advance.installments.find(
      (row) =>
        row.installmentNumber > installment.installmentNumber &&
        row.status === 'scheduled',
    )

    const now = new Date()
    let rolledToId: string

    if (nextInstallment) {
      rolledToId = nextInstallment.id
      await tx
        .update(salaryAdvanceInstallments)
        .set({
          amount: nextInstallment.amount + installment.amount,
          updatedAt: now,
        })
        .where(eq(salaryAdvanceInstallments.id, nextInstallment.id))
    } else {
      const [created] = await tx
        .insert(salaryAdvanceInstallments)
        .values({
          organizationId,
          advanceId: advance.id,
          installmentNumber: installment.installmentNumber + 1,
          amount: installment.amount,
          status: 'scheduled',
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      if (!created) {
        throw new Error('Failed to extend installment schedule')
      }

      rolledToId = created.id
      await tx
        .update(salaryAdvances)
        .set({
          installmentCount: advance.installmentCount + 1,
          updatedAt: now,
        })
        .where(eq(salaryAdvances.id, advance.id))
    }

    await tx
      .update(salaryAdvanceInstallments)
      .set({
        status: 'rolled_over',
        rolledToInstallmentId: rolledToId,
        updatedAt: now,
      })
      .where(eq(salaryAdvanceInstallments.id, installmentId))

    const refreshed = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advance.id,
    )
    return mapAdvanceListItem(
      refreshed,
      refreshed.employee,
      refreshed.installments,
    )
  })
}

export async function cancelSalaryAdvance(
  db: Database,
  organizationId: string,
  bakeryId: string,
  advanceId: string,
  cancelledByUserId?: string,
): Promise<SalaryAdvanceListItem> {
  return db.transaction(async (tx) => {
    const advance = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advanceId,
    )

    if (advance.status !== 'active') {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Seules les avances actives peuvent être annulées',
      )
    }

    const hasPaid = advance.installments.some((row) => row.status === 'paid')
    if (hasPaid) {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Impossible d\'annuler une avance déjà partiellement remboursée',
      )
    }

    const [grantMovement] = await tx
      .select()
      .from(ledgerMovements)
      .where(
        and(
          eq(ledgerMovements.organizationId, organizationId),
          eq(ledgerMovements.sourceType, 'salary_advance'),
          eq(ledgerMovements.sourceId, advanceId),
        ),
      )

    if (!grantMovement) {
      throw new SalaryAdvanceServiceError(
        'INVALID_STATE',
        'Écriture comptable de l\'avance introuvable',
      )
    }

    const now = new Date()
    await reverse(tx, {
      movementId: grantMovement.id,
      memo: 'Annulation avance sur salaire',
      createdBy: cancelledByUserId,
    })

    await tx
      .update(salaryAdvances)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: cancelledByUserId ?? null,
        updatedAt: now,
      })
      .where(eq(salaryAdvances.id, advanceId))

    await tx
      .update(salaryAdvanceInstallments)
      .set({ status: 'skipped', updatedAt: now })
      .where(
        and(
          eq(salaryAdvanceInstallments.advanceId, advanceId),
          inArray(salaryAdvanceInstallments.status, ['scheduled', 'rolled_over']),
        ),
      )

    const refreshed = await getAdvanceRow(
      tx,
      organizationId,
      bakeryId,
      advanceId,
    )
    return mapAdvanceListItem(
      refreshed,
      refreshed.employee,
      refreshed.installments,
    )
  })
}
