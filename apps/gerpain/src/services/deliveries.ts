import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'

import {
  type Database,
  cashCollections,
  deliveryItems,
  deliveryRuns,
  employeeLocations,
  employeeProducts,
  employees,
  locations,
  products,
} from '@gerpain/db'

export class DeliveryServiceError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'ZERO_QUANTITY'
      | 'ALREADY_VALIDATED'
      | 'NOT_EDITABLE',
    message: string,
  ) {
    super(message)
    this.name = 'DeliveryServiceError'
  }
}

export type DeliveryItemDetail = {
  id: string
  runId: string
  productId: string
  period: string
  quantityEntrusted: number
  quantityReturned: number
  unitPrice: number
  createdAt: Date
  updatedAt: Date
  productName: string
  quantitySold: number
}

export type DeliveryRunDetail = {
  id: string
  organizationId: string
  bakeryId: string
  employeeId: string
  locationId: string
  date: string
  status: string
  notes: string
  validatedAt: Date | null
  validatedBy: string | null
  createdAt: Date
  updatedAt: Date
  employeeName: string
  employeeSortOrder: number
  employeeHireDate: string | null
  locationName: string
  items: DeliveryItemDetail[]
}

export type ListDeliveryRunsInput = {
  organizationId: string
  bakeryId: string
  date?: string
  startDate?: string
  endDate?: string
  employeeId?: string
  locationId?: string
  status?: string
}

const RUN_PERIODS = ['Matin', 'Soir'] as const

function buildDraftItemValues(
  runId: string,
  productsToUse: Array<{ id: string; unitPrice: number }>,
) {
  return productsToUse.flatMap((product) =>
    RUN_PERIODS.map((period) => ({
      runId,
      productId: product.id,
      period,
      quantityEntrusted: 0,
      quantityReturned: 0,
      unitPrice: product.unitPrice,
    })),
  )
}

async function syncDraftRunItems(
  db: Database,
  input: { organizationId: string; bakeryId: string; date: string },
) {
  const { organizationId, bakeryId, date } = input

  const draftRuns = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.organizationId, organizationId),
        eq(deliveryRuns.bakeryId, bakeryId),
        eq(deliveryRuns.date, date),
        eq(deliveryRuns.status, 'draft'),
      ),
    )

  if (draftRuns.length === 0) return

  const employeeIds = draftRuns.map((run) => run.employeeId)

  const [activeProducts, assignedRows, existingItems] = await Promise.all([
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          eq(products.isActive, true),
        ),
      ),
    db
      .select({
        employeeId: employeeProducts.employeeId,
        productId: employeeProducts.productId,
      })
      .from(employeeProducts)
      .where(
        and(
          inArray(employeeProducts.employeeId, employeeIds),
          eq(employeeProducts.isActive, true),
        ),
      ),
    db
      .select()
      .from(deliveryItems)
      .where(inArray(deliveryItems.runId, draftRuns.map((run) => run.id))),
  ])

  const assignedByEmployee = new Map<string, string[]>()
  for (const row of assignedRows) {
    const list = assignedByEmployee.get(row.employeeId) ?? []
    list.push(row.productId)
    assignedByEmployee.set(row.employeeId, list)
  }

  const itemsByRun = new Map<string, typeof existingItems>()
  for (const item of existingItems) {
    const list = itemsByRun.get(item.runId) ?? []
    list.push(item)
    itemsByRun.set(item.runId, list)
  }

  for (const run of draftRuns) {
    const productIds = assignedByEmployee.get(run.employeeId) ?? []
    const productsToUse = activeProducts.filter((product) =>
      productIds.includes(product.id),
    )
    const runItems = itemsByRun.get(run.id) ?? []
    const existingKeys = new Set(
      runItems.map((item) => `${item.productId}:${item.period}`),
    )

    const missingProducts = productsToUse.filter((product) =>
      RUN_PERIODS.some(
        (period) => !existingKeys.has(`${product.id}:${period}`),
      ),
    )

    if (missingProducts.length === 0) continue

    await db.insert(deliveryItems).values(
      buildDraftItemValues(run.id, missingProducts).filter(
        (row) => !existingKeys.has(`${row.productId}:${row.period}`),
      ),
    )
  }
}

