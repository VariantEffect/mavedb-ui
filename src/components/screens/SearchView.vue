<template>
  <DefaultLayout height="default">
    <div class="mavedb-search-view">
      <div class="mavedb-search-header" style="display: none">
        <h1>Search MaveDB Experiments and Score Sets</h1>
      </div>
      <div class="mavedb-search-form">
        <div class="flex flex-wrap justify-content-center gap-3">
          <IconField icon-position="left">
            <InputIcon class="pi pi-search"></InputIcon>
            <InputText
              ref="searchTextInput"
              v-model="searchText"
              class="p-inputtext-sm"
              placeholder="Search"
              type="search"
            />
          </IconField>
          <Button class="p-button-plain" @click="clear">Clear All</Button>
        </div>
        <div class="mavedb-search-tab-view-container">
          <Tabs class="mavedb-search-tabs" value="0">
            <TabList>
              <Tab value="0">Target filters</Tab>
              <Tab value="1">Publication filters</Tab>
            </TabList>
            <TabPanels>
              <TabPanel header="Target filters" value="0">
                <div class="mavedb-search-filters">
                  <SelectList
                    v-model="filterTargetNames"
                  class="mavedb-search-filter-option-picker"
                  :options="targetNameFilterOptions"
                  title="Target name"
                  />
                  <SelectList
                    v-model="filterTargetTypes"
                    class="mavedb-search-filter-option-picker"
                    :option-label="textForTargetGeneCategory"
                    :options="targetTypeFilterOptions"
                    title="Target type"
                  />
                  <SelectList
                    v-model="filterTargetOrganismNames"
                    class="mavedb-search-filter-option-picker mavedb-organism-picker"
                    :options="targetOrganismFilterOptions"
                    title="Target organism"
                  />
                  <SelectList
                    v-model="filterTargetAccession"
                    class="mavedb-search-filter-option-picker mavedb-organism-picker"
                    :options="targetAccessionFilterOptions"
                    title="Target accession"
                  />
                </div>
              </TabPanel>
              <TabPanel header="Publication filters" value="1">
                <div class="mavedb-search-filters">
                  <SelectList
                    v-model="filterPublicationAuthors"
                    class="mavedb-search-filter-option-picker"
                    :options="publicationAuthorFilterOptions"
                    title="Publication authors"
                  />
                  <SelectList
                    v-model="filterPublicationDatabases"
                    class="mavedb-search-filter-option-picker"
                    :options="publicationDatabaseFilterOptions"
                    title="Publication database"
                  />
                  <SelectList
                    v-model="filterPublicationJournals"
                    class="mavedb-search-filter-option-picker"
                    :options="publicationJournalFilterOptions"
                    title="Publication journal"
                  />
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
          <div v-if="publishedScoreSets.length < numTotalSearchResults" class="mavedb-search-tab-view-tabs-right">
            Showing {{ publishedScoreSets.length.toLocaleString() }} of
            {{ numTotalSearchResults.toLocaleString() }} results. Try adding more filters to narrow your search.
          </div>
        </div>
      </div>
      <ScoreSetTable
        :data="publishedScoreSets"
        :language="language"
        :loading="loading"
        :scroll-x="true"
        :scroll-y="true"
      />
    </div>
  </DefaultLayout>
</template>

<script lang="ts">
import axios from 'axios'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import config from '@/config'
import ScoreSetTable from '@/components/ScoreSetTable.vue'
import SelectList from '@/components/common/SelectList.vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import Button from 'primevue/button'
import TabPanel from 'primevue/tabpanel'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import {debounce} from 'vue-debounce'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import type {LocationQueryValue} from 'vue-router'
import {textForTargetGeneCategory} from '@/lib/target-genes'
import {routeToVariantSearchIfVariantIsSearchable} from '@/lib/search'
import {paths, components} from '@/schema/openapi'

type ShortScoreSet = components['schemas']['ShortScoreSet']
type ShortTargetGene = components['schemas']['ShortTargetGene']
type PublicationIdentifier = components['schemas']['SavedPublicationIdentifier']
type SearchParams = paths['/api/v1/score-sets/search']['post']['requestBody']['content']['application/json']

interface FilterOption {
  value: string
  badge: number
}

type ScoreSetMetadataFn = (scoreSet: ShortScoreSet) => Array<string>
function countScoreSetMetadata(
  scoreSets: Array<ShortScoreSet>,
  scoreSetMetadataFn: ScoreSetMetadataFn
): FilterOption[] {
  if (!scoreSets.length) {
    return []
  }

  // Filter out empty string values.
  const values = scoreSets
    .map(scoreSetMetadataFn)
    .flat()
    .filter((item) => !!item)
  const frequencies = values.reduce((counts, item) => {
    counts.set(item, (counts.get(item) || 0) + 1)
    return counts
  }, new Map<string, number>())
  return Array.from(frequencies.keys())
    .sort()
    .map((value) => ({value, badge: frequencies.get(value) || 0}))
}
type GeneMetadataFn = (targetGene: ShortTargetGene) => string
function countTargetGeneMetadata(scoreSets: Array<ShortScoreSet>, geneMetadataFn: GeneMetadataFn): FilterOption[] {
  return countScoreSetMetadata(scoreSets, (scoreSet) => [...new Set<string>(scoreSet.targetGenes.map(geneMetadataFn))])
}

