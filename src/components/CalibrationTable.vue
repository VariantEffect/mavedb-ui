<template>
  <div>
    <!-- Main caption -->
    <div class="mavedb-calibration-caption-standalone">
      {{ calibrationNameToDisplay }}
    </div>

    <!-- Baseline score (if provided) - always spans full width -->
    <div v-if="baselineScoreIsDefined" class="mavedb-baseline-score">
      <strong>Baseline score: </strong>
      <span class="monospaced-type">{{ roundForCalibrationTable(scoreCalibration.baselineScore || 0) }}</span>
      <span v-if="scoreCalibration.baselineScoreDescription">
        <PrimeButton
          v-tooltip.right="{value: scoreCalibration.baselineScoreDescription, autoHide: false}"
          aria-label="Info"
          class="p-button-help mavedb-help-tooltip-button"
          icon="pi pi-info"
          outlined
          rounded
        />
      </span>
    </div>

    <!-- Chunked table sections -->
    <div
      v-if="sortedRanges.length > 0"
      class="mavedb-calibration-chunks"
      :class="{'has-baseline': baselineScoreIsDefined}"
    >
      <div v-for="(chunk, chunkIndex) in rangeChunks" :key="`chunk-${chunkIndex}`" class="mavedb-calibration-chunk">
        <div class="mavedb-calibration-grid" :style="chunkGridStyle(chunk.length)">
          <!-- Range label row -->
          <div class="mavedb-calibration-row-header grid-row-header" :class="{'chunk-separator-top': chunkIndex > 0}">
            Range label
          </div>
          <div
            v-for="(range, rangeIndex) in chunk"
            :key="range.label"
            class="grid-data-cell"
            :class="{
              'chunk-separator-top': chunkIndex > 0,
              'last-column': rangeIndex === chunk.length - 1
            }"
          >
            <span>{{ range.label }}</span>
            <span v-if="range.description">
              <PrimeButton
                v-tooltip.right="{value: range.description, autoHide: false}"
                aria-label="Info"
                class="p-button-help mavedb-help-tooltip-button"
                icon="pi pi-info"
                outlined
                rounded
              />
            </span>
          </div>

          <!-- Classification row -->
          <div class="mavedb-calibration-row-header grid-row-header">Classification</div>
          <div
            v-for="(range, rangeIndex) in chunk"
            :key="range.label + '-classification'"
            :class="[
              'grid-data-cell',
              `mave-classification-${range.classification}`,
              {'last-column': rangeIndex === chunk.length - 1}
            ]"
          >
            <span>{{ range.classification ? titleCase(range.classification) : 'Not Provided' }}</span>
          </div>

          <!-- Numeric interval row -->
          <div
            class="mavedb-calibration-row-header grid-row-header"
            :class="{'last-row': isLastRowInChunk('interval')}"
          >
            Numeric interval
          </div>
          <div
            v-for="(range, rangeIndex) in chunk"
            :key="range.label + '-interval'"
            :class="[
              'grid-data-cell',
              'monospaced-type',
              {
                'last-column': rangeIndex === chunk.length - 1,
                'last-row': isLastRowInChunk('interval')
              }
            ]"
          >
            <span>
              {{ range.inclusiveLowerBound ? '[' : '('
              }}<template v-if="range.range[0] !== null">{{ roundForCalibrationTable(range.range[0]) }}</template
              ><span v-else><span class="minus-symbol">&minus;</span><span class="infinity-symbol">&infin;</span></span
              >, <template v-if="range.range[1] !== null">{{ roundForCalibrationTable(range.range[1]) }}</template
              ><span v-else class="infinity-symbol">&infin;</span>{{ range.inclusiveUpperBound ? ']' : ')' }}
            </span>
          </div>

          <!-- Evidence strength row (if any ranges have evidence codes) -->
          <template v-if="anyRangeHasEvidenceCode">
            <div
              class="mavedb-calibration-row-header grid-row-header"
              :class="{'last-row': isLastRowInChunk('evidence')}"
            >
              Evidence strength
            </div>
            <div
              v-for="(range, rangeIndex) in chunk"
              :key="range.label + '-evidence-code'"
              :class="[
                'grid-data-cell',
                'evidence-strength-cell',
                range.acmgClassification?.evidenceStrength
                  ? `mave-evidence-code-${range.acmgClassification?.criterion}_${range.acmgClassification?.evidenceStrength?.toUpperCase()}`
                  : '',
                {
                  'last-column': rangeIndex === chunk.length - 1,
                  'last-row': isLastRowInChunk('evidence')
                }
              ]"
            >
              <span v-if="range.acmgClassification?.evidenceStrength" class="evidence-code">
                {{ formattedEvidenceCode(range) }}
              </span>
              <span v-else> — </span>
            </div>
          </template>

          <!-- OddsPaths ratio row (if any ranges have OddsPaths) -->
          <template v-if="anyRangeHasOddsPaths">
            <div
              class="mavedb-calibration-row-header grid-row-header"
              :class="{'last-row': isLastRowInChunk('oddspaths')}"
            >
              OddsPaths ratio
            </div>
            <div
              v-for="(range, rangeIndex) in chunk"
              :key="range.label + '-oddspaths'"
              :class="[
                'grid-data-cell',
                {
                  'last-column': rangeIndex === chunk.length - 1,
                  'last-row': isLastRowInChunk('oddspaths')
                }
              ]"
            >
              <template v-if="range.oddspathsRatio">
                <span class="monospaced-type">{{ roundForCalibrationTable(range.oddspathsRatio) }}</span>
              </template>
              <span v-else> — </span>
            </div>
          </template>

          <!-- PLR row (if any ranges have PLR) -->
          <template v-if="anyRangeHasPLR">
            <div class="mavedb-calibration-row-header grid-row-header" :class="{'last-row': isLastRowInChunk('plr')}">
              Positive Likelihood Ratio (PLR)
            </div>
            <div
              v-for="(range, rangeIndex) in chunk"
              :key="range.label + '-plr'"
              :class="[
                'grid-data-cell',
                {
                  'last-column': rangeIndex === chunk.length - 1,
                  'last-row': isLastRowInChunk('plr')
                }
              ]"
            >
              <span v-if="'positiveLikelihoodRatio' in range">{{ range.positiveLikelihoodRatio }}</span>
              <span v-else>Not Provided</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Evidence absence message (if ranges exist but no evidence details) -->
    <div
      v-if="
        sortedRanges.length > 0 && !anyRangeHasEvidenceStrength && !anyRangeHasEvidenceCode && !anyRangeHasOddsPaths
      "
      class="grid-full-width-message"
    >
      No evidence strengths have been reported for this calibration{{ scoreCalibration.notes ? '*' : '' }}.
    </div>

    <!-- Calibration sources section -->
    <div v-if="hasAnySources" class="mavedb-calibration-sources-cell">
      <!-- Threshold sources group -->
      <template v-if="scoreCalibration.thresholdSources && scoreCalibration.thresholdSources.length > 0">
        <span aria-label="Threshold sources" class="sources-group" role="group">
          <PrimeButton
            v-tooltip.left="{
              value: 'The threshold source(s) describes the source of the score threshold used in this calibration.',
              autoHide: false
            }"
            aria-label="Threshold sources info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
          <strong>Thresholds:</strong>
          <span class="citation-list">
            <span
              v-for="(source, i) in scoreCalibration.thresholdSources"
              :key="'threshold:' + source.dbName + ':' + source.identifier"
            >
              <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
              ><span v-if="i < scoreCalibration.thresholdSources.length - 1">, </span>
            </span>
          </span>
        </span>
      </template>
      <!-- Separator between groups -->
      <span
        v-if="
          scoreCalibration.thresholdSources?.length &&
          (scoreCalibration.methodSources?.length || scoreCalibration.classificationSources?.length)
        "
        aria-hidden="true"
        class="sources-separator"
        >—</span
      >
      <!-- Method sources group -->
      <template v-if="scoreCalibration.methodSources && scoreCalibration.methodSources.length > 0">
        <span aria-label="Method sources" class="sources-group" role="group">
          <PrimeButton
            v-tooltip.left="{
              value: 'The method source(s) describe the method by which evidence strengths were obtained.',
              autoHide: false
            }"
            aria-label="Method sources info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
          <strong>Method:</strong>
          <span class="citation-list">
            <span
              v-for="(source, i) in scoreCalibration.methodSources"
              :key="'method:' + source.dbName + ':' + source.identifier"
            >
              <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
              ><span v-if="i < scoreCalibration.methodSources.length - 1">, </span>
            </span>
          </span>
        </span>
      </template>
      <span
        v-if="scoreCalibration.methodSources?.length && scoreCalibration.classificationSources?.length"
        aria-hidden="true"
        class="sources-separator"
        >—</span
      >
      <!-- Evidence calculation sources group -->
      <template v-if="scoreCalibration.classificationSources && scoreCalibration.classificationSources.length > 0">
        <span aria-label="Evidence calculation sources" class="sources-group" role="group">
          <PrimeButton
            v-tooltip.left="{
              value:
                'Evidence calculation source(s) describe the source of the evidence strengths for each functional range.',
              autoHide: false
            }"
            aria-label="Evidence calculation sources info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
          <strong>Evidence calcs:</strong>
          <span class="citation-list">
            <span
              v-for="(source, i) in scoreCalibration.classificationSources"
              :key="'calc:' + source.dbName + ':' + source.identifier"
            >
              <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
              ><span v-if="i < scoreCalibration.classificationSources.length - 1">, </span>
            </span>
          </span>
        </span>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="sortedRanges.length === 0" class="mave-classification-not_provided grid-full-width-message">
      Ranges have not been provided{{ scoreCalibration.notes ? '*' : '' }}.
    </div>

    <div v-if="scoreCalibration.notes" class="mavedb-calibration-caption-notes">*{{ scoreCalibration.notes }}</div>
  </div>
