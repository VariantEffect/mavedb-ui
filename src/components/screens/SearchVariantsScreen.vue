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
      <div class="mavedb-page-title">
        <img alt="MaveMD" class="mavedb-mavemd-logo" src="@/assets/mavemd-logo.png" />
      </div>
      <div class="mavedb-mavemd-intro">
        MaveMD (MAVEs for MeDicine) is an interface that integrates ClinVar and the ClinGen Allele Registry, displays
        clinical evidence calibrations, provides intuitive visualizations, and exports structured evidence compatible
        with ACMG/AMP variant classification guidelines. MaveMD currently contains 438,318 variant effect measurements
        mapped to the human genome from 74 MAVE datasets spanning 32 disease-associated genes.
      </div>
      <div v-if="hgvsSearchVisible" class="mavedb-search-form">
        <div class="mavedb-search-heading">Search MaveDB for human gene variants</div>
        <div class="flex flex-wrap justify-content-center gap-3">
          <IconField icon-position="left">
            <InputIcon class="pi pi-search"></InputIcon>
            <InputText
              ref="searchTextInput"
              v-model="searchText"
              class="p-inputtext-lg"
              placeholder="HGVS string"
              style="width: 500px"
              type="search"
              @keyup.enter="hgvsSearch"
            />
          </IconField>
          <Button class="p-button-plain" @click="hgvsSearch">Search</Button>
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
          Don't have a versioned reference sequence identifier? Click here to perform a fuzzy search instead:
          <Button class="p-button-plain" @click="showSearch('fuzzy')">Fuzzy Search</Button>
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
          <Dropdown
            v-model="inputVariantType"
            class="mavedb-fuzzy-search-form-component"
            :options="['c.', 'p.']"
            placeholder="Variant type"
          />
          <!-- TODO consider adding language to specify to include - or * in position if variant is in 5' or 3' UTR, respectively -->
          <InputText v-model="inputVariantPosition" class="mavedb-fuzzy-search-form-component" placeholder="Position" />
          <Dropdown
            v-model="inputReferenceAllele"
            class="mavedb-fuzzy-search-form-component"
            :options="selectedAlleleOptions"
            placeholder="Reference allele"
          />
          <Dropdown
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
          Click here to return to HGVS search:
          <Button class="p-button-plain" @click="showSearch('hgvs')">HGVS Search</Button>
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
          <p>
            Try searching for variants using HGVS strings like
            <span v-tooltip.top="'Click to search'" class="mavedb-search-example" @click="searchForText"
              >ENST00000473961.6:c.-19-2A>T</span
            >
            and
            <span v-tooltip.top="'Click to search'" class="mavedb-search-example" @click="searchForText"
              >NP_000242.1:p.Asn566Thr</span
            >. MaveDB supports a variety of HGVS formats for searching. Or browse these curated data sets:
          </p>
          <table>
            <tr>
              <th>Gene</th>
              <th>Score set</th>
              <th>Publication</th>
            </tr>
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
              </tr>
              <tr v-for="urn in urns.slice(1)" :key="urn">
                <td>
                  <router-link :to="{name: 'scoreSet', params: {urn}}">{{
                    maveMdScoreSets[urn]?.title || urn
                  }}</router-link>
                </td>
                <td>
                  <router-link v-if="maveMdScoreSets[urn]" :to="{name: 'scoreSet', params: {urn}}">{{
                    getScoreSetShortName(maveMdScoreSets[urn]!)
                  }}</router-link>
                </td>
              </tr>
            </template>
          </table>
        </div>
      </div>
      <div v-if="searchResultsVisible">
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
import Dropdown from 'primevue/dropdown'
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
import {MAVE_MD_SCORE_SETS} from '@/lib/mavemd'
import {components} from '@/schema/openapi'
import {getScoreSetShortName} from '@/lib/score-sets'
import {clinVarHgvsSearchStringRegex} from '@/lib/mave-hgvs'

const SCORE_SETS_TO_SHOW = 5

type ScoreSet = components['schemas']['ScoreSet']

