import axios, {isAxiosError} from 'axios'

/**
 * Extract a message worth showing a user from a failed request.
 *
 * Prefers the server's own `detail`, which is where FastAPI puts the human-readable reason, and falls
 * back through the raw response body to the exception message. Always returns something renderable, so
 * callers can drop it straight into a toast.
 *
 * For the status code rather than the message, see `getErrorResponse` in `@/api/mavedb`.
 */
export function describeRequestError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') return data
    if (typeof data === 'object' && data !== null && 'detail' in data) {
      const detail = (data as {detail: unknown}).detail
      // A string detail is the common case. A validation error is an array of objects; JSON is more use
      // to a reader than "AxiosError: Request failed with status code 422".
      return typeof detail === 'string' ? detail : JSON.stringify(detail)
    }
    return JSON.stringify(data)
  }
  return error instanceof Error ? error.message : 'Unknown error.'
}

export interface ErrorResponse {
  status: number
  data?: Record<string, unknown>
}

/**
 * Extract a normalized status and body from a caught Axios error.
 *
 * The counterpart to `describeRequestError`: use this when the caller branches on the status code, and
 * that one when it just needs something to show the user.
 */
export function getErrorResponse(e: unknown): ErrorResponse {
  if (isAxiosError(e) && e.response) {
    return {status: e.response.status, data: e.response.data as Record<string, unknown>}
  }
  return {status: 500}
}
