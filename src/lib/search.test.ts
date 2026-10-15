import {describe, expect, test} from 'vitest'

import {variantSearchRouteFor} from '@/lib/search'

describe('variantSearchRouteFor', () => {
  test.each([null, undefined, '', '   ', 'BRCA2', 'deep mutational scan', 'urn:mavedb:00001268-0-1'])(
    'keeps %j as a dataset search',
    (text) => {
      expect(variantSearchRouteFor(text)).toBeNull()
    }
  )

  test('routes a ClinGen allele ID', () => {
    expect(variantSearchRouteFor(' CA024624 ')).toEqual({
      name: 'mavemd',
      query: {search: 'CA024624', searchType: 'clinGenAlleleId'}
    })
  })

  test('routes a dbSNP rsID', () => {
    expect(variantSearchRouteFor('rs80357906')).toEqual({
      name: 'mavemd',
      query: {search: 'rs80357906', searchType: 'dbSnpRsId'}
    })
  })

  test('routes transcript HGVS as an HGVS search', () => {
    expect(variantSearchRouteFor('NM_000059.4:c.6953G>A')).toEqual({
      name: 'mavemd',
      query: {search: 'NM_000059.4:c.6953G>A', searchType: 'hgvs'}
    })
  })

  test('routes gene-prefixed HGVS to guided search', () => {
    expect(variantSearchRouteFor('BRCA1:c.123A>G')).toEqual({
      name: 'mavemd',
      query: {gene: 'BRCA1', variantType: 'c.', variantPosition: '123', refAllele: 'A', altAllele: 'G'}
    })
    expect(variantSearchRouteFor('BRCA1:p.Arg123Gly')).toEqual({
      name: 'mavemd',
      query: {gene: 'BRCA1', variantType: 'p.', variantPosition: '123', refAllele: 'Arg', altAllele: 'Gly'}
    })
  })
})
