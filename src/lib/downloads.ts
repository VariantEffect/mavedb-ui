import {isAxiosError} from 'axios'
import type {useToast} from 'primevue/usetoast'

import {describeRequestError} from '@/lib/errors'
import {isRateLimited} from '@/lib/rate-limit'

/** What a user is told when a download's connection closed before the whole file arrived. */
export const DOWNLOAD_INTERRUPTED_MESSAGE = 'The connection closed before the download finished. Try again.'

/**
 * Trigger a file download in the browser by creating a temporary anchor element.
 */
export function triggerDownload(data: string, filename: string, mimeType = 'text/csv') {
  const anchor = document.createElement('a')
  anchor.href = `data:${mimeType};charset=utf-8,` + encodeURIComponent(data)
  anchor.download = filename
  anchor.click()
}

/**
 * Run *download*, reporting a failure as an error toast.
 *
 * A download started from a template `@click` otherwise rejects into an unhandled promise: the indicator
 * clears and the user gets neither a file nor a message. A rate-limited download is left to the rate-limit
 * notice, which has already said more than this toast would.
 *
 * @param what - What was being downloaded, as it reads after "Could not download".
 */
export async function reportingDownloadFailure(
  toast: Pick<ReturnType<typeof useToast>, 'add'>,
  what: string,
  download: () => Promise<unknown>
): Promise<void> {
  try {
    await download()
  } catch (error: unknown) {
    if (isRateLimited(error)) return
    toast.add({
      severity: 'error',
      summary: `Could not download ${what}`,
      detail: describeDownloadError(error),
      life: 6000
    })
  }
}

function describeDownloadError(error: unknown): string {
  // Axios reports a connection that closed before or partway through the body as an error with no response.
  if (isAxiosError(error) && !error.response) return DOWNLOAD_INTERRUPTED_MESSAGE
  return describeRequestError(error)
}
