import {shallowRef, type Ref} from 'vue'

import {getVariantDetail} from '@/api/mavedb/variants'
import {getLeanScoreSetVariants, getScoreSet} from '@/api/mavedb/score-sets'
import type {DisplayVariant} from '@/lib/variants'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type VariantDetail = components['schemas']['VariantDetail']

// A variant URN is `<score-set-urn>#<n>`, so its score set is the URN's prefix — no extra lookup needed.
export const scoreSetUrnOf = (variantUrn: string): string => variantUrn.split('#')[0]

export interface UseMeasurementCacheReturn {
  variantDetails: Ref<Record<string, VariantDetail>>
  scoreSets: Ref<Record<string, ScoreSet>>
  scores: Ref<Record<string, DisplayVariant[]>>
  loadDetail: (variantUrn: string) => Promise<void>
  clear: () => void
}

/**
 * Per-URN cache for a measurement's detail envelope, its score set, and its lean score distribution.
 *
 * `loadDetail` resolves all three for a variant URN — the score set (calibrations, target, experiment)
 * and scores are keyed by the URN's score-set prefix and shared across measurements from the same assay.
 * Request dedup + reads are memoized in the api layer (@/api/cache); these Records are just the reactive
 * projection the template renders. `clear()` drops everything for a new query epoch (a changed `as_of`
 * must re-resolve the molecular/annotation layer).
 *
 * Used by: useVariantLookup, useMeasurementSelection
 */
export function useMeasurementCache(asOf: Ref<string | null>): UseMeasurementCacheReturn {
  const variantDetails = shallowRef<Record<string, VariantDetail>>({})
  const scoreSets = shallowRef<Record<string, ScoreSet>>({})
  const scores = shallowRef<Record<string, DisplayVariant[]>>({})

  async function loadScoreSet(scoreSetUrn: string) {
    if (scoreSets.value[scoreSetUrn]) return
    try {
      scoreSets.value = {...scoreSets.value, [scoreSetUrn]: await getScoreSet(scoreSetUrn)}
    } catch (error) {
      console.error(`Error fetching score set "${scoreSetUrn}"`, error)
    }
  }

  async function loadScores(scoreSetUrn: string) {
    if (scores.value[scoreSetUrn]) return
    try {
      scores.value = {...scores.value, [scoreSetUrn]: await getLeanScoreSetVariants(scoreSetUrn)}
    } catch (error) {
      console.error(`Error fetching scores for score set "${scoreSetUrn}"`, error)
    }
  }

  async function loadDetail(variantUrn: string) {
    const scoreSetUrn = scoreSetUrnOf(variantUrn)
    // The score set and lean scores are needed regardless of whether the envelope is cached, so kick
    // those off first.
    loadScoreSet(scoreSetUrn)
    loadScores(scoreSetUrn)
    if (variantDetails.value[variantUrn]) return
    try {
      const detail = await getVariantDetail(variantUrn, {asOf: asOf.value ?? undefined})
      variantDetails.value = {...variantDetails.value, [variantUrn]: detail}
    } catch (error) {
      console.error(`Error fetching variant detail for "${variantUrn}"`, error)
    }
  }

  function clear() {
    variantDetails.value = {}
    scoreSets.value = {}
    scores.value = {}
  }

  return {variantDetails, scoreSets, scores, loadDetail, clear}
}
