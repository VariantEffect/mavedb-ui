import axios, {AxiosError, isCancel, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {installRateLimitNotice, isRateLimited, parseRetryAfter} from '@/lib/rate-limit'
import {
  fetchWithRetry,
  installAxiosRetryInterceptor,
  retryDelayMs,
  SERVER_BUSY_MESSAGE,
  serverBusy
} from '@/lib/request-retry'

vi.mock('@/config', () => ({default: {apiBaseUrl: 'https://api.test/api/v1'}}))

const API = 'https://api.test/api/v1'

interface Reply {
  status: number
  headers?: Record<string, string>
}

/** An axios instance whose requests are answered, in order, by *replies*. Records each request's method. */
function client(replies: Reply[]) {
  const requests: string[] = []
  const instance = axios.create({
    adapter: async (config: InternalAxiosRequestConfig) => {
      requests.push(config.method ?? 'get')
      const reply = replies.shift() ?? {status: 200}
      const response = {
        status: reply.status,
        statusText: '',
        headers: reply.headers ?? {},
        data: {},
        config
      } as AxiosResponse
      if (reply.status >= 400) {
        throw new AxiosError(`Request failed with status code ${reply.status}`, undefined, config, null, response)
      }
      return response
    }
  })
  installAxiosRetryInterceptor(instance)
  return {instance, requests}
}

/** Settle *promise* with fake timers running, and report how long it took on the fake clock. */
async function settle<T>(promise: Promise<T>): Promise<{value?: T; error?: unknown; elapsedMs: number}> {
  const start = Date.now()
  const outcome: {value?: T; error?: unknown; done: boolean} = {done: false}
  promise.then(
    (value) => Object.assign(outcome, {value, done: true}),
    (error) => Object.assign(outcome, {error, done: true})
  )
  while (!outcome.done) await vi.advanceTimersByTimeAsync(100)
  return {value: outcome.value, error: outcome.error, elapsedMs: Date.now() - start}
}

const shown = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  shown.mockReset()
  installRateLimitNotice({isSignedIn: () => false, show: shown})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('parseRetryAfter', () => {
  it('reads a number of seconds', () => {
    expect(parseRetryAfter('300')).toBe(300)
  })

  it('reads an HTTP date as seconds from now', () => {
    const now = Date.parse('Wed, 25 Nov 2026 12:00:00 GMT')
    expect(parseRetryAfter('Wed, 25 Nov 2026 12:00:30 GMT', now)).toBe(30)
  })

  it('treats a date in the past as no wait', () => {
    const now = Date.parse('Wed, 25 Nov 2026 12:00:00 GMT')
    expect(parseRetryAfter('Wed, 25 Nov 2026 11:00:00 GMT', now)).toBe(0)
  })

  it('returns null for a missing or unreadable header', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter(undefined)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })
})

describe('retryDelayMs', () => {
  it('waits for Retry-After', () => {
    expect(retryDelayMs('GET', 503, '2', 0, 0)).toBe(2000)
  })

  it('waits five seconds when Retry-After is missing', () => {
    expect(retryDelayMs('get', 503, undefined, 0, 0)).toBe(5000)
  })

  it('retries a 429 as well as a 503', () => {
    expect(retryDelayMs('GET', 429, '1', 0, 0)).toBe(1000)
  })

  it('never retries other statuses', () => {
    expect(retryDelayMs('GET', 500, '1', 0, 0)).toBeNull()
    expect(retryDelayMs('GET', 502, '1', 0, 0)).toBeNull()
  })

  it('never retries other methods', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(retryDelayMs(method, 503, '1', 0, 0)).toBeNull()
  })

  it('stops after two retries', () => {
    expect(retryDelayMs('GET', 503, '1', 1, 0)).toBe(1000)
    expect(retryDelayMs('GET', 503, '1', 2, 0)).toBeNull()
  })

  it("doesn't retry when the wait would run past the 30-second budget", () => {
    expect(retryDelayMs('GET', 503, '20', 1, 10_000)).toBe(20_000)
    expect(retryDelayMs('GET', 503, '20', 1, 10_001)).toBeNull()
    expect(retryDelayMs('GET', 429, '300', 0, 0)).toBeNull()
  })
})

