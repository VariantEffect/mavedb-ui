<template>
  <div>
    <div class="mavedb-score-ranges-title">{{ scoreRangesName ?? 'Score ranges' }}</div>
    <div
      v-if="scoreRanges.baselineScore !== null && scoreRanges.baselineScore !== undefined"
      class="mavedb-score-ranges-baseline-score"
    >
      <span
        >Baseline Score: <strong>{{ roundRangeBound(scoreRanges.baselineScore) }}</strong></span
      >
      <span v-if="scoreRanges.baselineScoreDescription">
        <Button
          v-tooltip.right="{value: scoreRanges.baselineScoreDescription, autoHide: false}"
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
              <Button
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
            v-if="sortedRanges.some((r: ScoreRange) => 'evidenceStrength' in r)"
            :class="evidenceCodeClass(evidenceCodeForEvidenceStrength(range.evidenceStrength))"
          >
            <span v-if="'evidenceStrength' in range">{{
              evidenceCodeForEvidenceStrength(range.evidenceStrength)
            }}</span>
            <span v-else>Not Provided</span>
          </div>
          <div v-else :class="`mave-classification-${range.classification}`">
            <span>{{ titleCase(range.classification) }}</span>
          </div>
          <div>
            <span>
              {{ range.inclusiveLowerBound ? '[' : '('
              }}{{ range.range[0] !== null ? roundRangeBound(range.range[0]) : '-∞' }},
              {{ range.range[1] !== null ? roundRangeBound(range.range[1]) : '∞'
              }}{{ range.inclusiveUpperBound ? ']' : ')' }}
            </span>
          </div>
          <div v-if="sortedRanges.some((range: ScoreRange) => 'positiveLikelihoodRatio' in range)">
            <span v-if="'positiveLikelihoodRatio' in range">PLR: {{ range.positiveLikelihoodRatio }}</span>
            <span v-else>Not Provided</span>
          </div>
        </div>
      </template>
      <div v-else class="mave-classification-not_provided">
        <span style="text-align: center; font-style: italic"> Ranges have not been provided. </span>
      </div>
    </div>
    <div v-if="thresholdSources" class="mavedb-score-ranges-citation">
      Source(s):
      <span v-for="(source, i) in thresholdSources" :key="source.dbName + ':' + source.identifier">
        <a :href="source.url" target="_blank">{{ source.url }}</a><span v-if="i < thresholdSources.length - 1">, </span>
      </span>
    </div>
  </div>
  <table v-if="activeRangeHasOddsPath" class="mavedb-odds-path-table">
    <tbody v-if="activeRangeHasOddsPath">
      <tr style="border: none">
        <td :colspan="sortedRanges.length" style="border: none; background: transparent; height: 1em"></td>
      </tr>
      <tr>
        <td :colspan="sortedRanges.length" style="text-align: center; font-weight: bold; background-color: #f0f0f0">
          <span>Odds Path Calculations</span>
          <Button
            v-tooltip.right="{
              value:
                'An OddsPath calculation can be determined by evaluating previously classified control variants against the scores in normal and abnormal ranges for an assay. For additional information about OddsPath, please see <a href=\'https://pubmed.ncbi.nlm.nih.gov/31892348/\'>PubMed 31892348</a>.',
              escape: false,
              autoHide: false
            }"
            aria-label="Info"
            class="p-button-help mavedb-help-tooltip-button"
            icon="pi pi-info"
            outlined
            rounded
          />
        </td>
      </tr>
      <tr>
        <td v-for="range in sortedRanges" :key="range">
          <span v-if="range.classification == 'abnormal'">Odds Path Abnormal</span>
          <span v-else-if="range.classification == 'normal'">Odds Path Normal</span>
          <span v-else>N/A</span>
        </td>
        <!-- <td v-if="abnormalRanges.length" :colspan="abnormalRanges.length">Odds Path Abnormal</td>
        <td v-if="normalRanges.length" :colspan="normalRanges.length">Odds Path Normal</td>
        <td v-if="unspecifiedRanges.length" :colspan="unspecifiedRanges.length">N/A</td> -->
      </tr>
      <tr>
        <td v-for="range in sortedRanges" :key="range.label" :class="`mave-evidence-code-${range.oddsPath?.evidence}`">
          <span v-if="range.oddsPath?.evidence">{{ range.oddsPath.evidence }}</span>
          <span v-else-if="range.classification == 'not_specified'">N/A</span>
          <span v-else>Not Provided</span>
        </td>
      </tr>
      <tr>
        <td v-for="range in sortedRanges" :key="range.label">
          <span v-if="range.oddsPath?.ratio">{{ roundOddsPath(range.oddsPath.ratio) }}</span>
          <span v-else-if="range.classification == 'not_specified'">N/A</span>
          <span v-else>Not Provided</span>
        </td>
      </tr>
      <tr v-if="oddsPathSources">
        <td :colspan="sortedRanges.length">
          Source(s):
          <span v-for="(source, i) in oddsPathSources" :key="source.dbName + ':' + source.identifier">
            <a :href="source.url" target="_blank">{{ source.url }}</a><span v-if="i < oddsPathSources.length - 1">, </span>
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import Button from 'primevue/button'
import {defineComponent, PropType} from 'vue'

import {EVIDENCE_STRENGTHS_REVERSED, ScoreRanges, ScoreRange} from '@/lib/ranges'
import {matchSources} from '@/lib/score-sets'
import {components} from '@/schema/openapi'

type PublicationIdentifiers = components['schemas']['ScoreSet']['primaryPublicationIdentifiers'][0]

export default defineComponent({
  name: 'RangeTable',

  components: {Button},

  props: {
    scoreRanges: {
      type: Object as PropType<ScoreRanges>,
      required: true
    },
    scoreRangesName: {
      type: String as PropType<string | undefined | null>,
      required: true
    },
    sources: {
      type: Array as PropType<PublicationIdentifiers[]>,
      required: false,
      default: () => []
    }
  },

  emits: ['rangeSelected'],

  data() {
    return {
      activeRangeKey: null as {label: string; value: string} | null
    }
  },

  computed: {
    activeRangeHasOddsPath() {
      return (
        this.scoreRanges &&
        this.scoreRanges.ranges.some((range) => range.oddsPath && range.oddsPath.ratio !== undefined)
      )
    },
    normalRanges() {
      return this.scoreRanges.ranges
        .filter((range) => {
          return range.classification === 'normal'
        })
        .sort(this.compareScoreRanges)
    },
    abnormalRanges() {
      return this.scoreRanges.ranges
        .filter((range) => {
          return range.classification === 'abnormal'
        })
        .sort(this.compareScoreRanges)
    },
    unspecifiedRanges() {
      return this.scoreRanges.ranges
        .filter((range) => {
          return range.classification === 'not_specified'
        })
        .sort(this.compareScoreRanges)
    },
    sortedRanges() {
      return [...this.scoreRanges.ranges].sort(this.compareScoreRanges)
    },
    thresholdSources() {
      return matchSources(this.scoreRanges.source, this.sources)
    },
    oddsPathSources() {
      return matchSources(this.scoreRanges.oddsPathSource, this.sources)
    }
  },

  methods: {
    compareScoreRanges(a: ScoreRange, b: ScoreRange): number {
      let result = this.compareScores(a.range[0], b.range[0], true)
      if (result == 0) {
        result = this.compareScores(a.range[1], b.range[1], false)
      }
      return result
    },
    compareScores(a: number | undefined, b: number | undefined, infinityIsNegative: boolean = false) {
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

.mave-evidence-code-NONE {
  background-color: #e0e0e0;
  font-weight: bold;
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
