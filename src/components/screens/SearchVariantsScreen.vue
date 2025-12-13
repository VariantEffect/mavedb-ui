<template>
  <DefaultLayout
    :footer="searchResultsVisible ? 'flow' : 'pinned'"
    height="full"
    :overflow-y="true || searchResultsVisible ? 'scroll' : 'hidden'"
  >
    <div
      :class="[
        'mavedb-search-view',
        searchResultsVisible ? 'mavedb-search-view-with-results' : 'mavedb-search-view-without-results'
      ]"
    >
      <div class="flex justify-content-center">
        <img alt="MaveMD" class="mavedb-mavemd-logo" src="@/assets/mavemd-logo.png" />
      </div>
      <div class="mavedb-mavemd-intro">
        MaveMD (MAVEs for MeDicine) is an interface that integrates ClinVar and the ClinGen Allele Registry, displays
        clinical evidence calibrations, provides intuitive visualizations, and exports structured evidence compatible
        with ACMG/AMP variant classification guidelines. MaveMD currently contains 438,318 variant effect measurements
        mapped to the human genome from 74 MAVE datasets spanning 32 disease-associated genes.
      </div>
      <div v-if="defaultSearchVisible" class="mavedb-search-form">
        <div class="mavedb-search-heading">Search MaveDB for human gene variants</div>
        <div class="flex flex-wrap justify-content-center align-items-center gap-3">
          <Select
            v-model="searchType"
            class="w-48"
            option-label="name"
            option-value="code"
            :options="searchTypeOptions"
            placeholder="Select search type"
            size="large"
          />
          <IconField>
            <InputIcon class="pi pi-search"></InputIcon>
            <InputText
              ref="searchTextInput"
              v-model="searchText"
              class="w-124"
              placeholder="Enter a value"
              size="large"
              type="search"
              @keyup.enter="defaultSearch"
            />
          </IconField>
          <Button class="p-3!" @click="defaultSearch">Search</Button>
          <div class="mavedb-clear-search-button-container">
            <Button
              :disabled="!searchIsClearable"
              icon="pi pi-times"
              rounded
              @click="clearSearch"
            />
          </div>
        </div>
        <div class="mavedb-search-form-view-switch">
          Don't have a versioned reference sequence identifier? Click here to perform a fuzzy search instead:
          <Button class="p-button-plain" @click="showSearch('fuzzy')">Fuzzy Search</Button>
        </div>
        <div class="mavedb-examples-button-container">
          <Button class="p-button-plain p-button-text" @click="searchSuggestionsVisible = !searchSuggestionsVisible">
            {{ searchSuggestionsVisible ? 'Hide search examples' : 'Show search examples' }}
          </Button>
        </div>
        <div v-if="searchSuggestionsVisible" class="mavedb-search-suggestions">
          <p>
            Examples of supported searches:
            <ul>
              <li v-for="option in searchTypeOptions" :key="option.code">
                {{ option.name }}
                <template v-for="(example, index) in option.examples" :key="example">
                  <span v-if="index > 0">•</span>
                  <span v-tooltip.top="'Click to search'" class="mavedb-search-example" @click="searchForText($event, option.code)">{{ example }}</span>
                </template>
                <template v-if="option.code=='hgvs'">(supports a variety of HGVS formats)</template>
              </li>
            </ul>
          </p>
        </div>
      </div>
      <div v-if="fuzzySearchVisible" class="mavedb-search-form">
        <div class="mavedb-search-heading">Search MaveDB for human gene variants</div>
        <div class="align-items-stretch flex flex-wrap justify-content-center gap-0">
          <InputText
            v-model="inputGene"
            class="mavedb-fuzzy-search-form-component"
            placeholder="Gene symbol (HGNC)"
            type="search"
          />
          <Select
            v-model="inputVariantType"
            class="mavedb-fuzzy-search-form-component"
            :options="['c.', 'p.']"
            placeholder="Variant type"
          />
          <!-- TODO consider adding language to specify to include - or * in position if variant is in 5' or 3' UTR, respectively -->
          <InputText v-model="inputVariantPosition" class="mavedb-fuzzy-search-form-component" placeholder="Position" />
          <Select
            v-model="inputReferenceAllele"
            class="mavedb-fuzzy-search-form-component"
            :options="selectedAlleleOptions"
            placeholder="Reference allele"
          />
          <Select
            v-model="inputAlternateAllele"
            class="mavedb-fuzzy-search-form-component"
            :options="selectedAlleleOptions"
            placeholder="Alternate allele"
          />
          <Button class="p-button-plain" @click="fuzzySearch">Search</Button>
          <div class="mavedb-clear-search-button-container">
            <Button
              class="p-button-plain"
              :disabled="!searchIsClearable"
              icon="pi pi-times"
              rounded
              @click="clearSearch"
            />
          </div>
        </div>
        <div class="mavedb-search-form-view-switch">
          Click here to return to standard search:
          <Button class="p-button-plain" @click="showSearch('default')">Standard Search</Button>
        </div>
      </div>
      <div v-if="!searchResultsVisible" class="mavedb-expander-container">
        <Button
          class="mavedb-expander-toggle"
          :label="guideExpanded ? 'Show less' : 'Show more'"
          text
          @click="toggleGuide"
        />
        <div
          v-if="!searchResultsVisible"
          :class="['mavedb-expander', ...(guideExpanded ? ['mavedb-expander-expanded'] : [])]"
        >
          <table>
            <thead>
              <tr>
                <th style="width: 12%">Gene</th>
                <th style="width: 50%">Score set</th>
                <th style="width: 25%">Publication</th>
                <th style="width: 13%">Calibrations w. evidence / Total</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="{gene, urns} in maveMdScoreSetsGroupedByGene" :key="gene">
                <tr>
                  <td :rowspan="urns.length">{{ gene }}</td>
                  <td>
                    <router-link :to="{name: 'scoreSet', params: {urn: urns[0]}}">{{
                      maveMdScoreSets[urns[0]]?.title || urns[0]
                    }}</router-link>
                  </td>
                  <td>
                    <router-link v-if="maveMdScoreSets[urns[0]]" :to="{name: 'scoreSet', params: {urn: urns[0]}}">{{
                      getScoreSetShortName(maveMdScoreSets[urns[0]]!)
                    }}</router-link>
                  </td>
                  <td style="text-align: center">
                    <router-link :to="{name: 'scoreSetCalibrations', params: {urn: urns[0]}}"
                      >{{
                        maveMdScoreSets[urns[0]]?.scoreCalibrations.filter(
                          (calibration) =>
                            calibration.functionalRanges?.filter((range) => range.acmgClassification).length > 0
                        ).length || 0
                      }}
                      / {{ maveMdScoreSets[urns[0]]?.scoreCalibrations.length || 0 }}
                    </router-link>
                  </td>
                </tr>
                <tr v-for="urn in urns.slice(1)" :key="urn">
                  <td>
                    <router-link :to="{name: 'scoreSet', params: {urn}}">{{
                      maveMdScoreSets[urn]?.title || urn
                    }}</router-link>
                  </td>
                  <td style>
                    <router-link v-if="maveMdScoreSets[urn]" :to="{name: 'scoreSet', params: {urn}}">{{
                      getScoreSetShortName(maveMdScoreSets[urn]!)
                    }}</router-link>
                  </td>
                  <td style="text-align: center">
                    <router-link :to="{name: 'scoreSetCalibrations', params: {urn: urns[0]}}">
                      {{
                        maveMdScoreSets[urn]?.scoreCalibrations.filter(
                          (calibration) =>
                            calibration.functionalRanges?.filter((range) => range.acmgClassification).length > 0
                        ).length || 0
                      }}
                      / {{ maveMdScoreSets[urn]?.scoreCalibrations.length || 0 }}
                    </router-link>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div ref="searchResults" v-if="searchResultsVisible">
        <div v-for="(allele, alleleIdx) in alleles" :key="allele.clingenAlleleId" class="col-12">
          <Card>
            <template #content>
              <div class="variant-search-result">
                <div
                  v-if="
                    allele.variants.nucleotide.length > 0 ||
                    allele.variants.protein.length > 0 ||
                    allele.variants.associatedNucleotide.length > 0
                  "
                  class="variant-search-result-button"
                >
                  <router-link :to="`/variants/${allele.clingenAlleleId}`">
                    <Button icon="pi pi-eye" label="View in MaveMD Clinical View" />
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
                    <DataTable show-gridlines size="small" striped-rows :value="allele.maneCoordinates">
                      <Column field="sequenceType" header="Sequence Type"></Column>
                      <Column field="database" header="Database"></Column>
                      <Column field="hgvs" header="Coordinates"></Column>
                    </DataTable>
                  </div>
                  <div
                    v-if="
                      allele.variantsStatus == 'Loaded' &&
                      (allele.variants.nucleotide.length > 0 ||
                        allele.variants.protein.length > 0 ||
                        allele.variants.associatedNucleotide.length > 0)
                    "
                  >
                    <div v-if="allele.variants.nucleotide.length > 0" class="variant-search-result-subcontent">
                      MaveDB score sets measuring variant at the nucleotide level:
                      <li
                        v-for="variant in nucleotideScoreSetListIsExpanded[alleleIdx]
                          ? allele.variants.nucleotide
                          : allele.variants.nucleotide.slice(0, defaultNumScoreSetsToShow)"
                        :key="variant.urn"
                      >
                        <router-link
                          :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}"
                        >
                          {{ variant.scoreSet.title }}
                        </router-link>
                      </li>
                      <Button
                        v-if="allele.variants.nucleotide.length > defaultNumScoreSetsToShow"
                        class="p-button-text"
                        icon="pi pi-angle-down"
                        style="width: fit-content"
                        @click="
                          nucleotideScoreSetListIsExpanded[alleleIdx] = !nucleotideScoreSetListIsExpanded[alleleIdx]
                        "
                      >
                        {{
                          nucleotideScoreSetListIsExpanded[alleleIdx]
                            ? 'Show less'
                            : `Show ${allele.variants.nucleotide.length - defaultNumScoreSetsToShow} more`
                        }}
                      </Button>
                    </div>
                    <div v-if="allele.variants.protein.length > 0" class="variant-search-result-subcontent">
                      MaveDB score sets measuring variant at the amino acid level:
                      <li
                        v-for="variant in proteinScoreSetListIsExpanded[alleleIdx]
                          ? allele.variants.protein
                          : allele.variants.protein.slice(0, defaultNumScoreSetsToShow)"
                        :key="variant.urn"
                      >
                        <router-link
                          :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}"
                        >
                          {{ variant.scoreSet.title }}
                        </router-link>
                      </li>
                      <Button
                        v-if="allele.variants.protein.length > defaultNumScoreSetsToShow"
                        class="p-button-text"
                        icon="pi pi-angle-down"
                        style="width: fit-content"
                        @click="proteinScoreSetListIsExpanded[alleleIdx] = !proteinScoreSetListIsExpanded[alleleIdx]"
                      >
                        {{
                          proteinScoreSetListIsExpanded[alleleIdx]
                            ? 'Show less'
                            : `Show ${allele.variants.protein.length - defaultNumScoreSetsToShow} more`
                        }}
                      </Button>
                    </div>
                    <div
                      v-if="allele.variants.associatedNucleotide.length > 0"
                      class="variant-search-result-subcontent"
                    >
                      MaveDB score sets measuring a different nucleotide variant with an equivalent protein effect:
                      <li
                        v-for="variant in associatedNucleotideScoreSetListIsExpanded[alleleIdx]
                          ? allele.variants.associatedNucleotide
                          : allele.variants.nucleotide.slice(0, defaultNumScoreSetsToShow)"
                        :key="variant.urn"
                      >
                        <router-link
                          :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}"
                        >
                          {{ variant.scoreSet.title }}
                        </router-link>
                      </li>
                      <Button
                        v-if="allele.variants.associatedNucleotide.length > defaultNumScoreSetsToShow"
                        class="p-button-text"
                        icon="pi pi-angle-down"
                        style="width: fit-content"
                        @click="
                          associatedNucleotideScoreSetListIsExpanded[alleleIdx] =
                            !associatedNucleotideScoreSetListIsExpanded[alleleIdx]
                        "
                      >
                        {{
                          associatedNucleotideScoreSetListIsExpanded[alleleIdx]
                            ? 'Show less'
                            : `Show ${allele.variants.associatedNucleotide.length - defaultNumScoreSetsToShow} more`
                        }}
                      </Button>
                    </div>
                  </div>
                  <!-- <div v-if="allele.variantsStatus == 'Loaded' && allele.variants.length > 0" style="overflow: hidden;">
                    <div v-for="variant in allele.variants" :key="variant.urn" style="float: left; border: 1px solid #000; width: 300px; margin: 5px; padding: 5px;">
                      <div style="border-bottom: 3px solid #000; font-weight: bold;">{{ variant.scoreSet.title }}</div>
                      {{ variant.scoreSet?.experiment?.keywords }}
                    </div>
                  </div> -->
                  <Message v-else-if="allele.variantsStatus == 'Loaded'"
                    >No score sets containing this variant were found in MaveDB.</Message
                  >
                </div>
              </div>
            </template>
          </Card>
        </div>
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
import Select from 'primevue/select'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import {defineComponent} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useToast} from 'primevue/usetoast'
import {useHead} from '@unhead/vue'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import {clinGenAlleleIdRegex, clinVarVariationIdRegex, rsIdRegex, MAVE_MD_SCORE_SETS} from '@/lib/mavemd'
import {components} from '@/schema/openapi'
import {getScoreSetShortName} from '@/lib/score-sets'
import {clinVarHgvsSearchStringRegex, hgvsSearchStringRegex} from '@/lib/mave-hgvs'

