import {ref, watch, type Ref} from 'vue'
import axios from 'axios'
import config from '@/config'

interface CacheEntry {
  data: Record<string, unknown> | null
  loading: boolean
  error: Error | null
  timestamp: number
}

interface EntityCache {
  [urn: string]: CacheEntry
}

const cache = ref<EntityCache>({})
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Composable for caching API entity fetches with a shared, TTL-based store.
 *
 * Deduplicates concurrent requests for the same URN, caches results for 5
 * minutes, and provides invalidation and force-refresh methods. The cache is
 * module-level (shared across all component instances).
 *
 * Used by: ExperimentSetView.vue, ExperimentView.vue, ScoreSetView.vue
 *
 * @example
 * ```ts
 * const { getEntity, invalidateCache } = useEntityCache()
 * const scoreSet = await getEntity('scoreSet', 'urn:mavedb:00000001-a-1')
 * ```
 */
/**
 * Return type for {@link useEntityCache}.
 *
 * Provides methods for fetching, caching, invalidating, and refreshing
 * API entities (score sets, experiments, experiment sets) with automatic
 * request deduplication and a 5-minute TTL.
 */
export interface UseEntityCacheReturn {
  /** Fetch an entity by type and URN, returning a cached result when available. */
  getEntity: (entityType: string, urn: string, forceRefresh?: boolean) => Promise<Record<string, unknown> | null>
  /** Remove one or all entries from the cache. Pass no argument to clear everything. */
  invalidateCache: (urn?: string) => void
  /** Force-refresh a single entity, bypassing the cache TTL. */
  refreshEntity: (entityType: string, urn: string) => Promise<Record<string, unknown> | null>
  /** The raw reactive cache store (module-level, shared across instances). */
  cache: Ref<EntityCache>
}

export function useEntityCache(): UseEntityCacheReturn {
  const isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL
  }

  const getEntity = async (entityType: string, urn: string, forceRefresh = false) => {
    // Return cached value if available and valid
    if (!forceRefresh && cache.value[urn]?.data && isCacheValid(cache.value[urn])) {
      return cache.value[urn].data
    }

    // If another caller is already fetching this URN, wait for that request
    // instead of starting a duplicate.
    if (cache.value[urn]?.loading) {
      return new Promise((resolve, reject) => {
        // Guard against indefinite hangs: if the original request never
        // settles (e.g. network hang), reject after 30 seconds.
        const timeout = setTimeout(() => {
          unwatch()
          reject(new Error(`Timed out waiting for ${urn}`))
        }, 30_000)

        const unwatch = watch(
          () => cache.value[urn],
          (value) => {
            // The cache entry can be removed via invalidateCache() while we
            // are waiting. Without this guard, `value.loading` would throw.
            if (!value) {
              clearTimeout(timeout)
              unwatch()
              reject(new Error(`Cache entry for ${urn} was removed`))
              return
            }
            if (!value.loading) {
              clearTimeout(timeout)
              unwatch()
              if (value.error) {
                reject(value.error)
              } else {
                resolve(value.data)
              }
            }
          }
        )
      })
    }

    // Initialize cache entry
    cache.value[urn] = {data: null, loading: true, error: null, timestamp: Date.now()}

    try {
      const endpoint = {
        scoreSet: 'score-sets',
        experiment: 'experiments',
        experimentSet: 'experiment-sets'
      }[entityType]

      if (!endpoint) {
        throw new Error(`Unknown entity type: ${entityType}`)
      }

      const response = await axios.get(`${config.apiBaseUrl}/${endpoint}/${urn}`)
      cache.value[urn] = {data: response.data, loading: false, error: null, timestamp: Date.now()}
      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      cache.value[urn] = {data: null, loading: false, error: err, timestamp: Date.now()}
      throw error
    }
  }

  const invalidateCache = (urn?: string) => {
    if (urn) {
      delete cache.value[urn]
    } else {
      cache.value = {}
    }
  }

  const refreshEntity = async (entityType: string, urn: string) => {
    return getEntity(entityType, urn, true)
  }

  return {
    getEntity,
    invalidateCache,
    refreshEntity,
    cache
  }
}
