import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {getScoreCalibrationVariants} from '@/api/mavedb/calibrations'
import {formatEvidenceCode, functionalClassificationContainsVariant} from '@/lib/calibrations'
import type {components} from '@/schema/openapi'

type ScoreCalibration = components['schemas']['ScoreCalibration']
type FunctionalClassification = components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
type FunctionalClassificationVariants = components['schemas']['FunctionalClassificationVariants']

export interface UseCalibrationResolutionReturn {
  scoreRange: ComputedRef<FunctionalClassification | null>
  classification: ComputedRef<string | null>
  formattedEvidenceCode: ComputedRef<string>
  oddspathRatio: ComputedRef<string | null>
  isClassBased: ComputedRef<boolean>
}

/**
 * Resolves a variant's functional classification from a calibration.
 *
 * Handles two calibration types:
 * - **Range-based**: pure computed — finds the classification where the score falls within the range bounds.
 * - **Class-based**: fetches a membership map via the API, caches it, and looks up by variant URN.
 *
 * Range-based calibrations are resolved entirely client-side to avoid unnecessary API calls,
 * which matters on VariantScreen where users switch between variants frequently.
 */
export function useCalibrationResolution(
  calibration: Ref<ScoreCalibration | null>,
  variantUrn: Ref<string | null>,
  score: Ref<number | null>
): UseCalibrationResolutionReturn {
  // Cache of class-based membership maps keyed by calibration URN
  const membershipCache = ref<Record<string, FunctionalClassificationVariants[]>>({})

  const isClassBased = computed(() => {
    const fcs = calibration.value?.functionalClassifications
    if (!fcs || fcs.length === 0) return false
    return fcs.every((fc) => fc.class != null)
  })

  // Fetch membership map when calibration changes and is class-based
  watch(
    () => calibration.value?.urn,
    async (urn) => {
      if (!urn || !isClassBased.value) return
      if (membershipCache.value[urn]) return
      try {
        const data = await getScoreCalibrationVariants(urn)
        membershipCache.value[urn] = data
      } catch (error) {
        console.error(`Error fetching calibration variants for "${urn}"`, error)
      }
    },
    {immediate: true}
  )

  const scoreRange = computed<FunctionalClassification | null>(() => {
    const cal = calibration.value
    if (!cal?.functionalClassifications) return null

    if (isClassBased.value) {
      // Class-based: look up variant URN in membership map
      const urn = variantUrn.value
      if (!urn || !cal.urn) return null
      const classifications = membershipCache.value[cal.urn]
      if (!classifications) return null

      for (const fcVariants of classifications) {
        const found = fcVariants.variants?.some((v) => v.urn === urn)
        if (found) {
          // Match back to the functional classification on the calibration object
          return (
            cal.functionalClassifications.find((fc) => fc.id === fcVariants.functionalClassificationId) || null
          )
        }
      }
      return null
    }

    // Range-based: find classification containing the score
    const scoreVal = score.value
    if (scoreVal == null) return null
    return cal.functionalClassifications.find((fc) => functionalClassificationContainsVariant(fc, scoreVal)) || null
  })

  const classification = computed(() => scoreRange.value?.functionalClassification || null)
  const formattedEvidenceCode = computed(() => formatEvidenceCode(scoreRange.value))
  const oddspathRatio = computed(() =>
    scoreRange.value?.oddspathsRatio != null ? scoreRange.value.oddspathsRatio.toFixed(2) : null
  )

  return {
    scoreRange,
    classification,
    formattedEvidenceCode,
    oddspathRatio,
    isClassBased
  }
}
