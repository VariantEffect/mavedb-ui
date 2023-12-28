<template>
  <DefaultLayout overflow-y="hidden">
    <div class="mavedb-search-view">
      <div class="mavedb-search-header" style="display: none;">
        <h1>Search MaveDB Experiments and Score Sets</h1>
      </div>
      <div class="mavedb-search-form">
        <span class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText v-model="searchText" ref="searchTextInput" type="search" class="p-inputtext-sm" placeholder="Search" />
          <Button v-if="searchText && searchText.length > 0" class="mavedb-search-clear-button p-button-plain p-button-text" @click="clear"><i class="pi pi-times"/></Button>
        </span>
        <TabView class="mavedb-search-tabs">
          <TabPanel header="Target filters">
            <div class="mavedb-search-filters">
              <SelectList v-model="filterTargetNames" :options="targetNameFilterOptions" class="mavedb-search-filter-option-picker" title="Target name"  />
              <SelectList v-model="filterTargetTypes" :options="targetTypeFilterOptions" class="mavedb-search-filter-option-picker" title="Target type"  />
              <SelectList v-model="filterTargetOrganismNames" :options="targetOrganismFilterOptions" class="mavedb-search-filter-option-picker mavedb-organism-picker" title="Target organism"  />
              <SelectList v-model="filterTargetAccession" :options="targetAccessionFilterOptions" class="mavedb-search-filter-option-picker mavedb-organism-picker" title="Target accession"  />
            </div>
          </TabPanel>
          <TabPanel header="Publication filters">
            <div class="mavedb-search-filters">
              <SelectList v-model="filterPublicationAuthors" :options="publicationAuthorFilterOptions" class="mavedb-search-filter-option-picker" title="Publication authors"  />
              <SelectList v-model="filterPublicationDatabases" :options="publicationDatabaseFilterOptions" class="mavedb-search-filter-option-picker" title="Publication database"  />
              <SelectList v-model="filterPublicationJournals" :options="publicationJournalFilterOptions" class="mavedb-search-filter-option-picker" title="Publication journal"  />
            </div>
          </TabPanel>
        </TabView>
      </div>
      <ScoreSetTable
          :data="publishedScoreSets"
          :language="language"
          :loading="loading"
          :scrollX="true"
          :scrollY="true"
      />
    </div>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import InputText from 'primevue/inputtext'
import config from '@/config'
import ScoreSetTable from '@/components/ScoreSetTable'
import SelectList from '@/components/common/SelectList'
import DefaultLayout from '@/components/layout/DefaultLayout'
import Button from 'primevue/button'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import {debounce} from 'vue-debounce'

function countScoreSetMetadata(scoreSets, scoreSetMetadataFn) {
  if (!scoreSets.length) {
    return []
  }

  // Filter out empty string values.
  const values = scoreSets.map(scoreSetMetadataFn).flat().filter((item) => !!item);
  const frequencies = values.reduce((counts, item) => {
    counts.set(item, (counts.get(item) || 0) + 1)
    return counts
  }, new Map())
  return Array.from(frequencies.keys()).sort().map((value) => ({value, badge: frequencies.get(value) || 0}))
}
function countTargetGeneMetadata(scoreSets, geneMetadataFn) {
  return countScoreSetMetadata(scoreSets, (scoreSet) => [...new Set(scoreSet.targetGenes.map(geneMetadataFn))])
}
function countPublicationMetadata(scoreSets, publicationMetadataFn) {
  return countScoreSetMetadata(scoreSets, (scoreSet) => {
    const primary = scoreSet.primaryPublicationIdentifiers.map(publicationMetadataFn).flat()
    const secondary = scoreSet.secondaryPublicationIdentifiers.map(publicationMetadataFn).flat()

    // Use a Set to eliminate duplicate values, then transform it back into an Array.
    return [...new Set(primary.concat(secondary))]
  })
}

