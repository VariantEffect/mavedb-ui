import _ from 'lodash'
import type {AutoCompleteCompleteEvent} from 'primevue/autocomplete'
import {ref, computed, watch, type ComputedRef, type Ref} from 'vue'

import {useAutocomplete} from '@/composables/use-autocomplete'
import {suggestionsForAutocomplete, buildPublicationPayload} from '@/lib/form-helpers'
import type {components} from '@/schema/openapi'

export type SavedPublicationIdentifier = components['schemas']['SavedPublicationIdentifier']
export type ExternalPublicationIdentifier = components['schemas']['ExternalPublicationIdentifier']
export type PublicationIdentifier = SavedPublicationIdentifier | ExternalPublicationIdentifier

/**
 * Composable that manages publication identifier data state and search.
 *
 * Owns the reactive publication lists (all + primary), autocomplete search
 * against both internal and external publication APIs, primary-removed-from-list
 * cleanup, and API payload construction with the primary/secondary split.
 *
 * This is distinct from `useReferenceFields`, which handles the *UI interaction
 * glue* (tag-field blur/update events, toast feedback, emit calls).
 *
 * Used by: ExperimentCreator.vue, ExperimentEditor.vue, ScoreSetCreator.vue,
 *          ScoreSetEditor.vue, useCalibrationEditor
 *
 * @example
 * ```ts
 * const pubs = usePublicationIdentifiers()
 * // Bind pubs.publicationIdentifiers to the form
 * // On save: const payload = pubs.getPublicationPayload()
 * ```
 */
/**
 * Return type for {@link usePublicationIdentifiers}.
 *
 * Manages publication identifier data state: reactive publication lists,
 * autocomplete search against internal and external APIs, primary/secondary
 * split maintenance, and API payload construction.
 */
export interface UsePublicationIdentifiersReturn {
  /** Reactive list of all publication identifiers attached to the entity. */
  publicationIdentifiers: Ref<PublicationIdentifier[]>
  /** Reactive list of publication identifiers marked as primary. */
  primaryPublicationIdentifiers: Ref<PublicationIdentifier[]>
  /** Combined, de-duplicated suggestion list from internal + external search. */
  publicationIdentifierSuggestionsList: ComputedRef<PublicationIdentifier[]>
  /** True while either the internal or external publication search is in-flight. */
  publicationSearchLoading: ComputedRef<boolean>
  /** Trigger publication autocomplete search from a PrimeVue AutoComplete event. */
  searchPublicationIdentifiers: (event: AutoCompleteCompleteEvent) => void
  /** Populate publication state from an API response's primary/secondary arrays. */
  loadPublications: (primary: PublicationIdentifier[], secondary: PublicationIdentifier[]) => void
  /** Build the primary/secondary split payload for API submission. */
  getPublicationPayload: () => ReturnType<typeof buildPublicationPayload>
  /** Reset all publication state to empty. */
  clearPublications: () => void
}

export function usePublicationIdentifiers(): UsePublicationIdentifiersReturn {
  const pubSearch = useAutocomplete<PublicationIdentifier>('/publication-identifiers/search', {method: 'POST'})
  const externalPubSearch = useAutocomplete<ExternalPublicationIdentifier>('/publication-identifiers/search-external', {method: 'POST'})

  const publicationIdentifiers: Ref<PublicationIdentifier[]> = ref([])
  const primaryPublicationIdentifiers: Ref<PublicationIdentifier[]> = ref([])

  const publicationSearchLoading = computed(() => pubSearch.loading.value || externalPubSearch.loading.value)

  const publicationIdentifierSuggestionsList = computed(() => {
    const combined = _.unionBy(pubSearch.items.value, externalPubSearch.items.value, 'identifier')
    return suggestionsForAutocomplete(combined)
  })

  // Clear primary selection when the selected primary publication is removed
  // from the list. We intentionally do NOT auto-select a primary in the UI
  // when there is exactly one publication — auto-selection only happens at
  // save time (see getPublicationPayload()) so the UI stays predictable.
  watch(
    publicationIdentifiers,
    (newValue) => {
      if (
        primaryPublicationIdentifiers.value.length > 0 &&
        !newValue.map((pi) => pi.identifier).includes(primaryPublicationIdentifiers.value[0].identifier)
      ) {
        primaryPublicationIdentifiers.value = []
      }
    },
    {deep: true}
  )

  function searchPublicationIdentifiers(event: AutoCompleteCompleteEvent) {
    const searchText = (event.query || '').trim()
    if (searchText.length > 0) {
      pubSearch.search(event.query)
      externalPubSearch.search(event.query)
    }
  }

  /**
   * Load publications from an API response object that has separate
   * primaryPublicationIdentifiers and secondaryPublicationIdentifiers arrays.
   * Merges them into the flat publicationIdentifiers list and restores the
   * primary selection.
   */
  function loadPublications(
    primary: PublicationIdentifier[],
    secondary: PublicationIdentifier[]
  ) {
    const merged = _.concat(primary, secondary)
    // Set primary first (before publicationIdentifiers) to prevent the watcher
    // from clearing it when the list changes.
    primaryPublicationIdentifiers.value = primary.filter((pub) =>
      merged.some((pi) => pi.identifier === pub.identifier)
    )
    publicationIdentifiers.value = merged
  }

  /**
   * Build the primary/secondary split payload for API submission.
   * If there is exactly one publication and no explicit primary selection,
   * it is automatically treated as the primary.
   */
  function getPublicationPayload() {
    const effectivePrimary =
      primaryPublicationIdentifiers.value.length === 0 && publicationIdentifiers.value.length === 1
        ? publicationIdentifiers.value
        : primaryPublicationIdentifiers.value
    return buildPublicationPayload(publicationIdentifiers.value, effectivePrimary)
  }

  /** Reset publication state to empty. */
  function clearPublications() {
    publicationIdentifiers.value = []
    primaryPublicationIdentifiers.value = []
  }

  return {
    publicationIdentifiers,
    primaryPublicationIdentifiers,
    publicationIdentifierSuggestionsList,
    publicationSearchLoading,
    searchPublicationIdentifiers,
    loadPublications,
    getPublicationPayload,
    clearPublications
  }
}
