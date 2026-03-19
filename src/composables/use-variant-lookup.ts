import axios from 'axios'
import {computed, ref, shallowRef, watch, type ComputedRef, type Ref} from 'vue'

import {
  getVariantAnnotation,
  getVariantDetail,
  getVariantScores,
  lookupVariantsByClingenId
} from '@/api/mavedb/variants'
import {useCalibrationResolution, type UseCalibrationResolutionReturn} from '@/composables/use-calibration-resolution'
import {useClingenAllele, type UseClingenAlleleReturn} from '@/composables/use-clingen-allele'

import {
  formatEvidenceCode,
  functionalClassificationContainsVariant,
  getClassificationOddsPath,
  getPrimaryCalibration
} from '@/lib/calibrations'
import {triggerDownload} from '@/lib/downloads'
import {getExperimentKeyword} from '@/lib/experiments'
import {parseScoresOrCounts, type ScoresOrCountsRow} from '@/lib/scores'
import type {MeasurementType} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

export type {MeasurementType}

type ScoreCalibration = components['schemas']['ScoreCalibration']
type ScoreSet = components['schemas']['ScoreSet']
type VariantEffectMeasurementWithShortScoreSet = components['schemas']['VariantEffectMeasurementWithShortScoreSet']
type VariantEffectMeasurementWithScoreSet = components['schemas']['VariantEffectMeasurementWithScoreSet']
type FunctionalClassification =
  components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']

export type VariantEntry = {content: VariantEffectMeasurementWithShortScoreSet; type: MeasurementType}

export interface UseVariantLookupReturn {
  // ClinGen allele (delegated)
  clingenAllele: UseClingenAlleleReturn

  // Variant list
  variants: Ref<VariantEntry[]>
  variantsStatus: Ref<'NotLoaded' | 'Loading' | 'Loaded' | 'Error'>
  fetchVariants: () => Promise<void>

  // Filters
  showNucleotide: Ref<boolean>
  showProtein: Ref<boolean>
  nucleotideCount: ComputedRef<number>
  proteinCount: ComputedRef<number>
  filteredVariants: ComputedRef<VariantEntry[]>

  // Selection
  selectedVariantUrn: Ref<string | null>
  selectVariant: (urn: string | null | undefined) => void
  selectedVariant: ComputedRef<VariantEntry | undefined>
  selectedVariantDetail: ComputedRef<VariantEffectMeasurementWithScoreSet | null>
  selectedVariantName: ComputedRef<string | null>
  selectedClingenAlleleId: ComputedRef<string | null>

  // Scores
  selectedScoreSet: ComputedRef<ScoreSet | null>
  selectedScoreSetUrn: ComputedRef<string | null>
  scores: ComputedRef<readonly ScoresOrCountsRow[] | null>
  variantScoreRow: ComputedRef<ScoresOrCountsRow | undefined>
  selectedVariantScore: ComputedRef<number | string | null>

  // Calibration
  selectedCalibration: Ref<string | null>
  selectedCalibrationObject: ComputedRef<ScoreCalibration | null>
  calibrationResolution: UseCalibrationResolutionReturn

  // Per-variant helpers
  getAbnormalOddsPath: (urn: string | null | undefined) => string | null
  getNormalOddsPath: (urn: string | null | undefined) => string | null
  getVariantClassification: (urn: string | null | undefined) => string | null
  getVariantEvidenceCode: (urn: string | null | undefined) => string | null
  getKeyword: (variantContent: VariantEffectMeasurementWithShortScoreSet, key: string) => string | null

  // Page-level
  geneName: ComputedRef<string | null>
  uniqueAssayCount: ComputedRef<number>

  // Downloads
  fetchVariantAnnotations: (annotationType: string) => Promise<void>
}

