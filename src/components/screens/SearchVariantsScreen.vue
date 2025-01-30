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
        Enter an HGVS string above to obtain a variant and its details.
      </p>
      <div v-if="allele" class="col-12">
        <Card>
          <template #content>
            <div class="variant-search-result">
              <div class="variant-search-result-button">
                <router-link to="/">
                  <Button label="View in MaveMD" icon="pi pi-eye" />
                </router-link>
              </div>
              <div class="variant-search-result-content">
                <!-- TODO handle no canonical allele name or just leave blank? -->
                <div class="variant-search-result-title">
                  {{ canonicalAlleleName }}
                </div>
                <div v-if="allele?.['@id']" class="variant-search-result-subcontent">
                  ClinGen Allele ID:
                  <a :href="allele['@id']">{{ allele['@id'] }}</a>
                </div>
                <div v-if="grch38Hgvs" class="variant-search-result-subcontent">
                  GRCh38 coordinates: {{ grch38Hgvs }}
                </div>
                <div v-if="grch37Hgvs" class="variant-search-result-subcontent">
                  GRCh37 coordinates: {{ grch37Hgvs }}
                </div>
                <div v-if="maneCoordinates.length > 0" class="variant-search-result-subcontent">
                  MANE transcript coordinates:
                  <DataTable striped-rows showGridlines size="small" :value="maneCoordinates">
                    <Column field="sequenceType" header="Sequence Type"></Column>
                    <Column field="database" header="Database"></Column>
                    <Column field="hgvs" header="Coordinates"></Column>
                  </DataTable> 
                </div>
                <div v-if="variants.length > 0" class="variant-search-result-subcontent">
                  MaveDB score sets containing variant:
                  <li v-for="variant in variants" :key="variant.urn">
                    <router-link :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}">
                      {{ variant.scoreSet.title }}
                    </router-link>
                  </li>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </DefaultLayout>
</template>

<script lang="ts">

import axios from 'axios'
import _ from 'lodash'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import {defineComponent} from 'vue'
import {debounce} from 'vue-debounce'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import EntityLink from '@/components/common/EntityLink.vue'

export default defineComponent({
  name: 'SearchVariantsScreen',
  components: {Card, Column, DataTable, DefaultLayout, EntityLink, IconField, InputIcon, InputText, Button},

  data: function() {
    return {
      loading: false,
      // @ts-ignore
      searchText: this.$route.query.search as string | null,
      allele: null as any | null,
      canonicalAlleleName: undefined as string | undefined,
      genomicAlleles: [] as Array<any>,
      grch38Hgvs: undefined as string | undefined,
      grch37Hgvs: undefined as string | undefined,
      transcriptAlleles: [] as Array<any>,
      maneCoordinates: [] as Array<any>,
      variants: [] as Array<any>
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
    },
    allele: {
      handler: async function(oldValue, newValue) {
        if (oldValue != newValue) {
          await this.mavedbClinGenAlleleIdSearch()
        }
      }
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
      this.variants = []
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
        this.grch38Hgvs = undefined
        this.grch37Hgvs = undefined
        this.maneCoordinates = []
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
          for (let i = 0; i < this.genomicAlleles.length; i++) {
            // TODO currently just taking first entry from hgvs array, since that appears to be NC coordinates. check this assumption
            if (this.genomicAlleles[i].referenceGenome === "GRCh38") {
              this.grch38Hgvs = this.genomicAlleles[i].hgvs?.[0]
            } else if (this.genomicAlleles[i].referenceGenome === "GRCh37") {
              this.grch37Hgvs = this.genomicAlleles[i].hgvs?.[0]
            }
          }
          this.transcriptAlleles = response.data?.transcriptAlleles || []
          for (let i = 0; i < this.transcriptAlleles.length; i++) {
            if (this.transcriptAlleles[i].MANE !== undefined) {
              // TODO may want to prioritize one of MANE select, MANE clinical, etc.
              const mane = this.transcriptAlleles[i].MANE
              for (const sequenceType of ["nucleotide", "protein"]) {
                for (const database in mane[sequenceType]) {
                  this.maneCoordinates.push({
                    sequenceType: sequenceType,
                    database: database,
                    hgvs: mane[sequenceType][database].hgvs
                  })
                }
              }
            }
            return
          }
        } catch (error) {
          this.allele = null
          this.canonicalAlleleName = undefined
          this.genomicAlleles = []
          this.grch38Hgvs = undefined
          this.grch37Hgvs = undefined
          this.maneCoordinates = []
          this.transcriptAlleles = []
          console.log("Error while loading search results", error)
        }
      }
    },
    clear: function() {
      this.searchText = null
    },
    mavedbClinGenAlleleIdSearch: async function() {
      if (this.allele == null) {
        this.variants = []
      } else {
        try {
          const response = await axios.post(
            `${config.apiBaseUrl}/variants/clingen-allele-id-lookups`,
            {
              clingenAlleleIds: [this.allele?.['@id'].split('/').at(-1)]
            }
          )
          if (response.data !== null && response.data.length > 0) {
            this.variants = response.data[0]
          } else {
            this.variants = []
          }
        } catch (error) {
          this.variants = []
          console.log("Error while loading MaveDB search results for variant", error)
        }
      }
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

.variant-search-result {
  display: flex;
  gap: 20px;
}

.variant-search-result-title {
  font-weight: bold;
  font-size: 20px;
  margin-bottom: 10px;
}

.variant-search-result-subcontent {
  margin-top: 5px;
}

</style>
