import {describe, expect, it} from 'vitest'

import {isNucleotideHgvs} from '@/lib/mave-hgvs'

describe('isNucleotideHgvs', () => {
  it('recognizes nucleotide-level prefixes, with or without an accession', () => {
    expect(isNucleotideHgvs('NM_003345.4:c.324T>G')).toBe(true)
    expect(isNucleotideHgvs('c.6C>T')).toBe(true)
    expect(isNucleotideHgvs('g.123A>G')).toBe(true)
    expect(isNucleotideHgvs('n.76A>C')).toBe(true)
    expect(isNucleotideHgvs('m.8993T>G')).toBe(true)
  })

  it('rejects protein-level expressions', () => {
    expect(isNucleotideHgvs('NP_000528.2:p.Leu6Gly')).toBe(false)
    expect(isNucleotideHgvs('p.(Leu6Gly)')).toBe(false)
  })

  it('rejects empty / untyped input', () => {
    expect(isNucleotideHgvs(null)).toBe(false)
    expect(isNucleotideHgvs(undefined)).toBe(false)
    expect(isNucleotideHgvs('')).toBe(false)
    expect(isNucleotideHgvs('NA')).toBe(false)
  })
})