async function prepareDeliveryDay(
  db: Database,
  input: { organizationId: string; bakeryId: string; date: string },
) {
  const { organizationId, bakeryId, date } = input

  const existingRuns = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.organizationId, organizationId),
        eq(deliveryRuns.bakeryId, bakeryId),
        eq(deliveryRuns.date, date),
      ),
    )

  const deliveryEmployees = await db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.organizationId, organizationId),
        eq(employees.bakeryId, bakeryId),
        eq(employees.role, 'delivery'),
        eq(employees.status, 'active'),
      ),
    )
    .orderBy(asc(employees.sortOrder), asc(employees.hireDate))

  const eligibleEmployees = deliveryEmployees.filter(
    (employee) => !employee.hireDate || employee.hireDate <= date,
  )

  const existingEmployeeIds = new Set(existingRuns.map((r) => r.employeeId))
  const missingEmployees = eligibleEmployees.filter(
    (e) => !existingEmployeeIds.has(e.id),
  )

  if (missingEmployees.length > 0) {
  const missingEmployeeIds = missingEmployees.map((e) => e.id)

  const [activeProducts, allAssignedProducts, allPrimaryLocations, fallbackLocation] =
    await Promise.all([
      db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, organizationId),
            eq(products.isActive, true),
          ),
        ),
      db
        .select({
          employeeId: employeeProducts.employeeId,
          productId: employeeProducts.productId,
        })
        .from(employeeProducts)
        .where(
          and(
            inArray(employeeProducts.employeeId, missingEmployeeIds),
            eq(employeeProducts.isActive, true),
          ),
        ),
      db
        .select()
        .from(employeeLocations)
        .where(
          and(
            inArray(employeeLocations.employeeId, missingEmployeeIds),
            eq(employeeLocations.isPrimary, true),
          ),
        ),
      db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.organizationId, organizationId),
            eq(locations.bakeryId, bakeryId),
          ),
        )
        .limit(1),
    ])

  const assignedProductsByEmployee = new Map<string, string[]>()
  for (const ap of allAssignedProducts) {
    const list = assignedProductsByEmployee.get(ap.employeeId) ?? []
    list.push(ap.productId)
    assignedProductsByEmployee.set(ap.employeeId, list)
  }

  const primaryLocationByEmployee = new Map<string, string>()
  for (const pl of allPrimaryLocations) {
    primaryLocationByEmployee.set(pl.employeeId, pl.locationId)
  }

  const fallbackLocationId = fallbackLocation[0]?.id

  for (const employee of missingEmployees) {
    const productIdsToUse = assignedProductsByEmployee.get(employee.id) ?? []
    const locationIdToUse =
      primaryLocationByEmployee.get(employee.id) ?? fallbackLocationId

    if (!locationIdToUse) continue

    const [run] = await db
      .insert(deliveryRuns)
      .values({
        organizationId,
        bakeryId,
        employeeId: employee.id,
        locationId: locationIdToUse,
        date,
        status: 'draft',
        notes: '',
      })
      .returning()

    const productsToUse = activeProducts.filter((p) =>
      productIdsToUse.includes(p.id),
    )

    if (productsToUse.length > 0) {
      await db
        .insert(deliveryItems)
        .values(buildDraftItemValues(run!.id, productsToUse))
    }
  }
  }

  await syncDraftRunItems(db, { organizationId, bakeryId, date })
}

export async function prepareDeliveryDayRuns(
  db: Database,
  input: { organizationId: string; bakeryId: string; date: string },
): Promise<{ created: number }> {
  const before = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.organizationId, input.organizationId),
        eq(deliveryRuns.bakeryId, input.bakeryId),
        eq(deliveryRuns.date, input.date),
      ),
    )

  await prepareDeliveryDay(db, input)

  const after = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.organizationId, input.organizationId),
        eq(deliveryRuns.bakeryId, input.bakeryId),
        eq(deliveryRuns.date, input.date),
      ),
    )

  return { created: after.length - before.length }
}

