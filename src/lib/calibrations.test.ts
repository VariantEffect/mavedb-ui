import {describe, expect, it} from 'vitest'
import Papa from 'papaparse'

import {cloneDeep} from 'lodash'

import type {DraftFunctionalClassification, DraftScoreCalibration} from '@/lib/calibration-types'
import {
  buildControlPlacements,
  calibrationClassesCsv,
  calibrationDeleteBlocker,
  calibrationHasReplacement,
  calibrationThreadRows,
  calibrationVersionNumbers,
  calibrationVersionClassesCsv,
  calibrationVersionLinks,
  calibrationVersionStatus,
  calibrationVersionSummary,
  chooseDefaultCalibration,
  groupCalibrationVersions,
  isClassBasedCalibration,
  orderCalibrationOptions,
  orderCalibrationThreads,
  prepareCalibrationVersion,
  threadedVersionUrns,
  toCalibrationPayload,
  unclassifiedCallLabel,
  variantUrnsByClassification,
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

  it('keeps each version thread together under its head, ordered by the head', () => {
    const v1 = cal('Alpha', {urn: 'v1', supersedingCalibrationUrn: 'v2', hasPublishedReplacement: true})
    const v2 = cal('Alpha', {urn: 'v2', supersededCalibrationUrn: 'v1', supersedingCalibrationUrn: 'v3'})
    const v3 = cal('Alpha', {urn: 'v3', supersededCalibrationUrn: 'v2', private: true})
    const beta = cal('Beta', {urn: 'beta'})
    const primary = cal('Primary', {urn: 'primary', primary: true})

    const ordered = orderCalibrationOptions([v3, beta, v1, primary, v2])
    expect(ordered.map((c) => c.urn)).toEqual(['primary', 'v2', 'v1', 'v3', 'beta'])
    expect(calibrationVersionNumbers(groupCalibrationVersions(ordered))).toEqual({v1: 1, v2: 2, v3: 3})
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

describe('calibrationDeleteBlocker', () => {
  const cal = (urn: string, flags: Partial<ScoreCalibration> = {}) => ({urn, ...flags}) as ScoreCalibration

  it('allows deleting a standalone calibration and a draft replacement', () => {
    const published = cal('published')
    const draft = cal('draft', {private: true, supersededCalibrationUrn: 'published'})
    expect(calibrationDeleteBlocker(cal('alone'), [])).toBeNull()
    expect(calibrationDeleteBlocker(draft, [published, draft])).toBeNull()
  })

  it.each([
    ['a primary calibration', cal('x', {primary: true}), []],
    ['a published version', cal('x', {supersededCalibrationUrn: 'old'}), []],
    ['a calibration with a published replacement', cal('x', {hasPublishedReplacement: true}), []],
    ['a calibration with a draft replacement it names', cal('x', {supersedingCalibrationUrn: 'draft'}), []],
    [
      'a calibration with a draft replacement in the list',
      cal('x'),
      [cal('draft', {private: true, supersededCalibrationUrn: 'x'})]
    ]
  ])('refuses %s', (_, calibration, related) => {
    expect(calibrationDeleteBlocker(calibration, related)).not.toBeNull()
  })

  it('treats a draft replacement the caller cannot see as no replacement', () => {
    expect(calibrationHasReplacement(cal('x'), [cal('other')])).toBe(false)
  })
})

describe('calibration versions', () => {
  it('copies class memberships using the API CSV headers and escapes class labels', () => {
    const memberships = [{functionalClassificationId: 1, variants: [{urn: 'urn:variant:1'}]}] as never
    const csv = calibrationClassesCsv([
      {className: 'abnormal, strong', variantUrns: variantUrnsByClassification(memberships).get(1) ?? []}
    ])
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

  it('dates published versions by publication, and drafts and untracked versions by creation', () => {
    const created = '2026-09-01'
    const published = '2026-10-27'
    const summary = (flags: Partial<ScoreCalibration>) =>
      calibrationVersionSummary({creationDate: created, ...flags} as ScoreCalibration)

    expect(summary({private: true})).toBe('Draft · created Sep 01, 2026')
    expect(summary({publishedDate: published})).toBe('Published · Oct 27, 2026')
    expect(summary({publishedDate: published, hasPublishedReplacement: true})).toBe(
      'Superseded · published Oct 27, 2026'
    )
    expect(summary({publishedDate: null})).toBe('Published · created Sep 01, 2026')
  })

  it('still links a version missing from the given calibrations', () => {
    const current = {urn: 'current', supersededCalibrationUrn: 'old'} as ScoreCalibration
    expect(calibrationVersionLinks(current, null)).toEqual([{urn: 'old', label: 'Previous version', calibration: null}])
    expect(calibrationVersionLinks({urn: 'lone'} as ScoreCalibration, [current])).toEqual([])
  })

  it('threads each version chain under its newest published version, in chain order', () => {
    const v1 = {
      urn: 'v1',
      title: 'IGVF',
      supersedingCalibrationUrn: 'v2',
      hasPublishedReplacement: true
    } as ScoreCalibration
    const v2 = {
      urn: 'v2',
      title: 'IGVF',
      supersededCalibrationUrn: 'v1',
      supersedingCalibrationUrn: 'v3'
    } as ScoreCalibration
    const v3 = {urn: 'v3', title: 'IGVF', supersededCalibrationUrn: 'v2', private: true} as ScoreCalibration
    const lone = {urn: 'lone', title: 'Lone draft', private: true} as ScoreCalibration

    expect(groupCalibrationVersions([v3, lone, v1, v2])).toEqual([
      {head: lone, versions: [lone]},
      {head: v2, versions: [v1, v2, v3]}
    ])
    expect(groupCalibrationVersions(null)).toEqual([])

    const threads = groupCalibrationVersions([v3, lone, v1, v2])
    expect(threads.flatMap(calibrationThreadRows)).toEqual([lone, v2, v1, v3])
    expect(threadedVersionUrns(threads)).toEqual(new Set(['v1', 'v3']))
  })

  it('starts a thread at a version whose predecessor it was not given', () => {
    const current = {urn: 'current', supersededCalibrationUrn: 'unlisted'} as ScoreCalibration
    expect(groupCalibrationVersions([current])).toEqual([{head: current, versions: [current]}])
  })

  it('orders threads as units by their heads, falling back to rank, title and creation date', () => {
    const thread = (urn: string, flags: Partial<ScoreCalibration> = {}) => {
      const head = {urn, title: urn, creationDate: '2026-01-01', ...flags} as ScoreCalibration
      return {head, versions: [head]}
    }
    const primary = thread('primary', {primary: true, functionalClassifications: [{}] as never})
    const community = thread('community', {functionalClassifications: [{}, {}, {}] as never})
    const investigator = thread('investigator', {investigatorProvided: true})
    const draft = thread('draft', {private: true})
    const all = [draft, community, investigator, primary]
    const urns = (threads: typeof all) => threads.map((t) => t.head.urn)

    expect(urns(orderCalibrationThreads(all))).toEqual(['primary', 'investigator', 'community', 'draft'])
    const ranges = (c: ScoreCalibration) => c.functionalClassifications?.length ?? 0
    expect(urns(orderCalibrationThreads(all, ranges, -1))).toEqual(['community', 'primary', 'investigator', 'draft'])
    expect(urns(orderCalibrationThreads(all, (c) => c.title, 1))).toEqual([
      'community',
      'draft',
      'investigator',
      'primary'
    ])
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

  it("carries each copied class's variants under the class's current name", () => {
    const original = {
      urn: 'original',
      functionalClassifications: [
        {id: 1, class: 'lof'},
        {id: 2, class: 'wt'}
      ]
    } as unknown as DraftScoreCalibration
    const variantUrns = variantUrnsByClassification([
      {functionalClassificationId: 1, variants: [{urn: 'v1'}, {urn: 'v2'}]},
      {functionalClassificationId: 2, variants: [{urn: 'v3'}]}
    ] as never)
    // Renaming, adding and deleting classes all happen on a deep copy of the draft, which must keep the tags.
    const classifications = cloneDeep(prepareCalibrationVersion(original).functionalClassifications!)
    classifications[0].class = 'loss of function'
    classifications.splice(1, 1)
    classifications.push({class: 'new'} as DraftFunctionalClassification)

    const csv = calibrationVersionClassesCsv(classifications, variantUrns)

    expect(Papa.parse(csv, {header: true}).data).toEqual([
      {variant_urn: 'v1', class_name: 'loss of function'},
      {variant_urn: 'v2', class_name: 'loss of function'}
    ])
    expect(JSON.parse(JSON.stringify(classifications[0]))).toEqual({class: 'loss of function', id: 1})
  })
})
