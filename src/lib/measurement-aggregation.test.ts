import {describe, expect, it} from 'vitest'

import {aggregateByScoreSet} from '@/lib/measurement-aggregation'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

function m(overrides: Partial<AlleleMeasurement>): AlleleMeasurement {
  return {
    variantUrn: 'urn:mavedb:x#1',
    relationship: 'nucleotide_encoding',
    assayLevel: 'cdna',
    scoreSetUrn: 'urn:mavedb:x',
    scoreSetTitle: 'Score set X',
    ...overrides
  } as AlleleMeasurement
}

function classified(fc: string): AlleleMeasurement['preferredClassification'] {
  return {functionalClassification: fc} as AlleleMeasurement['preferredClassification']
}

describe('aggregateByScoreSet', () => {
  it('collapses a score set’s many nucleotide encodings into one entry with a score range', () => {
    const result = aggregateByScoreSet([
      m({scoreSetUrn: 'urn:s1', scoreSetTitle: 'Findlay', score: -2.0, preferredClassification: classified('abnormal')}),
      m({scoreSetUrn: 'urn:s1', scoreSetTitle: 'Findlay', score: -1.7, preferredClassification: classified('abnormal')}),
      m({scoreSetUrn: 'urn:s1', scoreSetTitle: 'Findlay', score: -1.9, preferredClassification: classified('abnormal')})
    ])
    expect(result).toHaveLength(1)
    expect(result[0].measurements).toHaveLength(3)
    expect(result[0].level).toBe('nucleotide')
    expect(result[0].classifications).toEqual(['abnormal'])
    expect(result[0].scoreRange).toEqual({min: -2.0, max: -1.7})
  })

  it('separates distinct score sets and sorts the more-corroborated one first', () => {
    const result = aggregateByScoreSet([
      m({scoreSetUrn: 'urn:solo', scoreSetTitle: 'Giacomelli', assayLevel: 'protein', score: -2.1}),
      m({scoreSetUrn: 'urn:many', scoreSetTitle: 'Findlay', score: -2.0}),
      m({scoreSetUrn: 'urn:many', scoreSetTitle: 'Findlay', score: -1.8})
    ])
    expect(result.map((s) => s.scoreSetTitle)).toEqual(['Findlay', 'Giacomelli'])
    expect(result[0].measurements).toHaveLength(2)
    expect(result[1].level).toBe('protein')
  })

  it('flags a score set that assayed both levels as mixed and surfaces internal disagreement', () => {
    const result = aggregateByScoreSet([
      m({scoreSetUrn: 'urn:s', assayLevel: 'protein', preferredClassification: classified('abnormal')}),
      m({scoreSetUrn: 'urn:s', assayLevel: 'cdna', preferredClassification: classified('normal')})
    ])
    expect(result[0].level).toBe('mixed')
    expect(new Set(result[0].classifications)).toEqual(new Set(['abnormal', 'normal']))
  })

  it('returns a null score range when no measurement carries a score', () => {
    const result = aggregateByScoreSet([m({scoreSetUrn: 'urn:s', score: null})])
    expect(result[0].scoreRange).toBeNull()
  })
})
