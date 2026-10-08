import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {useCalibrationResolution, type UseCalibrationResolutionReturn} from '@/composables/use-calibration-resolution'
import {scoreSetUrnOf, type UseMeasurementCacheReturn} from '@/composables/use-measurement-cache'
import {displayedClassification, eligibleCalibrations} from '@/lib/measurement-types'
import {stripCalibration} from '@/lib/score-strip'
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
  // True while the selected measurement's detail or lean scores are still in flight.
  selectedLoading: ComputedRef<boolean>
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
  cache: UseMeasurementCacheReturn,
  includeResearchUseOnly: Ref<boolean>
): UseMeasurementSelectionReturn {
  const selectedVariantUrn = ref<string | null>(null)
  const selectedCalibration = ref<string | null>(null)

  const selectedVariant = computed(() => variants.value.find((m) => m.variantUrn === selectedVariantUrn.value))
  const selectedLoading = computed(() => {
    const urn = selectedVariantUrn.value
    if (!urn) return false
    return cache.isDetailLoading(urn) || cache.isScoresLoading(scoreSetUrnOf(urn))
  })
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
  const selectedVariantScore = computed(() => selectedVariant.value?.score ?? null)

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
    if (!newUrn) return
    // Load the display essentials (detail + score set) first, then the heavier lean score distribution.
    // This allows the majority of data to render while we wait for any visualizations to load.
    await cache.loadDetail(newUrn)
    cache.loadScores(scoreSetUrnOf(newUrn))
  })

  // The calibration behind the selected row's call, so the panel and histogram open on what the row shows; else
  // the score set's default among the calibrations the row may draw on.
  const defaultCalibrationUrn = computed<string | null>(() => {
    const scoreSet = selectedScoreSet.value
    if (!scoreSet || !selectedVariant.value) return null
    const classificationId = displayedClassification(selectedVariant.value)?.classification.id
    const calibrations = eligibleCalibrations(scoreSet.scoreCalibrations, includeResearchUseOnly.value)
    return stripCalibration(classificationId, calibrations)?.urn ?? null
  })

  // A new measurement or a change to RUO evidence resets any manual pick to that measurement's default.
  watch([selectedVariantUrn, includeResearchUseOnly], () => {
    selectedCalibration.value = defaultCalibrationUrn.value
  })

  // Fill the default once the score set loads. Only fills an empty selection, so a manual pick via either
  // calibration picker is retained while the measurement stays selected.
  watch(
    defaultCalibrationUrn,
    (urn) => {
      if (!selectedCalibration.value) selectedCalibration.value = urn
    },
    {immediate: true}
  )

  return {
    selectedVariantUrn,
    selectVariant,
    selectedVariant,
    selectedLoading,
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
