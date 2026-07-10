import {describe, expect, it} from 'vitest'

import {useVariantCoordinates} from '@/composables/use-variant-coordinates'
import type {HgvsField, LeanVariant} from '@/lib/variants'

const {
  coordinateFor,
  getHgvsNt,
  getHgvsPro,
  labelForVariant,
  levelAvailable,
  sequenceTypeOptions,
  resolveLevel
} = useVariantCoordinates()

function field(hgvs: string, position?: number, ref?: string, alt?: string): HgvsField {
  return {hgvs, position, ref, alt}
}

function variant(overrides: Partial<LeanVariant>): LeanVariant {
  return {variantUrn: 'urn:mavedb:00000001-a-1#1', ...overrides} as LeanVariant
}

// A coding assay: measured at the cdna level, projected up to protein and down to genomic.
const dnaAssay = variant({
  variantUrn: 'urn:dna#1',
  hgvsNt: field('c.6C>T', 6, 'C', 'T'),
  hgvsPro: field('p.Leu2Phe', 2, 'Leu', 'Phe'),
  assayLevel: 'cdna',
  mapped: {
    genomic: field('NC_x:g.100C>T', 100, 'C', 'T'),
    cdna: field('NM_x:c.6C>T', 6, 'C', 'T'),
    protein: field('NP_x:p.Leu2Phe', 2, 'Leu', 'Phe')
  }
})

// A genomic assay: measured at the genomic level; cdna is still present as the coding search key.
const genomicAssay = variant({
  variantUrn: 'urn:g#1',
  hgvsNt: field('g.100C>T', 100, 'C', 'T'),
  assayLevel: 'genomic',
  mapped: {
    genomic: field('NC_x:g.100C>T', 100, 'C', 'T'),
    cdna: field('NM_x:c.6C>T', 6, 'C', 'T'),
    protein: field('NP_x:p.Leu2Phe', 2, 'Leu', 'Phe')
  }
})

// A protein assay: measured at the protein level; the c/g fan-out is ambiguous, so only protein is
// filled (mavedb-api#784).
const proteinAssay = variant({
  variantUrn: 'urn:pro#1',
  hgvsPro: field('p.Leu6Gly', 6, 'Leu', 'Gly'),
  assayLevel: 'protein',
  mapped: {protein: field('NP_x:p.Leu6Gly', 6, 'Leu', 'Gly')}
})

describe('coordinateFor — (level, frame) resolution', () => {
  it('raw frame: cdna and genomic both alias hgvsNt regardless of assayLevel', () => {
    // The cdna/genomic distinction only exists in mapped frame; raw frame has one NT field.
    expect(coordinateFor(dnaAssay, 'cdna', 'raw')).toBe(dnaAssay.hgvsNt)
    expect(coordinateFor(dnaAssay, 'genomic', 'raw')).toBe(dnaAssay.hgvsNt)
    expect(coordinateFor(genomicAssay, 'cdna', 'raw')).toBe(genomicAssay.hgvsNt)
    expect(coordinateFor(genomicAssay, 'genomic', 'raw')).toBe(genomicAssay.hgvsNt)
  })

  it('raw frame: protein reads hgvsPro', () => {
    expect(coordinateFor(dnaAssay, 'protein', 'raw')).toBe(dnaAssay.hgvsPro)
    expect(coordinateFor(proteinAssay, 'protein', 'raw')).toBe(proteinAssay.hgvsPro)
  })

  it('mapped frame: each level routes directly to its MappedTriple slot', () => {
    expect(coordinateFor(dnaAssay, 'cdna', 'mapped')).toBe(dnaAssay.mapped!.cdna)
    expect(coordinateFor(dnaAssay, 'genomic', 'mapped')).toBe(dnaAssay.mapped!.genomic)
    expect(coordinateFor(dnaAssay, 'protein', 'mapped')).toBe(dnaAssay.mapped!.protein)
    expect(coordinateFor(genomicAssay, 'genomic', 'mapped')).toBe(genomicAssay.mapped!.genomic)
    expect(coordinateFor(genomicAssay, 'cdna', 'mapped')).toBe(genomicAssay.mapped!.cdna)
    expect(coordinateFor(proteinAssay, 'protein', 'mapped')).toBe(proteinAssay.mapped!.protein)
  })

  it('mapped cdna/genomic are null for a protein assay — never fabricates a coding coordinate (#784)', () => {
    expect(coordinateFor(proteinAssay, 'cdna', 'mapped')).toBeNull()
    expect(coordinateFor(proteinAssay, 'genomic', 'mapped')).toBeNull()
  })

  it('returns null for an absent slot', () => {
    expect(coordinateFor(proteinAssay, 'cdna', 'raw')).toBeNull()
    expect(coordinateFor(variant({}), 'protein', 'raw')).toBeNull()
    expect(coordinateFor(variant({}), 'cdna', 'mapped')).toBeNull()
  })
})

