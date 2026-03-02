import {ref, watch} from 'vue'
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

export function useEntityCache() {
  const isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL
  }

  const getEntity = async (entityType: string, urn: string, forceRefresh = false) => {
    // Return cached value if available and valid
    if (!forceRefresh && cache.value[urn]?.data && isCacheValid(cache.value[urn])) {
      return cache.value[urn].data
    }

    // Return if already loading
    if (cache.value[urn]?.loading) {
      // Wait for the existing request to complete
      return new Promise((resolve) => {
        const unwatch = watch(
          () => cache.value[urn],
          (value) => {
            if (!value.loading && value.data) {
              unwatch()
              resolve(value.data)
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
