import type {ScoreCalibration} from '@/lib/calibrations'
import type {components} from '@/schema/openapi'
import type {KeySection} from '@/composables/use-key-drawer'
import type {SequenceLevel} from '@/composables/use-variant-coordinates'

export type MeasurementRelationship = components['schemas']['MeasurementRelationship']
type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type SavedFunctionalClassification = components['schemas']['SavedFunctionalClassification']

/**
 * The call a measurement row shows, flagged when it comes from a research-use-only calibration (only served when
 * the page asks for research-use-only calls). The API never ranks rows by such calls.
 */
export function displayedClassification(
  measurement: AlleleMeasurement
): {classification: SavedFunctionalClassification; researchUseOnly: boolean} | null {
  if (!measurement.classification) return null
  return {
    classification: measurement.classification,
    researchUseOnly: measurement.classificationIsResearchUseOnly ?? false
  }
}

/**
 * What a measurement row says about its variant: a classification's direction, or why there is none.
 * `unclassified` means a calibration exists but leaves this variant out; `uncalibrated` means the score set
 * has no calibration with classifications.
 */
export type MeasurementCall = 'abnormal' | 'normal' | 'not_specified' | 'unclassified' | 'uncalibrated'

/**
 * Display order, wording and tag styles for measurement calls, shared by the rows and the summary above them.
 * Directional calls take the classification tags' colors. The two kinds of no call get a dashed, unfilled tag,
 * so they don't read as the grey, filled Not Specified tag: that is a call, these are its absence.
 */
export const MEASUREMENT_CALLS: Record<MeasurementCall, {label: string; class: string}> = {
  abnormal: {label: 'Abnormal', class: 'mave-classification-abnormal'},
  normal: {label: 'Normal', class: 'mave-classification-normal'},
  not_specified: {label: 'Not specified', class: 'mave-classification-not_specified'},
  unclassified: {label: 'Unclassified', class: 'mave-tag-no-call'},
  uncalibrated: {label: 'Not calibrated', class: 'mave-tag-no-call'}
}

/**
 * The calibrations a measurement row may draw on: research-use-only ones only when the page shows research-use-only
 * calls, matching the API's `include_research_use_only`. Otherwise a row could shade by, or count as calibrated
 * through, a calibration whose call it doesn't show.
 */
export function eligibleCalibrations(
  scoreCalibrations: ScoreCalibration[] | null | undefined,
  includeResearchUseOnly: boolean
): ScoreCalibration[] {
  return (scoreCalibrations ?? []).filter((c) => includeResearchUseOnly || !c.researchUseOnly)
}

/**
 * The call a measurement row shows. Null while an unclassified row's score set is still loading, since only the
 * score set says whether a calibration exists.
 */
export function measurementCall(
  measurement: AlleleMeasurement,
  scoreCalibrations: ScoreCalibration[] | null | undefined,
  scoreSetLoaded: boolean
): MeasurementCall | null {
  const displayed = displayedClassification(measurement)
  if (displayed) {
    const direction = displayed.classification.functionalClassification
    return direction === 'abnormal' || direction === 'normal' ? direction : 'not_specified'
  }
  if (!scoreSetLoaded) return null
  const calibrated = (scoreCalibrations ?? []).some((c) => (c.functionalClassifications?.length ?? 0) > 0)
  return calibrated ? 'unclassified' : 'uncalibrated'
}

export interface MeasurementCallSummary {
  total: number
  /** Non-zero counts in {@link MEASUREMENT_CALLS} order. */
  counts: {call: MeasurementCall; count: number}[]
  /** Calls that come from a research-use-only calibration; counted within `counts` too. */
  researchUseOnlyCount: number
}

/**
 * Tallies the calls across a variant's measurements. Null until every row's call is known, so the line never
 * shows a count that is about to change.
 */
export function summarizeMeasurementCalls(
  measurements: AlleleMeasurement[],
  callOf: (measurement: AlleleMeasurement) => MeasurementCall | null
): MeasurementCallSummary | null {
  const tally = new Map<MeasurementCall, number>()
  let researchUseOnlyCount = 0
  for (const measurement of measurements) {
    const call = callOf(measurement)
    if (call == null) return null
    tally.set(call, (tally.get(call) ?? 0) + 1)
    if (displayedClassification(measurement)?.researchUseOnly) researchUseOnlyCount += 1
  }
  const counts = (Object.keys(MEASUREMENT_CALLS) as MeasurementCall[])
    .filter((call) => tally.has(call))
    .map((call) => ({call, count: tally.get(call)!}))
  return {total: measurements.length, counts, researchUseOnlyCount}
}

/**
 * A classification's ACMG evidence code, e.g. "PS3_MODERATE", or null when it carries no evidence strength. A
 * research-use-only call still follows the clinical rules, so its code is shown beside its RUO tag.
 */
export function evidenceCode(classification: SavedFunctionalClassification | null | undefined): string | null {
  const acmg = classification?.acmgClassification
  if (!acmg?.evidenceStrength) return null
  return `${acmg.criterion}_${acmg.evidenceStrength.toUpperCase()}`
}

