import {describe, expect, it} from 'vitest'

import {mergeAlleleSpellings, type AlleleResult} from '@/lib/mavemd'

function result(overrides: Partial<AlleleResult>): AlleleResult {
  return {
    clingenAlleleUrl: undefined,
    clingenAlleleId: undefined,
    canonicalAlleleName: undefined,
    maneStatus: null,
    genomicAlleles: [],
    grch38Hgvs: null,
    grch37Hgvs: null,
    transcriptAlleles: [],
    maneCoordinates: [],
    variantsStatus: 'NotLoaded',
    variants: {direct: [], proteinConsequence: [], nucleotideEncoding: []},
    ...overrides
  }
}

describe('mergeAlleleSpellings', () => {
  it('folds a transcript spelling onto the target and keeps distinct MANE coordinates', () => {
    const target = result({
      clingenAlleleId: 'PA9',
      maneCoordinates: [{sequenceType: 'protein', database: 'RefSeq', hgvs: 'NP_x:p.Arg273His'}]
    })
    mergeAlleleSpellings(
      target,
      result({maneCoordinates: [{sequenceType: 'nucleotide', database: 'RefSeq', hgvs: 'NM_x:c.818G>A'}]})
    )
    expect(target.clingenAlleleId).toBe('PA9') // anchor unchanged
    expect(target.maneCoordinates.map((c) => c.hgvs)).toEqual(['NP_x:p.Arg273His', 'NM_x:c.818G>A'])
  })

  it('deduplicates a coordinate shared across transcripts', () => {
    const coord = {sequenceType: 'nucleotide', database: 'RefSeq', hgvs: 'NM_x:c.818G>A'}
    const target = result({maneCoordinates: [coord]})
    mergeAlleleSpellings(target, result({maneCoordinates: [{...coord}]}))
    expect(target.maneCoordinates).toHaveLength(1)
  })

  it('fills a missing genome-build HGVS from the source without overwriting a present one', () => {
    const target = result({grch38Hgvs: 'NC_x:g.100A>T', grch37Hgvs: null})
    mergeAlleleSpellings(target, result({grch38Hgvs: 'other', grch37Hgvs: 'NC_y:g.200A>T'}))
    expect(target.grch38Hgvs).toBe('NC_x:g.100A>T') // kept
    expect(target.grch37Hgvs).toBe('NC_y:g.200A>T') // filled
  })
})
