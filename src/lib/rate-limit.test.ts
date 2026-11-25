import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  installRateLimitNotice,
  isRateLimited,
  notifyRateLimited,
  NOTICE_LIFE_MS,
  RateLimitError,
  rateLimitMessage
} from '@/lib/rate-limit'

describe('rateLimitMessage', () => {
  it('says roughly when to try again', () => {
    expect(rateLimitMessage(300, true)).toContain('Try again in about 5 minutes.')
    expect(rateLimitMessage(30, true)).toContain('Try again in about 30 seconds.')
    expect(rateLimitMessage(61, true)).toContain('Try again in about 2 minutes.')
    expect(rateLimitMessage(60, true)).toContain('Try again in about a minute.')
    expect(rateLimitMessage(7200, true)).toContain('Try again in about 2 hours.')
  })

  it("falls back to a vague wait when the server didn't say", () => {
    expect(rateLimitMessage(null, true)).toContain('Try again in a few minutes.')
  })

  it('mentions signing in to an anonymous user', () => {
    expect(rateLimitMessage(300, false)).toContain('Signing in raises the limit.')
  })

  it("doesn't mention signing in to a signed-in user", () => {
    expect(rateLimitMessage(300, true)).not.toMatch(/sign/i)
  })
})

describe('isRateLimited', () => {
  it('recognizes an axios 429 and a RateLimitError', () => {
    expect(isRateLimited({isAxiosError: true, response: {status: 429}})).toBe(true)
    expect(isRateLimited(new RateLimitError(300, false))).toBe(true)
  })

  it('rejects other failures', () => {
    expect(isRateLimited({isAxiosError: true, response: {status: 503}})).toBe(false)
    expect(isRateLimited(new Error('HTTP 429: '))).toBe(false)
    expect(isRateLimited(undefined)).toBe(false)
  })
})

describe('notifyRateLimited', () => {
  const show = vi.fn()
  let signedIn = false

  beforeEach(() => {
    vi.useFakeTimers()
    show.mockReset()
    signedIn = false
    installRateLimitNotice({isSignedIn: () => signedIn, show})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows an anonymous user's message with the sign-in hint", () => {
    const error = notifyRateLimited(300)

    expect(show).toHaveBeenCalledWith(error.message, NOTICE_LIFE_MS)
    expect(error.message).toContain('Signing in raises the limit.')
  })

  it("shows a signed-in user's message without it", () => {
    signedIn = true

    const error = notifyRateLimited(300)

    expect(show).toHaveBeenCalledWith(error.message, NOTICE_LIFE_MS)
    expect(error.message).not.toMatch(/sign/i)
  })

  it('shows one notice for a burst of 429s, and another once it has gone', () => {
    notifyRateLimited(300)
    notifyRateLimited(300)
    expect(show).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(NOTICE_LIFE_MS)
    notifyRateLimited(300)
    expect(show).toHaveBeenCalledTimes(2)
  })
})
