import {isAxiosError} from 'axios'

/**
 * Retrying requests the API turned away because it was busy.
 *
 * The API caps how many large whole-score-set responses (such as the lean variant view) each process builds at
 * once. A request that can't get a build slot in time gets a 503 with `Retry-After` and {@link BUSY_DETAIL_PREFIX}
 * as its detail. That is load shedding, not downtime: the same request usually succeeds a little later.
 *
 * A maintenance window also answers 503 with `Retry-After`, from the WAF, so the detail text is what tells the two
 * apart. Maintenance errors are not retried here; the maintenance interceptor (`use-maintenance.ts`) handles them.
 */

/** How the API's busy detail begins. The rest of it points at the bulk archive and may change. */
export const BUSY_DETAIL_PREFIX = 'The server is busy building other large downloads'

/** Retries after the first attempt, so a page waits through a few busy spells before showing an error. */
export const DEFAULT_MAX_RETRIES = 3

/**
 * Delay when `Retry-After` can't be read. Matches what the API sends. The API doesn't list `Retry-After` in
 * `Access-Control-Expose-Headers`, so a browser on another origin never sees the header and always uses this.
 */
export const DEFAULT_RETRY_DELAY_MS = 30 * 1000

/** Longest a page waits between attempts, whatever `Retry-After` says. */
export const MAX_RETRY_DELAY_MS = 60 * 1000

/** A retry about to happen, for showing the user that the page is waiting on a busy server. */
export interface BusyRetry {
  /** 1 for the first retry. */
  retry: number
  maxRetries: number
  delayMs: number
}

export interface BusyRetryOptions {
  maxRetries?: number
  fallbackDelayMs?: number
  /** Called before each wait, so the caller can show that the page is waiting rather than loading. */
  onBusy?: (retry: BusyRetry) => void
  /** Stops waiting and retrying; the returned promise rejects with the signal's reason. */
  signal?: AbortSignal
  /** Injectable for tests. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
}

/** Whether a failed request was turned away because the API was busy, rather than down or broken. */
export function isServerBusy(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 503) return false
  const detail = (error.response.data as {detail?: unknown} | undefined)?.detail
  return typeof detail === 'string' && detail.startsWith(BUSY_DETAIL_PREFIX)
}

/** The wait a busy response asks for, from its `Retry-After` seconds when readable, capped at a minute. */
export function retryDelayMs(error: unknown, fallbackMs: number = DEFAULT_RETRY_DELAY_MS): number {
  const header: unknown = isAxiosError(error) ? error.response?.headers?.['retry-after'] : undefined
  const seconds = typeof header === 'string' && header.trim() !== '' ? Number(header) : NaN
  const delayMs = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : fallbackMs
  return Math.min(delayMs, MAX_RETRY_DELAY_MS)
}

/** Resolve after `ms`, or reject with the signal's reason as soon as it aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, {once: true})
  })
}

/**
 * Run `request`, and run it again after the requested wait each time the API says it is busy.
 *
 * Any other failure rejects at once, as does a busy response once `maxRetries` retries are spent; callers can
 * check {@link isServerBusy} on the error to say why.
 */
export async function withBusyRetry<T>(
  request: () => Promise<T>,
  {
    maxRetries = DEFAULT_MAX_RETRIES,
    fallbackDelayMs = DEFAULT_RETRY_DELAY_MS,
    onBusy,
    signal,
    sleep: wait = sleep
  }: BusyRetryOptions = {}
): Promise<T> {
  for (let retry = 1; ; retry++) {
    try {
      return await request()
    } catch (error) {
      if (signal?.aborted || !isServerBusy(error) || retry > maxRetries) throw error
      const delayMs = retryDelayMs(error, fallbackDelayMs)
      onBusy?.({retry, maxRetries, delayMs})
      await wait(delayMs, signal)
    }
  }
}

/** What a loader shows while it waits to retry. */
export function busyRetryMessage({retry, maxRetries, delayMs}: BusyRetry): string {
  const seconds = Math.round(delayMs / 1000)
  return `The server is busy with other large score sets. Trying again in ${seconds}s (retry ${retry} of ${maxRetries})...`
}

/** The error description for a failed lean-view load: why, when the server was still busy, else `otherwise`. */
export function scoresLoadFailedMessage(serverBusy: boolean, otherwise: string): string {
  return serverBusy ? 'The server is still busy with other large score sets. Try again in a few minutes.' : otherwise
}
