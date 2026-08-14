import {describe, expect, it, test} from 'vitest'
import {
  CHROMOSOME_REFSEQ_IDS,
  gnomadIdToHgvs,
  gnomadIdToHgvsCandidates,
  otherAssembly,
  parseGnomadId,
  formatFrequency,
  gnomadFromVariantRow,
  gnomadVariantUrl,
  type GnomadFrequency
} from './gnomad'
import type {RawVariant} from '@/lib/variants'

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

/** A variant data row whose gnomad namespace is fully populated; overrides replace individual cells. */
function row(overrides: Partial<NonNullable<RawVariant['gnomad']>> = {}): RawVariant {
  return {
    accession: 'urn:mavedb:00000001-a-1#1',
    scores: {score: 0.5},
    gnomad: {
      gnomad_af: 1.86e-6,
      gnomad_ac: 3,
      gnomad_an: 1613510,
      gnomad_faf95_max: 6.8e-7,
      gnomad_faf95_max_ancestry: 'nfe',
      gnomad_id: '10-87961093-A-G',
      gnomad_version: 'v4.1',
      ...overrides
    }
  }
}

const frequency: GnomadFrequency = {
  alleleFrequency: 1.86e-6,
  alleleCount: 3,
  alleleNumber: 1613510,
  faf95Max: 6.8e-7,
  faf95MaxAncestry: 'nfe',
  dbIdentifier: '10-87961093-A-G',
  dbVersion: 'v4.1'
}

describe('gnomadFromVariantRow', () => {
  test('reads a populated namespace into the display shape', () => {
    expect(gnomadFromVariantRow(row())).toEqual(frequency)
  })

  test('nullish row or absent namespace → null', () => {
    expect(gnomadFromVariantRow(null)).toBeNull()
    expect(gnomadFromVariantRow(undefined)).toBeNull()
    expect(gnomadFromVariantRow({accession: 'x', scores: {score: 0.5}})).toBeNull()
  })

  test("a variant with no gnomAD record reports 'NA' across the namespace → null", () => {
    const unannotated = row({
      gnomad_af: 'NA',
      gnomad_ac: 'NA',
      gnomad_an: 'NA',
      gnomad_faf95_max: 'NA',
      gnomad_faf95_max_ancestry: 'NA',
      gnomad_id: 'NA',
      gnomad_version: 'NA'
    })
    expect(gnomadFromVariantRow(unannotated)).toBeNull()
  })

  test.each(['gnomad_af', 'gnomad_ac', 'gnomad_an', 'gnomad_id'] as const)(
    'a missing %s makes the record unusable → null',
    (field) => {
      expect(gnomadFromVariantRow(row({[field]: 'NA'}))).toBeNull()
    }
  )

  test('FAF95 is optional — absent leaves the rest intact', () => {
    const result = gnomadFromVariantRow(row({gnomad_faf95_max: 'NA', gnomad_faf95_max_ancestry: 'NA'}))
    expect(result).toMatchObject({alleleFrequency: 1.86e-6, faf95Max: null, faf95MaxAncestry: null})
  })

  test('a zero allele frequency is a real value, not a missing one', () => {
    expect(gnomadFromVariantRow(row({gnomad_af: 0, gnomad_ac: 0}))).toMatchObject({
      alleleFrequency: 0,
      alleleCount: 0
    })
  })

  test('an absent version degrades gracefully rather than dropping the record', () => {
    expect(gnomadFromVariantRow(row({gnomad_version: 'NA'}))?.dbVersion).toBe('unknown')
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
