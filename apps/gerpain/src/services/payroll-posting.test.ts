import { describe, expect, it } from 'vitest'

import { buildPayrollPayoutLines } from './payroll-posting'

const accounts = {
  cash: 'cash-id',
  salaryExpense: 'salary-expense-id',
  payrollClearing: 'clearing-id',
  salaryAdvanceReceivable: 'recv-id',
  driverReceivable: 'driver-recv-id',
  cashShortage: 'short-id',
  cashOverage: 'over-id',
}

describe('buildPayrollPayoutLines', () => {
  it('posts balanced salary expense and cash credit', () => {
    const lines = buildPayrollPayoutLines(accounts, 15_000)
    const debits = lines
      .filter((line) => line.direction === 'debit')
      .reduce((sum, line) => sum + line.amount, 0)
    const credits = lines
      .filter((line) => line.direction === 'credit')
      .reduce((sum, line) => sum + line.amount, 0)

    expect(debits).toBe(credits)
    expect(lines).toEqual([
      {
        accountId: 'salary-expense-id',
        direction: 'debit',
        amount: 15_000,
        currency: 'XOF',
      },
      {
        accountId: 'cash-id',
        direction: 'credit',
        amount: 15_000,
        currency: 'XOF',
      },
    ])
  })

  it('rejects non-positive net payout', () => {
    expect(() => buildPayrollPayoutLines(accounts, 0)).toThrow(
      'Le montant net de paie doit être positif',
    )
  })
})
