import pMemoize from 'p-memoize'
import ExpiryMap from 'expiry-map'

/**
 * Default TTL for cached reads — deliberately short.
 *
 * Nearly all of our read data is mutable: the mapping/annotation worker rewrites the layer underneath even
 * "published" score sets, variants, and allele equivalence classes, and it registers/enriches ClinGen
 * alleles. So this cache is dedup-focused, not reuse-focused — its real job is collapsing the page-load
 * request burst (the composables already handle same-page reuse via their own reactive caches). 30s covers
 * that burst plus rapid interaction while bounding worker-driven staleness to well under a minute. Pass a
 * longer `ttlMs` only for data that is genuinely immutable by cache key (e.g. content-addressed lookups).
 */
export const READ_CACHE_TTL_MS = 30 * 1000 // 30 seconds

/**
 * Wrap a promise-returning read with request deduplication + a TTL cache.
 *
 * Concurrent callers for the same key share one in-flight request; a resolved value is reused until it
 * expires. Rejected requests are dropped from the cache (retried on the next call), so a transient failure
 * never sticks. Only use for idempotent GETs whose results this client does not itself mutate — a resource
 * edited through this app would serve stale data for up to the TTL.
 *
 * Keys are content-only: no caller threads the viewer through one. Several responses are viewer-scoped
 * (`scoreCalibrations`, `supersedingScoreSet`), so a cached entry outlives the identity that fetched it —
 * hence {@link clearReadCache} on sign-out. Sign-in navigates away and back, which rebuilds these caches
 * anyway, so it needs no equivalent hook.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirror p-memoize's own function constraint; returning Fn verbatim preserves optional params
export function memoizeRead<Fn extends (...args: any[]) => Promise<unknown>>(
  fn: Fn,
  cacheKey: (...args: Parameters<Fn>) => string,
  ttlMs: number = READ_CACHE_TTL_MS
): Fn {
  const cache = new ExpiryMap<string, Awaited<ReturnType<Fn>>>(ttlMs)
  readCaches.add(cache)
  return pMemoize(fn, {
    cache,
    cacheKey: (args) => cacheKey(...args)
  })
}

// Every cache `memoizeRead` has handed out, so an identity change can drop all of them at once. Only
// `clear()` is needed, so the set is typed to that rather than to ExpiryMap's generics.
const readCaches = new Set<{clear: () => void}>()

/** Drop every memoized read. Call when the viewer changes — cached entries may be viewer-scoped. */
export function clearReadCache(): void {
  for (const cache of readCaches) {
    cache.clear()
  }
}