describe('installAxiosRetryInterceptor', () => {
  it('retries a GET after a 503 with Retry-After: 2 and succeeds about 2 seconds later', async () => {
    const {instance, requests} = client([{status: 503, headers: {'retry-after': '2'}}, {status: 200}])

    const {value, elapsedMs} = await settle(instance.get(`${API}/score-sets/urn`))

    expect(value?.status).toBe(200)
    expect(requests).toHaveLength(2)
    expect(elapsedMs).toBeGreaterThanOrEqual(2000)
    expect(elapsedMs).toBeLessThan(2500)
  })

  it('fails a GET that keeps getting 503 after two retries', async () => {
    const {instance, requests} = client([{status: 503}, {status: 503}, {status: 503}, {status: 200}])

    const {error} = await settle(instance.get(`${API}/score-sets/urn`))

    expect((error as AxiosError).response?.status).toBe(503)
    expect(requests).toHaveLength(3)
  })

  it("doesn't retry a POST that gets a 503", async () => {
    const {instance, requests} = client([{status: 503, headers: {'retry-after': '1'}}, {status: 200}])

    const {error} = await settle(instance.post(`${API}/score-sets/`, {}))

    expect((error as AxiosError).response?.status).toBe(503)
    expect(requests).toEqual(['post'])
  })

  it("doesn't retry a 429 with Retry-After: 300, and shows when to try again", async () => {
    const {instance, requests} = client([{status: 429, headers: {'retry-after': '300'}}, {status: 200}])

    const {error} = await settle(instance.get(`${API}/score-sets/urn/scores`))

    expect(requests).toHaveLength(1)
    expect(isRateLimited(error)).toBe(true)
    expect(shown).toHaveBeenCalledOnce()
    expect(shown.mock.calls[0][0]).toContain('Try again in about 5 minutes.')
  })

  it('shows the rate-limit message when a 429 is still there after retrying', async () => {
    const tooMany = {status: 429, headers: {'retry-after': '1'}}
    const {instance, requests} = client([tooMany, tooMany, tooMany])

    await settle(instance.get(`${API}/score-sets/urn`))

    expect(requests).toHaveLength(3)
    expect(shown).toHaveBeenCalledOnce()
  })

  it("doesn't show the rate-limit message for other failures", async () => {
    const {instance} = client([{status: 503}, {status: 503}, {status: 503}])

    await settle(instance.get(`${API}/score-sets/urn`))

    expect(shown).not.toHaveBeenCalled()
  })

  it('leaves requests to other hosts alone', async () => {
    const {instance, requests} = client([{status: 429, headers: {'retry-after': '1'}}, {status: 200}])

    const {error} = await settle(instance.get('https://reg.clinicalgenome.org/allele'))

    expect((error as AxiosError).response?.status).toBe(429)
    expect(requests).toHaveLength(1)
    expect(shown).not.toHaveBeenCalled()
  })

  it('reports the server as busy only while a request waits to retry', async () => {
    const {instance} = client([{status: 503, headers: {'retry-after': '2'}}, {status: 200}])
    expect(serverBusy.value).toBe(false)

    const pending = instance.get(`${API}/score-sets/urn`)
    await vi.advanceTimersByTimeAsync(1000)
    expect(serverBusy.value).toBe(true)
    expect(SERVER_BUSY_MESSAGE).toBe('The server is busy; retrying…')

    await settle(pending)
    expect(serverBusy.value).toBe(false)
  })

  it('stops waiting when the request is aborted', async () => {
    const {instance, requests} = client([{status: 503, headers: {'retry-after': '5'}}, {status: 200}])
    const controller = new AbortController()

    const pending = settle(instance.get(`${API}/score-sets/urn`, {signal: controller.signal}))
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    const {error} = await pending

    expect(isCancel(error)).toBe(true)
    expect(requests).toHaveLength(1)
    expect(serverBusy.value).toBe(false)
  })
})

describe('fetchWithRetry', () => {
  function stubFetch(replies: Reply[]) {
    const fetchMock = vi.fn(async () => {
      const reply = replies.shift() ?? {status: 200}
      return new Response(null, {status: reply.status, headers: reply.headers ?? {}})
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('retries a GET after a 503 with Retry-After: 2 and succeeds about 2 seconds later', async () => {
    const fetchMock = stubFetch([{status: 503, headers: {'Retry-After': '2'}}, {status: 200}])

    const {value, elapsedMs} = await settle(fetchWithRetry(`${API}/score-sets/urn/variant-details`))

    expect(value?.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(elapsedMs).toBeGreaterThanOrEqual(2000)
    expect(elapsedMs).toBeLessThan(2500)
  })

  it('returns the last response after two retries', async () => {
    const fetchMock = stubFetch([{status: 503}, {status: 503}, {status: 503}, {status: 200}])

    const {value} = await settle(fetchWithRetry(`${API}/score-sets/urn/variant-details`))

    expect(value?.status).toBe(503)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("doesn't retry a POST", async () => {
    const fetchMock = stubFetch([{status: 503, headers: {'Retry-After': '1'}}, {status: 200}])

    const {value} = await settle(fetchWithRetry(`${API}/score-sets/`, {method: 'POST'}))

    expect(value?.status).toBe(503)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('stops waiting when the request is aborted', async () => {
    const fetchMock = stubFetch([{status: 503, headers: {'Retry-After': '5'}}, {status: 200}])
    const controller = new AbortController()

    const pending = settle(fetchWithRetry(`${API}/score-sets/urn/variant-details`, {signal: controller.signal}))
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    const {error} = await pending

    expect((error as Error).name).toBe('AbortError')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(serverBusy.value).toBe(false)
  })

  it('returns a 429 with Retry-After: 300 at once, for the caller to report', async () => {
    const fetchMock = stubFetch([{status: 429, headers: {'Retry-After': '300'}}, {status: 200}])

    const {value} = await settle(fetchWithRetry(`${API}/score-sets/urn/variant-details`))

    expect(value?.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
