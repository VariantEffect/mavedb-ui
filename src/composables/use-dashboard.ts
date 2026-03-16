/**
 * Composable for the user dashboard (DashboardView).
 *
 * Fetches and manages the current user's score sets, experiments, collections,
 * and calibrations. Provides per-tab filtering (chip filters + text search),
 * cross-tab linking (e.g. "show score sets for this experiment"), and loading /
 * error state for each resource type.
 *
 * All data is fetched from `/me/` API endpoints on mount via {@link fetchAll},
 * and individual resources can be refreshed independently after mutations.
 *
 * Used by: DashboardView.vue
 *
 * @example
 * ```ts
 * const dashboard = useDashboard()
 * await dashboard.fetchAll()
 * dashboard.scoreSetFilter.value = ['published']   // filter score sets tab
 * dashboard.filteredScoreSets.value                 // reactive filtered list
 * ```
 */
// TODO: Add sort controls to dashboard tabs (reuse SORT_OPTIONS from lib/search.ts)
import {computed, reactive, ref, type ComputedRef, type Ref} from 'vue'

import {searchMyScoreSets} from '@/api/mavedb/score-sets'
import {searchMyExperiments} from '@/api/mavedb/experiments'
import {getMyCollections} from '@/api/mavedb/collections'
import {getMyCalibrations} from '@/api/mavedb/calibrations'
import useAuth from '@/composition/auth'
import {components} from '@/schema/openapi'

type ShortScoreSet = components['schemas']['ShortScoreSet']
type ShortExperiment = components['schemas']['ShortExperiment']
type Collection = components['schemas']['Collection']
type ScoreCalibration = components['schemas']['ScoreCalibration']

// TODO: Add a calibrations cross-tab filter (e.g. "show calibrations for this score set")
// once the /me/calibrations API endpoint lands and calibrations include a scoreSetUrn.
/** Cross-tab filter that narrows one tab's results based on a related entity from another tab. */
export type CrossTabFilter = {type: 'experiment'; experimentUrn: string; experimentTitle: string}

/** Collection enriched with the current user's role. */
export interface CollectionWithRole extends Collection {
  role: 'admin' | 'editor' | 'viewer'
}

/** Score set enriched with derived role and publication status. */
export interface ScoreSetWithMeta extends ShortScoreSet {
  role: 'owner' | 'contributor'
  status: 'published' | 'unpublished' | 'superseded'
}

/** Experiment enriched with derived role and publication status. */
export interface ExperimentWithMeta extends ShortExperiment {
  role: 'owner' | 'contributor'
  status: 'published' | 'unpublished'
}

/**
 * Return type for {@link useDashboard}.
 *
 * Organises dashboard state into four groups: raw data, loading/error flags,
 * filter/search controls, and derived (filtered) lists.
 */
export interface UseDashboardReturn {
  // ── Raw data ────────────────────────────────────────────────────────────
  /** All score sets owned by or contributed to by the current user. */
  scoreSets: Ref<ScoreSetWithMeta[]>
  /** All experiments owned by or contributed to by the current user. */
  experiments: Ref<ExperimentWithMeta[]>
  /** All collections the current user has any role in. */
  collections: Ref<CollectionWithRole[]>
  /** All calibrations created by the current user. */
  calibrations: Ref<ScoreCalibration[]>

  // ── Loading / error flags ───────────────────────────────────────────────
  /** Per-resource loading state (true while the API call is in flight). */
  loading: {scoreSets: boolean; experiments: boolean; collections: boolean; calibrations: boolean}
  /** Per-resource error state (true if the most recent fetch failed). */
  error: {scoreSets: boolean; experiments: boolean; collections: boolean; calibrations: boolean}

