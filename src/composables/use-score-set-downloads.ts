import {computed, ref, type Ref} from 'vue'

import {downloadScoreSetFile, downloadScoreSetVariantData, downloadMappedVariants} from '@/api/mavedb'
import config from '@/config'
import {triggerDownload} from '@/lib/downloads'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export const TEXT_COLUMNS = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

interface UseScoreSetDownloadsOptions {
  scoreSet: Ref<ScoreSet | null>
  hasCounts?: Ref<boolean>
}

export function useScoreSetDownloads({scoreSet, hasCounts}: UseScoreSetDownloadsOptions) {
  const customDialogVisible = ref(false)
  const selectedDataOptions = ref<string[]>([])
  const annotatedDownloadInProgress = ref(false)
  const annotatedDownloadProgress = ref(0)
  const streamController = ref<AbortController | null>(null)

  const dataTypeOptions = computed(() => {
    const options = [
      {label: 'Scores', value: 'scores'},
      {label: 'Mapped HGVS', value: 'mappedHgvs'},
      {label: 'Custom columns', value: 'includeCustomColumns'},
      {label: 'Without NA columns', value: 'dropNaColumns'}
    ]
    if (hasCounts?.value) {
      options.splice(1, 0, {label: 'Counts', value: 'counts'})
    }
    return options
  })

  async function downloadFile(type: 'scores' | 'counts') {
    if (!scoreSet.value) return
    const data = await downloadScoreSetFile(scoreSet.value.urn, type)
    triggerDownload(data, `${scoreSet.value.urn}_${type}.csv`)
  }

  async function downloadMultipleData() {
    if (!scoreSet.value) return
    const params = new URLSearchParams()
    for (const opt of selectedDataOptions.value) {
      if (opt === 'scores') params.append('data_type', 'scores')
      else if (opt === 'counts') params.append('data_type', 'counts')
      else if (opt === 'mappedHgvs') params.append('include_post_mapped_hgvs', 'true')
      else if (opt === 'includeCustomColumns') params.append('include_custom_columns', 'true')
      else if (opt === 'dropNaColumns') params.append('drop_na_columns', 'true')
    }
    if (!params.has('data_type')) params.append('data_type', 'scores')
    const data = await downloadScoreSetVariantData(scoreSet.value.urn, params)
    triggerDownload(data, `${scoreSet.value.urn}_custom.csv`)
    customDialogVisible.value = false
  }

  async function downloadMappedVariantsFile() {
    if (!scoreSet.value) return
    const data = await downloadMappedVariants(scoreSet.value.urn)
    triggerDownload(JSON.stringify(data), `${scoreSet.value.urn}_mapped_variants.json`, 'text/json')
  }

  function downloadMetadata() {
    if (!scoreSet.value) return
    const metadata = JSON.stringify(scoreSet.value.extraMetadata)
    triggerDownload(metadata, `${scoreSet.value.urn}_metadata.txt`, 'text/plain')
  }

  function abortStream() {
    if (streamController.value) {
      streamController.value.abort()
      annotatedDownloadInProgress.value = false
      annotatedDownloadProgress.value = 0
    }
  }

  async function streamVariantAnnotations(annotationType: string) {
    if (!scoreSet.value) return
    abortStream()
    streamController.value = new AbortController()

    try {
      annotatedDownloadInProgress.value = true
      const response = await fetch(
        `${config.apiBaseUrl}/score-sets/${scoreSet.value.urn}/annotated-variants/${annotationType}`,
        {signal: streamController.value.signal, headers: {Accept: 'application/x-ndjson'}}
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const totalCount = parseInt(response.headers.get('X-Total-Count') || '0')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')

      const decoder = new TextDecoder()
      const chunks: string[] = []
      let processedCount = 0

      while (true) {
        const {done, value} = await reader.read()
        if (done) {
          const blob = new Blob([chunks.join('')], {type: 'application/x-ndjson'})
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `${scoreSet.value!.urn}_annotated_variants_${annotationType}.ndjson`
          anchor.click()
          URL.revokeObjectURL(url)
          break
        }
        const chunk = decoder.decode(value)
        chunks.push(chunk)
        processedCount += chunk.split('\n').length
        annotatedDownloadProgress.value = Math.round((processedCount / totalCount) * 100)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message !== 'The user aborted a request.') {
        throw error
      }
    } finally {
      streamController.value = null
      annotatedDownloadInProgress.value = false
      annotatedDownloadProgress.value = 0
    }
  }

  return {
    // State
    customDialogVisible,
    selectedDataOptions,
    annotatedDownloadInProgress,
    annotatedDownloadProgress,

    // Computed
    dataTypeOptions,

    // Methods
    downloadFile,
    downloadMultipleData,
    downloadMappedVariantsFile,
    downloadMetadata,
    streamVariantAnnotations,
    abortStream
  }
}
