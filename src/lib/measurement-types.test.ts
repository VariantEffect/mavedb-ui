import {describe, expect, it} from 'vitest'

import {
  assayLevelBucket,
  displayedClassification,
  dominantAssayLevel,
  evidenceCode,
  formatEvidenceCode,
  RELATIONSHIP_KEY_SECTION,
  SELECTED_MEASUREMENT_TAG,
  YOUR_VARIANT_TAG
} from '@/lib/measurement-types'

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

describe('RELATIONSHIP_KEY_SECTION', () => {
  it('defines the Your variant tag with its chip styling', () => {
    expect(RELATIONSHIP_KEY_SECTION.terms[0]).toMatchObject(YOUR_VARIANT_TAG)
  })

  it('defines the Selected measurement tag the clinical table moves with the selection', () => {
    expect(RELATIONSHIP_KEY_SECTION.terms).toContainEqual(expect.objectContaining(SELECTED_MEASUREMENT_TAG))
  })

  it('covers both page perspectives on a nucleotide change', () => {
    const labels = RELATIONSHIP_KEY_SECTION.terms.map((t) => t.label)
    expect(labels).toContain('Encodes the same protein change')
    expect(labels).toContain('Encodes this protein change')
  })
})

describe('displayedClassification', () => {
  const base = {
    variantUrn: 'urn:mavedb:00000001-a-1#1',
    relationship: 'direct',
    scoreSetUrn: 'urn:mavedb:00000001-a-1',
    scoreSetTitle: 'Score set',
    isCurrent: true
  } as const
  const call = (functionalClassification: string) => ({functionalClassification}) as never

  it('prefers the clinical-grade call', () => {
    expect(
      displayedClassification({
        ...base,
        preferredClassification: call('normal'),
        researchUseOnlyClassification: call('abnormal')
      })
    ).toEqual({classification: call('normal'), researchUseOnly: false})
  })

  it('falls back to the research-use-only call, flagged', () => {
    expect(displayedClassification({...base, researchUseOnlyClassification: call('abnormal')})).toEqual({
      classification: call('abnormal'),
      researchUseOnly: true
    })
  })

  it('returns null when neither call exists', () => {
    expect(displayedClassification({...base})).toBeNull()
  })
})

describe('evidenceCode', () => {
  it('joins the criterion and upper-cased strength', () => {
    expect(evidenceCode({acmgClassification: {criterion: 'PS3', evidenceStrength: 'moderate'}} as never)).toBe(
      'PS3_MODERATE'
    )
  })

  it('returns null without an evidence strength or classification', () => {
    expect(evidenceCode({acmgClassification: {criterion: 'PS3', evidenceStrength: null}} as never)).toBeNull()
    expect(evidenceCode({} as never)).toBeNull()
    expect(evidenceCode(null)).toBeNull()
  })
})

describe('formatEvidenceCode', () => {
  it('title-cases the strength and abbreviates Plus', () => {
    expect(formatEvidenceCode('PS3_MODERATE_PLUS')).toBe('PS3 Moderate+')
    expect(formatEvidenceCode('bs3_strong')).toBe('BS3 Strong')
  })

  it('leaves a bare criterion alone', () => {
    expect(formatEvidenceCode('PS3')).toBe('PS3')
  })

  it('title-cases every word of a non-ACMG code', () => {
    expect(formatEvidenceCode('NOT_PROVIDED')).toBe('Not Provided')
  })
})
