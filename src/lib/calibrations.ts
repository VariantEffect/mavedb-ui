/**
 * @fileoverview
 * Calibration utilities for score interpretation and histogram visualization.
 */

import axios from 'axios'
import {cloneDeep} from 'lodash'
import Papa from 'papaparse'

import {createScoreCalibration, updateScoreCalibration} from '@/api/mavedb'
import type {CalibrationControlStatus} from '@/lib/calibration-controls'
import type {DraftScoreCalibration} from '@/lib/calibration-types'
import {formatDate} from '@/lib/formats'
import {FUNCTIONAL_CLASSIFICATIONS, type FunctionalClassification} from '@/lib/functional-impact'
import {HistogramBin, HistogramShader} from '@/lib/histogram'
import {components} from '@/schema/openapi'

export type ScoreCalibration = components['schemas']['ScoreCalibration']
export type ScoreCalibrationFunctionalClassification =
  components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
export type FunctionalClassificationVariants = components['schemas']['FunctionalClassificationVariants']
export type FunctionalClassificationVariant = components['schemas']['VariantEffectMeasurement']

/**
 * Prepares a list of histogram shader configuration objects from persisted score calibration data.
 *
 * Each functional range in the provided calibration is converted into a HistogramShader descriptor
 * containing:
 * - min / max: numeric bounds either taken directly from the `range` tuple or calculated from variant scores.
 * - title: the range's `label`.
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
export function prepareCalibrationsForHistogram(scoreCalibrations: ScoreCalibration): HistogramShader[] {
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
      color: getClassificationColor(classification),
      thresholdColor: getClassificationColor(classification),
      startOpacity: 0.15,
      stopOpacity: 0.05,
      gradientUUID: undefined
    }

    preparedCalibrations.push(scoreClassification)
  })
  return preparedCalibrations
}

/**
 * Derives the histogram range-fill color for a functional range from the shared functional-impact
 * vocabulary (keyed by its `functionalClassification`). Falls back to black for an unknown value.
 */
