import { movementsFor } from '@gerpain/bocal'
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { post } from '@gerpain/bocal'
import {
  type Database,
  type DbOrTx,
  cashCollections,
  deliveryRuns,
  employees,
  ledgerAccounts,
  ledgerMovements,
} from '@gerpain/db'

import { buildCollectionValidateLines } from './collection-posting'
import {
  getLedgerAccountMap,
  LedgerAccountsError,
} from './ledger-accounts'

export class CollectionServiceError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'INVALID_STATE'
      | 'NOT_EDITABLE'
      | 'ALREADY_POSTED'
      | 'LEDGER_NOT_CONFIGURED',
    message: string,
  ) {
    super(message)
    this.name = 'CollectionServiceError'
  }
}

export type CashCollectionDetail = {
  id: string
  organizationId: string
  bakeryId: string
  employeeId: string
  locationId: string
  deliveryRunId: string | null
  date: string
  expectedAmount: number
  actualAmount: number | null
  cashAmount: number
  cardAmount: number
  mobileAmount: number
  variance: number | null
  status: string
  isSettled: boolean
  isArchived: boolean
  period: string | null
  notes: string | null
  submittedAt: Date | null
  validatedAt: Date | null
  validatedBy: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
  employeeName: string
  employeeRole: string
  routeLabel: string
  source: 'Livraison' | 'Boutique'
}

export type ListCashCollectionsInput = {
  organizationId: string
  bakeryId?: string
  date?: string
  startDate?: string
  endDate?: string
  status?: string
  locationId?: string
  employeeId?: string
  isSettled?: boolean
  includeArchived?: boolean
}

export type EmployeeCollectionOverview = {
  employeeId: string
  employeeName: string
  role: string
  roleLabel: string
  tournees: number
  totalExpected: number
  totalCollected: number
  solde: number
  unsettledCount: number
}

export type LedgerMovementLineDetail = {
  accountCode: string
  accountName: string
  direction: 'debit' | 'credit'
  amount: number
}

export type CollectionLedgerMovement = {
  id: string
  occurredAt: Date
  memo: string | null
  lines: LedgerMovementLineDetail[]
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    delivery: 'Livreur',
    cashier: 'Caissier',
    manager: 'Manager',
    baker: 'Boulanger',
  }
  return labels[role] ?? role
}

