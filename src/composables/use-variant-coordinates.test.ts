import {describe, expect, it} from 'vitest'

import {useVariantCoordinates} from '@/composables/use-variant-coordinates'
import type {HgvsField, LeanVariant} from '@/lib/variants'

const {coordinateFor, getHgvsNt, getHgvsPro, labelForVariant, levelAvailable, sequenceTypeOptions, resolveLevel} =
  useVariantCoordinates()

function field(hgvs: string, position?: number, ref?: string, alt?: string): HgvsField {
  return {hgvs, position, ref, alt}
}

function variant(overrides: Partial<LeanVariant>): LeanVariant {
  return {variantUrn: 'urn:mavedb:00000001-a-1#1', ...overrides} as LeanVariant
}

// A coding/genomic assay: measured at the nucleotide level, mapped up to protein.
const dnaAssay = variant({
  variantUrn: 'urn:dna#1',
  hgvsNt: field('c.6C>T', 6, 'C', 'T'),
  hgvsPro: field('p.Leu2Phe', 2, 'Leu', 'Phe'),
  assayLevelHgvs: field('NM_x:c.6C>T', 6, 'C', 'T'),
  proteinLevelHgvs: field('NP_x:p.Leu2Phe', 2, 'Leu', 'Phe')
})

// A protein assay: measured at the protein level; there is no mapped coding (mavedb-api#784).
const proteinAssay = variant({
  variantUrn: 'urn:pro#1',
  hgvsPro: field('p.Leu6Gly', 6, 'Leu', 'Gly'),
  assayLevelHgvs: field('NP_x:p.Leu6Gly', 6, 'Leu', 'Gly'),
  proteinLevelHgvs: field('NP_x:p.Leu6Gly', 6, 'Leu', 'Gly')
})

describe('coordinateFor — the 2×2 (level, frame) resolution', () => {
  it('raw frame reads the submitted slots', () => {
    expect(coordinateFor(dnaAssay, 'dna', 'raw')).toBe(dnaAssay.hgvsNt)
    expect(coordinateFor(dnaAssay, 'protein', 'raw')).toBe(dnaAssay.hgvsPro)
  })

  it('mapped protein reads proteinLevelHgvs for either assay type', () => {
    expect(coordinateFor(dnaAssay, 'protein', 'mapped')).toBe(dnaAssay.proteinLevelHgvs)
    expect(coordinateFor(proteinAssay, 'protein', 'mapped')).toBe(proteinAssay.proteinLevelHgvs)
  })

  it('mapped dna reads assayLevelHgvs only when it is nucleotide (coding/genomic assay)', () => {
    expect(coordinateFor(dnaAssay, 'dna', 'mapped')).toBe(dnaAssay.assayLevelHgvs)
  })

  it('mapped dna is null for a protein assay — never fabricates a coding coordinate (#784)', () => {
    expect(coordinateFor(proteinAssay, 'dna', 'mapped')).toBeNull()
  })

  it('returns null for an absent slot', () => {
    expect(coordinateFor(proteinAssay, 'dna', 'raw')).toBeNull() // protein assay has no submitted nt
    expect(coordinateFor(variant({}), 'protein', 'raw')).toBeNull()
  })
})

describe('getHgvsNt / getHgvsPro — string convenience over coordinateFor', () => {
  it('return the resolved hgvs string or undefined', () => {
    expect(getHgvsNt(dnaAssay, 'raw')).toBe('c.6C>T')
    expect(getHgvsNt(dnaAssay, 'mapped')).toBe('NM_x:c.6C>T')
    expect(getHgvsNt(proteinAssay, 'mapped')).toBeUndefined()
    expect(getHgvsPro(proteinAssay, 'raw')).toBe('p.Leu6Gly')
  })
})

