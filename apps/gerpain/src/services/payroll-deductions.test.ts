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
})
