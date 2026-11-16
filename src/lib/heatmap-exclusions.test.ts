import {describe, expect, it} from 'vitest'

import {describeHeatmapExclusions, totalHeatmapExclusions, type HeatmapExclusionCounts} from '@/lib/heatmap-exclusions'

const none: HeatmapExclusionCounts = {
  unscored: 0,
  noCoordinate: 0,
  complex: 0,
  outOfRange: 0,
  startStopLoss: 0,
  noRow: 0
}

describe('describeHeatmapExclusions', () => {
  it('returns nothing when no variant is excluded', () => {
    expect(describeHeatmapExclusions(none, 'protein')).toEqual([])
    expect(totalHeatmapExclusions(none)).toBe(0)
  })

  it('lists only non-zero reasons, most common first', () => {
    const phrases = describeHeatmapExclusions({...none, unscored: 3, complex: 1200}, 'protein')
    expect(phrases).toEqual(['1,200 are too complex to plot (indels, multivariants)', '3 have no score'])
  })

  it('uses the singular for one variant and names the level', () => {
    expect(describeHeatmapExclusions({...none, noCoordinate: 1}, 'protein')).toEqual([
      '1 has no protein position in this view'
    ])
    expect(describeHeatmapExclusions({...none, noCoordinate: 2}, 'genomic')).toEqual([
      '2 have no genomic position in this view'
    ])
  })
})
