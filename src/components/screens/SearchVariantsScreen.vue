<template>
  <DefaultLayout>
    <div class="mavedb-search-view">
      <div class="mavedb-search-header" style="display: none;">
        <h1>Search MaveDB Variants</h1>
      </div>
      <div v-if="hgvsSearchVisible" class="mavedb-search-form">
        <div class="flex flex-wrap justify-content-center gap-3">
          <IconField iconPosition="left">
            <InputIcon class="pi pi-search"></InputIcon>
            <InputText v-model="searchText" ref="searchTextInput" type="search" class="p-inputtext-sm" placeholder="HGVS string" style="width: 500px;" />
          </IconField>
          <Button class="p-button-plain" @click="hgvsSearch">Search</Button>
        </div>
        <div class="mavedb-search-form-view-switch">
          Don't have a versioned reference sequence identifier? Click here to perform a fuzzy search instead:
          <Button class="p-button-plain" @click="fuzzySearchVisible = true; hgvsSearchVisible = false">Fuzzy Search</Button>
        </div>
      </div>
      <div v-if="fuzzySearchVisible" class="mavedb-search-form">
        <div class="flex flex-wrap justify-content-center gap-3">
          <InputText v-model="inputGene" placeholder="Gene symbol (HGNC)" class="mavedb-fuzzy-search-form-component" />
          <Dropdown v-model="inputVariantType" :options="['c.', 'p.']" placeholder="Variant type" class="mavedb-fuzzy-search-form-component" />
          <!-- TODO consider adding language to specify to include - or * in position if variant is in 5' or 3' UTR, respectively -->
          <InputText v-model="inputVariantPosition" placeholder="Position" class="mavedb-fuzzy-search-form-component" />
          <Dropdown v-model="inputReferenceAllele" :options="selectedAlleleOptions" placeholder="Reference allele" class="mavedb-fuzzy-search-form-component" />
          <Dropdown v-model="inputAlternateAllele" :options="selectedAlleleOptions" placeholder="Alternate allele" class="mavedb-fuzzy-search-form-component" />
          <Button class="p-button-plain" @click="fuzzySearch">Search</Button>
        </div>
        <div class="mavedb-search-form-view-switch">
          Click here to return to HGVS search:
          <Button class="p-button-plain" @click="hgvsSearchVisible = true; fuzzySearchVisible = false">HGVS Search</Button>
        </div>
      </div>
      <p v-if="alleles.length === 0">
        Enter an HGVS string or variant definition above to obtain a variant and its details.
      </p>
      <div v-for="(allele, alleleIdx) in alleles" :key="allele.clingenAlleleId" class="col-12">
        <Card>
          <template #content>
            <div class="variant-search-result">
              <div v-if="allele.variants.length > 0" class="variant-search-result-button">
                <router-link :to="`/variants/${allele.clingenAlleleId}`">
                  <Button label="View in MaveDB Clinical View" icon="pi pi-eye" />
                </router-link>
              </div>
              <div class="variant-search-result-content">
                <!-- TODO handle no canonical allele name or just leave blank? -->
                <div class="variant-search-result-title">
                  {{ allele.canonicalAlleleName }}
                </div>
                <div v-if="allele.clingenAlleleUrl" class="variant-search-result-subcontent">
                  ClinGen Allele ID:
                  <a :href="allele.clingenAlleleUrl">{{ allele.clingenAlleleUrl }}</a>
                </div>
                <div v-if="allele.grch38Hgvs" class="variant-search-result-subcontent">
                  GRCh38 coordinates: {{ allele.grch38Hgvs }}
                </div>
                <div v-if="allele.grch37Hgvs" class="variant-search-result-subcontent">
                  GRCh37 coordinates: {{ allele.grch37Hgvs }}
                </div>
                <div v-if="allele.maneCoordinates.length > 0" class="variant-search-result-subcontent">
                  MANE transcript coordinates:
                  <DataTable striped-rows showGridlines size="small" :value="allele.maneCoordinates">
                    <Column field="sequenceType" header="Sequence Type"></Column>
                    <Column field="database" header="Database"></Column>
                    <Column field="hgvs" header="Coordinates"></Column>
                  </DataTable>
                </div>
                <div v-if="allele.variantsStatus == 'Loaded' && allele.variants.length > 0" class="variant-search-result-subcontent">
                  MaveDB score sets containing variant:
                  <li v-for="variant in scoreSetListIsExpanded[alleleIdx] ? allele.variants : allele.variants.slice(0, defaultNumScoreSetsToShow)" :key="variant.urn">
                    <router-link :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}">
                      {{ variant.scoreSet.title }}
                    </router-link>
                  </li>
                  <Button v-if="allele.variants.length > defaultNumScoreSetsToShow"
                    icon="pi pi-angle-down"
                    class="p-button-text"
                    style="width: fit-content;"
                    @click="scoreSetListIsExpanded[alleleIdx] = !scoreSetListIsExpanded[alleleIdx]"
                  >
                    {{ scoreSetListIsExpanded[alleleIdx] ? 'Show less' : `Show ${allele.variants.length - defaultNumScoreSetsToShow} more` }}
                  </Button>
                </div>
                <!-- <div v-if="allele.variantsStatus == 'Loaded' && allele.variants.length > 0" style="overflow: hidden;">
                  <div v-for="variant in allele.variants" :key="variant.urn" style="float: left; border: 1px solid #000; width: 300px; margin: 5px; padding: 5px;">
                    <div style="border-bottom: 3px solid #000; font-weight: bold;">{{ variant.scoreSet.title }}</div>
                    {{ variant.scoreSet?.experiment?.keywords }}
                  </div>
                </div> -->
                <Message v-else-if="allele.variantsStatus == 'Loaded'">No score sets containing this variant were found in MaveDB.</Message>
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
import Dropdown from 'primevue/dropdown'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import {defineComponent} from 'vue'
// import {debounce} from 'vue-debounce'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import EntityLink from '@/components/common/EntityLink.vue'

