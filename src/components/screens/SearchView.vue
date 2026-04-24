<template>
  <MvLayout>
    <template #header>
      <div class="border-b border-gray-200 bg-white">
        <div class="mx-auto flex max-w-screen-xl flex-col gap-3 px-6 py-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div
              class="flex flex-1 overflow-hidden rounded-md border-[1.5px] border-mint bg-white transition-colors focus-within:border-sage"
              style="max-width: 600px"
            >
              <InputText
                ref="searchTextInput"
                v-model="searchText"
                aria-label="Search score sets"
                class="flex-1 !rounded-none !border-none !shadow-none"
                placeholder="Search genes, titles, keywords..."
                type="search"
              />
              <button
                class="cursor-pointer whitespace-nowrap border-none bg-sage px-4.5 text-sm font-semibold text-dark hover:bg-sage-dark"
                @click="search"
              >
                Search
              </button>
            </div>
            <span aria-live="polite" class="whitespace-nowrap text-sm text-gray-500" role="status">
              <strong class="font-bold text-gray-800">{{ numTotalSearchResults.toLocaleString() }}</strong>
              score sets match the supplied filters
            </span>
          </div>
          <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Filters:</span>
            <button
              v-for="filter in activeFilters"
              :key="filter.key + ':' + filter.value"
              :aria-label="'Remove filter: ' + filter.label"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-mint bg-sage-light px-3 py-0.5 text-xs font-semibold text-sage hover:bg-sage-light"
              @click="removeFilter(filter.key, filter.value)"
            >
              {{ filter.label }}
              <span aria-hidden="true" class="ml-0.5 text-sm leading-none text-gray-500">&times;</span>
            </button>
            <button
              class="cursor-pointer text-xs font-semibold text-gray-400 hover:text-red-600 hover:underline"
              @click="clear"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </template>

    <div class="mx-auto grid w-full max-w-screen-xl grid-cols-1 items-start gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
      <!-- MOBILE FILTER TOGGLE -->
      <button
        class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 md:hidden"
        @click="mobileFiltersOpen = true"
      >
        <svg
          aria-hidden="true"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="6" x2="18" y1="12" y2="12" />
          <line x1="8" x2="16" y1="18" y2="18" />
        </svg>
        Filters
        <span
          v-if="hasActiveFilters"
          aria-hidden="true"
          class="rounded-full bg-sage px-1.5 text-[0.6875rem] font-bold text-white"
          >{{ activeFilters.length }}</span
        >
        <span v-if="hasActiveFilters" class="sr-only">({{ activeFilters.length }} active)</span>
      </button>

      <!-- MOBILE FILTER DRAWER BACKDROP -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="mobileFiltersOpen"
            class="fixed inset-0 z-[110] bg-black/30 md:hidden"
            @click="mobileFiltersOpen = false"
          />
        </Transition>
        <Transition name="slide-left">
          <aside
            v-if="mobileFiltersOpen"
            ref="mobileDrawer"
            aria-label="Filters"
            aria-modal="true"
            class="fixed inset-y-0 left-0 z-[120] w-[280px] overflow-y-auto bg-white shadow-xl md:hidden"
            role="dialog"
            @keydown.escape="mobileFiltersOpen = false"
          >
            <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span class="text-xs font-bold uppercase tracking-wide text-gray-400">Filters</span>
              <div class="flex items-center gap-3">
                <button
                  class="cursor-pointer text-[0.6875rem] font-semibold text-gray-400 hover:text-red-600"
                  @click="clear"
                >
                  Reset all
                </button>
                <button
                  ref="drawerCloseBtn"
                  aria-label="Close filters"
                  class="cursor-pointer text-lg leading-none text-gray-400 hover:text-gray-700"
                  @click="mobileFiltersOpen = false"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>
            <MvSearchFilters
              v-model:publication-authors="filterPublicationAuthors"
              v-model:publication-databases="filterPublicationDatabases"
              v-model:publication-journals="filterPublicationJournals"
              v-model:target-accession="filterTargetAccession"
              v-model:target-names="filterTargetNames"
              v-model:target-organism-names="filterTargetOrganismNames"
              v-model:target-types="filterTargetTypes"
              v-model:controlled-keywords="filterControlledKeywords"
              :loading="filtersLoading"
              :publication-author-options="publicationAuthorFilterOptions"
              :publication-database-options="publicationDatabaseFilterOptions"
              :publication-journal-options="publicationJournalFilterOptions"
              :target-accession-options="targetAccessionFilterOptions"
              :target-name-options="targetNameFilterOptions"
              :target-organism-name-options="targetOrganismFilterOptions"
              :controlled-keyword-options="controlledKeywordOptions"
              :target-type-label-fn="(v: string) => textForTargetGeneCategory(v as TargetGeneCategory) || v"
              :target-type-options="targetTypeFilterOptions"
            />
          </aside>
        </Transition>
      </Teleport>

      <!-- DESKTOP FILTER SIDEBAR -->
      <aside
        aria-label="Filter score sets"
        class="sticky top-20 hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block"
      >
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span class="text-xs font-bold uppercase tracking-wide text-gray-400">Filters</span>
          <button class="cursor-pointer text-[0.6875rem] font-semibold text-gray-400 hover:text-red-600" @click="clear">
            Reset all
          </button>
        </div>

        <MvSearchFilters
          v-model:publication-authors="filterPublicationAuthors"
          v-model:publication-databases="filterPublicationDatabases"
          v-model:publication-journals="filterPublicationJournals"
          v-model:target-accession="filterTargetAccession"
          v-model:target-names="filterTargetNames"
          v-model:target-organism-names="filterTargetOrganismNames"
          v-model:target-types="filterTargetTypes"
          v-model:controlled-keywords="filterControlledKeywords"
          :loading="filtersLoading"
          :publication-author-options="publicationAuthorFilterOptions"
          :publication-database-options="publicationDatabaseFilterOptions"
          :publication-journal-options="publicationJournalFilterOptions"
          :target-accession-options="targetAccessionFilterOptions"
          :target-name-options="targetNameFilterOptions"
          :target-organism-name-options="targetOrganismFilterOptions"
          :controlled-keyword-options="controlledKeywordOptions"
          :target-type-label-fn="(v: string) => textForTargetGeneCategory(v as TargetGeneCategory) || v"
          :target-type-options="targetTypeFilterOptions"
        />
      </aside>

      <!-- RESULTS -->
      <div class="flex min-w-0 flex-col">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm text-gray-500">
            Showing <strong class="font-bold text-gray-800">{{ scoreSets.length.toLocaleString() }}</strong> score sets
          </span>
          <PSelect
            v-model="sortBy"
            aria-label="Sort results by"
            class="!text-sm"
            option-label="label"
            option-value="value"
            :options="sortOptions"
          />
        </div>

        <Message
          v-if="!loading && scoreSets.length > 0 && scoreSets.length < numTotalSearchResults"
          :closable="false"
          severity="warn"
        >
          Your search matched {{ numTotalSearchResults.toLocaleString() }} score sets. For performance reasons, only the
          first {{ scoreSets.length }} are shown. Use the filters to narrow your results.
        </Message>

        <MvLoader v-if="loading" text="Loading score sets..." />

        <div v-else class="flex flex-col gap-2.5">
          <div
            v-for="group in visibleGroups"
            :key="group.experimentUrn"
            class="overflow-hidden rounded-lg border border-gray-200 border-l-[3px] border-l-sage-light bg-white"
          >
            <div class="px-5 pt-3 text-xs font-semibold text-gray-500">
              Experiment:
              <router-link class="text-link" :to="{name: 'experiment', params: {urn: group.experimentUrn}}">
                {{ group.experimentTitle }}
              </router-link>
              <span v-if="group.scoreSets.length > 1" class="text-gray-400">
                &mdash; {{ group.scoreSets.length }} score sets
              </span>
            </div>
            <MvScoreSetRow v-for="scoreSet in group.scoreSets" :key="scoreSet.urn" :score-set="scoreSet" />
          </div>
        </div>

        <div v-if="!loading && visibleCount < groupedScoreSets.length" class="pt-5 text-center">
          <button
            class="inline-block cursor-pointer rounded-[5px] border-[1.5px] border-sage bg-white px-6 py-2 text-sm font-semibold text-sage hover:bg-sage-light"
            @click="visibleCount += 25"
          >
            Load more results ({{ groupedScoreSets.length - visibleCount }} remaining)
          </button>
        </div>

        <div v-if="!loading && scoreSets.length === 0" class="py-16 text-center text-sm text-gray-500">
          Type in the search box above or use the filters to find a data set.
        </div>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {debounce} from 'vue-debounce'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import {textForTargetGeneCategory, type TargetGeneCategory} from '@/lib/target-genes'
