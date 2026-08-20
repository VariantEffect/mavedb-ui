import {describe, expect, it, test} from 'vitest'

import {
  CHROMOSOME_REFSEQ_IDS,
  collectGnomadFrequencies,
  formatFrequency,
  gnomadIdToHgvs,
  gnomadIdToHgvsCandidates,
  gnomadVariantUrl,
  otherAssembly,
  parseGnomadId,
  type UnderlyingGnomad
} from './gnomad'

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

  describe('subject exclusion — the subject`s own frequency is the headline, not a "related" one', () => {
    test('excludes the subject digest', () => {
      const annotations = {
        subject: {gnomad: gnomad({dbIdentifier: 'S'})},
        sib: {gnomad: gnomad({dbIdentifier: 'B'})}
      }
      expect(ids(collectGnomadFrequencies(annotations, {}, ['subject']))).toEqual(['B'])
    })

    test('excludes the subject`s projection (same gnomAD id on a non-subject digest)', () => {
      // The subject (coding) has no gnomAD of its own; its genomic projection carries the record. Anchoring on both
      // subject digests drops the projection so the subject`s own frequency is never listed as related.
      const annotations = {
        'subject-c': {gnomad: null},
        'subject-g': {gnomad: gnomad({dbIdentifier: 'S'})},
        sib: {gnomad: gnomad({dbIdentifier: 'B'})}
      }
      expect(ids(collectGnomadFrequencies(annotations, {}, ['subject-c', 'subject-g']))).toEqual(['B'])
    })

    test('no subject given → collects everything (backward compatible)', () => {
      const annotations = {
        subject: {gnomad: gnomad({dbIdentifier: 'S'})},
        sib: {gnomad: gnomad({dbIdentifier: 'B', alleleFrequency: 0.002})}
      }
      expect(ids(collectGnomadFrequencies(annotations, {}))).toEqual(['B', 'S'])
    })
  })
})

/** The GRCh38 translation of a gnomAD ID, which is the one tried first. */
function grch38Hgvs(gnomadId: string): string | undefined {
  return gnomadIdToHgvsCandidates(gnomadId)[0]?.hgvs
}

describe('parseGnomadId', () => {
  it('parses a substitution', () => {
    expect(parseGnomadId('X-41334274-A-C')).toEqual({
      chromosome: 'X',
      position: 41334274,
      referenceAllele: 'A',
      alternateAllele: 'C'
    })
  })

  it('uppercases alleles and ignores surrounding whitespace', () => {
    expect(parseGnomadId('  1-11796321-g-a  ')).toEqual({
      chromosome: '1',
      position: 11796321,
      referenceAllele: 'G',
      alternateAllele: 'A'
    })
  })

  it('normalizes the mitochondrion to a single key', () => {
    expect(parseGnomadId('M-8993-T-G')?.chromosome).toBe('M')
    expect(parseGnomadId('MT-8993-T-G')?.chromosome).toBe('M')
  })

  it('rejects malformed IDs', () => {
    for (const id of ['X-41334274-A', 'X:41334274:A:C', 'chr1-11796321-G-A', '1-11796321-N-A', 'rs1801133', '']) {
      expect(parseGnomadId(id), id).toBeNull()
    }
  })

  it('rejects chromosomes that do not exist', () => {
    for (const id of ['0-100-A-C', '23-100-A-C', 'Z-100-A-C']) {
      expect(parseGnomadId(id), id).toBeNull()
    }
  })
})

