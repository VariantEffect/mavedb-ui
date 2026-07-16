import {describe, expect, test} from 'vitest'

import {collectGnomadFrequencies, formatFrequency, gnomadVariantUrl, type UnderlyingGnomad} from '@/lib/gnomad'

type GnomadAnnotation = UnderlyingGnomad['gnomad']

// A gnomAD annotation with sensible defaults; only the fields a test cares about need overriding.
function gnomad(overrides: Partial<GnomadAnnotation> & {dbIdentifier: string}): GnomadAnnotation {
  return {
    alleleFrequency: 0.001,
    alleleCount: 10,
    alleleNumber: 10000,
    faf95Max: null,
    dbVersion: '4',
    ...overrides
  }
}

/** The gnomAD variant ids in a collected list, in returned order. */
const ids = (list: UnderlyingGnomad[]) => list.map((item) => item.gnomad.dbIdentifier)

describe('collectGnomadFrequencies — enumeration of encoding-variant frequencies', () => {
  test('nullish annotations → empty', () => {
    expect(collectGnomadFrequencies(null, null)).toEqual([])
    expect(collectGnomadFrequencies(undefined, undefined)).toEqual([])
  })

  test('no allele carries gnomAD → empty', () => {
    const annotations = {'protein-digest': {}, 'other-digest': {gnomad: null}}
    expect(collectGnomadFrequencies(annotations, {})).toEqual([])
  })

  test('collects one measurement per annotated allele, pairing the HGVS from the alleles sidecar', () => {
    const annotations = {
      'digest-a': {gnomad: gnomad({dbIdentifier: '1-100-A-G', alleleFrequency: 0.002})},
      'digest-b': {gnomad: gnomad({dbIdentifier: '1-200-C-T', alleleFrequency: 0.001})}
    }
    const alleles = {'digest-a': {hgvs: 'c.10A>G'}, 'digest-b': {hgvs: 'c.20C>T'}}
    const result = collectGnomadFrequencies(annotations, alleles)
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.gnomad.dbIdentifier === '1-100-A-G')?.hgvs).toBe('c.10A>G')
    expect(result.find((r) => r.gnomad.dbIdentifier === '1-200-C-T')?.hgvs).toBe('c.20C>T')
  })

  test('sorts by descending allele frequency (max first — drives the headline)', () => {
    const annotations = {
      low: {gnomad: gnomad({dbIdentifier: 'low', alleleFrequency: 0.0001})},
      high: {gnomad: gnomad({dbIdentifier: 'high', alleleFrequency: 0.05})},
      mid: {gnomad: gnomad({dbIdentifier: 'mid', alleleFrequency: 0.01})}
    }
    expect(ids(collectGnomadFrequencies(annotations, {}))).toEqual(['high', 'mid', 'low'])
  })

  test('missing HGVS is tolerated → null label', () => {
    const annotations = {'digest-a': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})}}
    expect(collectGnomadFrequencies(annotations, {})[0]?.hgvs).toBeNull()
    expect(collectGnomadFrequencies(annotations, {'digest-a': {hgvs: null}})[0]?.hgvs).toBeNull()
  })

  describe('deduplication by gnomAD variant id — the c/g members of one genomic variant share it', () => {
    test('two digests, same dbIdentifier → one entry', () => {
      const annotations = {
        'c-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})},
        'g-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})}
      }
      const alleles = {'c-digest': {hgvs: 'c.10A>G'}, 'g-digest': {hgvs: 'g.100A>G'}}
      const result = collectGnomadFrequencies(annotations, alleles)
      expect(result).toHaveLength(1)
    })

    test('coding HGVS is preferred as the label regardless of iteration order', () => {
      // g-member seen first, c-member second.
      const gFirst = {
        'g-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})},
        'c-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})}
      }
      // c-member seen first, g-member second.
      const cFirst = {
        'c-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})},
        'g-digest': {gnomad: gnomad({dbIdentifier: '1-100-A-G'})}
      }
      const alleles = {'c-digest': {hgvs: 'NM_1.2:c.10A>G'}, 'g-digest': {hgvs: 'NC_1.11:g.100A>G'}}
      expect(collectGnomadFrequencies(gFirst, alleles)[0]?.hgvs).toBe('NM_1.2:c.10A>G')
      expect(collectGnomadFrequencies(cFirst, alleles)[0]?.hgvs).toBe('NM_1.2:c.10A>G')
    })

    test('genomic HGVS is preferred over a non-c/g label; a present label beats a missing one', () => {
      const annotations = {
        'n-digest': {gnomad: gnomad({dbIdentifier: 'X'})},
        'g-digest': {gnomad: gnomad({dbIdentifier: 'X'})}
      }
      expect(collectGnomadFrequencies(annotations, {'n-digest': {hgvs: 'n.5A>G'}, 'g-digest': {hgvs: 'g.100A>G'}})[0]?.hgvs).toBe('g.100A>G')
      expect(collectGnomadFrequencies(annotations, {'g-digest': {hgvs: 'g.100A>G'}})[0]?.hgvs).toBe('g.100A>G')
    })
  })
})

describe('formatFrequency', () => {
  test('nullish → em dash', () => {
    expect(formatFrequency(null)).toBe('—')
    expect(formatFrequency(undefined)).toBe('—')
  })

  test('very rare (< 1e-4) → scientific notation, else 3 significant figures', () => {
    expect(formatFrequency(0.00001)).toBe('1.00e-5')
    expect(formatFrequency(0.0123456)).toBe('0.0123')
    expect(formatFrequency(0)).toBe('0.00e+0')
  })
})

describe('gnomadVariantUrl — dataset matches the annotation version', () => {
  test.each([
    ['4', 'gnomad_r4'],
    ['3', 'gnomad_r3'],
    ['2', 'gnomad_r2_1']
  ])('major version %s → %s', (dbVersion, dataset) => {
    const url = gnomadVariantUrl({dbIdentifier: '1-55051215-G-A', dbVersion})
    expect(url).toContain(`dataset=${dataset}`)
    expect(url).toContain('/variant/1-55051215-G-A')
  })
})
