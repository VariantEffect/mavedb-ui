<template>
  <div class="overflow-hidden rounded-lg border border-border bg-surface">
    <!-- Title bar -->
    <div class="flex items-center gap-3 border-b border-border bg-bg px-3.5 py-3 text-lg font-bold text-sage">
      {{ calibrationNameToDisplay }}
    </div>

    <!-- Baseline score -->
    <div class="flex items-center gap-3 border-b border-border bg-bg px-4 py-2.5">
      <span
        v-tooltip.top="{
          value: 'The reference score representing normal function, used as the zero-point for calibration ranges.',
          autoHide: false
        }"
        class="cursor-help border-b border-dashed border-border text-xs font-bold uppercase tracking-wide text-text-muted"
        >Baseline score</span
      >
      <template v-if="baselineScoreIsDefined">
        <span class="font-mono text-base font-bold text-text-primary">{{
          roundForCalibrationTable(scoreCalibration.baselineScore || 0)
        }}</span>
        <span class="h-[18px] w-px bg-border"></span>
        <span v-if="scoreCalibration.baselineScoreDescription" class="text-xs text-text-muted">{{
          scoreCalibration.baselineScoreDescription
        }}</span>
        <span v-else class="text-xs italic text-text-muted/60">No description provided by author</span>
      </template>
      <span v-else class="text-xs italic text-text-muted/60">N/A</span>
    </div>

    <!-- Range table chunks -->
    <template v-if="sortedRanges.length > 0">
      <table
        v-for="(chunk, chunkIndex) in rangeChunks"
        :key="`chunk-${chunkIndex}`"
        class="cal-grid"
        :class="{'cal-grid-last': chunkIndex === rangeChunks.length - 1, 'cal-grid-continuation': chunkIndex > 0}"
      >
        <tbody>
          <!-- Range label row (with column color bars) -->
          <tr>
            <td
              v-tooltip.top="{
                value: 'The descriptive name assigned to this score range by the calibration author.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Range label
            </td>
            <td
              v-for="range in chunk"
              :key="range.label"
              :class="[columnColorClass(range), {highlight: range.label === highlightedRangeLabel}]"
            >
              <span>{{ range.label }}</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-label-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Range description row (only when at least one range has a description) -->
          <tr v-if="anyRangeHasDescription">
            <td
              v-tooltip.top="{
                value: 'Author-provided description of what this score range represents.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Description
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-desc'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span v-if="range.description" class="text-xs text-text-muted">{{ range.description }}</span>
              <span v-else class="text-xs italic text-text-muted/60">No description provided by author</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-desc-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Classification row -->
          <tr>
            <td
              v-tooltip.top="{
                value:
                  'The functional classification (abnormal, normal, or not specified) assigned to variants falling in this range.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Classification
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-cl'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <MvClassificationTag
                v-if="range.functionalClassification"
                :classification="range.functionalClassification"
                :compact="true"
              />
              <span
                v-else
                class="inline-block rounded px-2.5 py-0.5 text-xs font-bold tracking-wide mave-classification-not_specified"
                >Not Provided</span
              >
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-cl-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Numeric interval row -->
          <tr v-if="!calibrationIsClassBased">
            <td
              v-tooltip.top="{
                value: 'The score boundaries defining this range, expressed as a mathematical interval.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Numeric interval
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-interval'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span class="interval-mono">
                {{ range.inclusiveLowerBound ? '[' : '('
                }}<template v-if="range.range?.[0] !== null">{{ roundForCalibrationTable(range.range![0]!) }}</template
                ><span v-else
                  ><span class="minus-symbol">&minus;</span><span class="infinity-symbol">&infin;</span></span
                >, <template v-if="range.range?.[1] !== null">{{ roundForCalibrationTable(range.range![1]!) }}</template
                ><span v-else class="infinity-symbol">&infin;</span>{{ range.inclusiveUpperBound ? ']' : ')' }}
              </span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-interval-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Class name row (class-based calibrations) -->
          <tr v-if="calibrationIsClassBased">
            <td class="row-label">Class name</td>
            <td
              v-for="range in chunk"
              :key="range.label + '-class'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span class="interval-mono">{{ range.class || '—' }}</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-class-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Evidence strength row -->
          <tr v-if="anyRangeHasEvidenceCode">
            <td
              v-tooltip.top="{
                value:
                  'The ACMG/AMP evidence code and strength level (e.g. PS3_Strong, BS3) for variants in this range.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Evidence strength
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-evidence'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <MvEvidenceTag
                v-if="range.acmgClassification?.evidenceStrength"
                :criterion="range.acmgClassification.criterion"
                :evidence-strength="range.acmgClassification.evidenceStrength"
              />
              <span v-else class="text-border">&mdash;</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-evidence-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- OddsPath ratio row -->
          <tr v-if="anyRangeHasOddsPaths">
            <td
              v-tooltip.top="{
                value:
                  'The odds of pathogenicity ratio derived from calibration data. Higher values indicate stronger evidence for pathogenicity.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              OddsPath ratio
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-oddspaths'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span v-if="range.oddspathsRatio" class="font-mono text-sm font-semibold text-text-primary">{{
                roundForCalibrationTable(range.oddspathsRatio)
              }}</span>
              <span v-else class="text-border">&mdash;</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-odds-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- PLR row -->
          <tr v-if="anyRangeHasPLR">
            <td
              v-tooltip.top="{
                value: 'Positive Likelihood Ratio — the ratio of the true positive rate to the false positive rate.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              PLR
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-plr'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span v-if="'positiveLikelihoodRatio' in range">{{ range.positiveLikelihoodRatio }}</span>
              <span v-else class="text-border">&mdash;</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-plr-${n}`"
              class="pad-cell"
            />
          </tr>

          <!-- Variant count row -->
          <tr>
            <td
              v-tooltip.top="{
                value: 'The number of variants from this score set that fall within this range.',
                autoHide: false
              }"
              class="row-label row-label-tip"
            >
              Variant count
            </td>
            <td
              v-for="range in chunk"
              :key="range.label + '-count'"
              :class="{highlight: range.label === highlightedRangeLabel}"
            >
              <span class="font-mono text-sm font-bold text-text-secondary">{{
                (range.variantCount ?? 0).toLocaleString()
              }}</span>
            </td>
            <td
              v-for="n in chunkIndex === rangeChunks.length - 1 ? lastChunkPadding : 0"
              :key="`pad-count-${n}`"
              class="pad-cell"
            />
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Evidence absence message -->
    <div
      v-if="
        sortedRanges.length > 0 && !anyRangeHasEvidenceStrength && !anyRangeHasEvidenceCode && !anyRangeHasOddsPaths
      "
      class="border-t border-border bg-bg px-4 py-3 text-center text-sm italic text-text-muted"
    >
      No evidence strengths have been reported for this calibration.
    </div>

    <!-- Empty state -->
    <div
      v-if="sortedRanges.length === 0"
      class="border-t border-border bg-bg px-4 py-3 text-center text-sm italic text-text-muted"
    >
      Ranges have not been provided.
    </div>

    <!-- Notes (author-provided context about this calibration) -->
    <div
      v-if="scoreCalibration.notes"
      class="flex items-start gap-2 border-t border-border bg-bg px-3.5 py-2.5 text-xs text-text-muted"
    >
      <i class="pi pi-info-circle mt-0.5 text-xs text-text-muted/60"></i>
      <span>{{ scoreCalibration.notes }}</span>
    </div>

    <!-- Sources -->
    <div
      v-if="hasAnySources"
      class="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-x-2 tablet:gap-y-1 border-t border-border bg-bg px-3.5 py-2.5 text-xs text-text-muted"
    >
      <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted tablet:mr-1">
        <i class="pi pi-book text-xs"></i>
        Sources
      </span>
      <div v-if="scoreCalibration.thresholdSources && scoreCalibration.thresholdSources.length > 0" class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          v-tooltip.top="{
            value: 'The threshold source(s) describes the source of the score threshold used in this calibration.',
            autoHide: false
          }"
          class="cursor-help border-b border-dashed border-border font-semibold text-text-secondary"
          >Thresholds</span
        >:
        <span
          v-for="(source, i) in scoreCalibration.thresholdSources"
          :key="'threshold:' + source.dbName + ':' + source.identifier"
        >
          <a class="text-xs font-medium" :href="source.url ?? undefined" target="_blank">{{
            shortCitationForPublication(source)
          }}</a
          ><span v-if="i < scoreCalibration.thresholdSources.length - 1">, </span>
        </span>
      </div>
      <span
        v-if="
          scoreCalibration.thresholdSources?.length &&
          (scoreCalibration.methodSources?.length || scoreCalibration.evidenceSources?.length)
        "
        class="hidden tablet:inline mx-0.5 text-border-light"
        >&mdash;</span
      >
      <div v-if="scoreCalibration.methodSources && scoreCalibration.methodSources.length > 0" class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          v-tooltip.top="{
            value: 'The method source(s) describe the method by which evidence strengths were obtained.',
            autoHide: false
          }"
          class="cursor-help border-b border-dashed border-border font-semibold text-text-secondary"
          >Method</span
        >:
        <span
          v-for="(source, i) in scoreCalibration.methodSources"
          :key="'method:' + source.dbName + ':' + source.identifier"
        >
          <a class="text-xs font-medium" :href="source.url ?? undefined" target="_blank">{{
            shortCitationForPublication(source)
          }}</a
          ><span v-if="i < scoreCalibration.methodSources.length - 1">, </span>
        </span>
      </div>
      <span
        v-if="scoreCalibration.methodSources?.length && scoreCalibration.evidenceSources?.length"
        class="hidden tablet:inline mx-0.5 text-border-light"
        >&mdash;</span
      >
      <div v-if="scoreCalibration.evidenceSources && scoreCalibration.evidenceSources.length > 0" class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          v-tooltip.top="{
            value:
              'Evidence calculation source(s) describe the source of the evidence strengths for each functional range.',
            autoHide: false
          }"
          class="cursor-help border-b border-dashed border-border font-semibold text-text-secondary"
          >Evidence calcs</span
        >:
        <span
          v-for="(source, i) in scoreCalibration.evidenceSources"
          :key="'calc:' + source.dbName + ':' + source.identifier"
        >
          <a class="text-xs font-medium" :href="source.url ?? undefined" target="_blank">{{
            shortCitationForPublication(source)
          }}</a
          ><span v-if="i < scoreCalibration.evidenceSources.length - 1">, </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue'
import {components} from '@/schema/openapi'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import {shortCitationForPublication} from '@/lib/publication'

export default defineComponent({
  name: 'CalibrationTable',

  components: {
    MvClassificationTag,
    MvEvidenceTag
  },

  props: {
    scoreCalibration: {
      type: Object as PropType<components['schemas']['ScoreCalibration']>,
      required: true
    },
    highlightedRangeLabel: {
      type: String as PropType<string | null>,
      default: null
    }
  },

  emits: ['rangeSelected'],

  data() {
    return {
      shortCitationForPublication
    }
  },

  computed: {
    calibrationIsClassBased(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.every((fc) => fc.class != null)
    },

    anyRangeHasDescription(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.some(
        (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          !!r.description
      )
    },

    anyRangeHasEvidenceStrength(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.some(
        (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          r.acmgClassification && 'points' in r.acmgClassification
      )
    },

    anyRangeHasEvidenceCode(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.some(
        (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          r.acmgClassification?.evidenceStrength
      )
    },

    anyRangeHasOddsPaths(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.some(
        (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          r.oddspathsRatio !== undefined
      )
    },

    anyRangeHasPLR(): boolean {
      if (!this.scoreCalibration.functionalClassifications) {
        return false
      }

      return this.scoreCalibration.functionalClassifications.some(
        (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          'positiveLikelihoodRatio' in r
      )
    },

    hasAnySources(): boolean {
      return !!(
        (this.scoreCalibration.thresholdSources && this.scoreCalibration.thresholdSources.length > 0) ||
        (this.scoreCalibration.methodSources && this.scoreCalibration.methodSources.length > 0) ||
        (this.scoreCalibration.evidenceSources && this.scoreCalibration.evidenceSources.length > 0)
      )
    },

    sortedRanges() {
      if (!this.scoreCalibration.functionalClassifications) {
        return []
      }
      return [...this.scoreCalibration.functionalClassifications].sort(this.compareScoreCalibration)
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
      if (typeof window === 'undefined') return 4
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
    },

    /** Number of empty padding cells needed in the last chunk to keep columns uniform across chunks. */
    lastChunkPadding(): number {
      if (this.rangeChunks.length <= 1) return 0
      const lastChunk = this.rangeChunks[this.rangeChunks.length - 1]
      return this.chunkSize - lastChunk.length
    }
  },

  methods: {
    columnColorClass(
      range: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
    ): string {
      switch (range.functionalClassification) {
        case 'abnormal':
          return 'col-abnormal'
        case 'normal':
          return 'col-normal'
        default:
          return 'col-indeterminate'
      }
    },

    compareScoreCalibration(
      a: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'],
      b: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
    ): number {
      let result = 0

      if (a.class && b.class) {
        result = a.class.localeCompare(b.class)
        if (result !== 0) return result
      }

      if (a.range && b.range) {
        result = this.compareScores(a.range[0], b.range[0], true)
        if (result !== 0) return result
        result = this.compareScores(a.range[1], b.range[1], false)
        if (result !== 0) return result
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

    roundForCalibrationTable(value: number | string) {
      return parseFloat(String(value)).toFixed(2)
    }
  }
})
</script>

<style scoped>
/* ── Table layout (cannot be expressed as Tailwind utilities) ── */
.cal-grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px; /* text-sm */
  table-layout: fixed;
}

.cal-grid .row-label {
  padding: 10px 14px;
  font-size: 12px; /* text-xs */
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border-right: 2px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  text-align: left;
  width: 160px;
}

.cal-grid .row-label-tip {
  cursor: help;
}

.cal-grid td:not(.row-label) {
  padding: 10px 14px;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  overflow: hidden;
  word-break: break-word;
}

.cal-grid td:last-child {
  border-right: none;
}

.cal-grid td.pad-cell {
  border-bottom: none;
  border-right: none;
  background: var(--color-bg);
}

.cal-grid tr:first-child td.pad-cell {
  border-top: 3px solid var(--color-border);
}

.cal-grid tr:last-child td,
.cal-grid tr:last-child .row-label {
  border-bottom: none;
}

.cal-grid-last tr:last-child td,
.cal-grid-last tr:last-child .row-label {
  border-bottom: 3px solid var(--color-border);
}

.cal-grid-continuation tr:first-child .row-label {
  border-top: 4px solid var(--color-border);
}

/* ── Column color bars ────────────────────── */
.col-abnormal {
  border-top: 4px solid var(--color-cal-abnormal);
}

.col-indeterminate {
  border-top: 4px solid var(--color-cal-unspecified);
}

.col-normal {
  border-top: 4px solid var(--color-cal-normal);
}

/* ── Highlighted column ────────────────────────────────────── */
.highlight {
  background: var(--color-mint-light);
  position: relative;
}

.highlight::after {
  content: '';
  position: absolute;
  inset: 0;
  border-left: 2px solid var(--color-sage);
  border-right: 2px solid var(--color-sage);
  pointer-events: none;
}

tr:first-child .highlight::after {
  border-top: 2px solid var(--color-sage);
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

tr:last-child .highlight::after {
  border-bottom: 2px solid var(--color-sage);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* ── Monospace intervals ───────────────────────────────────── */
.interval-mono,
.interval-mono > span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 12px; /* text-xs */
  color: var(--color-text-secondary);
  letter-spacing: -0.3px;
}

.infinity-symbol {
  font-size: 1.4em;
  vertical-align: -0.1em;
}

.minus-symbol {
  font-size: 1.3em;
  vertical-align: -0.05em;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .cal-grid .row-label {
    width: 120px;
    font-size: 11px;
    padding: 8px 10px;
  }

  .cal-grid td:not(.row-label) {
    padding: 8px 10px;
  }
}

@media (max-width: 600px) {
  .cal-grid .row-label {
    width: 80px;
    font-size: 10px;
    padding: 6px 6px;
    white-space: normal;
    line-height: 1.3;
  }

  .cal-grid td:not(.row-label) {
    padding: 6px 6px;
    font-size: 11px;
  }
}
</style>