export function getClassificationColor(range: ScoreCalibrationFunctionalClassification): string {
  return FUNCTIONAL_CLASSIFICATIONS[range.functionalClassification as FunctionalClassification]?.rangeColor ?? '#000000'
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
  functionalClassification: ScoreCalibrationFunctionalClassification,
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

/** Per-range tally of the controls the calibration files under that range. */
export interface RangeControlTally {
  pathogenic: number
  benign: number
}

/**
 * A calibration's controls placed into its own ranges, plus the totals that summarize how well those
 * placements agree with each control's clinical status.
 *
 * Placement is per range rather than per abnormal/normal band: a calibration commonly carries several
 * ranges of the same classification (PS3_strong, PS3_moderate, ...), and which one a control lands in
 * is still informative. Concordance re-aggregates across them for the headline figure.
 */
export interface ControlPlacements {
  /**
   * Tally per range, keyed by the range object itself so callers may sort or chunk their ranges
   * freely. Every range passed in is present, so lookups never miss.
   */
  byRange: Map<ScoreCalibrationFunctionalClassification, RangeControlTally>
  pathogenicTotal: number
  benignTotal: number
  /** Controls landing in a range whose classification matches their clinical status. */
  concordant: number
  /** Controls landing in a range whose classification contradicts their clinical status. */
  discordant: number
  /** Controls landing in a range that carries no abnormal/normal classification. */
  unclassified: number
  /** Controls the calibration files under none of its ranges. */
  unplaced: number
  /** Controls that landed in some range — the sum of every per-range tally. */
  placedTotal: number
}

/**
 * Places a calibration's controls into its ranges from each control's server-resolved placement, and
 * tallies how well those placements agree with the controls' clinical status.
 *
 * `functionalClassificationId` is the range the calibration files a control's variant under, resolved
 * server-side from stored bin membership (see `SavedCalibrationControl`). It covers class-based
 * calibrations too, where a range is a named class from the author's uploaded file with no numeric
 * interval to test a score against.
 *
 * Controls whose `functionalClassificationId` is null, or names a range this calibration does not
 * carry, are counted as `unplaced` — the calibration files them under none of its ranges.
 *
 * Performance: O(controls), plus one pass over the ranges to index them by id.
 */
export function buildControlPlacements(
  controls: {clinicalStatus: CalibrationControlStatus; functionalClassificationId?: number | null}[] | null | undefined,
  functionalClassifications: ScoreCalibrationFunctionalClassification[] | null | undefined
): ControlPlacements {
  const ranges = functionalClassifications ?? []
  const byRange = new Map<ScoreCalibrationFunctionalClassification, RangeControlTally>()
  const rangeById = new Map<number, ScoreCalibrationFunctionalClassification>()
  for (const range of ranges) {
    byRange.set(range, {pathogenic: 0, benign: 0})
    if (range.id != null) {
      rangeById.set(range.id, range)
    }
  }

  const placements: ControlPlacements = {
    byRange,
    pathogenicTotal: 0,
    benignTotal: 0,
    concordant: 0,
    discordant: 0,
    unclassified: 0,
    unplaced: 0,
    placedTotal: 0
  }

  for (const control of controls ?? []) {
    if (control.clinicalStatus === 'pathogenic') {
      placements.pathogenicTotal++
    } else if (control.clinicalStatus === 'benign') {
      placements.benignTotal++
    } else {
      continue
    }

    const classificationId = control.functionalClassificationId
    const range = classificationId == null ? undefined : rangeById.get(classificationId)
    if (!range) {
      placements.unplaced++
      continue
    }

    byRange.get(range)![control.clinicalStatus]++
    placements.placedTotal++

    const classification = range.functionalClassification
    if (classification === 'abnormal' || classification === 'normal') {
      // Pathogenic agrees with abnormal, benign with normal; the other two pairings contradict.
      if ((control.clinicalStatus === 'pathogenic') === (classification === 'abnormal')) {
        placements.concordant++
      } else {
        placements.discordant++
      }
    } else {
      placements.unclassified++
    }
  }

  return placements
}

/**
 * Checks if a score set has any calibrations with functional classifications that have evidence strengths.
 * This is used to determine if pathogenicity annotations are available for variants in the score set.
 *
 * @param scoreCalibrations - Array of score calibrations from a score set
 * @returns True if any calibration has at least one functional classification with an evidence strength
 */
export function hasPathogenicityCalibrations(
  scoreSet: {scoreCalibrations?: ScoreCalibration[] | null} | null | undefined,
  {excludeResearchUseOnly = true}: {excludeResearchUseOnly?: boolean} = {}
): boolean {
  const scoreCalibrations = scoreSet?.scoreCalibrations
  if (!scoreCalibrations || scoreCalibrations.length === 0) {
    return false
  }

  return scoreCalibrations.some(
    (cal) =>
      !cal.hasPublishedReplacement &&
      !(excludeResearchUseOnly && cal.researchUseOnly) &&
      cal.functionalClassifications &&
      Array.isArray(cal.functionalClassifications) &&
      cal.functionalClassifications.some((funcCal) => funcCal.acmgClassification)
  )
}

/**
 * Checks if a score set has any calibrations with functional classifications.
 * This is used to determine if functional impact annotations are available for variants in the score set.
 *
 * @param scoreCalibrations - Array of score calibrations from a score set
 * @returns True if any calibration has at least one functional classification
 */
export function hasFunctionalCalibrations(
  scoreSet: {scoreCalibrations?: ScoreCalibration[] | null} | null | undefined,
  {excludeResearchUseOnly = true}: {excludeResearchUseOnly?: boolean} = {}
): boolean {
  const scoreCalibrations = scoreSet?.scoreCalibrations
  if (!scoreCalibrations || scoreCalibrations.length === 0) {
    return false
  }

  return scoreCalibrations.some(
    (cal) =>
      !cal.hasPublishedReplacement &&
      !(excludeResearchUseOnly && cal.researchUseOnly) &&
      cal.functionalClassifications &&
      Array.isArray(cal.functionalClassifications) &&
      cal.functionalClassifications.length > 0
  )
}

/**
 * Returns the primary calibration for a score set — the one marked `primary`, or
 * failing that, the one marked `investigatorProvided`. Returns null if neither exists.
 */
export function getPrimaryCalibration(
  scoreSet: {scoreCalibrations?: ScoreCalibration[] | null} | null | undefined
): ScoreCalibration | null {
  const calibrations = scoreSet?.scoreCalibrations?.filter((calibration) => !calibration.hasPublishedReplacement)
  if (!calibrations || calibrations.length === 0) return null
  return calibrations.find((c) => c.primary) || calibrations.find((c) => c.investigatorProvided) || null
}

/** Whether a calibration classifies by class membership rather than by score range. */
export function isClassBasedCalibration(
  calibration: Partial<Pick<ScoreCalibration, 'functionalClassifications'>>
): boolean {
  const fcs = calibration.functionalClassifications
  return !!fcs && fcs.length > 0 && fcs.every((fc) => fc.class != null)
}

/**
 * The display-only label for a variant a calibration leaves unclassified. Not a classification: it must not be
 * shown as a classification tag or treated as an indeterminate call.
 */
export function unclassifiedCallLabel(
  calibration: Partial<Pick<ScoreCalibration, 'functionalClassifications'>>
): string {
  return isClassBasedCalibration(calibration) ? 'Not in a calibrated class' : 'Outside calibrated ranges'
}

/**
 * A score set's calibrations in calibration-picker order. Each version thread stays together, its head first and
 * its other versions after in chain order. Threads order by their head: primary, then clinical-grade, then
 * research-use-only, alphabetical by title within each tier. Returns a new array.
 */
export function orderCalibrationOptions(scoreCalibrations: ScoreCalibration[] | null | undefined): ScoreCalibration[] {
  // A head is superseded only when its replacement wasn't listed, which leaves it nothing to sit under.
  const tier = (c: ScoreCalibration) => (c.hasPublishedReplacement ? 3 : c.primary ? 0 : c.researchUseOnly ? 2 : 1)
  return groupCalibrationVersions(scoreCalibrations)
    .sort((a, b) => tier(a.head) - tier(b.head) || (a.head.title ?? '').localeCompare(b.head.title ?? ''))
    .flatMap((thread) => [thread.head, ...thread.versions.filter((version) => version !== thread.head)])
}

/**
 * Picks the calibration to show by default: primary, else investigator-provided, else the first
 * non-research-use-only, else any with functional classifications, else the first. Depends only on the
 * score set's calibrations (not on variant scores), so it can resolve on the fast path.
 */
export function chooseDefaultCalibration(
  scoreCalibrations: ScoreCalibration[] | null | undefined
): ScoreCalibration | null {
  scoreCalibrations = scoreCalibrations?.filter((calibration) => !calibration.hasPublishedReplacement)
  if (!scoreCalibrations || scoreCalibrations.length === 0) return null
  return (
    scoreCalibrations.find((c) => c.primary === true) ||
    scoreCalibrations.find((c) => c.investigatorProvided === true) ||
    scoreCalibrations.find((c) => c.researchUseOnly !== true) ||
    scoreCalibrations.find((c) => (c.functionalClassifications?.length ?? 0) > 0) ||
    scoreCalibrations[0] ||
    null
  )
}

/**
 * Finds a functional classification by type (e.g. 'normal', 'abnormal') from a calibration's
 * classifications list. Returns null if not found.
 */
export function findClassificationByType(
  calibration: ScoreCalibration | null | undefined,
  type: string
): ScoreCalibrationFunctionalClassification | null {
  return calibration?.functionalClassifications?.find((r) => r.functionalClassification === type) || null
}

/**
 * Returns the formatted OddsPath ratio string for a given classification type from a calibration,
 * or null if not available. Uses the specified precision (default 2).
 */
export function getClassificationOddsPath(
  calibration: ScoreCalibration | null | undefined,
  type: string,
  precision: number = 2
): string | null {
  const range = findClassificationByType(calibration, type)
  return range?.oddspathsRatio != null ? range.oddspathsRatio.toFixed(precision) : null
}

/** A calibration create or update payload, as built from an editor draft. */
export type CalibrationPayload = Omit<DraftScoreCalibration, 'disease' | 'controls' | 'controlsCount'> & {
  disease: string | null
  controls?: components['schemas']['CalibrationControlCreate'][]
}

/** Another version of a calibration, as its table names it. */
export interface CalibrationVersionLink {
  urn: string
  label: 'Previous version' | 'Superseded by' | 'Draft new version'
  /** Null when the other version isn't among the calibrations the caller was given. */
  calibration: ScoreCalibration | null
}

/**
 * The versions a calibration links to: the one it replaced, and the one replacing it. The api names a draft
 * replacement only to users who may read it, and a draft supersedes nothing until it's published.
 *
 * @param calibration - The calibration whose versions to list.
 * @param related - The score set's calibrations, where every version of `calibration` the caller may read lives.
 */
export function calibrationVersionLinks(
  calibration: ScoreCalibration,
  related: ScoreCalibration[] | null | undefined
): CalibrationVersionLink[] {
  const find = (urn: string) => related?.find((c) => c.urn === urn) ?? null
  const links: CalibrationVersionLink[] = []
  if (calibration.supersededCalibrationUrn) {
    const urn = calibration.supersededCalibrationUrn
    links.push({urn, label: 'Previous version', calibration: find(urn)})
  }
  if (calibration.supersedingCalibrationUrn) {
    const urn = calibration.supersedingCalibrationUrn
    const label = calibration.hasPublishedReplacement ? 'Superseded by' : 'Draft new version'
    links.push({urn, label, calibration: find(urn)})
  }
  return links
}

/**
 * Whether a calibration has a replacement, draft or published, that the caller can see. The api names a draft
 * replacement only to users who may read it, so a draft the caller can't see doesn't count.
 *
 * @param calibration - The calibration to check.
 * @param related - The score set's calibrations, where a draft replacement the caller may read would be listed.
 */
export function calibrationHasReplacement(
  calibration: ScoreCalibration,
  related: ScoreCalibration[] | null | undefined
): boolean {
  return (
    !!calibration.supersedingCalibrationUrn ||
    !!calibration.hasPublishedReplacement ||
    !!related?.some((c) => c.supersededCalibrationUrn === calibration.urn)
  )
}

/**
 * Why the api would refuse to delete a calibration, or null if it wouldn't. Deleting a published version or a
 * calibration with a replacement would break its version history; a primary calibration must be demoted first.
 *
 * @param calibration - The calibration to delete.
 * @param related - The score set's calibrations.
 */
export function calibrationDeleteBlocker(
  calibration: ScoreCalibration,
  related: ScoreCalibration[] | null | undefined
): string | null {
  if (calibration.primary) return 'Demote it to non-primary first.'
  if (calibration.supersededCalibrationUrn && !calibration.private) return 'Published versions are kept.'
  if (calibrationHasReplacement(calibration, related)) return 'Calibrations with a newer version are kept.'
  return null
}

/** A calibration's place in its version history, for telling versions with the same title apart. */
export function calibrationVersionStatus(calibration: ScoreCalibration): 'Draft' | 'Superseded' | 'Published' {
  if (calibration.private) return 'Draft'
  return calibration.hasPublishedReplacement ? 'Superseded' : 'Published'
}

/**
 * A calibration's status and date, for telling versions with the same title apart: "Superseded · published Oct 27,
 * 2026". A published version is dated by publication. A draft, and a version published before MaveDB recorded
 * publication times, is dated by creation, and says so.
 */
export function calibrationVersionSummary(calibration: ScoreCalibration): string {
  const status = calibrationVersionStatus(calibration)
  if (!calibration.publishedDate) return `${status} · created ${formatDate(calibration.creationDate)}`
  const date = formatDate(calibration.publishedDate)
  return status === 'Published' ? `${status} · ${date}` : `${status} · published ${date}`
}

/** A calibration and the other versions in its chain, listed together. */
export interface CalibrationThread {
  /** The newest published version, or the draft when the chain has nothing published. */
  head: ScoreCalibration
  /** Every version in chain order, oldest first. A draft replacement is always last. */
  versions: ScoreCalibration[]
}

/**
 * Group calibrations into their version chains. A version whose predecessor isn't among `calibrations` starts its
 * own thread.
 */
export function groupCalibrationVersions(calibrations: ScoreCalibration[] | null | undefined): CalibrationThread[] {
  const list = calibrations ?? []
  const urns = new Set(list.map((c) => c.urn))
  const successors = new Map<string, ScoreCalibration>()
  for (const calibration of list) {
    if (calibration.supersededCalibrationUrn && urns.has(calibration.supersededCalibrationUrn)) {
      successors.set(calibration.supersededCalibrationUrn, calibration)
    }
  }
  return list
    .filter((c) => !c.supersededCalibrationUrn || !urns.has(c.supersededCalibrationUrn))
    .map((root) => {
      const versions = [root]
      for (let next = successors.get(root.urn); next; next = successors.get(next.urn)) versions.push(next)
      const head = [...versions].reverse().find((v) => !v.private) ?? versions[versions.length - 1]
      return {head, versions}
    })
}

/** Version numbers by URN, counted along each chain from 1, for calibrations with more than one version. */
export function calibrationVersionNumbers(threads: CalibrationThread[]): Record<string, number> {
  const numbers: Record<string, number> = {}
  for (const thread of threads) {
    if (thread.versions.length > 1) thread.versions.forEach((version, i) => (numbers[version.urn] = i + 1))
  }
  return numbers
}

/** Where a calibration falls in the default list order: primary, investigator, community, research use, draft. */
export function calibrationListRank(calibration: ScoreCalibration): number {
  if (calibration.primary) return 0
  if (calibration.private) return 4
  if (calibration.researchUseOnly) return 3
  if (calibration.investigatorProvided) return 1
  return 2 // community
}

type SortValue = string | number | boolean | null | undefined

function compareSortValues(a: SortValue, b: SortValue): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  return Number(a) - Number(b)
}

