import {describe, expect, it} from 'vitest'

import {formatScore, SCORE_DISPLAY_PRECISION} from './scores'

describe('formatScore', () => {
  it('renders a numeric score to the app-wide significant-figure precision', () => {
    expect(formatScore(1.23456)).toBe((1.23456).toPrecision(SCORE_DISPLAY_PRECISION))
    expect(formatScore(1.23456)).toBe('1.235')
    // Trailing zeros are kept — sig figs, not decimal places.
    expect(formatScore(-2)).toBe('-2.000')
    expect(formatScore(0)).toBe('0.000')
  })

  it('returns null for a non-numeric (NA/absent) score, so callers own the empty rendering', () => {
    expect(formatScore(null)).toBeNull()
    expect(formatScore(undefined)).toBeNull()
  })
})
