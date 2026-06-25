import type { PostLine } from '@gerpain/bocal'

import type { LedgerAccountIds } from './ledger-accounts'

const DEFAULT_CURRENCY = 'XOF'

export function buildCollectionValidateLines(
  accounts: LedgerAccountIds,
  expectedAmount: number,
  actualAmount: number,
  currency = DEFAULT_CURRENCY,
): PostLine[] {
  if (actualAmount <= 0) {
    throw new Error('Le montant collecté doit être positif')
  }

  const lines: PostLine[] = [
    {
      accountId: accounts.cash,
      direction: 'debit',
      amount: actualAmount,
      currency,
    },
    {
      accountId: accounts.driverReceivable,
      direction: 'credit',
      amount: expectedAmount,
      currency,
    },
  ]

  const diff = actualAmount - expectedAmount
  if (diff < 0) {
    lines.push({
      accountId: accounts.cashShortage,
      direction: 'debit',
      amount: -diff,
      currency,
    })
  } else if (diff > 0) {
    lines.push({
      accountId: accounts.cashOverage,
      direction: 'credit',
      amount: diff,
      currency,
    })
  }

  return lines
}
