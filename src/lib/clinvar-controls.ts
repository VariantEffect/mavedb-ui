import type {components} from '@/schema/openapi'

export type ClinvarControlOption = components['schemas']['ClinicalControlOptions']
export type ClinvarVariantLink = components['schemas']['ClinvarVariantLink']
export type ClinvarControl = components['schemas']['ClinicalControlWithClinvarLinks']

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

/** Turn a ClinVar `dbVersion` like `03_2024` into "March 2024"; pass through anything unrecognized. */
export function formatClinvarVersion(dbVersion: string): string {
  const match = dbVersion.match(/^(\d{2})_(\d{4})$/)
  if (!match) return dbVersion
  const [, month, year] = match
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {month: 'long', year: 'numeric'})
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

/** The most recent ClinVar annotation (by `dbVersion`), or null when there are none. */
export function latestClinvar(annotations: AlleleAnnotations | null): ClinvarAnnotation | null {
  const clinvar = annotations?.clinvar
  if (!clinvar?.length) return null
  return clinvar.reduce((best, c) => (c.dbVersion > best.dbVersion ? c : best))
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
