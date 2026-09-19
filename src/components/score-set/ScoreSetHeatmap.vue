<template>
  <div class="mavedb-heatmap-wrapper">
    <div v-if="redrawing" class="mavedb-heatmap-loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Rendering heatmap…</span>
    </div>
    <template v-if="heatmapVisible">
      <div style="text-align: center">Functional Score by Variant</div>
      <div id="mavedb-heatmap-container" ref="heatmapContainer" class="heatmapContainer">
        <div id="mavedb-heatmap-scroll-container" ref="heatmapScrollContainer" class="heatmapScrollContainer">
          <div
            id="mave-stacked-heatmap-container"
            ref="simpleVariantsStackedHeatmapContainer"
            class="mave-simple-variants-stacked-heatmap-container"
          />
          <div
            id="mave-variants-heatmap-container"
            ref="simpleVariantsHeatmapContainer"
            class="mave-simple-variants-heatmap-container"
          />
        </div>
      </div>
      <!-- Informational notes about what the heatmap can and can't show. Controls live in the parent header. -->
      <div
        v-if="selectedVariantNotOnHeatmap || notShownCounts.noCoordinate > 0 || notShownCounts.complex > 0"
        class="mt-2 flex flex-col gap-1 px-2 text-sm text-text-muted"
      >
        <div v-if="selectedVariantNotOnHeatmap" class="flex items-center gap-1.5">
          <i class="pi pi-info-circle text-xs" />
          <span
            ><span class="font-medium text-text-secondary">{{ selectedVariantLabel }}</span> is not shown on this
            heatmap.</span
          >
        </div>
        <div v-if="notShownCounts.noCoordinate > 0" class="flex items-center gap-1.5">
          <i class="pi pi-info-circle text-xs" />
          <span
            >{{ notShownCounts.noCoordinate }}
            {{ notShownCounts.noCoordinate === 1 ? 'variant has' : 'variants have' }} no
            {{ sequenceType === 'protein' ? 'protein' : 'nucleotide' }} representation in this view.</span
          >
        </div>
        <div v-if="notShownCounts.complex > 0" class="flex items-center gap-1.5">
          <i class="pi pi-info-circle text-xs" />
          <span
            >{{ notShownCounts.complex }} {{ notShownCounts.complex === 1 ? 'variant is' : 'variants are' }} too complex
            to plot (indels, multivariants).</span
          >
        </div>
      </div>
    </template>
    <template v-else-if="scoreSet?.private">
      <div class="no-heatmap-message">
        <p><strong>No heatmap available.</strong> Insufficient score data to generate a heatmap.</p>
        <p>A variant should be present at <strong>at least 5% of possible positions</strong> to generate a heatmap.</p>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3'
import _ from 'lodash'
import {defineComponent} from 'vue'
import type {PropType} from 'vue'

import {AMINO_ACIDS, AMINO_ACIDS_WITH_TER, singleLetterAminoAcidOrHgvsCode} from '@/lib/amino-acids'
import {saveChartAsSvg, saveChartAsPng} from '@/lib/chart-export'
import makeHeatmap from '@/lib/heatmap'
import type {Heatmap, HeatmapDatum, HeatmapRowSpecification} from '@/lib/heatmap'
import {NUCLEOTIDE_BASES} from '@/lib/nucleotides'
import {
  tooltipKeyValue,
  tooltipNote,
  tooltipRoot,
  tooltipSection,
  tooltipTitle,
  tooltipVariantDetailsLink
} from '@/lib/tooltips'
import {inferReferenceSequenceFromBlocks, isStartOrStopLoss, type DisplayVariant, type HgvsField} from '@/lib/variants'
import {useVariantCoordinates, type SequenceLevel} from '@/composables/use-variant-coordinates'
import {components} from '@/schema/openapi'

interface VariantHeatmapDatum {
  x: number
  y: number
  score: number | undefined
  variant: DisplayVariant
}

interface VariantClassHeatmapDatum {
  x: number
  y: number
  numScores?: number
  meanScore?: number
  scoreStdev?: number
  scoreRank?: number
  wt?: boolean
  /** One variant in the class. All of its properties are shared by the other variants except its score, which should be ignored. */
  instance?: DisplayVariant
}

const HEATMAP_AMINO_ACIDS_SORTED = _.sortBy(AMINO_ACIDS, [
  (aa) =>
    _.indexOf(['unique', 'aromatic', 'non-polar', 'polar-neutral', 'negative-charged', 'positive-charged'], aa.class),
  'hydrophobicity.originalValue'
])

const HEATMAP_AMINO_ACID_ROWS: HeatmapRowSpecification[] = [
  {code: '=', label: '\uff1d'},
  {code: '*', label: '\uff0a'},
  {code: '-', label: '\uff0d'},
  ...HEATMAP_AMINO_ACIDS_SORTED.map((aa) => ({
    code: aa.codes.single,
    label: aa.codes.single,
    groupCode: aa.class,
    groupLabel: aa.class == 'positive-charged' ? '(+)' : aa.class == 'negative-charged' ? '(-)' : aa.class
  }))
]

const HEATMAP_NUCLEOTIDE_ROWS: HeatmapRowSpecification[] = [
  ...NUCLEOTIDE_BASES.map((ntCode) => ({code: ntCode.codes.single, label: ntCode.codes.single}))
]

/**
 * Given a MaveHGVS-pro amino acid code or code representing deletion, synonmyous variation, or stop codon, return the
 * heatmap row number on which a single-AA variant should be displayed.
 *
 * @param aaCodeOrChange A one- or three-character code representing an amino acid or the result of a variation at a
 *   single locus in a protein sequence. If not an amino acid code, it should be a code representing synonymous
 *   variation (=), stop codon (*), or deletion (- or del).
 * @returns The heatmap row number, from 0 (the bottom row) to 22 (the top row).
 */
