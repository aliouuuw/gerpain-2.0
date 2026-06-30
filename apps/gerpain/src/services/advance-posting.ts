import type { PostLine } from '@gerpain/bocal'

import type { LedgerAccountIds } from './ledger-accounts'
import type { SalaryAdvanceRepaymentMethod } from '@gerpain/db/schema'

const DEFAULT_CURRENCY = 'XOF'

export function buildAdvanceGrantLines(
  accounts: LedgerAccountIds,
  amount: number,
  currency = DEFAULT_CURRENCY,
): PostLine[] {
  if (amount <= 0) {
    throw new Error('Le montant de l\'avance doit être positif')
  }

  return [
    {
      accountId: accounts.salaryAdvanceReceivable,
      direction: 'debit',
      amount,
      currency,
    },
    {
      accountId: accounts.cash,
      direction: 'credit',
      amount,
      currency,
    },
  ]
}

export function buildAdvanceRepaymentLines(
  accounts: LedgerAccountIds,
  amount: number,
  method: SalaryAdvanceRepaymentMethod,
  currency = DEFAULT_CURRENCY,
): PostLine[] {
  if (amount <= 0) {
    throw new Error('Le montant du remboursement doit être positif')
  }

  const debitAccount =
    method === 'cash' ? accounts.cash : accounts.payrollClearing

  return [
    {
      accountId: debitAccount,
      direction: 'debit',
      amount,
      currency,
    },
    {
      accountId: accounts.salaryAdvanceReceivable,
      direction: 'credit',
      amount,
      currency,
    },
  ]
}
