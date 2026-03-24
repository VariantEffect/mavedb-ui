import _ from 'lodash'

export interface KeywordDefinition {
  /** Display label used as the keyword key in the API payload */
  key: string
  /** Label for the optional description textarea */
  descriptionLabel: string
  /** API endpoint path segment (space-separated keyword category name) */
  endpoint: string
}

/**
 * Controlled vocabulary keyword definitions. Each entry maps to a GET endpoint
 * at `/controlled-keywords/{endpoint}` and a Select dropdown in the form.
 */
export const KEYWORDS: KeywordDefinition[] = [
  {
    key: 'Variant Library Creation Method',
    descriptionLabel: 'Variant Library Creation Method Description',
    endpoint: 'variant library creation method'
  },
  {
    key: 'Endogenous Locus Library Method System',
    descriptionLabel: 'Endogenous Locus Library Method System Description',
    endpoint: 'endogenous locus library method system'
  },
  {
    key: 'Endogenous Locus Library Method Mechanism',
    descriptionLabel: 'Endogenous Locus Library Method Mechanism Description',
    endpoint: 'endogenous locus library method mechanism'
  },
  {
    key: 'In Vitro Construct Library Method System',
    descriptionLabel: 'In Vitro Construct Library Method System Description',
    endpoint: 'in vitro construct library method system'
  },
  {
    key: 'In Vitro Construct Library Method Mechanism',
    descriptionLabel: 'In Vitro Construct Library Method Mechanism Description',
    endpoint: 'in vitro construct library method mechanism'
  },
  {
    key: 'Delivery Method',
    descriptionLabel: 'Delivery Method Description',
    endpoint: 'delivery method'
  },
  {
    key: 'Molecular Mechanism Assessed',
    descriptionLabel: 'Molecular Mechanism Assessed Description',
    endpoint: 'molecular mechanism assessed'
  },
  {
    key: 'Phenotypic Assay Dimensionality',
    descriptionLabel: 'Phenotypic Assay Dimensionality Description',
    endpoint: 'phenotypic assay dimensionality'
  },
  {
    key: 'Phenotypic Assay Method',
    descriptionLabel: 'Phenotypic Assay Method Description',
    endpoint: 'phenotypic assay method'
  },
  {
    key: 'Phenotypic Assay Mechanism',
    descriptionLabel: 'Phenotypic Assay Mechanism Description',
    endpoint: 'phenotypic assay mechanism'
  },
  {
    key: 'Phenotypic Assay Model System',
    descriptionLabel: 'Phenotypic Assay Model System Description',
    endpoint: 'phenotypic assay model system'
  },
  {
    key: 'Phenotypic Assay Profiling Strategy',
    descriptionLabel: 'Phenotypic Assay Profiling Strategy Description',
    endpoint: 'phenotypic assay profiling strategy'
  },
  {
    key: 'Phenotypic Assay Sequencing Read Type',
    descriptionLabel: 'Phenotypic Assay Sequencing Read Type Description',
    endpoint: 'phenotypic assay sequencing read type'
  }
]

/**
 * Keyword grouping by variant library creation method. When a user selects
 * "Endogenous locus library method" or "In vitro construct library method",
 * only the keywords in that group are included in the save payload.
 */
export const KEYWORD_GROUPS: Record<string, string[]> = {
  'Endogenous locus library method': [
    'Variant Library Creation Method',
    'Endogenous Locus Library Method System',
    'Endogenous Locus Library Method Mechanism'
  ],
  'In vitro construct library method': [
    'Variant Library Creation Method',
    'In Vitro Construct Library Method System',
    'In Vitro Construct Library Method Mechanism'
  ],
  Other: ['Variant Library Creation Method']
}

/** The phenotypic keywords (indices 5+) that are always included regardless of method group. */
export const PHENOTYPIC_KEYWORDS = KEYWORDS.slice(5)

/** Creates the initial keyword state for a form's data(). */
export function initKeywordState() {
  return {
    keywordKeys: _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])) as Record<string, string | null>,
    keywordDescriptions: _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])) as Record<string, string | null>,
    keywordTextVisible: _.fromPairs(KEYWORDS.map((kw) => [kw.key, false])) as Record<string, boolean>
  }
}

