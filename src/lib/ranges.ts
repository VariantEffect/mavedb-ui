import { HistogramBin, HistogramShader } from '@/lib/histogram'

export const NORMAL_RANGE_DEFAULT_COLOR = '#4444ff'
export const ABNORMAL_RANGE_DEFAULT_COLOR = '#ff4444'
export const NOT_SPECIFIED_RANGE_DEFAULT_COLOR = '#a6a600'

export const INDETERMINATE_RANGE_EVIDENCE = ['INDETERMINATE'] as const
export const NORMAL_RANGE_EVIDENCE = ['BS3_STRONG', 'BS3_MODERATE', 'BS3_SUPPORTING'] as const
export const ABNORMAL_RANGE_EVIDENCE = ['PS3_VERY_STRONG', 'PS3_STRONG', 'PS3_MODERATE', 'PS3_SUPPORTING'] as const
export const EVIDENCE_STRENGTHS = {
  BS3_STRONG: -4,
  BS3_MODERATE: -2,
  'BS3_MODERATE+': -3,
  BS3_SUPPORTING: -1,
  BS3_VERY_STRONG: -8,
  INDETERMINATE: 0,
  PS3_VERY_STRONG: 8,
  PS3_STRONG: 4,
  'PS3_MODERATE+': 3,
  PS3_MODERATE: 2,
  PS3_SUPPORTING: 1
}
export const EVIDENCE_STRENGTHS_REVERSED = Object.fromEntries(
  Object.entries(EVIDENCE_STRENGTHS).map(([key, value]) => [value, key])
)

export interface pillarProjectParameters {
  skew: number
  scale: number
  location: number
}

export interface pillarProjectParameterSet {
  functionallyAltering: pillarProjectParameters
  functionallyNormal: pillarProjectParameters
  fractionFunctionallyAltering: number
}

// There may be other keys defined in the future. They should still be added here explicitly,
// but we allow their implicit possibility as well.
export interface ScoreSetRanges {
  investigatorProvided: ScoreRanges
  pillarProject: ScoreRanges
  [key: string]: ScoreRanges
}

export interface ScoreRanges {
  title: string
  researchUseOnly: boolean
  baselineScore?: number
  baselineScoreDescription?: string | undefined
  oddsPathSource?: [{ identifier: string; dbName: string }] | undefined

  priorProbabilityPathogenicity?: number | undefined
  parameterSets?: Array<pillarProjectParameterSet>

  ranges: Array<ScoreRange>
  source?: [{ identifier: string; dbName: string }] | undefined
}

export interface ScoreRange {
  label: string
  description: string | undefined
  classification: 'normal' | 'abnormal' | 'not_specified'
  range: Array<number>
  oddsPath?:
  | {
    ratio: number
    evidence:
    | (typeof INDETERMINATE_RANGE_EVIDENCE)[number]
    | (typeof NORMAL_RANGE_EVIDENCE)[number]
    | (typeof ABNORMAL_RANGE_EVIDENCE)[number]
    | undefined
  }
  | undefined
  positiveLikelihoodRatio?: number | undefined
  evidenceStrength?: number | undefined
  inclusiveLowerBound: boolean
  inclusiveUpperBound: boolean
}

export function prepareRangesForHistogram(scoreRanges: ScoreRanges): HistogramShader[] {
  const preparedRanges: HistogramShader[] = []

  scoreRanges.ranges.forEach((range) => {
    const scoreRange: HistogramShader = {
      min: range.range[0],
      max: range.range[1],
      title: range.evidenceStrength ? EVIDENCE_STRENGTHS_REVERSED[range.evidenceStrength] : range.label,
      align: 'center',
      color: getRangeColor(range),
      thresholdColor: getRangeColor(range),
      startOpacity: 0.15,
      stopOpacity: 0.05,
      gradientUUID: undefined
    }

    preparedRanges.push(scoreRange)
  })
  return preparedRanges
}

function getRangeColor(range: ScoreRange): string {
  if (range.classification === 'normal') {
    return NORMAL_RANGE_DEFAULT_COLOR
  } else if (range.classification === 'abnormal') {
    return ABNORMAL_RANGE_DEFAULT_COLOR
  } else if (range.classification === 'not_specified') {
    return NOT_SPECIFIED_RANGE_DEFAULT_COLOR
  } else {
    return '#000000'
  }
}

/**
 * Determines whether a shader range overlaps a histogram bin.
 *
 * The comparison treats both the shader range and the bin as half-open intervals:
 * overlap requires that the shader's minimum be strictly less than the bin's
 * upper bound (x1) and the shader's maximum be strictly greater than the bin's
 * lower bound (x0). Consequently, a range that only "touches" a bin at the upper
 * boundary point (e.g., range.max === bin.x0) is NOT considered an overlap.
 *
 * Unspecified (undefined) range endpoints are treated as unbounded in that
 * direction (i.e., min defaults to -Infinity and max defaults to +Infinity),
 * allowing the function to represent half-unbounded or fully unbounded ranges.
 *
 * @param range - A HistogramShader object whose optional `min` and `max`
 * numeric properties define the (potentially unbounded) shader interval.
 * @param bin - A HistogramBin object with numeric `x0` (lower bound) and `x1`
 * (upper bound) defining the bin interval.
 * @returns True if the shader range and the bin have a non-empty half-open
 * intersection; false otherwise.
 *
 * @example
 * // Given a bin [0, 10) (conceptually) with x0 = 0, x1 = 10:
 * shaderOverlapsBin({ min: -5, max: 2 }, bin)    // true (overlaps lower part)
 * shaderOverlapsBin({ min: 10, max: 20 }, bin)   // true (touches at 10 only)
 * shaderOverlapsBin({ min: 0, max: 10 }, bin)    // true (spans the bin)
 * shaderOverlapsBin({ min: 10 }, bin)            // false (starts exactly at x1)
 * shaderOverlapsBin({ max: 0 }, bin)             // false (ends exactly at x0)
 * shaderOverlapsBin({}, bin)                     // true (unbounded overlaps)
 *
 * @remarks
 * Our HistogramBin objects don't currently have information on whether bounds are
 * inclusive or exclusive, so we treat them as strictly open intervals [x0, x1). This
 * is consistent with how the histogram bins are defined, but may be inconsistent with
 * the ranges themselves. Once we have that information, we may want to revisit this logic
 * to handle inclusive bounds properly.
 */
export function shaderOverlapsBin(range: HistogramShader, bin: HistogramBin): boolean {
  const rangeMin = range.min ?? -Infinity
  const rangeMax = range.max ?? Infinity

  return rangeMin < bin.x1 && rangeMax >= bin.x0
}
