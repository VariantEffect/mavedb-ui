import {CanceledError} from 'axios'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ref} from 'vue'

import {useCsvNamespaces, type AvailableCsvNamespace, type CsvNamespaceSection} from './use-csv-namespaces'

const getScoreSetCsvNamespaces = vi.fn()
const getVariantCsvNamespaces = vi.fn()

vi.mock('@/api/mavedb', () => ({
  getScoreSetCsvNamespaces: (...args: unknown[]) => getScoreSetCsvNamespaces(...args),
  getVariantCsvNamespaces: (...args: unknown[]) => getVariantCsvNamespaces(...args)
}))

function entry(
  overrides: Partial<AvailableCsvNamespace> & {
    selectedByDefault?: boolean
    scoreSet?: {urn: string; title: string}
  }
): AvailableCsvNamespace {
  return {
    namespace: 'scores',
    label: 'Scores',
    group: 'data',
    ...overrides
  } as AvailableCsvNamespace
}

const SCORE_SET_ENTRIES: AvailableCsvNamespace[] = [
  entry({namespace: 'scores', label: 'Scores', group: 'data'}),
  entry({namespace: 'gnomad', label: 'gnomAD population frequency', group: 'annotation'}),
  entry({namespace: 'clinvar.2024_11', label: 'ClinVar significance (November 2024)', group: 'annotation'}),
  entry({namespace: 'calibration.urn:mavedb:calibration-1', label: 'Brnich et al. 2019', group: 'calibration'}),
  entry({namespace: 'score_set', label: 'Score set and publications', group: 'provenance'})
]

beforeEach(() => {
  getScoreSetCsvNamespaces.mockReset()
  getVariantCsvNamespaces.mockReset()
})