describe('labelForVariant — frame coords → submitted HGVS → URN', () => {
  it('prefers protein, in the requested frame', () => {
    expect(labelForVariant(dnaAssay, 'raw')).toBe('p.Leu2Phe')
    expect(labelForVariant(dnaAssay, 'mapped')).toBe('NP_x:p.Leu2Phe')
  })

  it('falls back to nucleotide when protein is absent', () => {
    const ntOnly = variant({variantUrn: 'urn:nt', hgvsNt: field('c.9A>G', 9, 'A', 'G')})
    expect(labelForVariant(ntOnly, 'raw')).toBe('c.9A>G')
  })

  it('in the mapped frame, an unmapped variant falls back to its submitted HGVS, not the URN', () => {
    // No mapped coordinates (unmapped), but a submitted intronic nucleotide string is present.
    const unmappedIntronic = variant({variantUrn: 'urn:intron', hgvsNt: field('c.122-6T>A')})
    expect(labelForVariant(unmappedIntronic, 'mapped')).toBe('c.122-6T>A')
  })

  it('prefers submitted protein over submitted nucleotide in the fallback', () => {
    const unmapped = variant({
      variantUrn: 'urn:u',
      hgvsNt: field('c.6C>T', 6, 'C', 'T'),
      hgvsPro: field('p.Leu2Phe', 2, 'Leu', 'Phe')
    })
    expect(labelForVariant(unmapped, 'mapped')).toBe('p.Leu2Phe')
  })

  it('falls back to splice, then to the URN when no other HGVS exists', () => {
    const spliceOnly = variant({variantUrn: 'urn:sp', hgvsSplice: field('c.1-2A>G')})
    expect(labelForVariant(spliceOnly, 'raw')).toBe('c.1-2A>G')
    expect(labelForVariant(spliceOnly, 'mapped')).toBe('c.1-2A>G')
    expect(labelForVariant(variant({variantUrn: 'urn:bare'}), 'raw')).toBe('urn:bare')
    expect(labelForVariant(variant({variantUrn: 'urn:bare'}), 'mapped')).toBe('urn:bare')
  })
})

describe('levelAvailable / sequenceTypeOptions — availability per frame', () => {
  it('a coding assay offers both levels in both frames', () => {
    expect(sequenceTypeOptions([dnaAssay], 'raw')).toEqual([
      {title: 'DNA', value: 'dna'},
      {title: 'Protein', value: 'protein'}
    ])
    expect(sequenceTypeOptions([dnaAssay], 'mapped')).toEqual([
      {title: 'DNA', value: 'dna'},
      {title: 'Protein', value: 'protein'}
    ])
  })

  it('a protein assay never offers DNA — in either frame (#784)', () => {
    expect(sequenceTypeOptions([proteinAssay], 'raw')).toEqual([{title: 'Protein', value: 'protein'}])
    expect(sequenceTypeOptions([proteinAssay], 'mapped')).toEqual([{title: 'Protein', value: 'protein'}])
    expect(levelAvailable([proteinAssay], 'dna', 'mapped')).toBe(false)
  })

  it('availability is a set-wide OR across variants', () => {
    expect(sequenceTypeOptions([dnaAssay, proteinAssay], 'mapped')).toEqual([
      {title: 'DNA', value: 'dna'},
      {title: 'Protein', value: 'protein'}
    ])
  })
})

describe('resolveLevel — explicit frame→level coupling', () => {
  it('keeps the desired level when available', () => {
    expect(resolveLevel([dnaAssay], 'protein', 'mapped')).toBe('protein')
    expect(resolveLevel([dnaAssay], 'dna', 'mapped')).toBe('dna')
  })

  it('falls back deterministically when the desired level is stranded', () => {
    // Protein assay: desiring DNA in mapped frame falls back to the only available level.
    expect(resolveLevel([proteinAssay], 'dna', 'mapped')).toBe('protein')
  })

  it('returns null when no level is available', () => {
    expect(resolveLevel([variant({variantUrn: 'urn:bare'})], 'protein', 'raw')).toBeNull()
  })
})
