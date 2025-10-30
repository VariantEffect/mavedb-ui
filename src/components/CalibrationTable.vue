<template>
  <div>
    <div class="mavedb-score-ranges-title">{{ scoreCalibrationName ?? 'Score ranges' }}</div>
    <div
      v-if="scoreCalibration.baselineScore !== null && scoreCalibration.baselineScore !== undefined"
      class="mavedb-score-ranges-baseline-score"
    >
      <span
        >Baseline Score:
        <span class="monospaced-type">{{ roundRangeBound(scoreCalibration.baselineScore) }}</span></span
      >
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
    <div class="mavedb-score-ranges-grid">
      <template v-if="sortedRanges.length > 0">
        <div v-for="range in sortedRanges" :key="range.label" class="mavedb-score-ranges-row" style="">
          <div>
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
          <div
            v-if="sortedRanges.some((r: FunctionalRange) => r.acmgClassification && 'points' in r.acmgClassification)"
            :class="
              range.acmgClassification?.points
                ? evidenceCodeClass(evidenceCodeForEvidenceStrength(range.acmgClassification?.points))
                : ''
            "
          >
            <span v-if="range.acmgClassification && 'points' in range.acmgClassification">{{
              range.acmgClassification.points
                ? evidenceCodeForEvidenceStrength(range.acmgClassification?.points)
                : 'Not Provided'
            }}</span>
            <span v-else>Not Provided</span>
          </div>
          <div v-else :class="`mave-classification-${range.classification}`">
            <span>{{ range.classification ? titleCase(range.classification) : 'Not Provided' }}</span>
          </div>
          <div class="monospaced-type">
            <span>
              {{ range.inclusiveLowerBound ? '[' : '('
              }}{{ range.range[0] !== null ? roundRangeBound(range.range[0]) : '-∞' }},
              {{ range.range[1] !== null ? roundRangeBound(range.range[1]) : '∞'
              }}{{ range.inclusiveUpperBound ? ']' : ')' }}
            </span>
          </div>
          <div v-if="sortedRanges.some((range: FunctionalRange) => 'positiveLikelihoodRatio' in range)">
            <span v-if="'positiveLikelihoodRatio' in range">PLR: {{ range.positiveLikelihoodRatio }}</span>
            <span v-else>Not Provided</span>
          </div>
        </div>
      </template>
      <div v-else class="mave-classification-not_provided">
        <span style="text-align: center; font-style: italic"> Ranges have not been provided. </span>
      </div>
    </div>
    <div
      v-if="scoreCalibration.thresholdSources && scoreCalibration.thresholdSources.length > 0"
      class="mavedb-score-ranges-citation"
    >
      <PrimeButton
        v-tooltip.left="{
          value: 'Threshold sources describe the source of the functional ranges.',
          autoHide: false
        }"
        aria-label="Info"
        class="p-button-help mavedb-help-tooltip-button"
        icon="pi pi-info"
        outlined
        rounded
      />
      Threshold source(s):
      <span v-for="(source, i) in scoreCalibration.thresholdSources" :key="source.dbName + ':' + source.identifier">
        <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
        ><span v-if="i < scoreCalibration.thresholdSources.length - 1">, </span>
      </span>
    </div>
  </div>
  <table v-if="activeRangeHasEvidenceStrength" class="mavedb-odds-path-table">
    <tbody v-if="activeRangeHasEvidenceStrength">
      <tr style="border: none">
        <td
          :colspan="sortedRangesWithClassification.length"
          style="border: none; background: transparent; height: 1em"
        ></td>
      </tr>
      <tr>
        <td
          :colspan="sortedRangesWithClassification.length"
          style="text-align: center; font-weight: bold; background-color: #f0f0f0"
        >
          <span>Reported Evidence Strengths</span>
        </td>
      </tr>
      <tr v-if="scoreCalibration.methodSources && scoreCalibration.methodSources.length > 0">
        <td :colspan="sortedRangesWithClassification.length">
          <PrimeButton
            v-tooltip.left="{
              value:
                'Method sources describe the method by which evidence strengths were obtained.',
              autoHide: false
            }"
            aria-label="Info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
          Method source(s):
          <span v-for="(source, i) in scoreCalibration.methodSources" :key="source.dbName + ':' + source.identifier">
            <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
            ><span v-if="i < scoreCalibration.methodSources.length - 1">, </span>
          </span>
        </td>
      </tr>
      <tr>
        <td v-for="range in sortedRangesWithClassification" :key="range.label">
          <span
            >Evidence strength for `<strong>{{ range.label }}</strong
            >`</span
          >
        </td>
      </tr>
      <tr>
        <td
          v-for="range in sortedRangesWithClassification"
          :key="range.label"
          :class="
            range.acmgClassification
              ? `mave-evidence-code-${range.acmgClassification?.criterion}_${range.acmgClassification?.evidenceStrength?.toUpperCase()}`
              : '' + ' monospaced-type'
          "
        >
          <span v-if="range.acmgClassification?.evidenceStrength"
            >{{ range.acmgClassification.criterion }}_{{
              range.acmgClassification.evidenceStrength.toUpperCase()
            }}</span
          >
          <span v-else> — </span>
        </td>
      </tr>
      <tr>
        <td v-for="range in sortedRangesWithClassification" :key="range.label">
          <template v-if="range.oddspathsRatio"
            >OddsPaths ratio: <span class="monospaced-type">{{ roundOddsPath(range.oddspathsRatio) }}</span></template
          >
          <span v-else> — </span>
        </td>
      </tr>
      <tr v-if="scoreCalibration.classificationSources && scoreCalibration.classificationSources.length > 0">
        <td :colspan="sortedRangesWithClassification.length">
          <PrimeButton
            v-tooltip.left="{
              value: 'Calculation sources describe the source of the evidence strength for each functional range.',
              autoHide: false
            }"
            aria-label="Info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
          Calculation source(s):
          <span
            v-for="(source, i) in scoreCalibration.classificationSources"
            :key="source.dbName + ':' + source.identifier"
          >
            <a :href="source.url" target="_blank">{{ shortCitationForPublication(source) }}</a
            ><span v-if="i < scoreCalibration.classificationSources.length - 1">, </span>
          </span>
        </td>
      </tr>
    </tbody>
  </table>
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
    activeRangeHasEvidenceStrength() {
      return (
        this.scoreCalibration &&
        this.scoreCalibration.functionalRanges &&
        this.scoreCalibration.functionalRanges.some((range) => range.acmgClassification !== undefined)
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
    sortedRangesWithClassification() {
      return this.sortedRanges.filter((range) => range.classification !== 'not_specified')
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
/* Score ranges text */

.mavedb-score-ranges-title {
  text-align: center;
  font-weight: bold;
  background: rgb(240, 240, 240);
  border: 1px solid gray;
}

.mavedb-score-ranges-baseline-score,
.mavedb-score-ranges-citation {
  text-align: center;
  border: 1px solid gray;
}

/* Score ranges grid */

.mavedb-score-ranges-grid {
  display: grid;
  box-sizing: border-box;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  justify-content: center;
  border-collapse: collapse;
  grid-gap: 1px;
  row-gap: 20px;
}

.mavedb-score-ranges-grid div {
  text-align: center;
  box-shadow: 0 0 0 1px gray;
  white-space: nowrap;
}

/* Odds of Pathogenicity (OddsPath) table */

table.mavedb-odds-path-table {
  border-collapse: collapse;
  margin: 1em auto 0.5em auto;
  line-height: normal;
}

table.mavedb-odds-path-table td,
table.mavedb-odds-path-table th {
  border: 1px solid gray;
  padding: 0.5em 1em;
  text-align: center;
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
