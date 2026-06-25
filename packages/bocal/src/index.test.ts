import { describe, expect, it } from 'vitest'

import { BOCAL_VERSION } from './index'

describe('bocal', () => {
  it('exports a version marker until ledger API is implemented', () => {
    expect(BOCAL_VERSION).toBe('0.0.0')
  })
})
