/**
 * Layout for the score strip: a small histogram of a score set's scores, shaded by one calibration's
 * ranges, with a marker at one variant's score. Positions are fractions of the plot width so the
 * component can draw at any size.
 */

import {
  chooseDefaultCalibration,
  functionalClassificationContainsVariant,
  type ScoreCalibration
} from '@/lib/calibrations'
import type {components} from '@/schema/openapi'

export type ScoreDistribution = components['schemas']['ScoreDistribution']

/** What a strip element is colored by: a calibration direction, or nothing. */
export type StripTone = 'abnormal' | 'normal' | 'neutral'

export interface StripBar {
  x0: number
  x1: number
  /** Count relative to the tallest bin; 0 for an empty bin. */
  height: number
  tone: StripTone
}

export interface StripRange {
  x0: number
  x1: number
  tone: Exclude<StripTone, 'neutral'>
}

export interface StripMarker {
  x: number
  tone: StripTone
  /** Which edge the score was clamped to when it fell outside the summary's range. */
  clamped: 'low' | 'high' | null
}

export interface ScoreStripLayout {
  /** Empty when there are too few scores for bars to describe a shape. */
  bars: StripBar[]
  ranges: StripRange[]
  marker: StripMarker | null
}

/** Below this many scores the bars are mostly noise, so the strip draws only the axis and marker. */
export const MIN_SCORES_FOR_BARS = 20

/** Ranges whose ends lie this close (as a fraction of the plot) count as touching; covers float noise in thresholds. */
const RANGE_JOIN_TOLERANCE = 1e-9

type Classification = NonNullable<ScoreCalibration['functionalClassifications']>[number]

function directionOf(classification: Classification): Exclude<StripTone, 'neutral'> | null {
  const direction = classification.functionalClassification
  return direction === 'abnormal' || direction === 'normal' ? direction : null
}

/** The direction of the first abnormal or normal range containing `score`, else neutral. */
function toneAt(score: number, classifications: Classification[]): StripTone {
  for (const classification of classifications) {
    const direction = directionOf(classification)
    if (direction && functionalClassificationContainsVariant(classification, score)) return direction
  }
  return 'neutral'
}

/**
 * Lays out a strip from a stored distribution summary, an optional calibration, and the variant's score.
 *
 * Range shading sits at the exact thresholds. A bar takes the tone of the range containing its center, so a
 * bin straddling a threshold shows one side's color while the shading and marker stay exact. A score outside
 * `[min, max]` means the summary is older than the scores; the marker is clamped to the edge and flagged.
 */
export function layoutScoreStrip(
  distribution: ScoreDistribution,
  calibration: Pick<ScoreCalibration, 'functionalClassifications'> | null,
  score: number | null
): ScoreStripLayout {
  // A summary of identical scores has no width; widen it so its single bin and the marker sit centered.
  const [low, high] =
    distribution.max > distribution.min
      ? [distribution.min, distribution.max]
      : [distribution.min - 0.5, distribution.max + 0.5]
  const span = high - low
  const position = (value: number) => Math.min(1, Math.max(0, (value - low) / span))
  const classifications = (calibration?.functionalClassifications ?? []).filter((c) => c.range && directionOf(c))

  // The strip shows direction, not evidence strength, so touching ranges of one direction (PS3 Strong next to
  // PS3 Moderate) shade as a single band. Drawn separately, their antialiased edges leave seams that read as gaps.
  const ranges: StripRange[] = []
  const spans = classifications
    .map((classification) => {
      const [lower, upper] = classification.range!
      return {
        x0: lower == null ? 0 : position(lower),
        x1: upper == null ? 1 : position(upper),
        tone: directionOf(classification)!
      }
    })
    .filter((span) => span.x1 > span.x0)
    .sort((a, b) => a.x0 - b.x0)
  for (const span of spans) {
    const previous = ranges[ranges.length - 1]
    if (previous && previous.tone === span.tone && span.x0 <= previous.x1 + RANGE_JOIN_TOLERANCE) {
      previous.x1 = Math.max(previous.x1, span.x1)
    } else {
      ranges.push(span)
    }
  }

  const total = distribution.counts.reduce((sum, count) => sum + count, 0)
  const tallest = Math.max(0, ...distribution.counts)
  const bars: StripBar[] = []
  if (total >= MIN_SCORES_FOR_BARS && tallest > 0) {
    const binCount = distribution.counts.length
    const binWidth = (distribution.max - distribution.min) / binCount
    if (binWidth > 0) {
      distribution.counts.forEach((count, index) => {
        const binLow = distribution.min + index * binWidth
        bars.push({
          x0: position(binLow),
          x1: position(binLow + binWidth),
          height: count / tallest,
          tone: toneAt(binLow + binWidth / 2, classifications)
        })
      })
    } else {
      // Every score is the same value: one bar, as wide as any other bin, at the center.
      const halfWidth = 0.5 / binCount
      bars.push({x0: 0.5 - halfWidth, x1: 0.5 + halfWidth, height: 1, tone: toneAt(distribution.min, classifications)})
    }
  }

  let marker: StripMarker | null = null
  if (score != null && Number.isFinite(score)) {
    const clamped = score < distribution.min ? 'low' : score > distribution.max ? 'high' : null
    if (clamped) {
      console.warn(
        `Score ${score} lies outside its score set's stored distribution [${distribution.min}, ${distribution.max}]; the summary is stale.`
      )
    }
    marker = {x: position(score), tone: toneAt(score, classifications), clamped}
  }

  return {bars, ranges, marker}
}

/**
 * The calibration a measurement row's strip shades by: the one that owns the row's displayed classification,
 * else the score set's default among calibrations that classify anything. A calibration with no classifications
 * (one that only records controls, for example) has nothing to shade. Calibrations come from the score set as
 * served to this viewer, so the strip never shades by one the viewer can't read.
 */
export function stripCalibration(
  classificationId: number | null | undefined,
  scoreCalibrations: ScoreCalibration[] | null | undefined
): ScoreCalibration | null {
  const owner =
    classificationId == null
      ? undefined
      : scoreCalibrations?.find((c) => c.functionalClassifications?.some((fc) => fc.id === classificationId))
  if (owner) return owner
  return chooseDefaultCalibration(scoreCalibrations?.filter((c) => (c.functionalClassifications?.length ?? 0) > 0))
}
