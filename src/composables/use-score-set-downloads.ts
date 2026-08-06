import {computed, ref, type Ref} from 'vue'

import type {CsvExtraOption} from '@/composables/use-csv-namespaces'

import {downloadScoreSetFile, downloadScoreSetVariantData, downloadMappedVariants} from '@/api/mavedb'
import config from '@/config'
import {triggerDownload} from '@/lib/downloads'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export const TEXT_COLUMNS = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

interface UseScoreSetDownloadsOptions {
  scoreSet: Ref<ScoreSet | null>
}

export function useScoreSetDownloads({scoreSet}: UseScoreSetDownloadsOptions) {
  const customDialogVisible = ref(false)
  const streamController = ref<AbortController | null>(null)

  /** What file is currently being prepared, or null when idle. One indicator for every download here. */
  const fileDownloadLabel = ref<string | null>(null)

  /**
   * Percent complete, or null when the download cannot report progress.
   *
   * Only the VA-Spec streams can: they carry `X-Total-Count` and emit one NDJSON record per line, so
   * records can be tallied as they arrive. A CSV arrives as a single gzipped body whose `Content-Length`
   * is the *compressed* size, which browsers compare against decompressed bytes received, so no usable
   * percentage exists — and most of that wait is the server building the file before any byte is sent.
   */
  const fileDownloadProgress = ref<number | null>(null)

  const fileDownloadInProgress = computed(() => fileDownloadLabel.value !== null)

  /** Run *download* with the indicator showing, clearing it even if the request fails. */
  async function withIndicator<T>(label: string, download: () => Promise<T>): Promise<T | undefined> {
    if (fileDownloadLabel.value !== null) return
    fileDownloadLabel.value = label
    try {
      return await download()
    } finally {
      fileDownloadLabel.value = null
      fileDownloadProgress.value = null
    }
  }

  /** Formatting flags. Column groups come from the csv-namespaces endpoint via MvCsvColumnDialog. */
  const extraDownloadOptions: CsvExtraOption[] = [
    {label: "Omit HGVS columns this score set doesn't use", value: 'dropUnusedHgvsColumns'}
  ]

  async function downloadFile(type: 'scores' | 'counts') {
    if (!scoreSet.value) return
    await withIndicator(type === 'scores' ? 'Scores' : 'Counts', async () => {
      const data = await downloadScoreSetFile(scoreSet.value!.urn, type)
      triggerDownload(data, `${scoreSet.value!.urn}_${type}.csv`)
    })
  }

  /**
   * Download the score set's variant data with the chosen column groups. Namespaces pass through
   * verbatim — they are the API's own vocabulary. (This previously sent an unsupported `data_type`
   * parameter, so every selection was silently ignored.)
   */
  async function downloadMultipleData({namespaces, extras}: {namespaces: string[]; extras: string[]}) {
    if (!scoreSet.value) return
    const params = new URLSearchParams()
    for (const namespace of namespaces) params.append('namespaces', namespace)
    if (extras.includes('dropUnusedHgvsColumns')) params.append('drop_unused_hgvs_columns', 'true')
    await withIndicator('Custom data', async () => {
      const data = await downloadScoreSetVariantData(scoreSet.value!.urn, params)
      triggerDownload(data, `${scoreSet.value!.urn}_custom.csv`)
      customDialogVisible.value = false
    })
  }

  async function downloadMappedVariantsFile() {
    if (!scoreSet.value) return
    await withIndicator('Mapped variants', async () => {
      const data = await downloadMappedVariants(scoreSet.value!.urn)
      triggerDownload(JSON.stringify(data), `${scoreSet.value!.urn}_mapped_variants.json`, 'text/json')
    })
  }

  function downloadMetadata() {
    if (!scoreSet.value) return
    const metadata = JSON.stringify(scoreSet.value.extraMetadata)
    triggerDownload(metadata, `${scoreSet.value.urn}_metadata.txt`, 'text/plain')
  }

  function abortStream() {
    if (streamController.value) {
      streamController.value.abort()
      fileDownloadLabel.value = null
      fileDownloadProgress.value = null
    }
  }

  async function streamVariantAnnotations(annotationType: string, label = 'annotations') {
    const urn = scoreSet.value?.urn
    if (!urn) return
    await withIndicator(label, () => streamAnnotationsInto(urn, annotationType))
  }

  async function streamAnnotationsInto(urn: string, annotationType: string) {
    streamController.value = new AbortController()

    try {
      const response = await fetch(`${config.apiBaseUrl}/score-sets/${urn}/annotated-variants/${annotationType}`, {
        signal: streamController.value.signal,
        headers: {Accept: 'application/x-ndjson'}
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')

      // Held as raw bytes rather than decoded strings. Accumulating strings and then joining them cost
      // roughly five times the payload — JS strings are UTF-16, so the decoded chunks alone doubled it,
      // the join doubled that again, and the Blob copied the result. A large pathogenicity download ran
      // the tab out of memory.
      const parts: Uint8Array[] = []
      let processedCount = 0

      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        parts.push(value)
        // NDJSON terminates every record with a newline, and 0x0A cannot appear inside a multi-byte UTF-8
        // sequence, so counting the byte is exact and needs no decoding or chunk-boundary bookkeeping.
        for (const byte of value) {
          if (byte === 0x0a) processedCount += 1
        }
        // Without a total there is nothing to divide by; stay indeterminate rather than report Infinity.
        fileDownloadProgress.value =
          totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : null
      }

      // The server generator yields one line per variant, so a short body means it stopped early —
      // status and headers went out with the first chunk, so a truncated stream is the only symptom it
      // can produce. Refuse to save a file that is quietly missing records.
      if (totalCount > 0 && processedCount < totalCount) {
        throw new Error(
          `Download incomplete: received ${processedCount} of ${totalCount} records.` +
            ' The server stopped sending partway through; check the API logs.'
        )
      }

      const blob = new Blob(parts as BlobPart[], {type: 'application/x-ndjson'})
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${urn}_annotated_variants_${annotationType}.ndjson`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message !== 'The user aborted a request.') {
        throw error
      }
    } finally {
      streamController.value = null
    }
  }

  return {
    // State
    customDialogVisible,
    fileDownloadInProgress,
    fileDownloadLabel,
    fileDownloadProgress,

    extraDownloadOptions,

    // Methods
    downloadFile,
    downloadMultipleData,
    downloadMappedVariantsFile,
    downloadMetadata,
    streamVariantAnnotations,
    abortStream
  }
}
