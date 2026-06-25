import { and, eq, gte, inArray, lte } from 'drizzle-orm'

import {
  type Database,
  cashCollections,
  deliveryRuns,
  employees,
} from '@gerpain/db'

export class CollectionServiceError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'NOT_EDITABLE',
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
