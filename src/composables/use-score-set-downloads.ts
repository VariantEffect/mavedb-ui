import {computed, ref, type Ref} from 'vue'

import {downloadScoreSetFile, downloadScoreSetVariantData} from '@/api/mavedb'
import type {CsvExtraOption} from '@/composables/use-csv-namespaces'
import config from '@/config'
import {triggerDownload} from '@/lib/downloads'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export const TEXT_COLUMNS = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

/** What a completed NDJSON stream contained, tallied as it arrived. */
export interface AnnotationStreamOutcome {
  /** Records received. Equals `X-Total-Count` for a complete stream — the server emits one per variant. */
  received: number
  /**
   * Variants the server could not annotate. Those records are in the saved file, carrying an `error`
   * object in place of an annotation. Variants with no mapping data are not counted here: a null
   * annotation is an expected absence, not a failure.
   */
  errored: number
}

/**
 * Whether an NDJSON line is a record the server marked as failed.
 *
 * The substring test is a prefilter, not the decision: `"error"` can appear anywhere inside a large
 * annotation, so a candidate line is parsed to confirm the key is the record's own. Parsing only
 * candidates matters — these records nest deeply, and parsing every one of a large stream is slow.
 */
function isErrorRecord(line: string): boolean {
  if (!line.includes('"error"')) return false
  try {
    return JSON.parse(line)?.error != null
  } catch {
    return false
  }
}

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
   * Only the NDJSON streams can: they carry `X-Total-Count` and emit one record per line, so records can
   * be tallied as they arrive. A CSV arrives as a single gzipped body whose `Content-Length` is the
   * *compressed* size, which browsers compare against decompressed bytes received, so no usable
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

  /**
   * Stream the per-variant record set, one `VariantDetail` per line.
   *
   * Replaces the retired `/mapped-variants` download (#743): that endpoint now answers 410, and this
   * carries strictly more — the VRS pair, Cat-VRS membership, and the annotation layer.
   *
   * Resolves to what the stream contained, so the caller can report partial failures.
   */
  async function streamVariantDetails(label = 'Variant details') {
    const urn = scoreSet.value?.urn
    if (!urn) return
    return await withIndicator(label, () =>
      streamNdjsonInto(urn, 'variant-details', `${urn}_variant_details.ndjson`)
    )
  }

  /** Resolves to what the stream contained, so the caller can report partial failures. */
  async function streamVariantAnnotations(annotationType: string, label = 'annotations') {
    const urn = scoreSet.value?.urn
    if (!urn) return
    return await withIndicator(label, () =>
      streamNdjsonInto(
        urn,
        `annotated-variants/${annotationType}`,
        `${urn}_annotated_variants_${annotationType}.ndjson`
      )
    )
  }

  async function streamNdjsonInto(urn: string, subPath: string, filename: string) {
    streamController.value = new AbortController()

    try {
      const response = await fetch(`${config.apiBaseUrl}/score-sets/${urn}/${subPath}`, {
        signal: streamController.value.signal,
        headers: {Accept: 'application/x-ndjson'}
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')

      // The body is retained as raw bytes, never as accumulated strings. Accumulating decoded chunks and
      // joining them cost roughly five times the payload — JS strings are UTF-16, so the chunks alone
      // doubled it, the join doubled that again, and the Blob copied the result. A large pathogenicity
      // download ran the tab out of memory. Each chunk is decoded to scan its lines and then dropped, so
      // only one chunk plus a partial line is ever live.
      const parts: Uint8Array[] = []
      const decoder = new TextDecoder()
      let partialLine = ''
      let processedCount = 0
      let erroredCount = 0

      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        parts.push(value)

        // `stream: true` carries a multi-byte character split across chunks into the next decode, and
        // popping the final element keeps a record split across chunks from being counted twice.
        const lines = (partialLine + decoder.decode(value, {stream: true})).split('\n')
        partialLine = lines.pop() ?? ''
        for (const line of lines) {
          if (!line) continue
          processedCount += 1
          if (isErrorRecord(line)) erroredCount += 1
        }

        // Without a total there is nothing to divide by; stay indeterminate rather than report Infinity.
        fileDownloadProgress.value =
          totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : null
      }

      // The server emits exactly one record per variant, so a short body means it stopped early — status
      // and headers went out with the first chunk, so truncation is the only symptom a mid-stream failure
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
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)

      return {received: processedCount, errored: erroredCount}
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
    downloadMetadata,
    streamVariantDetails,
    streamVariantAnnotations,
    abortStream
  }
}
