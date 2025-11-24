<template>
  <div v-if="scoreSet.numVariants > 10">
    Below is a sample of the first 10 variants (out of {{ scoreSet.numVariants }} total variants). Please download the
    file on the top page if you want to read the whole variants list.
  </div>
  <br />
  <TabView>
    <TabPanel header="Scores">
      <div style="overflow-y: scroll; overflow-x: scroll">
        <DataTable :show-gridlines="true" :striped-rows="true" :value="scoresTableData">
          <Column
            v-for="column of scoreColumns.slice(0, numTextColsInScoresTable)"
            :key="column"
            :field="column"
            :header="column"
            header-style="background-color: #a1d8c8; font-weight: bold;"
            style="overflow: hidden"
          >
            <!--:frozen="columnIsAllNa(scoresTable, column)"-->
            <template #body="scoresTable">{{ scoresTable.data[column] }}</template>
          </Column>
          <Column
            v-for="column of scoreColumns.slice(numTextColsInScoresTable, scoreColumns.length)"
            :key="column"
            :field="column"
            :header="column"
            header-style="background-color: #a1d8c8; font-weight: bold;"
            style="overflow: hidden"
          >
            <template #body="scoresTable">{{ convertToThreeDecimal(scoresTable.data[column]) }}</template>
          </Column>
        </DataTable>
      </div>
    </TabPanel>
    <TabPanel header="Counts">
      <div style="overflow-y: scroll; overflow-x: scroll">
        <template v-if="!countsTableData || countsTableData.length === 0"> No count data available. </template>
        <DataTable v-else :show-gridlines="true" :striped-rows="true" :value="countsTableData">
          <Column
            v-for="column of countColumns.slice(0, numTextColsInScoresTable)"
            :key="column"
            :field="column"
            :header="column"
            header-style="background-color: #a1d8c8; font-weight: bold;"
            style="overflow: hidden"
          >
            <!--:frozen="columnIsAllNa(countsTable, column)" bodyStyle="text-align:left"-->
            <template #body="countsTable">{{ countsTable.data[column] }}</template>
            <!--:style="{overflow: 'hidden'}"-->
          </Column>
          <Column
            v-for="column of countColumns.slice(numTextColsInScoresTable, countColumns.length)"
            :key="column"
            :field="column"
            :header="column"
            header-style="background-color: #a1d8c8; font-weight: bold;"
            style="overflow: hidden"
          >
            <template #body="countsTable">{{ convertToThreeDecimal(countsTable.data[column]) }}</template>
          </Column>
        </DataTable>
      </div>
    </TabPanel>
  </TabView>
</template>

<script lang="ts" setup>
import axios from 'axios'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import type {PropType, Ref} from 'vue'
import {computed, ref, watch} from 'vue'

import type {components} from '@/schema/openapi'
import type {ScoresOrCountsRow} from '@/lib/scores'
import {parseScoresOrCounts} from '@/lib/scores'
import config from '@/config'

const props = defineProps({
  scoreSet: {
    type: Object as PropType<components['schemas']['ScoreSet']>,
    required: true
  }
})

const scoresData: Ref<ScoresOrCountsRow[]> = ref([])
const countsData: Ref<ScoresOrCountsRow[]> = ref([])

// Drop 'accession.'
const scoreColumns = computed(() =>
  scoresData.value.length > 0 ? Object.keys(scoresData.value[0]).filter((col) => col !== 'accession') : []
)
const countColumns = computed(() =>
  countsData.value.length > 0 ? Object.keys(countsData.value[0]).filter((col) => col !== 'accession') : []
)

const fixedColumns = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

const numTextColsInScoresTable = computed(() => fixedColumns.filter((col) => scoreColumns.value.includes(col)).length)
const countsTableHasDataColumns = computed(() => countColumns.value.some((col) => !fixedColumns.includes(col)))

const scoresTableData = computed(() => scoresData.value.slice(0, 10))
const countsTableData = computed(() => (countsTableHasDataColumns.value ? countsData.value.slice(0, 10) : []))

function convertToThreeDecimal(value: number | string) {
  const numStr = String(value)
  let decimalNumber = 0
  if (numStr.includes('.')) {
    decimalNumber = numStr.split('.')[1].length
  }
  if (decimalNumber < 4) {
    return value
  } else {
    return parseFloat(numStr).toFixed(3)
  }
}

async function fetchScores() {
  scoresData.value = []
  if (props.scoreSet) {
    const response = await axios.get(
      `${config.apiBaseUrl}/score-sets/${props.scoreSet.urn}/scores?drop_na_columns=true`
    )
    if (response.data) {
      scoresData.value = parseScoresOrCounts(response.data, false)
    }
  }
}

async function fetchCounts() {
  countsData.value = []
  if (props.scoreSet) {
    const response = await axios.get(
      `${config.apiBaseUrl}/score-sets/${props.scoreSet.urn}/counts?drop_na_columns=true`
    )
    if (response.data) {
      countsData.value = parseScoresOrCounts(response.data, false)
    }
  }
}

watch(
  () => props.scoreSet,
  () => {
    fetchScores()
    fetchCounts()
  },
  {immediate: true}
)
</script>
