import axios from 'axios'
import {reactive, watch, watchEffect, type Ref} from 'vue'

import config from '@/config'
import {reduceControlPlacement, type ControlLink} from '@/lib/clinvar-control-placement'
import {DEFAULT_CLINVAR_CONTROL_DB, DEFAULT_CLNREVSTAT_FIELD, DEFAULT_CLNSIG_FIELD} from '@/lib/clinvar-controls'
import type {ClinvarControl, ClinvarControlOption} from '@/lib/clinvar-controls'
import type {DisplayVariant} from '@/lib/variants'

/**
 * Shared clinical-control state for a single score set. This was previously owned privately by
 * `ScoreSetHistogram.vue`. The fetch is keyed purely by (db, version) — the interactive minimum-star
 * filter stays a per-consumer display concern and is NOT part of this store.
 *
 * The store owns db/version selection, the controls fetch (cached per db+version), and mutation of
 * `variant.control` onto the passed-in variants. It self-drives via watchers on `urn` and `variants`;
 * consumers only read state and (for the histogram's selectors) two-way bind `controlDb`/`controlVersion`.
 */
export interface ClinvarControlsStore {
  /** Available (db, versions) pairs for this score set. */
  options: ClinvarControlOption[]
  /** Controls for the currently selected (db, version). */
  controls: ClinvarControl[]
  /** Selected control database. Two-way bound by the histogram's DB selector. */
  controlDb: ClinvarControlOption | null
  /** Selected control version. Two-way bound by the histogram's version selector. */
  controlVersion: string | null
  /** True once an options+controls fetch cycle has settled (drives loading spinners / gating). */
  refreshed: boolean
  /** True once controls have been associated onto the variants (or a load failed). */
  associated: boolean
  /** True when at least one variant carries a matched clinvar control. */
  someVariantsHaveClinicalSignificance: boolean
  /** Derived: whether a DB/version selector is worth showing (more than one choice exists). Read-only in practice. */
  showOptions: boolean
}