/**
 * Order threads as units, by their heads. With a `sortValue`, heads compare by it in `order` (1 ascending, -1
 * descending); ties, and the order without one, fall back to the default rank, then title, then creation date.
 */
export function orderCalibrationThreads(
  threads: CalibrationThread[],
  sortValue?: ((calibration: ScoreCalibration) => SortValue) | null,
  order: number = 1
): CalibrationThread[] {
  const byDefault = (a: ScoreCalibration, b: ScoreCalibration) =>
    calibrationListRank(a) - calibrationListRank(b) ||
    (a.title ?? '').localeCompare(b.title ?? '') ||
    (a.creationDate ?? '').localeCompare(b.creationDate ?? '')
  return [...threads].sort(
    (a, b) =>
      (sortValue ? compareSortValues(sortValue(a.head), sortValue(b.head)) * order : 0) || byDefault(a.head, b.head)
  )
}

export function prepareCalibrationVersion(calibration: DraftScoreCalibration): DraftScoreCalibration {
  return {
    ...cloneDeep(calibration),
    urn: null,
    supersededCalibrationUrn: calibration.urn,
    supersedingCalibrationUrn: null,
    hasPublishedReplacement: false,
    private: true,
    primary: false,
    controlsNotPhi: calibration.controls?.length ? null : calibration.controlsNotPhi
  }
}