describe('gnomadIdToHgvsCandidates', () => {
  it('translates a substitution', () => {
    expect(grch38Hgvs('X-41334274-A-C')).toBe('NC_000023.11:g.41334274A>C')
  })

  it('translates an insertion', () => {
    expect(grch38Hgvs('1-55516888-G-GA')).toBe('NC_000001.11:g.55516888_55516889insA')
  })

  it('translates a multi-base insertion', () => {
    expect(grch38Hgvs('1-55516888-G-GATC')).toBe('NC_000001.11:g.55516888_55516889insATC')
  })

  it('translates a single-base deletion', () => {
    expect(grch38Hgvs('1-55516888-GA-G')).toBe('NC_000001.11:g.55516889del')
  })

  it('translates a multi-base deletion', () => {
    expect(grch38Hgvs('1-55516888-GATC-G')).toBe('NC_000001.11:g.55516889_55516891del')
  })

  it('translates a delins', () => {
    expect(grch38Hgvs('1-55516888-GA-CT')).toBe('NC_000001.11:g.55516888_55516889delinsCT')
  })

  it('translates a single-base delins', () => {
    expect(grch38Hgvs('1-55516888-G-CT')).toBe('NC_000001.11:g.55516888delinsCT')
  })

  it('trims a common suffix as well as a common prefix', () => {
    // AGA>AA leaves only the G at 55516889 deleted.
    expect(grch38Hgvs('1-55516888-AGA-AA')).toBe('NC_000001.11:g.55516889del')
    // AT>T leaves only the A at 55516888 deleted.
    expect(grch38Hgvs('1-55516888-AT-T')).toBe('NC_000001.11:g.55516888del')
  })

  it('returns GRCh38 first, then GRCh37, each labelled with its assembly', () => {
    expect(gnomadIdToHgvsCandidates('17-7676154-G-C')).toEqual([
      {assembly: 'grch38', hgvs: 'NC_000017.11:g.7676154G>C'},
      {assembly: 'grch37', hgvs: 'NC_000017.10:g.7676154G>C'}
    ])
  })

  it('uses the shared rCRS accession for the mitochondrion in both assemblies', () => {
    expect(gnomadIdToHgvsCandidates('M-8993-T-G')).toEqual([
      {assembly: 'grch38', hgvs: 'NC_012920.1:g.8993T>G'},
      {assembly: 'grch37', hgvs: 'NC_012920.1:g.8993T>G'}
    ])
  })

  it('returns no candidates for an unparseable ID', () => {
    expect(gnomadIdToHgvsCandidates('not-an-id')).toEqual([])
  })

  it('returns no candidates when the alleles describe no change', () => {
    expect(gnomadIdToHgvsCandidates('1-55516888-A-A')).toEqual([])
    expect(gnomadIdToHgvsCandidates('1-55516888-AT-AT')).toEqual([])
  })
})

describe('gnomadIdToHgvs', () => {
  it('reads an ID under the requested assembly', () => {
    expect(gnomadIdToHgvs('17-7676154-G-C', 'grch38')).toBe('NC_000017.11:g.7676154G>C')
    expect(gnomadIdToHgvs('17-7676154-G-C', 'grch37')).toBe('NC_000017.10:g.7676154G>C')
  })

  it('returns null for an ID it cannot translate', () => {
    expect(gnomadIdToHgvs('not-an-id', 'grch38')).toBeNull()
  })
})

describe('otherAssembly', () => {
  it('pairs the two assemblies', () => {
    expect(otherAssembly('grch38')).toBe('grch37')
    expect(otherAssembly('grch37')).toBe('grch38')
  })
})

describe('CHROMOSOME_REFSEQ_IDS', () => {
  it('covers all 24 chromosomes plus the mitochondrion', () => {
    expect(Object.keys(CHROMOSOME_REFSEQ_IDS)).toHaveLength(25)
  })

  it('assigns a distinct accession to every chromosome within an assembly', () => {
    for (const assembly of ['grch38', 'grch37'] as const) {
      const accessions = Object.values(CHROMOSOME_REFSEQ_IDS).map((ids) => ids[assembly])
      expect(new Set(accessions).size, assembly).toBe(accessions.length)
    }
  })

  it('uses different accessions per assembly for every chromosome but the mitochondrion', () => {
    for (const [chromosome, ids] of Object.entries(CHROMOSOME_REFSEQ_IDS)) {
      if (chromosome === 'M') {
        expect(ids.grch38).toBe(ids.grch37)
      } else {
        expect(ids.grch38, chromosome).not.toBe(ids.grch37)
      }
    }
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

describe('gnomadVariantUrl — dataset matches the record version', () => {
  test.each([
    ['v4.1', 'gnomad_r4'],
    ['v3.1.2', 'gnomad_r3'],
    ['v2.1.1', 'gnomad_r2_1'],
    // Bare majors, as older records and fixtures carry them.
    ['4', 'gnomad_r4'],
    ['3', 'gnomad_r3'],
    ['2', 'gnomad_r2_1']
  ])('version %s → %s', (dbVersion, dataset) => {
    const url = gnomadVariantUrl({dbIdentifier: '1-55051215-G-A', dbVersion})
    expect(url).toContain(`dataset=${dataset}`)
    expect(url).toContain('/variant/1-55051215-G-A')
  })

  test('an unrecognisable version falls back to the current dataset', () => {
    expect(gnomadVariantUrl({dbIdentifier: 'x', dbVersion: 'unknown'})).toContain('dataset=gnomad_r4')
  })
})