describe('useCsvNamespaces', () => {
  it('does not fetch until load is called', () => {
    useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    expect(getScoreSetCsvNamespaces).not.toHaveBeenCalled()
  })

  it('loads score set namespaces from the score set endpoint', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {namespaces, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(getScoreSetCsvNamespaces).toHaveBeenCalledOnce()
    expect(getVariantCsvNamespaces).not.toHaveBeenCalled()
    expect(namespaces.value).toHaveLength(5)
  })

  it('loads variant namespaces from the variant endpoint', async () => {
    getVariantCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1#1'), kind: 'variant'})

    await load()

    expect(getVariantCsvNamespaces).toHaveBeenCalledOnce()
    expect(getScoreSetCsvNamespaces).not.toHaveBeenCalled()
  })

  it('groups namespaces into ordered sections, omitting empty ones', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(sections.value.map((section) => section.group)).toEqual(['data', 'annotation', 'calibration', 'provenance'])
    expect(sections.value[1].namespaces.map((entry) => entry.namespace)).toEqual(['gnomad', 'clinvar.2024_11'])
    expect(sections.value[2].title).toBe('Clinical interpretation')
  })

  it('omits sections with no namespaces', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue([entry({namespace: 'scores', group: 'data'})])
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(sections.value.map((section) => section.group)).toEqual(['data'])
  })

  it('serves labels from the API rather than deriving them', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {namespaces, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    const calibration = namespaces.value.find((n) => n.namespace.startsWith('calibration.'))
    expect(calibration?.label).toBe('Brnich et al. 2019')
    const clinvar = namespaces.value.find((n) => n.namespace.startsWith('clinvar.'))
    expect(clinvar?.label).toBe('ClinVar significance (November 2024)')
  })

  it('caches per URN so reopening a dialog does not refetch', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()
    await load()

    expect(getScoreSetCsvNamespaces).toHaveBeenCalledOnce()
  })

  it('refetches when the URN changes', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const urn = ref('urn:mavedb:00000001-a-1')
    const {load} = useCsvNamespaces({urn, kind: 'scoreSet'})

    await load()
    urn.value = 'urn:mavedb:00000001-a-2'
    await load()

    expect(getScoreSetCsvNamespaces).toHaveBeenCalledTimes(2)
  })

  it('does not fetch without a URN', async () => {
    const {load} = useCsvNamespaces({urn: ref(null), kind: 'scoreSet'})

    await load()

    expect(getScoreSetCsvNamespaces).not.toHaveBeenCalled()
  })

  it('reports an error and offers nothing when the request fails', async () => {
    getScoreSetCsvNamespaces.mockRejectedValue(new Error('boom'))
    const {namespaces, hasNamespaces, error, loading, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet'
    })

    await load()

    expect(error.value).toBeTruthy()
    expect(namespaces.value).toEqual([])
    expect(hasNamespaces.value).toBe(false)
    expect(loading.value).toBe(false)
  })

  it('retries after a failure rather than caching the empty result', async () => {
    getScoreSetCsvNamespaces.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(SCORE_SET_ENTRIES)
    const {hasNamespaces, error, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()
    await load()

    expect(getScoreSetCsvNamespaces).toHaveBeenCalledTimes(2)
    expect(error.value).toBeNull()
    expect(hasNamespaces.value).toBe(true)
  })

  it('ignores an aborted request instead of reporting it as an error', async () => {
    getScoreSetCsvNamespaces.mockRejectedValue(new CanceledError('canceled'))
    const {error, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(error.value).toBeNull()
  })

  it('a superseded request neither clears the spinner nor drops the live request', async () => {
    // The abort lands while the second request is still in flight. If the first one's cleanup ran
    // unguarded, the dialog would stop showing a spinner and reset() could no longer abort what is
    // actually loading.
    let resolveSecond: (entries: AvailableCsvNamespace[]) => void = () => {}
    getScoreSetCsvNamespaces
      .mockRejectedValueOnce(new CanceledError('canceled'))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)))

    const urn = ref('urn:mavedb:00000001-a-1')
    const {hasNamespaces, loading, load, reset} = useCsvNamespaces({urn, kind: 'scoreSet'})

    const first = load()
    urn.value = 'urn:mavedb:00000001-a-2'
    const second = load()
    await first

    expect(loading.value).toBe(true)

    reset()
    resolveSecond(SCORE_SET_ENTRIES)
    await second

    // reset() aborted the live request, so its result must not land after the fact.
    expect(hasNamespaces.value).toBe(false)
  })

  it('does not count a formatting extra as a column group', async () => {
    // The Download button is enabled from this count, and a formatting flag produces no columns — that is
    // how an empty `namespaces` request used to slip through and come back as the API's default.
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const extraOptions = ref([{label: "Omit HGVS columns this score set doesn't use", value: 'dropUnusedHgvs'}])
    const {selected, selectedExtras, selectedColumnGroups, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet',
      extraOptions
    })

    await load()
    selected.value = []
    selectedExtras.value = ['dropUnusedHgvs']

    expect(selectedColumnGroups.value).toBe(0)
  })

  it('reset clears loaded namespaces', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {hasNamespaces, load, reset} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()
    expect(hasNamespaces.value).toBe(true)

    reset()

    expect(hasNamespaces.value).toBe(false)
  })
})

describe('useCsvNamespaces selection', () => {
  it('selects everything once the list loads', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, allSelected, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(allSelected.value).toBe(true)
    expect(selected.value).toEqual(SCORE_SET_ENTRIES.map((entry) => entry.namespace))
  })

  it('starts with nothing selected before loading', () => {
    const {selected, allSelected} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    expect(selected.value).toEqual([])
    expect(allSelected.value).toBe(false)
  })

  it('toggleAll clears a full selection', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, allSelected, toggleAll, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet'
    })
    await load()

    toggleAll()

    expect(selected.value).toEqual([])
    expect(allSelected.value).toBe(false)
  })

  it('toggleAll restores everything from an empty selection', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, toggleAll, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})
    await load()

    toggleAll()
    toggleAll()

    expect(selected.value).toHaveLength(SCORE_SET_ENTRIES.length)
  })

  it('toggleAll selects everything from a partial selection', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, toggleAll, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})
    await load()
    selected.value = ['scores']

    toggleAll()

    expect(selected.value).toHaveLength(SCORE_SET_ENTRIES.length)
  })

  it('keeps a narrowed selection when the dialog is reopened for the same record', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})
    await load()
    selected.value = ['scores']

    await load()

    expect(selected.value).toEqual(['scores'])
  })

  it('reselects everything when the record changes', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const urn = ref('urn:mavedb:00000001-a-1')
    const {selected, load} = useCsvNamespaces({urn, kind: 'scoreSet'})
    await load()
    selected.value = ['scores']

    urn.value = 'urn:mavedb:00000001-a-2'
    await load()

    expect(selected.value).toHaveLength(SCORE_SET_ENTRIES.length)
  })

  it('clears the selection when loading fails', async () => {
    getScoreSetCsvNamespaces.mockResolvedValueOnce(SCORE_SET_ENTRIES).mockRejectedValueOnce(new Error('boom'))
    const urn = ref('urn:mavedb:00000001-a-1')
    const {selected, load} = useCsvNamespaces({urn, kind: 'scoreSet'})
    await load()

    urn.value = 'urn:mavedb:00000001-a-2'
    await load()

    expect(selected.value).toEqual([])
  })

  it('summarizes the selection so the picker states it outright', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(SCORE_SET_ENTRIES)
    const {selected, selectionSummary, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet'
    })
    await load()
    expect(selectionSummary.value).toBe('All columns selected')

    selected.value = ['scores', 'gnomad']
    expect(selectionSummary.value).toBe('2 of 5 column groups selected')

    selected.value = []
    expect(selectionSummary.value).toBe('No columns selected')
  })
})