</template>

<script lang="ts">
import PrimeButton from 'primevue/button'
import {defineComponent, PropType} from 'vue'

import {shortCitationForPublication} from '@/lib/publication'
import {PersistedScoreCalibration, FunctionalRange} from '@/lib/calibrations'

export default defineComponent({
  name: 'CalibrationTable',

  components: {PrimeButton},

  props: {
    scoreCalibration: {
      type: Object as PropType<PersistedScoreCalibration>,
      required: true
    }
  },

  emits: ['rangeSelected'],

  data() {
    return {
      shortCitationForPublication,
      activeRangeKey: null as {label: string; value: string} | null
    }
  },

  computed: {
    anyRangeHasEvidenceStrength(): boolean {
      if (!this.scoreCalibration.functionalRanges) {
        return false
      }

      return this.scoreCalibration.functionalRanges.some(
        (r: FunctionalRange) => r.acmgClassification && 'points' in r.acmgClassification
      )
    },

    anyRangeHasEvidenceCode(): boolean {
      if (!this.scoreCalibration.functionalRanges) {
        return false
      }

      return this.scoreCalibration.functionalRanges.some((r: FunctionalRange) => r.acmgClassification?.evidenceStrength)
    },

    anyRangeHasOddsPaths(): boolean {
      if (!this.scoreCalibration.functionalRanges) {
        return false
      }

      return this.scoreCalibration.functionalRanges.some((r: FunctionalRange) => r.oddspathsRatio !== undefined)
    },

    anyRangeHasPLR(): boolean {
      if (!this.scoreCalibration.functionalRanges) {
        return false
      }

      return this.scoreCalibration.functionalRanges.some((r: FunctionalRange) => 'positiveLikelihoodRatio' in r)
    },

    hasAnySources(): boolean {
      return !!(
        (this.scoreCalibration.thresholdSources && this.scoreCalibration.thresholdSources.length > 0) ||
        (this.scoreCalibration.methodSources && this.scoreCalibration.methodSources.length > 0) ||
        (this.scoreCalibration.classificationSources && this.scoreCalibration.classificationSources.length > 0)
      )
    },

    sortedRanges() {
      if (!this.scoreCalibration.functionalRanges) {
        return []
      }
      return [...this.scoreCalibration.functionalRanges].sort(this.comparescoreCalibration)
    },

    baselineScoreIsDefined() {
      return this.scoreCalibration.baselineScore !== null && this.scoreCalibration.baselineScore !== undefined
    },

    calibrationNameToDisplay() {
      return this.scoreCalibration.researchUseOnly
        ? `Research Use Only: ${this.scoreCalibration.title}`
        : (this.scoreCalibration.title ?? 'Score ranges')
    },

    chunkSize() {
      // Determine how many columns per chunk based on screen width
      if (typeof window === 'undefined') return 4 // SSR fallback
      if (window.innerWidth < 600) return 2
      if (window.innerWidth < 900) return 3
      return 4
    },

    rangeChunks() {
      if (!this.sortedRanges.length) {
        return []
      }

      const chunks = []
      for (let i = 0; i < this.sortedRanges.length; i += this.chunkSize) {
        chunks.push(this.sortedRanges.slice(i, i + this.chunkSize))
      }
      return chunks
    }
  },

  methods: {
    chunkGridStyle(chunkLength: number) {
      // If there is only one chunk, use all columns for proportional sizing. If multiple chunks, use fixed chunk size.
      // for visual consistency across chunks.
      const maxChunkSize = this.rangeChunks.length > 1 ? this.chunkSize : chunkLength

      // Use proportional widths that fill the full container
      const headerPortion = 1
      const totalDataPortion = maxChunkSize
      const totalPortion = headerPortion + totalDataPortion

      const headerWidth = `${(headerPortion / totalPortion) * 100}%`
      const dataWidth = `${(1 / totalPortion) * 100}%`

      return {
        gridTemplateColumns: `${headerWidth} repeat(${chunkLength}, ${dataWidth})`
      }
    },

    isLastRowInChunk(rowType: string): boolean {
      // Determine if this row type is the last one to be rendered
      // Order: Range label, Classification, Numeric interval, Evidence strength, OddsPaths, PLR
      if (this.anyRangeHasPLR) return rowType === 'plr'
      if (this.anyRangeHasOddsPaths) return rowType === 'oddspaths'
      if (this.anyRangeHasEvidenceCode) return rowType === 'evidence'
      return rowType === 'interval' // Numeric interval is always present
    },

    comparescoreCalibration(a: FunctionalRange, b: FunctionalRange): number {
      let result = this.compareScores(a.range[0], b.range[0], true)
      if (result == 0) {
        result = this.compareScores(a.range[1], b.range[1], false)
      }
      return result
    },

    compareScores(a: number | null, b: number | null, infinityIsNegative: boolean = false) {
      if (a == null && b == null) {
        return 0
      }
      if (a == null) {
        return infinityIsNegative ? -1 : 1
      }
      if (b == null) {
        return infinityIsNegative ? 1 : -1
      }
      return a - b
    },

    titleCase(s: string) {
      return s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 $2')
    },

    roundForCalibrationTable(value: number | string) {
      return parseFloat(String(value)).toFixed(2)
    },

    formattedEvidenceCode(range: FunctionalRange) {
      if (!range.acmgClassification?.evidenceStrength) {
        return ''
      }
      const criterion = range.acmgClassification.criterion
      const strength = range.acmgClassification.evidenceStrength.toUpperCase()
      // Inject zero-width space after underscores to allow wrapping only at underscores
      return `${criterion}_${strength}`.replace(/_/g, '_\u200b')
    }
  }
})
</script>

