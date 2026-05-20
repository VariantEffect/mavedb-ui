import {describe, expect, it} from 'vitest'

import {getTargetGeneLinkItems, getTargetGeneRoute} from './target-genes'

type TestTargetGene = {
  id: number
  name: string
  mappedHgncName?: string | null
  targetAccession?: {gene?: string | null} | null
}

function targetGene(overrides: Partial<TestTargetGene> = {}): TestTargetGene {
  return {
    id: 1,
    name: 'BRCA1',
    mappedHgncName: 'BRCA1',
    targetAccession: null,
    ...overrides
  }
}

describe('target gene navigation helpers', () => {
  it('returns the named gene route for targets with mapped HGNC symbols', () => {
    expect(getTargetGeneRoute(targetGene({mappedHgncName: 'BRCA1'}))).toEqual({
      name: 'gene',
      params: {symbol: 'BRCA1'}
    })
  })

  it('returns null for targets without mapped HGNC symbols even when accession gene exists', () => {
    expect(
      getTargetGeneRoute(
        targetGene({
          name: 'Submitted BRCA1',
          mappedHgncName: null,
          targetAccession: {gene: 'BRCA1'}
        })
      )
    ).toBeNull()
  })

  it('uses canonical mapped symbols for linked labels and plain display labels for unmapped targets', () => {
    expect(
      getTargetGeneLinkItems([
        targetGene({name: 'Submitted BRCA1', mappedHgncName: 'BRCA1'}),
        targetGene({id: 2, name: 'Submitted TP53', mappedHgncName: null, targetAccession: {gene: 'TP53'}})
      ])
    ).toEqual([
      {
        name: 'BRCA1',
        route: {name: 'gene', params: {symbol: 'BRCA1'}}
      },
      {
        name: 'Submitted TP53',
        route: null
      }
    ])
  })

  it('deduplicates mapped targets by canonical route destination', () => {
    expect(
      getTargetGeneLinkItems([
        targetGene({id: 1, name: 'Submitted BRCA1 A', mappedHgncName: 'BRCA1'}),
        targetGene({id: 2, name: 'Submitted BRCA1 B', mappedHgncName: 'BRCA1'}),
        targetGene({id: 3, name: 'TP53', mappedHgncName: 'TP53'})
      ])
    ).toEqual([
      {
        name: 'BRCA1',
        route: {name: 'gene', params: {symbol: 'BRCA1'}}
      },
      {
        name: 'TP53',
        route: {name: 'gene', params: {symbol: 'TP53'}}
      }
    ])
  })
})