describe('useCsvNamespaces default selection', () => {
  const WITH_RESEARCH_USE_ONLY: AvailableCsvNamespace[] = [
    entry({namespace: 'scores', label: 'Scores', group: 'data'}),
    entry({
      namespace: 'calibration.urn:mavedb:calibration-1',
      label: 'Brnich et al. 2019',
      group: 'calibration'
    }),
    entry({
      namespace: 'calibration.urn:mavedb:calibration-2',
      label: 'Research Use Only: Provisional',
      group: 'calibration',
      selectedByDefault: false
    })
  ]

  it('leaves research-use-only calibrations unchecked on load', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(WITH_RESEARCH_USE_ONLY)
    const {selected, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(selected.value).toEqual(['scores', 'calibration.urn:mavedb:calibration-1'])
  })

  it('still offers them, so a user can opt in', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(WITH_RESEARCH_USE_ONLY)
    const {namespaces, sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    expect(namespaces.value).toHaveLength(3)
    const calibrationSection = sections.value.find((section) => section.group === 'calibration')
    expect(calibrationSection?.namespaces.map((entry) => entry.label)).toContain('Research Use Only: Provisional')
  })

  it('is not fully selected on load when a group is excluded by default', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(WITH_RESEARCH_USE_ONLY)
    const {allSelected, selectionSummary, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet'
    })

    await load()

    expect(allSelected.value).toBe(false)
    expect(selectionSummary.value).toBe('2 of 3 column groups selected')
  })

  it('select all reaches research-use-only groups, since that is an explicit act', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(WITH_RESEARCH_USE_ONLY)
    const {selected, allSelected, toggleAll, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet'
    })
    await load()

    toggleAll()

    expect(allSelected.value).toBe(true)
    expect(selected.value).toContain('calibration.urn:mavedb:calibration-2')
  })
})

describe('useCsvNamespaces extras', () => {
  const NAMESPACE_ENTRIES: AvailableCsvNamespace[] = [
    entry({namespace: 'scores', label: 'Score', group: 'data'}),
    entry({namespace: 'scores_custom', label: 'Investigator-provided score columns', group: 'data'}),
    entry({namespace: 'gnomad', label: 'gnomAD population frequency', group: 'annotation'})
  ]

  const EXTRAS = [{label: "Omit HGVS columns this score set doesn't use", value: 'dropUnusedHgvsColumns'}]

  function withExtras() {
    return useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1'),
      kind: 'scoreSet',
      extraOptions: ref(EXTRAS)
    })
  }

  it('counts only namespaces as column groups', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {totalColumnGroups, load} = withExtras()

    await load()

    // The investigator's score columns are a namespace now, so all three count; the flag does not.
    expect(totalColumnGroups.value).toBe(3)
  })

  it('treats the investigator score columns as an ordinary namespace', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {selected, load} = withExtras()

    await load()

    expect(selected.value).toContain('scores')
    expect(selected.value).toContain('scores_custom')
  })

  it('is still "all selected" while a formatting extra is unchecked', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {selectedExtras, allSelected, load} = withExtras()
    await load()

    selectedExtras.value = []

    expect(allSelected.value).toBe(true)
  })

  it('leaves formatting extras unchecked on load', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {selectedExtras, load} = withExtras()

    await load()

    expect(selectedExtras.value).toEqual([])
  })

  it('select all does not disturb formatting options', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {selectedExtras, toggleAll, load} = withExtras()
    await load()
    selectedExtras.value = ['dropUnusedHgvsColumns']

    toggleAll()
    toggleAll()

    expect(selectedExtras.value).toEqual(['dropUnusedHgvsColumns'])
  })

  it('exposes formatting options for the Options section', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(NAMESPACE_ENTRIES)
    const {formattingExtraOptions, load} = withExtras()

    await load()

    expect(formattingExtraOptions.value.map((o) => o.value)).toEqual(['dropUnusedHgvsColumns'])
  })
})