export default {
  name: 'SearchView',
  components: {DefaultLayout, ScoreSetTable, InputText, SelectList, TabView, TabPanel, Button},

  data: function() {
    return {
      filterTargetNames: this.$route.query['target-names'] ? this.$route.query['target-names'].split(',') : [],
      filterTargetTypes: this.$route.query['target-types'] ? this.$route.query['target-types'].split(',') : [],
      filterTargetOrganismNames: this.$route.query['target-organism-names'] ? this.$route.query['target-organism-names'].split(',') : [],
      filterTargetAccession: this.$route.query['target-accessions'] ? this.$route.query['target-accessions'].split(',') : [],
      filterPublicationAuthors: this.$route.query['publication-authors'] ? this.$route.query['publication-authors'] : [],
      filterPublicationDatabases: this.$route.query['publication-databases'] ? this.$route.query['publication-databases'].split(',') : [],
      filterPublicationJournals: this.$route.query['publication-journals'] ? this.$route.query['publication-journals'].split(',') : [],
      loading: false,
      searchText: this.$route.query.search,
      scoreSets: [],
      publishedScoreSets: [],
      language: {
        emptyTable: 'Type in the search box above or use the filters to find a data set.'
      },
    }
  },
  computed: {
    debouncedSearchFunction: function() {
      return debounce(() => this.search(), '400ms')
    },
    targetNameFilterOptions: function() {
      return countTargetGeneMetadata(this.publishedScoreSets, (targetGene) => targetGene.name)
    },
    targetOrganismFilterOptions: function() {
      return countTargetGeneMetadata(this.publishedScoreSets, 
        (targetGene) => targetGene.targetSequence?.reference.organismName || '')
    },
    targetAccessionFilterOptions: function() {
      return countTargetGeneMetadata(this.publishedScoreSets,
        (targetGene) => targetGene.targetAccession?.accession || '')
    },
    targetTypeFilterOptions: function() {
      return countTargetGeneMetadata(this.publishedScoreSets, (targetGene) => targetGene.category)
    },
    publicationAuthorFilterOptions: function() {
      return countPublicationMetadata(this.publishedScoreSets, 
        (publicationIdentifier) => publicationIdentifier.authors.map((author) => author.name))
    },
    publicationDatabaseFilterOptions: function() {
      return countPublicationMetadata(this.publishedScoreSets, 
        (publicationIdentifier) => publicationIdentifier.dbName ? [publicationIdentifier.dbName] : [])
    },
    publicationJournalFilterOptions: function() {
      return countPublicationMetadata(this.publishedScoreSets, 
        (publicationIdentifier) => publicationIdentifier.publicationJournal ? [publicationIdentifier.publicationJournal] : [])
    },
  },
  mounted: async function() {
    await this.search()
  },
  watch: {
    filterTargetNames: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetOrganismNames: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetAccession: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterTargetTypes: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationAuthors: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationDatabases: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    filterPublicationJournals: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    searchText: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    item: {
      handler: function() {
        this.clear()
      }
    },
    '$route.query.search': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.searchText = newValue
        }
      },
      immediate: true
    },
    '$route.query.target-names': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetNames = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    },
    '$route.query.target-types': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetTypes = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    },
    '$route.query.target-organism-names': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetOrganismNames = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    },
    '$route.query.target-accessions': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetAccession = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    },
    '$route.query.publication-authors': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationAuthors = newValue ? [newValue] : []
        }
      },
      immediate: true
    },
    '$route.query.publication-databases': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationDatabases = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    },
    '$route.query.publication-journals': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationJournals = newValue ? newValue.split(',') : []
        }
      },
      immediate: true
    }
  },
  methods: {
    debouncedSearch: function() {
      this.debouncedSearchFunction()
    },
    search: async function() {
      this.$router.push({query: {
        ...(this.searchText && this.searchText.length > 0) ? {search: this.searchText} : {},
        ...(this.filterTargetNames.length > 0) ? {'target-names': this.filterTargetNames.join(',')} : {},
        ...(this.filterTargetTypes.length > 0) ? {'target-types': this.filterTargetTypes.join(',')} : {},
        ...(this.filterTargetOrganismNames.length > 0) ? {'target-organism-names': this.filterTargetOrganismNames.join(',')} : {},
        ...(this.filterTargetAccession.length > 0) ? {'target-accessions': this.filterTargetAccession.join(',')} : {},
        ...(this.filterPublicationAuthors.length > 0) ? {'publication-authors': this.filterPublicationAuthors} : {},
        ...(this.filterPublicationDatabases.length > 0) ? {'publication-databases': this.filterPublicationDatabases.join(',')} : {},
        ...(this.filterPublicationJournals.length > 0) ? {'publication-journals': this.filterPublicationJournals.join(',')} : {}
      }})
      this.loading = true;
      await this.fetchSearchResults()
      /*URL
      if (this.searchText && this.searchText.length > 0) {
        await this.fetchSearchResults()
      } else {
        this.scoreSets = []
      }
      */
     this.loading = false;
    },
    fetchSearchResults: async function() {
      try {
        let response = await axios.post(
          `${config.apiBaseUrl}/score-sets/search`,
          {
            text: this.searchText || null,
            targets: this.filterTargetNames.length > 0 ? this.filterTargetNames : null,
            targetOrganismNames: this.filterTargetOrganismNames.length > 0 ? this.filterTargetOrganismNames : null,
            targetAccessions: this.filterTargetAccession.length > 0 ? this.filterTargetAccession : null,
            targetTypes: this.filterTargetTypes.length > 0 ? this.filterTargetTypes : null,
            authors: this.filterPublicationAuthors.length > 0 ? this.filterPublicationAuthors : null,
            databases: this.filterPublicationDatabases.length > 0 ? this.filterPublicationDatabases : null,
            journals: this.filterPublicationJournals.length > 0 ? this.filterPublicationJournals : null
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO catch errors in response
        this.scoreSets = response.data || []

        // reset published score sets search results when using search bar
        this.publishedScoreSets = this.scoreSets.filter((scoreSet) => !!scoreSet.publishedDate)
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },
    clear: function() {
      this.searchText = null
      this.filterTargetNames = []
      this.filterTargetTypes = []
      this.filterTargetOrganismNames = []
      this.filterTargetAccession = []
      this.filterPublicationAuthors = []
      this.filterPublicationDatabases = []
      this.filterPublicationJournals = []
    }
  }
}

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
}

.mavedb-organism-picker::v-deep .p-listbox-item {
  font-style: italic;
}

.mavedb-organism-picker::v-deep .p-listbox-item .p-badge {
  font-style: normal;
}

.mavedb-search-clear-button {
  position: absolute;
  top: 12px;
  right: 8px;
  margin: 0;
  padding: 0;
}

</style>
