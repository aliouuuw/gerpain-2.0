import { and, eq, gte, lte, sql } from 'drizzle-orm'

import { type Database, cashCollections, deliveryRuns } from '@gerpain/db'

export type DayActivityRow = {
  date: string
  deliveryRuns: number
  deliveriesWorked: number
  collections: number
}

export type DayActivityInput = {
  organizationId: string
  bakeryId: string
  startDate: string
  endDate: string
}

export async function getDayActivity(
  db: Database,
  input: DayActivityInput,
): Promise<DayActivityRow[]> {
  const { organizationId, bakeryId, startDate, endDate } = input

  const [deliveryRows, collectionRows] = await Promise.all([
    db
      .select({
        date: deliveryRuns.date,
        deliveryRuns: sql<number>`count(*)::int`,
        deliveriesWorked: sql<number>`count(*) filter (where ${deliveryRuns.status} <> 'draft')::int`,
      })
      .from(deliveryRuns)
      .where(
        and(
          eq(deliveryRuns.organizationId, organizationId),
          eq(deliveryRuns.bakeryId, bakeryId),
          gte(deliveryRuns.date, startDate),
          lte(deliveryRuns.date, endDate),
        ),
      )
      .groupBy(deliveryRuns.date),
    db
      .select({
        date: cashCollections.date,
        collections: sql<number>`count(*)::int`,
      })
      .from(cashCollections)
      .where(
        and(
          eq(cashCollections.organizationId, organizationId),
          eq(cashCollections.bakeryId, bakeryId),
          gte(cashCollections.date, startDate),
          lte(cashCollections.date, endDate),
        ),
      )
      .groupBy(cashCollections.date),
  ])

  const byDate = new Map<string, DayActivityRow>()

  for (const row of deliveryRows) {
    byDate.set(row.date, {
      date: row.date,
      deliveryRuns: row.deliveryRuns,
      deliveriesWorked: row.deliveriesWorked,
      collections: 0,
    })
  }

  for (const row of collectionRows) {
    const existing = byDate.get(row.date)
    if (existing) {
      existing.collections = row.collections
    } else {
      byDate.set(row.date, {
        date: row.date,
        deliveryRuns: 0,
        deliveriesWorked: 0,
        collections: row.collections,
      })
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
