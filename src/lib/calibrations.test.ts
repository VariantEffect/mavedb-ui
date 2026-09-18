import {describe, expect, it} from 'vitest'

import {buildControlPlacements} from '@/lib/calibrations'

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