<style scoped>
/* Standalone caption styling */
.mavedb-calibration-caption-standalone {
  text-align: center;
  font-weight: 600;
  font-size: 1.25em;
  padding: 0.6em 0.4em;
  background: #f0f0f0;
  border: 1px solid gray;
  border-bottom: 1px solid gray;
}

/* Baseline score styling */
.mavedb-baseline-score {
  text-align: center;
  padding: 0.5em 1em;
  background: #fafafa;
  border: 1px solid gray;
  border-top: 0;
  border-bottom: 1px solid gray;
}

/* Chunked layout container */
.mavedb-calibration-chunks {
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap to create unified appearance */
  border: 1px solid gray;
  border-top: 0; /* Continue from baseline score or caption */
}

.mavedb-calibration-chunk {
  /* Remove individual chunk borders */
  border: none;
}

/* Add extra thick separator line between chunks for clear visual grouping */
.chunk-separator-top {
  border-top: 6px solid #333 !important;
}

/* Extend thick border to the right edge using a pseudo-element */
.mavedb-calibration-chunk:not(:first-child) {
  position: relative;
}

.mavedb-calibration-chunk:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background-color: #333;
  z-index: 1;
}

/* Grid styling for each chunk */
.mavedb-calibration-grid {
  display: grid;
  gap: 0;
  line-height: normal;
  width: 100%;
}

