<template>
  <div class="overflow-hidden rounded-lg border border-border bg-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-4 py-3.5 tablet:px-5">
      <h3 class="mave-section-title">
        Variants preview
        <span v-if="scoreSet.numVariants" class="font-normal text-text-muted">
          ({{ scoreSet.numVariants.toLocaleString() }})
        </span>
      </h3>
      <div class="flex flex-wrap items-center gap-2">
        <PButton
          v-if="!processingErrors"
          icon="pi pi-download"
          label="Scores"
          severity="secondary"
          size="small"
          @click="downloadFile('scores')"
        />
        <PButton
          v-if="!processingErrors && hasCountData"
          icon="pi pi-download"
          label="Counts"
          severity="secondary"
          size="small"
          @click="downloadFile('counts')"
        />
        <PButton
          v-if="!processingErrors"
          icon="pi pi-sliders-h"
          label="Custom Data"
          severity="secondary"
          size="small"
          @click="customDialogVisible = true"
        />
        <slot name="actions" />
      </div>
    </div>

    <!-- Processing errors -->
    <div v-if="processingErrors?.length" class="p-4">
      <MvStatusMessage severity="error">
        Scores and/or counts could not be processed. Please remedy the
        {{ processingErrors.length }} errors below, then try submitting again.
      </MvStatusMessage>
      <div class="mt-3 max-h-[200px] overflow-auto rounded-lg border border-border bg-bg p-4 font-mono text-xs">
        <div v-for="err of processingErrors" :key="err" class="py-0.5">{{ err }}</div>
      </div>
    </div>

    <MvLoader v-else-if="loading" text="Loading variant data..." />

    <template v-else>
      <!-- Scores table -->
      <div v-if="scoresRows.length > 0">
        <div class="flex items-center justify-between border-b border-border-light bg-bg px-4 py-2 tablet:px-5">
          <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Scores</span>
          <span class="text-xs text-text-muted">
            Showing {{ scoresRows.length }} of {{ scoresData.length.toLocaleString() }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="variant-table w-full">
            <thead>
              <tr>
                <th v-for="col in scoreColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in scoresRows" :key="i">
                <td v-for="col in scoreColumns" :key="col" :class="isTextColumn(col) ? '' : 'text-right'">
                  {{ formatCell(row[col], col) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Counts table -->
      <div v-if="!hasCountData" class="border-t border-border-light px-5 py-4 text-sm italic text-text-muted">
        No count data available for this score set.
      </div>
      <div v-else-if="countsRows.length > 0">
        <div
          class="flex items-center justify-between border-b border-border-light border-t bg-bg px-4 py-2 tablet:px-5"
        >
          <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Counts</span>
          <span class="text-xs text-text-muted">
            Showing {{ countsRows.length }} of {{ countsData.length.toLocaleString() }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="variant-table w-full">
            <thead>
              <tr>
                <th v-for="col in countColumns" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in countsRows" :key="i">
                <td v-for="col in countColumns" :key="col" :class="isTextColumn(col) ? '' : 'text-right'">
                  {{ formatCell(row[col], col) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="scoresRows.length === 0 && countsRows.length === 0"
        class="px-5 py-8 text-center text-sm italic text-text-muted"
      >
        No data available.
      </div>
    </template>
  </div>

  <!-- Custom data dialog -->
  <PDialog v-model:visible="customDialogVisible" header="Custom Data Download" modal :style="{width: '28rem'}">
    <div class="flex flex-col gap-3 py-2">
      <label v-for="opt in dataTypeOptions" :key="opt.value" class="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox v-model="selectedDataOptions" :value="opt.value" />
        {{ opt.label }}
      </label>
    </div>
    <template #footer>
      <PButton label="Cancel" severity="secondary" size="small" @click="customDialogVisible = false" />
      <PButton icon="pi pi-download" label="Download" size="small" @click="downloadMultipleData" />
    </template>
  </PDialog>
</template>

<script lang="ts">
import {defineComponent, toRef, type PropType} from 'vue'
import PButton from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import PDialog from 'primevue/dialog'

import {getScoreSetScoresPreview, getScoreSetCountsPreview} from '@/api/mavedb'
import MvStatusMessage from '@/components/common/MvStatusMessage.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import {useScoreSetDownloads, TEXT_COLUMNS} from '@/composables/use-score-set-downloads'
import {parseScoresOrCounts, type ScoresOrCountsRow} from '@/lib/scores'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

const MAX_ROWS = 5

export default defineComponent({
  name: 'MvVariantPreview',

  components: {Checkbox, MvLoader, MvStatusMessage, PButton, PDialog},

  props: {
    scoreSet: {type: Object as PropType<ScoreSet>, required: true}
  },

  setup(props) {
    const scoreSetRef = toRef(props, 'scoreSet')
    const downloads = useScoreSetDownloads({scoreSet: scoreSetRef})
    return {...downloads}
  },

  data() {
    return {
      scoresData: [] as ScoresOrCountsRow[],
      countsData: [] as ScoresOrCountsRow[],
      loading: true
    }
  },

  computed: {
    processingErrors(): string[] | null {
      if (this.scoreSet.processingState === 'failed' && this.scoreSet.processingErrors?.detail) {
        return this.scoreSet.processingErrors.detail as string[]
      }
      return null
    },
    scoreColumns(): string[] {
      return this.scoresData.length > 0 ? Object.keys(this.scoresData[0]).filter((col) => col !== 'accession') : []
    },
    countColumns(): string[] {
      return this.countsData.length > 0 ? Object.keys(this.countsData[0]).filter((col) => col !== 'accession') : []
    },
    hasCountData(): boolean {
      return this.countColumns.some((col) => !TEXT_COLUMNS.includes(col))
    },
    scoresRows(): ScoresOrCountsRow[] {
      return this.scoresData.slice(0, MAX_ROWS)
    },
    countsRows(): ScoresOrCountsRow[] {
      return this.hasCountData ? this.countsData.slice(0, MAX_ROWS) : []
    },
    dataTypeOptions(): Array<{label: string; value: string}> {
      const options = [
        {label: 'Scores', value: 'scores'},
        {label: 'Mapped HGVS', value: 'mappedHgvs'},
        {label: 'Custom columns', value: 'includeCustomColumns'},
        {label: 'Without NA columns', value: 'dropNaColumns'}
      ]
      if (this.hasCountData) {
        options.splice(1, 0, {label: 'Counts', value: 'counts'})
      }
      return options
    }
  },

  watch: {
    scoreSet: {
      handler() {
        this.fetchData()
      },
      immediate: true
    }
  },

  methods: {
    isTextColumn(col: string): boolean {
      return TEXT_COLUMNS.includes(col)
    },
    formatCell(value: unknown, col: string): string {
      if (value == null || value === '') return ''
      if (this.isTextColumn(col)) return String(value)
      const numStr = String(value)
      if (numStr.includes('.') && numStr.split('.')[1].length > 3) {
        return parseFloat(numStr).toFixed(3)
      }
      return numStr
    },
    async fetchData() {
      this.loading = true
      try {
        const [scoresRaw, countsRaw] = await Promise.all([
          getScoreSetScoresPreview(this.scoreSet.urn),
          getScoreSetCountsPreview(this.scoreSet.urn).catch(() => null)
        ])
        this.scoresData = scoresRaw ? parseScoresOrCounts(scoresRaw, false) : []
        this.countsData = countsRaw ? parseScoresOrCounts(countsRaw, false) : []
      } catch {
        this.scoresData = []
        this.countsData = []
      } finally {
        this.loading = false
      }
    }
  }
})
</script>

<style scoped>
.variant-table {
  border-collapse: collapse;
  font-size: 13px;
}

.variant-table th {
  text-align: left;
  padding: 8px 14px;
  font-weight: 600;
  color: #767676;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface);
  white-space: nowrap;
}

.variant-table td {
  padding: 7px 14px;
  border-bottom: 1px solid var(--color-border-light);
  color: #444;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  white-space: nowrap;
}

.variant-table tr:last-child td {
  border-bottom: none;
}

.variant-table tbody tr:hover td {
  background: #f8faf8;
}
</style>