describe('getHgvsNt / getHgvsPro — string convenience over coordinateFor', () => {
  it('getHgvsNt returns hgvsNt directly in raw frame, coding-preferred in mapped frame', () => {
    expect(getHgvsNt(dnaAssay, 'raw')).toBe('c.6C>T')
    expect(getHgvsNt(genomicAssay, 'raw')).toBe('g.100C>T')
    expect(getHgvsNt(dnaAssay, 'mapped')).toBe('NM_x:c.6C>T')
    // Coding-preferred: a genomic-measured variant surfaces its NM_:c. coding key, not the NC_:g. one.
    expect(getHgvsNt(genomicAssay, 'mapped')).toBe('NM_x:c.6C>T')
    expect(getHgvsNt(proteinAssay, 'mapped')).toBeUndefined()
  })

  it('getHgvsNt falls back to genomic when a genomic assay has no coding projection', () => {
    // Deep intronic / intergenic in a genomic set: no cdna slot, so NC_:g. is the sole nucleotide identity.
    const genomicOnly = variant({
      variantUrn: 'urn:g-only#1',
      assayLevel: 'genomic',
      mapped: {genomic: field('NC_x:g.100C>T', 100, 'C', 'T')}
    })
    expect(getHgvsNt(genomicOnly, 'mapped')).toBe('NC_x:g.100C>T')
  })

  it('getHgvsPro returns the resolved protein hgvs string or undefined', () => {
    expect(getHgvsPro(proteinAssay, 'raw')).toBe('p.Leu6Gly')
    expect(getHgvsPro(dnaAssay, 'mapped')).toBe('NP_x:p.Leu2Phe')
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
  it('in raw frame levelAvailable returns true for both cdna and genomic when hgvsNt is present', () => {
    // cdna and genomic alias hgvsNt in raw frame — both are technically available.
    // sequenceTypeOptions collapses them into one option using assayLevel as a label hint.
    expect(levelAvailable([dnaAssay], 'cdna', 'raw')).toBe(true)
    expect(levelAvailable([dnaAssay], 'genomic', 'raw')).toBe(true)
    expect(levelAvailable([genomicAssay], 'cdna', 'raw')).toBe(true)
    expect(levelAvailable([genomicAssay], 'genomic', 'raw')).toBe(true)
  })

  it('sequenceTypeOptions offers one NT option in raw frame labelled Nucleotide, value keyed by assayLevel', () => {
    expect(sequenceTypeOptions([dnaAssay], 'raw')).toEqual([
      {title: 'Nucleotide', value: 'cdna'},
      {title: 'Protein', value: 'protein'}
    ])
    expect(sequenceTypeOptions([genomicAssay], 'raw')).toEqual([{title: 'Nucleotide', value: 'genomic'}])
  })

  it('a cdna assay with all mapped slots offers cdna, genomic, protein in mapped frame', () => {
    expect(sequenceTypeOptions([dnaAssay], 'mapped')).toEqual([
      {title: 'cDNA', value: 'cdna'},
      {title: 'Genomic', value: 'genomic'},
      {title: 'Protein', value: 'protein'}
    ])
  })

  it('a genomic assay offers cdna, genomic, protein in mapped frame', () => {
    expect(sequenceTypeOptions([genomicAssay], 'mapped')).toEqual([
      {title: 'cDNA', value: 'cdna'},
      {title: 'Genomic', value: 'genomic'},
      {title: 'Protein', value: 'protein'}
    ])
  })

  it('a protein assay never offers cdna or genomic — in either frame (#784)', () => {
    expect(sequenceTypeOptions([proteinAssay], 'raw')).toEqual([{title: 'Protein', value: 'protein'}])
    expect(sequenceTypeOptions([proteinAssay], 'mapped')).toEqual([{title: 'Protein', value: 'protein'}])
    expect(levelAvailable([proteinAssay], 'cdna', 'mapped')).toBe(false)
    expect(levelAvailable([proteinAssay], 'genomic', 'mapped')).toBe(false)
  })

  it('availability is a set-wide OR across variants', () => {
    expect(sequenceTypeOptions([dnaAssay, proteinAssay], 'mapped')).toEqual([
      {title: 'cDNA', value: 'cdna'},
      {title: 'Genomic', value: 'genomic'},
      {title: 'Protein', value: 'protein'}
    ])
  })
})

describe('resolveLevel — explicit frame→level coupling', () => {
  it('keeps the desired level when available', () => {
    expect(resolveLevel([dnaAssay], 'protein', 'mapped')).toBe('protein')
    expect(resolveLevel([dnaAssay], 'cdna', 'mapped')).toBe('cdna')
    expect(resolveLevel([dnaAssay], 'genomic', 'mapped')).toBe('genomic')
  })

  it('falls back deterministically when the desired level is stranded', () => {
    expect(resolveLevel([proteinAssay], 'cdna', 'mapped')).toBe('protein')
  })

  it('returns null when no level is available', () => {
    expect(resolveLevel([variant({variantUrn: 'urn:bare'})], 'protein', 'raw')).toBeNull()
  })
})
