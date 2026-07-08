import { describe, expect, it } from 'vitest'

import type { PayrollLinePreview } from '#/services/payroll'
import { applyBulkAdjustment } from '#/services/payroll'

function line(
  partial: Partial<PayrollLinePreview> &
    Pick<PayrollLinePreview, 'employeeId' | 'employeeName'>,
): PayrollLinePreview {
  return {
    role: 'delivery',
    baseSalary: 100_000,
    commissionAmount: 20_000,
    commissionUnitsSold: 0,
    commissionUnitsCommissioned: 0,
    commissionValidatedRuns: 0,
    commissionProducts: [],
    bonusAmount: 0,
    bonuses: [],
    advanceDeduction: 0,
    advanceInstallments: [],
    collectionBalance: null,
    collectionDeduction: 0,
    deductions: [],
    grossAmount: 120_000,
    netAmount: 120_000,
    advanceInstallmentIds: [],
    bonusIds: [],
    ...partial,
  }
}

describe('applyBulkAdjustment', () => {
  it('adds a fixed bonus amount and recalculates gross/net', () => {
    const adjusted = applyBulkAdjustment(
      line({ employeeId: 'a', employeeName: 'Alice' }),
      {
        employeeIds: ['a'],
        target: 'bonusAmount',
        mode: 'add',
        value: 5_000,
        reason: 'Prime transport',
      },
    )

    expect(adjusted.bonusAmount).toBe(5_000)
    expect(adjusted.grossAmount).toBe(125_000)
    expect(adjusted.netAmount).toBe(125_000)
  })

  it('applies a commission rate reduction', () => {
    const adjusted = applyBulkAdjustment(
      line({ employeeId: 'a', employeeName: 'Alice' }),
      {
        employeeIds: ['a'],
        target: 'commissionAmount',
        mode: 'multiply',
        value: -10,
        reason: 'Correction',
      },
    )

    expect(adjusted.commissionAmount).toBe(18_000)
    expect(adjusted.grossAmount).toBe(118_000)
    expect(adjusted.netAmount).toBe(118_000)
  })
})
