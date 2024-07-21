export const CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [{
  name: 'Pathogenic',
  description: 'Pathogenic variant',
  shortDescription: 'Pathogenic'
}, {
  name: 'Likely_pathogenic',
  description: 'Likely pathogenic variant',
  shortDescription: 'LP'
}, {
  name: 'Pathogenic/Likely_pathogenic',
  description: 'Pathogenic/Likely pathogenic variant (in different submissions)',
  shortDescription: 'Path/LP (both)'
}, {
  name: 'Benign',
  description: 'Benign variant',
  shortDescription: 'Benign'
}, {
  name: 'Likely_benign',
  description: 'Likely benign variant',
  shortDescription: 'LB'
}, {
  name: 'Benign/Likely_benign',
  description: 'Benign/Likely benign variant (in different submissions)',
  shortDescription: 'B/LB (both)'
}, {
  name: 'Uncertain_significance',
  description: 'Variant of uncertain significance',
  shortDescription: 'VUS'
}, {
  name: 'Conflicting_interpretations_of_pathogenicity',
  description: 'Variant with conflicting interpretations of pathogenicity',
  shortDescription: 'Conflicting'
}]

export const BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely_benign', 'Benign', 'Benign/Likely_benign']

export const PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = ['Likely_pathogenic', 'Pathogenic', 'Pathogenic/Likely_pathogenic']

export const CLINVAR_REVIEW_STATUS_STARS = {
  'no_assertion_criteria_provided': 0,
  'criteria_provided,_conflicting_interpretations': 1,
  'criteria_provided,_single_submitter': 1,
  'criteria_provided,_multiple_submitters,_no_conflicts': 2,
  'reviewed_by_expert_panel': 3
}
