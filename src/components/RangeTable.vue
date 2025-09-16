<template>
    <Accordion expandIcon="pi pi-plus" collapseIcon="pi pi-minus">
        <AccordionTab header="Score Range Details" class="mave-range-table-tab">
            <div v-if="range">
                <div class="mavedb-ranges-title">{{ "Details for `" + rangeName + "` ranges" }}</div>
                <div v-if="range.baselineScore !== null && range.baselineScore !== undefined" class="mavedb-ranges-baseline-score">
                    <span>Baseline Score: <strong>{{ roundRangeBound(range.baselineScore) }}</strong></span>
                    <span v-if="range.baselineScoreDescription">
                        <Button
                            class="p-button-help p-description-tooltip-button"
                            v-tooltip.right="{ value: range.baselineScoreDescription, autoHide: false }"
                            icon="pi pi-info"
                            aria-label="Info"
                            rounded outlined
                        />
                    </span>
                </div>
                <div class="mavedb-ranges-grid" v-if="range">
                    <div v-for="range in sortedRanges" :key="range.label" class="mavedb-ranges-row" style="">
                        <div>
                            <span>{{ range.label }}</span>
                            <span v-if="range.description">
                                <Button
                                    class="p-button-help p-description-tooltip-button"
                                    v-tooltip.right="{ value: range.description, autoHide: false }"
                                    icon="pi pi-info"
                                    aria-label="Info"
                                    rounded outlined
                                />
                            </span>
                        </div>
                        <div
                            v-if="sortedRanges.some((r: ScoreRange) => 'evidenceStrength' in r)"
                            :class="evidenceCodeClass(evidenceCodeForEvidenceStrength(range.evidenceStrength))"
                        >
                            <span v-if="'evidenceStrength' in range">{{ evidenceCodeForEvidenceStrength(range.evidenceStrength) }}</span>
                            <span v-else>Not Provided</span>
                        </div>
                        <div v-else :class="`mave-classification-${range.classification}`">
                            <span>{{ titleCase(range.classification) }}</span>
                        </div>
                        <div>
                            <span>
                                {{ range.inclusiveLowerBound ? '[' : '(' }}{{ range.range[0] !== null ? roundRangeBound(range.range[0]) : "-∞" }}, {{ range.range[1] !== null ? roundRangeBound(range.range[1]) : "∞" }}{{ range.inclusiveUpperBound ? ']' : ')' }}
                            </span>
                        </div>
                    </div>
                    <div v-if="sortedRanges.some((range: ScoreRange) => 'positiveLikelihoodRatio' in range)">
                        <span v-if="'positiveLikelihoodRatio' in range">{{ range.positiveLikelihoodRatio }}</span>
                        <span v-else>Not Provided</span>
                    </div>
                </div>
                <div v-if="matchSource(range.source)" class="mavedb-ranges-source">
                    <span>Source: <a :href="matchSource(range.source)?.url" target="_blank">{{ matchSource(range.source)?.url }}</a></span>
                </div>
            </div>
            <table class="mave-range-table" v-if="range && activeRangeHasOddsPath">
                <tbody v-if="activeRangeHasOddsPath">
                    <tr style="border: none;">
                        <td :colspan="totalRanges" style="border: none; background: transparent; height: 1em;"></td>
                    </tr>
                    <tr>
                        <td :colspan="totalRanges" style="text-align: center; font-weight: bold; background-color: #f0f0f0;">
                            <span>Odds Path Calculations</span>
                            <Button
                                class="p-button-help p-description-tooltip-button"
                                v-tooltip.right="{ value: 'An OddsPath calculation can be determined by evaluating previously classified control variants against the scores in normal and abnormal ranges for an assay. For additional information about OddsPath, please see <a href=\'https://pubmed.ncbi.nlm.nih.gov/31892348/\'>PubMed 31892348</a>.', escape: false, autoHide: false }"
                                icon="pi pi-info"
                                aria-label="Info"
                                rounded outlined
                            />
                        </td>
                    </tr>
                    <tr>
                        <td v-if="abnormalRanges.length" :colspan="abnormalRanges.length">Odds Path Abnormal</td>
                        <td v-if="normalRanges.length" :colspan="normalRanges.length">Odds Path Normal</td>
                        <td v-if="unspecifiedRanges.length" :colspan="unspecifiedRanges.length">N/A</td>
                    </tr>
                    <tr>
                        <td v-for="range in sortedRanges" :class="`mave-evidence-code-${range.oddsPath?.evidence}`" :key="range.label">
                            <span v-if="range.oddsPath?.evidence">{{ range.oddsPath.evidence }}</span>
                            <span v-else-if="range.classification == 'not_specified'">N/A</span>
                            <span v-else>Not Provided</span>
                        </td>
                    </tr>
                    <tr>
                        <td v-for="range in sortedRanges" :key="range.label">
                            <span v-if="range.oddsPath?.ratio">{{ range.oddsPath.ratio }}</span>
                            <span v-else-if="range.classification == 'not_specified'">N/A</span>
                            <span v-else>Not Provided</span>
                        </td>
                    </tr>
                    <tr v-if="matchSource(range.oddsPathSource)">
                        <td :colspan="totalRanges">
                            <span>Source: <a :href="matchSource(range.oddsPathSource)?.url" target="_blank">{{ matchSource(range.oddsPathSource)?.url }}</a></span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </AccordionTab>
    </Accordion>

