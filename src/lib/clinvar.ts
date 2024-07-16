export const CLNSIG_DISPLAY_NAMES = {
    'Pathogenic': {
        variant_name: 'Pathogenic variant',
        short_name: 'Pathogenic',
    },
    'Likely_pathogenic': {
        variant_name: 'Likely pathogenic variant',
        short_name: 'LP',
    },
    'Pathogenic/Likely_pathogenic': {
        variant_name: 'Pathogenic/Likely pathogenic variant (in different submissions)',
        short_name: 'Path/LP (both)',
    },
    'Benign': {
        variant_name: 'Benign variant',
        short_name: 'Benign',
    },
    'Likely_benign': {
        variant_name: 'Likely benign variant',
        short_name: 'LB',
    },
    'Benign/Likely_benign': {
        variant_name: 'Benign/Likely benign variant (in different submissions)',
        short_name: 'B/LB (both)',
    },
    'Uncertain_significance': {
        variant_name: 'Variant of uncertain significance',
        short_name: 'VUS',
    },
    'Conflicting_interpretations_of_pathogenicity': {
        variant_name: 'Variant with conflicting interpretations of pathogenicity',
        short_name: 'Conflicting',
    },
}

export const CLNREVSTAT_STARS = {
    'no_assertion_criteria_provided': 0,
    'criteria_provided,_conflicting_interpretations': 1,
    'criteria_provided,_single_submitter': 1,
    'criteria_provided,_multiple_submitters,_no_conflicts': 2,
    'reviewed_by_expert_panel': 3,
}