<template>
  <div class="mavedb-heatmap-wrapper">
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
      <div class="mavedb-heatmap-controls">
        <span class="mavedb-heatmap-controls-title">Heatmap format</span>
        <SelectButton
          v-if="sequenceTypeOptions.length > 1"
          v-model="sequenceType"
          :allow-empty="false"
          option-label="title"
          option-value="value"
          :options="sequenceTypeOptions"
        />
        <SelectButton
          v-model="layout"
          :allow-empty="false"
          option-label="title"
          option-value="value"
          :options="[
            {title: 'Normal', value: 'normal'},
            {title: 'Compact', value: 'compact'}
          ]"
        />
        <Button
          v-if="showProteinStructureButton && sequenceType == 'protein'"
          class="p-button p-button-info"
          label="View protein structure"
          @click="$emit('onDidClickShowProteinStructure')"
        />
      </div>
      <div v-if="numComplexVariants > 0">{{ numComplexVariants }} variants cannot be shown on this chart.</div>
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
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import {defineComponent} from 'vue'
import type {PropType} from 'vue'

import {AMINO_ACIDS, AMINO_ACIDS_WITH_TER, singleLetterAminoAcidOrHgvsCode} from '@/lib/amino-acids'
import {saveChartAsFile} from '@/lib/chart-export'
import geneticCodes from '@/lib/genetic-codes'
import makeHeatmap from '@/lib/heatmap'
import type {Heatmap, HeatmapDatum, HeatmapRowSpecification} from '@/lib/heatmap'
import {parseSimpleProVariant, parseSimpleNtVariant, variantNotNullOrNA} from '@/lib/mave-hgvs'
import {NUCLEOTIDE_BASES} from '@/lib/nucleotides'
import type {ScoreRange} from '@/lib/ranges'
import {
  PARSED_POST_MAPPED_VARIANT_PROPERTIES,
  HgvsReferenceSequenceType,
  inferReferenceSequenceFromVariants,
  Variant
} from '@/lib/variants'

interface VariantHeatmapDatum {
  x: number
  y: number
  score: number | undefined
  variant: Variant
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
  instance?: Variant
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

  components: {Button, SelectButton},

  // "as string[]" works around a TypeScript issue. When expose is present, vue-tsc stops recognizing typing in the
  // template. See https://github.com/vuejs/language-tools/issues/5069.
  expose: ['heatmap', 'heatmapData', 'heatmapRows', 'scrollToPosition'] as string[],

  props: {
    coordinates: {
      type: String as PropType<'raw' | 'mapped'>,
      default: 'raw'
    },
    externalSelection: {
      type: Object,
      required: false,
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
      type: Object,
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
      type: Array as PropType<('dna' | 'protein')[] | undefined>,
      default: undefined
    },
    variants: {
      type: Array as PropType<Variant[]>,
      required: true
    },
    forceBothClassificationColors: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'variantSelected',
    'variantColumnRangesSelected',
    'variantRowSelected',
    'variantRowGroupSelected',
    'heatmapVisible',
    'exportChart',
    'onDidClickShowProteinStructure'
  ],

  data: () => ({
    isMounted: false,
    proteinStructureVisible: false,
    sequenceType: 'protein' as 'dna' | 'protein',
    heatmap: null as Heatmap | null,
    stackedHeatmap: null as Heatmap | null,
    layout: 'normal' as HeatmapLayout
  }),

