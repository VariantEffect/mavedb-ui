import {describe, expect, it} from 'vitest'

import {CHROMOSOME_REFSEQ_IDS, gnomadIdToHgvsCandidates, parseGnomadId} from './gnomad'

/** The GRCh38 translation of a gnomAD ID, which is the one tried first. */
function grch38Hgvs(gnomadId: string): string | undefined {
  return gnomadIdToHgvsCandidates(gnomadId)[0]
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

  it('returns GRCh38 first, then GRCh37', () => {
    expect(gnomadIdToHgvsCandidates('17-7676154-G-C')).toEqual([
      'NC_000017.11:g.7676154G>C',
      'NC_000017.10:g.7676154G>C'
    ])
  })

  it('uses the shared rCRS accession for the mitochondrion in both assemblies', () => {
    expect(gnomadIdToHgvsCandidates('M-8993-T-G')).toEqual(['NC_012920.1:g.8993T>G', 'NC_012920.1:g.8993T>G'])
  })

  it('returns no candidates for an unparseable ID', () => {
    expect(gnomadIdToHgvsCandidates('not-an-id')).toEqual([])
  })

  it('returns no candidates when the alleles describe no change', () => {
    expect(gnomadIdToHgvsCandidates('1-55516888-A-A')).toEqual([])
    expect(gnomadIdToHgvsCandidates('1-55516888-AT-AT')).toEqual([])
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
