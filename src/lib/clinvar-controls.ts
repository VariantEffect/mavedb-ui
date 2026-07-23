import type {KeySection} from '@/composables/use-key-drawer'
import {type SubjectDigest, toSubjectDigestSet} from '@/lib/annotation-subject'
import {hgvsLabelRank} from '@/lib/formats'
import type {components} from '@/schema/openapi'

export type ClinvarControlOption = components['schemas']['ClinicalControlOptions']
export type ClinvarVariantLink = components['schemas']['ClinvarVariantLink']
export type ClinvarControl = components['schemas']['ClinicalControlWithClinvarLinks']

/** Key-drawer glossary for the ClinVar clinical-significance buckets this module classifies into. */
export const CLINICAL_SIGNIFICANCE_KEY_SECTION: KeySection = {
  id: 'clinical',
  title: 'Clinical significance (ClinVar)',
  gloss: 'Germline classifications, shown with their ClinVar review-star rating.',
  terms: [
    {label: 'Pathogenic / Likely pathogenic', definition: 'Classified as disease-causing, or likely to be.'},
    {label: 'Benign / Likely benign', definition: 'Classified as not disease-causing, or likely not to be.'},
    {label: 'VUS', definition: 'Variant of uncertain significance — not enough evidence to classify.'},
    {label: 'Conflicting', definition: 'Submitters disagree on the classification.'}
  ]
}

/** Key-drawer glossary for sibling-allele ClinVar controls (calls carried over from a sibling allele). */
export const SIBLING_CONTROL_KEY_SECTION: KeySection = {
  id: 'passthrough',
  title: 'Sibling-allele controls',
  terms: [
    {
      label: 'From a sibling allele',
      definition:
        'A ClinVar call carried over from a sibling allele that shares the protein consequence, shown when the assayed variant itself has no ClinVar record. Marked with *.'
    }
  ]
}

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type ClinvarAnnotation = components['schemas']['ClinvarAnnotation']

/**
 * List of ClinVar clinical significance classifications.
 *
 * Each classification contains:
 * - `name`: The full name of the clinical significance (e.g., "Pathogenic").
 * - `description`: A detailed description of the classification.
 * - `shortDescription`: An abbreviated or short label for the classification.
 *
 * These classifications are used to describe the clinical significance of variants
 * according to ClinVar standards, including categories such as "Pathogenic", "Likely pathogenic",
 * "Benign", "Likely benign", "Uncertain significance", and combinations thereof.
 *
 * NOTE: The "Conflicting" classification is dynamically generated based on the version of ClinVar,
 * as the terminology changed in 2025. The function `clinvarConflictingSignificanceClassification`
 * adjusts the label accordingly provided a ClinVar version.
 */
export const CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [
  {
    name: 'Pathogenic',
    description: 'Pathogenic variant',
    shortDescription: 'Pathogenic'
  },
  {
    name: 'Likely pathogenic',
    description: 'Likely pathogenic variant',
    shortDescription: 'LP'
  },
  {
    name: 'Pathogenic/Likely pathogenic',
    description: 'Pathogenic/Likely pathogenic variant (in different submissions)',
    shortDescription: 'Pathogenic / Likely pathogenic'
  },
  {
    name: 'Benign',
    description: 'Benign variant',
    shortDescription: 'Benign'
  },
  {
    name: 'Likely benign',
    description: 'Likely benign variant',
    shortDescription: 'LB'
  },
  {
    name: 'Benign/Likely benign',
    description: 'Benign/Likely benign variant (in different submissions)',
    shortDescription: 'Benign / Likely benign'
  },
  {
    name: 'Uncertain significance',
    description: 'Variant of uncertain significance',
    shortDescription: 'VUS'
  }
]

export const BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely benign', 'Benign', 'Benign/Likely benign']

export const PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [
  'Likely pathogenic',
  'Pathogenic',
  'Pathogenic/Likely pathogenic'
]

export const CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [
  'Conflicting interpretations of pathogenicity',
  'Conflicting classifications of pathogenicity'
]

export const UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS = ['Uncertain significance']

export const CLINVAR_REVIEW_STATUS_STARS: {[status: string]: number} = {
  'no assertion criteria provided': 0,
  'criteria provided, conflicting interpretations': 1,
  'criteria provided, conflicting classifications': 1,
  'criteria provided, single submitter': 1,
  'criteria provided, multiple submitters, no conflicts': 2,
  'reviewed by expert panel': 3,
  'practice guideline': 4
}

