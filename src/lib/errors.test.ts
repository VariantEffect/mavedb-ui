import {describe, expect, it, vi} from 'vitest'

import {describeRequestError, getErrorResponse} from './errors'

vi.mock('axios', () => {
  const isAxiosError = (error: unknown) => Boolean((error as {isAxiosError?: boolean})?.isAxiosError)
  return {default: {isAxiosError}, isAxiosError}
})

function axiosError(data: unknown): unknown {
  return {isAxiosError: true, response: {status: 400, data}, message: 'Request failed'}
}

describe('describeRequestError', () => {
  it('prefers a string detail from the server', () => {
    expect(describeRequestError(axiosError({detail: 'Score set is private.'}))).toBe('Score set is private.')
  })

  it('serializes a non-string detail rather than losing it', () => {
    const detail = [{loc: ['query', 'namespaces', 0], msg: 'Value error, must be one of ...'}]

    const message = describeRequestError(axiosError({detail}))

    expect(message).toContain('namespaces')
    expect(message).toContain('Value error')
  })

  it('returns a plain string body as-is', () => {
    expect(describeRequestError(axiosError('Gateway timeout'))).toBe('Gateway timeout')
  })

  it('serializes a response body with no detail field', () => {
    expect(describeRequestError(axiosError({error: 'nope'}))).toBe('{"error":"nope"}')
  })

  it('falls back to the exception message for non-request failures', () => {
    expect(describeRequestError(new Error('Network down'))).toBe('Network down')
  })

  it('falls back to the exception message when there is no response body', () => {
    expect(describeRequestError({isAxiosError: true, message: 'Request failed'})).toBe('Unknown error.')
  })

  it('always returns something renderable', () => {
    expect(describeRequestError(undefined)).toBe('Unknown error.')
    expect(describeRequestError('a bare string')).toBe('Unknown error.')
  })
})

describe('getErrorResponse', () => {
  it('extracts the status and body from an Axios error', () => {
    expect(getErrorResponse(axiosError({detail: 'Score set is private.'}))).toEqual({
      status: 400,
      data: {detail: 'Score set is private.'}
    })
  })

  it('falls back to a 500 for non-Axios errors', () => {
    expect(getErrorResponse(new Error('Network down'))).toEqual({status: 500})
  })

  it('falls back to a 500 when the Axios error has no response', () => {
    expect(getErrorResponse({isAxiosError: true, message: 'Request failed'})).toEqual({status: 500})
  })
})
