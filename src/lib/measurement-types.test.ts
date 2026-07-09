import {describe, expect, it} from 'vitest'

import {assayLevelBucket, dominantAssayLevel} from '@/lib/measurement-types'

describe('assayLevelBucket', () => {
  it('returns "protein" for protein', () => {
    expect(assayLevelBucket('protein')).toBe('protein')
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
