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
}, {
  name: 'Conflicting interpretations of pathogenicity',
  description: 'Variant with conflicting interpretations of pathogenicity',
  shortDescription: 'Conflicting'
}]

export const BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely benign', 'Benign', 'Benign/Likely benign']

export const PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely pathogenic', 'Pathogenic', 'Pathogenic/Likely pathogenic']

export const CLINVAR_REVIEW_STATUS_STARS = {
  'no assertion criteria provided': 0,
  'criteria provided, conflicting interpretations': 1,
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
export const DEFAULT_CLINICAL_CONTROL_VERSION = '11_2024'

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
