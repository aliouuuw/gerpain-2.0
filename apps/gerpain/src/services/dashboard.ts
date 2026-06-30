import { balanceOf } from '@gerpain/bocal'
import { and, eq, lte, sql } from 'drizzle-orm'

import {
  type Database,
  cashCollections,
  deliveryRuns,
} from '@gerpain/db'

import { getLedgerAccountMap } from './ledger-accounts'

export type DashboardSummaryInput = {
  organizationId: string
  bakeryId: string
  date: string
}

export type DashboardSummary = {
  date: string
  ledger: {
    cashBalance: number
    driverReceivableBalance: number
  }
  today: {
    expected: number
    collected: number
    remaining: number
    deliveriesTotal: number
    deliveriesValidated: number
    collectionsPending: number
    collectionsSubmitted: number
    unsettledValidatedCount: number
    unsettledValidatedAmount: number
  }
}

export async function getDashboardSummary(
  db: Database,
  input: DashboardSummaryInput,
): Promise<DashboardSummary> {
  const ledger = await db.transaction(async (tx) => {
    const accounts = await getLedgerAccountMap(tx, input.organizationId)

    const [cashBalance, driverReceivableBalance] = await Promise.all([
      balanceOf(tx, {
        organizationId: input.organizationId,
        accountId: accounts.cash,
      }),
      balanceOf(tx, {
        organizationId: input.organizationId,
        accountId: accounts.driverReceivable,
      }),
    ])

    return {
      cashBalance: Number(cashBalance),
      driverReceivableBalance: Number(driverReceivableBalance),
    }
  })

  const collectionConditions = [
    eq(cashCollections.organizationId, input.organizationId),
    eq(cashCollections.bakeryId, input.bakeryId),
    eq(cashCollections.date, input.date),
    eq(cashCollections.isArchived, false),
  ]

  const [collectionAgg] = await db
    .select({
      expected: sql<number>`COALESCE(SUM(${cashCollections.expectedAmount}), 0)`,
      collected: sql<number>`COALESCE(SUM(COALESCE(${cashCollections.actualAmount}, 0)), 0)`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${cashCollections.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      submitted: sql<number>`COALESCE(SUM(CASE WHEN ${cashCollections.status} = 'submitted' THEN 1 ELSE 0 END), 0)`,
    })
    .from(cashCollections)
    .where(and(...collectionConditions))

  const [unsettledAgg] = await db
    .select({
      count: sql<number>`COALESCE(COUNT(*), 0)`,
      amount: sql<number>`COALESCE(SUM(${cashCollections.expectedAmount} - COALESCE(${cashCollections.actualAmount}, 0)), 0)`,
    })
    .from(cashCollections)
    .where(
      and(
        eq(cashCollections.organizationId, input.organizationId),
        eq(cashCollections.bakeryId, input.bakeryId),
        eq(cashCollections.status, 'validated'),
        eq(cashCollections.isSettled, false),
        eq(cashCollections.isArchived, false),
        lte(cashCollections.date, input.date),
      ),
    )

  const [deliveryAgg] = await db
    .select({
      total: sql<number>`COALESCE(COUNT(*), 0)`,
      validated: sql<number>`COALESCE(SUM(CASE WHEN ${deliveryRuns.status} = 'validated' THEN 1 ELSE 0 END), 0)`,
    })
    .from(deliveryRuns)
    .where(
      and(
        eq(deliveryRuns.organizationId, input.organizationId),
        eq(deliveryRuns.bakeryId, input.bakeryId),
        eq(deliveryRuns.date, input.date),
      ),
    )

  const expected = collectionAgg?.expected ?? 0
  const collected = collectionAgg?.collected ?? 0

  return {
    date: input.date,
    ledger,
    today: {
      expected,
      collected,
      remaining: Math.max(expected - collected, 0),
      deliveriesTotal: deliveryAgg?.total ?? 0,
      deliveriesValidated: deliveryAgg?.validated ?? 0,
      collectionsPending: collectionAgg?.pending ?? 0,
      collectionsSubmitted: collectionAgg?.submitted ?? 0,
      unsettledValidatedCount: unsettledAgg?.count ?? 0,
      unsettledValidatedAmount: unsettledAgg?.amount ?? 0,
    },
  }
}
