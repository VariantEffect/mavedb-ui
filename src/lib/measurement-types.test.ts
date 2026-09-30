import {describe, expect, it} from 'vitest'

import {assayLevelBucket, dominantAssayLevel, RELATIONSHIPS, RELATIONSHIP_KEY_SECTION} from '@/lib/measurement-types'

describe('assayLevelBucket', () => {
  it('returns "amino acid" for protein', () => {
    expect(assayLevelBucket('protein')).toBe('amino acid')
  })

  it('returns "nucleotide" for cdna', () => {
    expect(assayLevelBucket('cdna')).toBe('nucleotide')
  })

  it('returns "nucleotide" for genomic', () => {
    expect(assayLevelBucket('genomic')).toBe('nucleotide')
  })

  it('returns "nucleotide" for null', () => {
    expect(assayLevelBucket(null)).toBe('nucleotide')
  })

  it('returns "nucleotide" for undefined', () => {
    expect(assayLevelBucket(undefined)).toBe('nucleotide')
  })
})

describe('dominantAssayLevel', () => {
  it('returns the most common non-null level', () => {
    expect(dominantAssayLevel(['cdna', 'protein', 'cdna'])).toBe('cdna')
  })

  it('returns the most common level when all levels are the same', () => {
    expect(dominantAssayLevel(['protein', 'protein', 'protein'])).toBe('protein')
  })

  it('returns the first level when there is a tie', () => {
    expect(dominantAssayLevel(['cdna', 'protein', 'cdna', 'protein'])).toBe('cdna')
  })

  it('returns null when no levels are provided', () => {
    expect(dominantAssayLevel([])).toBeNull()
  })

  it('returns null when all levels are null', () => {
    expect(dominantAssayLevel([null, null])).toBeNull()
  })

  it('returns null when all levels are undefined', () => {
    expect(dominantAssayLevel([undefined, undefined])).toBeNull()
  })

  it('ignores null and undefined levels', () => {
    expect(dominantAssayLevel(['cdna', null, 'protein', undefined, 'cdna'])).toBe('cdna')
  })
})

describe('RELATIONSHIPS', () => {
  it('flags a direct measurement as Direct', () => {
    expect(RELATIONSHIPS.direct.label).toBe('Direct')
  })

  it('flags both related-variant relationships with the same Indirect badge', () => {
    expect(RELATIONSHIPS.protein_consequence).toEqual(RELATIONSHIPS.nucleotide_encoding)
    expect(RELATIONSHIPS.protein_consequence.label).toBe('Indirect')
  })

  it('defines exactly the labels its badges can show in the Key drawer', () => {
    const badgeLabels = new Set(Object.values(RELATIONSHIPS).map((r) => r.label))
    expect(new Set(RELATIONSHIP_KEY_SECTION.terms.map((t) => t.label))).toEqual(badgeLabels)
  })
})
