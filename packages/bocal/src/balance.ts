import { and, eq, lte, sql } from 'drizzle-orm'

import { ledgerLines, ledgerMovements } from '@gerpain/db/schema'

import type { BalanceOfInput, BalancesForInput, BocalTx } from './types'

async function sumAccountBalance(
  tx: BocalTx,
  organizationId: string,
  accountId: string,
  asOf?: Date,
): Promise<bigint> {
  const conditions = [
    eq(ledgerMovements.organizationId, organizationId),
    eq(ledgerLines.accountId, accountId),
  ]

  if (asOf) {
    conditions.push(lte(ledgerMovements.occurredAt, asOf))
  }

  const [row] = await tx
    .select({
      balance: sql<number>`coalesce(
        sum(
          case
            when ${ledgerLines.direction} = 'debit' then ${ledgerLines.amount}
            else -${ledgerLines.amount}
          end
        ),
        0
      )`,
    })
    .from(ledgerLines)
    .innerJoin(ledgerMovements, eq(ledgerLines.movementId, ledgerMovements.id))
    .where(and(...conditions))

  return BigInt(row?.balance ?? 0)
}

export async function balanceOf(
  tx: BocalTx,
  input: BalanceOfInput,
): Promise<bigint> {
  return sumAccountBalance(
    tx,
    input.organizationId,
    input.accountId,
    input.asOf,
  )
}

export async function balancesFor(
  tx: BocalTx,
  input: BalancesForInput,
): Promise<Record<string, bigint>> {
  const uniqueAccountIds = [...new Set(input.accountIds)]
  const entries = await Promise.all(
    uniqueAccountIds.map(async (accountId) => {
      const balance = await sumAccountBalance(
        tx,
        input.organizationId,
        accountId,
        input.asOf,
      )
      return [accountId, balance] as const
    }),
  )

  return Object.fromEntries(entries)
}