export async function listDeliveryRuns(
  db: Database,
  input: ListDeliveryRunsInput,
): Promise<DeliveryRunDetail[]> {
  const { organizationId, bakeryId, date, startDate, endDate, employeeId, locationId, status } =
    input

  const conditions = [eq(deliveryRuns.organizationId, organizationId)]

  if (bakeryId) {
    conditions.push(eq(deliveryRuns.bakeryId, bakeryId))
  }
  if (date) {
    conditions.push(eq(deliveryRuns.date, date))
  }
  if (startDate) {
    conditions.push(gte(deliveryRuns.date, startDate))
  }
  if (endDate) {
    conditions.push(lte(deliveryRuns.date, endDate))
  }
  if (employeeId) {
    conditions.push(eq(deliveryRuns.employeeId, employeeId))
  }
  if (locationId) {
    conditions.push(eq(deliveryRuns.locationId, locationId))
  }
  if (status) {
    conditions.push(eq(deliveryRuns.status, status))
  }

  const filtered = await db
    .select()
    .from(deliveryRuns)
    .where(and(...conditions))

  if (filtered.length === 0) return []

  const runIds = filtered.map((r) => r.id)
  const employeeIds = [...new Set(filtered.map((r) => r.employeeId))]
  const locationIds = [...new Set(filtered.map((r) => r.locationId))]

  const [allItems, allEmployees, allLocations, allAssignments] = await Promise.all([
    db
      .select()
      .from(deliveryItems)
      .where(inArray(deliveryItems.runId, runIds)),
    db.select().from(employees).where(inArray(employees.id, employeeIds)),
    db.select().from(locations).where(inArray(locations.id, locationIds)),
    db
      .select({
        employeeId: employeeProducts.employeeId,
        productId: employeeProducts.productId,
      })
      .from(employeeProducts)
      .where(
        and(
          inArray(employeeProducts.employeeId, employeeIds),
          eq(employeeProducts.isActive, true),
        ),
      ),
  ])

  const allProductIds = [...new Set(allItems.map((i) => i.productId))]
  const allProducts =
    allProductIds.length > 0
      ? await db
          .select()
          .from(products)
          .where(inArray(products.id, allProductIds))
      : []

  const employeeMap = new Map(allEmployees.map((e) => [e.id, e]))
  const locationMap = new Map(allLocations.map((l) => [l.id, l]))
  const productMap = new Map(allProducts.map((p) => [p.id, p]))

  const itemsByRun = new Map<string, typeof allItems>()
  for (const item of allItems) {
    const list = itemsByRun.get(item.runId) ?? []
    list.push(item)
    itemsByRun.set(item.runId, list)
  }

  const assignmentsByEmployee = new Map<string, Set<string>>()
  for (const a of allAssignments) {
    const set = assignmentsByEmployee.get(a.employeeId) ?? new Set()
    set.add(a.productId)
    assignmentsByEmployee.set(a.employeeId, set)
  }

  const filteredByEmployeeStatus = filtered.filter((run) => {
    const employee = employeeMap.get(run.employeeId)
    return employee?.status === 'active'
  })

  const filteredByHireDate = date
    ? filteredByEmployeeStatus.filter((run) => {
        const employee = employeeMap.get(run.employeeId)
        return !employee?.hireDate || employee.hireDate <= date
      })
    : filteredByEmployeeStatus

  const runsWithDetails: DeliveryRunDetail[] = filteredByHireDate.map((run) => {
    const employee = employeeMap.get(run.employeeId)
    const location = locationMap.get(run.locationId)
    const assignedProductIds = assignmentsByEmployee.get(run.employeeId)
    const items = itemsByRun.get(run.id) ?? []

    const filteredItems =
      !assignedProductIds || assignedProductIds.size === 0
        ? []
        : items.filter((item) => assignedProductIds.has(item.productId))

    const itemsWithProducts: DeliveryItemDetail[] = filteredItems.map((item) => {
      const product = productMap.get(item.productId)
      return {
        ...item,
        productName: product?.name ?? 'Inconnu',
        quantitySold: item.quantityEntrusted - item.quantityReturned,
      }
    })

    return {
      ...run,
      notes: run.notes ?? '',
      employeeName: employee
        ? `${employee.firstName} ${employee.lastName}`
        : 'Inconnu',
      employeeSortOrder: employee?.sortOrder ?? 0,
      employeeHireDate: employee?.hireDate ?? null,
      locationName: location?.name ?? 'Inconnu',
      items: itemsWithProducts,
    }
  })

  runsWithDetails.sort((a, b) => {
    if (a.employeeSortOrder !== b.employeeSortOrder) {
      return a.employeeSortOrder - b.employeeSortOrder
    }
    if (a.employeeHireDate && b.employeeHireDate) {
      return a.employeeHireDate.localeCompare(b.employeeHireDate)
    }
    if (a.employeeHireDate) return -1
    if (b.employeeHireDate) return 1
    return 0
  })

  return runsWithDetails
}

