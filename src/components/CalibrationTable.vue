<template>
  <div>
    <table class="mavedb-calibration-table">
      <caption class="mavedb-calibration-caption">
        {{
          scoreCalibrationName ?? 'Score ranges'
        }}
      </caption>
      <tbody>
        <!-- Baseline score row (if provided) -->
        <tr v-if="baselineScoreIsDefined">
          <th class="mavedb-calibration-row-header" scope="row">Baseline score</th>
          <td :colspan="dynamicScoreRangesColumnCount - 1" style="text-align: center">
            <span class="monospaced-type">{{ roundRangeBound(scoreCalibration.baselineScore) }}</span>
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
          </td>
        </tr>
        <!-- Header row describing columns -->
        <tr v-if="sortedRanges.length > 0">
          <th class="mavedb-calibration-row-header" scope="row">Range label</th>
          <td v-for="range in sortedRanges" :key="range.label">
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
          </td>
        </tr>
        <!-- Classification row -->
        <tr v-if="sortedRanges.length > 0">
          <th class="mavedb-calibration-row-header" scope="row">Classification</th>
          <td
            v-for="range in sortedRanges"
            :key="range.label + '-classification'"
            :class="
              anyRangeHasEvidenceStrength
                ? range.acmgClassification?.points
                  ? evidenceCodeClass(evidenceCodeForEvidenceStrength(range.acmgClassification?.points))
                  : ''
                : `mave-classification-${range.classification}`
            "
          >
            <span>{{ range.classification ? titleCase(range.classification) : 'Not Provided' }}</span>
          </td>
        </tr>
        <!-- Numeric interval row -->
        <tr v-if="sortedRanges.length > 0">
          <th class="mavedb-calibration-row-header" scope="row">Numeric interval</th>
          <td v-for="range in sortedRanges" :key="range.label + '-interval'" class="monospaced-type">
            <span>
              {{ range.inclusiveLowerBound ? '[' : '('
              }}{{ range.range[0] !== null ? roundRangeBound(range.range[0]) : '-∞' }},
              {{ range.range[1] !== null ? roundRangeBound(range.range[1]) : '∞'
              }}{{ range.inclusiveUpperBound ? ']' : ')' }}
            </span>
          </td>
        </tr>
        <!-- Evidence strength row (criterion + strength) -->
        <tr v-if="anyRangeHasEvidenceCode">
          <th class="mavedb-calibration-row-header" scope="row">Evidence strength</th>
          <td
            v-for="range in sortedRanges"
            :key="range.label + '-evidence-code'"
            :class="
              range.acmgClassification?.evidenceStrength
                ? `mave-evidence-code-${range.acmgClassification?.criterion}_${range.acmgClassification?.evidenceStrength?.toUpperCase()}`
                : '' + ' monospaced-type'
            "
          >
            <span v-if="range.acmgClassification?.evidenceStrength">
              {{ range.acmgClassification.criterion }}_{{ range.acmgClassification.evidenceStrength.toUpperCase() }}
            </span>
            <span v-else> — </span>
          </td>
        </tr>
        <!-- OddsPaths ratio row -->
        <tr v-if="anyRangeHasOddsPaths">
          <th class="mavedb-calibration-row-header" scope="row">OddsPaths ratio</th>
          <td v-for="range in sortedRanges" :key="range.label + '-oddspaths'">
            <template v-if="range.oddspathsRatio">
              <span class="monospaced-type">{{ roundOddsPath(range.oddspathsRatio) }}</span>
            </template>
            <span v-else> — </span>
          </td>
        </tr>
        <!-- PLR row (conditional) -->
        <tr v-if="anyRangeHasPLR">
          <th class="mavedb-calibration-row-header" scope="row">Positive Likelihood Ratio (PLR)</th>
          <td v-for="range in sortedRanges" :key="range.label + '-plr'">
            <span v-if="'positiveLikelihoodRatio' in range">{{ range.positiveLikelihoodRatio }}</span>
            <span v-else>Not Provided</span>
          </td>
        </tr>
        <!-- Evidence absence message (if ranges exist but no evidence details) -->
        <tr
          v-if="
            sortedRanges.length > 0 && !anyRangeHasEvidenceStrength && !anyRangeHasEvidenceCode && !anyRangeHasOddsPaths
          "
        >
          <td :colspan="dynamicScoreRangesColumnCount" style="text-align: center; font-style: italic; font-size: 0.9em">
            No evidence strengths have been reported for this calibration{{ scoreCalibration.notes ? '*' : '' }}.
          </td>
        </tr>
        <!-- Threshold sources row (if provided) -->
        <!-- Unified Sources row -->
        <tr v-if="hasAnySources">
          <td class="mavedb-calibration-sources-cell" :colspan="dynamicScoreRangesColumnCount">
            <!-- Threshold sources group -->
            <template v-if="scoreCalibration.thresholdSources && scoreCalibration.thresholdSources.length > 0">
              <span aria-label="Threshold sources" class="sources-group" role="group">
                <PrimeButton
                  v-tooltip.left="{
                    value:
                      'The threshold source(s) describes the source of the score threshold used in this calibration.',
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
            <template
              v-if="scoreCalibration.classificationSources && scoreCalibration.classificationSources.length > 0"
            >
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
          </td>
        </tr>
        <!-- Empty state row -->
        <tr v-if="sortedRanges.length === 0">
          <td
            class="mave-classification-not_provided"
            :colspan="baselineScoreIsDefined ? dynamicScoreRangesColumnCount + 1 : dynamicScoreRangesColumnCount"
            style="text-align: center; font-style: italic"
          >
            Ranges have not been provided{{ scoreCalibration.notes ? '*' : '' }}.
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="scoreCalibration.notes" class="mavedb-calibration-caption-notes">*{{ scoreCalibration.notes }}</div>
  </div>
