import {computed, ref, type Ref} from 'vue'

import {downloadScoreSetFile, downloadScoreSetVariantData} from '@/api/mavedb'
import config from '@/config'
import {triggerDownload} from '@/lib/downloads'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export const TEXT_COLUMNS = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

interface UseScoreSetDownloadsOptions {
  scoreSet: Ref<ScoreSet | null>
  hasCounts?: Ref<boolean>
  // The ClinVar control version the page has resolved via the histogram.
  clinvarVersion?: Ref<string | null>
}

// Convert and pad the ClinVar version, or return null if the version isn't in the expected shape.
function clinvarNamespace(version: string | null | undefined): string | null {
  if (!version) return null
  const match = /^(\d{1,2})_(\d{4})$/.exec(version)
  if (!match) return null
  return `clinvar.${match[2]}_${match[1].padStart(2, '0')}`
}

export function useScoreSetDownloads({scoreSet, hasCounts, clinvarVersion}: UseScoreSetDownloadsOptions) {
  const customDialogVisible = ref(false)
  const selectedDataOptions = ref<string[]>([])
  // Shared progress state for the NDJSON streaming downloads (variant details + annotated variants).
  // Only one stream runs at a time — starting a new one aborts any in-flight stream. `streamTarget`
  // identifies which button's stream is running, so only that element renders the progress bar.
  const streamDownloadInProgress = ref(false)
  const streamDownloadProgress = ref(0)
  const streamTarget = ref<'variantDetails' | 'annotatedVariants' | null>(null)
  const streamController = ref<AbortController | null>(null)

  const dataTypeOptions = computed(() => {
    const options = [
      {label: 'Scores', value: 'scores'},
      {label: 'Reference-frame HGVS', value: 'mappedHgvs'},
      // Annotation namespaces served by the reworked CSV export. gnomAD / VEP / ClinGen are unversioned;
      // ClinVar is versioned and only offered when the page has resolved a control version to target.
      {label: 'gnomAD allele frequency', value: 'gnomad'},
      {label: 'VEP consequence', value: 'vep'},
      {label: 'ClinGen allele ID', value: 'clingen'},
      {label: 'Custom columns', value: 'includeCustomColumns'},
      {label: 'Without NA columns', value: 'dropNaColumns'}
    ]
    if (hasCounts?.value) {
      options.splice(1, 0, {label: 'Counts', value: 'counts'})
    }
    if (clinvarNamespace(clinvarVersion?.value)) {
      // Place ClinVar right after ClinGen alongside other annotation namespaces.
      const clingenIndex = options.findIndex((opt) => opt.value === 'clingen')
      options.splice(clingenIndex + 1, 0, {label: 'ClinVar significance', value: 'clinvar'})
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
      if (opt === 'scores') params.append('namespaces', 'scores')
      else if (opt === 'counts') params.append('namespaces', 'counts')
      else if (opt === 'gnomad') params.append('namespaces', 'gnomad')
      else if (opt === 'vep') params.append('namespaces', 'vep')
      else if (opt === 'clingen') params.append('namespaces', 'clingen')
      else if (opt === 'clinvar') {
        const namespace = clinvarNamespace(clinvarVersion?.value)
        if (namespace) params.append('namespaces', namespace)
      } else if (opt === 'mappedHgvs') params.append('include_post_mapped_hgvs', 'true')
      else if (opt === 'includeCustomColumns') params.append('include_custom_columns', 'true')
      else if (opt === 'dropNaColumns') params.append('drop_na_columns', 'true')
    }
    // Guarantee at least the core HGVS + score columns when only flags (no namespace) were selected.
    if (!params.has('namespaces')) params.append('namespaces', 'scores')
    const data = await downloadScoreSetVariantData(scoreSet.value.urn, params)
    triggerDownload(data, `${scoreSet.value.urn}_custom.csv`)
    customDialogVisible.value = false
  }

  function downloadMetadata() {
    if (!scoreSet.value) return
    const metadata = JSON.stringify(scoreSet.value.extraMetadata)
    triggerDownload(metadata, `${scoreSet.value.urn}_metadata.txt`, 'text/plain')
  }

  function abortStream() {
    if (streamController.value) {
      streamController.value.abort()
      streamDownloadInProgress.value = false
      streamDownloadProgress.value = 0
      streamTarget.value = null
    }
  }

  // Stream an NDJSON export (variant details, annotated variants) from a score-set sub-path to a file,
  // driving the shared progress bar off the server's X-Total-Count. Aborts any in-flight stream first.
  async function streamNdjson(subPath: string, filename: string, target: 'variantDetails' | 'annotatedVariants') {
    if (!scoreSet.value) return
    abortStream()
    streamController.value = new AbortController()

    try {
      streamDownloadInProgress.value = true
      streamTarget.value = target
      const response = await fetch(`${config.apiBaseUrl}/score-sets/${scoreSet.value.urn}/${subPath}`, {
        signal: streamController.value.signal,
        headers: {Accept: 'application/x-ndjson'}
      })

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
          anchor.download = filename
          anchor.click()
          URL.revokeObjectURL(url)
          break
        }
        const chunk = decoder.decode(value)
        chunks.push(chunk)
        // Count newline characters, and clamp to 100% for progress tracking.
        processedCount += chunk.split('\n').length - 1
        streamDownloadProgress.value = totalCount ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message !== 'The user aborted a request.') {
        throw error
      }
    } finally {
      streamController.value = null
      streamDownloadInProgress.value = false
      streamDownloadProgress.value = 0
      streamTarget.value = null
    }
  }

  function streamVariantDetails() {
    if (!scoreSet.value) return
    return streamNdjson('variant-details', `${scoreSet.value.urn}_variant_details.ndjson`, 'variantDetails')
  }

  function streamVariantAnnotations(annotationType: string) {
    if (!scoreSet.value) return
    return streamNdjson(
      `annotated-variants/${annotationType}`,
      `${scoreSet.value.urn}_annotated_variants_${annotationType}.ndjson`,
      'annotatedVariants'
    )
  }

  return {
    // State
    customDialogVisible,
    selectedDataOptions,
    streamDownloadInProgress,
    streamDownloadProgress,
    streamTarget,

    // Computed
    dataTypeOptions,

    // Methods
    downloadFile,
    downloadMultipleData,
    downloadMetadata,
    streamVariantDetails,
    streamVariantAnnotations,
    abortStream
  }
}
