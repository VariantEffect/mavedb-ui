import {ref} from 'vue'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {getLeanScoreSetVariants} from '@/api/mavedb/score-sets'
import {useMeasurementCache} from '@/composables/use-measurement-cache'
import {BUSY_DETAIL_PREFIX} from '@/lib/busy-retry.ts'

vi.mock('@/api/mavedb/score-sets', () => ({
  getLeanScoreSetVariants: vi.fn(),
  getScoreSet: vi.fn()
}))
vi.mock('@/api/mavedb/variants', () => ({getVariantDetail: vi.fn()}))

const URN = 'urn:mavedb:00000001-a-1'
const VARIANTS = [{variantUrn: `${URN}#1`, score: 1.5}]
const busyError = {
  isAxiosError: true,
  response: {status: 503, data: {detail: `${BUSY_DETAIL_PREFIX}.`}, headers: {}}
}
const getLean = getLeanScoreSetVariants as unknown as ReturnType<typeof vi.fn>

describe('useMeasurementCache loadScores', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('shows it is waiting on a busy server, then the scores once a retry succeeds', async () => {
    getLean.mockRejectedValueOnce(busyError).mockResolvedValueOnce(VARIANTS)
    const cache = useMeasurementCache(ref(null))

    const loading = cache.loadScores(URN)
    await vi.advanceTimersByTimeAsync(0)

    expect(cache.isScoresLoading(URN)).toBe(true)
    expect(cache.scoresProblem(URN)).toEqual({kind: 'busy', retry: {retry: 1, maxRetries: 3, delayMs: 30_000}})
    expect(cache.scores.value[URN]).toBeUndefined()

    await vi.advanceTimersByTimeAsync(30_000)
    await loading

    expect(getLean).toHaveBeenCalledTimes(2)
    expect(cache.scores.value[URN]).toEqual(VARIANTS)
    expect(cache.scoresProblem(URN)).toBeNull()
    expect(cache.isScoresLoading(URN)).toBe(false)
  })

  test('reports a failure, saying the server was busy, once retries run out', async () => {
    getLean.mockRejectedValue(busyError)
    const cache = useMeasurementCache(ref(null))

    const loading = cache.loadScores(URN)
    await vi.advanceTimersByTimeAsync(3 * 30_000)
    await loading

    expect(getLean).toHaveBeenCalledTimes(4)
    expect(cache.scoresProblem(URN)).toEqual({kind: 'failed', serverBusy: true})
    expect(cache.isScoresLoading(URN)).toBe(false)
  })

  test('reports other failures at once, and loads again when asked', async () => {
    getLean.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(VARIANTS)
    const cache = useMeasurementCache(ref(null))

    await cache.loadScores(URN)
    expect(cache.scoresProblem(URN)).toEqual({kind: 'failed', serverBusy: false})

    await cache.loadScores(URN)
    expect(cache.scores.value[URN]).toEqual(VARIANTS)
    expect(cache.scoresProblem(URN)).toBeNull()
  })

  test('does not start a second load while one waits out a busy server', async () => {
    getLean.mockRejectedValueOnce(busyError).mockResolvedValueOnce(VARIANTS)
    const cache = useMeasurementCache(ref(null))

    const loading = cache.loadScores(URN)
    await vi.advanceTimersByTimeAsync(0)
    await cache.loadScores(URN)
    await vi.advanceTimersByTimeAsync(30_000)
    await loading

    expect(getLean).toHaveBeenCalledTimes(2)
  })

  test('clear() abandons a load waiting out a busy server', async () => {
    getLean.mockRejectedValueOnce(busyError).mockResolvedValue(VARIANTS)
    const cache = useMeasurementCache(ref(null))

    const loading = cache.loadScores(URN)
    await vi.advanceTimersByTimeAsync(0)
    cache.clear()
    await vi.advanceTimersByTimeAsync(30_000)
    await loading

    expect(getLean).toHaveBeenCalledTimes(1)
    expect(cache.scores.value[URN]).toBeUndefined()
    expect(cache.scoresProblem(URN)).toBeNull()
    expect(cache.isScoresLoading(URN)).toBe(false)
  })
})