</template>

<script lang="ts">
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import { defineComponent } from 'vue';
import { ScoreRanges, ScoreRange, EVIDENCE_STRENGTHS, EVIDENCE_STRENGTHS_REVERSED } from '@/lib/ranges';

export default defineComponent({
  name: 'RangeTable',
  components: {  Accordion, AccordionTab, Button, Dropdown },
  props: {
    range: {
      type: Object as () => ScoreRanges | null,
      required: true
    },
    rangeName: {
      type: String as () => string | undefined,
      required: true
    },
    sources: {
      type: Array<{ dbName: string; identifier: string; url: string }>,
      required: false,
      default: () => []
    }
  },
  emits: ['rangeSelected'],
  data() {
    return {
      activeRangeKey: null as { label: string; value: string } | null
    }
  },
  computed: {
    activeRangeHasOddsPath() {
        return this.range && this.range.ranges.some(range => range.oddsPath && range.oddsPath.ratio !== undefined);
    },
    normalRanges() {
        if (!this.range) return [];
        return this.range.ranges.filter(range => {
            return range.classification === 'normal';
        }).sort((a, b) => this.sortScoreRangeByEvidence(a, b));
    },
    abnormalRanges() {
        if (!this.range) return [];
        return this.range.ranges.filter(range => {
            return range.classification === 'abnormal';
        }).sort((a, b) => this.sortScoreRangeByEvidence(a, b));
    },
    unspecifiedRanges() {
        if (!this.range) return [];
        return this.range.ranges.filter(range => {
            return range.classification === 'not_specified';
        }).sort((a, b) => this.sortScoreRangeByEvidence(a, b));
    },
    totalRanges() {
        if (!this.range) return 0;
        return (this.abnormalRanges.length + this.normalRanges.length + this.unspecifiedRanges.length);
    },
    sortedRanges() {
        if (!this.range) return [];
        return this.normalRanges.concat(this.abnormalRanges).concat(this.unspecifiedRanges);
    }
  },
  methods: {
    titleCase(s: string) {
    return s
      .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
      .replace(/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    },
    matchSource(sourceArr: Array<{ dbName: string; identifier: string }> | undefined): { dbName: string; identifier: string; url: string } | null {
      if (!Array.isArray(sourceArr) || !this.sources) return null
      for (const source of sourceArr) {
        const match = this.sources.find(s => s.dbName === source.dbName && s.identifier === source.identifier)
        if (match) return match
      }
      return null
    },
    sortScoreRangeByEvidence(a: ScoreRange, b: ScoreRange): number {
        if (a.evidenceStrength && b.evidenceStrength) {
            return a.evidenceStrength - b.evidenceStrength;
        } else if (a.oddsPath?.evidence && b.oddsPath?.evidence) {
            return EVIDENCE_STRENGTHS[a.oddsPath.evidence] - EVIDENCE_STRENGTHS[b.oddsPath.evidence];
        } else if (a.evidenceStrength || a.oddsPath?.evidence) {
            return -1; // a has evidence, b does not
        } else if (b.evidenceStrength || b.oddsPath?.evidence) {
            return 1; // b has evidence, a does not
        }
        return 0;
    },
    evidenceCodeForEvidenceStrength(evidenceStrength: number | undefined): string | undefined {
        return evidenceStrength ? EVIDENCE_STRENGTHS_REVERSED[evidenceStrength] || undefined : undefined;
    },
    evidenceCodeClass(evidenceCode: string | undefined) {
        const sanitizedEvidenceCode = evidenceCode?.replace('+', '_PLUS') ?? 'NONE'
        return `mave-evidence-code-${sanitizedEvidenceCode}`
    },
    roundRangeBound(rangeBound: number) {
        return rangeBound.toPrecision(3)
    }
  }
})
</script>

<style scoped>
.range-table-container {
  display: flex;
  flex-direction: column;
  gap: 2em;
}

.range-table-dropdown-row {
  margin-bottom: 1em;
}
table.range-table {
  border-collapse: collapse;
  margin: 1em auto 0.5em auto;
  min-width: 350px;
}
table.range-table td,
table.range-table th {
  border: 1px solid gray;
  padding: 0.5em 1em;
  text-align: left;
}

/* Classification colors */
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
    background-color: #a6a600;
    color: white;
    font-weight: bold;
}

