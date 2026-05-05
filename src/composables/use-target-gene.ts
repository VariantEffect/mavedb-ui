import axios from 'axios'
import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {useAutocomplete, type UseAutocompleteReturn} from '@/composables/use-autocomplete'
import config from '@/config'
import {suggestionsForAutocomplete} from '@/lib/form-helpers'
import {normalizeIdentifier, validateIdentifier} from '@/lib/identifiers'
import {
  EXTERNAL_GENE_DATABASES,
  emptyTargetGene,
  type EditableIdentifierOffset,
  type TargetGene,
  type TransformedTargetGene
} from '@/lib/target-genes'
import type {components} from '@/schema/openapi'

type ExternalGeneIdentifier = components['schemas']['ExternalGeneIdentifier']
type Taxonomy = components['schemas']['Taxonomy']
type TargetGeneWithScoreSetUrn = components['schemas']['TargetGeneWithScoreSetUrn']

/** Shape of PrimeVue AutoComplete events with a query string. */
interface AutoCompleteQueryEvent {
  query?: string
}

/** Shape of PrimeVue AutoComplete option-select events. */
interface AutoCompleteSelectEvent {
  value: TargetGeneWithScoreSetUrn
}

/** Shape of PrimeVue AutoComplete change events. */
interface AutoCompleteChangeEvent {
  value: string | null
}

/** Gene name option shape (from /hgvs/genes). */
export interface GeneNameOption {
  name: string
}

// Re-export for consumers
export type {TransformedTargetGene}

/** Public ref interface for parent components accessing TargetEditor via $refs. */
export interface TargetEditorRef {
  getPayload: (opts: {isBaseEditor: boolean}) => TransformedTargetGene | null
  reset: () => void
  save: () => boolean
}

export interface TargetGeneEditorProps {
  targetSequenceMode: string | null
  isMultiTarget: boolean
  errorPrefix: string
}

/**
 * Composable for the target gene editor form.
 *
 * Owns the full target gene editing lifecycle: reactive form state, search
 * autocomplete instances (taxonomy, identifiers, gene names, accessions),
 * external identifier validation, accession fetching, and API payload
 * construction. Supports both sequence-based and coordinate-based targets.
 *
 * Mirrors `useCalibrationEditor` in structure — both are "editor composables"
 * that own form state for a complex sub-form.
 *
 * Used by: TargetEditor.vue
 *
 * @example
 * ```ts
 * const target = useTargetGeneEditor({ targetSequenceMode: 'sequence', isMultiTarget: false, errorPrefix: '' })
 * // Bind target.targetGene fields to TargetFields
 * // On save: const payload = target.getPayload({ isBaseEditor: false })
 * ```
 */
/**
 * Return type for {@link useTargetGeneEditor}.
 *
 * Owns the full target gene editing lifecycle: reactive form state, search
 * autocomplete instances, external identifier validation, accession fetching,
 * and API payload construction for both sequence-based and coordinate-based targets.
 */
export interface UseTargetGeneEditorReturn {
  // ─── Suggestion lists ───────────────────────────────────────────────────
  /** Autocomplete suggestions for external gene identifiers, keyed by database name. */
  targetIdentifierSuggestions: ComputedRef<Record<string, ExternalGeneIdentifier[]>>
  /** Autocomplete suggestions for taxonomy search. */
  targetTaxonomySuggestions: ComputedRef<Taxonomy[]>
  /** Autocomplete suggestions for existing target genes (from user's score sets). */
  targetGeneSuggestions: ComputedRef<TargetGeneWithScoreSetUrn[]>

  // ─── Loading states & option lists ──────────────────────────────────────
  /** Whether the target gene autocomplete search is in-flight. */
  targetGeneSearchLoading: Ref<boolean>
  /** Whether the taxonomy autocomplete search is in-flight. */
  targetTaxonomySearchLoading: Ref<boolean>
  /** Raw autocomplete instances for external identifier searches, keyed by database name. */
  targetIdentifierSearches: Record<string, UseAutocompleteReturn<ExternalGeneIdentifier>>
  /** Reactive list of gene name options (from HGVS). */
  targetGeneNames: ComputedRef<GeneNameOption[]>
  /** Reactive list of genome assembly names. */
  targetAssemblies: Ref<string[]>

