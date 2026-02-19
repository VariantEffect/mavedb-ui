import axios from 'axios'

import config from '@/config'
import {HistogramBin, HistogramShader} from '@/lib/histogram'
import {components} from '@/schema/openapi'

export type FunctionalClassificationVariants = components['schemas']['FunctionalClassificationVariants']
export type FunctionalClassificationVariant = components['schemas']['VariantEffectMeasurement']

export const NORMAL_RANGE_DEFAULT_COLOR = '#4444ff'
export const ABNORMAL_RANGE_DEFAULT_COLOR = '#ff4444'
export const NOT_SPECIFIED_RANGE_DEFAULT_COLOR = '#646464'

export const BENIGN_CRITERION = 'BS3'
export const PATHOGENIC_CRITERION = 'PS3'

export const EVIDENCE_STRENGTH_AS_POINTS = {
  VERY_STRONG: 8,
  STRONG: 4,
  MODERATE_PLUS: 3,
  MODERATE: 2,
  SUPPORTING: 1
}

export const INDETERMINATE_CALIBRATION_EVIDENCE = ['INDETERMINATE'] as const
export const EVIDENCE_STRENGTH = EVIDENCE_STRENGTH_AS_POINTS ? Object.keys(EVIDENCE_STRENGTH_AS_POINTS) : []
export const NORMAL_CALIBRATION_EVIDENCE = EVIDENCE_STRENGTH_AS_POINTS
  ? Object.keys(EVIDENCE_STRENGTH_AS_POINTS).map((key) => `${BENIGN_CRITERION}_${key}`)
  : []
export const ABNORMAL_CALIBRATION_EVIDENCE = EVIDENCE_STRENGTH_AS_POINTS
  ? Object.keys(EVIDENCE_STRENGTH_AS_POINTS).map((key) => `${PATHOGENIC_CRITERION}_${key}`)
  : []

export const EVIDENCE_STRENGTHS = EVIDENCE_STRENGTH_AS_POINTS
  ? Object.fromEntries(
      Object.entries(EVIDENCE_STRENGTH_AS_POINTS)
        .map(([key, value]) => [`${BENIGN_CRITERION}_${key}`, value * -1])
        .concat(
          Object.entries(EVIDENCE_STRENGTH_AS_POINTS).map(([key, value]) => [`${PATHOGENIC_CRITERION}_${key}`, value])
        )
    )
  : {}

export const EVIDENCE_STRENGTHS_REVERSED = Object.fromEntries(
  Object.entries(EVIDENCE_STRENGTHS).map(([key, value]) => [value, key])
)

/**
 * Prepares a list of histogram shader configuration objects from persisted score calibration data.
 *
 * Each functional range in the provided calibration is converted into a HistogramShader descriptor
 * containing:
 * - min / max: numeric bounds either taken directly from the `range` tuple or calculated from variant scores.
 * - title: resolved from the ACMG classification evidence strength (via `EVIDENCE_STRENGTHS_REVERSED`)
 *   when available; otherwise falls back to the range's `label`.
 * - color / thresholdColor: both derived from `getRangeColor(range)` to ensure visual consistency.
 * - align: fixed to `'center'` for consistent label placement.
 * - startOpacity / stopOpacity: fixed opacity values (0.15 → 0.05) establishing a subtle gradient.
 * - gradientUUID: explicitly initialized to `undefined` (allowing later lazy assignment if needed).
 *
 * The function is resilient to an empty `functionalClassifications` array and will return an empty list in that case.
 * The order of shaders in the output array matches the order of functional classifications in the input.
 *
 * If a functional classification lacks a defined range, it is skipped.
 *
 * Performance: O(n) where n = number of functional classifications.
 *
 * Immutability: Produces a new array; does not mutate the input object or its ranges.
 *
 * @param scoreCalibrations The persisted calibration object containing one or more functional classifications
 *                          plus optional ACMG classification metadata for each range.
 * @returns An array of HistogramShader objects ready for consumption by histogram rendering logic.
 *
 * @example
 * const shaders = prepareCalibrationsForHistogram(calibration);
 * // shaders[0].title might be derived from evidence strength or fall back to the provided label.
 *
 * @remarks
 * - This function assumes that variant scores are numeric and filters out any non-numeric or NaN values.
 * - The color derivation logic is centralized in `getRangeColor` to maintain consistency across the application.
 */