export default defineComponent({
  name: 'SearchVariantsScreen',

  components: {
    Card,
    Column,
    DataTable,
    DefaultLayout,
    Dropdown,
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
      hgvsSearchVisible: true,
      fuzzySearchVisible: false,
      searchResultsVisible: false,
      searchText: null as string | null,
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
    // If HGVS search param is present, run HGVS search
    if (this.route.query.search && String(this.route.query.search).trim() !== '') {
      this.hgvsSearchVisible = true
      this.fuzzySearchVisible = false
      this.hgvsSearch()
    } else if (
      this.route.query.gene ||
      this.route.query.variantType ||
      this.route.query.variantPosition ||
      this.route.query.refAllele ||
      this.route.query.altAllele
    ) {
      // If any fuzzy search param is present, run fuzzy search
      this.hgvsSearchVisible = false
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
    searchForText: function (event: PointerEvent) {
      const element = event.target
      if (element) {
        this.showSearch('hgvs')
        this.searchText = element.innerText
        this.hgvsSearch()
      }
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
    showSearch(searchType: 'fuzzy' | 'hgvs' = 'hgvs') {
      this.hgvsSearchVisible = searchType == 'hgvs'
      this.fuzzySearchVisible = searchType == 'fuzzy'
    },
    hgvsSearch: async function () {
      this.searchResultsVisible = true
      // Remove fuzzy search params from the URL
      const {gene, variantType, variantPosition, refAllele, altAllele, ...rest} = this.route.query
      this.router.replace({
        query: {...rest, search: this.searchText || undefined}
      })
      this.alleles = []
      this.loading = true
      if (this.searchText !== null && this.searchText !== '') {
        await this.fetchHgvsSearchResults(this.searchText)
      }
      this.loading = false
      await this.searchVariants()
    },
    fetchHgvsSearchResults: async function (hgvsSearch: string, maneStatus: string | null = null) {
      // Strip gene symbol and/or protein consequence from ClinVar-style variant names to obtain valid HGVS. If the
      // search string doesn't match the pattern, leave it as is and let the rest of the search code handle any format
      // problem.
      const match = clinVarHgvsSearchStringRegex.exec(hgvsSearch.trim())
      const hgvsStr = match ? `${match.groups!.identifier}:${match.groups!.description}` : hgvsSearch.trim()

      try {
        const response = await axios.get('https://reg.test.genome.network/allele', {
          params: {
            hgvs: hgvsStr
          }
        })
        const clingenAlleleId = response.data?.['@id']?.split('/')?.at(-1)
        if (clingenAlleleId && clingenAlleleId.startsWith('CA')) {
          const newAllele = {
            clingenAlleleUrl: response.data?.['@id'],
            clingenAlleleId: clingenAlleleId,
            canonicalAlleleName: response.data?.communityStandardTitle?.[0] || undefined,
            maneStatus: maneStatus,
            genomicAlleles: response.data?.genomicAlleles || [],
            grch38Hgvs: null,
            grch37Hgvs: null,
            transcriptAlleles: response.data?.transcriptAlleles || [],
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
          const aminoAcidAlleles = response.data?.aminoAcidAlleles || []
          for (let i = 0; i < aminoAcidAlleles.length; i++) {
            if (aminoAcidAlleles[i].hgvs?.includes(hgvsSearch)) {
              const transcripts = aminoAcidAlleles[i]?.matchingRegisteredTranscripts || []
              if (transcripts.length > 0) {
                for (let j = 0; j < transcripts.length; j++) {
                  const associatedClingenAlleleId = transcripts[j]?.['@id']?.split('/')?.at(-1)
                  const associatedResponse = await axios.get(
                    `https://reg.test.genome.network/allele/${associatedClingenAlleleId}`
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
                  clingenAlleleUrl: response.data?.['@id'],
                  clingenAlleleId: response.data?.['@id']?.split('/')?.at(-1),
                  canonicalAlleleName: hgvsStr, // since we have already determined a match, just use supplied hgvs string as a name
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
          detail: error.response.data?.message || 'Invalid HGVS string provided.',
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
      const {search, ...rest} = this.route.query
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
          const geneResponse = await axios.get('https://reg.test.genome.network/gene', {
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
          // const transcriptResponse = await axios.get('https://reg.test.genome.network/refseqs', {
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
            await this.fetchHgvsSearchResults(hgvsString.hgvsString, hgvsString.maneStatus)
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
            detail: error.response.data?.message || 'Invalid HGVS string provided.',
            life: 10000
          })
        }
      }
    }
  }
})
</script>

<style scoped>
.mavedb-page-title {
  text-align: center;
}

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

.mavedb-search-view-without-results .mavedb-page-title {
  flex: 0 0 auto;
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
