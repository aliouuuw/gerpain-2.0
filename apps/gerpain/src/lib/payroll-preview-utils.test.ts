import { describe, expect, it } from 'vitest'

import type { PayrollPreview } from '#/services/payroll'

import {
  parseSelectedAgentIds,
  reconcileSelectedAgentIds,
  serializeSelectedAgentIds,
  subsetPayrollPreview,
  totalsFromPayrollLines,
} from '#/lib/payroll-preview-utils'

const preview: PayrollPreview = {
  startDate: '2026-07-01',
  endDate: '2026-07-07',
  periodLabel: '2026-07',
  isClosed: false,
  closedRunId: null,
  hasDraft: false,
  lines: [
    {
      employeeId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      employeeName: 'Alice',
      role: 'delivery',
      baseSalary: 100_000,
      commissionAmount: 10_000,
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
      grossAmount: 110_000,
      netAmount: 110_000,
      advanceInstallmentIds: [],
      bonusIds: [],
    },
    {
      employeeId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      employeeName: 'Bob',
      role: 'cashier',
      baseSalary: 80_000,
      commissionAmount: 0,
      commissionUnitsSold: 0,
      commissionUnitsCommissioned: 0,
      commissionValidatedRuns: 0,
      commissionProducts: [],
      bonusAmount: 5_000,
      bonuses: [],
      advanceDeduction: 0,
      advanceInstallments: [],
      collectionBalance: null,
      collectionDeduction: 0,
      deductions: [],
      grossAmount: 85_000,
      netAmount: 85_000,
      advanceInstallmentIds: [],
      bonusIds: [],
    },
  ],
  totals: {
    gross: 195_000,
    net: 195_000,
    commission: 10_000,
    bonus: 5_000,
    advanceDeduction: 0,
    collectionDeduction: 0,
    otherDeduction: 0,
  },
}

describe('payroll-preview-utils', () => {
  it('subsets preview and recomputes totals', () => {
    const subset = subsetPayrollPreview(preview, [
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ])

    expect(subset.lines).toHaveLength(1)
    expect(subset.totals.net).toBe(110_000)
    expect(subset.totals.gross).toBe(110_000)
  })

  it('parses and serializes selected agent ids', () => {
    const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    expect(parseSelectedAgentIds(`${id},invalid,${id}`)).toEqual([id])
    expect(serializeSelectedAgentIds([id, id])).toBe(id)
    expect(serializeSelectedAgentIds([])).toBeUndefined()
  })

  it('reconciles selection against available lines', () => {
    const kept = reconcileSelectedAgentIds(
      [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
      ],
      preview.lines.map((line) => line.employeeId),
    )
    expect(kept).toEqual(['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])
  })

  it('totalsFromPayrollLines matches subset', () => {
    const totals = totalsFromPayrollLines(preview.lines)
    expect(totals.net).toBe(preview.totals.net)
  })
})
