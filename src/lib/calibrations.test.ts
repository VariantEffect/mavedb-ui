import {describe, expect, it} from 'vitest'
import Papa from 'papaparse'

import type {DraftScoreCalibration} from '@/lib/calibration-types'
import {
  buildControlPlacements,
  calibrationClassesCsv,
  calibrationVersionLinks,
  calibrationVersionStatus,
  chooseDefaultCalibration,
  isClassBasedCalibration,
  orderCalibrationOptions,
  prepareCalibrationVersion,
  toCalibrationPayload,
  unclassifiedCallLabel,
  type ScoreCalibration
} from '@/lib/calibrations'

/** A range as the API serves it: identified by id, which is what each control's placement points at. */
const range = (id: number, label: string, functionalClassification: string) =>
  ({id, label, functionalClassification}) as never

const strong = range(1, 'PS3_strong', 'abnormal')
const moderate = range(2, 'PS3_moderate', 'abnormal')
const normal = range(3, 'BS3_supporting', 'normal')
const ranges = [strong, moderate, normal]

describe('buildControlPlacements', () => {
  // Each control carries its server-resolved placement (functionalClassificationId) directly.
  const controls = [
    {clinicalStatus: 'pathogenic', functionalClassificationId: 1},
    {clinicalStatus: 'pathogenic', functionalClassificationId: 2},
    {clinicalStatus: 'pathogenic', functionalClassificationId: 3}, // discordant
    {clinicalStatus: 'benign', functionalClassificationId: 3},
    {clinicalStatus: 'benign', functionalClassificationId: 1}, // discordant
    {clinicalStatus: 'pathogenic', functionalClassificationId: null} // filed under no range
  ] as const

  it('keeps controls in the specific range they are filed under, not just the band', () => {
    const p = buildControlPlacements([...controls], ranges)

    expect(p.byRange.get(strong)).toEqual({pathogenic: 1, benign: 1})
    expect(p.byRange.get(moderate)).toEqual({pathogenic: 1, benign: 0})
    expect(p.byRange.get(normal)).toEqual({pathogenic: 1, benign: 1})
    expect(p.placedTotal).toBe(5)
    expect(p.concordant).toBe(3)
    expect(p.discordant).toBe(2)
    expect(p.unplaced).toBe(1)
    expect(p.pathogenicTotal).toBe(4)
    expect(p.benignTotal).toBe(2)
  })

  it('places class-based ranges, which carry no numeric interval at all', () => {
    const classA = {id: 10, label: 'Class A', class: 'A', functionalClassification: 'abnormal'} as never
    const classB = {id: 11, label: 'Class B', class: 'B', functionalClassification: 'normal'} as never
    const p = buildControlPlacements(
      [
        {clinicalStatus: 'pathogenic', functionalClassificationId: 10},
        {clinicalStatus: 'benign', functionalClassificationId: 11}
      ],
      [classA, classB]
    )
    expect(p.byRange.get(classA)).toEqual({pathogenic: 1, benign: 0})
    expect(p.byRange.get(classB)).toEqual({pathogenic: 0, benign: 1})
    expect(p.concordant).toBe(2)
  })

  it('seeds a tally for every range, including ones no control is filed under', () => {
    const p = buildControlPlacements([{clinicalStatus: 'benign', functionalClassificationId: 3}], ranges)
    expect(p.byRange.get(strong)).toEqual({pathogenic: 0, benign: 0})
    expect(p.byRange.get(normal)).toEqual({pathogenic: 0, benign: 1})
  })

  it('counts a landing in an unclassified range separately from concordance', () => {
    const unspecified = range(4, 'Unspecified', 'not_specified')
    const p = buildControlPlacements([{clinicalStatus: 'pathogenic', functionalClassificationId: 4}], [unspecified])
    expect(p.unclassified).toBe(1)
    expect(p.placedTotal).toBe(1)
    expect(p.concordant).toBe(0)
    expect(p.discordant).toBe(0)
  })

  it('counts a control filed under a range this calibration does not carry as unplaced', () => {
    const p = buildControlPlacements([{clinicalStatus: 'pathogenic', functionalClassificationId: 999}], ranges)
    expect(p.unplaced).toBe(1)
    expect(p.placedTotal).toBe(0)
  })

  it('treats a control with no server-resolved placement as unplaced', () => {
    const p = buildControlPlacements(
      controls.map((c) => ({...c, functionalClassificationId: null})),
      ranges
    )
    expect(p.unplaced).toBe(6)
    expect(p.placedTotal).toBe(0)
  })

  it('handles missing controls and missing ranges', () => {
    expect(buildControlPlacements(null, ranges).placedTotal).toBe(0)
    const p = buildControlPlacements([{clinicalStatus: 'pathogenic', functionalClassificationId: 1}], null)
    expect(p.unplaced).toBe(1)
    expect(p.byRange.size).toBe(0)
  })
})

