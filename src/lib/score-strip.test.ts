import {afterEach, describe, expect, it, vi} from 'vitest'

import {layoutScoreStrip, MIN_SCORES_FOR_BARS, stripCalibration, type ScoreDistribution} from '@/lib/score-strip'
import type {ScoreCalibration} from '@/lib/calibrations'

/** 24 bins over [0, 24], so bin i spans [i, i + 1). */
const distribution = (counts: number[] = Array(24).fill(1), min = 0, max = 24): ScoreDistribution => ({
  version: 1,
  min,
  max,
  counts,
  nullCount: 0
})

const range = (
  id: number,
  functionalClassification: string,
  bounds: [number | null, number | null],
  inclusive: [boolean, boolean] = [true, false]
) =>
  ({
    id,
    label: functionalClassification,
    functionalClassification,
    range: bounds,
    inclusiveLowerBound: inclusive[0],
    inclusiveUpperBound: inclusive[1]
  }) as never

const calibration = (...functionalClassifications: never[]) =>
  ({functionalClassifications}) as unknown as ScoreCalibration

describe('layoutScoreStrip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scales bar heights to the tallest bin', () => {
    const counts = Array(24).fill(0)
    counts[0] = 10
    counts[5] = 40
    const {bars} = layoutScoreStrip(distribution(counts), null, null)

    expect(bars).toHaveLength(24)
    expect(bars[5].height).toBe(1)
    expect(bars[0].height).toBe(0.25)
    expect(bars[1].height).toBe(0)
    expect(bars[0].x0).toBe(0)
    expect(bars[23].x1).toBe(1)
  })

  it('shades ranges open at either end out to the plot edges', () => {
    const {ranges} = layoutScoreStrip(
      distribution(),
      calibration(range(1, 'abnormal', [null, 6]), range(2, 'normal', [18, null])),
      null
    )

    expect(ranges).toEqual([
      {x0: 0, x1: 0.25, tone: 'abnormal'},
      {x0: 0.75, x1: 1, tone: 'normal'}
    ])
  })

  it('merges touching ranges of one direction into a single band', () => {
    const {ranges} = layoutScoreStrip(
      distribution(),
      calibration(
        range(1, 'abnormal', [3, 6]),
        range(2, 'abnormal', [null, 3]),
        range(3, 'normal', [6, 12]),
        range(4, 'normal', [15, null])
      ),
      null
    )

    expect(ranges).toEqual([
      {x0: 0, x1: 0.25, tone: 'abnormal'},
      {x0: 0.25, x1: 0.5, tone: 'normal'},
      {x0: 0.625, x1: 1, tone: 'normal'}
    ])
  })

  it('leaves ranges without a direction unshaded', () => {
    const {ranges, bars} = layoutScoreStrip(distribution(), calibration(range(1, 'not_specified', [6, 18])), 12)

    expect(ranges).toEqual([])
    expect(bars.every((bar) => bar.tone === 'neutral')).toBe(true)
  })

  it('colors each bar by the range containing its center', () => {
    const {bars} = layoutScoreStrip(distribution(), calibration(range(1, 'abnormal', [null, 6.4])), null)

    expect(bars[5].tone).toBe('abnormal')
    // Bin [6, 7) straddles the threshold; its center 6.5 lies outside the range.
    expect(bars[6].tone).toBe('neutral')
  })

  it('places the marker and tones it by the range containing the score', () => {
    const {marker} = layoutScoreStrip(distribution(), calibration(range(1, 'abnormal', [null, 6])), 3)

    expect(marker).toEqual({x: 0.125, tone: 'abnormal', clamped: null})
  })

  it('respects range inclusivity at the marker', () => {
    const exclusive = calibration(range(1, 'abnormal', [null, 6], [false, false]))
    const inclusive = calibration(range(1, 'abnormal', [null, 6], [false, true]))

    expect(layoutScoreStrip(distribution(), exclusive, 6).marker?.tone).toBe('neutral')
    expect(layoutScoreStrip(distribution(), inclusive, 6).marker?.tone).toBe('abnormal')
  })

  it('clamps a score outside the summary to the plot edge and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(layoutScoreStrip(distribution(), null, -5).marker).toEqual({x: 0, tone: 'neutral', clamped: 'low'})
    expect(layoutScoreStrip(distribution(), null, 30).marker).toEqual({x: 1, tone: 'neutral', clamped: 'high'})
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('draws no bars for too few scores, but keeps the marker', () => {
    const counts = Array(24).fill(0)
    counts[3] = MIN_SCORES_FOR_BARS - 1
    const layout = layoutScoreStrip(distribution(counts), null, 3.5)

    expect(layout.bars).toEqual([])
    expect(layout.marker?.x).toBeCloseTo(3.5 / 24)
  })

  it('draws an empty distribution as an axis with no bars or marker', () => {
    expect(layoutScoreStrip(distribution(Array(24).fill(0)), null, null)).toEqual({bars: [], ranges: [], marker: null})
  })

  it('centers a distribution of identical scores', () => {
    const counts = Array(24).fill(0)
    counts[0] = 30
    const layout = layoutScoreStrip(distribution(counts, 2, 2), null, 2)

    expect(layout.bars).toHaveLength(1)
    expect((layout.bars[0].x0 + layout.bars[0].x1) / 2).toBeCloseTo(0.5)
    expect(layout.marker).toEqual({x: 0.5, tone: 'neutral', clamped: null})
  })
})

describe('stripCalibration', () => {
  const clinical = {
    ...calibration(range(1, 'abnormal', [null, 0])),
    title: 'clinical',
    primary: true
  } as ScoreCalibration
  const researchOnly = {
    ...calibration(range(2, 'abnormal', [null, 1])),
    title: 'ruo',
    researchUseOnly: true
  } as ScoreCalibration

  it('picks the calibration that owns the displayed classification', () => {
    expect(stripCalibration(2, [clinical, researchOnly])?.title).toBe('ruo')
  })

  it('falls back to the default calibration when the classification is not found or absent', () => {
    expect(stripCalibration(99, [researchOnly, clinical])?.title).toBe('clinical')
    expect(stripCalibration(null, [researchOnly, clinical])?.title).toBe('clinical')
  })

  it('skips calibrations without classifications when falling back', () => {
    const empty = {functionalClassifications: [], title: 'empty', primary: true} as unknown as ScoreCalibration

    expect(stripCalibration(null, [empty, researchOnly])?.title).toBe('ruo')
    expect(stripCalibration(null, [empty])).toBeNull()
  })

  it('returns null without calibrations', () => {
    expect(stripCalibration(1, null)).toBeNull()
  })
})
