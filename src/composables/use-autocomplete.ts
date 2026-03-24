import {ref, type Ref} from 'vue'
import axios from 'axios'

import config from '@/config'

interface UseAutocompleteOptions<T = unknown> {
  /** HTTP method. Defaults to 'GET'. */
  method?: 'GET' | 'POST'
  /** Maximum number of items to fetch. Defaults to 500. */
  limit?: number
  /** Full URL override. When set, `path` is ignored. */
  url?: string
  /** Extract the items array from the response data. Defaults to identity (expects a plain array). */
  extract?: (data: unknown) => T[]
}

export interface UseAutocompleteReturn<T = unknown> {
  /** Reactive list of fetched items. */
  items: Ref<T[]>
  /** Whether a request is currently in-flight. */
  loading: Ref<boolean>
  /**
   * Fetch items from the endpoint.
   * - For GET endpoints: `query` is appended as a query string (ignored if empty).
   * - For POST endpoints: `query` is sent as the request body `{ text: query }`.
   *   Pass an object for a custom body shape.
   */
  search: (query?: string | Record<string, unknown>) => Promise<void>
}

/**
 * Low-level composable for fetching a list of items from an API endpoint.
 *
 * Provides a reactive `items` array and a `search()` method with automatic
 * request cancellation (only the latest request's results are kept). Supports
 * both GET and POST endpoints.
 *
 * This is the building block for higher-level composables — not typically used
 * directly in components.
 *
 * Used by: usePublicationIdentifiers, useKeywordOptions, useTargetGeneEditor
 *
 * @param path - API path relative to `config.apiBaseUrl` (e.g. '/controlled-keywords/delivery method')
 * @param options - HTTP method, limit, or full URL override
 *
 * @example
 * ```ts
 * const { items, search } = useAutocomplete<Taxonomy>('/taxonomies/search', { method: 'POST' })
 * await search('human')  // items.value now contains matching taxonomies
 * ```
 */
export function useAutocomplete<T = unknown>(path: string, options: UseAutocompleteOptions<T> = {}): UseAutocompleteReturn<T> {
  const {method = 'GET', limit = 500, url: urlOverride, extract} = options

  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)

  let abortController: AbortController | null = null

  async function search(query?: string | Record<string, unknown>) {
    // Cancel any in-flight request
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    loading.value = true

    try {
      const baseUrl = urlOverride || `${config.apiBaseUrl}${path}`

      let response
      if (method === 'POST') {
        const body = typeof query === 'object' && query !== null ? query : query ? {text: query} : {}
        response = await axios.post(baseUrl, body, {
          params: {limit},
          signal: controller.signal
        })
      } else {
        response = await axios.get(baseUrl, {
          params: {limit},
          signal: controller.signal
        })
      }

      items.value = extract ? extract(response.data) : Array.isArray(response.data) ? response.data : []
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.warn(`[useAutocomplete] search failed for ${path}:`, error)
      items.value = []
    } finally {
      if (abortController === controller) {
        loading.value = false
      }
    }
  }

  return {items, loading, search}
}