  // ── Filter & search controls ────────────────────────────────────────────
  /** Active filter chip values for the score sets tab (e.g. ['published', 'owned']). */
  scoreSetFilter: Ref<string[]>
  /** Active filter chip values for the experiments tab. */
  experimentFilter: Ref<string[]>
  /** Active filter chip values for the collections tab. */
  collectionFilter: Ref<string[]>
  /** Active filter chip values for the calibrations tab. */
  calibrationFilter: Ref<string[]>
  /** Free-text search query for score sets. */
  scoreSetSearch: Ref<string>
  /** Free-text search query for experiments. */
  experimentSearch: Ref<string>
  /** Free-text search query for collections. */
  collectionSearch: Ref<string>
  /** Free-text search query for calibrations. */
  calibrationSearch: Ref<string>
  /** Optional cross-tab filter linking one tab's results to a related entity. */
  crossTabFilter: Ref<CrossTabFilter | null>

  // ── Derived (filtered) lists ────────────────────────────────────────────
  /** Score sets after applying chip filters, text search, and cross-tab filter. */
  filteredScoreSets: ComputedRef<ScoreSetWithMeta[]>
  /** Experiments after applying chip filters and text search. */
  filteredExperiments: ComputedRef<ExperimentWithMeta[]>
  /** Collections after applying chip filters and text search. */
  filteredCollections: ComputedRef<CollectionWithRole[]>
  /** Calibrations after applying text search. */
  filteredCalibrations: ComputedRef<ScoreCalibration[]>
  /** Whether the user has any score sets (before filtering). */
  hasScoreSets: ComputedRef<boolean>
  /** Whether the user has any experiments (before filtering). */
  hasExperiments: ComputedRef<boolean>
  /** Whether the user has any collections (before filtering). */
  hasCollections: ComputedRef<boolean>
  /** Whether the user has any calibrations (before filtering). */
  hasCalibrations: ComputedRef<boolean>
  /** Unfiltered item counts per tab, used for tab badge counts. */
  tabCounts: ComputedRef<{scoreSets: number; experiments: number; collections: number; calibrations: number}>

  // ── Actions ─────────────────────────────────────────────────────────────
  /** Fetch all four resource types in parallel. */
  fetchAll: () => Promise<void>
  /** Fetch (or re-fetch) score sets. */
  fetchScoreSets: () => Promise<void>
  /** Fetch (or re-fetch) experiments. */
  fetchExperiments: () => Promise<void>
  /** Fetch (or re-fetch) collections. */
  fetchCollections: () => Promise<void>
  /** Fetch (or re-fetch) calibrations. */
  fetchCalibrations: () => Promise<void>
  /** Set or clear the cross-tab filter. */
  setCrossTabFilter: (filter: CrossTabFilter | null) => void
}

