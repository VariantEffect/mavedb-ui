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
export const CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [{
  name: 'Pathogenic',
  description: 'Pathogenic variant',
  shortDescription: 'Pathogenic'
}, {
  name: 'Likely pathogenic',
  description: 'Likely pathogenic variant',
  shortDescription: 'LP'
}, {
  name: 'Pathogenic/Likely pathogenic',
  description: 'Pathogenic/Likely pathogenic variant (in different submissions)',
  shortDescription: 'Path/LP (both)'
}, {
  name: 'Benign',
  description: 'Benign variant',
  shortDescription: 'Benign'
}, {
  name: 'Likely benign',
  description: 'Likely benign variant',
  shortDescription: 'LB'
}, {
  name: 'Benign/Likely benign',
  description: 'Benign/Likely benign variant (in different submissions)',
  shortDescription: 'B/LB (both)'
}, {
  name: 'Uncertain significance',
  description: 'Variant of uncertain significance',
  shortDescription: 'VUS'
}]

export const BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely benign', 'Benign', 'Benign/Likely benign']

export const PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely pathogenic', 'Pathogenic', 'Pathogenic/Likely pathogenic']

export const CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Conflicting interpretations of pathogenicity', 'Conflicting classifications of pathogenicity']

export const CLINVAR_REVIEW_STATUS_STARS = {
  'no assertion criteria provided': 0,
  'criteria provided, conflicting interpretations': 1,
  'criteria provided, conflicting classifications': 1,
  'criteria provided, single submitter': 1,
  'criteria provided, multiple submitters, no conflicts': 2,
  'reviewed by expert panel': 3
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

export const DEFAULT_CLINICAL_CONTROL_DB = 'ClinVar'
export const DEFAULT_CLINICAL_CONTROL_VERSION = '01_2025'

export interface ClinicalControlOption {
  dbName: string,
  availableVersions: string[]
}

export interface ClinicalControl {
  dbName: string,
  dbVersion: string,
  dbIdentifier: string,
  clnsigField: string,
  clnrevstatField: string,
  geneSymbol: string,
  modificationDate: Date,
  creationDate: Date,
  mappedVariants: Array<Object>,
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
export function clinvarClinicalSignificanceClassifications(version: string): typeof CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS {
    return [...CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS, clinvarConflictingSignificanceClassificationForVersion(version)]
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
export function clinvarConflictingSignificanceClassificationForVersion(version: string): { name: string, description: string, shortDescription: string } {
  if (Number(version.split('_')[1]) > 2024) {
    return {
      name: 'Conflicting classifications of pathogenicity',
      description: 'Variant with conflicting classifications of pathogenicity',
      shortDescription: 'Conflicting',
    }
  } else {
    return {
      name: 'Conflicting interpretations of pathogenicity',
      description: 'Variant with conflicting interpretations of pathogenicity',
      shortDescription: 'Conflicting',
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
export function conflictingClinicalSignificanceSeriesLabelForVersion(version: string): string {
  if (Number(version.split('_')[1]) > 2024) {
    return 'Conflicting classifications'
  } else {
    return 'Conflicting interpretations'
  }
}