export type ValidateDeliveryRunResult = DeliveryRunDetail & {
  collection: { id: string; expectedAmount: number }
}

export async function getDeliveryRun(
  db: Database,
  organizationId: string,
  runId: string,
): Promise<DeliveryRunDetail> {
  const [run] = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.id, runId),
        eq(deliveryRuns.organizationId, organizationId),
      ),
    )

  if (!run) {
    throw new DeliveryServiceError('NOT_FOUND', 'Tournée introuvable')
  }

  const [items, employee, location, assignedProducts] = await Promise.all([
    db.select().from(deliveryItems).where(eq(deliveryItems.runId, runId)),
    db.query.employees.findFirst({ where: eq(employees.id, run.employeeId) }),
    db.query.locations.findFirst({ where: eq(locations.id, run.locationId) }),
    db
      .select({ productId: employeeProducts.productId })
      .from(employeeProducts)
      .where(
        and(
          eq(employeeProducts.employeeId, run.employeeId),
          eq(employeeProducts.isActive, true),
        ),
      ),
  ])

  const assignedProductIds = new Set(assignedProducts.map((p) => p.productId))
  const filteredItems =
    assignedProductIds.size === 0
      ? []
      : items.filter((item) => assignedProductIds.has(item.productId))

  const productIds = [...new Set(filteredItems.map((i) => i.productId))]
  const productRows =
    productIds.length > 0
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : []
  const productMap = new Map(productRows.map((p) => [p.id, p]))

  const itemsWithProducts: DeliveryItemDetail[] = filteredItems.map((item) => {
    const product = productMap.get(item.productId)
    return {
      ...item,
      productName: product?.name ?? 'Inconnu',
      quantitySold: item.quantityEntrusted - item.quantityReturned,
    }
  })

  return {
    ...run,
    notes: run.notes ?? '',
    employeeName: employee
      ? `${employee.firstName} ${employee.lastName}`
      : 'Inconnu',
    employeeSortOrder: employee?.sortOrder ?? 0,
    employeeHireDate: employee?.hireDate ?? null,
    locationName: location?.name ?? 'Inconnu',
    items: itemsWithProducts,
  }
}

export type UpdateDeliveryItemInput = {
  organizationId: string
  itemId: string
  quantityEntrusted?: number
  quantityReturned?: number
}

