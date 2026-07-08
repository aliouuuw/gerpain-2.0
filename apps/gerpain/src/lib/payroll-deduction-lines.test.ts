import { describe, expect, it } from 'vitest'

import {
  netAfterDeductions,
  sumPayrollDeductions,
} from '#/lib/payroll-deduction-lines'

describe('payroll deduction lines', () => {
  it('sums deduction amounts', () => {
    expect(
      sumPayrollDeductions([
        {
          id: '1',
          type: 'absence',
          label: 'Absence',
          amount: 5_000,
        },
        {
          id: '2',
          type: 'cotisation',
          label: 'Cotisation syndicale',
          amount: 2_000,
        },
      ]),
    ).toBe(7_000)
  })

  it('computes net after advances, collection, and other deductions', () => {
    expect(
      netAfterDeductions({
        grossAmount: 100_000,
        advanceDeduction: 10_000,
        collectionDeduction: 5_000,
        deductions: [
          {
            id: '1',
            type: 'disciplinary',
            label: 'Disciplinaire',
            amount: 3_000,
          },
        ],
      }),
    ).toBe(82_000)
  })

  it('never returns negative net', () => {
    expect(
      netAfterDeductions({
        grossAmount: 10_000,
        advanceDeduction: 8_000,
        collectionDeduction: 5_000,
        deductions: [
          {
            id: '1',
            type: 'other',
            label: 'Autre',
            amount: 5_000,
          },
        ],
      }),
    ).toBe(0)
  })
})
