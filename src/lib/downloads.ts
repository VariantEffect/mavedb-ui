/**
 * Trigger a file download in the browser by creating a temporary anchor element.
 */
export function triggerDownload(data: string, filename: string, mimeType = 'text/csv') {
  const anchor = document.createElement('a')
  anchor.href = `data:${mimeType};charset=utf-8,` + encodeURIComponent(data)
  anchor.download = filename
  anchor.click()
}