type PublicationMetadataFn = (publicationIdentifier: PublicationIdentifier) => Array<string>
function countPublicationMetadata(
  scoreSets: Array<ShortScoreSet>,
  publicationMetadataFn: PublicationMetadataFn
): FilterOption[] {
  return countScoreSetMetadata(scoreSets, (scoreSet) => {
    const primary = scoreSet.primaryPublicationIdentifiers.map(publicationMetadataFn).flat()
    const secondary = scoreSet.secondaryPublicationIdentifiers.map(publicationMetadataFn).flat()

    // Use a Set to eliminate duplicate values, then transform it back into an Array.
    return [...new Set<string>(primary.concat(secondary))]
  })
}

function extractQueryParam(content: LocationQueryValue | LocationQueryValue[]): Array<string> {
  // If there are multiple values, they will be stored as multiple identical query params (i.e. ?a=1&b=2&a=3) and
  // content will be an Array.
  if (Array.isArray(content)) {
    // Only return non-null values. Typescript can't intuit what our filter is doing here, so we tell it explicitly.
    return content.filter((item) => !!item) as Array<string>
  }
  return content ? [content] : []
}

export default defineComponent({
  name: 'SearchView',

  components: {DefaultLayout, ScoreSetTable, IconField, InputIcon, InputText, SelectList, Tabs, TabList, Tab, TabPanels, TabPanel, Button},

  setup: () => {
    useHead({title: 'Search data sets'})
  },

  data: function () {
    return {
      filterTargetNames: extractQueryParam(this.$route.query['target-name']) as Array<string>,
      filterTargetTypes: extractQueryParam(this.$route.query['target-type']) as Array<string>,
      filterTargetOrganismNames: extractQueryParam(this.$route.query['target-organism-name']) as Array<string>,
      filterTargetAccession: extractQueryParam(this.$route.query['target-accession']) as Array<string>,
      filterPublicationAuthors: extractQueryParam(this.$route.query['publication-author']) as Array<string>,
      filterPublicationDatabases: extractQueryParam(this.$route.query['publication-database']) as Array<string>,
      filterPublicationJournals: extractQueryParam(this.$route.query['publication-journal']) as Array<string>,
      filterKeywords: extractQueryParam(this.$route.query['keywords']) as Array<string>,
      loading: false,
      searchText: this.$route.query.search as string | null,
      scoreSets: [] as Array<ShortScoreSet>,
      publishedScoreSets: [] as Array<ShortScoreSet>,
      numTotalSearchResults: 0,
      language: {
        emptyTable: 'Type in the search box above or use the filters to find a data set.'
      },
      textForTargetGeneCategory: textForTargetGeneCategory,
      targetNameFilterOptions: [] as FilterOption[],
      targetOrganismFilterOptions: [] as FilterOption[],
      targetAccessionFilterOptions: [] as FilterOption[],
      targetTypeFilterOptions: [] as FilterOption[],
      publicationAuthorFilterOptions: [] as FilterOption[],
      publicationDatabaseFilterOptions: [] as FilterOption[],
      publicationJournalFilterOptions: [] as FilterOption[]
    }
  },

  computed: {
    debouncedSearchFunction: function () {
      return debounce(() => this.search(), '400ms')
    }
  },

  watch: {
    filterTargetNames: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetOrganismNames: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetAccession: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetTypes: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationAuthors: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationDatabases: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationJournals: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterKeywords: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    searchText: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    item: {
      handler: function () {
        this.clear()
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
    }
  },

  mounted: async function () {
    await this.search()
  },

  methods: {
    debouncedSearch: function () {
      this.debouncedSearchFunction()
    },
    search: async function () {
      // TODO#410 Because of the debounced search, this is super aggressive and will send the user to the variant search page as they are
      // typing. I'm not sure that is the best user experience, but it seems unlikely people will actually be typing an HGVS string.
      if (routeToVariantSearchIfVariantIsSearchable(this.searchText)) {
        return
      }

      this.$router.push({
        query: {
          ...(this.searchText && this.searchText.length > 0 ? {search: this.searchText} : {}),
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
          ...(this.filterKeywords.length > 0 ? {keywords: this.filterKeywords} : {})
        }
      })
      this.loading = true
      await this.fetchSearchResults()
      this.loading = false
    },
    fetchSearchResults: async function () {
      try {
        const requestParams: SearchParams = {
          text: this.searchText || undefined,
          targets: this.filterTargetNames.length > 0 ? this.filterTargetNames : undefined,
          targetOrganismNames: this.filterTargetOrganismNames.length > 0 ? this.filterTargetOrganismNames : undefined,
          targetAccessions: this.filterTargetAccession.length > 0 ? this.filterTargetAccession : undefined,
          targetTypes: this.filterTargetTypes.length > 0 ? this.filterTargetTypes : undefined,
          authors: this.filterPublicationAuthors.length > 0 ? this.filterPublicationAuthors : undefined,
          databases: this.filterPublicationDatabases.length > 0 ? this.filterPublicationDatabases : undefined,
          journals: this.filterPublicationJournals.length > 0 ? this.filterPublicationJournals : undefined,
          keywords: this.filterKeywords.length > 0 ? this.filterKeywords : undefined,
          includeExperimentScoreSetUrnsAndCount: false,
          limit: 100,
        }
        const response = await axios.post(`${config.apiBaseUrl}/score-sets/search`, requestParams, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        const {scoreSets, numScoreSets} = response.data || {scoreSets: [], numScoreSets: 0}
        this.scoreSets = scoreSets
        this.numTotalSearchResults = numScoreSets

        // reset published score sets search results when using search bar
        this.publishedScoreSets = this.scoreSets.filter((scoreSet) => !!scoreSet.publishedDate)

        this.$nextTick(() => this.fetchFilterOptions())
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },
    fetchFilterOptions: async function () {
      try {
        const requestParams: SearchParams = {
          text: this.searchText || undefined,
          targets: this.filterTargetNames.length > 0 ? this.filterTargetNames : undefined,
          targetOrganismNames: this.filterTargetOrganismNames.length > 0 ? this.filterTargetOrganismNames : undefined,
          targetAccessions: this.filterTargetAccession.length > 0 ? this.filterTargetAccession : undefined,
          targetTypes: this.filterTargetTypes.length > 0 ? this.filterTargetTypes : undefined,
          authors: this.filterPublicationAuthors.length > 0 ? this.filterPublicationAuthors : undefined,
          databases: this.filterPublicationDatabases.length > 0 ? this.filterPublicationDatabases : undefined,
          journals: this.filterPublicationJournals.length > 0 ? this.filterPublicationJournals : undefined,
          keywords: this.filterKeywords.length > 0 ? this.filterKeywords : undefined
        }
        const response = await axios.post(`${config.apiBaseUrl}/score-sets/search/filter-options`, requestParams, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        const {
          targetAccessions,
          targetGeneCategories,
          targetGeneNames,
          targetOrganismNames,
          publicationAuthorNames,
          publicationDbNames,
          publicationJournals
        } = response.data

        this.targetAccessionFilterOptions = (targetAccessions || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetNameFilterOptions = (targetGeneNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetOrganismFilterOptions = (targetOrganismNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.targetTypeFilterOptions = (targetGeneCategories || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationAuthorFilterOptions = (publicationAuthorNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationDatabaseFilterOptions = (publicationDbNames || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
        this.publicationJournalFilterOptions = (publicationJournals || []).map((option) => ({
          value: option.value,
          badge: option.count
        }))
      } catch (err) {
        console.log(`Error while loading filter options")`, err)
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
      this.filterKeywords = []
    }
  }
})
</script>

<style scoped>
/* Layout */

.mavedb-search-view {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

.mavedb-search-header {
  flex: 0 0 auto;
  text-align: center;
}

.mavedb-search-header h1 {
  font-size: 20px;
  text-align: center;
}

.mavedb-search-form {
  flex: 0 0 auto;
  padding: 10px 0;
  text-align: center;
}

.mavedb-search-tabs {
  flex: 0 0 auto;
  padding: 10px 0;
  text-align: center;
}

.mavedb-search-filters {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  max-width: 1000px;
  margin: 10px auto;
}

.mavedb-search-filter-option-picker {
  max-width: 300px;
  width: 24%;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
}

.mavedb-search-filter-option-picker:deep(.p-listbox-option) > div {
  width: 100%;
}
.mavedb-organism-picker:deep(.p-listbox-item) {
  font-style: italic;
}
.mavedb-organism-picker:deep(.p-listbox-item .p-badge) {
  font-style: normal;
}

.mavedb-search-clear-button {
  position: absolute;
  top: 12px;
  right: 8px;
  margin: 0;
  padding: 0;
}

/* Placing custom content to the right of a TabView's tabs */

.mavedb-search-tab-view-container {
  position: relative;
}

.mavedb-search-tab-view-container .mavedb-search-tab-view-tabs-right {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px 0;
  padding: 0.75rem 1.25rem;
  line-height: 1;
}
</style>