const SCORE_SETS_TO_SHOW = 5

export default defineComponent({
  name: 'SearchVariantsScreen',
  components: {Card, Column, DataTable, DefaultLayout, Dropdown, EntityLink, IconField, InputIcon, InputText, Button, Message},

  data: function() {
    return {
      loading: false,
      hgvsSearchVisible: true,
      fuzzySearchVisible: false,
      searchText: null as string | null,
      inputGene: null as string | null,
      inputVariantType: null as string | null,
      inputVariantPosition: null as string | null,
      inputReferenceAllele: null as string | null,
      inputAlternateAllele: null as string | null,
      allAlleleOptions: {
        'c.': ['A','C','G','T'],
        'p.': [
          'Ala',
          'Arg',
          'Asp',
          'Asn',
          'Cys',
          'Gln',
          'Glu',
          'Gly',
          'His',
          'Ile',
          'Leu',
          'Lys',
          'Met',
          'Phe',
          'Pro',
          'Ser',
          'Thr',
          'Trp',
          'Tyr',
          'Val'
        ]
      },
      alleles: [] as Array<any>,
      scoreSetListIsExpanded: [] as Array<boolean>,
      defaultNumScoreSetsToShow: SCORE_SETS_TO_SHOW,
    }
  },

  watch: {
    alleles: {
      handler: function(newValue) {
        if (newValue.length > 0) {
          this.scoreSetListIsExpanded = newValue.map(() => false)
        }
      }
    },
  },

  computed: {
    // clingenAlleleId: function() {
    //   return this.allele?.['@id']?.split('/')?.at(-1)
    // },
    // debouncedSearchFunction: function() {
    //   return debounce(() => this.search(), '400ms')
    // }
    selectedAlleleOptions: function() {
      if (this.inputVariantType === null) {
        return []
      } else {
        // @ts-ignore
        return this.allAlleleOptions[this.inputVariantType]
      }
    }
  },

  methods: {
    hgvsSearch: async function() {
      this.alleles = []
      this.loading = true;
      if (this.searchText !== null && this.searchText !== '') {
        await this.fetchHgvsSearchResults(this.searchText)
      }
      this.loading = false;
      await this.searchVariants();
    },
    fetchHgvsSearchResults: async function(hgvsString: string, maneStatus: string | null = null) {
      try {
        const response = await axios.get('https://reg.test.genome.network/allele', {
          params: {
            hgvs: hgvsString
          }
        })
        const newAllele = {
          clingenAlleleUrl: response.data?.['@id'],
          clingenAlleleId: response.data?.['@id']?.split('/')?.at(-1),
          canonicalAlleleName: response.data?.communityStandardTitle?.[0] || undefined,
          maneStatus: maneStatus,
          genomicAlleles: response.data?.genomicAlleles || [],
          grch38Hgvs: null,
          grch37Hgvs: null,
          transcriptAlleles: response.data?.transcriptAlleles || [],
          maneCoordinates: [] as Array<any>,
          variantsStatus: 'NotLoaded',
          variants: [] as Array<any>
        }
        for (let i = 0; i < newAllele.genomicAlleles.length; i++) {
          // TODO currently just taking first entry from hgvs array, since that appears to be NC coordinates. check this assumption
          if (newAllele.genomicAlleles[i].referenceGenome === "GRCh38") {
            newAllele.grch38Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
          } else if (newAllele.genomicAlleles[i].referenceGenome === "GRCh37") {
            newAllele.grch37Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
          }
        }
        for (let i = 0; i < newAllele.transcriptAlleles.length; i++) {
          if (newAllele.transcriptAlleles[i].MANE !== undefined) {
            // TODO may want to prioritize one of MANE select, MANE clinical, etc. For now, just grab the first mane transcript.
            const mane = newAllele.transcriptAlleles[i].MANE
            for (const sequenceType of ["nucleotide", "protein"]) {
              for (const database in mane[sequenceType]) {
                newAllele.maneCoordinates.push({
                  sequenceType: sequenceType,
                  database: database,
                  hgvs: mane[sequenceType][database].hgvs
                })
              }
            }
          }
          break
        }
        this.alleles.push(newAllele)
      } catch (error) {
        // NOTE: not resetting alleles here, because any error will have occurred before pushing to alleles.
        // don't want to reset alleles because this function may be called in a loop to process several hgvs strings.
        console.log("Error while loading search results", error)
      }
    },
    searchVariants: async function() {
      for (const allele of this.alleles) {
        allele.variantsStatus = 'Loading'
        try {
          const response = await axios.post(
            `${config.apiBaseUrl}/variants/clingen-allele-id-lookups`,
            {
              clingenAlleleIds: [allele.clingenAlleleId]
            }
          )
          if (response.data !== null && response.data.length > 0) {
            allele.variants = response.data[0]
            allele.variantsStatus = 'Loaded'
          } else {
            allele.variants = []
            allele.variantsStatus = 'Loaded'
          }
        } catch (error) {
          allele.variants = []
          allele.variantsStatus = 'Error'
          console.log("Error while loading MaveDB search results for variant", error)
        }
      }
    },
    fuzzySearch: async function() {
      this.alleles = []
      this.loading = true;
      await this.fetchFuzzySearchResults()
      this.loading = false;
      await this.searchVariants();
    },
    fetchFuzzySearchResults: async function() {
      // TODO could make this check more elegant
      if (_.isEmpty(this.inputGene) || _.isEmpty(this.inputVariantType) || _.isEmpty(this.inputVariantPosition) || _.isEmpty(this.inputReferenceAllele) || _.isEmpty(this.inputAlternateAllele)) {
        // unnecessary since we are clearing this.alleles above
        this.alleles = []
      } else {
        try {
          // human gene symbols should always be upper case, and ClinGen API is case-sensitive
          const geneSymbol = this.inputGene?.toUpperCase()
          // TODO validate variant position input: can't be 0, can only include *, - (if c.) and digits

          // retrieve clingen gene id
          const geneResponse = await axios.get('https://reg.test.genome.network/gene', {
            params: {
              "HGNC.symbol": geneSymbol
            }
          })

          //extract mane transcripts
          const maneRefSeqIds = []
          for (const maneRecord of geneResponse.data?.externalRecords?.MANE) {
            if (this.inputVariantType === "c.") {
              maneRefSeqIds.push({
                id: maneRecord.nucleotide?.RefSeq?.id,
                maneStatus: maneRecord.maneStatus
              })
            } else if (this.inputVariantType === "p.") {
              maneRefSeqIds.push({
                id: maneRecord.protein?.RefSeq?.id,
                maneStatus: maneRecord.maneStatus
              })
            }
          }

          // for now, just use mane transcripts from gene response.
          // uncomment this block to include all refseq transcripts, including non-MANE
          // which could be done if variant input type is c.
          // const clingenGeneId = geneResponse.data?.['@id']?.split('/')?.at(-1)
          // // retrieve refseq transcripts associated with clingen allele id
          // const transcriptResponse = await axios.get('https://reg.test.genome.network/refseqs', {
          //   params: {
          //     gene: clingenGeneId
          //   }
          // })

          // create hgvs strings
          const hgvsStrings = []
          for (const maneRefSeqId of maneRefSeqIds) {
            if (this.inputVariantType === "c.") {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputVariantPosition}${this.inputReferenceAllele}>${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            } else if (this.inputVariantType === "p.") {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputReferenceAllele}${this.inputVariantPosition}${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            }
          }

          // fetch clingen allele id results for each hgvs string
          for (const hgvsString of hgvsStrings) {
            await this.fetchHgvsSearchResults(hgvsString.hgvsString, hgvsString.maneStatus)
          }
        } catch (error) {
          this.alleles = []
          console.log("Error while loading search results", error)
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
  /* flex: 0 0 auto; */
  display: flex;
  flex-wrap: wrap;
  padding: 10px 0;
  text-align: center;
  justify-content: center;
  gap: 3px;
}

.mavedb-search-form-view-switch {
  flex: 0 0 auto;
  padding: 10px 0;
  text-align: center;
  gap: 5px;
  justify-content: center;
}

.mavedb-fuzzy-search-form-component {
  margin: 0 10px;
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
