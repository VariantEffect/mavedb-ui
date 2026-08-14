import axios from 'axios'
import {computed, ref, type Ref} from 'vue'

import {getScoreSetCsvNamespaces, getVariantCsvNamespaces} from '@/api/mavedb'
import type {components} from '@/schema/openapi'

export type AvailableCsvNamespace = components['schemas']['AvailableCsvNamespace']
export type CsvNamespaceGroup = components['schemas']['CsvNamespaceGroup']

/** Section headings for a namespace picker, in the order they should be shown. */
const GROUP_ORDER: CsvNamespaceGroup[] = ['data', 'annotation', 'calibration', 'provenance']

const GROUP_TITLES: Record<CsvNamespaceGroup, string> = {
  data: 'Measurements',
  annotation: 'Annotations',
  calibration: 'Clinical interpretation',
  provenance: 'Provenance'
}

export interface CsvNamespaceSubsection {
  /** A heading for this run of namespaces, or null when the section needs no subdivision. */
  label: string | null
  /** The URN behind the heading, for a tooltip or secondary text. Null when there is no heading. */
  urn: string | null
  namespaces: AvailableCsvNamespace[]
}

export interface CsvNamespaceSection {
  group: CsvNamespaceGroup
  title: string
  /** Every namespace in the section, regardless of subdivision. */
  namespaces: AvailableCsvNamespace[]
  /**
   * The namespaces split by owning score set, when more than one is represented; otherwise a single
   * null-labelled subsection that renders as an undivided list. A variant's calibrations can span score
   * sets, and one means nothing against another's scores.
   */
  subsections: CsvNamespaceSubsection[]
}

/**
 * Split a section's namespaces by owning score set, but only when more than one is represented.
 * Headings use the title; the URN comes along for disambiguation, since titles can collide.
 */
function subdivideByScoreSet(namespaces: AvailableCsvNamespace[]): CsvNamespaceSubsection[] {
  const owners = new Map<string, string>()
  for (const entry of namespaces) {
    if (entry.scoreSet) owners.set(entry.scoreSet.urn, entry.scoreSet.title)
  }
  if (owners.size < 2) return [{label: null, urn: null, namespaces}]

  const subsections = [...owners.entries()]
    .sort(([, titleA], [, titleB]) => titleA.localeCompare(titleB))
    .map(([urn, title]) => ({
      label: title,
      urn,
      namespaces: namespaces.filter((entry) => entry.scoreSet?.urn === urn)
    }))

  // Anything without an owner still has to appear somewhere.
  const unowned = namespaces.filter((entry) => !entry.scoreSet)
  return unowned.length > 0 ? [...subsections, {label: null, urn: null, namespaces: unowned}] : subsections
}

/** A query flag that is not a column group, rendered under "Options" and returned as an `extra`. */
export interface CsvExtraOption {
  label: string
  value: string
}

interface UseCsvNamespacesOptions {
  /** The record whose namespaces to offer. Not watched; `load()` refetches when it sees a new URN. */
  urn: Ref<string | null | undefined>
  /** Which endpoint to ask. Variants widen over equivalent measurements; score sets do not. */
  kind: 'scoreSet' | 'variant'
  /** Formatting flags. Which ones an endpoint accepts is the caller's business. */
  extraOptions?: Ref<CsvExtraOption[]>
}

/**
 * Load the CSV column namespaces a record has data for, ready to render as a picker.
 *
 * Fetched lazily — call `load()` when a dialog opens — and cached per URN. Labels and grouping come from
 * the API, which alone knows calibration titles and release dates.
 */
