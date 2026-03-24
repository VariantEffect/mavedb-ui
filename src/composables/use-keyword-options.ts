import {KEYWORDS} from '@/data/keywords'
import {useAutocomplete, type UseAutocompleteReturn} from '@/composables/use-autocomplete'
import type {components} from '@/schema/openapi'

type Keyword = components['schemas']['Keyword']

export type KeywordOptionEntry = UseAutocompleteReturn<Keyword>

/**
 * Composable that creates one `useAutocomplete` instance per keyword type.
 *
 * Returns a record of autocomplete instances keyed by keyword `key`, plus a
 * `loadAll()` method to pre-fetch all option lists on mount.
 *
 * Used by: ExperimentCreator.vue, ExperimentEditor.vue
 *
 * @example
 * ```ts
 * const { options, loadAll } = useKeywordOptions()
 * await loadAll()  // pre-fetch all keyword option lists
 * // options['Delivery Method'].items  — reactive list
 * // options['Delivery Method'].search('foo')  — fetch filtered
 * ```
 */
/**
 * Return type for {@link useKeywordOptions}.
 *
 * Provides a record of autocomplete instances (one per keyword type) and
 * a method to pre-fetch all option lists on mount.
 */
export interface UseKeywordOptionsReturn {
  /** Autocomplete instances keyed by keyword key (e.g. 'Delivery Method'). */
  options: Record<string, KeywordOptionEntry>
  /** Fetch all keyword option lists in parallel (call once on mount). */
  loadAll: () => Promise<void>
}

export function useKeywordOptions(): UseKeywordOptionsReturn {
  const options: Record<string, KeywordOptionEntry> = {}

  for (const kw of KEYWORDS) {
    options[kw.key] = useAutocomplete<Keyword>(`/controlled-keywords/${kw.endpoint}`)
  }

  /** Fetch all keyword option lists (call once on mount). */
  async function loadAll() {
    await Promise.all(Object.values(options).map((entry) => entry.search()))
  }

  return {options, loadAll}
}
