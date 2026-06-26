import { and, asc, eq, inArray } from 'drizzle-orm'

import {
  type Database,
  employeeLocations,
  employeeProducts,
  employees,
  products,
} from '@gerpain/db'

import { getLocation } from '#/services/locations'

export class EmployeeServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'INVALID_LOCATION',
    message: string,
  ) {
    super(message)
    this.name = 'EmployeeServiceError'
  }
}

export type EmployeeRole = 'delivery' | 'cashier' | 'manager' | 'baker'

export type EmployeeInput = {
  firstName: string
  lastName: string
  role: EmployeeRole
  email?: string
  phone?: string
  baseSalary?: number
  commissionRate?: number
  hireDate?: string
  locationIds?: string[]
}

export type EmployeeUpdateInput = Partial<EmployeeInput> & {
  status?: 'active' | 'inactive'
  sortOrder?: number
}

export type EmployeeListItem = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string | null
  phone: string | null
  role: string
  status: string
  baseSalary: number | null
  commissionRate: number | null
  sortOrder: number | null
  productCount: number
  locationIds: string[]
}

export type EmployeeProductAssignment = {
  id: string
  productId: string
  productName: string
  commissionPerUnit: number
  isActive: boolean | null
}

async function loadLocationIds(
  db: Database,
  employeeId: string,
): Promise<string[]> {
  const rows = await db.query.employeeLocations.findMany({
    where: eq(employeeLocations.employeeId, employeeId),
  })
  return rows.map((row) => row.locationId)
}

async function countActiveProducts(
  db: Database,
  employeeIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const id of employeeIds) counts.set(id, 0)

  if (employeeIds.length === 0) return counts

  const rows = await db.query.employeeProducts.findMany({
    where: inArray(employeeProducts.employeeId, employeeIds),
  })

  for (const row of rows) {
    if (row.isActive === false) continue
    counts.set(row.employeeId, (counts.get(row.employeeId) ?? 0) + 1)
  }

  return counts
}

export async function listEmployees(
  db: Database,
  organizationId: string,
  bakeryId: string,
  options?: { role?: EmployeeRole; status?: 'active' | 'inactive' },
): Promise<EmployeeListItem[]> {
  const conditions = [
    eq(employees.organizationId, organizationId),
    eq(employees.bakeryId, bakeryId),
  ]

  const rows = await db.query.employees.findMany({
    where: and(...conditions),
    orderBy: [asc(employees.sortOrder), asc(employees.lastName)],
  })

  let filtered = rows
  if (options?.role) {
    filtered = filtered.filter((row) => row.role === options.role)
  }
  if (options?.status) {
    filtered = filtered.filter((row) => row.status === options.status)
  }

  const employeeIds = filtered.map((row) => row.id)
  const [productCounts, allLocations] = await Promise.all([
    countActiveProducts(db, employeeIds),
    employeeIds.length > 0
      ? db.query.employeeLocations.findMany({
          where: inArray(employeeLocations.employeeId, employeeIds),
        })
      : Promise.resolve([]),
  ])

  const locationsByEmployee = new Map<string, string[]>()
  for (const row of allLocations) {
    const list = locationsByEmployee.get(row.employeeId) ?? []
    list.push(row.locationId)
    locationsByEmployee.set(row.employeeId, list)
  }

  return filtered.map((row) => ({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    baseSalary: row.baseSalary,
    commissionRate: row.commissionRate,
    sortOrder: row.sortOrder,
    productCount: productCounts.get(row.id) ?? 0,
    locationIds: locationsByEmployee.get(row.id) ?? [],
  }))
}

export async function getEmployee(
  db: Database,
  organizationId: string,
  bakeryId: string,
  employeeId: string,
) {
  const row = await db.query.employees.findFirst({
    where: and(
      eq(employees.id, employeeId),
      eq(employees.organizationId, organizationId),
      eq(employees.bakeryId, bakeryId),
    ),
  })

  if (!row) {
    throw new EmployeeServiceError('NOT_FOUND', 'Employé introuvable')
  }

  const locationIds = await loadLocationIds(db, employeeId)
  const productCount = (await countActiveProducts(db, [employeeId])).get(
    employeeId,
  ) ?? 0

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    baseSalary: row.baseSalary,
    commissionRate: row.commissionRate,
    hireDate: row.hireDate,
    sortOrder: row.sortOrder,
    productCount,
    locationIds,
  }
}

async function assertLocationsForBakery(
  db: Database,
  organizationId: string,
  bakeryId: string,
  locationIds: string[],
) {
  for (const locationId of locationIds) {
    try {
      await getLocation(db, organizationId, bakeryId, locationId)
    } catch {
      throw new EmployeeServiceError(
        'INVALID_LOCATION',
        'Lieu invalide pour cette boulangerie',
      )
    }
  }
}