.grid-row-header {
  font-weight: bold;
  text-align: left;
  background-color: #fafafa;
  white-space: normal;
  border-right: 1px solid gray;
  border-bottom: 1px solid gray;
  border-top: 0;
  border-left: 0;
  padding: 0.5em 1em;
  display: flex;
  align-items: center;
}

.grid-data-cell {
  border-right: 1px solid gray;
  border-bottom: 1px solid gray;
  border-top: 0;
  border-left: 0;
  padding: 0.5em 1em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Better text wrapping for evidence codes */
  overflow-wrap: normal;
  word-break: normal;
  min-height: 2.5em;
}

/* Remove right border from all cells in the last column of each chunk */
.grid-data-cell.last-column {
  border-right: 0 !important;
}

/* Remove bottom border from last row of final chunk only to connect seamlessly with sources */
.mavedb-calibration-chunk:last-child .grid-data-cell.last-row,
.mavedb-calibration-chunk:last-child .grid-row-header.last-row {
  border-bottom: 0 !important;
}

/* Add right border to the last cell in the final chunk */
.mavedb-calibration-chunk:last-child .grid-data-cell.last-column {
  border-right: 1px solid gray !important;
}

/* Special styling for evidence strength cells to prevent overlap */
.evidence-strength-cell {
  min-width: 100px;
  font-size: 0.9em;
  padding: 0.4em 0.6em;
}