const SCORE_SETS_TO_SHOW = 5

type ScoreSet = components['schemas']['ScoreSet']

export default defineComponent({
  name: 'SearchVariantsScreen',

  components: {
    Card,
    Column,
    DataTable,
    DefaultLayout,
    Select,
    IconField,
    InputIcon,
    InputText,
    Button,
    Message
  },

  setup() {
    useHead({title: 'MaveMD variant search'})

    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    return {route, router, toast}
  },

  data: function () {
    return {
      loading: false,
      defaultSearchVisible: true,
      searchSuggestionsVisible: false,
      fuzzySearchVisible: false,
      searchResultsVisible: false,
      searchText: null as string | null,
      searchType: null as string | null,
      searchTypeOptions: [
        {code: 'hgvs', name: 'HGVS', examples: ['ENST00000473961.6:c.-19-2A>T', 'NP_000242.1:p.Asn566Thr']},
        {code: 'clinGenAlleleId', name: 'ClinGen Allele ID', examples: ['CA10590195', 'PA2579983208']},
        {code: 'dbSnpRsId', name: 'dbSNP rsID', examples: ['rs900082291', '900082291']},
        {code: 'clinVarVariationId', name: 'ClinVar Variation ID', examples: ['869058']},
      ],
      inputGene: null as string | null,
      inputVariantType: null as string | null,
      inputVariantPosition: null as string | null,
      inputReferenceAllele: null as string | null,
      inputAlternateAllele: null as string | null,
      allAlleleOptions: {
        'c.': ['A', 'C', 'G', 'T'],
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
      nucleotideScoreSetListIsExpanded: [] as Array<boolean>,
      proteinScoreSetListIsExpanded: [] as Array<boolean>,
      associatedNucleotideScoreSetListIsExpanded: [] as Array<boolean>,
      defaultNumScoreSetsToShow: SCORE_SETS_TO_SHOW,
      guideExpanded: false,
      maveMdScoreSetUrns: MAVE_MD_SCORE_SETS,
      maveMdScoreSets: {} as {[urn: string]: ScoreSet | undefined},
      numMaveMdScoreSetRetries: 0
    }
  },

  computed: {
    maveMdScoreSetsGroupedByGene: function () {
      return _(this.maveMdScoreSetUrns)
        .groupBy('gene')
        .toPairs()
        .map((geneAndScoreSetSpecs) => ({
          gene: geneAndScoreSetSpecs[0],
          urns: geneAndScoreSetSpecs[1].map((scoreSetSpec) => scoreSetSpec.urn)
        }))
        .value()
    },
    searchIsClearable: function () {
      return (
        !_.isEmpty(this.searchText) ||
        !_.isEmpty(this.inputGene) ||
        !_.isEmpty(this.inputVariantType) ||
        !_.isEmpty(this.inputVariantPosition) ||
        !_.isEmpty(this.inputReferenceAllele) ||
        !_.isEmpty(this.inputAlternateAllele)
      )
    },
    // clingenAlleleId: function() {
    //   return this.allele?.['@id']?.split('/')?.at(-1)
    // },
    // debouncedSearchFunction: function() {
    //   return debounce(() => this.search(), '400ms')
    // }
    selectedAlleleOptions: function () {
      if (this.inputVariantType === null) {
        return []
      } else {
        // @ts-ignore
        return this.allAlleleOptions[this.inputVariantType]
      }
    }
  },

  watch: {
    alleles: {
      handler: function (newValue) {
        if (newValue.length > 0) {
          this.nucleotideScoreSetListIsExpanded = newValue.map(() => false)
          this.proteinScoreSetListIsExpanded = newValue.map(() => false)
          this.associatedNucleotideScoreSetListIsExpanded = newValue.map(() => false)
        }
      }
    },
    searchType: {
      handler(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.router.replace({
            query: {search: this.searchText || undefined, searchType: newVal}
          })
        }
      }
    },
    '$route.query.search': {
      immediate: true,
      handler(newVal) {
        if (typeof newVal === 'string') {
          this.searchText = newVal
        } else if (!newVal) {
          this.searchText = ''
        }
      }
    },
    '$route.query.searchType': {
      immediate: true,
      handler(newVal) {
        if (typeof newVal === 'string') {
          this.searchType = newVal
        } else if (!newVal) {
          this.searchType = 'hgvs'
        }
      }
    },
    '$route.query.gene': {
      immediate: true,
      handler(newVal) {
        this.inputGene = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.variantType': {
      immediate: true,
      handler(newVal) {
        this.inputVariantType = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.variantPosition': {
      immediate: true,
      handler(newVal) {
        this.inputVariantPosition = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.refAllele': {
      immediate: true,
      handler(newVal) {
        this.inputReferenceAllele = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.altAllele': {
      immediate: true,
      handler(newVal) {
        this.inputAlternateAllele = typeof newVal === 'string' ? newVal : ''
      }
    }
  },

  mounted() {
    // If search param is present, run default search
    if (this.route.query.search && String(this.route.query.search).trim() !== '') {
      this.defaultSearchVisible = true
      this.fuzzySearchVisible = false
      this.defaultSearch()
    } else if (
      this.route.query.gene ||
      this.route.query.variantType ||
      this.route.query.variantPosition ||
      this.route.query.refAllele ||
      this.route.query.altAllele
    ) {
      // If any fuzzy search param is present, run fuzzy search
      this.defaultSearchVisible = false
      this.fuzzySearchVisible = true
      this.fuzzySearch()
    }

    this.fetchMaveMdScoreSets()
  },

  methods: {
    getScoreSetShortName: function (scoreSet: ScoreSet) {
      return getScoreSetShortName(scoreSet)
    },
    fetchMaveMdScoreSets: async function () {
      let hasFailures = false
      for (const scoreSetSpec of this.maveMdScoreSetUrns) {
        if (!this.maveMdScoreSets[scoreSetSpec.urn]) {
          try {
            const scoreSet = (await axios.get(`${config.apiBaseUrl}/score-sets/${scoreSetSpec.urn}`)).data
            this.maveMdScoreSets[scoreSetSpec.urn] = scoreSet
          } catch {
            hasFailures = true
          }
        }
      }
      if (hasFailures && this.numMaveMdScoreSetRetries < 10) {
        this.numMaveMdScoreSetRetries++
        setTimeout(() => {
          this.fetchMaveMdScoreSets()
        }, 5000)
      }
    },
    toggleGuide: function () {
      this.guideExpanded = !this.guideExpanded
    },
    searchForText: function (event: PointerEvent, searchType: string) {
      const element = event.target
      this.searchType = searchType
      if (element) {
        this.showSearch('default')
        this.searchText = element.innerText
        this.defaultSearch()
      }
      this.router.replace({query: {searchType: this.searchType, search: this.searchText}})
    },
    clearSearch() {
      this.searchText = null
      this.inputGene = null
      this.inputVariantType = null
      this.inputVariantPosition = null
      this.inputReferenceAllele = null
      this.inputAlternateAllele = null
      this.searchResultsVisible = false
      this.alleles = []
    },
    showSearch(searchMethod: 'fuzzy' | 'default' = 'default') {

      this.defaultSearchVisible = searchMethod == 'default'
      this.fuzzySearchVisible = searchMethod == 'fuzzy'

    },
    defaultSearch: async function () {
      this.searchResultsVisible = true
      // Remove fuzzy search params from the URL
      const {gene, variantType, variantPosition, refAllele, altAllele, ...rest} = this.route.query
      this.router.replace({
        query: {...rest, search: this.searchText || undefined}
      })
      this.alleles = []
      this.loading = true
      if (this.searchText !== null && this.searchText !== '') {
        await this.fetchDefaultSearchResults(this.searchText)
      }
      this.loading = false
      await this.searchVariants()
    },
    fetchDefaultSearchResults: async function (searchString: string, maneStatus: string | null = null) {
      const searchType = this.searchType
      let searchStr = searchString.trim()

      try {
        let response
        if (searchType === 'clinGenAlleleId') {
          if (!clinGenAlleleIdRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid ClinGen Allele ID (e.g. ${_.join(_.find(this.searchTypeOptions, { code: searchType })?.examples, ', ')})`,
              life: 10000
            })
            return
          }
          response = await axios.get(`https://reg.genome.network/allele/${searchStr}`)
        } else if (searchType === 'dbSnpRsId') {
          if (!rsIdRegex.test(searchStr) && !rsIdRegex.test(`rs${searchStr}`)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid dbSNP rsID (e.g. ${_.join(_.find(this.searchTypeOptions, { code: searchType })?.examples, ', ')})`,
              life: 10000
            })
            return
          }
          response = await axios.get('https://reg.genome.network/alleles', {
            params: {
              'dbSNP.rs': searchStr
            }
          })
        } else if (searchType === 'clinVarVariationId') {
          if (!clinVarVariationIdRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid ClinVar Variation ID (e.g. ${_.join(_.find(this.searchTypeOptions, { code: searchType })?.examples, ', ')})`,
              life: 10000
            })
            return
          }
          response = await axios.get('https://reg.genome.network/alleles', {
            params: {
              'ClinVar.variationId': searchStr
            }
          })
        } else {
          if (!hgvsSearchStringRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid HGVS string (e.g. ${_.join(_.find(this.searchTypeOptions, { code: searchType })?.examples, ', ')})`,
              life: 10000
            })
            return
          }
          // Strip gene symbol and/or protein consequence from ClinVar-style variant names to obtain valid HGVS. If the
          // search string doesn't match the pattern, leave it as is and let the rest of the search code handle any format
          // problem.
          const match = clinVarHgvsSearchStringRegex.exec(searchStr)
          if (match) {
            searchStr = `${match.groups!.identifier}:${match.groups!.description}`
          }
          response = await axios.get('https://reg.genome.network/allele', {
            params: {
              hgvs: searchStr
            }
          })
        }
        // determine if response data is a single allele or a list of alleles
        const results = Array.isArray(response.data) ? response.data : [response.data]

        for (const result of results) {
          const clingenAlleleId = result['@id']?.split('/')?.at(-1)
          if (clingenAlleleId && clingenAlleleId.startsWith('CA')) {
            const newAllele = {
              clingenAlleleUrl: result?.['@id'],
              clingenAlleleId: clingenAlleleId,
              canonicalAlleleName: result?.communityStandardTitle?.[0] || undefined,
              maneStatus: maneStatus,
              genomicAlleles: result?.genomicAlleles || [],
              grch38Hgvs: null,
              grch37Hgvs: null,
              transcriptAlleles: result?.transcriptAlleles || [],
              maneCoordinates: [] as Array<any>,
              variantsStatus: 'NotLoaded',
              variants: {
                nucleotide: [] as Array<any>,
                protein: [] as Array<any>,
                associatedNucleotide: [] as Array<any>
              }
            }
            for (let i = 0; i < newAllele.genomicAlleles.length; i++) {
              // TODO currently just taking first entry from hgvs array, since that appears to be NC coordinates. check this assumption
              if (newAllele.genomicAlleles[i].referenceGenome === 'GRCh38') {
                newAllele.grch38Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
              } else if (newAllele.genomicAlleles[i].referenceGenome === 'GRCh37') {
                newAllele.grch37Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
              }
            }
            for (let i = 0; i < newAllele.transcriptAlleles.length; i++) {
              if (newAllele.transcriptAlleles[i].MANE !== undefined) {
                // TODO may want to prioritize one of MANE select, MANE clinical, etc. For now, just grab the first mane transcript.
                const mane = newAllele.transcriptAlleles[i].MANE
                for (const sequenceType of ['nucleotide', 'protein']) {
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
          } else if (clingenAlleleId && clingenAlleleId.startsWith('PA')) {
            // Surface result on nucleotide-level variant if possible
            // some PA IDs do not have associated CA IDs/matching registered transcripts
            // because they are single amino acid variants caused by multi-nucleotide variants
            // or delins nucleotide variants, and the more complex nucleotide variant has not
            // been registered with ClinGen yet. in this case, use the PA ID

            // get amino acid allele associated with the searched hgvs
            // note, not sure if we should assume that the searched hgvs will appear here.
            const aminoAcidAlleles = result?.aminoAcidAlleles || []
            for (let i = 0; i < aminoAcidAlleles.length; i++) {
              if (searchType !== 'hgvs' || aminoAcidAlleles[i].hgvs?.includes(searchString)) {
                const transcripts = aminoAcidAlleles[i]?.matchingRegisteredTranscripts || []
                if (transcripts.length > 0) {
                  for (let j = 0; j < transcripts.length; j++) {
                    const associatedClingenAlleleId = transcripts[j]?.['@id']?.split('/')?.at(-1)
                    const associatedResponse = await axios.get(
                      `https://reg.genome.network/allele/${associatedClingenAlleleId}`
                    )
                    const newAllele = {
                      clingenAlleleUrl: associatedResponse.data?.['@id'],
                      clingenAlleleId: associatedResponse.data?.['@id']?.split('/')?.at(-1),
                      canonicalAlleleName: associatedResponse.data?.communityStandardTitle?.[0] || undefined,
                      maneStatus: maneStatus,
                      genomicAlleles: associatedResponse.data?.genomicAlleles || [],
                      grch38Hgvs: null,
                      grch37Hgvs: null,
                      transcriptAlleles: associatedResponse.data?.transcriptAlleles || [],
                      maneCoordinates: [] as Array<any>,
                      variantsStatus: 'NotLoaded',
                      variants: {
                        nucleotide: [] as Array<any>,
                        protein: [] as Array<any>,
                        associatedNucleotide: [] as Array<any>
                      }
                    }
                    for (let i = 0; i < newAllele.genomicAlleles.length; i++) {
                      // TODO currently just taking first entry from hgvs array, since that appears to be NC coordinates. check this assumption
                      if (newAllele.genomicAlleles[i].referenceGenome === 'GRCh38') {
                        newAllele.grch38Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
                      } else if (newAllele.genomicAlleles[i].referenceGenome === 'GRCh37') {
                        newAllele.grch37Hgvs = newAllele.genomicAlleles[i].hgvs?.[0]
                      }
                    }
                    for (let i = 0; i < newAllele.transcriptAlleles.length; i++) {
                      if (newAllele.transcriptAlleles[i].MANE !== undefined) {
                        // TODO may want to prioritize one of MANE select, MANE clinical, etc. For now, just grab the first mane transcript.
                        const mane = newAllele.transcriptAlleles[i].MANE
                        for (const sequenceType of ['nucleotide', 'protein']) {
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
                  }
                } else {
                  // no associated CA IDs, use PA ID as search result
                  // there is not as much info available for PA IDs
                  const newAllele = {
                    clingenAlleleUrl: result?.['@id'],
                    clingenAlleleId: result?.['@id']?.split('/')?.at(-1),
                    canonicalAlleleName: searchStr, // since we have already determined a match, just use supplied search string as a name
                    variantsStatus: 'NotLoaded',
                    variants: {
                      nucleotide: [] as Array<any>,
                      protein: [] as Array<any>,
                      associatedNucleotide: [] as Array<any>
                    },
                    // the following fields are not available for PA IDs
                    maneStatus: null,
                    genomicAlleles: [],
                    grch38Hgvs: null,
                    grch37Hgvs: null,
                    transcriptAlleles: [],
                    maneCoordinates: [] as Array<any>
                  }
                  this.alleles.push(newAllele)
                }
              }
              // only expect one amino acid allele match
              break
            }
          }
        }
        if (this.alleles.length > 0) {
          this.$refs.searchResults.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
        }
      } catch (error: any) {
        // NOTE: not resetting alleles here, because any error will have occurred before pushing to alleles.
        // don't want to reset alleles because this function may be called in a loop to process several hgvs strings.
        console.log('Error while loading search results', error)
        this.toast.add({
          severity: 'error',
          summary:
            error.response.data?.errorType && error.response.data?.description
              ? `${error.response.data?.errorType}: ${error.response.data?.description}`
              : 'Error fetching results',
          detail: error.response.data?.message || 'Invalid search.',
          life: 10000
        })
      }
    },
    searchVariants: async function () {
      for (const allele of this.alleles) {
        allele.variantsStatus = 'Loading'
        try {
          const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
            clingenAlleleIds: [allele.clingenAlleleId]
          })

          // if CA ID, exact match = nucleotide
          // else if PA ID, exact match = protein
          if (allele.clingenAlleleId.startsWith('CA')) {
            allele.variants.nucleotide = response.data[0]?.exactMatch?.variantEffectMeasurements || []
            allele.variants.protein = (response.data[0]?.equivalentAa || []).flatMap(
              (entry: any) => entry.variantEffectMeasurements || []
            )
            allele.variants.associatedNucleotide = (response.data[0]?.equivalentNt || []).flatMap(
              (entry: any) => entry.variantEffectMeasurements || []
            )
          } else if (allele.clingenAlleleId.startsWith('PA')) {
            allele.variants.protein = response.data[0]?.exactMatch?.variantEffectMeasurements || []
            // note: since we weren't able to resolve PA ID to a CA ID, we don't expect any results for nt
            allele.variants.nucleotide = (response.data[0]?.equivalentNt || []).flatMap(
              (entry: any) => entry.variantEffectMeasurements || []
            )
          }
          allele.variantsStatus = 'Loaded'
          console.log('Variants:')
          console.log(allele.variants)
        } catch (error: any) {
          allele.variants = []
          console.log('Error while loading MaveDB search results for variant', error)
          if (error.response?.status === 404) {
            allele.variantsStatus = 'Loaded'
            this.toast.add({
              severity: 'info',
              summary: 'No results found',
              detail: 'No variants match the provided search criteria.',
              life: 10000
            })
          } else if (error.response?.status >= 500) {
            allele.variantsStatus = 'Error'
            this.toast.add({
              severity: 'error',
              summary: 'Server Error',
              detail: 'The server encountered an unexpected error. Please try again later.',
              life: 10000
            })
          } else {
            allele.variantsStatus = 'Error'
            this.toast.add({
              severity: 'error',
              summary: 'Error fetching results',
              detail: 'An error occurred while fetching MaveDB variants.',
              life: 10000
            })
          }
        }
      }
    },
    fuzzySearch: async function () {
      this.searchResultsVisible = true
      // Remove HGVS search param from the URL
      const {search, searchType, ...rest} = this.route.query
      this.router.replace({
        query: {
          ...rest,
          gene: this.inputGene || undefined,
          variantType: this.inputVariantType || undefined,
          variantPosition: this.inputVariantPosition || undefined,
          refAllele: this.inputReferenceAllele || undefined,
          altAllele: this.inputAlternateAllele || undefined
        }
      })
      this.alleles = []
      this.loading = true
      await this.fetchFuzzySearchResults()
      this.loading = false
      await this.searchVariants()
    },
    fetchFuzzySearchResults: async function () {
      // TODO could make this check more elegant
      if (
        _.isEmpty(this.inputGene) ||
        _.isEmpty(this.inputVariantType) ||
        _.isEmpty(this.inputVariantPosition) ||
        _.isEmpty(this.inputReferenceAllele) ||
        _.isEmpty(this.inputAlternateAllele)
      ) {
        // unnecessary since we are clearing this.alleles above
        this.alleles = []
      } else {
        try {
          // human gene symbols should always be upper case, and ClinGen API is case-sensitive
          const geneSymbol = this.inputGene?.toUpperCase()
          // TODO validate variant position input: can't be 0, can only include *, - (if c.) and digits

          // retrieve clingen gene id
          const geneResponse = await axios.get('https://reg.genome.network/gene', {
            params: {
              'HGNC.symbol': geneSymbol
            }
          })

          //extract mane transcripts
          const maneRefSeqIds = []
          for (const maneRecord of geneResponse.data?.externalRecords?.MANE) {
            if (this.inputVariantType === 'c.') {
              maneRefSeqIds.push({
                id: maneRecord.nucleotide?.RefSeq?.id,
                maneStatus: maneRecord.maneStatus
              })
            } else if (this.inputVariantType === 'p.') {
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
          // const transcriptResponse = await axios.get('https://reg.genome.network/refseqs', {
          //   params: {
          //     gene: clingenGeneId
          //   }
          // })

          // create hgvs strings
          const hgvsStrings = []
          for (const maneRefSeqId of maneRefSeqIds) {
            if (this.inputVariantType === 'c.') {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputVariantPosition}${this.inputReferenceAllele}>${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            } else if (this.inputVariantType === 'p.') {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputReferenceAllele}${this.inputVariantPosition}${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            }
          }

          // fetch clingen allele id results for each hgvs string
          for (const hgvsString of hgvsStrings) {
            await this.fetchDefaultSearchResults(hgvsString.hgvsString, hgvsString.maneStatus)
          }
        } catch (error: any) {
          this.alleles = []
          console.log('Error while loading search results', error)
          this.toast.add({
            severity: 'error',
            summary:
              error.response.data?.errorType && error.response.data?.description
                ? `${error.response.data?.errorType}: ${error.response.data?.description}`
                : 'Error fetching results',
            detail: error.response.data?.message || 'Invalid search.',
            life: 10000
          })
        }
      }
    }
  }
})
</script>

<style scoped>
.mavedb-mavemd-logo {
  height: 150px;
  margin: 1em 0 0 0;
}

.mavedb-mavemd-intro {
  display: none;
  flex: 0 0 auto;
  text-align: left;
  font-size: 110%;
}

.mavedb-search-view {
  position: relative;
}

.mavedb-search-view-without-results {
  display: flex;
  flex-direction: column;
  height: 100%;
  display: flex;
}

.mavedb-search-view-without-results .mavedb-mavemd-intro {
  display: block;
  flex-direction: column;
  justify-content: center;
}

.mavedb-search-form {
  /* flex: 0 0 auto; */
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  padding: 10px 0;
  text-align: center;
  justify-content: center;
  gap: 3px;
}

.mavedb-search-heading {
  font-size: 120%;
  text-align: center;
}

.mavedb-search-view-without-results .mavedb-search-form {
  flex: 1 0 auto;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mavedb-search-form-view-switch {
  flex: 0 0 auto;
  padding: 10px 0;
  text-align: center;
  gap: 5px;
  justify-content: center;
}

.mavedb-examples-button-container {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.mavedb-examples-button-container .p-button {
  width: fit-content;
}

.mavedb-fuzzy-search-form-component {
  margin: 0 5px;
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

.mavedb-search-suggestions {
  display:flex;
  justify-content: center;
}

.mavedb-organism-picker:deep(.p-listbox-item) {
  font-style: italic;
}

.mavedb-organism-picker:deep(.p-listbox-item .p-badge) {
  font-style: normal;
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

.mavedb-search-example {
  background: #eee;
  padding: 0 3px;
  cursor: pointer;
}

.mavedb-clear-search-button-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 0 0 5px;
}

.mavedb-expander-container {
  position: relative;
  padding: 0 0 2em 0;
}

.mavedb-expander {
  margin: 0;
  max-height: 9lh;
  overflow-y: hidden;
}

.mavedb-expander-expanded {
  max-height: none;
}

.mavedb-expander-toggle {
  position: absolute;
  bottom: 0;
}

.mavedb-expander p {
  margin: 0 0 0.5lh 0;
}

td,
th {
  padding: 0 5px;
  vertical-align: top;
}
</style>
