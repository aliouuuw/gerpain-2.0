import { inArray } from 'drizzle-orm'

import { ledgerAccounts } from '@gerpain/db/schema'

import {
  AccountNotFoundError,
  AccountOrganizationMismatchError,
  BocalValidationError,
  UnbalancedPostingError,
} from './errors'
import type { BocalTx, PostLine } from './types'

export function assertBalanced(lines: PostLine[]): void {
  let debitTotal = 0
  let creditTotal = 0

  for (const line of lines) {
    if (line.amount <= 0) {
      throw new BocalValidationError('Line amounts must be positive integers')
    }
    if (line.direction === 'debit') {
      debitTotal += line.amount
    } else {
      creditTotal += line.amount
    }
  }

  if (debitTotal !== creditTotal) {
    throw new UnbalancedPostingError(debitTotal, creditTotal)
  }
}

export async function assertAccountsInOrganization(
  tx: BocalTx,
  organizationId: string,
  accountIds: string[],
): Promise<void> {
  if (accountIds.length === 0) {
    return
  }

  const uniqueIds = [...new Set(accountIds)]
  const rows = await tx
    .select({
      id: ledgerAccounts.id,
      organizationId: ledgerAccounts.organizationId,
    })
    .from(ledgerAccounts)
    .where(inArray(ledgerAccounts.id, uniqueIds))

  if (rows.length !== uniqueIds.length) {
    const found = new Set(rows.map((row) => row.id))
    const missing = uniqueIds.find((id) => !found.has(id))
    throw new AccountNotFoundError(missing ?? uniqueIds[0]!)
  }

  for (const row of rows) {
    if (row.organizationId !== organizationId) {
      throw new AccountOrganizationMismatchError(row.id, organizationId)
    }
  }
}