  // ─── Form state ─────────────────────────────────────────────────────────
  /** Available target type options ('Sequence' or 'Coordinates'). */
  targetTypeOptions: string[]
  /** The reactive target gene form model. */
  targetGene: Ref<TargetGene>
  /** The existing target gene loaded for autofill, or null. */
  existingTargetGene: Ref<TargetGeneWithScoreSetUrn | null>
  /** Selected taxonomy for sequence-based targets. */
  taxonomy: Ref<Taxonomy | null>
  /** Selected genome assembly for coordinate-based targets. */
  assembly: Ref<string | null>
  /** Selected gene name for coordinate-based targets. */
  geneName: Ref<GeneNameOption | null>
  /** Whether the accession is relative to a chromosome (vs. a gene). */
  isRelativeToChromosome: Ref<boolean>
  /** Currently selected target type ('Sequence' or 'Coordinates'). */
  targetType: Ref<string>
  /** Which external databases have linked accessions enabled. */
  linkedAccessions: Ref<Record<string, boolean>>
  /** Accession suggestions from assembly-based HGVS lookup. */
  assemblySuggestions: Ref<string[]>
  /** Accession suggestions from gene-name-based HGVS lookup. */
  geneNameAccessionSuggestions: Ref<string[]>
  /** Filtered accession suggestions shown in the autocomplete dropdown. */
  targetGeneAccessionSuggestions: Ref<string[]>

  // ─── Computed ───────────────────────────────────────────────────────────
  /** Whether the editor is in sequence mode (vs. coordinate mode). */
  isSequenceMode: ComputedRef<boolean>
  /** Accession suggestions list with a fallback empty entry. */
  accessionSuggestionsList: ComputedRef<string[]>
  /** Whether the "switch to protein accession" button should be shown. */
  showSwitchToProteinButton: ComputedRef<boolean>
  /** Whether the current form state passes basic validity checks. */
  isValid: ComputedRef<boolean>

  // ─── Event handlers ─────────────────────────────────────────────────────
  /** Autofill form state from an existing target gene selection. */
  onAutofillFromExisting: (event: AutoCompleteSelectEvent) => void
  /** Update an external identifier field (identifier or offset). */
  onExternalIdentifierUpdate: (dbName: string, field: string, value: EditableIdentifierOffset['identifier'] | number | null) => void
  /** Validate and normalize an external identifier on blur. */
  onIdentifierBlur: (dbName: string) => void
  /** Handle AutoComplete change for an external identifier. */
  onIdentifierChanged: (dbName: string, event: AutoCompleteChangeEvent) => void
  /** Update the selected gene name. */
  onGeneUpdate: (value: GeneNameOption | null) => void

  // ─── Search methods ─────────────────────────────────────────────────────
  /** Search for existing target genes by query. */
  searchTargetGenes: (event: AutoCompleteQueryEvent) => void
  /** Search for taxonomies by query. */
  searchTaxonomies: (event: AutoCompleteQueryEvent) => void
  /** Clear the taxonomy selection. */
  clearTaxonomySearch: () => void
  /** Search for external identifiers by database name and query. */
  searchIdentifiers: (dbName: string, event: AutoCompleteQueryEvent) => void

  // ─── Accession methods ──────────────────────────────────────────────────
  /** Fetch and filter accession suggestions for the autocomplete dropdown. */
  fetchTargetAccessions: (event: AutoCompleteQueryEvent) => void
  /** Swap a nucleotide accession for its protein equivalent. */
  swapNucleotideProteinAccessions: () => Promise<{error?: string; info?: string}>

