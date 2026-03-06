/**
 * Search configuration for the hero search bar on the homepage.
 *
 * The `value` field in SEARCH_TYPES must match the `code` values expected by
 * SearchVariantsScreen (MaveMD) so that query params pass through correctly.
 */

export const SEARCH_TYPES = [
  {value: 'hgvs', label: 'HGVS'},
  {value: 'dbSnpRsId', label: 'dbSNP'},
  {value: 'clinVarVariationId', label: 'ClinVar'},
  {value: 'clinGenAlleleId', label: 'ClinGen CAId'}
]

export const SEARCH_COLORS: Record<string, {accent: string; bg: string}> = {
  hgvs: {accent: '#78b793', bg: '#c8e4c6'},
  dbSnpRsId: {accent: '#e6b84d', bg: '#fdf3d7'},
  clinVarVariationId: {accent: '#f8971d', bg: '#fef3e2'},
  clinGenAlleleId: {accent: '#5aafa0', bg: '#c8ece5'}
}

export const SEARCH_PLACEHOLDERS: Record<string, {full: string; short: string}> = {
  hgvs: {full: 'Search by HGVS, e.g. NM_007294.3:c.211A>G', short: 'Search by HGVS'},
  dbSnpRsId: {full: 'Search by dbSNP rsID, e.g. rs28897672', short: 'Search by dbSNP rsID'},
  clinVarVariationId: {full: 'Search by ClinVar Variation ID, e.g. 37610', short: 'Search by ClinVar ID'},
  clinGenAlleleId: {full: 'Search by ClinGen CAId, e.g. CA003746', short: 'Search by ClinGen CAId'}
}
