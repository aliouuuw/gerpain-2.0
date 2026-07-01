import { and, eq, gte, lte, sql } from 'drizzle-orm'

import {
  type Database,
  deliveryItems,
  deliveryRuns,
  employeeProducts,
  products,
} from '@gerpain/db'

export type PeriodCommissionInput = {
  organizationId: string
  bakeryId: string
  startDate: string
  endDate: string
  employeeId?: string
}

export type EmployeePeriodCommission = {
  employeeId: string
  commissionDue: number
  unitsSold: number
  validatedRuns: number
}

export type ProductPeriodCommission = {
  employeeId: string
  productId: string
  productName: string
  unitsSold: number
  commissionPerUnit: number
  commissionDue: number
}

const soldUnitsExpr = sql`GREATEST(${deliveryItems.quantityEntrusted} - ${deliveryItems.quantityReturned}, 0)`

export async function getPeriodCommissions(
  db: Database,
  input: PeriodCommissionInput,
): Promise<EmployeePeriodCommission[]> {
  const conditions = [
    eq(deliveryRuns.organizationId, input.organizationId),
    eq(deliveryRuns.bakeryId, input.bakeryId),
    eq(deliveryRuns.status, 'validated'),
    gte(deliveryRuns.date, input.startDate),
    lte(deliveryRuns.date, input.endDate),
  ]

  if (input.employeeId) {
    conditions.push(eq(deliveryRuns.employeeId, input.employeeId))
  }

  const rows = await db
    .select({
      employeeId: deliveryRuns.employeeId,
      commissionDue: sql<number>`COALESCE(SUM(${soldUnitsExpr} * ${employeeProducts.commissionPerUnit}), 0)`,
      unitsSold: sql<number>`COALESCE(SUM(${soldUnitsExpr}), 0)`,
      validatedRuns: sql<number>`COUNT(DISTINCT ${deliveryRuns.id})`,
    })
    .from(deliveryRuns)
    .innerJoin(deliveryItems, eq(deliveryItems.runId, deliveryRuns.id))
    .innerJoin(
      employeeProducts,
      and(
        eq(employeeProducts.employeeId, deliveryRuns.employeeId),
        eq(employeeProducts.productId, deliveryItems.productId),
        eq(employeeProducts.isActive, true),
      ),
    )
    .where(and(...conditions))
    .groupBy(deliveryRuns.employeeId)

  return rows.map((row) => ({
    employeeId: row.employeeId,
    commissionDue: Number(row.commissionDue) || 0,
    unitsSold: Number(row.unitsSold) || 0,
    validatedRuns: Number(row.validatedRuns) || 0,
  }))
}

export async function getPeriodCommissionForEmployee(
  db: Database,
  input: PeriodCommissionInput & { employeeId: string },
): Promise<EmployeePeriodCommission> {
  const rows = await getPeriodCommissions(db, input)
  const match = rows.find((row) => row.employeeId === input.employeeId)
  return (
    match ?? {
      employeeId: input.employeeId,
      commissionDue: 0,
      unitsSold: 0,
      validatedRuns: 0,
    }
  )
}

export async function getPeriodCommissionBreakdown(
  db: Database,
  input: PeriodCommissionInput,
): Promise<ProductPeriodCommission[]> {
  const conditions = [
    eq(deliveryRuns.organizationId, input.organizationId),
    eq(deliveryRuns.bakeryId, input.bakeryId),
    eq(deliveryRuns.status, 'validated'),
    gte(deliveryRuns.date, input.startDate),
    lte(deliveryRuns.date, input.endDate),
  ]

  if (input.employeeId) {
    conditions.push(eq(deliveryRuns.employeeId, input.employeeId))
  }

  const rows = await db
    .select({
      employeeId: deliveryRuns.employeeId,
      productId: deliveryItems.productId,
      productName: products.name,
      unitsSold: sql<number>`COALESCE(SUM(${soldUnitsExpr}), 0)`,
      commissionPerUnit: employeeProducts.commissionPerUnit,
      commissionDue: sql<number>`COALESCE(SUM(${soldUnitsExpr} * ${employeeProducts.commissionPerUnit}), 0)`,
    })
    .from(deliveryRuns)
    .innerJoin(deliveryItems, eq(deliveryItems.runId, deliveryRuns.id))
    .innerJoin(
      employeeProducts,
      and(
        eq(employeeProducts.employeeId, deliveryRuns.employeeId),
        eq(employeeProducts.productId, deliveryItems.productId),
        eq(employeeProducts.isActive, true),
      ),
    )
    .innerJoin(products, eq(products.id, deliveryItems.productId))
    .where(and(...conditions))
    .groupBy(
      deliveryRuns.employeeId,
      deliveryItems.productId,
      products.name,
      employeeProducts.commissionPerUnit,
    )

  return rows
    .map((row) => ({
      employeeId: row.employeeId,
      productId: row.productId,
      productName: row.productName,
      unitsSold: Number(row.unitsSold) || 0,
      commissionPerUnit: row.commissionPerUnit,
      commissionDue: Number(row.commissionDue) || 0,
    }))
    .sort((a, b) => {
      if (b.commissionDue !== a.commissionDue) {
        return b.commissionDue - a.commissionDue
      }
      return b.unitsSold - a.unitsSold
    })
}