</template>

<script lang="ts">
import PrimeButton from 'primevue/button'
import {defineComponent, PropType} from 'vue'

import {shortCitationForPublication} from '@/lib/publication'
import {EVIDENCE_STRENGTHS_REVERSED, PersistedScoreCalibration, FunctionalRange} from '@/lib/calibrations'

export default defineComponent({
  name: 'CalibrationTable',

  components: {PrimeButton},

  props: {
    scoreCalibration: {
      type: Object as PropType<PersistedScoreCalibration>,
      required: true
    },
    scoreCalibrationName: {
      type: String as PropType<string | undefined | null>,
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
      return this.scoreCalibration?.functionalRanges?.some(
        (r: FunctionalRange) => r.acmgClassification && 'points' in r.acmgClassification
      )
    },
    anyRangeHasEvidenceCode(): boolean {
      return this.scoreCalibration?.functionalRanges?.some(
        (r: FunctionalRange) => r.acmgClassification?.evidenceStrength
      )
    },
    anyRangeHasOddsPaths(): boolean {
      return this.scoreCalibration?.functionalRanges?.some((r: FunctionalRange) => r.oddspathsRatio !== undefined)
    },
    anyRangeHasPLR(): boolean {
      return this.scoreCalibration?.functionalRanges?.some((r: FunctionalRange) => 'positiveLikelihoodRatio' in r)
    },
    dynamicScoreRangesColumnCount(): number {
      // 1 header column + number of range columns
      const rangeCount = this.scoreCalibration?.functionalRanges?.length || 0
      return 1 + rangeCount
    },
    hasAnySources(): boolean {
      return !!(
        (this.scoreCalibration.thresholdSources && this.scoreCalibration.thresholdSources.length > 0) ||
        (this.scoreCalibration.methodSources && this.scoreCalibration.methodSources.length > 0) ||
        (this.scoreCalibration.classificationSources && this.scoreCalibration.classificationSources.length > 0)
      )
    },
    normalRanges() {
      if (!this.scoreCalibration.functionalRanges) {
        return []
      }
      return this.scoreCalibration.functionalRanges
        .filter((range) => {
          return range.classification === 'normal'
        })
        .sort(this.comparescoreCalibration)
    },
    abnormalRanges() {
      if (!this.scoreCalibration.functionalRanges) {
        return []
      }
      return this.scoreCalibration.functionalRanges
        .filter((range) => {
          return range.classification === 'abnormal'
        })
        .sort(this.comparescoreCalibration)
    },
    unspecifiedRanges() {
      if (!this.scoreCalibration.functionalRanges) {
        return []
      }
      return this.scoreCalibration.functionalRanges
        .filter((range) => {
          return range.classification === 'not_specified'
        })
        .sort(this.comparescoreCalibration)
    },
    sortedRanges() {
      if (!this.scoreCalibration.functionalRanges) {
        return []
      }
      return [...this.scoreCalibration.functionalRanges].sort(this.comparescoreCalibration)
    },
    baselineScoreIsDefined() {
      return this.scoreCalibration.baselineScore !== null && this.scoreCalibration.baselineScore !== undefined
    }
  },

  methods: {
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
    evidenceCodeClass(evidenceCode: string | undefined) {
      const sanitizedEvidenceCode = evidenceCode?.replace('+', '_PLUS') ?? 'NONE'
      return `mave-evidence-code-${sanitizedEvidenceCode}`
    },
    evidenceCodeForEvidenceStrength(evidenceStrength: number | undefined): string | undefined {
      return evidenceStrength ? EVIDENCE_STRENGTHS_REVERSED[evidenceStrength] || undefined : undefined
    },
    titleCase(s: string) {
      return s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 $2')
    },
    roundOddsPath(rangeBound: number) {
      return rangeBound.toPrecision(3)
    },
    roundRangeBound(rangeBound: number) {
      return rangeBound.toPrecision(3)
    }
  }
})
</script>