export function useCsvNamespaces({urn, kind, extraOptions}: UseCsvNamespacesOptions) {
  const namespaces = ref<AvailableCsvNamespace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loadedUrn = ref<string | null>(null)
  const controller = ref<AbortController | null>(null)
  const selected = ref<string[]>([])
  const selectedExtras = ref<string[]>([])

  const formattingExtraOptions = computed(() => extraOptions?.value ?? [])

  const sections = computed<CsvNamespaceSection[]>(() =>
    GROUP_ORDER.map((group) => {
      const inGroup = namespaces.value.filter((entry) => entry.group === group)
      return {
        group,
        title: GROUP_TITLES[group],
        namespaces: inGroup,
        subsections: subdivideByScoreSet(inGroup)
      }
    }).filter((section) => section.namespaces.length > 0)
  )

  /** Whether the record has anything at all to offer. False while loading and on error. */
  const hasNamespaces = computed(() => namespaces.value.length > 0)

  /** Column groups on offer. Only namespaces count; checking an extra alone produces no file. */
  const totalColumnGroups = computed(() => namespaces.value.length)

  const selectedColumnGroups = computed(() => selected.value.length)

  const allSelected = computed(
    () => totalColumnGroups.value > 0 && selectedColumnGroups.value === totalColumnGroups.value
  )

  /** Describes the current selection, so the picker never has to explain an implicit rule. */
  const selectionSummary = computed(() => {
    if (selectedColumnGroups.value === 0) return 'No columns selected'
    if (allSelected.value) return 'All columns selected'
    return `${selectedColumnGroups.value} of ${totalColumnGroups.value} column groups selected`
  })

  /** Formatting options are left alone: "Select all" is about columns. */
  function selectAll(): void {
    selected.value = namespaces.value.map((entry) => entry.namespace)
  }

  /**
   * Select the groups the API marks as defaults, and every refinement of them. Research-use-only and
   * rangeless calibrations are offered but excluded, so checking one is a deliberate act.
   */
  function selectDefaults(): void {
    selected.value = namespaces.value
      .filter((entry) => entry.selectedByDefault !== false)
      .map((entry) => entry.namespace)
  }

  /** Select everything, or clear when everything is already selected. */
  function toggleAll(): void {
    if (!allSelected.value) {
      selectAll()
      return
    }
    selected.value = []
  }

  async function load(): Promise<void> {
    if (!urn.value) return
    // Already have this record's list; a namespace set only changes when the record does.
    if (loadedUrn.value === urn.value && namespaces.value.length > 0) return

    controller.value?.abort()
    // Held locally as well: a superseded request must not clear the spinner or drop the live request's
    // controller on its way out, or reset() would no longer be able to abort what is actually in flight.
    const ownController = new AbortController()
    controller.value = ownController

    loading.value = true
    error.value = null
    try {
      const fetcher = kind === 'variant' ? getVariantCsvNamespaces : getScoreSetCsvNamespaces
      const entries = await fetcher(urn.value, ownController.signal)
      if (controller.value !== ownController) return
      namespaces.value = entries
      loadedUrn.value = urn.value
      // Open on the common case and let the user narrow from there. Reopening for the same record
      // short-circuits above, so a previous selection survives rather than being reset.
      selectDefaults()
    } catch (e: unknown) {
      // An aborted request is a superseded one, not a failure to report.
      if (axios.isCancel(e) || controller.value !== ownController) return
      namespaces.value = []
      selected.value = []
      selectedExtras.value = []
      loadedUrn.value = null
      error.value = 'Could not load the available download options.'
    } finally {
      if (controller.value === ownController) {
        loading.value = false
        controller.value = null
      }
    }
  }

  function reset(): void {
    controller.value?.abort()
    controller.value = null
    namespaces.value = []
    selected.value = []
    selectedExtras.value = []
    loadedUrn.value = null
    error.value = null
    loading.value = false
  }

  return {
    namespaces,
    sections,
    hasNamespaces,
    loading,
    error,
    selected,
    selectedExtras,
    formattingExtraOptions,
    totalColumnGroups,
    selectedColumnGroups,
    allSelected,
    selectionSummary,
    selectAll,
    selectDefaults,
    toggleAll,
    load,
    reset
  }
}
