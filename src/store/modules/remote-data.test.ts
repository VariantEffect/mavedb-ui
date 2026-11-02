import axios from 'axios'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {BUSY_DETAIL_PREFIX} from '@/lib/busy-retry.ts'
import makeRemoteDataModule from '@/store/modules/remote-data'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {...actual, default: {...actual.default, get: vi.fn()}}
})

const URL_A = 'https://api.example/score-sets/a/variants'
const URL_B = 'https://api.example/score-sets/b/variants'
const busyError = {
  isAxiosError: true,
  response: {status: 503, data: {detail: `${BUSY_DETAIL_PREFIX}.`}, headers: {'retry-after': '10'}}
}
const get = axios.get as unknown as ReturnType<typeof vi.fn>

// Drives the module the way Vuex would, without Vuex, whose types don't resolve under this package's exports.
function makeStore() {
  const module = makeRemoteDataModule()
  const state = module.state()
  const commit = (type: string, payload?: unknown) =>
    (module.mutations as Record<string, (state: unknown, payload?: unknown) => void>)[type](state, payload)
  return {state, loadData: (dataUrl: string) => module.actions.loadData({commit}, {dataUrl})}
}

describe('remote-data loadData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('stays loading while the server is busy, then loads', async () => {
    get.mockRejectedValueOnce(busyError).mockResolvedValueOnce({data: ['a']})
    const store = makeStore()

    const loading = store.loadData(URL_A)
    await vi.advanceTimersByTimeAsync(0)

    expect(store.state.dataStatus).toBe('Loading')
    expect(store.state.busyRetry).toEqual({retry: 1, maxRetries: 3, delayMs: 10_000})

    await vi.advanceTimersByTimeAsync(10_000)
    await loading

    expect(store.state.dataStatus).toBe('Loaded')
    expect(store.state.data).toEqual(['a'])
    expect(store.state.busyRetry).toBeNull()
  })

  test('fails, noting the server was busy, once retries run out', async () => {
    get.mockRejectedValue(busyError)
    const store = makeStore()

    const loading = store.loadData(URL_A)
    await vi.advanceTimersByTimeAsync(3 * 10_000)
    await loading

    expect(get).toHaveBeenCalledTimes(4)
    expect(store.state.dataStatus).toBe('Failed')
    expect(store.state.failedServerBusy).toBe(true)
    expect(store.state.busyRetry).toBeNull()
  })

  test('fails at once on other errors', async () => {
    get.mockRejectedValue(new Error('boom'))
    const store = makeStore()

    await store.loadData(URL_A)

    expect(get).toHaveBeenCalledTimes(1)
    expect(store.state.dataStatus).toBe('Failed')
    expect(store.state.failedServerBusy).toBe(false)
  })

  test('a newer load abandons one still waiting out a busy server', async () => {
    get.mockImplementation((url: string) =>
      url === URL_A ? Promise.reject(busyError) : Promise.resolve({data: ['b']})
    )
    const store = makeStore()

    const first = store.loadData(URL_A)
    await vi.advanceTimersByTimeAsync(0)
    await store.loadData(URL_B)
    await vi.advanceTimersByTimeAsync(60_000)
    await first

    expect(get.mock.calls.filter(([url]) => url === URL_A)).toHaveLength(1)
    expect(store.state.dataStatus).toBe('Loaded')
    expect(store.state.data).toEqual(['b'])
  })
})