export function prepareCalibrationsForHistogram(
  scoreCalibrations: components['schemas']['ScoreCalibration']
): HistogramShader[] {
  const preparedCalibrations: HistogramShader[] = []

  if (!scoreCalibrations.functionalClassifications || scoreCalibrations.functionalClassifications.length === 0) {
    return preparedCalibrations
  }

  scoreCalibrations.functionalClassifications.forEach((classification) => {
    if (!classification.range) {
      return
    }

    const scoreClassification: HistogramShader = {
      min: classification.range[0],
      max: classification.range[1],
      title: classification.label,
      align: 'center',
      color: getRangeColor(classification),
      thresholdColor: getRangeColor(classification),
      startOpacity: 0.15,
      stopOpacity: 0.05,
      gradientUUID: undefined
    }

    preparedCalibrations.push(scoreClassification)
  })
  return preparedCalibrations
}

/**
 * Derives the display color associated with a functional range classification.
 *
 * The color returned depends on the `classification` property of the supplied
 * `functionalClassification` object:
 * - `'normal'`        => NORMAL_RANGE_DEFAULT_COLOR
 * - `'abnormal'`      => ABNORMAL_RANGE_DEFAULT_COLOR
 * - `'not_specified'` => NOT_SPECIFIED_RANGE_DEFAULT_COLOR
 * - any other value   => `'#000000'` (fallback)
 *
 * This utility centralizes the mapping logic so UI components can remain
 * agnostic of the underlying color constants.
 *
 * @param range The functional range whose `classification` determines the color.
 * @returns A hex color string representing the classification.
 * @example
 * const color = getRangeColor({ classification: 'normal' }); // e.g. '#3BAA5C'
 * @remarks If new classifications are introduced, extend this function to handle them explicitly.
 */
function getRangeColor(
  range: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
): string {
  if (range.functionalClassification === 'normal') {
    return NORMAL_RANGE_DEFAULT_COLOR
  } else if (range.functionalClassification === 'abnormal') {
    return ABNORMAL_RANGE_DEFAULT_COLOR
  } else if (range.functionalClassification === 'not_specified') {
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

/**
 * Determines whether a variant score falls within the specified functional range.
 *
 * @param functionalClassification - The functional range object containing min/max bounds and inclusivity flags
 * @param variantScore - The numeric score of the variant to check, or null if no score available
 * @returns True if the variant score is within the functional range bounds, false otherwise
 *
 * @remarks
 * - Returns false immediately if variantScore is null
 * - Handles open ranges where min or max can be null (unbounded)
 * - Respects inclusivity settings for both lower and upper bounds
 * - Lower bound check uses >= if inclusive, > if exclusive
 * - Upper bound check uses <= if inclusive, < if exclusive
 */
export function functionalClassificationContainsVariant(
  functionalClassification: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'],
  variantScore: number | null
): boolean {
  if (variantScore === null) {
    return false
  }

  if (!functionalClassification.range) {
    return false
  }

  const [min, max] = functionalClassification.range

  const lowerOk =
    min === null ? true : functionalClassification.inclusiveLowerBound ? variantScore >= min : variantScore > min
  const upperOk =
    max === null ? true : functionalClassification.inclusiveUpperBound ? variantScore <= max : variantScore < max

  return lowerOk && upperOk
}

/**
 * Fetches the full list of variants for a single functional classification in a score calibration.
 *
 * Uses the dedicated calibration variants endpoint introduced to replace embedded
 * `variants` payloads in calibration responses.
 *
 * @param calibrationUrn The score calibration URN.
 * @param classificationId The database ID of the functional classification.
 * @returns The classification ID and associated variant list.
 */
export async function fetchScoreCalibrationFunctionalClassificationVariants(
  calibrationUrn: string,
  classificationId: number
): Promise<FunctionalClassificationVariants> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(calibrationUrn)}/functional-classifications/${classificationId}/variants`
  )
  return response.data
}

/**
 * Fetches variant lists for all functional classifications in a score calibration.
 *
 * This is intended for views that need class membership across the full calibration
 * (for example, class-based histogram series generation).
 *
 * @param calibrationUrn The score calibration URN.
 * @returns An array of per-classification variant payloads.
 */
export async function fetchScoreCalibrationVariants(
  calibrationUrn: string
): Promise<FunctionalClassificationVariants[]> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(calibrationUrn)}/variants`
  )
  return response.data
}
