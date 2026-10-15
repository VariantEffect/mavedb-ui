import {describe, expect, it} from 'vitest'

import {
  assayLevelBucket,
  displayedClassification,
  eligibleCalibrations,
  dominantAssayLevel,
  evidenceCode,
  formatEvidenceCode,
  measurementCall,
  RELATIONSHIP_KEY_SECTION,
  SELECTED_MEASUREMENT_TAG,
  summarizeMeasurementCalls,
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

  it('returns a clinical call unflagged', () => {
    expect(displayedClassification({...base, classification: call('normal')})).toEqual({
      classification: call('normal'),
      researchUseOnly: false
    })
  })

  it('flags a research-use-only call', () => {
    expect(
      displayedClassification({...base, classification: call('abnormal'), classificationIsResearchUseOnly: true})
    ).toEqual({classification: call('abnormal'), researchUseOnly: true})
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

describe('measurementCall', () => {
  const base = {
    variantUrn: 'urn:mavedb:00000001-a-1#1',
    relationship: 'direct',
    scoreSetUrn: 'urn:mavedb:00000001-a-1',
    scoreSetTitle: 'Score set',
    isCurrent: true
  } as const
  const call = (functionalClassification: string) => ({functionalClassification}) as never
  const calibrated = [{functionalClassifications: [call('abnormal')]}] as never

  it('takes the direction of the displayed classification', () => {
    expect(measurementCall({...base, classification: call('abnormal')}, null, false)).toBe('abnormal')
    expect(
      measurementCall({...base, classification: call('normal'), classificationIsResearchUseOnly: true}, null, false)
    ).toBe('normal')
    expect(measurementCall({...base, classification: call('not_specified')}, null, false)).toBe('not_specified')
  })

  it('is unknown for an unclassified row until its score set loads', () => {
    expect(measurementCall(base, null, false)).toBeNull()
  })

  it('tells an unclassified variant from an uncalibrated score set', () => {
    expect(measurementCall(base, calibrated, true)).toBe('unclassified')
    expect(measurementCall(base, [{functionalClassifications: []}] as never, true)).toBe('uncalibrated')
    expect(measurementCall(base, null, true)).toBe('uncalibrated')
  })
})

describe('summarizeMeasurementCalls', () => {
  const measurement = (urn: string, extra: object = {}) =>
    ({
      variantUrn: urn,
      relationship: 'direct',
      scoreSetUrn: urn.split('#')[0],
      scoreSetTitle: 'Score set',
      isCurrent: true,
      ...extra
    }) as never

  it('counts calls in display order and leaves out zero counts', () => {
    const calls = {a: 'unclassified', b: 'abnormal', c: 'unclassified'} as const
    const summary = summarizeMeasurementCalls(
      [measurement('a#1'), measurement('b#1'), measurement('c#1')],
      (m: {scoreSetUrn: string}) => calls[m.scoreSetUrn as keyof typeof calls]
    )

    expect(summary).toEqual({
      total: 3,
      counts: [
        {call: 'abnormal', count: 1},
        {call: 'unclassified', count: 2}
      ],
      researchUseOnlyCount: 0
    })
  })

  it('counts research-use-only calls', () => {
    const ruo = measurement('a#1', {
      classification: {functionalClassification: 'abnormal'},
      classificationIsResearchUseOnly: true
    })

    expect(summarizeMeasurementCalls([ruo], () => 'abnormal')?.researchUseOnlyCount).toBe(1)
  })

  it('is null while any call is unknown', () => {
    expect(
      summarizeMeasurementCalls([measurement('a#1'), measurement('b#1')], (m: {scoreSetUrn: string}) =>
        m.scoreSetUrn === 'a' ? 'normal' : null
      )
    ).toBeNull()
  })
})

describe('eligibleCalibrations', () => {
  const clinical = {title: 'clinical', researchUseOnly: false} as never
  const research = {title: 'research', researchUseOnly: true} as never

  it('drops research-use-only calibrations unless they are shown', () => {
    expect(eligibleCalibrations([clinical, research], false)).toEqual([clinical])
    expect(eligibleCalibrations([clinical, research], true)).toEqual([clinical, research])
    expect(eligibleCalibrations(null, true)).toEqual([])
  })
})