/** "PS3_MODERATE_PLUS" reads as "PS3 Moderate+": criterion as written, strength in title case. */
export function formatEvidenceCode(code: string): string {
  const [first, ...rest] = code.toUpperCase().split('_')
  const titleCase = (word: string) => word.charAt(0) + word.slice(1).toLowerCase()
  if (!/^[PB]S\d/.test(first)) return [first, ...rest].map(titleCase).join(' ')
  const strength = rest
    .map(titleCase)
    .join(' ')
    .replace(/ Plus$/, '+')
  return strength ? `${first} ${strength}` : first
}

// The interface collapses the three sequence levels ('genomic' | 'cdna' | 'protein') to two assay-level
// buckets: the nucleotide levels (genomic + coding) share one; protein is 'amino acid'. The finer
// SequenceLevel stays available internally for logic — it just isn't surfaced as its own badge.
export type LevelBucket = 'nucleotide' | 'amino acid'

export function assayLevelBucket(level: string | null | undefined): LevelBucket {
  return level === 'protein' ? 'amino acid' : 'nucleotide'
}

/** The tag marking the page's own variant in the clinical table. */
export const YOUR_VARIANT_TAG = {label: 'Your variant', class: 'bg-subject/15 text-subject-strong'}

/** The tag marking the clinical-table row the selected measurement assayed; follows the selection, as its sage does. */
export const SELECTED_MEASUREMENT_TAG = {label: 'Selected measurement', class: 'bg-sage/25 text-sage-strong'}

/**
 * How a measured or listed variant relates to the page's variant, in the words of the measurement table's group
 * headers and the clinical table's separator. Covers both a nucleotide-change page and a protein-change page.
 */
export const RELATIONSHIP_KEY_SECTION: KeySection = {
  id: 'relationship',
  title: 'Relationship to your variant',
  gloss: 'How a measured or listed variant relates to the variant this page is about.',
  terms: [
    {
      label: YOUR_VARIANT_TAG.label,
      definition: 'The variant this page is about. A measurement of this exact change measured your variant directly.',
      class: YOUR_VARIANT_TAG.class
    },
    {
      label: SELECTED_MEASUREMENT_TAG.label,
      definition:
        'In the clinical table: the variant the measurement selected above actually assayed, or, for a protein-level measurement, the protein change every listed variant encodes. It moves as you select different measurements.',
      class: SELECTED_MEASUREMENT_TAG.class
    },
    {
      label: 'The protein change it encodes',
      definition:
        'A measurement of the protein change your nucleotide change encodes. It reflects the protein change, so nucleotide-level effects such as splicing may not be captured.'
    },
    {
      label: 'Encodes the same protein change',
      definition:
        'A different nucleotide change that encodes the same protein change as yours. A measurement of it stands in for yours, but may differ where the nucleotide change itself matters.'
    },
    {
      label: 'Encodes this protein change',
      definition:
        'On a protein-change page: a nucleotide change that encodes this protein change. A measurement of it can also include effects of the nucleotide change itself, such as splicing.'
    }
  ]
}

/**
 * Single source of truth for how an assay-level bucket appears in the UI — its label, color classes, and
 * Key-drawer gloss. Every level badge, pill, and the Key drawer's assay-level section derives from this,
 * so the vocabulary can never drift across surfaces.
 */
export const LEVEL_BUCKETS: Record<LevelBucket, {label: string; class: string; definition: string}> = {
  nucleotide: {
    label: 'Nucleotide',
    class: 'bg-nucleotide-light text-nucleotide',
    definition: 'Assayed as a nucleotide change.'
  },
  'amino acid': {
    label: 'Amino acid',
    class: 'bg-amino-acid-light text-amino-acid',
    definition: 'Assayed as an amino-acid change.'
  }
}

export const ASSAY_LEVEL_KEY_SECTION: KeySection = {
  id: 'assay-level',
  title: 'Assay level',
  gloss: 'The level at which a result measured the change.',
  terms: Object.values(LEVEL_BUCKETS).map((b) => ({label: b.label, definition: b.definition, class: b.class}))
}

/** The display label, color classes, and gloss for a raw SequenceLevel, collapsed to its bucket. */
export function assayLevelDisplay(level: string | null | undefined): (typeof LEVEL_BUCKETS)[LevelBucket] {
  return LEVEL_BUCKETS[assayLevelBucket(level)]
}

// A score set's variants are all assayed at one level, but some may be unmapped (null). Return the most
// common non-null level, or null when nothing is mapped.
export function dominantAssayLevel(levels: Array<SequenceLevel | null | undefined>): SequenceLevel | null {
  const counts = new Map<SequenceLevel, number>()
  for (const level of levels) {
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1)
  }
  let best: SequenceLevel | null = null
  let bestCount = 0
  for (const [level, count] of counts) {
    if (count > bestCount) {
      best = level
      bestCount = count
    }
  }
  return best
}
