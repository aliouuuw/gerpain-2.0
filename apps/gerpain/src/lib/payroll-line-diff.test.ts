import { describe, expect, it } from 'vitest'

import {
  amountsFromPayrollLine,
  closeDetailSnapshot,
  payrollLineDiff,
} from '#/lib/payroll-line-diff'

describe('payrollLineDiff', () => {
  it('returns only changed amount fields', () => {
    const before = amountsFromPayrollLine({
      baseSalary: 100_000,
      commissionAmount: 20_000,
      bonusAmount: 0,
      advanceDeduction: 0,
      collectionDeduction: 0,
      grossAmount: 120_000,
      netAmount: 120_000,
    })

    const after = amountsFromPayrollLine({
      baseSalary: 100_000,
      commissionAmount: 18_000,
      bonusAmount: 5_000,
      advanceDeduction: 0,
      collectionDeduction: 0,
      grossAmount: 123_000,
      netAmount: 123_000,
    })

    const diff = payrollLineDiff(before, after)

    expect(diff.map((row) => row.field)).toEqual([
      'commissionAmount',
      'bonusAmount',
      'grossAmount',
      'netAmount',
    ])
    expect(diff.find((row) => row.field === 'commissionAmount')).toMatchObject({
      before: 20_000,
      after: 18_000,
      delta: -2_000,
    })
  })
})

describe('closeDetailSnapshot', () => {
  it('persists override metadata and computed amounts on close', () => {
    const amounts = amountsFromPayrollLine({
      baseSalary: 100_000,
      commissionAmount: 20_000,
      bonusAmount: 0,
      advanceDeduction: 0,
      collectionDeduction: 0,
      grossAmount: 120_000,
      netAmount: 120_000,
    })

    const snapshot = closeDetailSnapshot(
      {
        ...amounts,
        lineSource: 'override',
        manualReason: 'Prime exceptionnelle',
        computedAmounts: amounts,
      },
      { commissionProducts: [] },
    )

    expect(snapshot).toMatchObject({
      source: 'override',
      manualReason: 'Prime exceptionnelle',
      computedAmounts: amounts,
      commissionProducts: [],
    })
  })
})