describe('orderCalibrationOptions', () => {
  const cal = (title: string, flags: Partial<ScoreCalibration> = {}) => ({title, ...flags}) as ScoreCalibration

  it('orders primary, then clinical-grade, then research-use-only, alphabetical within each tier', () => {
    const ordered = orderCalibrationOptions([
      cal('Zeta RUO', {researchUseOnly: true}),
      cal('Beta'),
      cal('Alpha RUO', {researchUseOnly: true}),
      cal('Primary', {primary: true}),
      cal('Alpha')
    ])
    expect(ordered.map((c) => c.title)).toEqual(['Primary', 'Alpha', 'Beta', 'Alpha RUO', 'Zeta RUO'])
  })

  it('does not mutate its input and tolerates a missing list', () => {
    const input = [cal('B'), cal('A')]
    orderCalibrationOptions(input)
    expect(input.map((c) => c.title)).toEqual(['B', 'A'])
    expect(orderCalibrationOptions(null)).toEqual([])
  })
})

describe('unclassifiedCallLabel', () => {
  const withClasses = (...classes: Array<string | null>) =>
    ({functionalClassifications: classes.map((c) => ({class: c}))}) as unknown as ScoreCalibration

  it('names range-based and class-based gaps differently', () => {
    expect(unclassifiedCallLabel(withClasses(null, null))).toBe('Outside calibrated ranges')
    expect(unclassifiedCallLabel(withClasses('A', 'B'))).toBe('Not in a calibrated class')
  })

  it('treats a calibration with no classifications, or mixed ones, as range-based', () => {
    expect(isClassBasedCalibration(withClasses())).toBe(false)
    expect(isClassBasedCalibration(withClasses('A', null))).toBe(false)
  })
})

describe('toCalibrationPayload', () => {
  const draft = {
    title: 'Investigator calibration',
    disease: {code: 'MONDO:0015263', label: 'Brugada syndrome'},
    controls: [{variantUrn: 'urn:mavedb:00000001-a-1#1', clinicalStatus: 'pathogenic'}],
    controlsCount: 1,
    __original: {title: ''}
  } as never as DraftScoreCalibration & {__original: unknown}

  it('sends the disease as its MONDO code', () => {
    expect(toCalibrationPayload(draft).disease).toBe('MONDO:0015263')
  })

  it('sends a null disease when none is selected', () => {
    expect(toCalibrationPayload({...draft, disease: null}).disease).toBeNull()
  })

  it('omits editor-only fields and loaded controls', () => {
    const payload = toCalibrationPayload(draft)
    expect(payload).not.toHaveProperty('__original')
    expect(payload).not.toHaveProperty('controlsCount')
    expect(payload).not.toHaveProperty('controls')
    expect(payload.title).toBe('Investigator calibration')
  })

  it('leaves the draft unchanged', () => {
    toCalibrationPayload(draft)
    expect(draft.disease).toEqual({code: 'MONDO:0015263', label: 'Brugada syndrome'})
    expect(draft.controls).toHaveLength(1)
  })
})

