import { describe, expect, it } from 'vitest'

import type { PayrollLinePreview } from '#/services/payroll'
import { mergePayrollLinesWithDraft } from '#/services/payroll-draft'

function line(
  partial: Partial<PayrollLinePreview> & Pick<PayrollLinePreview, 'employeeId' | 'employeeName'>,
): PayrollLinePreview {
  return {
    role: 'delivery',
    baseSalary: 0,
    commissionAmount: 0,
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
    grossAmount: 0,
    netAmount: 0,
    advanceInstallmentIds: [],
    bonusIds: [],
    deductions: [],
    ...partial,
  }
}

describe('mergePayrollLinesWithDraft', () => {
  it('keeps computed lines when no draft exists', () => {
    const computed = [
      line({ employeeId: 'a', employeeName: 'Alice', netAmount: 100 }),
      line({ employeeId: 'b', employeeName: 'Bob', netAmount: 200 }),
    ]

    const merged = mergePayrollLinesWithDraft(computed, [])

    expect(merged).toHaveLength(2)
    expect(merged[0]?.lineSource).toBe('computed')
    expect(merged[1]?.lineSource).toBe('computed')
  })

  it('replaces computed line with draft override for same employee', () => {
    const computed = [
      line({ employeeId: 'a', employeeName: 'Alice', netAmount: 100 }),
      line({ employeeId: 'b', employeeName: 'Bob', netAmount: 200 }),
    ]
    const draft = [
      line({
        employeeId: 'b',
        employeeName: 'Bob',
        netAmount: 250,
        lineSource: 'override',
        draftLineId: 'draft-1',
      }),
    ]

    const merged = mergePayrollLinesWithDraft(computed, draft)

    expect(merged.find((row) => row.employeeId === 'b')?.netAmount).toBe(250)
    expect(merged.find((row) => row.employeeId === 'b')?.lineSource).toBe(
      'override',
    )
    expect(merged.find((row) => row.employeeId === 'a')?.lineSource).toBe(
      'computed',
    )
  })

  it('appends manual-only draft lines and sorts by name', () => {
    const computed = [
      line({ employeeId: 'a', employeeName: 'Alice', netAmount: 100 }),
    ]
    const draft = [
      line({
        employeeId: 'c',
        employeeName: 'Charlie',
        netAmount: 50,
        lineSource: 'manual',
        draftLineId: 'draft-2',
      }),
    ]

    const merged = mergePayrollLinesWithDraft(computed, draft)

    expect(merged.map((row) => row.employeeName)).toEqual([
      'Alice',
      'Charlie',
    ])
  })
})