export const DEFAULT_CLNSIG_FIELD = 'clinicalSignificance'
export const DEFAULT_CLNREVSTAT_FIELD = 'clinicalReviewStatus'

export const DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [
  'Likely pathogenic',
  'Pathogenic',
  'Pathogenic/Likely pathogenic',
  'Likely benign',
  'Benign',
  'Benign/Likely benign'
]
export const DEFAULT_MIN_STAR_RATING = 1

export const DEFAULT_CLINVAR_CONTROL_DB = 'ClinVar'

/** Germline-less (`-`) ClinVar records carry no call; renderers show this instead of a bare dash. */
export const NO_GERMLINE_CLASSIFICATION_LABEL = 'No germline classification'

/** Turn a ClinVar `dbVersion` like `03_2024` into "March 2024"; pass through anything unrecognized. */
export function formatClinvarVersion(dbVersion: string): string {
  const match = dbVersion.match(/^(\d{2})_(\d{4})$/)
  if (!match) return dbVersion
  const [, month, year] = match
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {month: 'long', year: 'numeric'})
}

/**
 * A comparable sort key for a ClinVar `dbVersion` in `MM_YYYY` form, ordering by year then month — the
 * frontend mirror of the API's `clinvar_version_sort_key`. `MM_YYYY` must NOT be compared as a raw string
 * (month-first, so `"12_2020" > "01_2024"`); this parses it. Unrecognized versions sort to the bottom (`-1`).
 */
export function clinvarVersionKey(dbVersion: string): number {
  const match = dbVersion.match(/^(\d{2})_(\d{4})$/)
  if (!match) return -1
  const [, month, year] = match
  return Number(year) * 100 + Number(month)
}

/** Deep link to a ClinVar allele record, or null when the allele id is missing. */
function clinvarAlleleUrl(alleleId: string | null | undefined): string | null {
  if (!alleleId) return null
  return `http://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(alleleId)}[alleleid]`
}