/* Evidence strength */

table.mave-range-table {
    border-collapse: collapse;
    margin: 1em auto 0.5em auto;
    line-height: normal;
}

table.mave-range-table td,
table.mave-range-table th {
    border: 1px solid gray;
    padding: 0.5em 1em;
    text-align: center;
}

.mave-evidence-code-PS3_VERY_STRONG {
    background-color: #943744;
    font-weight: bold;
}

.mave-evidence-code-PS3_STRONG {
    background-color: #b85c6b; /*D68F99;*/
    font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE_PLUS {
    background-color: #ca7682; /*#E6B1B8;*/
    font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE {
    background-color: #d68f99; /*#F0D0D5;*/
    font-weight: bold;
}

.mave-evidence-code-PS3_SUPPORTING {
    background-color: #e6b1b8; /*F7E4E7;*/
    font-weight: bold;
}

.mave-evidence-code-BS3_VERY_STRONG {
    background-color: #4b91a6; /*#7AB5D1;*/
    font-weight: bold;
}

.mave-evidence-code-BS3_STRONG {
    background-color: #7ab5d1; /*#E4F1F6;*/
    font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE_PLUS {
    background-color: #99c8dc; /*#EDF6FA;*/
    font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE {
    background-color: #d0e8f0; /*#F4F9FC;*/
    font-weight: bold;
}

.mave-evidence-code-BS3_SUPPORTING {
    background-color: #e4f1f6; /*#F9FCFE;*/
    font-weight: bold;
}

.mave-evidence-code-INDETERMINATE {
    background-color: #e0e0e0; /*#c3cbde;*/
    font-weight: bold;
}

.mave-evidence-code-NONE {
    background-color: #e0e0e0;
    font-weight: bold;
}

.p-description-tooltip-button {
    margin-left: .6rem;
    height: .5rem;
    width: .5rem;
    vertical-align: middle;
    /* Remove extra vertical margin/padding if any */
    margin-top: 0;
    margin-bottom: 0;
    /* Ensure button is inline with text */
    display: inline-flex;
    align-items: center;
    background: none;
}
.p-description-tooltip-button:focus,
.p-description-tooltip-button:active,
.p-description-tooltip-button.p-focus {
    background: none;
}

.p-description-tooltip-button:deep( .p-button-icon) {
    font-size: .5rem;
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

.mave-active-range-selector {
    width: fit-content;
    margin-left: 1em;
    margin-right: 1em;
    background: transparent;
}

/* Score ranges grid */

.mavedb-ranges-title {
    text-align: center;
    font-weight: bold;
    background: rgb(240, 240, 240);
    border: 1px solid gray;
}

.mavedb-ranges-baseline-score,
.mavedb-ranges-source {
    text-align: center;
    border: 1px solid gray;
}

.mavedb-ranges-grid {
    display: grid;
    box-sizing: border-box;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    justify-content: center;
    border-collapse: collapse;
    grid-gap: 1px;
    row-gap: 20px;
}

.mavedb-ranges-grid div {
    text-align: center;
    box-shadow:0 0 0 1px gray;
    white-space: nowrap;
}

</style>