export function useClinvarControls(
  urn: Ref<string | null | undefined>,
  variants: Ref<DisplayVariant[] | null>
): ClinvarControlsStore {
  const state: ClinvarControlsStore = reactive({
    options: [] as ClinvarControlOption[],
    controls: [] as ClinvarControl[],
    controlDb: null as ClinvarControlOption | null,
    controlVersion: null as string | null,
    refreshed: false,
    associated: false,
    someVariantsHaveClinicalSignificance: false,
    showOptions: false
  })

  // A DB/version selector is only worth showing when there's more than one choice.
  watchEffect(() => {
    const hasMultipleDbs = state.options.length > 1
    const hasSingleDbWithMultipleVersions = state.options.length === 1 && state.options[0].availableVersions.length > 1
    state.showOptions = hasMultipleDbs || hasSingleDbWithMultipleVersions
  })

  // Non-reactive controls cache, keyed [dbName][version]. Rebuilt whenever the options change.
  let cache: Record<string, Record<string, ClinvarControl[]>> = {}

  async function loadOptions() {
    const scoreSetUrn = urn.value
    if (!scoreSetUrn) {
      return
    }
    try {
      const response = await axios.get(`${config.apiBaseUrl}/score-sets/${scoreSetUrn}/clinical-controls/options`)
      if (response.status === 200) {
        state.options = response.data
      }
    } catch {
      // Still settle the flags so loading spinners clear and dependent views fall into an empty state.
      state.refreshed = true
      state.associated = true
    }
  }

  async function loadControls() {
    if (state.controlDb && state.controlVersion && cache[state.controlDb.dbName]?.[state.controlVersion].length > 0) {
      state.controls = cache[state.controlDb.dbName][state.controlVersion]
      state.refreshed = true
      return
    }

    state.refreshed = false
    let queryString = ''
    if (state.controlDb) {
      queryString += `?db=${encodeURIComponent(state.controlDb.dbName)}`
    }
    if (state.controlVersion) {
      queryString += queryString
        ? `&version=${encodeURIComponent(state.controlVersion)}`
        : `?version=${encodeURIComponent(state.controlVersion)}`
    }

    const scoreSetUrn = urn.value
    if (scoreSetUrn) {
      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/score-sets/${scoreSetUrn}/clinical-controls${queryString}`
        )
        if (response.data) {
          state.controls = response.data
          if (state.controlDb && state.controlVersion) {
            cache[state.controlDb.dbName][state.controlVersion] = response.data
          }
        }
      } catch {
        state.associated = true
      }
    }
    state.refreshed = true
  }

  function disassociate() {
    state.associated = false
    state.someVariantsHaveClinicalSignificance = false
    for (const variant of variants.value ?? []) {
      variant.control = null
    }
  }

  function associate() {
    const list = variants.value ?? []

    // Gather every control reaching each variant, tagged with the digest of the allele it annotates, then
    // reduce based on precedence + hard/soft discordance. A protein-change variant whose DNA siblings
    // disagree can be reached by several controls; the fold — not last-write-wins — decides its placement.
    const linksByUrn = new Map<string, ControlLink[]>()
    for (const control of state.controls) {
      for (const clinvarLink of control.clinvarLinks) {
        if (!clinvarLink.variantUrn) {
          continue
        }
        const links = linksByUrn.get(clinvarLink.variantUrn) ?? []
        links.push({
          significance: control[DEFAULT_CLNSIG_FIELD],
          reviewStatus: control[DEFAULT_CLNREVSTAT_FIELD],
          alleleDigest: clinvarLink.alleleDigest,
          dbIdentifier: control.dbIdentifier
        })
        linksByUrn.set(clinvarLink.variantUrn, links)
      }
    }

    let usableAny = false
    for (const variant of list) {
      const links = linksByUrn.get(variant.variantUrn)
      const placement = links ? reduceControlPlacement(links, variant.assayLevelDigest, variant.assayLevel) : null
      variant.control = placement
      // "Has clinical significance" gates the clinical view — a hard-discordant variant carries ClinVar
      // data but is not a usable control, so it doesn't count toward showing the view.
      if (placement && placement.discordance !== 'hard') {
        usableAny = true
      }
    }
    state.associated = true
    state.someVariantsHaveClinicalSignificance = usableAny
  }

  // A new score set resets everything and refetches the available options.
  watch(
    urn,
    () => {
      state.options = []
      state.controls = []
      state.controlDb = null
      state.controlVersion = null
      state.refreshed = false
      state.associated = false
      state.someVariantsHaveClinicalSignificance = false
      cache = {}
      loadOptions()
    },
    {immediate: true}
  )

  // Fresh options pick a default db+version (preferring ClinVar) and rebuild the cache skeleton.
  watch(
    () => state.options,
    () => {
      if (!state.controlDb) {
        const defaultDb = state.options.find((option) => option.dbName === DEFAULT_CLINVAR_CONTROL_DB)
        state.controlDb = defaultDb ? defaultDb : (state.options[0] ?? null)
      }
      if (!state.controlVersion) {
        state.controlVersion = state.controlDb?.availableVersions[0] ?? null
      }
      const next: Record<string, Record<string, ClinvarControl[]>> = {}
      for (const dbOption of state.options) {
        next[dbOption.dbName] = {}
        for (const version of dbOption.availableVersions) {
          next[dbOption.dbName][version] = []
        }
      }
      cache = next
    }
  )

  // Any change to the selected (db, version) reloads controls.
  watch(
    () => `${state.controlDb?.dbName}|${state.controlVersion}`,
    () => {
      loadControls()
    }
  )

  // New controls (or a new variant set arriving) re-associates onto the variants.
  watch([() => state.controls, variants], () => {
    disassociate()
    associate()
  })

  return state
}