function enrichCollection(
  collection: typeof cashCollections.$inferSelect,
  employee: typeof employees.$inferSelect | undefined,
  deliveryRun: typeof deliveryRuns.$inferSelect | null,
): CashCollectionDetail {
  return {
    ...collection,
    notes: collection.notes ?? null,
    cashAmount: collection.cashAmount ?? 0,
    cardAmount: collection.cardAmount ?? 0,
    mobileAmount: collection.mobileAmount ?? 0,
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`
      : 'Inconnu',
    employeeRole: employee?.role ?? 'unknown',
    routeLabel: employee ? roleLabel(employee.role) : 'Inconnu',
    source: deliveryRun ? 'Livraison' : 'Boutique',
  }
}

export async function listCashCollections(
  db: Database,
  input: ListCashCollectionsInput,
): Promise<CashCollectionDetail[]> {
  const conditions = [eq(cashCollections.organizationId, input.organizationId)]

  if (input.bakeryId) {
    conditions.push(eq(cashCollections.bakeryId, input.bakeryId))
  }
  if (input.date) {
    conditions.push(eq(cashCollections.date, input.date))
  }
  if (input.startDate) {
    conditions.push(gte(cashCollections.date, input.startDate))
  }
  if (input.endDate) {
    conditions.push(lte(cashCollections.date, input.endDate))
  }
  if (input.status) {
    conditions.push(eq(cashCollections.status, input.status))
  }
  if (input.locationId) {
    conditions.push(eq(cashCollections.locationId, input.locationId))
  }
  if (input.employeeId) {
    conditions.push(eq(cashCollections.employeeId, input.employeeId))
  }
  if (input.isSettled !== undefined) {
    conditions.push(eq(cashCollections.isSettled, input.isSettled))
  }
  if (!input.includeArchived) {
    conditions.push(eq(cashCollections.isArchived, false))
  }

  const collections = await db
    .select()
    .from(cashCollections)
    .where(and(...conditions))

  if (collections.length === 0) return []

  const employeeIds = [...new Set(collections.map((c) => c.employeeId))]
  const runIds = [
    ...new Set(
      collections
        .map((c) => c.deliveryRunId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const [employeeRows, runRows] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(
        and(
          inArray(employees.id, employeeIds),
          eq(employees.status, 'active'),
        ),
      ),
    runIds.length > 0
      ? db
          .select()
          .from(deliveryRuns)
          .where(inArray(deliveryRuns.id, runIds))
      : Promise.resolve([]),
  ])

  const employeeMap = new Map(employeeRows.map((e) => [e.id, e]))
  const runMap = new Map(runRows.map((r) => [r.id, r]))

  return collections
    .filter((c) => employeeMap.has(c.employeeId))
    .map((collection) =>
      enrichCollection(
        collection,
        employeeMap.get(collection.employeeId),
        collection.deliveryRunId
          ? (runMap.get(collection.deliveryRunId) ?? null)
          : null,
      ),
    )
}

export async function getCashCollection(
  db: Database,
  organizationId: string,
  collectionId: string,
): Promise<CashCollectionDetail> {
  const [row] = await db
    .select({
      collection: cashCollections,
      employee: employees,
    })
    .from(cashCollections)
    .leftJoin(employees, eq(employees.id, cashCollections.employeeId))
    .where(
      and(
        eq(cashCollections.id, collectionId),
        eq(cashCollections.organizationId, organizationId),
      ),
    )

  if (!row?.collection) {
    throw new CollectionServiceError('NOT_FOUND', 'Encaissement introuvable')
  }

  let deliveryRun: typeof deliveryRuns.$inferSelect | null = null
  if (row.collection.deliveryRunId) {
    deliveryRun =
      (await db.query.deliveryRuns.findFirst({
        where: eq(deliveryRuns.id, row.collection.deliveryRunId),
      })) ?? null
  }

  return enrichCollection(
    row.collection,
    row.employee ?? undefined,
    deliveryRun,
  )
}

export type UpdateCashCollectionInput = {
  organizationId: string
  collectionId: string
  cashAmount?: number
  cardAmount?: number
  mobileAmount?: number
  notes?: string
}

export async function updateCashCollection(
  db: Database,
  input: UpdateCashCollectionInput,
): Promise<CashCollectionDetail> {
  const [current] = await db
    .select()
    .from(cashCollections)
    .where(
      and(
        eq(cashCollections.id, input.collectionId),
        eq(cashCollections.organizationId, input.organizationId),
      ),
    )

  if (!current) {
    throw new CollectionServiceError('NOT_FOUND', 'Encaissement introuvable')
  }

  if (current.status !== 'pending' && current.status !== 'rejected') {
    throw new CollectionServiceError(
      'INVALID_STATE',
      `Modification impossible depuis le statut « ${current.status} »`,
    )
  }

  const cashAmount = input.cashAmount ?? current.cashAmount ?? 0
  const cardAmount = input.cardAmount ?? current.cardAmount ?? 0
  const mobileAmount = input.mobileAmount ?? current.mobileAmount ?? 0
  const actualAmount = cashAmount + cardAmount + mobileAmount

  const [updated] = await db
    .update(cashCollections)
    .set({
      ...(input.cashAmount !== undefined ? { cashAmount: input.cashAmount } : {}),
      ...(input.cardAmount !== undefined ? { cardAmount: input.cardAmount } : {}),
      ...(input.mobileAmount !== undefined
        ? { mobileAmount: input.mobileAmount }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      actualAmount,
      variance: actualAmount - current.expectedAmount,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cashCollections.id, input.collectionId),
        eq(cashCollections.organizationId, input.organizationId),
        inArray(cashCollections.status, ['pending', 'rejected']),
      ),
    )
    .returning()

  if (!updated) {
    throw new CollectionServiceError(
      'INVALID_STATE',
      'Encaissement non modifiable',
    )
  }

  return getCashCollection(db, input.organizationId, input.collectionId)
}

export async function submitCashCollection(
  db: Database,
  organizationId: string,
  collectionId: string,
): Promise<CashCollectionDetail> {
  const [updated] = await db
    .update(cashCollections)
    .set({
      status: 'submitted',
      submittedAt: new Date(),
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cashCollections.id, collectionId),
        eq(cashCollections.organizationId, organizationId),
        inArray(cashCollections.status, ['pending', 'rejected']),
      ),
    )
    .returning()

  if (!updated) {
    const [existing] = await db
      .select({ status: cashCollections.status })
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.id, collectionId),
          eq(cashCollections.organizationId, organizationId),
        ),
      )

    if (!existing) {
      throw new CollectionServiceError('NOT_FOUND', 'Encaissement introuvable')
    }

    throw new CollectionServiceError(
      'INVALID_STATE',
      `Soumission impossible depuis le statut « ${existing.status} »`,
    )
  }

  return getCashCollection(db, organizationId, collectionId)
}

export type ValidateCashCollectionResult = CashCollectionDetail & {
  movementId: string
}

export async function validateCashCollection(
  db: Database,
  organizationId: string,
  collectionId: string,
  validatedByUserId?: string | null,
): Promise<ValidateCashCollectionResult> {
  const movementId = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.id, collectionId),
          eq(cashCollections.organizationId, organizationId),
        ),
      )

    if (!current) {
      throw new CollectionServiceError('NOT_FOUND', 'Encaissement introuvable')
    }

    if (current.status !== 'submitted') {
      throw new CollectionServiceError(
        'INVALID_STATE',
        `Validation impossible depuis le statut « ${current.status} »`,
      )
    }

    const actualAmount =
      (current.cashAmount ?? 0) +
      (current.cardAmount ?? 0) +
      (current.mobileAmount ?? 0)

    if (actualAmount <= 0) {
      throw new CollectionServiceError(
        'INVALID_STATE',
        'Impossible de valider sans montant collecté',
      )
    }

    const [existingMovement] = await tx
      .select({ id: ledgerMovements.id })
      .from(ledgerMovements)
      .where(
        and(
          eq(ledgerMovements.organizationId, organizationId),
          eq(ledgerMovements.sourceType, 'cash_collection'),
          eq(ledgerMovements.sourceId, collectionId),
        ),
      )

    if (existingMovement) {
      throw new CollectionServiceError(
        'ALREADY_POSTED',
        'Cet encaissement est déjà comptabilisé',
      )
    }

    let accounts
    try {
      accounts = await getLedgerAccountMap(tx, organizationId)
    } catch (error) {
      if (error instanceof LedgerAccountsError) {
        throw new CollectionServiceError('LEDGER_NOT_CONFIGURED', error.message)
      }
      throw error
    }

    const now = new Date()
    const lines = buildCollectionValidateLines(
      accounts,
      current.expectedAmount,
      actualAmount,
    )

    const createdMovementId = await post(tx, {
      organizationId,
      occurredAt: now,
      memo: 'Encaissement validé',
      sourceType: 'cash_collection',
      sourceId: collectionId,
      lines,
    })

    const [updated] = await tx
      .update(cashCollections)
      .set({
        status: 'validated',
        validatedAt: now,
        validatedBy: validatedByUserId ?? null,
        rejectionReason: null,
        actualAmount,
        variance: actualAmount - current.expectedAmount,
        updatedAt: now,
      })
      .where(
        and(
          eq(cashCollections.id, collectionId),
          eq(cashCollections.organizationId, organizationId),
          eq(cashCollections.status, 'submitted'),
        ),
      )
      .returning()

    if (!updated) {
      throw new CollectionServiceError(
        'INVALID_STATE',
        'Encaissement non validable',
      )
    }

    return createdMovementId
  })

  const detail = await getCashCollection(db, organizationId, collectionId)
  return { ...detail, movementId }
}

export async function rejectCashCollection(
  db: Database,
  organizationId: string,
  collectionId: string,
  reason: string,
): Promise<CashCollectionDetail> {
  const [updated] = await db
    .update(cashCollections)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      validatedAt: null,
      validatedBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cashCollections.id, collectionId),
        eq(cashCollections.organizationId, organizationId),
        eq(cashCollections.status, 'submitted'),
      ),
    )
    .returning()

  if (!updated) {
    const [existing] = await db
      .select({ status: cashCollections.status })
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.id, collectionId),
          eq(cashCollections.organizationId, organizationId),
        ),
      )

    if (!existing) {
      throw new CollectionServiceError('NOT_FOUND', 'Encaissement introuvable')
    }

    throw new CollectionServiceError(
      'INVALID_STATE',
      `Rejet impossible depuis le statut « ${existing.status} »`,
    )
  }

  return getCashCollection(db, organizationId, collectionId)
}

export type SettleCashCollectionsInput = {
  organizationId: string
  bakeryId?: string
  employeeId?: string
  date?: string
  startDate?: string
  endDate?: string
}

export type SettleCashCollectionsResult = {
  settledCount: number
  settledIds: string[]
}

export async function settleCashCollectionsPeriod(
  db: DbOrTx,
  input: SettleCashCollectionsInput,
): Promise<SettleCashCollectionsResult> {
  const conditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.isSettled, false),
    eq(cashCollections.status, 'validated'),
  ]

  if (input.bakeryId) {
    conditions.push(eq(cashCollections.bakeryId, input.bakeryId))
  }
  if (input.employeeId) {
    conditions.push(eq(cashCollections.employeeId, input.employeeId))
  }
  if (input.date) {
    conditions.push(eq(cashCollections.date, input.date))
  }
  if (input.startDate) {
    conditions.push(gte(cashCollections.date, input.startDate))
  }
  if (input.endDate) {
    conditions.push(lte(cashCollections.date, input.endDate))
  }

  const toSettle = await db
    .select({ id: cashCollections.id })
    .from(cashCollections)
    .where(and(...conditions))

  if (toSettle.length === 0) {
    return { settledCount: 0, settledIds: [] }
  }

  const settledIds = toSettle.map((row) => row.id)
  const now = new Date()

  await db
    .update(cashCollections)
    .set({ isSettled: true, updatedAt: now })
    .where(inArray(cashCollections.id, settledIds))

  return { settledCount: settledIds.length, settledIds }
}

export type CollectionsOverviewInput = {
  organizationId: string
  bakeryId: string
  startDate?: string
  endDate?: string
  role?: string
  isSettled?: boolean
}

export type EmployeeCollectionBalance = {
  employeeId: string
  totalExpected: number
  totalCollected: number
  solde: number
  collectionCount: number
}

export type CollectionBalanceInput = {
  organizationId: string
  bakeryId: string
  startDate: string
  endDate: string
  employeeId?: string
}

export async function getPeriodCollectionBalancesByEmployee(
  db: Database,
  input: CollectionBalanceInput,
): Promise<EmployeeCollectionBalance[]> {
  const conditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.bakeryId, input.bakeryId),
    eq(cashCollections.isArchived, false),
    gte(cashCollections.date, input.startDate),
    lte(cashCollections.date, input.endDate),
  ]

  if (input.employeeId) {
    conditions.push(eq(cashCollections.employeeId, input.employeeId))
  }

  const rows = await db
    .select({
      employeeId: cashCollections.employeeId,
      totalExpected: sql<number>`COALESCE(SUM(${cashCollections.expectedAmount}), 0)`,
      totalCollected: sql<number>`COALESCE(SUM(COALESCE(${cashCollections.actualAmount}, 0)), 0)`,
      collectionCount: sql<number>`COUNT(${cashCollections.id})`,
    })
    .from(cashCollections)
    .where(and(...conditions))
    .groupBy(cashCollections.employeeId)

  return rows.map((row) => {
    const totalExpected = Number(row.totalExpected) || 0
    const totalCollected = Number(row.totalCollected) || 0
    return {
      employeeId: row.employeeId,
      totalExpected,
      totalCollected,
      solde: totalCollected - totalExpected,
      collectionCount: Number(row.collectionCount) || 0,
    }
  })
}

export async function getCashCollectionsOverview(
  db: Database,
  input: CollectionsOverviewInput,
): Promise<EmployeeCollectionOverview[]> {
  const employeeConditions = [
    eq(employees.organizationId, input.organizationId),
    eq(employees.status, 'active'),
  ]
  if (input.role) {
    employeeConditions.push(eq(employees.role, input.role))
  }

  const collectionJoinConditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.employeeId, employees.id),
    eq(cashCollections.bakeryId, input.bakeryId),
    eq(cashCollections.isArchived, false),
  ]
  if (input.startDate) {
    collectionJoinConditions.push(gte(cashCollections.date, input.startDate))
  }
  if (input.endDate) {
    collectionJoinConditions.push(lte(cashCollections.date, input.endDate))
  }
  if (input.isSettled !== undefined) {
    collectionJoinConditions.push(eq(cashCollections.isSettled, input.isSettled))
  }

  const rows = await db
    .select({
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      role: employees.role,
      tournees: sql<number>`COALESCE(COUNT(${cashCollections.id}), 0)`,
      totalExpected: sql<number>`COALESCE(SUM(${cashCollections.expectedAmount}), 0)`,
      totalCollected: sql<number>`COALESCE(SUM(COALESCE(${cashCollections.actualAmount}, 0)), 0)`,
      unsettledCount: sql<number>`COALESCE(SUM(CASE WHEN ${cashCollections.isSettled} = false THEN 1 ELSE 0 END), 0)`,
    })
    .from(employees)
    .leftJoin(cashCollections, and(...collectionJoinConditions))
    .where(and(...employeeConditions))
    .groupBy(employees.id, employees.firstName, employees.lastName, employees.role)

  const filteredRows =
    input.isSettled === false
      ? rows.filter((row) => row.unsettledCount > 0)
      : rows

  return filteredRows.map((row) => {
    const totalExpected = row.totalExpected || 0
    const totalCollected = row.totalCollected || 0
    return {
      employeeId: row.employeeId,
      employeeName: `${row.firstName} ${row.lastName}`,
      role: row.role,
      roleLabel: roleLabel(row.role),
      tournees: row.tournees || 0,
      totalExpected,
      totalCollected,
      solde: totalCollected - totalExpected,
      unsettledCount: row.unsettledCount || 0,
    }
  })
}

export async function getCollectionLedgerMovement(
  db: Database,
  organizationId: string,
  collectionId: string,
): Promise<CollectionLedgerMovement | null> {
  return db.transaction(async (tx) => {
    const page = await movementsFor(tx, {
      organizationId,
      sourceType: 'cash_collection',
      sourceId: collectionId,
      paginationOpts: { limit: 1, cursor: null },
    })

    const movement = page.items[0]
    if (!movement) return null

    const accountIds = [...new Set(movement.lines.map((line) => line.accountId))]
    const accounts =
      accountIds.length === 0
        ? []
        : await tx
            .select()
            .from(ledgerAccounts)
            .where(
              and(
                eq(ledgerAccounts.organizationId, organizationId),
                inArray(ledgerAccounts.id, accountIds),
              ),
            )

    const accountById = new Map(accounts.map((account) => [account.id, account]))

    return {
      id: movement.id,
      occurredAt: movement.occurredAt,
      memo: movement.memo,
      lines: movement.lines.map((line) => {
        const account = accountById.get(line.accountId)
        return {
          accountCode: account?.code ?? '—',
          accountName: account?.name ?? 'Compte inconnu',
          direction: line.direction,
          amount: line.amount,
        }
      }),
    }
  })
}

export type ArchiveCashCollectionsInput = {
  organizationId: string
  bakeryId: string
  employeeId?: string
  startDate?: string
  endDate?: string
}

export type ArchiveCashCollectionsResult = {
  archivedCount: number
  archivedIds: string[]
}

export async function archiveCashCollectionsPeriod(
  db: Database,
  input: ArchiveCashCollectionsInput,
): Promise<ArchiveCashCollectionsResult> {
  const conditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.bakeryId, input.bakeryId),
    eq(cashCollections.status, 'validated'),
    eq(cashCollections.isSettled, true),
    eq(cashCollections.isArchived, false),
  ]

  if (input.employeeId) {
    conditions.push(eq(cashCollections.employeeId, input.employeeId))
  }
  if (input.startDate) {
    conditions.push(gte(cashCollections.date, input.startDate))
  }
  if (input.endDate) {
    conditions.push(lte(cashCollections.date, input.endDate))
  }

  const toArchive = await db
    .select({ id: cashCollections.id })
    .from(cashCollections)
    .where(and(...conditions))

  if (toArchive.length === 0) {
    return { archivedCount: 0, archivedIds: [] }
  }

  const archivedIds = toArchive.map((row) => row.id)
  const now = new Date()

  await db
    .update(cashCollections)
    .set({ isArchived: true, updatedAt: now })
    .where(inArray(cashCollections.id, archivedIds))

  return { archivedCount: archivedIds.length, archivedIds }
}

export async function unarchiveCashCollectionsPeriod(
  db: Database,
  input: ArchiveCashCollectionsInput,
): Promise<ArchiveCashCollectionsResult> {
  const conditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.bakeryId, input.bakeryId),
    eq(cashCollections.isArchived, true),
  ]

  if (input.employeeId) {
    conditions.push(eq(cashCollections.employeeId, input.employeeId))
  }
  if (input.startDate) {
    conditions.push(gte(cashCollections.date, input.startDate))
  }
  if (input.endDate) {
    conditions.push(lte(cashCollections.date, input.endDate))
  }

  const toUnarchive = await db
    .select({ id: cashCollections.id })
    .from(cashCollections)
    .where(and(...conditions))

  if (toUnarchive.length === 0) {
    return { archivedCount: 0, archivedIds: [] }
  }

  const archivedIds = toUnarchive.map((row) => row.id)
  const now = new Date()

  await db
    .update(cashCollections)
    .set({ isArchived: false, updatedAt: now })
    .where(inArray(cashCollections.id, archivedIds))

  return { archivedCount: archivedIds.length, archivedIds }
}
