<template>
  <DefaultLayout>
    <div class="mavedb-search-view">
      <div class="mavedb-search-header" style="display: none;">
        <h1>Search MaveDB Variants</h1>
      </div>
      <div class="mavedb-search-form">
        <div class="flex flex-wrap justify-content-center gap-3">
          <IconField iconPosition="left">
            <InputIcon class="pi pi-search"></InputIcon>
            <InputText v-model="searchText" ref="searchTextInput" type="search" class="p-inputtext-sm" placeholder="HGVS string" style="width: 500px;" />
          </IconField>
          <Button class="p-button-plain" @click="clear">Clear All</Button>
        </div>
      </div>
      <p v-if="!allele">
        Enter an HGVS string above to obtain a ClinGen allele ID and its details.
      </p>
      <div v-if="allele">
        <div v-if="allele?.['@id']">
          ClinGen Allele ID:
          <a :href="allele['@id']">{{ allele['@id'] }}</a>
        </div>
        <h2 v-if="canonicalAlleleName">{{ canonicalAlleleName }}</h2>
        <div class="mavedb-variant-search-result-subheading">Genomic Alleles</div>
        <DataTable
          :loading="loading"
          striped-rows
          :value="genomicAlleles"
        >
          <Column field="referenceGenome" header="Genome" />
          <Column field="chromosome" header="Chromosome" />
          <Column field="hgvs" header="HGVS" />
        </DataTable>
        <div class="mavedb-variant-search-result-subheading">Transcript Alleles</div>
        <DataTable
          :loading="loading"
          striped-rows
          :value="transcriptAlleles"
        >
          <Column header="Gene">
            <template #body="{data}">
              <a :href="data.gene">{{ data.geneSymbol || data.gene }}</a>
            </template>
          </Column>
          <Column field="hgvs" header="NT HGVS" />
          <Column field="proteinEffect.hgvs" header="Protein HGVS" />
        </DataTable>
      </div>
    </div>
  </DefaultLayout>
</template>

<script lang="ts">

import axios from 'axios'
import _ from 'lodash'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import Button from 'primevue/button'
import {defineComponent} from 'vue'
import {debounce} from 'vue-debounce'

export default defineComponent({
  name: 'SearchVariantsScreen',
  components: {Column, DataTable, DefaultLayout, IconField, InputIcon, InputText, Button},

  data: function() {
    return {
      loading: false,
      // @ts-ignore
      searchText: this.$route.query.search as string | null,
      allele: null as any | null,
      canonicalAlleleName: undefined as string | undefined,
      genomicAlleles: [] as Array<any>,
      transcriptAlleles: [] as Array<any>
    }
  },

  computed: {
    debouncedSearchFunction: function() {
      return debounce(() => this.search(), '400ms')
    }
  },

  watch: {
    searchText: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.debouncedSearch()
        }
      }
    },
    '$route.query.search': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.searchText = newValue
        }
      },
      immediate: true
    }
  },

  mounted: function() {
    this.search()
  },

  methods: {
    debouncedSearch: function() {
      this.debouncedSearchFunction()
    },
    search: async function() {
      this.$router.push({query: {
        ...(this.searchText && this.searchText.length > 0) ? {search: this.searchText} : {}
      }})
      this.loading = true;
      await this.fetchSearchResults()
      this.loading = false;
    },
    fetchSearchResults: async function() {
      if (_.isEmpty(this.searchText)) {
        this.allele = null
        this.genomicAlleles = []
        this.transcriptAlleles = []
      } else {
        try {
          const response = await axios.get('https://reg.test.genome.network/allele', {
            params: {
              hgvs: this.searchText
            }
          })

          this.allele = response.data
          this.canonicalAlleleName = response.data?.communityStandardTitle?.[0] || undefined
          this.genomicAlleles = response.data?.genomicAlleles || []
          this.transcriptAlleles = response.data?.transcriptAlleles || []
        } catch (error) {
          this.allele = null
          this.canonicalAlleleName = undefined
          this.genomicAlleles = []
          this.transcriptAlleles = []
          console.log(`Error while loading search results")`, error)
        }
      }
    },
    clear: function() {
      this.searchText = null
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

.mavedb-variant-search-result-subheading {
  margin: 1em 0 0.5em 0;
  font-weight: bold;
}

</style>
