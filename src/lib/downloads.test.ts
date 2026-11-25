import {AxiosError, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios'
import {describe, expect, it, vi} from 'vitest'

import {DOWNLOAD_INTERRUPTED_MESSAGE, reportingDownloadFailure} from '@/lib/downloads'
import {RateLimitError} from '@/lib/rate-limit'

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = {headers: {}} as InternalAxiosRequestConfig
  const response = {status, statusText: '', headers: {}, config, data} as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, undefined, config, null, response)
}

describe('reportingDownloadFailure', () => {
  it('shows nothing when the download succeeds', async () => {
    const toast = {add: vi.fn()}

    await reportingDownloadFailure(toast, 'scores', async () => 'a,b\n')

    expect(toast.add).not.toHaveBeenCalled()
  })

  it('says the connection closed when the request ends with no response', async () => {
    const toast = {add: vi.fn()}

    await reportingDownloadFailure(toast, 'scores', async () => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK)
    })

    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Could not download scores',
        detail: DOWNLOAD_INTERRUPTED_MESSAGE
      })
    )
  })

  it("shows the server's detail for an error response", async () => {
    const toast = {add: vi.fn()}

    await reportingDownloadFailure(toast, 'counts', async () => {
      throw axiosErrorWithResponse(503, {detail: 'Too many large downloads are being built. Try again shortly.'})
    })

    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Could not download counts',
        detail: 'Too many large downloads are being built. Try again shortly.'
      })
    )
  })

  it('shows the message of a failure that is not a request error', async () => {
    const toast = {add: vi.fn()}

    await reportingDownloadFailure(toast, 'variant details', async () => {
      throw new Error('Download incomplete: received 10 of 20 records.')
    })

    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({detail: 'Download incomplete: received 10 of 20 records.'})
    )
  })

  it('leaves a rate-limited download to the rate-limit notice', async () => {
    const toast = {add: vi.fn()}

    await reportingDownloadFailure(toast, 'scores', async () => {
      throw new RateLimitError(300)
    })
    await reportingDownloadFailure(toast, 'scores', async () => {
      throw axiosErrorWithResponse(429, '')
    })

    expect(toast.add).not.toHaveBeenCalled()
  })
})
