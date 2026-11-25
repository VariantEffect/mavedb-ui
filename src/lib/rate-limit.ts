import {isAxiosError, type AxiosError} from 'axios'

/** How long the rate-limit toast stays up, and the window in which a repeat 429 doesn't raise another. */
export const NOTICE_LIFE_MS = 10 * 1000

export interface RateLimitNoticeHooks {
  isSignedIn: () => boolean
  /** Show *message* to the user for *lifeMs*. */
  show: (message: string, lifeMs: number) => void
}

// Injected at startup rather than imported, because the sign-in state and the toast store need a browser.
let hooks: RateLimitNoticeHooks = {isSignedIn: () => false, show: () => {}}
let lastNoticeAt = -Infinity

/** Connect the notice to the sign-in state and the toasts. Call once at startup. */
export function installRateLimitNotice(installed: RateLimitNoticeHooks) {
  hooks = installed
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

  constructor(retryAfterSeconds: number | null, signedIn: boolean) {
    super(rateLimitMessage(retryAfterSeconds, signedIn))
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
export function rateLimitMessage(retryAfterSeconds: number | null, signedIn: boolean): string {
  const message = `You've made too many requests to MaveDB in a short time. Try again ${describeWait(retryAfterSeconds)}.`
  return signedIn ? message : `${message} Signing in raises the limit.`
}

/** The rate-limit message for an axios 429, read from its `Retry-After`. */
export function describeRateLimit(error: AxiosError): string {
  return rateLimitMessage(parseRetryAfter(error.response?.headers?.['retry-after']), hooks.isSignedIn())
}

/**
 * Tell the user they've been rate limited, once per burst: a page that fires several requests gets one toast, not one
 * per request.
 */
export function notifyRateLimited(retryAfterSeconds: number | null): RateLimitError {
  const error = new RateLimitError(retryAfterSeconds, hooks.isSignedIn())
  const now = Date.now()
  if (now - lastNoticeAt >= NOTICE_LIFE_MS) {
    lastNoticeAt = now
    hooks.show(error.message, NOTICE_LIFE_MS)
  }
  return error
}
