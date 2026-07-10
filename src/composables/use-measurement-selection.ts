import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {useCalibrationResolution, type UseCalibrationResolutionReturn} from '@/composables/use-calibration-resolution'
import {scoreSetUrnOf, type UseMeasurementCacheReturn} from '@/composables/use-measurement-cache'
import type {DisplayVariant} from '@/lib/variants'
import type {components} from '@/schema/openapi'

type ScoreCalibration = components['schemas']['ScoreCalibration']
type ScoreSet = components['schemas']['ScoreSet']
type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type VariantDetail = components['schemas']['VariantDetail']

export interface UseMeasurementSelectionReturn {
  selectedVariantUrn: Ref<string | null>
  selectVariant: (urn: string | null | undefined) => void
  selectedVariant: ComputedRef<AlleleMeasurement | undefined>
  selectedVariantDetail: ComputedRef<VariantDetail | null>
  selectedVariantName: ComputedRef<string | null>
  selectedClingenAlleleId: ComputedRef<string | null>
  selectedScoreSet: ComputedRef<ScoreSet | null>
  selectedScoreSetUrn: ComputedRef<string | null>
  scores: ComputedRef<DisplayVariant[] | null>
  variantScoreRow: ComputedRef<DisplayVariant | undefined>
  selectedVariantScore: ComputedRef<number | null>
  selectedCalibration: Ref<string | null>
  selectedCalibrationObject: ComputedRef<ScoreCalibration | null>
  calibrationResolution: UseCalibrationResolutionReturn
}

/**
 * Selection state for the measurements list: which measurement is active and everything derived from it
 * (detail envelope, score set, score distribution, calibration resolution).
 *
 * Reconciles the selection against list changes — honors the `?variant=` highlight, falls back to the
 * first visible measurement when a filter hides the active one, and loads the selected measurement's
 * detail on change. Reads cached detail/score-set/scores from {@link useMeasurementCache}; the caller
 * owns the list and seeds the initial selection by writing `selectedVariantUrn` after a fetch.
 *
 * Used by: useVariantLookup
 */
export function useMeasurementSelection(
  variants: Ref<AlleleMeasurement[]>,
  filteredVariants: ComputedRef<AlleleMeasurement[]>,
  highlightUrn: Ref<string | null>,
  cache: UseMeasurementCacheReturn
): UseMeasurementSelectionReturn {
  const selectedVariantUrn = ref<string | null>(null)
  const selectedCalibration = ref<string | null>(null)

  const selectedVariant = computed(() => variants.value.find((m) => m.variantUrn === selectedVariantUrn.value))
  const selectedVariantDetail = computed<VariantDetail | null>(() => {
    if (!selectedVariantUrn.value) return null
    return cache.variantDetails.value[selectedVariantUrn.value] || null
  })
  const selectedScoreSet = computed<ScoreSet | null>(() => {
    if (!selectedVariantUrn.value) return null
    return cache.scoreSets.value[scoreSetUrnOf(selectedVariantUrn.value)] || null
  })
  const selectedVariantName = computed(() => {
    const m = selectedVariant.value
    if (m) return m.assayLevelHgvs || m.submittedHgvs || null
    const detail = selectedVariantDetail.value
    return detail?.referenceHgvs || detail?.targetHgvs || null
  })
  // The detail envelope carries the measured allele's ClinGen id as a flat field (centers the measured
  // level — a related measurement shows its OWN CAID/PAID, not the queried anchor's).
  const selectedClingenAlleleId = computed(() => selectedVariantDetail.value?.clingenAlleleId || null)

  const selectedScoreSetUrn = computed(() => selectedScoreSet.value?.urn || null)
  const scores = computed(() => {
    if (!selectedScoreSetUrn.value) return null
    return cache.scores.value[selectedScoreSetUrn.value] || null
  })
  const variantScoreRow = computed(() => (scores.value || []).find((s) => s.variantUrn === selectedVariantUrn.value))
  const selectedVariantScore = computed(() => variantScoreRow.value?.score ?? null)

  const selectedCalibrationObject = computed<ScoreCalibration | null>(() => {
    if (!selectedCalibration.value || !selectedScoreSet.value?.scoreCalibrations) return null
    return (
      selectedScoreSet.value.scoreCalibrations.find((c: ScoreCalibration) => c.urn === selectedCalibration.value) ||
      null
    )
  })

  const calibrationResolution = useCalibrationResolution(
    selectedCalibrationObject,
    selectedVariantUrn,
    selectedVariantScore
  )

  function selectVariant(urn: string | null | undefined) {
    selectedVariantUrn.value = urn ?? null
  }

  // The `?variant=` highlight can change without the CAID changing (e.g. arriving from a redirect).
  watch(highlightUrn, (urn) => {
    if (urn && variants.value.some((m) => m.variantUrn === urn)) {
      selectedVariantUrn.value = urn
    }
  })

  // When filters hide the currently selected measurement, fall back to the first visible one.
  watch(filteredVariants, (visible) => {
    if (selectedVariantUrn.value && !visible.some((m) => m.variantUrn === selectedVariantUrn.value)) {
      selectedVariantUrn.value = visible[0]?.variantUrn ?? null
    }
  })

  watch(selectedVariantUrn, async (newUrn) => {
    selectedCalibration.value = null
    if (newUrn) await cache.loadDetail(newUrn)
  })

  return {
    selectedVariantUrn,
    selectVariant,
    selectedVariant,
    selectedVariantDetail,
    selectedVariantName,
    selectedClingenAlleleId,
    selectedScoreSet,
    selectedScoreSetUrn,
    scores,
    variantScoreRow,
    selectedVariantScore,
    selectedCalibration,
    selectedCalibrationObject,
    calibrationResolution
  }
}
