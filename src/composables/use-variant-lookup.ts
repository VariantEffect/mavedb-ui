import pLimit from 'p-limit'
import {computed, ref, type ComputedRef, type Ref, watch} from 'vue'

import {downloadVariantCsv, getAlleleMeasurements, getVariantAnnotation} from '@/api/mavedb/variants'
import {useClingenAllele, type UseClingenAlleleReturn} from '@/composables/use-clingen-allele'
import {scoreSetUrnOf, useMeasurementCache} from '@/composables/use-measurement-cache'
import {useMeasurementSelection, type UseMeasurementSelectionReturn} from '@/composables/use-measurement-selection'

import {triggerDownload} from '@/lib/downloads'
import {describeRequestError} from '@/lib/errors'
import {getExperimentKeyword} from '@/lib/experiments'
import {assayLevelBucket} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

export type {AlleleMeasurement}

// Cap concurrent background prefetches so a large equivalence class doesn't fire a request storm on load.
const PREFETCH_CONCURRENCY = 4

export interface UseVariantLookupReturn extends UseMeasurementSelectionReturn {
  // ClinGen allele (delegated)
  clingenAllele: UseClingenAlleleReturn

  // Measurements list
  variants: Ref<AlleleMeasurement[]>
  variantsStatus: Ref<'NotLoaded' | 'Loading' | 'Loaded' | 'Error'>
  fetchVariants: () => Promise<void>

  // Filters (by assayed level)
  showNucleotide: Ref<boolean>
  showProtein: Ref<boolean>
  includeSuperseded: Ref<boolean>
  // Content valid-time — null = current; reconstructs the molecular/annotation layer as of an instant.
  asOf: Ref<string | null>
  nucleotideCount: ComputedRef<number>
  proteinCount: ComputedRef<number>
  filteredVariants: ComputedRef<AlleleMeasurement[]>

  // Per-measurement helpers (for measurement cards)
  getKeyword: (scoreSetUrn: string | null | undefined, key: string) => string | null

  // Page-level
  geneName: ComputedRef<string | null>
  uniqueAssayCount: ComputedRef<number>

  // Downloads
  // Names the file being prepared, or null when idle. One indicator for every download here, which also
  // serializes them: a second download is refused while one is in flight.
  downloadInProgressLabel: Ref<string | null>
  fetchVariantAnnotations: (annotationType: string) => Promise<void>
  downloadVariantCsvFile: (namespaces?: string[]) => Promise<void>
}

/**
 * Variant lookup composable for the ClinGen-allele-centric VariantScreen.
 *
 * Given a ClinGen allele ID (a nucleotide `CA` or protein `PA`), fetches its cross-layer equivalence
 * class of measurements from `GET /clingen-alleles/{caid}/measurements`, in the API's default order.
 * Manages assay-level filters and drives the selected measurement's detail panel, score distribution
 * chart, and calibration resolution.
 *
 * This is the orchestrating facade: it owns the measurements list, the query-axis controls, and the
 * fetch flow, and composes the per-URN cache ({@link useMeasurementCache}), selection + its derivations
 * ({@link useMeasurementSelection}), and allele metadata ({@link useClingenAllele}) into one flat return.
 *
 * Key behaviors:
 * - The measurements list order is authoritative; the default selection is simply the first entry (or
 *   the `?variant=` highlight when present).
 * - Details, score sets, and score data are cached per-URN to avoid redundant fetches when switching
 *   between measurement cards.
 * - Any query-axis change (anchor, superseded scope, content valid-time) refetches and clears the caches.
 *
 * Used by: VariantScreen.vue
 */
