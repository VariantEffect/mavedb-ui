import {AMINO_ACIDS} from '@/lib/amino-acids'
import {NUCLEOTIDE_BASES} from '@/lib/nucleotides'

export const MAVEMD_COLLECTION_URN = 'urn:mavedb:collection-603dafbf-4a3f-4d70-ab8c-aafb226fbff4'

/** Available search types on the MaveMD search page, with example queries. */
export const SEARCH_TYPE_OPTIONS = [
  {code: 'hgvs', name: 'HGVS', examples: ['ENST00000473961.6:c.-19-2A>T', 'NP_000242.1:p.Asn566Thr']},
  {code: 'clinGenAlleleId', name: 'ClinGen Allele ID', examples: ['CA10590195', 'PA2579983208']},
  {code: 'dbSnpRsId', name: 'dbSNP rsID', examples: ['rs900082291', '900082291']},
  {code: 'clinVarVariationId', name: 'ClinVar Variation ID', examples: ['869058']},
  {code: 'vrsDigest', name: 'VRS Digest', examples: ['ga4gh:VA.-US8Ap1kUYvW3DzeFEYrNXgk3Xk9toKy']}
]

/** Variant type options for guided search. */
export const VARIANT_TYPE_OPTIONS = [
  {label: 'c. (coding)', value: 'c.'},
  {label: 'p. (protein)', value: 'p.'}
]

/** Allele options per variant type, derived from existing domain data. */
export const ALLELE_OPTIONS: Record<string, string[]> = {
  'c.': NUCLEOTIDE_BASES.map((b) => b.codes.single),
  'p.': AMINO_ACIDS.map((aa) => aa.codes.triple.charAt(0).toUpperCase() + aa.codes.triple.slice(1).toLowerCase())
}

export const HOW_IT_WORKS_STEPS = [
  {
    number: 1,
    title: 'Enter a variant',
    description:
      'Search by HGVS notation, ClinGen Allele ID, dbSNP rsID, or ClinVar Variation ID. Or use guided search to build a query from gene symbol and position.'
  },
  {
    number: 2,
    title: 'Match measurements',
    description:
      'MaveMD queries the ClinGen Allele Registry to resolve your variant, then searches MaveDB for matching functional measurements across calibrated datasets.'
  },
  {
    number: 3,
    title: 'Apply evidence',
    description:
      'View variant effect scores alongside clinical evidence calibrations to support ACMG/AMP variant classification in a structured, exportable format.'
  }
]