export function calibrationClassesCsv(
  calibration: ScoreCalibration,
  memberships: FunctionalClassificationVariants[]
): string {
  const rows = memberships.flatMap((membership) => {
    const classification = calibration.functionalClassifications?.find(
      (item) => item.id === membership.functionalClassificationId
    )
    return (membership.variants ?? []).map((variant) => ({
      variant_urn: variant.urn,
      class_name: classification?.class
    }))
  })
  return Papa.unparse({fields: ['variant_urn', 'class_name'], data: rows})
}

/**
 * Converts a calibration editor draft into a calibration write payload.
 *
 * Drops editor-only fields and sends the disease as its bare MONDO code: the editor holds it as a
 * {code, label} selection, and null resolves to the generic disease server-side. The loaded `controls` are
 * SavedCalibrationControl rows, never a write payload, so they are always omitted.
 *
 * @param draft - The calibration draft held by the editor.
 * @returns A payload for a calibration create or update request.
 */
export function toCalibrationPayload(draft: DraftScoreCalibration & {__original?: unknown}): CalibrationPayload {
  const {__original: _original, controls: _controls, controlsCount: _controlsCount, disease, ...payload} = draft
  return {...payload, disease: disease?.code ?? null}
}

export type CalibrationSaveResult =
  | {success: true; data: any}
  | {success: false; error: 'email_required'}
  | {success: false; error: 'validation'; validationErrors: Record<string, string>}
  | {success: false; error: 'generic'; message: string}
  | {success: false; error: 'unknown'; raw: unknown}

