import type { PostLine } from '@gerpain/bocal'

import type { LedgerAccountIds } from './ledger-accounts'

const DEFAULT_CURRENCY = 'XOF'

export function buildPayrollCollectionDeductionLines(
  accounts: LedgerAccountIds,
  amount: number,
  currency = DEFAULT_CURRENCY,
): PostLine[] {
  if (amount <= 0) {
    throw new Error('La retenue caisse doit être positive')
  }

  return [
    {
      accountId: accounts.payrollClearing,
      direction: 'debit',
      amount,
      currency,
    },
    {
      accountId: accounts.cashShortage,
      direction: 'credit',
      amount,
      currency,
    },
  ]
}

export function buildPayrollPayoutLines(
  accounts: LedgerAccountIds,
  netAmount: number,
  currency = DEFAULT_CURRENCY,
): PostLine[] {
  if (netAmount <= 0) {
    throw new Error('Le montant net de paie doit être positif')
  }

  return [
    {
      accountId: accounts.salaryExpense,
      direction: 'debit',
      amount: netAmount,
      currency,
    },
    {
      accountId: accounts.cash,
      direction: 'credit',
      amount: netAmount,
      currency,
    },
  ]
}