export function useVariantLookup(
  clingenAlleleId: Ref<string>,
  options?: {
    highlightUrn?: Ref<string | null>
    // Seeded from the URL so a shared `?include_superseded=`/`?as_of=` link loads in one fetch.
    initialIncludeSuperseded?: boolean
    initialAsOf?: string | null
    toast?: {add: (opts: {severity: string; summary: string; detail: string; life: number}) => void}
  }
): UseVariantLookupReturn {
  const clingenAllele = useClingenAllele(clingenAlleleId)
  const highlightUrn = options?.highlightUrn ?? ref<string | null>(null)

  // ── Measurements list + query axes ────────────────────────
  const variants = ref<AlleleMeasurement[]>([])
  const variantsStatus = ref<'NotLoaded' | 'Loading' | 'Loaded' | 'Error'>('NotLoaded')
  const showNucleotide = ref(true)
  const showProtein = ref(true)
  const includeSuperseded = ref(options?.initialIncludeSuperseded ?? false)
  const downloadInProgressLabel = ref<string | null>(null)
  const asOf = ref<string | null>(options?.initialAsOf ?? null)

  const prefetchLimit = pLimit(PREFETCH_CONCURRENCY)
  // Bumped each fetch so stale-epoch prefetches (and a slower in-flight list response) bail instead of
  // repopulating the just-cleared caches.
  let queryEpoch = 0
  // One-shot guard: honor an initial `?variant=` deep link that points at a superseded measurement exactly
  // once (enable superseded so it resolves). After the first fetch, user toggles are always respected —
  // toggling superseded off never re-enables itself just because the selected variant left the list.
  let honoredInitialHighlight = false

  // ── Filters (by assayed level) ────────────────────────────
  const nucleotideCount = computed(
    () => variants.value.filter((m) => assayLevelBucket(m.assayLevel) === 'nucleotide').length
  )
  const proteinCount = computed(
    () => variants.value.filter((m) => assayLevelBucket(m.assayLevel) === 'amino acid').length
  )
  const filteredVariants = computed(() =>
    variants.value.filter((m) => {
      const bucket = assayLevelBucket(m.assayLevel)
      return bucket === 'amino acid' ? showProtein.value : showNucleotide.value
    })
  )

  // ── Composed sub-domains ──────────────────────────────────
  const cache = useMeasurementCache(asOf)
  const selection = useMeasurementSelection(variants, filteredVariants, highlightUrn, cache)

  // ── Page-level ────────────────────────────────────────────
  const geneName = computed(() => {
    const firstUrn = variants.value[0]?.variantUrn
    if (!firstUrn) return null
    const targets = cache.scoreSets.value[scoreSetUrnOf(firstUrn)]?.targetGenes
    return targets && targets.length > 0 ? targets[0].name || null : null
  })
  const uniqueAssayCount = computed(() => new Set(variants.value.map((m) => m.scoreSetUrn)).size)

  function getKeyword(scoreSetUrn: string | null | undefined, key: string): string | null {
    if (!scoreSetUrn) return null
    return getExperimentKeyword(cache.scoreSets.value[scoreSetUrn]?.experiment, key)
  }

  // ── Data fetching ─────────────────────────────────────────
  async function fetchVariants() {
    variants.value = []
    cache.clear()
    // New query epoch (anchor / as_of / superseded changed). Fresh reads are keyed by as_of/superseded in
    // the memoized api layer, so a changed axis always misses the cache and hits the network.
    const epoch = ++queryEpoch
    variantsStatus.value = 'Loading'
    if (!clingenAlleleId.value) {
      variantsStatus.value = 'Loaded'
      return
    }

    try {
      // The API order IS the default (direct-first, strongest-evidence) — never re-ranked here.
      const measurements = await getAlleleMeasurements(clingenAlleleId.value, {
        includeSuperseded: includeSuperseded.value,
        asOf: asOf.value ?? undefined
      })

      // A newer query axis changed while this was in flight; let that fetch own the state so this slower
      // stale response can't overwrite it.
      if (epoch !== queryEpoch) return
      variants.value = measurements

      // Citation path, initial load ONLY: if the page opened on a `?variant=` deep link absent from the
      // current-only list (e.g. a cited *superseded* measurement), enable superseded once so it resolves and its
      // banner shows. The watcher refetches. Guarded by the one-shot flag so a later manual toggle-off is
      // honored (switches to a current variant below) instead of flipping superseded back on.
      //
      // NOTE: this deliberately triggers a second full fetch/clear cycle on load (current-only, then
      // superseded). It's correct but redundant — a proper query cache would dedup the shared
      // reads for free. Not worth hand-collapsing before such a migration.
      const shouldHonorCitation =
        !honoredInitialHighlight &&
        highlightUrn.value &&
        !includeSuperseded.value &&
        !variants.value.some((m) => m.variantUrn === highlightUrn.value)
      honoredInitialHighlight = true
      if (shouldHonorCitation) {
        // Stay 'Loading' through the handoff — the watcher's refetch owns the terminal status, so we skip
        // the transient 'Loaded' that would otherwise flicker Loaded→Loading→Loaded.
        includeSuperseded.value = true
        return
      }

      variantsStatus.value = 'Loaded'
      if (variants.value.length === 0) return

      // Default selection = the `?variant=` highlight if it's in the list, else the first measurement.
      // Writing the selection triggers useMeasurementSelection's watcher to load the selected detail.
      const highlighted = highlightUrn.value && variants.value.find((m) => m.variantUrn === highlightUrn.value)
      const selected = highlighted ? highlightUrn.value! : variants.value[0].variantUrn
      selection.selectedVariantUrn.value = selected

      // Prioritize the display variant: load its detail + score set (both quick, and enough to explore —
      // score, classification, identity, assay facts) before fanning out. The selection watcher loads the
      // heavier lean score distribution (histogram only), which rides behind this and the prefetch below.
      await cache.loadDetail(selected)
      if (epoch !== queryEpoch) return

      // Background-fetch the rest (details + their score sets, which back the cards' assay facts), capped so
      // a large equivalence class doesn't fire a request storm. Skip if a newer query epoch has started.
      for (const m of variants.value) {
        if (m.variantUrn !== selected) {
          prefetchLimit(() => (epoch === queryEpoch ? cache.loadDetail(m.variantUrn) : Promise.resolve()))
        }
      }
    } catch (error) {
      console.error('Error while loading variants', error)
      variantsStatus.value = 'Error'
    }
  }

  async function fetchVariantAnnotations(annotationType: string) {
    const activeVariant = selection.selectedVariantDetail.value
    if (!activeVariant?.urn || downloadInProgressLabel.value !== null) return

    downloadInProgressLabel.value = 'annotations'
    try {
      const data = await getVariantAnnotation(activeVariant.urn, annotationType)
      triggerDownload(JSON.stringify(data), activeVariant.urn + '_' + annotationType + '.json', 'text/json')
    } catch (error: unknown) {
      options?.toast?.add({
        severity: 'error',
        summary: 'Download failed',
        detail: `Could not fetch variant annotation: ${describeRequestError(error)}`,
        life: 4000
      })
    } finally {
      downloadInProgressLabel.value = null
    }
  }

  /**
   * Download the selected measurement's clinical CSV — the flat counterpart to
   * `fetchVariantAnnotations`. Omitting `namespaces` asks the server for its default set.
   */
  async function downloadVariantCsvFile(namespaces?: string[]) {
    const activeVariant = selection.selectedVariantDetail.value
    if (!activeVariant?.urn || downloadInProgressLabel.value !== null) return

    downloadInProgressLabel.value = 'variant CSV'
    try {
      const data = await downloadVariantCsv(activeVariant.urn, namespaces)
      triggerDownload(data, `${activeVariant.urn}.csv`, 'text/csv')
    } catch (error: unknown) {
      options?.toast?.add({
        severity: 'error',
        summary: 'Download failed',
        detail: `Could not download the variant table: ${describeRequestError(error)}`,
        life: 4000
      })
    } finally {
      downloadInProgressLabel.value = null
    }
  }

  // Any query-axis change (anchor, superseded scope, content valid-time) refetches; fetchVariants clears
  // the per-URN caches so detail/scores re-resolve under the new as_of.
  watch([clingenAlleleId, includeSuperseded, asOf], fetchVariants, {immediate: true})

  return {
    ...selection,
    clingenAllele,
    variants,
    variantsStatus,
    fetchVariants,
    showNucleotide,
    showProtein,
    includeSuperseded,
    asOf,
    nucleotideCount,
    proteinCount,
    filteredVariants,
    getKeyword,
    geneName,
    uniqueAssayCount,
    downloadInProgressLabel,
    fetchVariantAnnotations,
    downloadVariantCsvFile
  }
}
