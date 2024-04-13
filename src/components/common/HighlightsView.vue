<template>
  <div v-if="$props.model == 'Target'">
    <Card>
      <template #title>Target Gene Highlights</template>
      <template #content>
        <TabView @update:active-index="(idx) => { this.field = targetLeaderboardFields[idx] }"
          v-model:activeIndex="activeTabIndex">
          <TabPanel v-for="tab in targetLeaderboardFields" :key="tab"
            :header="tab.charAt(0).toUpperCase() + tab.slice(1)">
            <div v-if="loading" class="highlights-spinner-container" ref="spinner">
              <ProgressSpinner class="highlights-progress" />
            </div>
            <div v-else>
              <DataTable :value="leaderboardData" sortField="count" :sortOrder="-1" paginator :rows="5"
                :rowsPerPageOptions="[5, 10, 20]" size="small">
                <Column v-for="col of targetLeaderboardColumns[this.field]" :field="col.field" :header="col.header"
                  :sortable="col.field == 'count'" :key="col.field">
                  <!-- Link any identifier columns or `column` (in this compoenent representative of some db key) to a MaveDB search page -->
                  <template v-if="this.field == 'accession' && col.field == 'column'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?target-accession=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <template v-else-if="this.field == 'gene' && col.field == 'column'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?search=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <template v-else-if="this.field == 'organism' && col.field == 'column'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?target-organism-name=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <template v-else-if="col.field == 'identifier'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?search=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <!-- Handle url columns separately, so that we can fill in any missing DB data -->
                  <template v-else-if="this.field == 'uniprot-identifier' && col.field == 'url'" #body="slotProps">
                    <a :href="slotProps.data[col.field] ? `${slotProps.data[col.field]}` : `http://purl.uniprot.org/uniprot/${slotProps.data.identifier}`"
                      target="_blank">{{
                      slotProps.data.url ? slotProps.data.url :
                      `http://purl.uniprot.org/uniprot/${slotProps.data.identifier}` }}</a>
                  </template>
                  <template v-else-if="this.field == 'refseq-identifier' && col.field == 'url'" #body="slotProps">
                    <a :href="slotProps.data[col.field] ? `${slotProps.data[col.field]}` : `http://www.ncbi.nlm.nih.gov/entrez/viewer.fcgi?val=${slotProps.data.identifier}`"
                      target="_blank">{{
                      slotProps.data.url ? slotProps.data.url :
                      `http://www.ncbi.nlm.nih.gov/entrez/viewer.fcgi?val=${slotProps.data.identifier}` }}</a>
                  </template>
                  <template v-else-if="this.field == 'ensembl-identifier' && col.field == 'url'" #body="slotProps">
                    <a :href="slotProps.data[col.field] ? `${slotProps.data[col.field]}` : `http://www.ensembl.org/id/${slotProps.data.identifier}`"
                      target="_blank">{{
                      slotProps.data.url ? slotProps.data.url : `http://www.ensembl.org/id/${slotProps.data.identifier}`
                      }}</a>
                  </template>
                  <!-- Handle generic url columns  -->
                  <template v-else-if="col.field == 'url'" #body="slotProps">
                    <a :href="`${slotProps.data.url}`" target="_blank">{{
                      slotProps.data.url }}</a>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
        </TabView>
        <div class="chart-container">
          <div v-if="showAssemblyChart" class="chart">
            <Chart type="pie" :data="assemblyChartData" :options="assemblyChartOptions"></Chart>
          </div>
          <div v-if="showCategoryChart" class="chart">
            <Chart type="pie" :data="categoryChartData" :options="categoryChartOptions"></Chart>
          </div>
          <div v-if="showOrganismChart" class="chart">
            <Chart type="pie" :data="organismChartData" :options="organismChartOptions"></Chart>
          </div>
        </div>
      </template>
    </Card>
  </div>
  <div v-else-if="$props.model == 'ScoreSet'">
    <Card>
      <template #title>Score Set Highlights</template>
      <template #content>
        <TabView @tab-change="(event) => { this.field = scoreSetLeaderboardFields[event.index] }"
          v-model:activeIndex="activeTabIndex">
          <TabPanel v-for="tab in scoreSetLeaderboardFields" :key="tab"
            :header="tab.charAt(0).toUpperCase() + tab.slice(1)">
            <div v-if="loading" class="highlights-spinner-container" ref="spinner">
              <ProgressSpinner class="highlights-progress" />
            </div>
            <div v-else>
              <DataTable :value="leaderboardData" sortField="count" :sortOrder="-1" paginator :rows="5"
                :rowsPerPageOptions="[5, 10, 20]" size="small">
                <Column v-for="col of scoreSetLeaderboardColumns[this.field]" :field="col.field" :header="col.header"
                  :sortable="col.field == 'count'" :key="col.field">
                  <!-- Link publication identifiers to their MaveDB page -->
                  <template v-if="this.field == 'publication-identifiers' && col.field == 'identifier'" #body="slotProps">
                    <a
                      :href="`${config.appBaseUrl}/#/publication-identifiers/${slotProps.data.dbName}/${slotProps.data[col.field]}`">{{
                        slotProps.data[col.field] }}</a>
                  </template>
                  <!-- Link keywords and Doi Identifiers to an internal MaveDB search page -->
                  <template v-else-if="this.field == 'keywords' && col.field == 'column'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?search=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <template v-else-if="this.field == 'doi-identifiers' && col.field == 'identifier'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?search=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <!-- Link out any remaining URLs to the appropriate location -->
                  <template v-else-if="col.field == 'url'" #body="slotProps">
                    <a :href="`${slotProps.data.url}`" target="_blank">{{
                      slotProps.data.url }}</a>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
        </TabView>
      </template>
    </Card>
  </div>
  <div v-else-if="$props.model == 'Experiment'">
    <Card>
      <template #title>Experiment Highlights</template>
      <template #content>
        <TabView @tab-change="(event) => { this.field = experimentLeaderboardFields[event.index] }"
          v-model:activeIndex="activeTabIndex">
          <TabPanel v-for="tab in experimentLeaderboardFields" :key="tab"
            :header="tab.charAt(0).toUpperCase() + tab.slice(1)">
            <div v-if="loading" class="highlights-spinner-container" ref="spinner">
              <ProgressSpinner class="highlights-progress" />
            </div>
            <div v-else>
              <DataTable :value="leaderboardData" sortField="count" :sortOrder="-1" paginator :rows="5"
                :rowsPerPageOptions="[5, 10, 20]" size="small">
                <Column v-for="col of experimentLeaderboardColumns[this.field]" :field="col.field" :header="col.header"
                  :sortable="col.field == 'count'" :key="col.field">
                  <!-- Link publication identifiers to their MaveDB page -->
                  <template v-if="this.field == 'publication-identifiers' && col.field == 'identifier'" #body="slotProps">
                    <a
                      :href="`${config.appBaseUrl}/#/publication-identifiers/${slotProps.data.dbName}/${slotProps.data[col.field]}`">{{
                        slotProps.data[col.field] }}</a>
                  </template>
                  <!-- Link keywords to an internal MaveDB search page -->
                  <template v-else-if="this.field == 'keywords' && col.field == 'column'" #body="slotProps">
                    <a :href="`${config.appBaseUrl}/#/search?search=${slotProps.data[col.field]}`">{{
                      slotProps.data[col.field] }}</a>
                  </template>
                  <!-- Link out any URLs to the appropriate location -->
                  <template v-else-if="col.field == 'url'" #body="slotProps">
                    <a :href="`${slotProps.data.url}`" target="_blank">{{
                      slotProps.data.url }}</a>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
        </TabView>
      </template>
    </Card>
  </div>
