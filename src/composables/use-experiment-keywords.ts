import _ from 'lodash'
import {reactive, watch} from 'vue'

import {KEYWORDS, KEYWORD_GROUPS, initKeywordState} from '@/data/keywords'
import {buildKeywordPayload} from '@/lib/form-helpers'

/**
 * Composable for keyword state management in experiment forms.
 *
 * Owns the reactive keyword keys, descriptions, and visibility toggles.
 * Handles dependent-keyword clearing (e.g. sub-method keywords reset when
 * the top-level method changes) and builds the keywords API payload.
 *
 * Used by: ExperimentCreator.vue, ExperimentEditor.vue
 *
 * @example
 * ```ts
 * const keywords = useExperimentKeywords()
 * // Bind keywords.keywordKeys to the form
 * // On save: const payload = keywords.buildKeywordsPayload()
 * // On load: keywords.resetKeywords(experiment.keywords)
 * ```
 */
/**
 * Return type for {@link useExperimentKeywords}.
 *
 * Provides reactive keyword state (keys, descriptions, visibility toggles)
 * and methods for updating, resetting, and serializing keyword data for
 * experiment forms.
 */
export interface UseExperimentKeywordsReturn {
  /** Reactive map of keyword key → selected option label (or null). */
  keywordKeys: Record<string, string | null>
  /** Reactive map of keyword key → free-text description (or null). */
  keywordDescriptions: Record<string, string | null>
  /** Reactive map of keyword key → whether the free-text input is visible. */
  keywordTextVisible: Record<string, boolean>
  /** Toggle the free-text description input for a keyword field. */
  keywordToggleInput: (field: string) => void
  /** Update a keyword selection, clearing its description when set to null. */
  updateKeywordKey: (field: string, val: string | null) => void
  /** Populate keyword state from an API response's keywords array. */
  resetKeywords: (keywords?: Array<{keyword: {key: string; label?: string | null}; description?: string | null}>) => void
  /** Reset all keyword state to null/false defaults. */
  clearKeywords: () => void
  /** Build the keywords payload object for API submission. */
  buildKeywordsPayload: () => {keywords: ReturnType<typeof buildKeywordPayload>}
}

export function useExperimentKeywords(): UseExperimentKeywordsReturn {
  const state = initKeywordState()
  const keywordKeys = reactive(state.keywordKeys)
  const keywordDescriptions = reactive(state.keywordDescriptions)
  const keywordTextVisible = reactive(state.keywordTextVisible)

  // Clear dependent sub-method keywords when the top-level method changes
  watch(
    () => keywordKeys['Variant Library Creation Method'],
    (newValue) => {
      if (newValue !== 'Endogenous locus library method') {
        keywordKeys['Endogenous Locus Library Method System'] = null
        keywordKeys['Endogenous Locus Library Method Mechanism'] = null
      }
      if (newValue !== 'In vitro construct library method') {
        keywordKeys['In Vitro Construct Library Method System'] = null
        keywordKeys['In Vitro Construct Library Method Mechanism'] = null
      }
    }
  )

  function keywordToggleInput(field: string) {
    keywordTextVisible[field] = !keywordTextVisible[field]
  }

  function updateKeywordKey(field: string, val: string | null) {
    keywordKeys[field] = val
    if (val == null) {
      keywordDescriptions[field] = null
      keywordTextVisible[field] = false
    }
  }

  /**
   * Populate keyword state from an item's keywords array (e.g. after loading
   * an experiment from the API). Falls back to clearing all keywords when the
   * array is empty or missing.
   */
  function resetKeywords(keywords?: Array<{keyword: {key: string; label?: string | null}; description?: string | null}>) {
    if (keywords && keywords.length !== 0) {
      const setKeyword = (key: string) => {
        const keywordObj = keywords.find((kw) => kw.keyword.key === key)
        keywordKeys[key] = keywordObj?.keyword.label ?? null
        keywordDescriptions[key] = keywordObj?.description ?? null
      }
      for (const k of KEYWORDS) {
        setKeyword(k.key)
      }
    } else {
      clearKeywords()
    }
  }

  /** Reset all keyword state to null/false defaults. */
  function clearKeywords() {
    Object.assign(keywordKeys, _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])))
    Object.assign(keywordDescriptions, _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])))
    Object.assign(keywordTextVisible, _.fromPairs(KEYWORDS.map((kw) => [kw.key, false])))
  }

  /** Build the keywords payload for the API from current state. */
  function buildKeywordsPayload() {
    return {keywords: buildKeywordPayload(keywordKeys, keywordDescriptions, KEYWORD_GROUPS)}
  }

  return {
    keywordKeys,
    keywordDescriptions,
    keywordTextVisible,
    keywordToggleInput,
    updateKeywordKey,
    resetKeywords,
    clearKeywords,
    buildKeywordsPayload
  }
}
