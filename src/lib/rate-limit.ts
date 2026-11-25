import {isAxiosError, type AxiosError} from 'axios'

/** How long the rate-limit toast stays up, and the window in which a repeat 429 doesn't raise another. */
export const NOTICE_LIFE_MS = 10 * 1000

/** Shows *message* to the user for *lifeMs*. */
export type ShowNotice = (message: string, lifeMs: number) => void

// Injected at startup rather than imported, because the toast store needs a browser.
let show: ShowNotice = () => {}
let lastNoticeAt = -Infinity

/** Connect the notice to the toasts. Call once at startup. */
export function installRateLimitNotice(showNotice: ShowNotice) {
  show = showNotice
  lastNoticeAt = -Infinity
}

/**
 * Read `Retry-After` as whole seconds. It is either a number of seconds or an HTTP date; a date in the past means
 * "now". Returns null when the header is missing or unreadable.
 */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return null
  return Math.max(0, Math.ceil((date - now) / 1000))
}

/** A request the API or WAF refused because this client has made too many. */
export class RateLimitError extends Error {
  /** Seconds the server asked us to wait, or null when it didn't say. */
  readonly retryAfterSeconds: number | null

  constructor(retryAfterSeconds: number | null) {
    super(rateLimitMessage(retryAfterSeconds))
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** Whether *error* is a 429, from axios or from a `fetch` turned into a {@link RateLimitError}. */
export function isRateLimited(error: unknown): boolean {
  return error instanceof RateLimitError || (isAxiosError(error) && error.response?.status === 429)
}

function describeWait(seconds: number | null): string {
  if (seconds === null) return 'in a few minutes'
  if (seconds < 60) return seconds <= 1 ? 'in a second' : `in about ${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return minutes === 1 ? 'in about a minute' : `in about ${minutes} minutes`
  const hours = Math.ceil(minutes / 60)
  return hours === 1 ? 'in about an hour' : `in about ${hours} hours`
}

/**
 * What to tell a user who has hit a rate limit. Built from `Retry-After` alone: the 429 body comes from the WAF and
 * isn't part of the API schema.
 */
export function rateLimitMessage(retryAfterSeconds: number | null): string {
  // TODO(VariantEffect/mavedb-api#917): once signed-in users get a higher limit, tell anonymous users that signing in
  // raises it.
  return `You've made too many requests to MaveDB in a short time. Try again ${describeWait(retryAfterSeconds)}.`
}

/** The rate-limit message for an axios 429, read from its `Retry-After`. */
export function describeRateLimit(error: AxiosError): string {
  return rateLimitMessage(parseRetryAfter(error.response?.headers?.['retry-after']))
}

/**
 * Tell the user they've been rate limited, once per burst: a page that fires several requests gets one toast, not one
 * per request.
 */
export function notifyRateLimited(retryAfterSeconds: number | null): RateLimitError {
  const error = new RateLimitError(retryAfterSeconds)
  const now = Date.now()
  if (now - lastNoticeAt >= NOTICE_LIFE_MS) {
    lastNoticeAt = now
    show(error.message, NOTICE_LIFE_MS)
  }
  return error
}