/**
 * Saves (creates or updates) a score calibration via the API.
 *
 * Builds a multipart FormData payload and issues a POST (create) or PUT (update)
 * request. Returns a discriminated union describing the outcome so callers can
 * handle UI concerns (toasts, editor state) independently.
 *
 * @param params.draft - The calibration draft object to serialize as JSON.
 * @param params.classesFile - Optional CSV file for class-based calibrations.
 * @param params.controlsFile - Optional controls CSV; when present it replaces the calibration's
 *                              controls, so the inline `controls` field is omitted to avoid the
 *                              backend's inline-and-file conflict (422).
 * @param params.controlsCleared - When true (and no controls file is supplied), sends an empty
 *                                 controls list to clear all controls.
 * @param params.existingUrn - When provided the request becomes a PUT (update);
 *                             omit for a new calibration (POST).
 */
export async function saveCalibration(params: {
  draft: DraftScoreCalibration & {__original?: unknown}
  classesFile?: File | null
  controlsFile?: File | null
  controlsCleared?: boolean
  existingUrn?: string
}): Promise<CalibrationSaveResult> {
  const {draft, classesFile, controlsFile, controlsCleared, existingUrn} = params

  // Controls are conveyed via file, cleared to an empty list, or left unchanged (omitted).
  const payload = toCalibrationPayload(draft)
  if (!existingUrn && draft.supersededCalibrationUrn && !controlsFile) {
    payload.controls = (draft.controls ?? []).map((control) => ({
      variantUrn: control.variantUrn,
      clinicalStatus: control.clinicalStatus
    }))
  }
  if (!controlsFile && controlsCleared) {
    payload.controls = []
  }

  const formData = new FormData()
  formData.append('calibration_json', JSON.stringify(payload))
  if (classesFile) {
    formData.append('classes_file', classesFile)
  }
  if (controlsFile) {
    formData.append('controls_file', controlsFile)
  }

  try {
    const data = existingUrn
      ? await updateScoreCalibration(existingUrn, formData)
      : await createScoreCalibration(formData)

    return {success: true, data}
  } catch (error: unknown) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 403 &&
      typeof error.response?.data?.detail === 'string' &&
      error.response.data.detail.toLowerCase().includes('email')
    ) {
      return {success: false, error: 'email_required'}
    }

    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      const detail = error.response.data.detail

      if (typeof detail === 'string' || detail instanceof String) {
        return {success: false, error: 'generic', message: detail as string}
      }

      const validationErrors: Record<string, string> = {}
      for (const err of detail) {
        let path = err.loc
        if (path[0] === 'body') {
          path = path.slice(1)
        }

        let customPath = err.ctx?.error?.custom_loc
        if (customPath) {
          if (customPath[0] === 'body') {
            customPath = customPath.slice(1)
          }
          path = path.concat(customPath)
        }

        validationErrors[path.join('.')] = err.msg
      }
      return {success: false, error: 'validation', validationErrors}
    }

    return {success: false, error: 'unknown', raw: error}
  }
}