/**
 * Variant lookup composable for the VariantScreen.
 *
 * Given a ClinGen allele ID, fetches all matching variant effect measurements
 * (nucleotide and protein level), manages measurement-type filters, and drives
 * the selected variant's detail panel, score distribution chart, and calibration
 * resolution.
 *
 * Key behaviors:
 * - Variant details and score data are cached per-URN to avoid redundant fetches
 *   when switching between measurement cards.
 * - When filters hide the currently selected variant, the selection auto-falls
 *   back to the first visible measurement.
 * - Delegates to {@link useClingenAllele} for allele metadata and
 *   {@link useCalibrationResolution} for classification resolution.
 *
 * Used by: VariantScreen.vue
 */
export function useVariantLookup(
  clingenAlleleId: Ref<string>,
  options?: {toast?: {add: (opts: {severity: string; summary: string; detail: string; life: number}) => void}}
): UseVariantLookupReturn {
  // ── Leaf composables ──────────────────────────────────────
  const clingenAllele = useClingenAllele(clingenAlleleId)

  // ── Reactive state ────────────────────────────────────────
  const variants = ref<VariantEntry[]>([])
  const variantsStatus = ref<'NotLoaded' | 'Loading' | 'Loaded' | 'Error'>('NotLoaded')
  const selectedVariantUrn = ref<string | null>(null)
  const showNucleotide = ref(true)
  const showProtein = ref(true)
  const variantDetailCache = ref<Record<string, VariantEffectMeasurementWithScoreSet>>({})
  const scoresCache = shallowRef<Record<string, readonly ScoresOrCountsRow[]>>({})
  const selectedCalibration = ref<string | null>(null)

  // ── Filters ───────────────────────────────────────────────
  const nucleotideCount = computed(
    () => variants.value.filter((v) => v.type === 'nucleotide' || v.type === 'associatedNucleotide').length
  )
  const proteinCount = computed(() => variants.value.filter((v) => v.type === 'protein').length)
  const filteredVariants = computed(() =>
    variants.value.filter((v) => {
      if (v.type === 'nucleotide' || v.type === 'associatedNucleotide') return showNucleotide.value
      if (v.type === 'protein') return showProtein.value
      return true
    })
  )

  // ── Selection ─────────────────────────────────────────────
  const selectedVariant = computed(() => variants.value.find((v) => v.content.urn === selectedVariantUrn.value))
  const selectedVariantDetail = computed<VariantEffectMeasurementWithScoreSet | null>(() => {
    if (!selectedVariantUrn.value) return null
    return variantDetailCache.value[selectedVariantUrn.value] || null
  })
  const selectedScoreSet = computed<ScoreSet | null>(() => selectedVariantDetail.value?.scoreSet || null)
  const selectedVariantName = computed(() => {
    if (!selectedVariant.value) return null
    const v = selectedVariant.value.content
    const mapped = v.mappedVariants.find((m) => m.current)
    // postMapped is typed as `unknown` in the schema — cast to access VRS expression fields
    const postMapped = mapped?.postMapped as {expressions?: {value?: string}[]} | undefined
    return postMapped?.expressions?.[0]?.value || v.hgvsNt || v.hgvsPro || v.hgvsSplice || null
  })
  const selectedClingenAlleleId = computed(() => {
    const mapped = selectedVariantDetail.value?.mappedVariants.find((m) => m.current)
    return mapped?.clingenAlleleId || null
  })

  // ── Scores ────────────────────────────────────────────────
  const selectedScoreSetUrn = computed(() => selectedScoreSet.value?.urn || null)
  const scores = computed(() => {
    if (!selectedScoreSetUrn.value) return null
    return scoresCache.value[selectedScoreSetUrn.value] || null
  })
  const variantScoreRow = computed(() => (scores.value || []).find((s) => s.accession === selectedVariantUrn.value))
  const selectedVariantScore = computed(() => variantScoreRow.value?.scores?.score ?? null)

  // ── Calibration ───────────────────────────────────────────
  const selectedCalibrationObject = computed<ScoreCalibration | null>(() => {
    if (!selectedCalibration.value || !selectedScoreSet.value?.scoreCalibrations) return null
    return (
      selectedScoreSet.value.scoreCalibrations.find((c: ScoreCalibration) => c.urn === selectedCalibration.value) ||
      null
    )
  })

  const selectedVariantScoreAsNumber = computed<number | null>(() => {
    const s = selectedVariantScore.value
    if (s == null || s === 'NA') return null
    const n = typeof s === 'number' ? s : Number(s)
    return Number.isNaN(n) ? null : n
  })

  const calibrationResolution = useCalibrationResolution(
    selectedCalibrationObject,
    selectedVariantUrn,
    selectedVariantScoreAsNumber
  )

  // ── Page-level ────────────────────────────────────────────
  const geneName = computed(() => {
    const firstVariant = variants.value[0]?.content
    const targets = firstVariant?.scoreSet?.targetGenes
    return targets?.length > 0 ? targets[0].name || null : null
  })
  const uniqueAssayCount = computed(() => {
    const urns = new Set(variants.value.map((v) => v.content.scoreSet?.urn).filter(Boolean))
    return urns.size
  })

  // ── Data fetching ─────────────────────────────────────────
  async function fetchVariantDetail(variantUrn: string) {
    if (variantDetailCache.value[variantUrn]) return
    try {
      const detail = await getVariantDetail(variantUrn)
      variantDetailCache.value[variantUrn] = detail
      const scoreSetUrn = detail.scoreSet?.urn
      if (scoreSetUrn) {
        fetchScores(scoreSetUrn)
      }
    } catch (error) {
      console.error(`Error fetching variant detail for "${variantUrn}"`, error)
    }
  }

  async function fetchScores(scoreSetUrn: string) {
    if (scoresCache.value[scoreSetUrn]) return
    try {
      const data = await getVariantScores(scoreSetUrn)
      scoresCache.value = {
        ...scoresCache.value,
        [scoreSetUrn]: Object.freeze(parseScoresOrCounts(data, true))
      }
    } catch (error) {
      console.error(`Error fetching scores for score set "${scoreSetUrn}"`, error)
    }
  }

  async function fetchVariants() {
    variants.value = []
    variantDetailCache.value = {}
    scoresCache.value = {}
    variantsStatus.value = 'Loading'
    try {
      const results = await lookupVariantsByClingenId([clingenAlleleId.value])
      const lookup = results[0]

      if (clingenAlleleId.value.startsWith('CA')) {
        const nucleotideVariants = (lookup?.exactMatch?.variantEffectMeasurements || []).map((entry) => ({
          content: entry,
          type: 'nucleotide' as const
        }))
        const proteinVariants = (
          lookup?.equivalentAa?.flatMap((entry) => entry.variantEffectMeasurements || []) || []
        ).map((entry) => ({content: entry, type: 'protein' as const}))
        const associatedNucleotideVariants = (
          lookup?.equivalentNt?.flatMap((entry) => entry.variantEffectMeasurements || []) || []
        ).map((entry) => ({content: entry, type: 'associatedNucleotide' as const}))
        variants.value = [...nucleotideVariants, ...proteinVariants, ...associatedNucleotideVariants]
      } else if (clingenAlleleId.value.startsWith('PA')) {
        const proteinVariants = (lookup?.exactMatch?.variantEffectMeasurements || []).map((entry) => ({
          content: entry,
          type: 'protein' as const
        }))
        const nucleotideVariants = (
          lookup?.equivalentNt?.flatMap((entry) => entry.variantEffectMeasurements || []) || []
        ).map((entry) => ({content: entry, type: 'nucleotide' as const}))
        variants.value = [...proteinVariants, ...nucleotideVariants]
      }

      variantsStatus.value = 'Loaded'

      if (variants.value.length === 0) return

      const firstUrn = variants.value[0].content.urn
      if (!firstUrn) return
      await fetchVariantDetail(firstUrn)
      selectedVariantUrn.value = firstUrn

      // Background-fetch remaining variant details
      const remainingUrns = variants.value
        .slice(1)
        .map((v) => v.content.urn)
        .filter((urn): urn is string => urn != null)
      for (const urn of remainingUrns) {
        fetchVariantDetail(urn)
      }
    } catch (error) {
      console.error('Error while loading variants', error)
      variantsStatus.value = 'Error'
    }
  }

  async function fetchVariantAnnotations(annotationType: string) {
    const activeVariant = selectedVariantDetail.value
    if (!activeVariant?.urn) return

    try {
      const data = await getVariantAnnotation(activeVariant.urn, annotationType)
      triggerDownload(JSON.stringify(data), activeVariant.urn + '_' + annotationType + '.json', 'text/json')
    } catch (error: unknown) {
      let serverMessage = ''
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data
        if (typeof data === 'string') serverMessage = data
        else if (typeof data === 'object' && data !== null && 'detail' in data) serverMessage = String(data.detail)
        else serverMessage = JSON.stringify(data)
      } else {
        serverMessage = error instanceof Error ? error.message : 'Unknown error.'
      }
      options?.toast?.add({
        severity: 'error',
        summary: 'Download failed',
        detail: `Could not fetch variant annotation: ${serverMessage}`,
        life: 4000
      })
    }
  }

  function selectVariant(urn: string | null | undefined) {
    selectedVariantUrn.value = urn ?? null
  }

  // ── Per-variant helpers (for measurement cards) ───────────
  function getKeyword(variantContent: VariantEffectMeasurementWithShortScoreSet, key: string): string | null {
    return getExperimentKeyword(variantContent?.scoreSet?.experiment, key)
  }

  function getAbnormalOddsPath(urn: string | null | undefined): string | null {
    if (!urn) return null
    return getClassificationOddsPath(getPrimaryCalibration(variantDetailCache.value[urn]?.scoreSet), 'abnormal')
  }

  function getNormalOddsPath(urn: string | null | undefined): string | null {
    if (!urn) return null
    return getClassificationOddsPath(getPrimaryCalibration(variantDetailCache.value[urn]?.scoreSet), 'normal')
  }

  function getVariantScoreRange(variantUrn: string | null | undefined): FunctionalClassification | null {
    if (!variantUrn) return null
    const detail = variantDetailCache.value[variantUrn]
    const scoreSetUrn = detail?.scoreSet?.urn
    if (!scoreSetUrn) return null

    const cachedScores = scoresCache.value[scoreSetUrn]
    if (!cachedScores) return null

    const scoreRow = cachedScores.find((s) => s.accession === variantUrn)
    const rawScore = scoreRow?.scores?.score
    if (rawScore == null || rawScore === 'NA') return null
    const score = typeof rawScore === 'number' ? rawScore : Number(rawScore)
    if (Number.isNaN(score)) return null

    const cal = getPrimaryCalibration(detail?.scoreSet)
    if (!cal?.functionalClassifications) return null

    return cal.functionalClassifications.find((r) => functionalClassificationContainsVariant(r, score)) || null
  }

  function getVariantClassification(variantUrn: string | null | undefined): string | null {
    return getVariantScoreRange(variantUrn)?.functionalClassification || null
  }

  function getVariantEvidenceCode(variantUrn: string | null | undefined): string | null {
    return formatEvidenceCode(getVariantScoreRange(variantUrn)) || null
  }

  // ── Watchers ──────────────────────────────────────────────
  watch(
    clingenAlleleId,
    async (newValue, oldValue) => {
      if (newValue !== oldValue) {
        await fetchVariants()
      }
    },
    {immediate: true}
  )

  // When filters hide the currently selected variant, fall back to the first visible one.
  watch(filteredVariants, (visible) => {
    if (selectedVariantUrn.value && !visible.some((v) => v.content.urn === selectedVariantUrn.value)) {
      selectedVariantUrn.value = visible[0]?.content.urn ?? null
    }
  })

  watch(selectedVariantUrn, async (newUrn) => {
    selectedCalibration.value = null
    if (newUrn) {
      await fetchVariantDetail(newUrn)
    }
  })

  return {
    clingenAllele,
    variants,
    variantsStatus,
    fetchVariants,
    showNucleotide,
    showProtein,
    nucleotideCount,
    proteinCount,
    filteredVariants,
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
    calibrationResolution,
    getAbnormalOddsPath,
    getNormalOddsPath,
    getVariantClassification,
    getVariantEvidenceCode,
    getKeyword,
    geneName,
    uniqueAssayCount,
    fetchVariantAnnotations
  }
}