/* Full-width message styling */
.grid-full-width-message {
  padding: 0.5em 1em;
  text-align: center;
  font-style: italic;
  font-size: 0.9em;
  background: #f9f9f9;
  border-bottom: 1px solid gray;
  border-left: 1px solid gray;
  border-right: 1px solid gray;
  border-top: 0;
}

/* Sources styling */
.mavedb-calibration-sources-cell {
  text-align: left;
  font-size: 0.85em;
  line-height: 1.5;
  background: #f9f9f9;
  padding: 0.5em 1em;
  border-bottom: 1px solid gray;
  border-left: 1px solid gray;
  border-right: 1px solid gray;
  border-top: 0;
}

.mavedb-calibration-sources-cell .sources-label {
  font-weight: 600;
  margin-right: 0.15em;
}

.mavedb-calibration-sources-cell .sources-group {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  margin-right: 0.3em;
  flex-wrap: wrap;
}

.mavedb-calibration-sources-cell .citation-list a {
  white-space: nowrap;
}

.evidence-code {
  white-space: normal;
  word-break: break-word;
}

.mavedb-calibration-sources-cell .sources-separator {
  margin: 0 0.15em;
  color: #666;
  font-weight: 600;
}

.mavedb-calibration-caption-notes {
  display: block;
  font-size: 0.9em;
  line-height: 1.2;
  font-weight: normal;
  margin-top: 0.25em;
  font-style: italic;
  color: #333;
}

/* Investigator-supplied functional classifications */
.mave-classification-normal {
  background-color: #4444ff;
  color: white;
  font-weight: bold;
}

.mave-classification-abnormal {
  background-color: #ff4444;
  color: white;
  font-weight: bold;
}

.mave-classification-not_specified {
  background-color: #646464;
  color: white;
  font-weight: bold;
}

.mave-classification-not_provided {
  background-color: #ffffff;
  font-style: italic;
}

/* Evidence strengths */
.mave-evidence-code-PS3_VERY_STRONG {
  background-color: #943744;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-PS3_STRONG {
  background-color: #b85c6b;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE_PLUS {
  background-color: #ca7682;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE {
  background-color: #d68f99;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-PS3_SUPPORTING {
  background-color: #e6b1b8;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-BS3_SUPPORTING {
  background-color: #e4f1f6;
  font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE {
  background-color: #d0e8f0;
  font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE_PLUS {
  background-color: #99c8dc;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-BS3_STRONG {
  background-color: #7ab5d1;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-BS3_VERY_STRONG {
  background-color: #4b91a6;
  color: white;
  font-weight: bold;
}

.mave-evidence-code-INDETERMINATE {
  background-color: #e0e0e0;
  font-weight: bold;
}

/* Monospace (or at least tabular) numerals for ranges and OddsPath ratios */
.monospaced-type,
.monospaced-type > span {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
  font-variant-numeric: tabular-nums;
}

/* Make infinity symbols larger and align (infinity baseline is different) */
.infinity-symbol {
  font-size: 1.4em;
  vertical-align: -0.1em;
}

/* Make minus symbols larger for appropriate scale with infinity symbol and align */
.minus-symbol {
  font-size: 1.3em;
  vertical-align: -0.05em;
}

/* Tooltips */
.mavedb-help-tooltip-button {
  margin-left: 0.6rem;
  height: 0.5rem;
  width: 0.5rem;
  vertical-align: middle;
  margin-top: 0;
  margin-bottom: 0;
  display: inline-flex;
  align-items: center;
  background: none;
}

.mavedb-help-tooltip-button:focus,
.mavedb-help-tooltip-button:active,
.mavedb-help-tooltip-button.p-focus {
  background: none;
}

.mavedb-help-tooltip-button:deep(.p-button-icon) {
  font-size: 0.5rem;
}

/* Responsive behavior */
@media (max-width: 900px) {
  .evidence-strength-cell {
    min-width: 80px;
    font-size: 0.8em;
    padding: 0.3em 0.4em;
  }

  .grid-data-cell,
  .grid-row-header {
    padding: 0.4em 0.6em;
  }

  .evidence-code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

@media (max-width: 600px) {
  .mavedb-calibration-chunks {
    gap: 0.5em;
  }

  .evidence-strength-cell {
    min-width: 60px;
    font-size: 0.75em;
    padding: 0.25em 0.3em;
  }

  .grid-data-cell,
  .grid-row-header {
    padding: 0.3em 0.4em;
    font-size: 0.9em;
  }
}
</style>
