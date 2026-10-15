import {describe, expect, it} from 'vitest'

import {
  conceptToDraftDisease,
  diseaseDisplayLabel,
  GENERIC_DISEASE,
  MONDO_GENERIC_CODE,
  toDraftDisease,
  type DiseaseConcept
} from './diseases'

const concept = (code: string, name?: string | null): DiseaseConcept =>
  ({
    conceptType: 'Disease',
    name,
    primaryCoding: {code, system: 'https://purl.obolibrary.org/obo/mondo.owl'}
  }) as DiseaseConcept

describe('conceptToDraftDisease', () => {
  it('extracts code and label from a concept, including the generic term', () => {
    expect(conceptToDraftDisease(concept('MONDO:0015263', 'Brugada syndrome'))).toEqual({
      code: 'MONDO:0015263',
      label: 'Brugada syndrome'
    })
    expect(conceptToDraftDisease(concept(MONDO_GENERIC_CODE, 'disease or disorder'))).toEqual(GENERIC_DISEASE)
  })

  it('falls back to the code when the concept has no name', () => {
    expect(conceptToDraftDisease(concept('MONDO:0015263'))).toEqual({code: 'MONDO:0015263', label: 'MONDO:0015263'})
  })

  it('returns null when there is no concept or no code', () => {
    expect(conceptToDraftDisease(null)).toBeNull()
    expect(conceptToDraftDisease(undefined)).toBeNull()
  })
})

describe('toDraftDisease', () => {
  it('converts a served concept', () => {
    expect(toDraftDisease(concept('MONDO:0015263', 'Brugada syndrome'))).toEqual({
      code: 'MONDO:0015263',
      label: 'Brugada syndrome'
    })
  })

  it('passes through an existing draft selection', () => {
    expect(toDraftDisease({code: 'MONDO:0015263', label: 'Brugada syndrome'})).toEqual({
      code: 'MONDO:0015263',
      label: 'Brugada syndrome'
    })
  })

  it('defaults to the generic term for nullish or code-less input', () => {
    expect(toDraftDisease(null)).toEqual(GENERIC_DISEASE)
    expect(toDraftDisease(undefined)).toEqual(GENERIC_DISEASE)
    expect(toDraftDisease({code: '', label: ''})).toEqual(GENERIC_DISEASE)
  })
})

describe('diseaseDisplayLabel', () => {
  it('pairs the name with its MONDO code, for any disease including the generic term', () => {
    expect(diseaseDisplayLabel(concept('MONDO:0015263', 'Brugada syndrome'))).toBe('Brugada syndrome (MONDO:0015263)')
    expect(diseaseDisplayLabel(concept(MONDO_GENERIC_CODE, 'disease or disorder'))).toBe(
      `disease or disorder (${MONDO_GENERIC_CODE})`
    )
  })

  it('returns null only when the concept is absent', () => {
    expect(diseaseDisplayLabel(null)).toBeNull()
    expect(diseaseDisplayLabel(undefined)).toBeNull()
  })
})
