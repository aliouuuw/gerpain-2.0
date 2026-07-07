import { describe, expect, it } from 'vitest'

import { buildCollectionValidateLines } from './collection-posting'

const accounts = {
  cash: 'cash-id',
  driverReceivable: 'recv-id',
  cashShortage: 'short-id',
  cashOverage: 'over-id',
  salaryAdvanceReceivable: 'advance-id',
  payrollClearing: 'clearing-id',
  salaryExpense: 'expense-id',
}

describe('buildCollectionValidateLines', () => {
  it('balances when actual equals expected', () => {
    const lines = buildCollectionValidateLines(accounts, 10_000, 10_000)
    const debits = lines
      .filter((l) => l.direction === 'debit')
      .reduce((s, l) => s + l.amount, 0)
    const credits = lines
      .filter((l) => l.direction === 'credit')
      .reduce((s, l) => s + l.amount, 0)
    expect(debits).toBe(credits)
    expect(lines).toHaveLength(2)
  })

  it('adds shortage line when under-collected', () => {
    const lines = buildCollectionValidateLines(accounts, 10_000, 8_000)
    expect(lines).toHaveLength(3)
    expect(lines[2]).toMatchObject({
      accountId: 'short-id',
      direction: 'debit',
      amount: 2_000,
    })
  })

  it('adds overage line when over-collected', () => {
    const lines = buildCollectionValidateLines(accounts, 10_000, 12_000)
    expect(lines).toHaveLength(3)
    expect(lines[2]).toMatchObject({
      accountId: 'over-id',
      direction: 'credit',
      amount: 2_000,
    })
  })
})