describe('useCsvNamespaces score set subdivision', () => {
  const ONE_SCORE_SET: AvailableCsvNamespace[] = [
    entry({namespace: 'scores', group: 'data'}),
    entry({
      namespace: 'calibration.urn:mavedb:calibration-1',
      label: 'First Assay Calibration',
      group: 'calibration',
      scoreSet: {urn: 'urn:mavedb:00000001-a-1', title: 'First Assay'}
    })
  ]

  const TWO_SCORE_SETS: AvailableCsvNamespace[] = [
    ...ONE_SCORE_SET,
    entry({
      namespace: 'calibration.urn:mavedb:calibration-2',
      label: 'Second Assay Calibration',
      group: 'calibration',
      scoreSet: {urn: 'urn:mavedb:00000001-a-2', title: 'Second Assay'}
    })
  ]

  function sectionFor(sections: CsvNamespaceSection[], group: string) {
    return sections.find((section) => section.group === group)
  }

  it('does not subdivide when only one score set is represented', async () => {
    getScoreSetCsvNamespaces.mockResolvedValue(ONE_SCORE_SET)
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1'), kind: 'scoreSet'})

    await load()

    const calibrations = sectionFor(sections.value, 'calibration')
    expect(calibrations?.subsections).toHaveLength(1)
    expect(calibrations?.subsections[0].label).toBeNull()
  })

  it('subdivides by score set once more than one is represented', async () => {
    getVariantCsvNamespaces.mockResolvedValue(TWO_SCORE_SETS)
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1#1'), kind: 'variant'})

    await load()

    const calibrations = sectionFor(sections.value, 'calibration')
    // Headed by title, not URN — but the URN comes along for disambiguation.
    expect(calibrations?.subsections.map((s) => s.label)).toEqual(['First Assay', 'Second Assay'])
    expect(calibrations?.subsections.map((s) => s.urn)).toEqual(['urn:mavedb:00000001-a-1', 'urn:mavedb:00000001-a-2'])
    expect(calibrations?.subsections[0].namespaces.map((e) => e.label)).toEqual(['First Assay Calibration'])
    expect(calibrations?.subsections[1].namespaces.map((e) => e.label)).toEqual(['Second Assay Calibration'])
  })

  it('never subdivides sections whose namespaces have no owning score set', async () => {
    getVariantCsvNamespaces.mockResolvedValue(TWO_SCORE_SETS)
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1#1'), kind: 'variant'})

    await load()

    const data = sectionFor(sections.value, 'data')
    expect(data?.subsections).toHaveLength(1)
    expect(data?.subsections[0].label).toBeNull()
  })

  it('keeps the flat list alongside the subdivision', async () => {
    getVariantCsvNamespaces.mockResolvedValue(TWO_SCORE_SETS)
    const {sections, load} = useCsvNamespaces({urn: ref('urn:mavedb:00000001-a-1#1'), kind: 'variant'})

    await load()

    const calibrations = sectionFor(sections.value, 'calibration')
    expect(calibrations?.namespaces).toHaveLength(2)
    expect(calibrations?.subsections.flatMap((s) => s.namespaces)).toHaveLength(2)
  })

  it('still selects everything by default across score sets', async () => {
    getVariantCsvNamespaces.mockResolvedValue(TWO_SCORE_SETS)
    const {selected, allSelected, load} = useCsvNamespaces({
      urn: ref('urn:mavedb:00000001-a-1#1'),
      kind: 'variant'
    })

    await load()

    expect(allSelected.value).toBe(true)
    expect(selected.value).toHaveLength(3)
  })
})