function heatmapRowForProteinVariant(aaCodeOrChange: string): number | null {
  const singleLetterCode = singleLetterAminoAcidOrHgvsCode(aaCodeOrChange)
  const ranking = singleLetterCode
    ? HEATMAP_AMINO_ACID_ROWS.findIndex((rowSpec) => rowSpec.code == singleLetterCode)
    : null
  return ranking != null && ranking >= 0 ? ranking : null
}

/**
 * Given a MaveHGVS-pro amino acid code or code representing deletion, synonmyous variation, or stop codon, return the
 * heatmap row number on which a single-AA variant should be displayed.
 *
 * @param ntCodeOrChange A one-character code representing a nucleotide base or the result of a variation at a
 *   single locus in a nucleotide sequence.
 * @returns The heatmap row number, from 0 (the bottom row) to 3 (the top row).
 */
function heatmapRowForNucleotideVariant(ntCodeOrChange: string): number | null {
  const singleLetterCode = ntCodeOrChange.toUpperCase()
  const ranking = singleLetterCode
    ? HEATMAP_NUCLEOTIDE_ROWS.findIndex((rowSpec) => rowSpec.code == singleLetterCode)
    : null
  return ranking != null && ranking >= 0 ? ranking : null
}

function stdev(array: number[]) {
  if (!array || array.length === 0) {
    return 0
  }
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

type HeatmapLayout = 'normal' | 'compact'

export default defineComponent({
  name: 'ScoreSetHeatmap',

  components: {},

  // "as string[]" works around a TypeScript issue. When expose is present, vue-tsc stops recognizing typing in the
  // template. See https://github.com/vuejs/language-tools/issues/5069.
  expose: ['heatmap', 'heatmapData', 'heatmapRows', 'scrollToPosition'] as string[],

  props: {
    coordinates: {
      type: String as PropType<'submitted' | 'reference'>,
      default: 'submitted'
    },
    externalSelection: {
      type: Object as PropType<DisplayVariant | null>,
      default: null
    },
    margins: {
      // Margins must accommodate the axis labels
      type: Object,
      default: () => ({
        top: 0,
        right: 0,
        bottom: 20,
        left: 20
      })
    },
    hideStartAndStopLoss: {
      type: Boolean,
      default: false
    },
    scoreSet: {
      type: Object as PropType<components['schemas']['ScoreSet'] | null>,
      required: true
    },
    showProteinStructureButton: {
      type: Boolean
    },
    mode: {
      type: String as PropType<'standard' | 'protein-viz'>,
      default: 'standard'
    },
    allowedSequenceTypes: {
      type: Array as PropType<SequenceLevel[] | undefined>,
      default: undefined
    },
    variants: {
      type: Array as PropType<DisplayVariant[]>,
      required: true
    },
    forceBothClassificationColors: {
      type: Boolean,
      default: false
    },
    sequenceType: {
      type: String as PropType<SequenceLevel>,
      default: 'protein'
    },
    layout: {
      type: String as PropType<HeatmapLayout>,
      default: 'normal'
    }
  },

  emits: [
    'variantSelected',
    'variantColumnRangesSelected',
    'variantRowSelected',
    'variantRowGroupSelected',
    'heatmapVisible',
    'exportChart',
    'onDidClickShowProteinStructure',
    'update:sequenceType',
    'update:layout'
  ],

  setup() {
    return {...useVariantCoordinates()}
  },

  data: () => ({
    isMounted: false,
    proteinStructureVisible: false,
    heatmap: null as Heatmap | null,
    stackedHeatmap: null as Heatmap | null,
    redrawing: false
  }),

  computed: {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Choice of heatmap sequence type
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    availableSequenceTypeOptions: function () {
      const options = this.sequenceTypeOptions(this.variants, this.coordinates)
      if (!this.allowedSequenceTypes) {
        return options
      }
      return options.filter((option) => this.allowedSequenceTypes!.includes(option.value))
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Target information
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    targetResidueType: function () {
      switch (this.targetType) {
        case 'sequence':
          switch (this.scoreSet?.targetGenes?.[0]?.targetSequence?.sequenceType) {
            case 'dna':
              return 'nt'
            case 'protein':
              return 'aa'
            default:
              return 'none'
          }
        case 'accession':
          // For accession-based targets, all variants should have either a submitted nt or protein HGVS, but not both.
          // They are all of the same type (AA or NT); use the submitted data to determine which.
          if (this.variants[0]?.hgvsPro != null) {
            return 'aa'
          } else {
            return 'nt'
          }
        default:
          return 'none'
      }
    },

    targetType: function () {
      const targetGenes: components['schemas']['TargetGene'][] = this.scoreSet?.targetGenes || []
      if (targetGenes.length == 0) {
        return 'none'
      }
      if (targetGenes.every((tg) => tg.targetSequence != null)) {
        return 'sequence'
      }
      if (targetGenes.every((tg) => tg.targetAccession)) {
        return 'accession'
      }
      return 'invalid'
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Target sequence
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    targetSequenceAndOffset: function () {
      switch (this.targetType) {
        case 'sequence':
          return {
            targetSequence: (this.scoreSet?.targetGenes?.[0]?.targetSequence?.sequence as string | undefined) || '',
            targetSequenceOffset: 1
          }
        case 'accession':
          return this.inferredTargetSequenceAndOffset
        default:
          return {
            targetSequence: '',
            targetSequenceOffset: 1
          }
      }
    },

    targetSequence: function () {
      return this.targetSequenceAndOffset.targetSequence
    },

    targetSequenceOffset: function () {
      return this.targetSequenceAndOffset.targetSequenceOffset
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Inferring a target sequence from variants
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    inferredTargetSequenceAndOffset: function () {
      // Accession targets have no stored sequence; infer it from the submitted (raw) blocks.
      // Use the first variant's assayLevel to pick cdna vs genomic — accession assays are uniform.
      const ntLevel: SequenceLevel = this.variants[0]?.assayLevel === 'genomic' ? 'genomic' : 'cdna'
      const level: SequenceLevel = this.targetResidueType === 'aa' ? 'protein' : ntLevel
      const {referenceSequence, referenceSequenceRange} = inferReferenceSequenceFromBlocks(
        this.variants,
        (v) => this.coordinateFor(v, level, 'submitted'),
        this.targetResidueType == 'aa' ? 'aa' : 'nt'
      )
      return {
        targetSequence: referenceSequence,
        targetSequenceOffset: referenceSequenceRange.start
      }
    },

    inferredTargetSequence: function () {
      return this.inferredTargetSequenceAndOffset.targetSequence
    },

    inferredTargetSequenceOffset: function () {
      return this.inferredTargetSequenceAndOffset.targetSequenceOffset
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Wild-type sequence
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    wtResidueType: function () {
      return this.sequenceType !== 'protein' ? 'nt' : 'aa'
    },

    wtSequenceAndOffset: function () {
      // Option A: the WT sequence is expressed in the same coordinate system as the plotted cells.
      // In the submitted frame with a target sequence of the matching residue type, that sequence is the
      // authoritative WT in target coordinates. Otherwise (reference frame, or a residue type the target
      // sequence doesn't provide) infer the WT from the plotted blocks in the current (level, frame).
      if (this.coordinates == 'submitted' && this.wtResidueType == this.targetResidueType && this.targetSequence) {
        return {
          wtSequence: this.targetSequence,
          wtSequenceOffset: this.targetSequenceOffset
        }
      }
      const {referenceSequence, referenceSequenceRange} = inferReferenceSequenceFromBlocks(
        this.variants,
        (v) => this.plotBlock(v),
        this.wtResidueType
      )
      return {
        wtSequence: referenceSequence,
        wtSequenceOffset: referenceSequenceRange.start
      }
    },

    wtSequence: function () {
      return this.wtSequenceAndOffset.wtSequence
    },

    wtSequenceOffset: function () {
      return this.wtSequenceAndOffset.wtSequenceOffset
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Accessing variant HGVS strings
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Variants to display
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    simpleVariants: function () {
      // Plottable variants are those with a placeable substitution block in the current (level, frame).
      return this.variants.filter((v) => {
        const block = this.plotBlock(v)
        return block != null && block.position != null
      })
    },

    // The unplottable variants, split by why. `noCoordinate` resolve to no coordinate at the current
    // level/frame (unmapped, or that level absent); `complex` carry an HGVS that is not a placeable
    // single substitution (indels, multivariants, intronic/UTR). The two are mutually exclusive and
    // together are every variant excluded from simpleVariants.
    notShownCounts: function (): {noCoordinate: number; complex: number} {
      let noCoordinate = 0
      let complex = 0
      for (const v of this.variants) {
        const block = this.plotBlock(v)
        if (block == null) {
          noCoordinate++
        } else if (block.position == null) {
          complex++
        }
      }
      return {noCoordinate, complex}
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Variant data for the heatmap
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    simpleVariantClassesForHeatmapWithStatistics: function () {
      const {simpleVariantHeatmapData, numIgnoredVariants} = this.prepareSimpleVariantHeatmapData(this.simpleVariants)
      const simpleVariantClassHeatmapData = this.prepareSimpleVariantClassHeatmapData(simpleVariantHeatmapData)
      return {simpleVariantClassHeatmapData, numIgnoredVariants}
    },

    simpleVariantClassesForHeatmap: function () {
      return this.simpleVariantClassesForHeatmapWithStatistics.simpleVariantClassHeatmapData
    },

    numIgnoredVariants: function () {
      return this.simpleVariantClassesForHeatmapWithStatistics.numIgnoredVariants
    },

    displayedXRange: function () {
      if (!this.simpleVariantClassesForHeatmap || this.simpleVariantClassesForHeatmap.length == 0) {
        return {
          start: 0,
          length: 0
        }
      }
      const xMin = _.min(this.simpleVariantClassesForHeatmap.map((v) => v.x))
      const xMax = _.max(this.simpleVariantClassesForHeatmap.map((v) => v.x))
      if (xMin == null || xMax == null) {
        return {
          start: 0,
          length: 0
        }
      }
      return {
        start: xMin,
        length: xMax - xMin + 1
      }
    },

    wtVariants: function (): VariantClassHeatmapDatum[] {
      const allowedResidues =
        this.sequenceType == 'protein'
          ? AMINO_ACIDS_WITH_TER.map((aa) => aa.codes.single)
          : NUCLEOTIDE_BASES.map((nt) => nt.codes.single)
      return this.wtSequence
        .substring(
          this.displayedXRange.start - this.wtSequenceOffset,
          this.displayedXRange.start - this.wtSequenceOffset + this.displayedXRange.length
        )
        .split('')
        .map((residue: string, i: number) => {
          const row = this.heatmapRowForSubstitution(residue)
          return row != null && allowedResidues.includes(residue)
            ? {
                x: i + this.displayedXRange.start,
                y: this.heatmapRows.length - 1 - row,
                wt: true
              }
            : null
        })
        .filter((wtVariantClass) => wtVariantClass != null)
    },

    heatmapData: function () {
      return [...(this.simpleVariantClassesForHeatmap || []), ...(this.wtVariants || [])]
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Row assignment
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    heatmapRows: function () {
      return this.sequenceType !== 'protein' ? HEATMAP_NUCLEOTIDE_ROWS : HEATMAP_AMINO_ACID_ROWS
    },

    heatmapRowForSubstitution: function () {
      return this.sequenceType !== 'protein' ? heatmapRowForNucleotideVariant : heatmapRowForProteinVariant
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap visibility
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    heatmapVisible: function () {
      return this.heatmapData.length > 0
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Selection
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    selectedVariant: function () {
      return this.externalSelection
        ? this.heatmapData.filter((variant) => variant.instance?.variantUrn == this.externalSelection!.variantUrn)[0]
        : null
    },

    // A selection exists but resolves to no cell on this heatmap — a complex/unmapped variant, or one
    // with no placeable substitution in the current level and frame. selectDatum can't highlight it
    // either (same condition), so the note explains the absent highlight.
    selectedVariantNotOnHeatmap: function (): boolean {
      return !!this.externalSelection && !this.selectedVariant
    },

    selectedVariantLabel: function (): string {
      return this.externalSelection ? this.labelForVariant(this.externalSelection, this.coordinates) : ''
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap coloring based only on range of scores and baseline score from primary score calibration, if any
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    colorScaleDomain: function () {
      const baselineScore = this.scoreSet?.scoreCalibrations?.find(
        (calibration: components['schemas']['ScoreCalibration']) => calibration.primary
      )?.baselineScore

      const scores = this.heatmapData.map((v) => v.meanScore).filter((score) => score != null)
      const minValue = _.min<number>(scores)
      const maxValue = _.max<number>(scores)

      if (minValue == null || maxValue == null) {
        return null
      }

      if (baselineScore != null) {
        let maxDistanceFromBaseline = Math.max(Math.abs(minValue - baselineScore), Math.abs(maxValue - baselineScore))
        if (maxDistanceFromBaseline == 0.0) {
          // If min and max both equal baseline, set an arbitrary range; it will not matter.
          maxDistanceFromBaseline = 1.0
        }
        return [
          {value: baselineScore - maxDistanceFromBaseline, colorKey: 'min'},
          {value: baselineScore, colorKey: 'baseline'},
          {value: baselineScore + maxDistanceFromBaseline, colorKey: 'max'}
        ]
      } else {
        const meanValue = _.mean([minValue, maxValue])
        return [
          {value: minValue, colorKey: 'min'},
          {value: meanValue, colorKey: 'baseline'},
          {value: maxValue, colorKey: 'max'}
        ]
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap coloring based on functional class score ranges (unused)
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    functionalClassBasedColorScaleDomainIntervals: function () {
      // If any ranges are null (ie. we are dealing with a class based calibration), return an empty domain.
      // The color scale for such calibrations should be based on the categorical classes, not on score ranges.
      if (
        this.scoreSet?.scoreCalibrations
          ?.find((calibration: components['schemas']['ScoreCalibration']) => calibration.primary)
          ?.functionalClassifications?.some((classification) => classification.range === null)
      ) {
        return []
      }

      // Start with all the ranges classified as normal or abnormal. We ignore other ranges, because they either lie
      // outside the normal/abnormal ranges, so that they should be treated as neutral intervals, or they overlap
      // with them, so that the normal or abnormal classification takes precedence.
      const classifications = (
        this.scoreSet?.scoreCalibrations?.find(
          (calibration: components['schemas']['ScoreCalibration']) => calibration.primary
        )?.functionalClassifications || []
      ).filter(
        (range: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          range.functionalClassification !== undefined &&
          ['normal', 'abnormal'].includes(range.functionalClassification)
      )
      if (classifications.length === 0) {
        return []
      }

      // Flatten all interval endpoints.
      const endpoints: Array<{
        value: number | null
        type: 'min' | 'max'
        range: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']
      }> = []
      for (const classification of classifications) {
        if (classification.range == null) {
          continue
        }

        endpoints.push({value: classification.range[0], type: 'min', range: classification})
        endpoints.push({value: classification.range[1], type: 'max', range: classification})
      }

      // Sort endpoints. Null is -infinity when it's a minimum, infinity when it's a maximum.
      endpoints.sort((a, b) => {
        if (a.value === null && b.value === null) {
          if (a.type == b.type) {
            return 0
          }
          return a.type == 'min' ? -1 : 1
        }
        if (a.value === null) return a.type === 'min' ? -1 : 1
        if (b.value === null) return b.type === 'min' ? 1 : -1
        return a.value - b.value
      })

      // Build intervals from the endpoints.
      const intervals: Array<{
        min: number | null
        max: number | null
        classifications: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'][]
      }> = []
      let active: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'][] = []
      let previousThreshold: number | null = null
      for (const endpoint of endpoints) {
        const currentThreshold = endpoint.value
        if (previousThreshold !== currentThreshold) {
          intervals.push({
            min: previousThreshold,
            max: currentThreshold,
            classifications: [...active]
          })
          previousThreshold = currentThreshold
        }
        if (endpoint.type === 'min') {
          active.push(endpoint.range)
        } else {
          active = active.filter((r) => r !== endpoint.range)
        }
      }

      // If the first or last interval does not extend to -/+ infinity, add a neutral interval to the beginning or end.
      // This has an effect if a minimum or maximum value lies outside the range covered so far by intervals.
      if (intervals.length > 0 && intervals[0].min != null) {
        intervals.unshift({
          min: null,
          max: intervals[0].min,
          classifications: []
        })
      }
      if (intervals.length > 0 && intervals[intervals.length - 1].max != null) {
        intervals.push({
          min: intervals[intervals.length - 1].max,
          max: null,
          classifications: []
        })
      }

      // Remove intervals where min === max.
      const nonemptyIntervals = intervals.filter((i) => i.min !== i.max || (i.min == null && i.max == null))

      // Classify each interval. If it belongs only to ranges classified as normal or abnormal, give it that
      // classification. Otherwise give it a neutral classification. (The second case includes the subcase where normal
      // and abnormal ranges overlap. This should not happen, but we treat it as best we can.)
      const classifiedIntervals = nonemptyIntervals.map((interval) => {
        const classifications = _.uniq(
          interval.classifications.map((classification) => classification.functionalClassification)
        )
        const classification = classifications.length == 1 ? classifications[0] : 'neutral'
        return {
          min: interval.min,
          max: interval.max,
          classification
        }
      })

      // Merge adjacent intervals sharing the same classification. Otherwise we will have consecutive control points
      // with the same color, and the regions between them will have a solid color.
      const mergedIntervals = []
      for (const interval of classifiedIntervals) {
        if (
          mergedIntervals.length > 0 &&
          mergedIntervals[mergedIntervals.length - 1].classification === interval.classification
        ) {
          // Merge with previous interval
          mergedIntervals[mergedIntervals.length - 1].max = interval.max
        } else {
          mergedIntervals.push({...interval})
        }
      }
      return mergedIntervals
    },

    functionalClassBasedColorScaleDomain: function () {
      const intervals = this.functionalClassBasedColorScaleDomainIntervals

      // At least two intervals must be defined in order to set up the color scale this way. If there are no intervals
      // or just a single interval from -infinity to infinity, we cannot give the colors any orientation. We also
      // require at least one data point, since the min and max values are needed, and there is no need for a scale if
      // the data set is empty.
      if (intervals.length < 1 || this.heatmapData.length == 0) {
        return null
      }

      const scores = this.heatmapData.map((v) => v.meanScore).filter((score) => score != null)
      const minValue = _.min<number>(scores)
      const maxValue = _.max<number>(scores)

      if (minValue == null || maxValue == null) {
        return null
      }

      // Check whether both classifications (normal and abnormal) are assigned to intervals.
      const abnormalPresent = _.some(intervals, (interval) => interval.classification == 'abnormal')
      const normalPresent = _.some(intervals, (interval) => interval.classification == 'normal')
      if (!abnormalPresent && !normalPresent) {
        // This should not arise since we constructed intervals by looking only at normal and abnormal ranges.
        return null
      }
      const missingClassification = !abnormalPresent ? 'abnormal' : !normalPresent ? 'normal' : undefined

      const controlPoints = []
      let previousIntervalClassification: string = 'none'
      for (const interval of intervals) {
        // If there is a transition directly from normal to abnormal or vice versa, insert a neutral control point at
        // the boundary.
        if (
          (interval.min != null &&
            previousIntervalClassification == 'normal' &&
            interval.classification == 'abnormal') ||
          (previousIntervalClassification == 'abnormal' && interval.classification == 'normal')
        ) {
          controlPoints.push({value: interval.min, colorKey: 'neutral'})
        }

        if (interval.min == null) {
          // Only the first interval can have min == null.
          // The first interval extends from -infinity. It should have finite max, since otherwise there would only be
          // one interval.
          // - If the minimum value lies in this interval, use it as the control point.
          //   - If the forceBothClassificationColors option is true, and if the interval classification is neutral and
          //     there is no normal or abnormal interval, give the missing classification to the control point, and
          //     insert a second, neutral control point half-way between this and the max boundary.
          //   - Otherwise just give the control point the interval's classification.
          // - Otherwise add a control point to support shading in the next interval. Arbitrarily place the control
          //   point so that its distance to the interval max mirrors the distance from that boundary to the minimum
          //   value.
          // Note that the case where minValue equals or is near interval.max is not handled very well.
          if (interval.max != null && minValue <= interval.max) {
            if (
              this.forceBothClassificationColors &&
              missingClassification &&
              interval.classification == 'neutral' &&
              minValue < interval.max
            ) {
              controlPoints.push({value: minValue, colorKey: missingClassification})
              controlPoints.push({value: (minValue + interval.max) / 2.0, colorKey: 'neutral'})
            } else {
              controlPoints.push({value: minValue, colorKey: interval.classification})
            }
          } else if (interval.max != null) {
            controlPoints.push({value: 2 * interval.max - minValue, colorKey: interval.classification})
          }
          // interval.max should not be null, because then
        } else if (interval.max != null) {
          // The interval has finite min and max. Use the midpoint as a control point.
          controlPoints.push({value: (interval.min + interval.max) / 2.0, colorKey: interval.classification})
        } else if (interval.max == null) {
          // Only the last interval can have max == null.
          // The last interval extends to infinity. It should have finite max, since otherwise there would only be
          // one interval.
          // - If the maximum value lies in this interval, use it as the control point.
          //   - If the forceBothClassificationColors option is true, and if the interval classification is neutral and
          //     there is no normal or abnormal interval, give the missing classification to the control point, and
          //     insert a second, neutral control point half-way between this and the min boundary.
          //   - Otherwise just give the control point the interval's classification.
          // - If the maximum value lies in this interval, use it as the control point.
          // - Otherwise add a control point to support shading in the previous interval. Arbitrarily place the control
          //   point so that its distance to the interval min mirrors the distance from that boundary to the maximum value.
          // Note that the case where maxValue equals or is near interval.min is not handled very well.
          if (interval.min != null && maxValue >= interval.min) {
            if (
              this.forceBothClassificationColors &&
              missingClassification &&
              interval.classification == 'neutral' &&
              maxValue > interval.min
            ) {
              controlPoints.push({value: (maxValue + interval.min) / 2.0, colorKey: 'neutral'})
              controlPoints.push({value: maxValue, colorKey: missingClassification})
            } else {
              controlPoints.push({value: maxValue, colorKey: interval.classification})
            }
          } else if (interval.min != null) {
            controlPoints.push({value: 2 * interval.min - maxValue, colorKey: interval.classification})
          }
        }

        previousIntervalClassification = interval.classification ? interval.classification : 'none'
      }

      return controlPoints
    }
  },

  watch: {
    coordinates: {
      handler: function () {
        this.scheduleRedraw()
      }
    },

    heatmapData: {
      handler: function () {
        this.scheduleRedraw()
      },
      immediate: true
    },

    heatmapVisible: {
      handler: function (newValue, oldValue) {
        if (newValue === oldValue) {
          return
        }
        this.$emit('heatmapVisible', newValue)
      },
      immediate: true
    },

    layout: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.scheduleRedraw()
        }
      }
    },

    sequenceType: {
      handler: function () {
        this.scheduleRedraw()
      }
    },

    selectedVariant: {
      handler: function (newValue) {
        if (newValue === null) {
          this.heatmap ? this.heatmap.clearSelection() : null
          this.stackedHeatmap ? this.stackedHeatmap.clearSelection() : null
          return
        }

        // Protect heatmap selection methosd from cases where the selected variant does not
        // exist as heatmap content.
        if (this.xCoord(newValue) || this.yCoord(newValue)) {
          this.heatmap ? this.heatmap.selectDatum(newValue) : null
        }
        if (this.xCoord(newValue) || this.vRank(newValue)) {
          this.stackedHeatmap ? this.stackedHeatmap.selectDatum(newValue) : null
        }
      },
      immediate: true
    },

    availableSequenceTypeOptions: {
      handler: function (
        newValue: Array<{title: string; value: string}>,
        oldValue: Array<{title: string; value: string}>
      ) {
        if (!_.isEqual(newValue, oldValue)) {
          if (newValue.length > 0 && !newValue.find((option) => option.value == this.sequenceType)) {
            this.$emit('update:sequenceType', newValue[0].value)
          }
        }
      },
      immediate: true
    }
  },

  mounted: function () {
    // Render synchronously on mount so colorScale/heatmapData are ready when a parent (e.g.
    // ScoreSetVisualizer) reads them in its own mounted() hook. scheduleRedraw() handles later updates.
    this.isMounted = true
    this.renderOrRefreshHeatmaps()
    this.$emit('exportChart', this.buildExportFns())
  },

  beforeUnmount: function () {
    if (this.heatmap) {
      this.heatmap.destroy()
      this.heatmap = null
    }
    if (this.stackedHeatmap) {
      this.stackedHeatmap.destroy()
      this.stackedHeatmap = null
    }
  },

  methods: {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Coordinate resolution
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * The HGVS block that this variant plots at, in the current sequence level and coordinate frame.
     * The single source of truth for the heatmap's x/y derivation, WT inference, and tooltips.
     */
    plotBlock: function (variant: DisplayVariant): HgvsField | null {
      return this.coordinateFor(variant, this.sequenceType, this.coordinates)
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap data preparation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Filter simple variants for display and assign x- and y-coordinates.
     *
     * @param simpleVariants
     */
    prepareSimpleVariantHeatmapData: function (simpleVariants: DisplayVariant[]) {
      // Count of variants that do not appear to be complex but don't have a valid substitution
      let numIgnoredVariants = 0

      const simpleVariantHeatmapData = _.filter(
        simpleVariants.map((variant) => {
          const block = this.plotBlock(variant)
          if (!block || block.position == null || block.alt == null) {
            numIgnoredVariants++
            return null
          }
          // Don't display variants out of range from the reference sequence. This happens occasionally with legacy
          // data sets.
          if (
            block.position < this.wtSequenceOffset ||
            block.position > this.wtSequence.length + this.wtSequenceOffset
          ) {
            numIgnoredVariants++
            return null
          }
          // If hideStartAndStopLoss is set to true, omit start- and stop-loss variants. The parent component should
          // set this option when viewing scores in clinical mode from an assay using a synthetic target sequence.
          if (this.hideStartAndStopLoss && isStartOrStopLoss(variant)) {
            numIgnoredVariants++
            return null
          }
          const row = this.heatmapRowForSubstitution(block.alt == block.ref ? '=' : block.alt)
          if (row == null) {
            numIgnoredVariants++
            return null
          }
          const x = block.position
          const y = this.heatmapRows.length - 1 - row
          return {
            x,
            y,
            score: variant.score ?? undefined,
            variant
          }
        }),
        (x) => x != null
      )

      return {simpleVariantHeatmapData, numIgnoredVariants}
    },

    prepareSimpleVariantClassHeatmapData: function (variantData: VariantHeatmapDatum[]): VariantClassHeatmapDatum[] {
      const simpleVariantClasses = _.flatten(
        _.values(_.mapValues(_.groupBy(variantData, 'x'), (instancesAtX) => _.values(_.groupBy(instancesAtX, 'y'))))
      )
        .map((variantDataInClass) => {
          const scores = variantDataInClass.map((instance) => instance.score).filter((s) => s != null)
          return {
            ..._.pick(variantDataInClass[0], ['x', 'y']),
            numScores: scores.length,
            meanScore: scores.length == 0 ? NaN : _.mean(scores),
            scoreStdev: stdev(scores),
            instance: variantDataInClass[0].variant // Has an unwanted score, but cloning the rest would waste memory.
          }
        })
        .filter((v) => !_.isNaN(v.meanScore))

      this.rankVariantClassScores(simpleVariantClasses)
      return simpleVariantClasses
    },

    rankVariantClassScores(variantClassData: VariantClassHeatmapDatum[]) {
      _.mapValues(_.groupBy(variantClassData, 'x'), (variantClassesInColumn) => {
        const variantsSortedByScore = _.reverse(_.sortBy(variantClassesInColumn, 'meanScore'))
        variantClassesInColumn.forEach((v) => (v.scoreRank = variantsSortedByScore.indexOf(v)))
      })
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data property accessors for the heatmap
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    variantKey: function (d: HeatmapDatum) {
      return (d as VariantClassHeatmapDatum)?.instance?.variantUrn
    },

    tooltipTickLabelHtmlGetter: function (rowNumber: number) {
      const currentRow = this.heatmapRows[this.heatmapRows.length - 1 - rowNumber]
      if (this.sequenceType == 'protein') {
        const aminoAcid = AMINO_ACIDS.find((aa) => aa.codes.single == currentRow.code)
        if (aminoAcid) {
          return tooltipRoot([
            tooltipSection([
              tooltipKeyValue('Name', `${aminoAcid.name} (${aminoAcid.codes.triple})`),
              tooltipKeyValue('Hydrophobicity', `${aminoAcid.hydrophobicity?.originalValue} (Kyte-Doolittle)`),
              tooltipKeyValue('Class', aminoAcid.class)
            ])
          ])
        }
      }
      return null
    },

    tooltipHtmlGetter: function (v: VariantClassHeatmapDatum) {
      // Identity: WT flag plus the variant's identifiers. The primary line leads with the plotted
      // axis's representation; the secondary line is that level's natural pair, which is transcript-
      // specific: protein `NP_:p.` and coding `NM_:c.` are the same transcript in two registers, so
      // each pairs with the other. The genomic `NC_:g.` axis stands alone — a genomic position spans
      // transcripts and its intronic/UTR positions have no coding equivalent, so no pair is shown.
      // Unmapped variants have no mapped coordinate, so fall back to labelForVariant.
      const identity = []
      if (v.wt) {
        identity.push(tooltipTitle('Wild-type'))
      }
      const instance = v.instance
      if (instance) {
        let primaryHgvs: string | undefined
        let pairHgvs: string | undefined
        if (this.sequenceType === 'protein') {
          primaryHgvs = this.getHgvsPro(instance, this.coordinates)
          pairHgvs = this.getHgvsNt(instance, this.coordinates)
        } else if (this.sequenceType === 'genomic') {
          primaryHgvs = this.coordinateFor(instance, 'genomic', this.coordinates)?.hgvs
          pairHgvs = undefined
        } else {
          primaryHgvs = this.getHgvsNt(instance, this.coordinates)
          pairHgvs = this.getHgvsPro(instance, this.coordinates)
        }
        const primaryLabel = primaryHgvs ?? this.labelForVariant(instance, this.coordinates)
        if (primaryLabel) {
          identity.push(tooltipTitle(primaryLabel))
        }
        if (pairHgvs && pairHgvs !== primaryLabel) {
          identity.push(tooltipNote(pairHgvs))
        }
      }
      if (instance?.clingenAlleleId) {
        identity.push(tooltipVariantDetailsLink(instance.clingenAlleleId, instance.variantUrn))
      }

      // Aggregate score statistics for the cell.
      const stats = []
      if (v.numScores != null) {
        stats.push(tooltipKeyValue('# of observations', v.numScores))
      }
      if (v.numScores == 1) {
        stats.push(tooltipKeyValue('Score', v.meanScore))
      } else if (v.numScores != null && v.numScores > 1) {
        stats.push(tooltipKeyValue('Mean score', v.meanScore))
        stats.push(tooltipKeyValue('Score stdev', v.scoreStdev))
      }

      return tooltipRoot([tooltipSection(identity), tooltipSection(stats)])
    },

    vRank: function (d: HeatmapDatum) {
      return (d as VariantClassHeatmapDatum)?.scoreRank
    },

    xCoord: function (d: HeatmapDatum) {
      return (d as VariantClassHeatmapDatum)?.x
    },

    yCoord: function (d: HeatmapDatum) {
      return (d as VariantClassHeatmapDatum)?.y
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap rendering and refresh
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Show a loading indicator, then redraw on a later frame. Rebuilding the heatmap re-creates every
     * SVG cell, which blocks the main thread; yielding two animation frames first lets the browser
     * paint the indicator before the freeze. Re-entrant calls coalesce — the single deferred redraw
     * reads the latest reactive state, so rapid level/frame changes collapse into one redraw.
     */
    scheduleRedraw: function () {
      // Before mount, the synchronous first render in mounted() is the sole first paint (so a parent can
      // read colorScale/heatmapData immediately). Deferring here would double-render and flash the spinner.
      if (!this.isMounted || this.redrawing) {
        return
      }
      this.redrawing = true
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this.renderOrRefreshHeatmaps()
          this.redrawing = false
        })
      )
    },

    renderOrRefreshHeatmaps: function () {
      if (!this.heatmapData) {
        return
      }

      this.heatmap?.destroy()
      this.stackedHeatmap?.destroy()

      if (this.sequenceType == 'protein' && this.layout != 'compact') {
        this.drawStackedHeatmap()
      }
      this.drawHeatmap()
    },

    drawHeatmap: function () {
      // See https://cran.r-project.org/web/packages/khroma/vignettes/tol.html#prgn for the palette.

      this.heatmap = makeHeatmap()
        .margins({top: 0, bottom: 25, left: 20, right: 20})
        .legendTitle('Functional Score')
        .drawYGroups(this.sequenceType === 'protein')
        .render(this.$refs.simpleVariantsHeatmapContainer, this.$refs.heatmapContainer)
        .rows(this.heatmapRows)
        .xCoordinate(this.xCoord)
        .yCoordinate(this.yCoord)
        .accessorField(this.variantKey)
        .tooltipHtml(this.tooltipHtmlGetter)
        .tooltipTickLabelHtml(this.sequenceType == 'protein' ? this.tooltipTickLabelHtmlGetter : null)
        .pivotColor('#e0e0e0')
        .lowerBoundColor('#762a83')
        .upperBoundColor('#1b7837')
        .datumSelected(this.variantSelected)

      if (!this.heatmap) {
        return
      }

      if (this.mode == 'protein-viz') {
        this.heatmap
          .rangeSelectionMode('column')
          .columnRangesSelected(this.variantColumnRangesSelected)
          .axisSelectionMode('y')
          .rowSelected(this.variantRowSelected)
          .rowGroupSelected(this.variantRowGroupSelected)
      }

      if (this.layout == 'compact') {
        this.heatmap.nodeBorderRadius(0).nodePadding(0).nodeSize({width: 1, height: 20}).skipXTicks(99)
      }

      if (this.colorScaleDomain) {
        this.heatmap.colorScaleControlPoints(this.colorScaleDomain)
      }
      this.heatmap
        .data(this.heatmapData)
        .valueField((v: VariantClassHeatmapDatum) => v.meanScore)
        // WT color was previously #ddbb00.
        .colorClassifier((v: VariantClassHeatmapDatum) => (v.wt ? d3.color('#ffee99') : v.meanScore))
        .refresh()

      if (this.selectedVariant) {
        this.heatmap.selectDatum(this.selectedVariant)
      } else {
        this.heatmap.clearSelection()
      }
    },

    drawStackedHeatmap: function () {
      this.stackedHeatmap = makeHeatmap()
        .margins({top: 20, bottom: 25, left: 20, right: 20})
        .drawYGroups(this.sequenceType === 'protein')
        .render(this.$refs.simpleVariantsStackedHeatmapContainer)
        .rows(this.heatmapRows)
        .nodeSize({width: 20, height: 1})
        .xCoordinate(this.xCoord)
        .yCoordinate(this.vRank)
        .accessorField(this.variantKey)
        .drawY(false)
        .drawLegend(false)
        .alignViaLegend(true)
        .excludeDatum((v: VariantClassHeatmapDatum) => (v.wt ? true : false))
        .pivotColor('#f7f7f7')
        .lowerBoundColor('#762a83')
        .upperBoundColor('#1b7837')

      if (!this.stackedHeatmap) {
        return
      }

      if (this.colorScaleDomain) {
        this.stackedHeatmap.colorScaleControlPoints(this.colorScaleDomain)
      }
      this.stackedHeatmap
        .data(this.heatmapData)
        .valueField((v: VariantClassHeatmapDatum) => v.meanScore)
        // WT color was previously #ddbb00.
        .colorClassifier((v: VariantClassHeatmapDatum) => (v.wt ? d3.color('#ffee99') : v.meanScore))
        .refresh()

      if (this.selectedVariant) {
        this.stackedHeatmap.selectDatum(this.selectedVariant)
      } else {
        this.stackedHeatmap.clearSelection()
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Miscellaneous
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    scrollToPosition: function (position: number) {
      this.$refs.heatmapScrollContainer.scrollTo({
        left: position,
        behavior: 'smooth'
      })
    },

    buildExportFns() {
      return {
        svg: () =>
          saveChartAsSvg(
            this.$refs.heatmapContainer as HTMLElement,
            `${this.scoreSet.urn}-scores-heatmap`,
            'mavedb-heatmap-container'
          ),
        png: () =>
          saveChartAsPng(
            this.$refs.heatmapContainer as HTMLElement,
            `${this.scoreSet.urn}-scores-heatmap`,
            'mavedb-heatmap-container'
          )
      }
    },

    showProteinStructure() {
      this.proteinStructureVisible = true
    },

    variantSelected: function (v: VariantClassHeatmapDatum) {
      if (v === null) {
        this.$emit('variantSelected', null)
      } else {
        this.$emit('variantSelected', v.instance)
      }
    },

    variantColumnRangesSelected: function (ranges: Array<{start: number; end: number}>) {
      this.$emit('variantColumnRangesSelected', ranges)
    },

    variantRowSelected: function (data: HeatmapDatum[]) {
      this.$emit('variantRowSelected', data)
    },
    variantRowGroupSelected: function (group: {groupCode: string; groupLabel: string | null; data: HeatmapDatum[][]}) {
      this.$emit('variantRowGroupSelected', group)
    }
  }
})
</script>

<style scoped>
.mavedb-heatmap-controls {
  display: flex;
  flex-direction: row;

  /* display: none; */
  /* position: absolute; */

  align-items: center;
  gap: 10px;
  top: 100%;
  z-index: 100;
  width: 100%;
  padding: 10px;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
}

.mavedb-heatmap-controls .p-selectbutton {
  display: inline-block;
}

.mavedb-heatmap-controls * {
  vertical-align: middle;
}

.mavedb-heatmap-controls-title {
  font-weight: bold;
}

.mavedb-heatmap-wrapper {
  position: relative;
  background-color: #fff;
}

.mavedb-heatmap-loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  background-color: rgba(255, 255, 255, 0.7);
  color: #555;
  font-size: 13px;
}

/* .mavedb-heatmap-wrapper:hover .mavedb-heatmap-controls {
  display: flex;
  flex-direction: row;
} */

.no-heatmap-message {
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
  position: relative;
  width: 1000px;
  margin: 0 auto;
}

.heatmapContainer {
  position: relative;
}

.heatmapScrollContainer {
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

/* The sticky y-axis/legend overlay spans the wrapper's full height, so its bottom-left otherwise
   covers the left end of the horizontal scrollbar on wide (e.g. DNA) heatmaps. Trim it to clear the
   scrollbar track. Overrides the inline height:100% d3 sets on the overlay svg. */
.heatmapContainer:deep(svg.exclude-from-export) {
  height: calc(100% - 8px) !important;
}

.heatmapContainer:deep(.heatmap-y-axis-tick-labels) {
  font-size: 10px;
  user-select: none;
}

.heatmapContainer:deep(.heatmap-vertical-color-legend) {
  user-select: none;
}
.heatmapContainer:deep(.heatmap-bottom-axis) {
  user-select: none;
}

.heatmapContainer:deep(.heatmap-x-axis-invisible) {
  visibility: hidden;
}

::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 7px;
  height: 0.5em;
}

::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
}
</style>

<style>
.heatmap-tooltip {
  position: absolute;
}
</style>