<style scoped>
/* Unified calibration table styling */
table.mavedb-calibration-table {
  border-collapse: collapse;
  margin: 0.5em auto 0.5em auto;
  line-height: normal;
  border: 1px solid gray;
  width: 100%;
}

.mavedb-calibration-caption {
  caption-side: top;
  text-align: center;
  font-weight: 600;
  font-size: 1.25em;
  padding: 0.4em 0.2em;
  background: #f0f0f0;
  border-top: 1px solid gray;
  border-left: 1px solid gray;
  border-right: 1px solid gray;
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

.mavedb-calibration-row-header {
  font-weight: bold;
  text-align: left;
  background-color: #fafafa;
  white-space: nowrap;
}

table.mavedb-calibration-table td,
table.mavedb-calibration-table th {
  border: 1px solid gray;
  padding: 0.5em 1em;
  text-align: center;
  vertical-align: middle;
}

/* Unified sources row styling */
/* More specific selector to override generic td center alignment */
table.mavedb-calibration-table td.mavedb-calibration-sources-cell {
  text-align: left;
  font-size: 0.85em;
  line-height: 1.5;
  background: #f9f9f9;
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
.mavedb-calibration-sources-cell .sources-separator {
  margin: 0 0.15em;
  color: #666;
  font-weight: 600;
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
  font-weight: bold;
}

.mave-evidence-code-PS3_STRONG {
  background-color: #b85c6b;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE_PLUS {
  background-color: #ca7682;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE {
  background-color: #d68f99;
  font-weight: bold;
}

.mave-evidence-code-PS3_SUPPORTING {
  background-color: #e6b1b8;
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
  font-weight: bold;
}

.mave-evidence-code-BS3_STRONG {
  background-color: #7ab5d1;
  font-weight: bold;
}

.mave-evidence-code-BS3_VERY_STRONG {
  background-color: #4b91a6;
  font-weight: bold;
}

.mave-evidence-code-INDETERMINATE {
  background-color: #e0e0e0;
  font-weight: bold;
}

/* Monospace (or at least tabular) numerals for ranges and OddsPath ratios */
.monospaced-type,
.monospaced-type > span {
  /* Prefer true monospace; fall back gracefully */
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
  /* If a proportional UI font still leaks in, force tabular digits */
  font-variant-numeric: tabular-nums;
}

/* Tooltips */

.mavedb-help-tooltip-button {
  margin-left: 0.6rem;
  height: 0.5rem;
  width: 0.5rem;
  vertical-align: middle;
  /* Remove extra vertical margin/padding if any. */
  margin-top: 0;
  margin-bottom: 0;
  /* Ensure that button is inline with text. */
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

/* Accordion style overrides for blending with background */
.p-accordion:deep(.p-accordion-header .p-accordion-header-link) {
  background: none;
}
.p-accordion:deep(.p-accordion-tab) {
  border: black 1px solid;
}
.p-accordion:deep(.p-accordion-tab-active) {
  border-top: black 1px solid;
  border-left: black 1px solid;
  border-right: black 1px solid;
}
.p-accordion:deep(.p-accordion-content) {
  border-bottom: black 1px solid;
  background: none;
}
</style>