/** Deep link to a ClinVar variation record, or null when the variation id is missing. */
function clinvarVariationUrl(variationId: string | null | undefined): string | null {
  if (!variationId) return null
  return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${encodeURIComponent(variationId)}/`
}

/**
 * Deep link to a ClinVar record — prefers the variation page, falls back to the allele page. Structural:
 * accepts any object carrying the id fields, whichever format it arrives in — a `ClinvarAnnotation`
 * (`clinvarVariationId`/`clinvarAlleleId`) or a clinical control (`dbIdentifier`, an allele id).
 */
export function clinvarVariantUrl(record: {
  clinvarVariationId?: string | null
  clinvarAlleleId?: string | null
  dbIdentifier?: string | null
}): string | null {
  return (
    clinvarVariationUrl(record.clinvarVariationId) ??
    clinvarAlleleUrl(record.clinvarAlleleId ?? record.dbIdentifier) ??
    null
  )
}

/**
 * The badge color for a ClinVar clinical significance — pathogenic red, benign green, and `undefined` for
 * everything else (VUS, conflicting, a `-`), so callers fall back to their own default text color.
 * Substring match so the P/LP and B/LB aggregate labels all resolve to the directional color.
 */
export function clinicalSignificanceColor(significance: string | null | undefined): string | undefined {
  const s = significance?.toLowerCase() ?? ''
  if (s.includes('conflicting')) return undefined
  if (s.includes('pathogenic')) return 'var(--color-badge-pathogenic)'
  if (s.includes('benign')) return 'var(--color-badge-benign)'
  return undefined
}

/**
 * The ClinVar annotation for an allele at a given release, or null when it has none there. With no
 * `version`, returns the most recent by `dbVersion` — the fallback used when a release isn't pinned.
 */
export function selectClinvar(
  clinvar: ClinvarAnnotation[] | null | undefined,
  version?: string | null
): ClinvarAnnotation | null {
  if (!clinvar?.length) return null
  if (version) return clinvar.find((c) => c.dbVersion === version) ?? null
  return clinvar.reduce((best, c) => (clinvarVersionKey(c.dbVersion) > clinvarVersionKey(best.dbVersion) ? c : best))
}

/** The most recent ClinVar annotation (by `dbVersion`), or null when there are none. */
export function latestClinvar(annotations: AlleleAnnotations | null): ClinvarAnnotation | null {
  return selectClinvar(annotations?.clinvar)
}

/**
 * One ClinVar record reaching a measurement, resolved at a release. The single walk every ClinVar surface
 * projects from: the fold reads `clinvar`/`digest`, the popover enumerates the `classified` subset, and the
 * headline's `-` fallback reads `onAssayed` to prefer the measured allele's own record.
 */
export interface MeasurementClinvarRecord {
  /** VRS digest of the allele this record annotates. */
  digest: string
  /** True when the record is on the measured allele itself (digest === assayLevelDigest), not a sibling. */
  onAssayed: boolean
  /** Reference-frame HGVS of the annotated allele, for labeling; null when the sidecar has none. */
  hgvs: string | null
  /** True for a real classification; false for a `-` germline-less (somatic/oncogenicity-only) placeholder. */
  classified: boolean
  clinvar: ClinvarAnnotation
}

/** Canonical identity of a ClinVar record: the variation id when present, else the allele id. Dedupes records
 *  shared across reference frames, keys them in a list, and excludes the one already shown in a headline. */
export function clinvarRecordId(clinvar: {clinvarVariationId?: string | null; clinvarAlleleId: string}): string {
  return clinvar.clinvarVariationId ?? clinvar.clinvarAlleleId
}

/**
 * Resolve the ClinVar records reaching one measurement at `version` — the single walk over the annotations
 * map that the fold, the underlying-record popover, and the `-` headline fallback all project from, so no
 * surface re-walks it. One record per annotated allele digest (unclassified `-` records included, tagged);
 * downstream projections filter/fold as they need. `subject` is the measured/page allele's digest(s);
 * a record on any of them is the subject's own (`onAssayed`).
 */
export function resolveClinvarRecords(
  annotations: Record<string, {clinvar?: ClinvarAnnotation[] | null}> | null | undefined,
  alleles: Record<string, {hgvs?: string | null}> | null | undefined,
  subject: SubjectDigest,
  version?: string | null
): MeasurementClinvarRecord[] {
  if (!annotations) return []
  const subjectSet = toSubjectDigestSet(subject)
  const records: MeasurementClinvarRecord[] = []
  for (const [digest, ann] of Object.entries(annotations)) {
    const clinvar = selectClinvar(ann.clinvar, version)
    if (!clinvar) continue
    records.push({
      digest,
      onAssayed: subjectSet.has(digest),
      hgvs: alleles?.[digest]?.hgvs ?? null,
      classified: isClassifiedSignificance(clinvar.clinicalSignificance),
      clinvar
    })
  }
  return records
}

/**
 * The distinct *underlying* records for the popover, projected from a resolved walk — the records on sibling
 * alleles the headline folded over. Excludes the measured allele's own record (`onAssayed`): that is the
 * primary, already shown as the headline, not "underlying" — so a lone assayed record yields no popover, and
 * a protein-level allele's projected headline still lists the nucleotide sibling it was drawn from.
 *
 * These are the *related-allele* records offered as context — beside a direct call (transparency: records
 * that did not drive it), beneath a projected call (the siblings it folded over), or under an `absent`
 * nucleotide headline. Excludes the measured allele's own record (`onAssayed`) **and its cross-frame
 * duplicates**: the same ClinVar record seen under another reference-frame digest is the very record already
 * shown, not a distinct sibling, so it must not reappear here.
 *
 * Germline-less `-` submissions are kept (a record that exists is worth linking to; only the control fold
 * drops `-`). Dedupes by ClinVar record id across the DNA/protein frames that share one record (preferring a
 * coding HGVS for the label), and sorts directional calls (P/LP, B/LB) ahead of VUS and `-`, then by stars.
 */
export function enumerateUnderlyingClinvar(records: MeasurementClinvarRecord[]): MeasurementClinvarRecord[] {
  // The measured allele's own record id(s): exclude these and any other frame carrying the same record.
  const assayedIds = new Set(records.filter((r) => r.onAssayed).map((r) => clinvarRecordId(r.clinvar)))
  const byRecord = new Map<string, MeasurementClinvarRecord>()
  for (const rec of records) {
    if (rec.onAssayed) continue
    const key = clinvarRecordId(rec.clinvar)
    if (assayedIds.has(key)) continue
    const existing = byRecord.get(key)
    if (!existing) byRecord.set(key, {...rec})
    else if (hgvsLabelRank(rec.hgvs) > hgvsLabelRank(existing.hgvs)) existing.hgvs = rec.hgvs
  }
  const isDirectional = (significance: string) =>
    PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance) ||
    BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
  return [...byRecord.values()].sort((a, b) => {
    const dirDelta =
      Number(isDirectional(b.clinvar.clinicalSignificance)) - Number(isDirectional(a.clinvar.clinicalSignificance))
    if (dirDelta !== 0) return dirDelta
    return (
      (CLINVAR_REVIEW_STATUS_STARS[b.clinvar.clinicalReviewStatus] ?? 0) -
      (CLINVAR_REVIEW_STATUS_STARS[a.clinvar.clinicalReviewStatus] ?? 0)
    )
  })
}

/**
 * The label to render for a ClinVar `clinicalSignificance` — the classification itself, or, for a `-`
 * germline-less (somatic/oncogenicity-only) placeholder, {@link NO_GERMLINE_CLASSIFICATION_LABEL} rather
 * than a bare dash that reads as "no record". The single wording every ClinVar renderer shares.
 */
export function formatClinicalSignificance(significance: string | null | undefined): string {
  return isClassifiedSignificance(significance) ? significance! : NO_GERMLINE_CLASSIFICATION_LABEL
}

/**
 * Whether a ClinVar `clinicalSignificance` is an actual classification. ClinVar's split germline/somatic
 * model emits a literal `-` (occasionally empty) on an axis with no submission — e.g. a record carrying
 * somatic/oncogenicity data but no germline classification. Such a value is not a usable classification:
 * it must not become a clinvar control, render as a call, or (as a `-` on the *assayed* allele) block
 * fall-through to a sibling allele. Filter significances through this before treating them as calls.
 */
export function isClassifiedSignificance(significance: string | null | undefined): boolean {
  const s = significance?.trim()
  return !!s && !/^-+$/.test(s)
}

/** Whether a significance is an uncertain call — a plain VUS or a ClinVar-*Conflicting* aggregate value. */
export function isUncertainSignificance(significance: string): boolean {
  return (
    UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS.includes(significance) ||
    CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
  )
}

/**
 * Returns an array of ClinVar clinical significance classifications,
 * appending a "Conflicting" classification with a description that
 * depends on the provided version string. ClinVar changed the verbiage
 * for conflicting classifications in 2025, so this function adjusts
 * the label based on the version.
 *
 * If the version (expected in the format "prefix_YYYY") is greater than 2024,
 * the "Conflicting classifications of pathogenicity" label is used.
 * Otherwise, "Conflicting interpretations of pathogenicity" is used.
 *
 * @param version - The ClinVar version string, expected to contain a year after an underscore (e.g., "v_2023").
 * @returns An array of clinical significance classification objects, including the appropriate "Conflicting" classification.
 */
export function clinvarClinicalSignificanceClassifications(
  version: string | null
): typeof CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS {
  return [
    ...CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
    clinvarConflictingSignificanceClassificationForVersion(version)
  ]
}

/**
 * Returns the appropriate ClinVar conflicting significance classification object for a given version.
 *
 * Depending on the version string (expected in the format "prefix_YYYY"), this function returns
 * an object containing the name, description, and shortDescription for the conflicting significance
 * classification. For versions after 2024, the naming reflects updated ClinVar terminology.
 *
 * @param version - The version string, expected to contain a year after an underscore (e.g., "clinvar_2025").
 * @returns An object with `name`, `description`, and `shortDescription` fields describing the conflicting classification.
 */
export function clinvarConflictingSignificanceClassificationForVersion(version: string | null): {
  name: string
  description: string
  shortDescription: string
} {
  if (version === null || Number(version.split('_')[1]) > 2024) {
    return {
      name: 'Conflicting classifications of pathogenicity',
      description: 'Variant with conflicting classifications of pathogenicity',
      shortDescription: 'Conflicting'
    }
  } else {
    return {
      name: 'Conflicting interpretations of pathogenicity',
      description: 'Variant with conflicting interpretations of pathogenicity',
      shortDescription: 'Conflicting'
    }
  }
}

/**
 * Returns the appropriate label for conflicting clinical significance series based on the provided version string.
 *
 * The label changes depending on the numeric value after the underscore in the version string:
 * - If the numeric part is greater than 2024, returns "Conflicting classifications".
 * - Otherwise, returns "Conflicting interpretations".
 *
 * @param version - The version string in the format "prefix_number" (e.g., "v_2025").
 * @returns The label for conflicting clinical significance series.
 */
export function conflictingClinicalSignificanceSeriesLabelForVersion(version: string | null): string {
  if (version === null || Number(version.split('_')[1]) > 2024) {
    return 'Conflicting classifications'
  } else {
    return 'Conflicting interpretations'
  }
}
