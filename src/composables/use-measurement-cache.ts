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
  loadScores: (scoreSetUrn: string) => Promise<void>
  // In-flight flags for loading affordances.
  isDetailLoading: (variantUrn: string) => boolean
  isScoresLoading: (scoreSetUrn: string) => boolean
  clear: () => void
}

/**
 * Per-URN cache for a measurement's detail envelope, its score set, and its lean score distribution.
 *
 * `loadDetail` resolves the envelope + its score set for a variant URN; `loadScores` fetches the heavier
 * lean score distribution separately. Score set + scores are keyed by the URN's score-set prefix and
 * shared across measurements from the same assay. Request dedup + reads are memoized in the api layer
 * (@/api/cache); these Records are just the reactive projection the template renders. `clear()` drops
 * everything for a new query epoch (a changed `as_of` must re-resolve the molecular/annotation layer).
 *
 * Used by: useVariantLookup, useMeasurementSelection
 */
export function useMeasurementCache(asOf: Ref<string | null>): UseMeasurementCacheReturn {
  const variantDetails = shallowRef<Record<string, VariantDetail>>({})
  const scoreSets = shallowRef<Record<string, ScoreSet>>({})
  const scores = shallowRef<Record<string, DisplayVariant[]>>({})

  // In-flight keys, tracked so consumers can show a per-selection loading affordance. Reassigned (not
  // mutated) so the shallowRefs stay reactive.
  const pendingDetails = shallowRef<Set<string>>(new Set())
  const pendingScores = shallowRef<Set<string>>(new Set())
  function setPending(pending: Ref<Set<string>>, key: string, active: boolean) {
    if (pending.value.has(key) === active) return
    const next = new Set(pending.value)
    if (active) next.add(key)
    else next.delete(key)
    pending.value = next
  }

  async function loadScoreSet(scoreSetUrn: string) {
    if (scoreSets.value[scoreSetUrn]) return
    try {
      // Await into a local first, then spread — writing `{...scoreSets.value, [k]: await …}` would
      // capture the spread baseline before the await resolves, so two concurrent loaders (the selected
      // measurement + a prefetch) both snapshot the same pre-write map and the later write clobbers the
      // earlier key.
      const scoreSet = await getScoreSet(scoreSetUrn)
      scoreSets.value = {...scoreSets.value, [scoreSetUrn]: scoreSet}
    } catch (error) {
      console.error(`Error fetching score set "${scoreSetUrn}"`, error)
    }
  }

  async function loadScores(scoreSetUrn: string) {
    if (scores.value[scoreSetUrn]) return
    setPending(pendingScores, scoreSetUrn, true)
    try {
      // Await into a local before spreading — see loadScoreSet for why an inline `await` in the spread
      // literal races and drops keys under concurrent loads.
      const leanVariants = await getLeanScoreSetVariants(scoreSetUrn)
      scores.value = {...scores.value, [scoreSetUrn]: leanVariants}
    } catch (error) {
      console.error(`Error fetching scores for score set "${scoreSetUrn}"`, error)
    } finally {
      setPending(pendingScores, scoreSetUrn, false)
    }
  }

  async function loadDetail(variantUrn: string) {
    const scoreSetUrn = scoreSetUrnOf(variantUrn)
    // The score set backs certain metadata displayed alongside variant detail.
    loadScoreSet(scoreSetUrn)
    if (variantDetails.value[variantUrn]) return
    setPending(pendingDetails, variantUrn, true)
    try {
      const detail = await getVariantDetail(variantUrn, {asOf: asOf.value ?? undefined})
      variantDetails.value = {...variantDetails.value, [variantUrn]: detail}
    } catch (error) {
      console.error(`Error fetching variant detail for "${variantUrn}"`, error)
    } finally {
      setPending(pendingDetails, variantUrn, false)
    }
  }

  function clear() {
    variantDetails.value = {}
    scoreSets.value = {}
    scores.value = {}
    pendingDetails.value = new Set()
    pendingScores.value = new Set()
  }

  return {
    variantDetails,
    scoreSets,
    scores,
    loadDetail,
    loadScores,
    isDetailLoading: (variantUrn: string) => pendingDetails.value.has(variantUrn),
    isScoresLoading: (scoreSetUrn: string) => pendingScores.value.has(scoreSetUrn),
    clear
  }
}
