import {describe, expect, it, vi} from 'vitest'

import {
  BUSY_DETAIL_PREFIX,
  DEFAULT_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  busyRetryMessage,
  isServerBusy,
  retryDelayMs,
  scoresLoadFailedMessage,
  sleep,
  withBusyRetry
} from '@/lib/busy-retry.ts'

const BUSY_DETAIL = `${BUSY_DETAIL_PREFIX}. Retry after the number of seconds in the Retry-After header.`

function httpError(status: number, data: unknown, headers: Record<string, string> = {}) {
  return {isAxiosError: true, message: `Request failed with status code ${status}`, response: {status, data, headers}}
}

const busyError = (retryAfter?: string) =>
  httpError(503, {detail: BUSY_DETAIL}, retryAfter == null ? {} : {'retry-after': retryAfter})
// What the WAF answers during a maintenance window: also a 503 with Retry-After, but not load shedding.
const maintenanceError = () =>
  httpError(503, {maintenance: true, message: 'Down for an upgrade.'}, {'retry-after': '3600'})

const noSleep = () => Promise.resolve()

describe('isServerBusy', () => {
  it('recognizes the api turning a request away for lack of a build slot', () => {
    expect(isServerBusy(busyError('30'))).toBe(true)
  })

  it('does not mistake a maintenance window for load shedding', () => {
    expect(isServerBusy(maintenanceError())).toBe(false)
  })

  it('ignores other statuses and errors without a response', () => {
    expect(isServerBusy(httpError(500, {detail: BUSY_DETAIL}))).toBe(false)
    expect(isServerBusy(httpError(503, {detail: 'Service Unavailable'}))).toBe(false)
    expect(isServerBusy(httpError(503, '<html>502 Bad Gateway</html>'))).toBe(false)
    expect(isServerBusy({isAxiosError: true, message: 'Network Error'})).toBe(false)
    expect(isServerBusy(new Error('boom'))).toBe(false)
  })
})

describe('retryDelayMs', () => {
  it('waits the seconds Retry-After asks for', () => {
    expect(retryDelayMs(busyError('5'))).toBe(5000)
  })

  it('falls back when the header is missing, as it is cross-origin', () => {
    expect(retryDelayMs(busyError())).toBe(DEFAULT_RETRY_DELAY_MS)
    expect(retryDelayMs(busyError(), 1234)).toBe(1234)
  })

  it('falls back when the header is not a number of seconds', () => {
    expect(retryDelayMs(busyError('Wed, 21 Oct 2026 07:28:00 GMT'))).toBe(DEFAULT_RETRY_DELAY_MS)
    expect(retryDelayMs(busyError(''))).toBe(DEFAULT_RETRY_DELAY_MS)
    expect(retryDelayMs(busyError('-5'))).toBe(DEFAULT_RETRY_DELAY_MS)
  })

  it('never waits longer than the cap', () => {
    expect(retryDelayMs(busyError('3600'))).toBe(MAX_RETRY_DELAY_MS)
  })
})

describe('withBusyRetry', () => {
  it('returns the first success without waiting', async () => {
    const wait = vi.fn(noSleep)
    expect(await withBusyRetry(() => Promise.resolve('ok'), {sleep: wait})).toBe('ok')
    expect(wait).not.toHaveBeenCalled()
  })

  it('retries a busy response after the requested wait, telling the caller it is waiting', async () => {
    const request = vi.fn().mockRejectedValueOnce(busyError('7')).mockResolvedValueOnce('ok')
    const wait = vi.fn(noSleep)
    const onBusy = vi.fn()

    expect(await withBusyRetry(request, {sleep: wait, onBusy})).toBe('ok')

    expect(request).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledWith(7000, undefined)
    expect(onBusy).toHaveBeenCalledWith({retry: 1, maxRetries: 3, delayMs: 7000})
  })

  it('gives up with the busy error once its retries are spent', async () => {
    const error = busyError()
    const request = vi.fn().mockRejectedValue(error)
    const onBusy = vi.fn()

    await expect(withBusyRetry(request, {maxRetries: 2, sleep: noSleep, onBusy})).rejects.toBe(error)

    expect(request).toHaveBeenCalledTimes(3)
    expect(onBusy.mock.calls.map(([busy]) => busy.retry)).toEqual([1, 2])
  })

  it('does not retry other failures, maintenance included', async () => {
    for (const error of [maintenanceError(), httpError(404, {detail: 'Not found'}), new Error('boom')]) {
      const request = vi.fn().mockRejectedValue(error)
      await expect(withBusyRetry(request, {sleep: noSleep})).rejects.toBe(error)
      expect(request).toHaveBeenCalledTimes(1)
    }
  })

  it('stops waiting as soon as the caller aborts', async () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const request = vi.fn().mockRejectedValue(busyError('30'))
      const result = withBusyRetry(request, {signal: controller.signal})
      const settled = expect(result).rejects.toThrow('navigated away')

      await vi.advanceTimersByTimeAsync(1000)
      controller.abort(new Error('navigated away'))
      await settled

      await vi.advanceTimersByTimeAsync(60_000)
      expect(request).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('sleep', () => {
  it('rejects at once when already aborted', async () => {
    const controller = new AbortController()
    controller.abort(new Error('gone'))
    await expect(sleep(10_000, controller.signal)).rejects.toThrow('gone')
  })
})

describe('messages', () => {
  it('tells the user the page is waiting on a busy server, and for how long', () => {
    expect(busyRetryMessage({retry: 2, maxRetries: 3, delayMs: 30_000})).toBe(
      'The server is busy with other large score sets. Trying again in 30s (retry 2 of 3)...'
    )
  })

  it('says the server is still busy only when that is why loading failed', () => {
    expect(scoresLoadFailedMessage(true, 'Other.')).toContain('still busy')
    expect(scoresLoadFailedMessage(false, 'Other.')).toBe('Other.')
  })
})
