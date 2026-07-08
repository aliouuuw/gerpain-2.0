import { describe, expect, it } from 'vitest'

import { collectionShortfallDeduction } from './payroll-deductions'

describe('collectionShortfallDeduction', () => {
  it('returns zero when balanced or in surplus', () => {
    expect(
      collectionShortfallDeduction({
        totalExpected: 10_000,
        totalCollected: 10_000,
        solde: 0,
        collectionCount: 1,
      }),
    ).toBe(0)
    expect(
      collectionShortfallDeduction({
        totalExpected: 10_000,
        totalCollected: 10_500,
        solde: 500,
        collectionCount: 1,
      }),
    ).toBe(0)
  })

  it('returns manque amount when under-collected', () => {
    expect(
      collectionShortfallDeduction({
        totalExpected: 33_700,
        totalCollected: 33_000,
        solde: -700,
        collectionCount: 2,
      }),
    ).toBe(700)
  })

  it('applies partial rate from bakery settings', () => {
    expect(
      collectionShortfallDeduction(
        {
          totalExpected: 10_000,
          totalCollected: 9_000,
          solde: -1_000,
          collectionCount: 1,
        },
        { ratePercent: 50 },
      ),
    ).toBe(500)
  })

  it('applies optional cap after rate scaling', () => {
    expect(
      collectionShortfallDeduction(
        {
          totalExpected: 50_000,
          totalCollected: 40_000,
          solde: -10_000,
          collectionCount: 3,
        },
        { ratePercent: 100, capAmount: 3_000 },
      ),
    ).toBe(3_000)
  })

  it('returns zero when rate is zero', () => {
    expect(
      collectionShortfallDeduction(
        {
          totalExpected: 10_000,
          totalCollected: 5_000,
          solde: -5_000,
          collectionCount: 1,
        },
        { ratePercent: 0 },
      ),
    ).toBe(0)
  })
})
