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
  {value: 'clinGenAlleleId', label: 'ClinGen'},
  {value: 'vrsDigest', label: 'VRS'}
]

export const SEARCH_COLORS: Record<string, {accent: string; bg: string; activeText?: string}> = {
  hgvs: {accent: 'var(--color-sage)', bg: 'var(--color-sage-light)'},
  dbSnpRsId: {accent: 'var(--color-dbsnp)', bg: 'var(--color-dbsnp-light)'},
  clinVarVariationId: {accent: 'var(--color-clinvar)', bg: 'var(--color-clinvar-light)'},
  clinGenAlleleId: {accent: 'var(--color-orange-cta)', bg: 'var(--color-orange-light)'},
  vrsDigest: {accent: 'var(--color-ga4gh)', bg: 'var(--color-ga4gh-light)', activeText: '#ffffff'}
}

export const SEARCH_PLACEHOLDERS: Record<string, {full: string; short: string}> = {
  hgvs: {full: 'Search by HGVS, e.g. NM_007294.3:c.211A>G', short: 'Search by HGVS'},
  dbSnpRsId: {full: 'Search by dbSNP rsID, e.g. rs28897672', short: 'Search by dbSNP rsID'},
  clinVarVariationId: {full: 'Search by ClinVar Variation ID, e.g. 37610', short: 'Search by ClinVar ID'},
  clinGenAlleleId: {full: 'Search by ClinGen Allele ID, e.g. CA003746', short: 'Search by ClinGen Allele ID'},
  vrsDigest: {full: 'Search by VRS ID, e.g. ga4gh:VA.n9ax-9x6gOC0OEt73VMYqCBfqfxG1XUH', short: 'Search by VRS ID'}
}