export function useDashboard(): UseDashboardReturn {
  const {userOrcidId} = useAuth()

  const scoreSets = ref<ScoreSetWithMeta[]>([])
  const experiments = ref<ExperimentWithMeta[]>([])
  const collections = ref<CollectionWithRole[]>([])
  const calibrations = ref<ScoreCalibration[]>([])

  const loading = reactive({scoreSets: false, experiments: false, collections: false, calibrations: false})
  const error = reactive({scoreSets: false, experiments: false, collections: false, calibrations: false})

  const scoreSetFilter = ref<string[]>(['all'])
  const experimentFilter = ref<string[]>(['all'])
  const collectionFilter = ref<string[]>(['all'])
  const calibrationFilter = ref<string[]>(['all'])

  const scoreSetSearch = ref('')
  const experimentSearch = ref('')
  const collectionSearch = ref('')
  const calibrationSearch = ref('')

  const crossTabFilter = ref<CrossTabFilter | null>(null)

  function isOwner(createdByOrcidId?: string | null): boolean {
    return !!userOrcidId.value && createdByOrcidId === userOrcidId.value
  }

  // Filter predicate maps
  const scoreSetPredicates: Record<string, (ss: ScoreSetWithMeta) => boolean> = {
    published: (ss) => ss.status === 'published',
    unpublished: (ss) => ss.status === 'unpublished',
    owned: (ss) => ss.role === 'owner',
    contributed: (ss) => ss.role === 'contributor'
    // TODO: Add meta-analysis and superseded filters once ShortScoreSet includes those fields.
  }

  const experimentPredicates: Record<string, (e: ExperimentWithMeta) => boolean> = {
    published: (e) => e.status === 'published',
    unpublished: (e) => e.status === 'unpublished',
    owned: (e) => e.role === 'owner',
    contributed: (e) => e.role === 'contributor'
  }

  const collectionPredicates: Record<string, (c: CollectionWithRole) => boolean> = {
    public: (c) => !c.private,
    private: (c) => c.private,
    admin: (c) => c.role === 'admin',
    editor: (c) => c.role === 'editor',
    viewer: (c) => c.role === 'viewer'
  }

  function applyPredicates<T>(items: T[], filters: string[], predicates: Record<string, (item: T) => boolean>): T[] {
    if (filters.includes('all')) return items
    const fns = filters.map((f) => predicates[f]).filter(Boolean)
    if (fns.length === 0) return items
    return items.filter((item) => fns.every((fn) => fn(item)))
  }

  // Score set filtering
  const filteredScoreSets = computed(() => {
    let items = scoreSets.value

    if (crossTabFilter.value) {
      const f = crossTabFilter.value
      if (f.type === 'experiment') {
        items = items.filter((ss) => ss.experiment?.urn === f.experimentUrn)
      }
    }

    if (scoreSetSearch.value) {
      const q = scoreSetSearch.value.toLowerCase()
      items = items.filter((ss) => ss.title.toLowerCase().includes(q) || ss.shortDescription?.toLowerCase().includes(q))
    }

    return applyPredicates(items, scoreSetFilter.value, scoreSetPredicates)
  })

  // Experiment filtering
  const filteredExperiments = computed(() => {
    let items = experiments.value

    if (experimentSearch.value) {
      const q = experimentSearch.value.toLowerCase()
      items = items.filter((e) => e.title.toLowerCase().includes(q) || e.shortDescription?.toLowerCase().includes(q))
    }

    return applyPredicates(items, experimentFilter.value, experimentPredicates)
  })

  // Collection filtering
  const filteredCollections = computed(() => {
    let items = collections.value

    if (collectionSearch.value) {
      const q = collectionSearch.value.toLowerCase()
      items = items.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
    }

    return applyPredicates(items, collectionFilter.value, collectionPredicates)
  })

  // Calibration filtering (no filter predicates yet — just search)
  const filteredCalibrations = computed(() => {
    let items = calibrations.value

    if (calibrationSearch.value) {
      const q = calibrationSearch.value.toLowerCase()
      items = items.filter((c) => c.title.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q))
    }

    return items
  })

  // Whether unfiltered data exists (for empty state differentiation)
  const hasScoreSets = computed(() => scoreSets.value.length > 0)
  const hasExperiments = computed(() => experiments.value.length > 0)
  const hasCollections = computed(() => collections.value.length > 0)
  const hasCalibrations = computed(() => calibrations.value.length > 0)

  // Tab counts
  const tabCounts = computed(() => ({
    scoreSets: scoreSets.value.length,
    experiments: experiments.value.length,
    collections: collections.value.length,
    calibrations: calibrations.value.length
  }))

  // Data fetching
  //
  // TODO: Pagination — The API caps results at 100 items per request. When the API adds
  // offset/limit (or cursor) support for /me/ endpoints, update each fetch function to:
  //   1. Accept page/offset params and pass them through to the API call.
  //   2. Track total count (from API response) so the UI can show "page X of Y" or
  //      a "Load more" button.
  //   3. Append results for "load more" or replace for page-based navigation.
  // The tab components already render both desktop tables and mobile cards — pagination
  // controls should go in the shared footer area (next to the "+ Add" button).
  // TODO: Supersession insight — Show which score sets supersede which in the dashboard.
  // ShortScoreSet has `replacesId` (numeric) but no `id` field, so we can't resolve
  // supersession relationships client-side. The best fix is for the API to add
  // `supersededScoreSet` / `supersedingScoreSet` (ShorterScoreSet) to ShortScoreSet —
  // the full ScoreSet schema already returns these. This would let us link related score
  // sets directly by URN without client-side ID matching, and works even when the related
  // score set isn't owned by the current user.
  function enrichScoreSet(ss: ShortScoreSet): ScoreSetWithMeta {
    // BUG (API): ShortScoreSet has no `createdBy` — only the parent experiment does. We fall
    // back to the experiment's creator, which misattributes roles when user A owns the experiment
    // but user B contributed the score set. The API should add `createdBy` to ShortScoreSet so
    // the dashboard can show accurate per-score-set ownership.
    const role = isOwner(ss.experiment?.createdBy?.orcidId) ? ('owner' as const) : ('contributor' as const)
    // NOTE: `replacesId` means this score set *replaces* another — i.e. it is the newer version.
    // We cannot detect superseded score sets from ShortScoreSet alone because there's no
    // `supersededBy` or `id` field to match against. Until the API adds supersession fields to
    // ShortScoreSet (see TODO above), we can only classify as published/unpublished.
    const status = ss.publishedDate ? ('published' as const) : ('unpublished' as const)
    return {...ss, role, status}
  }

  function enrichExperiment(e: ShortExperiment): ExperimentWithMeta {
    const role = isOwner(e.createdBy?.orcidId) ? ('owner' as const) : ('contributor' as const)
    const status = e.publishedDate ? ('published' as const) : ('unpublished' as const)
    return {...e, role, status}
  }

  async function fetchScoreSets() {
    loading.scoreSets = true
    error.scoreSets = false
    try {
      const raw = await searchMyScoreSets()
      scoreSets.value = raw.map(enrichScoreSet)
    } catch (e) {
      console.error('Error loading score sets:', e)
      error.scoreSets = true
    } finally {
      loading.scoreSets = false
    }
  }

  async function fetchExperiments() {
    loading.experiments = true
    error.experiments = false
    try {
      const raw = await searchMyExperiments()
      experiments.value = raw.map(enrichExperiment)
    } catch (e) {
      console.error('Error loading experiments:', e)
      error.experiments = true
    } finally {
      loading.experiments = false
    }
  }

  async function fetchCollections() {
    loading.collections = true
    error.collections = false
    try {
      const data = await getMyCollections()
      collections.value = [
        ...(data.admin || []).map((c: Collection) => ({...c, role: 'admin' as const})),
        ...(data.editor || []).map((c: Collection) => ({...c, role: 'editor' as const})),
        ...(data.viewer || []).map((c: Collection) => ({...c, role: 'viewer' as const}))
      ]
    } catch (e) {
      console.error('Error loading collections:', e)
      error.collections = true
    } finally {
      loading.collections = false
    }
  }

  async function fetchCalibrations() {
    loading.calibrations = true
    error.calibrations = false
    try {
      calibrations.value = await getMyCalibrations()
    } catch (e) {
      console.error('Error loading calibrations:', e)
      error.calibrations = true
    } finally {
      loading.calibrations = false
    }
  }

  async function fetchAll() {
    await Promise.all([fetchScoreSets(), fetchExperiments(), fetchCollections(), fetchCalibrations()])
  }

  function setCrossTabFilter(filter: CrossTabFilter | null) {
    crossTabFilter.value = filter
  }

  return {
    scoreSets,
    experiments,
    collections,
    calibrations,
    loading,
    error,
    scoreSetFilter,
    experimentFilter,
    collectionFilter,
    calibrationFilter,
    scoreSetSearch,
    experimentSearch,
    collectionSearch,
    calibrationSearch,
    crossTabFilter,
    filteredScoreSets,
    filteredExperiments,
    filteredCollections,
    filteredCalibrations,
    hasScoreSets,
    hasExperiments,
    hasCollections,
    hasCalibrations,
    tabCounts,
    fetchAll,
    fetchScoreSets,
    fetchExperiments,
    fetchCollections,
    fetchCalibrations,
    setCrossTabFilter
  }
}