async function replaceEmployeeLocations(
  db: Database,
  employeeId: string,
  locationIds: string[],
) {
  await db
    .delete(employeeLocations)
    .where(eq(employeeLocations.employeeId, employeeId))

  if (locationIds.length === 0) return

  await db.insert(employeeLocations).values(
    locationIds.map((locationId, index) => ({
      employeeId,
      locationId,
      isPrimary: index === 0,
    })),
  )
}

export async function createEmployee(
  db: Database,
  organizationId: string,
  bakeryId: string,
  input: EmployeeInput,
) {
  if (input.locationIds?.length) {
    await assertLocationsForBakery(
      db,
      organizationId,
      bakeryId,
      input.locationIds,
    )
  }

  const [created] = await db
    .insert(employees)
    .values({
      organizationId,
      bakeryId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      baseSalary: input.baseSalary ?? 0,
      commissionRate: input.commissionRate ?? 0,
      hireDate: input.hireDate ?? null,
      status: 'active',
    })
    .returning()

  if (input.locationIds?.length) {
    await replaceEmployeeLocations(db, created!.id, input.locationIds)
  }

  return getEmployee(db, organizationId, bakeryId, created!.id)
}

export async function updateEmployee(
  db: Database,
  organizationId: string,
  bakeryId: string,
  employeeId: string,
  input: EmployeeUpdateInput,
) {
  await getEmployee(db, organizationId, bakeryId, employeeId)

  if (input.locationIds) {
    await assertLocationsForBakery(
      db,
      organizationId,
      bakeryId,
      input.locationIds,
    )
  }

  const patch: Partial<typeof employees.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.firstName !== undefined) patch.firstName = input.firstName.trim()
  if (input.lastName !== undefined) patch.lastName = input.lastName.trim()
  if (input.role !== undefined) patch.role = input.role
  if (input.email !== undefined) patch.email = input.email.trim() || null
  if (input.phone !== undefined) patch.phone = input.phone.trim() || null
  if (input.baseSalary !== undefined) patch.baseSalary = input.baseSalary
  if (input.commissionRate !== undefined) {
    patch.commissionRate = input.commissionRate
  }
  if (input.hireDate !== undefined) patch.hireDate = input.hireDate || null
  if (input.status !== undefined) patch.status = input.status
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder

  await db
    .update(employees)
    .set(patch)
    .where(
      and(
        eq(employees.id, employeeId),
        eq(employees.organizationId, organizationId),
        eq(employees.bakeryId, bakeryId),
      ),
    )

  if (input.locationIds) {
    await replaceEmployeeLocations(db, employeeId, input.locationIds)
  }

  return getEmployee(db, organizationId, bakeryId, employeeId)
}

export async function listEmployeeProducts(
  db: Database,
  organizationId: string,
  bakeryId: string,
  employeeId: string,
): Promise<EmployeeProductAssignment[]> {
  await getEmployee(db, organizationId, bakeryId, employeeId)

  const rows = await db.query.employeeProducts.findMany({
    where: eq(employeeProducts.employeeId, employeeId),
    with: { product: true },
  })

  return rows
    .filter((row) => row.product?.organizationId === organizationId)
    .map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.product?.name ?? '—',
      commissionPerUnit: row.commissionPerUnit,
      isActive: row.isActive,
    }))
}

export type EmployeeProductInput = {
  productId: string
  commissionPerUnit?: number
  isActive?: boolean
}

export async function setEmployeeProducts(
  db: Database,
  organizationId: string,
  bakeryId: string,
  employeeId: string,
  items: EmployeeProductInput[],
) {
  await getEmployee(db, organizationId, bakeryId, employeeId)

  const productRows = await db.query.products.findMany({
    where: eq(products.organizationId, organizationId),
  })
  const allowedIds = new Set(
    productRows
      .filter((p) => !p.bakeryId || p.bakeryId === bakeryId)
      .map((p) => p.id),
  )

  for (const item of items) {
    if (!allowedIds.has(item.productId)) {
      throw new EmployeeServiceError('NOT_FOUND', 'Produit introuvable')
    }
  }

  await db
    .delete(employeeProducts)
    .where(eq(employeeProducts.employeeId, employeeId))

  if (items.length > 0) {
    await db.insert(employeeProducts).values(
      items.map((item) => ({
        employeeId,
        productId: item.productId,
        commissionPerUnit: item.commissionPerUnit ?? 0,
        isActive: item.isActive ?? true,
      })),
    )
  }

  return listEmployeeProducts(db, organizationId, bakeryId, employeeId)
}
