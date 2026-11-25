import axios, {CanceledError, type AxiosError, type AxiosInstance} from 'axios'
import {computed, ref} from 'vue'

import config from '@/config'
import {notifyRateLimited, parseRetryAfter} from '@/lib/rate-limit'

/** Statuses that come with a `Retry-After` worth honoring: the WAF's rate limit and the API's CSV build cap. */
const RETRYABLE_STATUSES = new Set([429, 503])

/** Retries after the first attempt. */
export const MAX_RETRIES = 2

/** Longest a request may take, counting from its first attempt, once retries are included. */
export const RETRY_BUDGET_MS = 30 * 1000

/** Wait used when a 429 or 503 has no `Retry-After`, such as a 503 from a database timeout. */
export const DEFAULT_RETRY_AFTER_SECONDS = 5

/** Shown in place of a loading message while any request is waiting to retry. */
export const SERVER_BUSY_MESSAGE = 'The server is busy; retrying…'

interface RetryState {
  attempt: number
  startedAt: number
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Carried from one attempt to the next by {@link installAxiosRetryInterceptor}. */
    mavedbRetry?: RetryState
  }
}

const waitingRetries = ref(0)

/** True while at least one request is waiting to retry. Loading indicators show {@link SERVER_BUSY_MESSAGE}. */
export const serverBusy = computed(() => waitingRetries.value > 0)

/**
 * How long to wait before retrying a failed request, or null to give up.
 *
 * Only `GET`s are retried, since a retried write could apply twice. A `Retry-After` that would run past
 * {@link RETRY_BUDGET_MS} isn't retried at all: the WAF's 429s ask for five minutes, and waiting that long behind a
 * spinner is worse than saying so.
 */
export function retryDelayMs(
  method: string,
  status: number,
  retryAfter: string | null | undefined,
  attempt: number,
  elapsedMs: number
): number | null {
  if (method.toUpperCase() !== 'GET' || !RETRYABLE_STATUSES.has(status) || attempt >= MAX_RETRIES) return null
  const delay = (parseRetryAfter(retryAfter) ?? DEFAULT_RETRY_AFTER_SECONDS) * 1000
  return elapsedMs + delay > RETRY_BUDGET_MS ? null : delay
}

/** Wait *ms*, counting as busy meanwhile. Rejects with the signal's reason if it aborts first. */
function waitToRetry(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    waitingRetries.value += 1
    const done = () => {
      waitingRetries.value -= 1
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      clearTimeout(timer)
      done()
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      done()
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, {once: true})
  })
}

function urlBelongsToApi(url: string | undefined): boolean {
  return Boolean(url && config.apiBaseUrl && url.startsWith(config.apiBaseUrl))
}

/**
 * Retry API `GET`s that fail with 429 or 503, and tell the user when one finally fails with 429.
 *
 * Install it before the other response interceptors, so they see only the outcome of the last attempt.
 */
export function installAxiosRetryInterceptor(instance: AxiosInstance = axios) {
  instance.interceptors.request.use((requestConfig) => {
    requestConfig.mavedbRetry ??= {attempt: 0, startedAt: Date.now()}
    return requestConfig
  })

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const requestConfig = error.config
    const response = error.response
    if (!requestConfig?.mavedbRetry || !response || !urlBelongsToApi(requestConfig.url)) throw error

    const state = requestConfig.mavedbRetry
    const retryAfter = response.headers?.['retry-after'] as string | undefined
    const delay = retryDelayMs(
      requestConfig.method ?? 'get',
      response.status,
      retryAfter,
      state.attempt,
      Date.now() - state.startedAt
    )
    if (delay === null) {
      if (response.status === 429) notifyRateLimited(parseRetryAfter(retryAfter))
      throw error
    }

    try {
      await waitToRetry(delay, requestConfig.signal as AbortSignal | undefined)
    } catch {
      // Callers recognise a cancelled request by axios.isCancel, so abort the way axios itself would.
      throw new CanceledError(undefined, undefined, requestConfig)
    }
    return instance.request({...requestConfig, mavedbRetry: {...state, attempt: state.attempt + 1}})
  })
}

/**
 * `fetch` with the same retry policy as the axios interceptor, for requests that stream and so can't go through
 * axios. Resolves to the last response; the caller decides what a failed one means.
 */
export async function fetchWithRetry(url: string, init: RequestInit = {}): Promise<Response> {
  const startedAt = Date.now()
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init)
    const delay = retryDelayMs(
      init.method ?? 'GET',
      response.status,
      response.headers.get('Retry-After'),
      attempt,
      Date.now() - startedAt
    )
    if (delay === null) return response
    // Release the connection; the body of a refusal isn't read.
    await response.body?.cancel().catch(() => {})
    await waitToRetry(delay, init.signal)
  }
}