  // ─── File / form management ─────────────────────────────────────────────
  /** Clear the target sequence file data. */
  fileClear: () => void
  /** Reset all form state to defaults. */
  reset: () => void
  /** Build the API-ready target gene payload. */
  getPayload: (overrides?: {isBaseEditor?: boolean}) => TransformedTargetGene | null
}

export function useTargetGeneEditor(props: TargetGeneEditorProps): UseTargetGeneEditorReturn {
  // ─── Search infrastructure (internal) ────────────────────────────────────
  const targetIdentifierSearches: Record<string, UseAutocompleteReturn<ExternalGeneIdentifier>> = {}
  for (const dbName of EXTERNAL_GENE_DATABASES) {
    targetIdentifierSearches[dbName] = useAutocomplete<ExternalGeneIdentifier>(
      `/target-gene-identifiers/search?db_name=${dbName}`,
      {method: 'POST'}
    )
  }

  const targetTaxonomySearch = useAutocomplete<Taxonomy>('/taxonomies/search', {method: 'POST'})
  const targetGeneNameSearch = useAutocomplete<string>('/hgvs/genes')
  const targetAssemblySearch = useAutocomplete<string>('/hgvs/assemblies')
  const targetGeneSearch = useAutocomplete<TargetGeneWithScoreSetUrn>('/me/target-genes/search', {method: 'POST'})

  // Load static option lists immediately
  targetGeneNameSearch.search()
  targetAssemblySearch.search()

  // Pre-formatted suggestion lists
  const targetIdentifierSuggestions = computed(() =>
    Object.fromEntries(
      EXTERNAL_GENE_DATABASES.map((dbName) => [
        dbName,
        suggestionsForAutocomplete(targetIdentifierSearches[dbName]?.items.value ?? [])
      ])
    )
  )

  const targetTaxonomySuggestions = computed(() => suggestionsForAutocomplete(targetTaxonomySearch.items.value ?? []))

  const targetGeneSuggestions = computed(() => {
    const genes = targetGeneSearch.items.value ?? []
    const filtered = genes.filter((g) => g?.targetSequence?.sequence && g?.targetSequence?.sequenceType)
    return suggestionsForAutocomplete(filtered)
  })

  const targetGeneNames = computed<GeneNameOption[]>(() => {
    const names = targetGeneNameSearch.items.value ?? []
    if (names.length === 0) return [{} as GeneNameOption]
    return names.map((name) => ({name}))
  })

  const targetAssemblies = targetAssemblySearch.items

  // ─── Form state ──────────────────────────────────────────────────────────
  const targetTypeOptions = ['Sequence', 'Coordinates']

  const targetGene = ref(emptyTargetGene())
  const existingTargetGene = ref<TargetGeneWithScoreSetUrn | null>(null)
  const taxonomy = ref<Taxonomy | null>(null)
  const assembly = ref<string | null>(null)
  const geneName = ref<GeneNameOption | null>(null)
  const isRelativeToChromosome = ref(false)
  const targetType = ref('Sequence')
  const linkedAccessions = ref<Record<string, boolean>>(
    Object.fromEntries(EXTERNAL_GENE_DATABASES.map((dbName) => [dbName, false]))
  )

  // Accession suggestions (from HGVS lookups)
  const assemblySuggestions = ref<string[]>([])
  const geneNameAccessionSuggestions = ref<string[]>([])
  const targetGeneAccessionSuggestions = ref<string[]>([])

  // ─── Computed ────────────────────────────────────────────────────────────
  const isSequenceMode = computed(() => {
    if (props.targetSequenceMode !== null) return props.targetSequenceMode === 'sequence'
    return targetType.value === 'Sequence'
  })

  const accessionSuggestionsList = computed(() => {
    if (!targetGeneAccessionSuggestions.value || targetGeneAccessionSuggestions.value.length === 0) {
      return ['']
    }
    return targetGeneAccessionSuggestions.value
  })

  const showSwitchToProteinButton = computed(() => {
    const regex = /^(NP|ENSP|XP).*$/
    return (
      !!targetGene.value.targetAccession.accession &&
      !isRelativeToChromosome.value &&
      !regex.test(targetGene.value.targetAccession.accession)
    )
  })

  const isValid = computed(() => {
    const tg = targetGene.value
    if (isSequenceMode.value) {
      return !!(
        tg.name &&
        tg.category &&
        tg.targetSequence.sequence &&
        tg.targetSequence.sequenceType &&
        taxonomy.value?.id
      )
    } else {
      return !!(
        tg.name &&
        tg.category &&
        tg.targetAccession.accession &&
        (assembly.value || geneName.value)
      )
    }
  })

  // ─── Watchers ────────────────────────────────────────────────────────────
  watch(
    () => targetGene.value.externalIdentifiers,
    (newValue) => {
      if (!newValue) return
      for (const dbName of EXTERNAL_GENE_DATABASES) {
        const entry = newValue[dbName]
        if (!entry) continue
        const id = entry.identifier
        const hasIdentifier = typeof id === 'object' && id !== null && id.identifier != null
        if (hasIdentifier && entry.offset == null) {
          targetGene.value.externalIdentifiers[dbName].offset = 0
        }
      }
    },
    {deep: true}
  )

  watch(geneName, async (newValue, oldValue) => {
    if (newValue === oldValue) return
    const name = newValue?.name || null
    if (name) {
      geneNameAccessionSuggestions.value = await fetchAccessionsByGene(name)
      if (!targetGene.value.name) {
        targetGene.value.name = name
      }
    }
  })

  watch(assembly, async (newValue, oldValue) => {
    if (newValue === oldValue) return
    const asm = typeof newValue === 'string' ? newValue.trim() : null
    if (asm) {
      assemblySuggestions.value = await fetchAccessionsByAssembly(asm)
    }
  })

  watch(isRelativeToChromosome, () => {
    targetGene.value.targetAccession.accession = null
    targetGeneAccessionSuggestions.value = []
  })

  // ─── Event handlers for TargetFields ─────────────────────────────────────
  function onAutofillFromExisting(event: AutoCompleteSelectEvent) {
    const tg = JSON.parse(JSON.stringify(event.value)) as TargetGene
    if (!tg) return

    if (!tg.targetSequence) {
      tg.targetSequence = {sequenceType: null, sequence: null, label: null, reference: null, taxonomy: null}
      if (props.targetSequenceMode === null) targetType.value = 'Coordinates'
    } else {
      taxonomy.value = tg.targetSequence.taxonomy as Taxonomy | null
      if (props.targetSequenceMode === null) targetType.value = 'Sequence'
    }
    if (!tg.targetAccession) {
      tg.targetAccession = {assembly: null, accession: null, gene: null}
    } else {
      assembly.value = tg.targetAccession.assembly
      isRelativeToChromosome.value = !!tg.targetAccession.assembly && !tg.targetAccession.gene
      geneName.value = tg.targetAccession.gene ? {name: tg.targetAccession.gene} : null
      if (props.targetSequenceMode === null) targetType.value = 'Coordinates'
    }

    const autopopulatedExternalIds: Record<string, EditableIdentifierOffset> = {}
    const linkedAccs: Record<string, boolean> = {}
    for (const dbName of EXTERNAL_GENE_DATABASES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids = (tg as any).externalIdentifiers as Array<{identifier?: {dbName?: string}; offset?: number}> | undefined
      const found = (ids || []).find((ei) => ei.identifier?.dbName === dbName)
      autopopulatedExternalIds[dbName] = found
        ? {identifier: found.identifier as EditableIdentifierOffset['identifier'], offset: found.offset ?? null}
        : {identifier: null, offset: null}
      linkedAccs[dbName] = !!found
    }
    tg.externalIdentifiers = autopopulatedExternalIds
    linkedAccessions.value = linkedAccs
    targetGene.value = tg
  }

  function onExternalIdentifierUpdate(dbName: string, field: string, value: EditableIdentifierOffset['identifier'] | number | null) {
    if (field === 'identifier') {
      targetGene.value.externalIdentifiers[dbName].identifier = value as EditableIdentifierOffset['identifier']
    } else if (field === 'offset') {
      targetGene.value.externalIdentifiers[dbName].offset = value as number | null
    }
  }

  function onIdentifierBlur(dbName: string) {
    const current = targetGene.value.externalIdentifiers[dbName]?.identifier
    if (typeof current === 'string') {
      const text = current.trim()
      if (text === '') {
        targetGene.value.externalIdentifiers[dbName].identifier = null
      } else if (validateIdentifier(dbName, text)) {
        const identifier = normalizeIdentifier(dbName, text)
        targetGene.value.externalIdentifiers[dbName].identifier = {identifier, dbName}
      }
    }
  }

  function onIdentifierChanged(dbName: string, event: AutoCompleteChangeEvent) {
    if (!targetGene.value.externalIdentifiers[dbName]?.offset) {
      targetGene.value.externalIdentifiers[dbName].offset = 0
    }
    const externalIdentifier = targetGene.value.externalIdentifiers[dbName]
    if (!event.value) {
      externalIdentifier.identifier = null
    } else if (typeof externalIdentifier.identifier === 'string' || externalIdentifier.identifier === null) {
      externalIdentifier.identifier = {identifier: event.value, dbName}
    }
  }

  function onGeneUpdate(value: GeneNameOption | null) {
    geneName.value = value
  }

  // ─── Search methods ──────────────────────────────────────────────────────
  function searchTargetGenes(event: AutoCompleteQueryEvent) {
    const searchText = (event.query || '').trim()
    if (searchText.length > 0) {
      targetGeneSearch.search(event.query)
    }
  }

  function searchTaxonomies(event: AutoCompleteQueryEvent) {
    targetTaxonomySearch.search(event.query)
  }

  function clearTaxonomySearch() {
    taxonomy.value = null
  }

  function searchIdentifiers(dbName: string, event: AutoCompleteQueryEvent) {
    const searchText = (event.query || '').trim()
    if (searchText.length > 0) {
      targetIdentifierSearches[dbName]?.search(searchText)
    }
  }

  // ─── Accession methods ───────────────────────────────────────────────────
  function fetchTargetAccessions(event: AutoCompleteQueryEvent) {
    if (isRelativeToChromosome.value) {
      if (assembly.value) {
        targetGeneAccessionSuggestions.value = assemblySuggestions.value
      }
    } else {
      if (geneName.value) {
        targetGeneAccessionSuggestions.value = geneNameAccessionSuggestions.value
      }
    }
    const searchText = (event.query || '').trim()
    if (searchText.length > 0) {
      targetGeneAccessionSuggestions.value = targetGeneAccessionSuggestions.value.filter((s: string) =>
        s?.toLowerCase().includes(searchText.toLowerCase())
      )
    }
  }

  async function fetchAccessionsByAssembly(asmName: string): Promise<string[]> {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/hgvs/${asmName}/accessions`)
      return response.data || []
    } catch (err) {
      console.log('Error while loading accessions by assembly', err)
      return []
    }
  }

  async function fetchAccessionsByGene(gene: string): Promise<string[]> {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/hgvs/gene/${gene}`)
      return response.data || []
    } catch (err) {
      console.log('Error while loading accessions by gene', err)
      return []
    }
  }

  async function swapNucleotideProteinAccessions(): Promise<{error?: string; info?: string}> {
    if (targetGene.value.targetAccession.accession?.startsWith('NP')) {
      return {info: `${targetGene.value.targetAccession.accession} is already a protein accession.`}
    }
    try {
      const response = await axios.get(
        `${config.apiBaseUrl}/hgvs/protein/${targetGene.value.targetAccession.accession}`
      )
      if (!response.data) {
        return {error: `No matching protein accession found for ${targetGene.value.targetAccession.accession}`}
      }
      targetGene.value.targetAccession.accession = response.data || targetGene.value.targetAccession.accession
      return {}
    } catch (err) {
      console.log('Error while loading protein accession', err)
      return {}
    }
  }

  // ─── File handling ───────────────────────────────────────────────────────
  function fileClear() {
    targetGene.value.targetSequence.sequence = null
  }

  // ─── Form management ────────────────────────────────────────────────────
  function reset() {
    taxonomy.value = null
    assembly.value = null
    assemblySuggestions.value = []
    existingTargetGene.value = null
    geneName.value = null
    geneNameAccessionSuggestions.value = []
    targetGeneAccessionSuggestions.value = []
    targetType.value = 'Sequence'
    isRelativeToChromosome.value = false
    linkedAccessions.value = Object.fromEntries(EXTERNAL_GENE_DATABASES.map((dbName) => [dbName, false]))
    fileClear()
    targetGene.value = emptyTargetGene()
  }

  /**
   * Returns the API-ready target object without side effects.
   * The `isBaseEditor` override lets the Creator inject the global flag at collection time.
   */
  function getPayload(overrides?: {isBaseEditor?: boolean}): TransformedTargetGene | null {
    const target = JSON.parse(JSON.stringify(targetGene.value)) as TargetGene

    if (isSequenceMode.value) {
      target.targetSequence.taxonomy = taxonomy.value
      ;(target as Partial<TargetGene>).targetAccession = undefined
    } else {
      target.targetAccession.assembly = typeof assembly.value === 'string' ? assembly.value.trim() : null
      target.targetAccession.gene = geneName.value?.name || null
      if (overrides?.isBaseEditor != null) {
        ;(target.targetAccession as TransformedTargetGene['targetAccession'] & {isBaseEditor?: boolean}).isBaseEditor =
          overrides.isBaseEditor
      }
      ;(target as Partial<TargetGene>).targetSequence = undefined
    }

    // Transform external identifiers from object to array format
    const externalIdentifiersArray = Object.keys(target.externalIdentifiers)
      .filter((dbName: string) => linkedAccessions.value[dbName])
      .map((dbName: string) => {
        const identifierOffset = target.externalIdentifiers[dbName]
        if (identifierOffset.identifier != null || (identifierOffset != null && (identifierOffset.offset ?? 0) > 0)) {
          const id = typeof identifierOffset.identifier === 'object' ? identifierOffset.identifier?.identifier : undefined
          return {
            offset: identifierOffset.offset,
            identifier: {
              identifier: id,
              dbName
            }
          }
        }
        return null
      })
      .filter(Boolean)

    return {
      ...target,
      targetSequence: target.targetSequence ?? null,
      targetAccession: target.targetAccession ?? null,
      externalIdentifiers: externalIdentifiersArray
    } as TransformedTargetGene
  }

  return {
    // Suggestion lists (for template bindings)
    targetIdentifierSuggestions,
    targetTaxonomySuggestions,
    targetGeneSuggestions,

    // Loading states
    targetGeneSearchLoading: targetGeneSearch.loading,
    targetTaxonomySearchLoading: targetTaxonomySearch.loading,
    targetIdentifierSearches,
    targetGeneNames,
    targetAssemblies,

    // Form state
    targetTypeOptions,
    targetGene,
    existingTargetGene,
    taxonomy,
    assembly,
    geneName,
    isRelativeToChromosome,
    targetType,
    linkedAccessions,
    assemblySuggestions,
    geneNameAccessionSuggestions,
    targetGeneAccessionSuggestions,

    // Computed
    isSequenceMode,
    accessionSuggestionsList,
    showSwitchToProteinButton,
    isValid,

    // Event handlers
    onAutofillFromExisting,
    onExternalIdentifierUpdate,
    onIdentifierBlur,
    onIdentifierChanged,
    onGeneUpdate,

    // Search methods
    searchTargetGenes,
    searchTaxonomies,
    clearTaxonomySearch,
    searchIdentifiers,

    // Accession methods
    fetchTargetAccessions,
    swapNucleotideProteinAccessions,

    // File / form management
    fileClear,
    reset,
    getPayload
  }
}