  computed: {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Choice of heatmap sequence type
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    dnaHeatmapAvailable: function () {
      return this.variants.some((v) => v[this.hgvsNtColumn] != null && v[this.hgvsNtColumn] != 'NA')
    },

    proteinHeatmapAvailable: function () {
      return this.variants.some((v) => v[this.hgvsProColumn] != null && v[this.hgvsProColumn] != 'NA')
    },

    sequenceTypeOptions: function () {
      return [
        ...(this.dnaHeatmapAvailable && (!this.allowedSequenceTypes || this.allowedSequenceTypes.includes('dna'))
          ? [{title: 'DNA', value: 'dna'}]
          : []),
        ...(this.proteinHeatmapAvailable &&
        (!this.allowedSequenceTypes || this.allowedSequenceTypes.includes('protein'))
          ? [{title: 'Protein', value: 'protein'}]
          : [])
      ]
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
              console.log('WARNING: Invalid target sequence type')
              return 'none'
          }
        case 'accession':
          // For accession-based targets, all variants should have either hgvs_nt or hgvs_pro, but not both. They should
          // all be of the same type (AA or NT). Use the raw data (not the mapped or translated HGVS properties) to
          // determine which.
          if (variantNotNullOrNA(this.variants[0].hgvs_pro)) {
            return 'aa'
          } else {
            return 'nt'
          }
        default:
          return 'none'
      }
    },

    targetType: function () {
      const targetGenes: any[] = this.scoreSet?.targetGenes || []
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
      const {referenceSequence, referenceSequenceRange} = inferReferenceSequenceFromVariants(
        this.variants,
        this.targetResidueType == 'aa' ? 'p' : 'c'
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
      return this.sequenceType == 'dna' ? 'nt' : 'aa'
    },

    wtSequenceAndOffset: function () {
      if (this.wtResidueType == this.targetResidueType) {
        return {
          wtSequence: this.targetSequence,
          wtSequenceOffset: this.targetSequenceOffset
        }
      } else if (this.wtResidueType == 'aa' && this.targetResidueType == 'nt') {
        const {referenceSequence, referenceSequenceRange} = inferReferenceSequenceFromVariants(this.variants, 'p')
        return {
          wtSequence: referenceSequence,
          wtSequenceOffset: referenceSequenceRange.start
        }
      } else {
        return {
          wtSequence: '',
          wtSequenceOffset: 1
        }
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

    hgvsColumn: function () {
      switch (this.sequenceType) {
        case 'dna':
          return this.hgvsNtColumn
        case 'protein':
        default:
          return this.hgvsProColumn
      }
    },

    hgvsNtColumn: function () {
      switch (this.coordinates) {
        case 'mapped':
          if (this.variants.some((v) => v.post_mapped_hgvs_c != null && v.post_mapped_hgvs_c != 'NA')) {
            return 'post_mapped_hgvs_c'
          }
          return 'hgvs_nt'
        case 'raw':
        default:
          return 'hgvs_nt'
      }
    },

    hgvsProColumn: function () {
      switch (this.coordinates) {
        case 'mapped':
          if (this.variants.some((v) => v.translated_hgvs_p != null && v.translated_hgvs_p != 'NA')) {
            return 'translated_hgvs_p'
          }
          return 'post_mapped_hgvs_p'
        case 'raw':
        default:
          if (this.variants.some((v) => v.hgvs_pro != null && v.hgvs_pro != 'NA')) {
            return 'hgvs_pro'
          } else if (this.variants.some((v) => v.translated_hgvs_p != null && v.translated_hgvs_p != 'NA')) {
            return 'translated_hgvs_p'
          } else {
            return 'hgvs_pro'
          }
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Variants to display
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    hgvsReferenceSequenceType: function (): HgvsReferenceSequenceType | undefined {
      switch (this.sequenceType) {
        case 'dna':
          return 'c'
        case 'protein':
          return 'p'
        default:
          return undefined
      }
    },

    simpleVariants: function () {
      if (this.hgvsReferenceSequenceType == null) {
        return []
      }
      const parsedHgvsProperty = PARSED_POST_MAPPED_VARIANT_PROPERTIES[this.hgvsReferenceSequenceType]
      if (!parsedHgvsProperty) {
        return []
      }
      return this.variants.filter((v) => v[parsedHgvsProperty] != null)
    },

    numComplexVariants: function () {
      return this.variants.length - this.simpleVariants.length
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
      return this.sequenceType == 'dna' ? HEATMAP_NUCLEOTIDE_ROWS : HEATMAP_AMINO_ACID_ROWS
    },

    heatmapRowForSubstitution: function () {
      return this.sequenceType == 'dna' ? heatmapRowForNucleotideVariant : heatmapRowForProteinVariant
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Heatmap visibility
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    heatmapVisible: function () {
      return this.heatmapData.length > 0
    },

    // heatmapIsSufficientlyFilled: function () {
    //   if (this.variants.length === 0) {
    //     return false
    //   }
    //   // the early termination and wild type variants shouldn't effect the heatmap so that remove the final three rows.
    //   const hasVariant = Array.from({length: this.heatmapRows.length - 3}, () =>
    //     Array(this.heatmapRange.length).fill(false)
    //   )

    //   for (const variant of this.simpleVariants) {
    //     if (
    //       typeof variant.x === 'number' &&
    //       typeof variant.y === 'number' &&
    //       variant.x >= 0 &&
    //       variant.x < this.heatmapRange.length &&
    //       variant.y >= 0 &&
    //       variant.y < this.heatmapRows.length - 3
    //     ) {
    //       hasVariant[variant.y][variant.x] = true
    //     }
    //   }
    //   const totalItems = hasVariant.length * hasVariant[0].length

    //   // count of actual positions that have a variant
    //   let filledCount = 0
    //   for (let row of hasVariant) {
    //     for (let cell of row) {
    //       if (cell) filledCount++
    //     }
    //   }
    //   const sparsity = filledCount / totalItems

    //   return true
    //   // return sparsity > SPARSITY_THRESHOLD // A boolean value
    // },

    parseSimpleVariant: function () {
      return this.sequenceType == 'dna' ? parseSimpleNtVariant : parseSimpleProVariant
    },
    selectedVariant: function () {
      return this.externalSelection
        ? this.heatmapData.filter((variant) => variant.instance?.accession == this.externalSelection.accession)[0]
        : null
    },
    wtScore: function () {
      if (!this.scoreSet?.scoreRanges) {
        return null
      }

      return this.scoreSet.scoreRanges.wtScore
    },

    colorScaleDomainIntervals: function () {
      // Start with all the ranges classified as normal or abnormal. We ignore other ranges, because they either lie
      // outside the normal/abnormal ranges, so that they should be treated as neutral intervals, or they overlap
      // with them, so that the normal or abnormal classification takes precedence.
      const ranges = (this.scoreSet.scoreRanges?.investigatorProvided?.ranges || []).filter((range) =>
        ['normal', 'abnormal'].includes(range.classification)
      )
      if (ranges.length === 0) {
        return []
      }

      // Flatten all interval endpoints.
      const endpoints: Array<{value: number | null; type: 'min' | 'max'; range: ScoreRange}> = []
      for (const range of ranges) {
        endpoints.push({value: range.range[0], type: 'min', range})
        endpoints.push({value: range.range[1], type: 'max', range})
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
      const intervals: Array<{min: number | null; max: number | null; ranges: ScoreRange[]}> = []
      let active: ScoreRange[] = []
      let previousThreshold: number | null = null
      for (const endpoint of endpoints) {
        const currentThreshold = endpoint.value
        if (previousThreshold !== currentThreshold) {
          intervals.push({
            min: previousThreshold,
            max: currentThreshold,
            ranges: [...active]
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
          ranges: []
        })
      }
      if (intervals.length > 0 && intervals[intervals.length - 1].max != null) {
        intervals.push({
          min: intervals[intervals.length - 1].max,
          max: null,
          ranges: []
        })
      }

      // Add final interval to infinity if needed
      // if (active.length > 0) {
      //   intervals.push({
      //     min: previousThreshold,
      //     max: null,
      //     ranges: [...active]
      //   })
      // }

      // Remove intervals where min === max.
      const nonemptyIntervals = intervals.filter((i) => i.min !== i.max || (i.min == null && i.max == null))

      // Classify each interval. If it belongs only to ranges classified as normal or abnormal, give it that
      // classification. Otherwise give it a neutral classification. (The second case includes the subcase where normal
      // and abnormal ranges overlap. This should not happen, but we treat it as best we can.)
      const classifiedIntervals = nonemptyIntervals.map((interval) => {
        const classifications = _.uniq(interval.ranges.map((range) => range.classification))
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
    colorScaleDomain: function () {
      const intervals = this.colorScaleDomainIntervals

      // At least two intervals must be defined in order to set up the color scale this way. If there are no intervals
      // or just a single interval from -infinity to infinity, we cannot give the colors any orientation. We also
      // require at least one data point, since the min and max values are needed, and there is no need for a scale if
      // the data set is empty.
      if (intervals.length < 1 || this.heatmapData.length == 0) {
        return null
      }

      const scores = this.heatmapData.map((v) => v.meanScore)
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

        previousIntervalClassification = interval.classification
      }

      return controlPoints
    }
  },

  watch: {
    coordinates: {
      handler: function () {
        this.renderOrRefreshHeatmaps()
      }
    },

    heatmapData: {
      handler: function () {
        this.renderOrRefreshHeatmaps()
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
          this.renderOrRefreshHeatmaps()
        }
      }
    },

    sequenceType: {
      handler: function () {
        this.renderOrRefreshHeatmaps()
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

    sequenceTypeOptions: {
      handler: function (newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          if (!newValue.find((option) => option.value == this.sequenceType)) {
            this.sequenceType = newValue[0].value
          }
        }
      },
      immediate: true
    }
  },

  mounted: function () {
    this.renderOrRefreshHeatmaps()
    this.$emit('exportChart', this.exportChart)
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
    // Heatmap data preparation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Filter simple variants for display and assign x- and y-coordinates.
     *
     * @param simpleVariants
     */
    prepareSimpleVariantHeatmapData: function (simpleVariants: Variant[]) {
      // Count of variants that do not appear to be complex but are don't have a valid substitution
      let numIgnoredVariants = 0

      const distinctAccessions = new Set()

      const parsedHgvsProperty = PARSED_POST_MAPPED_VARIANT_PROPERTIES[this.hgvsReferenceSequenceType]
      let simpleVariantHeatmapData = _.filter(
        simpleVariants.map((variant) => {
          // const vToParse = variant[this.hgvsColumn]
          // const parsedVariant = vToParse ? this.parseSimpleVariant(vToParse) : null
          // if (!parsedVariant) {
          //   numComplexVariantInstances++
          //   return null
          // }
          const parsedVariant = variant[parsedHgvsProperty]
          if (parsedVariant.target) {
            distinctAccessions.add(parsedVariant.target)
          }
          // Don't display variants out of range from the provided sequence. This happens occassionally with legacy data
          // sets.
          if (
            variant.position < this.wtSequence.offset ||
            variant.position > this.wtSequence.length + this.wtSequence.offset
          ) {
            numIgnoredVariants++
            return null
          }
          // If hideStartAndStopLoss is set to true, omit start- and stop-loss variants. The parent component shouuld
          // set this option when viewing scores in clinical mode from an assay using a synthetic target sequence.
          if (this.hideStartAndStopLoss && this.isStartOrStopLoss(variant)) {
            numIgnoredVariants++
            return null
          }
          const row = this.heatmapRowForSubstitution(
            parsedVariant.substitution == parsedVariant.original ? '=' : parsedVariant.substitution
          )
          if (row == null) {
            numIgnoredVariants++
            return null
          }
          const x = parsedVariant.position
          const y = this.heatmapRows.length - 1 - row
          return {
            x,
            y,
            score: variant.score,
            variant
          }
        }),
        (x) => x != null
      )
      // TODO(#237) See https://github.com/VariantEffect/mavedb-ui/issues/237.
      if (distinctAccessions.size > 1) {
        numIgnoredVariants += simpleVariantHeatmapData.length
        simpleVariantHeatmapData = []
      }

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
      // for (const simpleVariantClass of simpleVariantClasses) {
      //   const scores = simpleVariantClass.instances.map((instance) => instance.score).filter((s) => s != null)
      //   simpleVariantClass.numScores = scores.length
      //   simpleVariantClass.meanScore =
      //     scores.length == 0 ? null : scores.reduce((a, b) => (a ? a : null + b ? b : null), 0) / scores.length
      //   simpleVariant.scoreStdev = stdev(scores)

      //   // Assume that aside from score, the details are identical for each instance.
      //   simpleVariant.details = _.omit(simpleVariant.instances[0].details, 'score')
      // }
      // const simpleVariantsWithScores = simpleVariants.filter((v) => !_.isNaN(v.meanScore))
      this.rankVariantClassScores(simpleVariantClasses)
      return simpleVariantClasses
    },

    rankVariantClassScores(variantClassData: VariantClassHeatmapDatum[]) {
      _.mapValues(_.groupBy(variantClassData, 'x'), (variantClassesInColumn) => {
        const variantsSortedByScore = _.sortBy(variantClassesInColumn, 'meanScore')
        variantClassesInColumn.forEach((v) => (v.scoreRank = variantsSortedByScore.indexOf(v)))
      })
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data property accessors for the heatmap
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    accession: function (d: HeatmapDatum) {
      return (d as VariantClassHeatmapDatum)?.instance?.accession
    },

    tooltipTickLabelHtmlGetter: function (rowNumber: number) {
      const currentRow = this.heatmapRows[this.heatmapRows.length - 1 - rowNumber]
      if (this.sequenceType == 'protein') {
        const aminoAcid = AMINO_ACIDS.find((aa) => aa.codes.single == currentRow.code)
        if (aminoAcid) {
          return `Name: ${aminoAcid.name} (${aminoAcid.codes.triple})<br/>Hydrophobicity: ${aminoAcid.hydrophobicity?.originalValue} (Kyte-Doolittle)<br/>Class: ${aminoAcid.class}`
        }
      }
      return null
    },

    tooltipHtmlGetter: function (v: VariantClassHeatmapDatum) {
      const parts = []
      if (v.wt) {
        parts.push('WT')
      }
      const nameParts = []
      if (this.coordinates == 'mapped') {
        switch (this.sequenceType) {
          case 'dna':
            if (variantNotNullOrNA(v.instance?.post_mapped_hgvs_c)) {
              nameParts.push(`Variant: ${v.instance?.post_mapped_hgvs_c}`)
            }
            if (variantNotNullOrNA(v.instance?.post_mapped_hgvs_p)) {
              nameParts.push(`Protein variant: ${v.instance?.post_mapped_hgvs_p}`)
            } else if (variantNotNullOrNA(v.instance?.translated_hgvs_p)) {
              nameParts.push(`Protein variant: ${v.instance?.translated_hgvs_p}`)
            }
            break
          case 'protein':
          default:
            if (variantNotNullOrNA(v.instance?.post_mapped_hgvs_p)) {
              nameParts.push(`Variant: ${v.instance?.post_mapped_hgvs_p}`)
            } else if (variantNotNullOrNA(v.instance?.translated_hgvs_p)) {
              nameParts.push(`Variant: ${v.instance?.translated_hgvs_p}`)
            }
            if (variantNotNullOrNA(v.instance?.post_mapped_hgvs_c)) {
              nameParts.push(`NT variant: ${v.instance?.post_mapped_hgvs_c}`)
            }
        }
      }
      if (nameParts.length == 0) {
        if (variantNotNullOrNA(v.instance?.hgvs_nt)) {
          nameParts.push(`NT variant: ${v.instance?.hgvs_nt}`)
        }
        if (variantNotNullOrNA(v.instance?.hgvs_pro)) {
          nameParts.push(`Protein variant: ${v.instance?.hgvs_pro}`)
        } else if (variantNotNullOrNA(v.instance?.translated_hgvs_p)) {
          nameParts.push(`Protein variant: ${v.instance?.translated_hgvs_p}`)
        }
        if (variantNotNullOrNA(v.instance?.hgvs_splice)) {
          nameParts.push(`Splice variant: ${v.instance?.hgvs_splice}`)
        }
      }
      parts.push(...nameParts)
      if (v.numScores != null) {
        parts.push(`# of observations: ${v.numScores}`)
      }
      if (v.numScores == 1) {
        parts.push(`Score: ${v.meanScore}`)
      } else if (v.numScores != null && v.numScores > 1) {
        parts.push(`Mean score: ${v.meanScore}`)
        parts.push(`Score stdev: ${v.scoreStdev}`)
      }

      return parts.length > 0 ? parts.join('<br />') : null
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
      this.heatmap = makeHeatmap()
        .margins({top: 0, bottom: 25, left: 20, right: 20})
        .legendTitle('Functional Score')
        .drawYGroups(this.sequenceType === 'protein')
        .render(this.$refs.simpleVariantsHeatmapContainer, this.$refs.heatmapContainer)
        .rows(this.heatmapRows)
        .xCoordinate(this.xCoord)
        .yCoordinate(this.yCoord)
        .accessorField(this.accession)
        .tooltipHtml(this.tooltipHtmlGetter)
        .tooltipTickLabelHtml(this.sequenceType == 'protein' ? this.tooltipTickLabelHtmlGetter : null)
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
        .colorClassifier((v: VariantClassHeatmapDatum) => (v.wt ? d3.color('#ddbb00') : v.meanScore))
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
        .accessorField(this.accession)
        .drawY(false)
        .drawLegend(false)
        .alignViaLegend(true)
        .excludeDatum((v: VariantClassHeatmapDatum) => (v.wt ? true : false))

      if (!this.stackedHeatmap) {
        return
      }

      if (this.colorScaleDomain) {
        this.stackedHeatmap.colorScaleControlPoints(this.colorScaleDomain)
      }
      this.stackedHeatmap
        .data(this.heatmapData)
        .valueField((v: VariantClassHeatmapDatum) => v.meanScore)
        .colorClassifier((v: VariantClassHeatmapDatum) => (v.wt ? d3.color('#ddbb00') : v.meanScore))
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

    exportChart() {
      saveChartAsFile(this.$refs.heatmapContainer, `${this.scoreSet.urn}-scores-heatmap`, 'mavedb-heatmap-container')
    },

    showProteinStructure() {
      this.proteinStructureVisible = true
    },

    isStartOrStopLoss: function (variant) {
      const hgvsP = [variant.post_mapped_hgvs_p, variant.translated_hgvs_p, variant.hgvs_pro].find((hgvs) =>
        variantNotNullOrNA(hgvs)
      )
      if (!hgvsP) {
        return false
      }
      // TODO We may be reparsing a variant.
      const parsedVariant = parseSimpleProVariant(hgvsP)
      if (!parsedVariant) {
        return false
      }
      if (parsedVariant.position == 1 && parsedVariant.original == 'Met' && parsedVariant.substitution != 'Met') {
        // Start loss
        return true
      }
      if (
        parsedVariant.position == 1 &&
        (parsedVariant.original == 'Ter' || parsedVariant.original == '*') &&
        parsedVariant.substitution != 'Ter' &&
        parsedVariant.substitution != '*'
      ) {
        // Stop loss
        return true
      }
    },

    translateDnaToAminoAcids1Char: function (dna) {
      const triplets = this.dnaToTriplets(dna)
      return triplets.map((triplet) => this.translateCodon(triplet))
    },

    dnaToTriplets: function (dna) {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /.../g)
    },

    dnaToSingletons: function (dna) {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /./g)
    },

    translateCodon: function (codon) {
      return geneticCodes.standard.dna.codonToAa[codon]
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
  background-color: #eee;
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

.heatmapContainer:deep(.heatmap-y-axis-tick-labels) {
  font-size: 14px;
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
