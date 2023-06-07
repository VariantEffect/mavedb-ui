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
      <div class="mavedb-search-results">
        <FlexDataTable
            :data="publishedScoreSets"
            :options="tableOptions"
            :scrollX="true"
            :scrollY="true"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import $ from 'jquery'
import _ from 'lodash'
import InputText from 'primevue/inputtext'
import config from '@/config'
import FlexDataTable from '@/components/common/FlexDataTable'
import SelectList from '@/components/common/SelectList'
import DefaultLayout from '@/components/layout/DefaultLayout'
import Button from 'primevue/button'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import {debounce} from 'vue-debounce'

export default {
  name: 'SearchView',
  components: {DefaultLayout, FlexDataTable, InputText, SelectList, TabView, TabPanel, Button},

  data: function() {
    const self = this
    return {
      defaultTargetNameOptions: [
        {value: 'HSP90', badge: 12},
        {value: 'Src catalytic domain', badge: 1},
        {value: 'CXCR4', badge: 3},
        {value: 'TP53 (P72R)', badge: 3},
        {value: 'LDLR promoter', badge: 2},
        {value: 'alpha-synuclein', badge: 12},
        {value: 'MTHFR', badge: 8},
        {value: 'CYP2C19', badge: 1},
        {value: 'Ras', badge: 4},
        {value: 'HBB promoter', badge: 1},
        {value: 'RAF', badge: 9},
        {value: 'VIM-2 with p.Met1_Phe2insGly', badge: 9},
        {value: 'CALM1', badge: 2},
        {value: 'UBE2I', badge: 4},
        {value: 'MSH2', badge: 1},
        {value: 'Minigene exon - hnRNPA1 binding site', badge: 1},
        {value: 'BRCA1 RING domain', badge: 4},
        {value: 'PKLR promoter', badge: 2},
        {value: 'CYP2C9', badge: 1},
        {value: 'C. cellulolyticum cohesin fragment', badge: 1},
        {value: 'CBS', badge: 4},
        {value: 'ZFAND3 enhancer', badge: 1},
        {value: 'Minigene exon - SRSF1 (ASF/SF2) binding site', badge: 1},
        {value: 'SUL1 promoter', badge: 2},
        {value: 'S505N MPL', badge: 1},
        {value: 'NUDT15', badge: 3},
        {value: 'Minigene exon - SRSF7 (9G8) binding site', badge: 1},
        {value: 'HA (H1N1)', badge: 1},
        {value: 'Hsp82', badge: 1},
        {value: 'E4B', badge: 3},
        {value: 'Minigene exon - CG-containing enhancer', badge: 1},
        {value: 'RET enhancer', badge: 1},
        {value: 'Fis1 tail anchor', badge: 5},
        {value: 'CcdB', badge: 1},
        {value: 'NP, H3N2 Aichi/1968', badge: 2},
        {value: 'Gal4', badge: 6},
        {value: 'SORT1 enhancer', badge: 2},
        {value: 'VKOR', badge: 2},
        {value: 'TEM-1 β-lactamase', badge: 9},
        {value: 'TPMT', badge: 1},
        {value: 'avGFP', badge: 2},
        {value: 'MPL', badge: 1},
        {value: 'BRCA1 translation start through RING domain', badge: 1},
        {value: 'C. thermocellum cohesin fragment', badge: 1},
        {value: 'CD86', badge: 3},
        {value: 'BRCA1', badge: 1},
        {value: 'TECR', badge: 1},
        {value: 'TARDBP', badge: 2},
        {value: 'Aβ42', badge: 1},
        {value: 'Minigene exon - hnRNP L binding site', badge: 1},
        {value: 'LDLRAP1', badge: 2},
        {value: 'Bovine S-arrestin', badge: 1},
        {value: 'Dlg4 (PSD95_PDZ3)', badge: 2},
        {value: 'ACE2', badge: 2},
        {value: 'hYAP65 WW domain', badge: 2},
        {value: 'HMGCR', badge: 3},
        {value: 'TERT promoter', badge: 4},
        {value: 'ALDOB enhancer', badge: 1},
        {value: 'Glycophorin A', badge: 1},
        {value: 'DHFR', badge: 2},
        {value: 'ZRS enhancer', badge: 2},
        {value: 'NP', badge: 1},
        {value: 'CCR5', badge: 3},
        {value: 'Src SH4 domain', badge: 1},
        {value: 'PSD95 PDZ3', badge: 2},
        {value: 'LamB', badge: 2},
        {value: 'PTEN', badge: 2},
        {value: 'IRF6 enhancer', badge: 1},
        {value: 'EGFP', badge: 1},
        {value: 'human L-Selectin', badge: 1},
        {value: 'GDI1', badge: 1},
        {value: 'IRF4 enhancer', badge: 1},
        {value: 'NP, H1N1 PR/1934', badge: 1},
        {value: 'p53', badge: 1},
        {value: 'Minigene exon - AC-rich enhancer', badge: 1},
        {value: 'SpCas9 (Human Codon Optimized)', badge: 2},
        {value: 'PAB1', badge: 1},
        {value: 'F9 promoter', badge: 1},
        {value: 'MYC enhancer (rs6983267)', badge: 1},
        {value: 'Gcn4', badge: 2},
        {value: 'NCS1', badge: 1},
        {value: 'MYC enhancer (rs11986220)', badge: 1},
        {value: 'Minigene exon - pyrimidine sequence', badge: 1},
        {value: 'Minigene exon - hnRNP D binding site', badge: 1},
        {value: 'HBG1 promoter', badge: 1},
        {value: 'Ubiquitin', badge: 4},
        {value: 'BCL11A enhancer', badge: 1},
        {value: 'Zika E protein MR766', badge: 1},
        {value: 'SUMO1', badge: 2},
        {value: 'LTV1 enhancer', badge: 2},
        {value: 'TPK1', badge: 2},
        {value: 'TEM-15 β-lactamase', badge: 2},
        {value: 'SARS-CoV-2 receptor binding domain', badge: 4},
        {value: 'TEM-19 β-lactamase', badge: 1},
        {value: 'GP1BB promoter', badge: 1},
        {value: 'Minigene exon - hnRNP I (PTB) binding site', badge: 1},
        {value: 'UC88 enhancer', badge: 1},
        {value: 'HNF4A promoter', badge: 1},
        {value: 'ECR11 enhancer', badge: 1},
        {value: 'TEM-17 β-lactamase', badge: 1},
        {value: 'BRAF', badge: 1},
        {value: 'FOXE1 promoter', badge: 1},
        {value: 'ErbB2', badge: 1},
        {value: 'SORT1 enhancer (flipped)', badge: 1},
        {value: 'TCF7L2 enhancer', badge: 1},
        {value: 'PyKS', badge: 1},
        {value: 'Minigene exon - Wilms’ tumor gene', badge: 1},
        {value: 'MSMB promoter', badge: 1},
        {value: 'IGHG1', badge: 1}
      ],
      defaultTargetTypeOptions: [
        {value: 'Other noncoding', badge: 10},
        {value: 'Protein coding', badge: 185},
        {value: 'Regulatory', badge: 35}
      ],
      defaultTargetOrganismOptions: [
        {value: 'Homo sapiens', badge: 143},
        {value: 'Mus musculus', badge: 5},
        {value: 'Other - genome not listed', badge: 49},
        {value: 'Saccharomyces cerevisiae', badge: 33}
      ],
      defaultPublicationAuthorOptions: [ // so many of these, just show A last names as placeholders
        {value: 'Abbasi, Shawn A', badge: 1},
        {value: 'Adamovich, Aleksandra I', badge: 2},
        {value: 'Adkar, Bharat V', badge: 1},
        {value: 'Aguirre, Andrew J', badge: 3},
        {value: 'Ahituv, Nadav', badge: 33},
        {value: 'Ahler, Ethan', badge: 4},
        {value: 'Ahmad, Tariq', badge: 3},
        {value: 'Akdoğan, Emel', badge: 5},
        {value: 'Aleksandrov, Radoslav', badge: 2},
        {value: 'Aloy, Patrick', badge: 9},
        {value: 'Amorosi, Clara J', badge: 2},
        {value: 'Andreev, Aleksandr', badge: 4},
        {value: 'Andrews, Bryan', badge: 2},
        {value: 'Andrie, Jennifer M', badge: 4},
        {value: 'Anquetil, Vincent', badge: 10},
        {value: 'Aramini, James', badge: 4},
        {value: 'Araya, Carlos L', badge: 4},
        {value: 'Arias, Mauricio A', badge: 10},
        {value: 'Ashenberg, Orr', badge: 4},
        {value: 'Ashmead, Julee', badge: 1},
        {value: 'Ashworth, Alan', badge: 2},
        {value: 'Aziz, Nazneen', badge: 1}
      ],
      defaultPublicationDatabaseOptions: [
        {value: 'PubMed', badge: 403},
        {value: 'bioRxiv', badge: 3},
        {value: 'medRxiv', badge: 2}
      ],
      defaultPublicationJournalOptions: [
      {value: 'ACS Chem Biol', badge: 18},
      {value: 'Am J Hum Genet', badge: 22},
      {value: 'Cancer Cell', badge: 2},
      {value: 'Cell', badge: 14},
      {value: 'Cell Rep', badge: 10},
      {value: 'Cell Syst', badge: 4},
      {value: 'Circ Genom Precis Med', badge: 2},
      {value: 'Clin Transl Sci', badge: 4},
      {value: 'Curr Biol', badge: 2},
      {value: 'Elife', badge: 50},
      {value: 'Evolution', badge: 8},
      {value: 'G3 (Bethesda)', badge: 2},
      {value: 'Genetics', badge: 14},
      {value: 'Genome Biol', badge: 14},
      {value: 'Genome Med', badge: 4},
      {value: 'Genome Res', badge: 20},
      {value: 'Hum Mutat', badge: 2},
      {value: 'J Immunol', badge: 4},
      {value: 'J Inherit Metab Dis', badge: 2},
      {value: 'J Mol Biol', badge: 6},
      {value: 'Microb Genom', badge: 4},
      {value: 'Mol Biol Evol', badge: 14},
      {value: 'Mol Cell', badge: 6},
      {value: 'Mol Syst Biol', badge: 18},
      {value: 'Nat Biotechnol', badge: 8},
      {value: 'Nat Chem Biol', badge: 4},
      {value: 'Nat Commun', badge: 64},
      {value: 'Nat Genet', badge: 10},
      {value: 'Nat Methods', badge: 12},
      {value: 'Nature', badge: 78},
      {value: 'Nucleic Acids Res', badge: 8},
      {value: 'PLoS Genet', badge: 14},
      {value: 'Pigment Cell Melanoma Res', badge: 2},
      {value: 'Proc Natl Acad Sci U S A', badge: 6},
      {value: 'Sci Rep', badge: 4},
      {value: 'Science', badge: 2},
      {value: 'Structure', badge: 2}
      ],
      filterTargetNames: this.$route.query['target-names'] ? this.$route.query['target-names'].split(',') : [],
      filterTargetTypes: this.$route.query['target-types'] ? this.$route.query['target-types'].split(',') : [],
      filterTargetOrganismNames: this.$route.query['target-organism-names'] ? this.$route.query['target-organism-names'].split(',') : [],
      filterPublicationAuthors: this.$route.query['publication-authors'] ? this.$route.query['publication-authors'] : [],
      filterPublicationDatabases: this.$route.query['publication-databases'] ? this.$route.query['publication-databases'].split(',') : [],
      filterPublicationJournals: this.$route.query['publication-journals'] ? this.$route.query['publication-journals'].split(',') : [],
      searchText: this.$route.query.search,
      scoreSets: [],
      publishedScoreSets: [],
      tableOptions: {
        columns: [
          {
            data: 'urn',
            title: 'URN',
            width: '17.5%',
            render: function (data) { // }, type, row) {
              var urn = data
              var urnDisplay = urn  // row['urnDisplay']
              const url = self.$router.resolve({path: `/score-sets/${urn}`}).href
              return ('<a href="' + url + '">' + urnDisplay + '</a>')  // TODO Escape the text.
            },
          },
          {data: 'shortDescription', title: 'Description', width: '40%'},
          {data: (x) => _.get(x, 'targetGene.name', null), title: 'Target'},
          {data: (x) => _.get(x, 'targetGene.category', null), title: 'Target type'},
          {data: (x) => _.get(
            _.get(x, 'targetGene.referenceMaps.0', null),
                // .find((rm) => rm.isPrimary),
            'genome.organismName'
          ), title: 'Target organism'},
        ],
        language: {
          emptyTable: 'Type in the search box above or use the filters to find a data set.'
        },
        rowGroup: {
          dataSrc: 'experiment.urn',
          startRender: function(rows, group) {
            const experimentUrn = group
            const experimentUrnDisplay = experimentUrn // rows.data()[0]['parentUrnDisplay']
            const experimentDescription = _.get(rows.data()[0], 'shortDescription', null)
            const url = self.$router.resolve({path: `/experiments/${experimentUrn}`}).href

            const link = ('<a href="' + url + '">' + experimentUrnDisplay + '</a>');

            return $('<tr/>').append(
              '<td colSpan="1">' + link + '</td>').append('<td colSpan="4">' + experimentDescription + '</td>'
            )
          },
        },
        searching: false
      }
    }
  },
  computed: {
    debouncedSearchFunction: function() {
      return debounce(() => this.search(), '400ms')
    },
    targetNameFilterOptions: function() {
      if (this.scoreSets.length > 0) {
        const values = this.scoreSets.map((s) => _.get(s, 'targetGene.name'))
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultTargetNameOptions
      }
    },
    targetOrganismFilterOptions: function() {
      if (this.scoreSets.length > 0) {
        const values = this.scoreSets.map((s) => _.get(s, 'targetGene.referenceMaps.0.genome.organismName'))
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultTargetOrganismOptions
      }
    },
    targetTypeFilterOptions: function() {
      if (this.scoreSets.length > 0) {
        const values = this.scoreSets.map((s) => _.get(s, 'targetGene.category'))
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultTargetTypeOptions
      }
    },
    publicationAuthorFilterOptions: function() {
      if (this.scoresets.length > 0) {
        // map each scoresets associated identifiers,
        // then map each publications authors' names,
        // then concatenate these names together, flatten them,
        // and flatten the list of lists of author names (:O)
        const values = this.scoresets.map(
          (s) => _.concat(
            _.get(s, 'primaryPublicationIdentifiers').map(
              (p) => _.get(p, 'authors').map(
                (a) => _.get(a, 'name'))),
            _.get(s, 'secondaryPublicationIdentifiers').map(
              (p) => _.get(p, 'authors').map(
                (a) => _.get(a, 'name')))
          ).flat()
        ).flat()
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultPublicationAuthorOptions
      }
    },
    publicationDatabaseFilterOptions: function() {
      if (this.scoresets.length > 0) {
        const values = this.scoresets.map(
          (s) => _.uniq(
            _.concat(
              _.get(s, 'primaryPublicationIdentifiers').map(
                (p) => _.get(p, 'dbName')),
              _.get(s, 'secondaryPublicationIdentifiers').map(
                (p) => _.get(p, 'dbName'))
            ).flat()
          )
        ).flat()
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultPublicationDatabaseOptions
      }
    },
    publicationJournalFilterOptions: function() {
      if (this.scoresets.length > 0) {
        const values = this.scoresets.map(
          (s) => _.uniq(
            _.concat(
              _.get(s, 'primaryPublicationIdentifiers').map(
                (p) => _.get(p, 'publicationJournal')),
              _.get(s, 'secondaryPublicationIdentifiers').map(
                (p) => _.get(p, 'publicationJournal'))
            ).flat()
          )
        ).flat()
        const valueFrequencies = _.countBy(values)
        return _.sortBy(_.keys(valueFrequencies)).map((value) => ({value, badge: valueFrequencies[value]}))
      } else {
        return this.defaultPublicationJournalOptions
      }
    }
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
          this.filterTargetNames = newValue ? newValue.split(',') : null
        }
      },
      immediate: true
    },
    '$route.query.target-types': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetTypes = newValue ? newValue.split(',') : null
        }
      },
      immediate: true
    },
    '$route.query.target-organism-names': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterTargetOrganismNames = newValue ? newValue.split(',') : null
        }
      },
      immediate: true
    },
    '$route.query.publication-authors': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationAuthors = newValue ? newValue : null
        }
      },
      immediate: true
    },
    '$route.query.publication-databases': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationDatabases = newValue ? newValue.split(',') : null
        }
      },
      immediate: true
    },
    '$route.query.publication-journals': {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.filterPublicationJournals = newValue ? newValue.split(',') : null
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
        ...(this.filterTargetOrganismNames.length > 0) ? {'target-namorganism-nameses': this.filterTargetOrganismNames.join(',')} : {},
        ...(this.filterPublicationAuthors.length > 0) ? {'publication-authors': this.filterPublicationAuthors} : {},
        ...(this.filterPublicationDatabases.length > 0) ? {'publication-databases': this.filterPublicationDatabases.join(',')} : {},
        ...(this.filterPublicationJournals.length > 0) ? {'publication-journals': this.filterPublicationJournals.join(',')} : {}
      }})
      await this.fetchSearchResults()
      /*URL
      if (this.searchText && this.searchText.length > 0) {
        await this.fetchSearchResults()
      } else {
        this.scoreSets = []
      }
      */
    },
    fetchSearchResults: async function() {
      try {
        let response = await axios.post(
          `${config.apiBaseUrl}/score-sets/search`,
          {
            text: this.searchText || null,
            targets: this.filterTargetNames.length > 0 ? this.filterTargetNames : null,
            targetOrganismNames: this.filterTargetOrganismNames.length > 0 ? this.filterTargetOrganismNames : null,
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
        this.publishedScoreSets = []
        // Separate the response.data into published score set and unpublished score set.
        for (let i=0, len = this.scoreSets.length; i<len; i++){
          if (this.scoreSets[i].publishedDate != null){
          //if (this.scoreSets[i].private)
            this.publishedScoreSets.push(this.scoreSets[i])
          }
        }
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },
    clear: function() {
      this.searchText = null
      this.filterTargetNames = []
      this.filterTargetTypes = []
      this.filterTargetOrganismNames = []
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
  justify-content: space-around;
  max-width: 1000px;
  margin: 10px auto;
}

.mavedb-search-filter-option-picker {
  max-width: 300px;
  width: 30%;
}

.mavedb-organism-picker::v-deep .p-listbox-item {
  font-style: italic;
}

.mavedb-organism-picker::v-deep .p-listbox-item .p-badge {
  font-style: normal;
}

.mavedb-search-results {
  flex: 1 1 400px;
  position: relative;
}

/* Table */

/* Override control bar padding applied in FlexDataTable. */
.mavedb-search-results::v-deep .samplify-data-table .dataTables_wrapper {
  padding-top: 0;
}

/* Override background applied in FlexDataTable. */
.mavedb-search-results::v-deep .samplify-data-table .dataTables_wrapper {
  background-color: #fff;
}

.mavedb-search-results::v-deep .samplify-data-table thead th {
  background-color: #dadff1;
}

.mavedb-search-results::v-deep .samplify-data-table td,
.mavedb-search-results::v-deep .samplify-data-table th {
  padding: 0.75rem;
  border: 1px solid #fff;
  font-size: 14px;
}

.mavedb-search-results::v-deep .samplify-data-table td:first-child {
  padding-left: 2em;
}

.mavedb-search-results::v-deep .samplify-data-table td:last-child {
  font-style: italic;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row {
  background-color: #eeeeee;
  font-weight: bold;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row td:first-child {
  padding-left: 0.75rem;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row td:last-child {
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
