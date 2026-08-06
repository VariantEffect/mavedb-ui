import {describe, expect, it} from 'vitest'

import {detectSearchType, geneSymbolSearchTarget, gnomadIdRegex} from './mavemd'

describe('detectSearchType', () => {
  it('recognizes each supported identifier', () => {
    const expected: [string, string][] = [
      ['ga4gh:VA.-US8Ap1kUYvW3DzeFEYrNXgk3Xk9toKy', 'vrsDigest'],
      ['CA10590195', 'clinGenAlleleId'],
      ['PA2579983208', 'clinGenAlleleId'],
      ['rs900082291', 'dbSnpRsId'],
      ['17-7676154-G-C', 'gnomadId'],
      ['1-55516888-G-GA', 'gnomadId'],
      ['ENST00000473961.6:c.-19-2A>T', 'hgvs'],
      ['NP_000242.1:p.Asn566Thr', 'hgvs'],
      ['NM_007294.3(BRCA1):c.211A>G', 'hgvs'],
      ['869058', 'clinVarVariationId'],
      ['BRCA1', 'geneSymbol'],
      ['TP53', 'geneSymbol'],
      ['MYC', 'geneSymbol'],
      ['HLA-A', 'geneSymbol'],
      ['MT-CO1', 'geneSymbol'],
      ['C1orf100', 'geneSymbol'],
      ['IGH@', 'geneSymbol']
    ]
    for (const [searchString, searchType] of expected) {
      expect(detectSearchType(searchString), searchString).toBe(searchType)
    }
  })

  it('ignores surrounding whitespace', () => {
    expect(detectSearchType('  CA10590195  ')).toBe('clinGenAlleleId')
  })

  it('prefers a VRS digest over HGVS, which its colon would otherwise match', () => {
    expect(detectSearchType('ga4gh:VA.-US8Ap1kUYvW3DzeFEYrNXgk3Xk9toKy')).toBe('vrsDigest')
  })

  it('treats a bare number as a ClinVar Variation ID', () => {
    // dbSNP rsIDs are also accepted without their rs prefix, but only the ClinVar pattern matches a bare number, so
    // that is what an unprefixed number resolves to.
    expect(detectSearchType('869058')).toBe('clinVarVariationId')
    expect(detectSearchType('900082291')).toBe('clinVarVariationId')
  })

  it('detects a gene symbol case-insensitively, since the search uppercases it', () => {
    expect(detectSearchType('brca1')).toBe('geneSymbol')
    expect(detectSearchType('  Tp53  ')).toBe('geneSymbol')
  })

  it('prefers the variant identifier where a gene symbol collides with one', () => {
    // CA1-CA14 (carbonic anhydrases) and RS1 (retinoschisin 1) are real gene symbols that also satisfy the ClinGen
    // and dbSNP patterns. The variant identifier wins, so reaching those gene pages needs the type chosen explicitly.
    expect(detectSearchType('CA9')).toBe('clinGenAlleleId')
    expect(detectSearchType('RS1')).toBe('dbSnpRsId')
  })

  it('reads a hyphenated string as a gene symbol, which it cannot be told apart from', () => {
    // A mistyped ClinGen ID has the same shape as HLA-A or MT-CO1, so it resolves to a gene page rather than an error.
    expect(detectSearchType('CA-10590195')).toBe('geneSymbol')
  })

  it('returns null for a string resembling no supported identifier', () => {
    for (const searchString of ['', '   ', 'not an identifier', 'BRCA1/2', '???']) {
      expect(detectSearchType(searchString), JSON.stringify(searchString)).toBeNull()
    }
  })
})

describe('geneSymbolSearchTarget', () => {
  it('uppercases the symbol when the gene symbol type is chosen', () => {
    expect(geneSymbolSearchTarget('brca1', 'geneSymbol')).toBe('BRCA1')
    expect(geneSymbolSearchTarget('  tp53  ', 'geneSymbol')).toBe('TP53')
  })

  it('detects a gene symbol under the "Any" type', () => {
    expect(geneSymbolSearchTarget('brca1', 'any')).toBe('BRCA1')
  })

  it('returns null when the search is for something else', () => {
    expect(geneSymbolSearchTarget('CA10590195', 'any')).toBeNull()
    expect(geneSymbolSearchTarget('17-7676154-G-C', 'any')).toBeNull()
    expect(geneSymbolSearchTarget('BRCA1', 'hgvs')).toBeNull()
    expect(geneSymbolSearchTarget('', 'geneSymbol')).toBeNull()
    expect(geneSymbolSearchTarget('   ', 'any')).toBeNull()
  })

  it('returns a malformed symbol for the caller to reject, when the type was chosen explicitly', () => {
    // Only the "Any" path has already applied geneSymbolRegex, so this is what callers must still validate.
    expect(geneSymbolSearchTarget('BRCA1/2', 'geneSymbol')).toBe('BRCA1/2')
    expect(geneSymbolSearchTarget('BRCA1/2', 'any')).toBeNull()
  })
})

/**
 * gnomad.test.ts already drives this pattern through parseGnomadId, covering alleles, indels, case and the malformed
 * shapes. What it cannot cover is the chromosome alternation: parseGnomadId also gates on CHROMOSOME_REFSEQ_IDS, so it
 * rejects an impossible chromosome whatever the pattern does. detectSearchType applies the pattern directly, with no
 * such gate, so these tests exist for that path.
 */
describe('gnomadIdRegex', () => {
  it('accepts chromosomes at the edges of the range', () => {
    for (const id of ['1-11796321-G-A', '22-42126611-C-T', 'X-41334274-A-C', 'Y-2787175-C-T', 'MT-8993-T-G']) {
      expect(gnomadIdRegex.test(id), id).toBe(true)
    }
  })

  it('rejects chromosomes outside it', () => {
    for (const id of ['0-11796321-G-A', '23-11796321-G-A', '30-11796321-G-A', 'Z-11796321-G-A']) {
      expect(gnomadIdRegex.test(id), id).toBe(false)
    }
  })

  it('anchors the whole string, rejecting a trailing field or an empty position', () => {
    for (const id of ['1-11796321-G-A-T', '1--G-A']) {
      expect(gnomadIdRegex.test(id), id).toBe(false)
    }
  })
})