</template>

<script>
import axios from 'axios'
import config from '@/config'
import { defineComponent, ref } from 'vue';
import useItem from '@/composition/item'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import ProgressSpinner from 'primevue/progressspinner';
import Chart from 'primevue/chart'

export default defineComponent({
  name: 'HighlightsView',
  components: { Card, Chart, Column, DataTable, TabView, TabPanel, ProgressSpinner },

  setup: (props) => {
    const targetAccessionAssemblyStatistic = useItem({ itemTypeName: "target-accession-statistics" })
    targetAccessionAssemblyStatistic.setItemId("assembly")
    const targetGeneCategoryStatistic = useItem({ itemTypeName: "target-gene-statistics" })
    targetGeneCategoryStatistic.setItemId("category")
    const targetGeneOrganismStatistic = useItem({ itemTypeName: "target-gene-statistics" })
    targetGeneOrganismStatistic.setItemId("organism")

    const statisticFields = {
      "Target": {
        "accession": { "model": "target", "name": "accession", "field": "accession" },
        "assembly": { "model": "target", "name": "accession", "field": "assembly" },
        "gene": { "model": "target", "name": "accession", "field": "gene" },

        "sequence": { "model": "target", "name": "sequence", "field": "sequence" },
        "sequence-type": { "model": "target", "name": "sequence", "field": "sequence-type" },

        "category": { "model": "target", "name": "gene", "field": "category" },
        "organism": { "model": "target", "name": "gene", "field": "organism" },
        "uniprot-identifier": { "model": "target", "name": "gene", "field": "uniprot-identifier" },
        "refseq-identifier": { "model": "target", "name": "gene", "field": "refseq-identifier" },
        "ensembl-identifier": { "model": "target", "name": "gene", "field": "ensembl-identifier" },
      },

      "ScoreSet": {
        "keywords": { "model": "record", "name": "score-set", "field": "keywords" },
        "publication-identifiers": { "model": "record", "name": "score-set", "field": "publication-identifiers" },
        "doi-identifiers": { "model": "record", "name": "score-set", "field": "doi-identifiers" },
      },

      "Experiment": {
        "keywords": { "model": "record", "name": "experiment", "field": "keywords" },
        "raw-read-identifiers": { "model": "record", "name": "experiment", "field": "raw-read-identifiers" },
        "publication-identifiers": { "model": "record", "name": "experiment", "field": "publication-identifiers" },
        "doi-identifiers": { "model": "record", "name": "experiment", "field": "doi-identifiers" },
      }
    }

    const targetLeaderboardFields = ['accession', 'gene', 'organism', 'uniprot-identifier', 'refseq-identifier', 'ensembl-identifier']
    const scoreSetLeaderboardFields = ['keywords', 'publication-identifiers', 'doi-identifiers']
    const experimentLeaderboardFields = ['keywords', 'raw-read-identifiers', 'publication-identifiers', 'doi-identifiers']
    const activeTabIndex = ref(0)

    const setDefaultField = function () {
      if (props.model == "Target") {
        activeTabIndex.value = 0
        return targetLeaderboardFields[activeTabIndex.value]
      } else if (props.model == "ScoreSet") {
        activeTabIndex.value = 0
        return scoreSetLeaderboardFields[activeTabIndex.value]
      } else if (props.model == "Experiment") {
        activeTabIndex.value = 0
        return experimentLeaderboardFields[activeTabIndex.value]
      } else {
        return null
      }
    }

    const field = ref(setDefaultField())
    const loading = ref(true)

    return {
      config: config,

      statisticFields: statisticFields,

      targetLeaderboardFields: targetLeaderboardFields,
      scoreSetLeaderboardFields: scoreSetLeaderboardFields,
      experimentLeaderboardFields: experimentLeaderboardFields,

      targetLeaderboardColumns: {
        "accession": [{ field: "column", header: "Accession" }, { field: "count", "header": "Associated Score Sets" }],
        "gene": [{ field: "column", header: "Gene Name" }, { field: "count", "header": "Associated Score Sets" }],
        "organism": [{ field: "column", header: "Organism Name" }, { field: "count", "header": "Associated Score Sets" }],
        "uniprot-identifier": [{ field: "identifier", header: "Uniprot Id" }, { field: "count", "header": "Associated Score Sets" }, { field: "url", header: "URL" }],
        "refseq-identifier": [{ field: "identifier", header: "RefSeq Id" }, { field: "count", "header": "Associated Score Sets" }, { field: "url", header: "URL" }],
        "ensembl-identifier": [{ field: "identifier", header: "Ensembl Id" }, { field: "count", "header": "Associated Score Sets" }, { field: "url", header: "URL" }]
      },
      scoreSetLeaderboardColumns: {
        "keywords": [{ field: "column", "header": "Keyword" }, { field: "count", header: "Associated Score Sets" }],
        "publication-identifiers": [{ field: "identifier", "header": "Identifier" }, { field: "count", header: "Associated Score Sets" }, { field: "title", header: "Title" }, { field: "url", header: "URL" }],
        "doi-identifiers": [{ field: "identifier", "header": "Identifier" }, { field: "count", header: "Associated Score Sets" }, { field: "url", header: "URL" }]
      },
      experimentLeaderboardColumns: {
        "keywords": [{ field: "column", "header": "Keyword" }, { field: "count", header: "Associated Score Sets" }],
        "raw-read-identifiers": [{ field: "identifier", "header": "Raw Read Identifier" }, { field: "count", header: "Associated Score Sets" }, { field: "url", header: "URL" }],
        "publication-identifiers": [{ field: "identifier", "header": "Identifier" }, { field: "count", header: "Associated Score Sets" }, { field: "title", header: "Title" }, { field: "url", header: "URL" }],
        "doi-identifiers": [{ field: "identifier", "header": "Identifier" }, { field: "count", header: "Associated Score Sets" }, { field: "url", header: "URL" }]
      },

      // These are for the pie charts
      targetAccessionAssemblyFieldCounts: targetAccessionAssemblyStatistic.item,
      targetGeneCategoryFieldCounts: targetGeneCategoryStatistic.item,
      targetGeneOrganismFieldCounts: targetGeneOrganismStatistic.item,

      field: field,
      activeTabIndex: activeTabIndex,
      loading: loading
    }
  },

  props: {
    model: {
      type: String,
      required: true,
      validator: (val) => ['Target', 'ScoreSet', 'Experiment'].includes(val),
    }
  },

  data: () => ({
    dataForField: null,
    leaderboardData: null,

    fetchedLeaderboardData: {}
  }),

  computed: {
    // Why are these all computed properties? To avoid chart re-render when tab is switched.
    showAssemblyChart: function() {
      return this.targetAccessionAssemblyFieldCounts && Object.keys(this.targetAccessionAssemblyFieldCounts).length > 0
    },
    showCategoryChart: function() {
      return this.targetGeneCategoryFieldCounts && Object.keys(this.targetGeneCategoryFieldCounts).length > 0
    },
    showOrganismChart: function() {
      return this.targetGeneOrganismFieldCounts && Object.keys(this.targetGeneOrganismFieldCounts).length > 0
    },
    assemblyChartData: function() { return this.chartDataForTarget(this.targetAccessionAssemblyFieldCounts) },
    categoryChartData: function() { return this.chartDataForTarget(this.targetGeneCategoryFieldCounts) },
    organismChartData: function() { return this.chartDataForTarget(this.targetGeneOrganismFieldCounts) },
    assemblyChartOptions: function() {
       return this.setChartOptions('Target Gene Assemblies', this.targetGeneOrganismFieldCounts, null) 
    },
    categoryChartOptions: function() {
       return this.setChartOptions('Target Gene Category', this.targetGeneOrganismFieldCounts, 'target-type') 
    },
    organismChartOptions: function() {
       return this.setChartOptions('Target Organism', this.targetGeneOrganismFieldCounts, 'target-organism-name') 
    },
  },

  watch: {
    field: {
      handler: async function (newValue, oldValue) {
        if (newValue == oldValue) {
          return
        } else {
          this.field = newValue
          this.loading = true
        }

        this.leaderboardData = null
        await this.inferAndSetStatisticField(newValue)
        this.loading = false
      },
      immediate: true
    }
  },

  methods: {
    chartDataForTarget: function (targetData) {
      if (!targetData) {
        return {}
      }

      return this.statisticsDictToChartData(targetData)
    },

    // This gets problematic if there are any duplicated statistics field names. If any do arise, we could add
    // add nesting levels to the `fetchedLeaderboardData` object and utilize the `statisticForProp` object to
    // resolve fields dynamically.
    inferAndSetStatisticField: async function (field) {
      const statisticForProp = this.statisticFields[this.model]
      const dataAlreadyFetched = this.fetchedLeaderboardData?.[field]

      if (!dataAlreadyFetched) {
        this.dataForField = await this.fetchStatistic(statisticForProp[field].model, statisticForProp[field].name, statisticForProp[field].field)
        this.fetchedLeaderboardData[field] = await this.calculateLeaderboardData()
      }

      this.leaderboardData = this.fetchedLeaderboardData[field]
    },

    setChartOptions: function (title, data, model) {
      return {
        onClick: (event, element) => {
          if (!model) {
            model = 'search'
          }

          window.open(`${config.appBaseUrl}/#/search?${model}=${Object.keys(data)[element[0].index]}`)
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: title
          },
        }
      }
    },

    statisticsDictToChartData: function (stats) {
      let entries = Object.entries(stats)
      return {
        labels: entries.map((e) => { return e[0] }),
        datasets: [
          {
            data: entries.map((e) => { return e[1] }),
            // Colors for pie charts; Colors palette from https://sashamaps.net/docs/resources/20-colors/.
            backgroundColor: ['#3f51b5', '#e6194b', '#3cb44b', '#ffe119', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#f58231', '#911eb4', '#4363d8', '#46f0f0', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#808080', '#ffffff', '#000000']
          }
        ]
      }
    },

    calculateLeaderboardData: async function () {
      if (!this.dataForField) {
        return []
      }

      const loadTargetIdentifiers = async (dbName) => {
        const dbNames = {
          "uniprot-identifier": "UniProt",
          "refseq-identifier": "RefSeq",
          "ensembl-identifier": "Ensembl"
        }
        const identifiers = []
        for (const identifier of Object.keys(this.dataForField)) {
          let result = await this.searchTargetIdentifiers(dbNames[dbName], identifier)
          identifiers.push({ ...result[0], ...{ count: this.dataForField[identifier] } })
        }

        return identifiers
      }

      const loadRecordIdentifiers = async (identifierType) => {
        const identifiers = []
        for (const identifier of Object.keys(this.dataForField)) {
          let result = await this.searchIdentifiers(identifier, identifierType)
          identifiers.push({ ...result[0], ...{ count: this.dataForField[identifier] } })
        }

        return identifiers
      }

      const loadPublicationIdentifiers = async () => {
        const identifiers = []
        for (const dbName of Object.keys(this.dataForField)) {
          for (const identifier of Object.keys(this.dataForField[dbName])) {
            let result = await this.searchPublicationIdentifiers(dbName, identifier)
            identifiers.push({ ...result, ...{ count: this.dataForField[dbName][identifier] } })
          }
        }

        return identifiers
      }

      var identifiers;
      // Fields loaded directly via data for field. These fields do not require additional `/search` endpoint requests.
      if (this.field == 'accession' || this.field == 'gene' || this.field == 'organism' || this.field == 'keywords') {
        identifiers = this.countsToLeaderboard(this.dataForField)
      }
      // External gene identifiers
      else if (this.field == 'uniprot-identifier' || this.field == 'refseq-identifier' || this.field == 'ensembl-identifier') {
        identifiers = (await loadTargetIdentifiers(this.field))
      }

      // Record identifiers
      else if (this.field == 'doi-identifiers' || this.field == 'raw-read-identifiers') {
        identifiers = (await loadRecordIdentifiers(this.field))
      }
      // Publication identifiers - loaded differently to account for dbName nesting.
      else if (this.field == 'publication-identifiers') {
        identifiers = (await loadPublicationIdentifiers())
      }
      else {
        identifiers = []
      }

      return identifiers.sort((a, b) => { a.count - b.count })
    },

    countsToLeaderboard: function (counts) {
      return Object.keys(counts).map(k => { return { column: k, count: counts[k] } })
    },

    fetchStatistic: async function (model, name, field) {
      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/statistics/${model}/${name}/${field}`,
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO(#130) catch errors in response
        return response.data || {}
      } catch (err) {
        console.log(`Error while loading search results for Model: ${model}, Name: ${name}, Field: ${field}")`, err)
        return []
      }
    },

    searchIdentifiers: async function (identifier, field) {
      try {
        const response = await axios.post(
          `${config.apiBaseUrl}/${field}/search`,
          { text: identifier },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading ${identifier} search results")`, err)
        return []
      }
    },

    searchPublicationIdentifiers: async function (dbName, identifier) {
      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/publication-identifiers/${dbName}/${identifier}`,
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading publication identifier search results")`, err)
        return []
      }
    },

    searchTargetIdentifiers: async function (db, identifier) {
      try {
        const response = await axios.post(
          `${config.apiBaseUrl}/target-gene-identifiers/search?db_name=${db}`,
          { text: identifier },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
        return []
      }
    },
  }
})
</script>

<style>
.p-tabview-panel .highlights-spinner-container {
  align-items: center;
  display: flex;
  justify-content: center;
  padding-top: 18px;
  width: 100%;
}

.p-tabview-panel .highlights-progress {
  height: 50px;
  width: 50px;
}

.chart-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
}

.chart {
  flex: 0 1 auto;
}
</style>