import {extractQueryParam} from '@/lib/router'
import {
  routeToVariantSearchIfVariantIsSearchable,
  buildSearchParams,
  SEARCH_RESULT_LIMIT,
  SORT_OPTIONS
} from '@/lib/search'
import type {FilterOption, ExperimentGroup, ActiveFilter, SortValue} from '@/lib/search'
import type {components} from '@/schema/openapi'

type ShortScoreSet = components['schemas']['ShortScoreSet']

import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import PSelect from 'primevue/select'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import MvScoreSetRow from '@/components/common/MvScoreSetRow.vue'
import MvSearchFilters from '@/components/common/MvSearchFilters.vue'
import {searchScoreSets, getSearchFilterOptions} from '@/api/mavedb'
import type {ScoreSetsSearchFilterOptionsResponse} from '@/api/mavedb'

export default defineComponent({
  name: 'SearchView',

  components: {InputText, Message, MvLayout, MvLoader, MvScoreSetRow, MvSearchFilters, PSelect},

  setup: () => {
    useHead({title: 'Search data sets'})
  },

  data: function () {
    return {
      filterControlledKeywords: extractQueryParam(this.$route.query['controlled-keyword']) as Array<string>,
      filterTargetNames: extractQueryParam(this.$route.query['target-name']) as Array<string>,
      filterTargetTypes: extractQueryParam(this.$route.query['target-type']) as Array<string>,
      filterTargetOrganismNames: extractQueryParam(this.$route.query['target-organism-name']) as Array<string>,
      filterTargetAccession: extractQueryParam(this.$route.query['target-accession']) as Array<string>,
      filterPublicationAuthors: extractQueryParam(this.$route.query['publication-author']) as Array<string>,
      filterPublicationDatabases: extractQueryParam(this.$route.query['publication-database']) as Array<string>,
      filterPublicationJournals: extractQueryParam(this.$route.query['publication-journal']) as Array<string>,
      filterKeywords: extractQueryParam(this.$route.query['keywords']) as Array<string>,
      loading: false,
      filtersLoading: false,
      mobileFiltersOpen: false,
      searchText: this.$route.query.search as string | null,
      scoreSets: [] as Array<ShortScoreSet>,
      numTotalSearchResults: 0,
      textForTargetGeneCategory: textForTargetGeneCategory,
      controlledKeywordOptions: [] as FilterOption[],
      targetNameFilterOptions: [] as FilterOption[],
      targetOrganismFilterOptions: [] as FilterOption[],
      targetAccessionFilterOptions: [] as FilterOption[],
      targetTypeFilterOptions: [] as FilterOption[],
      publicationAuthorFilterOptions: [] as FilterOption[],
      publicationDatabaseFilterOptions: [] as FilterOption[],
      publicationJournalFilterOptions: [] as FilterOption[],
      sortOptions: SORT_OPTIONS,
      sortBy: (SORT_OPTIONS.some((o) => o.value === this.$route.query.sort)
        ? this.$route.query.sort
        : 'recent') as SortValue,
      visibleCount: 25,
      searchAbortController: null as AbortController | null,
      filterAbortController: null as AbortController | null,
      debouncedSearch: (() => {}) as () => void
    }
  },

  computed: {
    hasActiveFilters(): boolean {
      return this.activeFilters.length > 0
    },

    activeFilters(): ActiveFilter[] {
      const filters: ActiveFilter[] = []
      const addFilters = (key: string, values: string[], labelFn?: (v: string) => string) => {
        for (const value of values) {
          filters.push({key, value, label: labelFn ? labelFn(value) : value})
        }
      }
      addFilters('controlledKeywords', this.filterControlledKeywords, (v) => v.split('::', 2)[1] ?? v)
      addFilters('filterTargetNames', this.filterTargetNames)
      addFilters('filterTargetOrganismNames', this.filterTargetOrganismNames)
      addFilters(
        'filterTargetTypes',
        this.filterTargetTypes,
        (v) => textForTargetGeneCategory(v as TargetGeneCategory) || v
      )
      addFilters('filterTargetAccession', this.filterTargetAccession)
      addFilters('filterPublicationAuthors', this.filterPublicationAuthors)
      addFilters('filterPublicationDatabases', this.filterPublicationDatabases)
      addFilters('filterPublicationJournals', this.filterPublicationJournals)
      return filters
    },

    sortedScoreSets(): ShortScoreSet[] {
      const option = SORT_OPTIONS.find((o) => o.value === this.sortBy)
      return option ? [...this.scoreSets].sort(option.compare) : [...this.scoreSets]
    },

    groupedScoreSets(): ExperimentGroup[] {
      const groups = new Map<string, ExperimentGroup>()
      for (const scoreSet of this.sortedScoreSets) {
        const expUrn = scoreSet.experiment?.urn || 'unknown'
        const expTitle = scoreSet.experiment?.title || expUrn
        if (!groups.has(expUrn)) {
          groups.set(expUrn, {experimentUrn: expUrn, experimentTitle: expTitle, scoreSets: []})
        }
        groups.get(expUrn)!.scoreSets.push(scoreSet)
      }
      return Array.from(groups.values())
    },

    visibleGroups(): ExperimentGroup[] {
      return this.groupedScoreSets.slice(0, this.visibleCount)
    }
  },

  watch: {
    filterTargetNames: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetOrganismNames: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetAccession: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetTypes: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationAuthors: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationDatabases: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationJournals: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    filterControlledKeywords: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    searchText: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.debouncedSearch()
        }
      }
    },
    sortBy: {
      handler: function () {
        // Sort is applied client-side via the sortedScoreSets computed, so we only
        // need to sync the URL query param — no need to refetch results or filters.
        // TODO#XXX: If sorting moves server-side, this should call search() instead.
        this.$router.push({
          query: {
            ...this.$route.query,
            ...(this.sortBy !== 'recent' ? {sort: this.sortBy} : {sort: undefined})
          }
        })
      }
    },
    // Focus the close button after Vue renders the drawer (v-if means it doesn't exist until nextTick).
    mobileFiltersOpen(open: boolean) {
      if (open) {
        this.$nextTick(() => {
          ;(this.$refs.drawerCloseBtn as HTMLElement)?.focus()
        })
      }
    },
    '$route.query.search': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.searchText = newValue
        }
      },
      immediate: true
    },
    '$route.query.controlled-keyword': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterControlledKeywords = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.target-name': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetNames = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.target-type': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetTypes = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.target-organism-name': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetOrganismNames = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.target-accession': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetAccession = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.publication-author': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationAuthors = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.publication-database': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationDatabases = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.publication-journal': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationJournals = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.keywords': {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterKeywords = extractQueryParam(newValue)
        }
      },
      immediate: true
    },
    '$route.query.sort': {
      handler: function (newValue) {
        const val = typeof newValue === 'string' ? newValue : 'recent'
        if (SORT_OPTIONS.some((o) => o.value === val)) {
          this.sortBy = val as SortValue
        }
      },
      immediate: true
    }
  },

  created() {
    this.debouncedSearch = debounce(() => this.search(), '400ms') as unknown as () => void
  },

  mounted: async function () {
    await this.search()
  },

  methods: {
    search: async function () {
      if (routeToVariantSearchIfVariantIsSearchable(this.searchText)) {
        return
      }

      this.$router.push({
        query: {
          ...(this.searchText && this.searchText.length > 0 ? {search: this.searchText} : {}),
          ...(this.filterControlledKeywords.length > 0 ? {'controlled-keyword': this.filterControlledKeywords} : {}),
          ...(this.filterTargetNames.length > 0 ? {'target-name': this.filterTargetNames} : {}),
          ...(this.filterTargetTypes.length > 0 ? {'target-type': this.filterTargetTypes} : {}),
          ...(this.filterTargetOrganismNames.length > 0
            ? {'target-organism-name': this.filterTargetOrganismNames}
            : {}),
          ...(this.filterTargetAccession.length > 0 ? {'target-accession': this.filterTargetAccession} : {}),
          ...(this.filterPublicationAuthors.length > 0 ? {'publication-author': this.filterPublicationAuthors} : {}),
          ...(this.filterPublicationDatabases.length > 0
            ? {'publication-database': this.filterPublicationDatabases}
            : {}),
          ...(this.filterPublicationJournals.length > 0 ? {'publication-journal': this.filterPublicationJournals} : {}),
          ...(this.filterKeywords.length > 0 ? {keywords: this.filterKeywords} : {}),
          ...(this.sortBy !== 'recent' ? {sort: this.sortBy} : {})
        }
      })
      this.loading = true
      await this.fetchSearchResults()
      this.loading = false
    },

    fetchSearchResults: async function () {
      this.searchAbortController?.abort()
      const controller = new AbortController()
      this.searchAbortController = controller
      try {
        const requestParams = {
          ...buildSearchParams(this),
          includeExperimentScoreSetUrnsAndCount: false,
          limit: SEARCH_RESULT_LIMIT,
          published: true
        }
        const {scoreSets, numScoreSets} = await searchScoreSets(requestParams, controller.signal)
        this.scoreSets = scoreSets
        this.numTotalSearchResults = numScoreSets
        this.visibleCount = 25

        this.$nextTick(() => this.fetchFilterOptions())
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Error while loading search results', err)
      }
    },

    fetchFilterOptions: async function () {
      this.filterAbortController?.abort()
      const controller = new AbortController()
      this.filterAbortController = controller
      this.filtersLoading = true
      try {
        const requestParams = buildSearchParams(this)
        const data: ScoreSetsSearchFilterOptionsResponse = await getSearchFilterOptions(
          requestParams,
          controller.signal
        )

        this.controlledKeywordOptions = (data.controlledKeywords || []).map((option) => ({
          value: `${option.key}::${option.value}`, 
          title: option.value, 
          badge: option.count,
          groupKey: option.key
        }))
        this.targetAccessionFilterOptions = (data.targetAccessions || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetNameFilterOptions = (data.targetGeneNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetOrganismFilterOptions = (data.targetOrganismNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetTypeFilterOptions = (data.targetGeneCategories || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationAuthorFilterOptions = (data.publicationAuthorNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationDatabaseFilterOptions = (data.publicationDbNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationJournalFilterOptions = (data.publicationJournals || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Error while loading filter options', err)
      } finally {
        this.filtersLoading = false
      }
    },

    removeFilter(key: string, value: string) {
      const filterArrays: Record<string, string[]> = {
        filterControlledKeywords: this.filterControlledKeywords,
        filterTargetNames: this.filterTargetNames,
        filterTargetOrganismNames: this.filterTargetOrganismNames,
        filterTargetTypes: this.filterTargetTypes,
        filterTargetAccession: this.filterTargetAccession,
        filterPublicationAuthors: this.filterPublicationAuthors,
        filterPublicationDatabases: this.filterPublicationDatabases,
        filterPublicationJournals: this.filterPublicationJournals
      }
      const arr = filterArrays[key]
      if (!arr) return
      const idx = arr.indexOf(value)
      if (idx !== -1) {
        arr.splice(idx, 1)
      }
    },

    clear: function () {
      this.searchText = null
      this.filterTargetNames = []
      this.filterTargetTypes = []
      this.filterTargetOrganismNames = []
      this.filterTargetAccession = []
      this.filterPublicationAuthors = []
      this.filterPublicationDatabases = []
      this.filterPublicationJournals = []
      this.filterControlledKeywords = []
    }
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.25s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