describe('calibration versions', () => {
  it('copies class memberships using the API CSV headers and escapes class labels', () => {
    const calibration = {
      functionalClassifications: [{id: 1, class: 'abnormal, strong'}]
    } as ScoreCalibration
    const memberships = [{functionalClassificationId: 1, variants: [{urn: 'urn:variant:1'}]}] as never
    const csv = calibrationClassesCsv(calibration, memberships)
    expect(Papa.parse(csv, {header: true}).data).toEqual([
      {variant_urn: 'urn:variant:1', class_name: 'abnormal, strong'}
    ])
  })

  it('never defaults to a superseded version, even if it has preferred flags', () => {
    const old = {
      urn: 'old',
      primary: true,
      investigatorProvided: true,
      supersedingCalibrationUrn: 'new',
      hasPublishedReplacement: true
    } as ScoreCalibration
    const current = {urn: 'new'} as ScoreCalibration
    expect(chooseDefaultCalibration([old, current])).toBe(current)
    expect(chooseDefaultCalibration([old])).toBeNull()
    expect(orderCalibrationOptions([old, current])).toEqual([current, old])
  })

  it('still defaults to a calibration whose only replacement is a draft', () => {
    // The api names a draft replacement to users who may read it; until it's published, nothing is superseded.
    const current = {
      urn: 'current',
      primary: true,
      supersedingCalibrationUrn: 'draft',
      hasPublishedReplacement: false
    } as ScoreCalibration
    const draft = {urn: 'draft', private: true} as ScoreCalibration
    expect(chooseDefaultCalibration([current, draft])).toBe(current)
    expect(orderCalibrationOptions([draft, current])[0]).toBe(current)
  })

  it('links each version to the ones before and after it, with their status', () => {
    const first = {urn: 'first', supersedingCalibrationUrn: 'second', hasPublishedReplacement: true} as ScoreCalibration
    const second = {
      urn: 'second',
      supersededCalibrationUrn: 'first',
      supersedingCalibrationUrn: 'third'
    } as ScoreCalibration
    const third = {urn: 'third', supersededCalibrationUrn: 'second', private: true} as ScoreCalibration
    const all = [first, second, third]

    expect(calibrationVersionLinks(first, all)).toEqual([{urn: 'second', label: 'Superseded by', calibration: second}])
    expect(calibrationVersionLinks(second, all)).toEqual([
      {urn: 'first', label: 'Previous version', calibration: first},
      {urn: 'third', label: 'Draft new version', calibration: third}
    ])
    expect(all.map(calibrationVersionStatus)).toEqual(['Superseded', 'Published', 'Draft'])
  })

  it('still links a version missing from the given calibrations', () => {
    const current = {urn: 'current', supersededCalibrationUrn: 'old'} as ScoreCalibration
    expect(calibrationVersionLinks(current, null)).toEqual([{urn: 'old', label: 'Previous version', calibration: null}])
    expect(calibrationVersionLinks({urn: 'lone'} as ScoreCalibration, [current])).toEqual([])
  })

  it('copies an independent draft and requires a fresh PHI affirmation for copied controls', () => {
    const original = {
      urn: 'original',
      primary: true,
      private: false,
      controlsNotPhi: true,
      controls: [{variantUrn: 'variant', clinicalStatus: 'benign'}],
      functionalClassifications: [{label: 'Normal'}]
    } as DraftScoreCalibration
    const draft = prepareCalibrationVersion(original)
    expect(draft.urn).toBeNull()
    expect(draft.supersededCalibrationUrn).toBe('original')
    expect(draft.private).toBe(true)
    expect(draft.primary).toBe(false)
    expect(draft.controlsNotPhi).toBeNull()
    draft.functionalClassifications![0].label = 'Updated'
    expect(original.functionalClassifications![0].label).toBe('Normal')
    expect(original.controlsNotPhi).toBe(true)
  })
})