export async function updateDeliveryItem(
  db: Database,
  input: UpdateDeliveryItemInput,
): Promise<DeliveryItemDetail> {
  const [row] = await db
    .select({
      item: deliveryItems,
      run: deliveryRuns,
    })
    .from(deliveryItems)
    .innerJoin(deliveryRuns, eq(deliveryItems.runId, deliveryRuns.id))
    .where(
      and(
        eq(deliveryItems.id, input.itemId),
        eq(deliveryRuns.organizationId, input.organizationId),
      ),
    )

  if (!row) {
    throw new DeliveryServiceError('NOT_FOUND', 'Ligne produit introuvable')
  }

  if (row.run.status !== 'draft') {
    throw new DeliveryServiceError(
      'NOT_EDITABLE',
      'Seules les tournées en brouillon sont modifiables',
    )
  }

  const quantityEntrusted =
    input.quantityEntrusted ?? row.item.quantityEntrusted
  const quantityReturned = input.quantityReturned ?? row.item.quantityReturned

  if (quantityReturned > quantityEntrusted) {
    throw new DeliveryServiceError(
      'NOT_EDITABLE',
      'Les retours ne peuvent pas dépasser les quantités confiées',
    )
  }

  const [updated] = await db
    .update(deliveryItems)
    .set({
      ...(input.quantityEntrusted !== undefined
        ? { quantityEntrusted: input.quantityEntrusted }
        : {}),
      ...(input.quantityReturned !== undefined
        ? { quantityReturned: input.quantityReturned }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(deliveryItems.id, input.itemId))
    .returning()

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, updated!.productId))

  return {
    ...updated!,
    productName: product?.name ?? 'Inconnu',
    quantitySold: updated!.quantityEntrusted - updated!.quantityReturned,
  }
}

export async function validateDeliveryRun(
  db: Database,
  organizationId: string,
  runId: string,
): Promise<ValidateDeliveryRunResult> {
  const [run] = await db
    .select()
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.id, runId),
        eq(deliveryRuns.organizationId, organizationId),
      ),
    )

  if (!run) {
    throw new DeliveryServiceError('NOT_FOUND', 'Tournée introuvable')
  }

  if (run.status === 'validated') {
    throw new DeliveryServiceError(
      'ALREADY_VALIDATED',
      'Cette tournée est déjà validée',
    )
  }

  const items = await db
    .select()
    .from(deliveryItems)
    .where(eq(deliveryItems.runId, runId))

  const totalEntrusted = items.reduce(
    (sum, item) => sum + item.quantityEntrusted,
    0,
  )
  if (totalEntrusted === 0) {
    throw new DeliveryServiceError(
      'ZERO_QUANTITY',
      'Impossible de valider une tournée sans quantité confiée',
    )
  }

  const expectedAmount = items.reduce((sum, item) => {
    const sold = item.quantityEntrusted - item.quantityReturned
    return sum + sold * item.unitPrice
  }, 0)

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(deliveryRuns)
      .set({
        status: 'validated',
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deliveryRuns.id, runId),
          eq(deliveryRuns.organizationId, organizationId),
        ),
      )
      .returning()

    const [existingCollection] = await tx
      .select()
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.organizationId, organizationId),
          eq(cashCollections.deliveryRunId, runId),
        ),
      )

    let collection: { id: string; expectedAmount: number }

    if (existingCollection) {
      if (existingCollection.status !== 'pending') {
        collection = {
          id: existingCollection.id,
          expectedAmount: existingCollection.expectedAmount,
        }
      } else {
        const [updatedCollection] = await tx
          .update(cashCollections)
          .set({ expectedAmount, updatedAt: new Date() })
          .where(
            and(
              eq(cashCollections.id, existingCollection.id),
              eq(cashCollections.status, 'pending'),
            ),
          )
          .returning()
        collection = {
          id: updatedCollection!.id,
          expectedAmount: updatedCollection!.expectedAmount,
        }
      }
    } else {
      const [created] = await tx
        .insert(cashCollections)
        .values({
          organizationId,
          bakeryId: run.bakeryId,
          employeeId: run.employeeId,
          locationId: run.locationId,
          deliveryRunId: runId,
          date: run.date,
          expectedAmount,
          actualAmount: 0,
          cashAmount: 0,
          cardAmount: 0,
          mobileAmount: 0,
          status: 'pending',
          isSettled: false,
        })
        .returning()
      collection = {
        id: created!.id,
        expectedAmount: created!.expectedAmount,
      }
    }

    return { updated: updated!, collection }
  })

  const detail = await getDeliveryRun(db, organizationId, runId)

  return {
    ...detail,
    status: result.updated.status,
    validatedAt: result.updated.validatedAt,
    collection: result.collection,
  }
}
