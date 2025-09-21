<template>
  <div v-if="heatmapVisible">
    <div class="mavedb-heatmap-wrapper">
      <template v-if="showHeatmap">
        <div style="text-align: center">Functional Score by Variant</div>
        <div id="mavedb-heatmap-container" class="heatmapContainer" ref="heatmapContainer">
          <div id="mavedb-heatmap-scroll-container" class="heatmapScrollContainer" ref="heatmapScrollContainer">
            <div
              id="mave-stacked-heatmap-container"
              class="mave-simple-variants-stacked-heatmap-container"
              ref="simpleVariantsStackedHeatmapContainer"
            />
            <div
              id="mave-variants-heatmap-container"
              class="mave-simple-variants-heatmap-container"
              ref="simpleVariantsHeatmapContainer"
            />
          </div>
        </div>
        <div class="mavedb-heatmap-controls">
          <span class="mavedb-heatmap-controls-title">Heatmap format</span>
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
            v-if="showProteinStructureButton"
            label="View protein structure"
            class="p-button p-button-info"
            @click="$emit('onDidClickShowProteinStructure')"
          />
        </div>
      </template>
      <template v-else-if="scoreSet?.private">
        <div class="no-heatmap-message">
          <p><strong>No heatmap available.</strong> Insufficient score data to generate a heatmap.</p>
          <p>
            A variant should be present at <strong>at least 5% of possible positions</strong> to generate a heatmap.
          </p>
        </div>
      </template>
    </div>
    <div v-if="numComplexVariants > 0">
      {{ numComplexVariants }} variants are complex and cannot be shown on this type of chart.
    </div>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3'
import _ from 'lodash'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import {defineComponent, PropType} from 'vue'

import {AMINO_ACIDS, AMINO_ACIDS_WITH_TER} from '@/lib/amino-acids'
import {saveChartAsFile} from '@/lib/chart-export'
import geneticCodes from '@/lib/genetic-codes'
import makeHeatmap from '@/lib/heatmap'
import type {Heatmap, HeatmapDatum, HeatmapRowSpecification} from '@/lib/heatmap'
import {parseSimpleProVariant, parseSimpleNtVariant, variantNotNullOrNA} from '@/lib/mave-hgvs'
import {NUCLEOTIDE_BASES} from '@/lib/nucleotides'
import type {ScoreRange} from '@/lib/ranges'
// import {SPARSITY_THRESHOLD} from '@/lib/score-set-heatmap'

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

/** Codes used in the right part of a MaveHGVS-pro string representing a single variation in a protein sequence. */
const MAVE_HGVS_PRO_CHANGE_CODES = [
  {codes: {single: '='}}, // Synonymous AA variant
  {codes: {single: '*', triple: 'TER'}}, // Stop codon
  {codes: {single: '-', triple: 'DEL'}} // Deletion
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
 * corresponding single-character code (which is the code used in our heatmap's y-axis).
 *
 * @param aaCodeOrChange A one- or three-character code representing an amino acid or the result of a variation at a
 *   single locus in a protein sequence. If not an amino acid code, it should be a code representing synonymous
 *   variation (=), stop codon (*), or deletion (- or del).
 * @return The one-character code representing the same amino acid or change, or null if the input was not a supported
 *   amino acid or change.
 */
function singleLetterAminoAcidOrHgvsCode(aaCodeOrChange: string): string | null {
  const code = aaCodeOrChange.toUpperCase()
  if (code.length == 1) {
    return code
  }
  if (code.length == 3) {
    return (
      AMINO_ACIDS.find((aa) => aa.codes.triple == code)?.codes?.single ||
      MAVE_HGVS_PRO_CHANGE_CODES.find((change) => change.codes.triple == code)?.codes?.single ||
      null
    )
  }
  // TODO What about D-amino acids? The "d-" prefix has been capitalized at this point, so if we need to handle these,
  // we should match against capitalized five-letter codes.
  return null
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

  components: {SelectButton, Button},

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
    scoreSet: {
      type: Object,
      required: true
    },
    externalSelection: {
      type: Object,
      required: false,
      default: null
    },
    showProteinStructureButton: {
      type: Boolean
    },
    mode: {
      type: String as PropType<'standard' | 'protein-viz'>,
      default: 'standard'
    },
    sequenceType: {
      type: String as PropType<'dna' | 'protein'>,
      default: 'protein'
    },
    variants: {
      type: Array,
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
    simpleVariants: null,
    numComplexVariants: 0,
    heatmap: null as Heatmap | null,
    stackedHeatmap: null as Heatmap | null,
    layout: 'normal' as HeatmapLayout
  }),

  expose: ['simpleAndWtVariants', 'heatmap', 'scrollToPosition', 'heatmapRows'],

  computed: {
    // isNucleotideHeatmap: function() {
    //   const targetCategory = _.get(this.scoreSet, 'targetGenes[0].category')
    //   const proteinVariantsAreDefined = this.scores.every((elem) => !isNaN(elem.hgvs_pro))
    //   return !proteinVariantsAreDefined && (targetCategory === 'other_noncoding' || targetCategory == "regulatory")
    // },
    targetXRange: function () {
      if (!this.simpleVariants || this.simpleVariants.length == 0) {
        return {
          start: 0,
          length: 0
        }
      }
      const xMin = _.min(this.simpleVariants.map((variant) => variant.x))
      const xMax = _.max(this.simpleVariants.map((variant) => variant.x))
      return {
        start: xMin,
        length: xMax - xMin + 1
      }
    },
    hgvsColumn: function () {
      switch (this.coordinates) {
        case 'mapped':
          if (this.sequenceType == 'dna') {
            return 'post_mapped_hgvs_c'
          } else {
            if (this.variants.some((v) => v.hgvs_pro_inferred != null && v.hgvs_pro_inferred != 'NA')) {
              return 'hgvs_pro_inferred'
            }
            return 'post_mapped_hgvs_p'
          }
        case 'raw':
          if (this.sequenceType == 'dna') {
            return 'hgvs_nt'
          } else if (this.variants.some((v) => v.hgvs_pro != null && v.hgvs_pro != 'NA')) {
            return 'hgvs_pro'
          } else if (this.variants.some((v) => v.hgvs_pro_inferred != null && v.hgvs_pro_inferred != 'NA')) {
            return 'hgvs_pro_inferred'
          } else {
            return 'hgvs_pro'
          }
      }
    },
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
          // Assume that all mapped variants are of the same type (NT or AA).
          const firstHgvsString = this.simpleVariants?.[0]?.instances?.[0]?.details?.[this.hgvsColumn] || ''
          if (parseSimpleNtVariant(firstHgvsString)) {
            return 'nt'
          }
          if (parseSimpleProVariant(firstHgvsString)) {
            return 'aa'
          }
          return 'none'
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
    targetSequence: function () {
      switch (this.targetType) {
        case 'sequence':
          return this.scoreSet?.targetGenes?.[0]?.targetSequence?.sequence || ''
        case 'accession':
          return this.inferTargetSequenceFromVariants()
        default:
          return ''
      }
    },
    wtResidueType: function () {
      return this.sequenceType == 'dna' ? 'nt' : 'aa'
    },
    wtSequence: function () {
      if (this.wtResidueType == this.targetResidueType) {
        return _.toArray(this.targetSequence)
      } else if (this.wtResidueType == 'aa' && this.targetResidueType == 'nt') {
        return this.translateDnaToAminoAcids1Char(this.targetSequence)
      } else {
        return []
      }
    },
    wtVariants: function () {
      return this.wtSequence ? this.prepareWtVariants(this.wtSequence) : []
    },
    simpleAndWtVariants: function () {
      return [...(this.simpleVariants || []), ...(this.wtVariants || [])]
    },

    heatmapRows: function () {
      return this.sequenceType == 'dna' ? HEATMAP_NUCLEOTIDE_ROWS : HEATMAP_AMINO_ACID_ROWS
    },
    heatmapRowForVariant: function () {
      return this.sequenceType == 'dna' ? heatmapRowForNucleotideVariant : heatmapRowForProteinVariant
    },
    parseSimpleVariant: function () {
      return this.sequenceType == 'dna' ? parseSimpleNtVariant : parseSimpleProVariant
    },
    // TODO: Swappable Targets
    heatmapRange: function () {
      return this.wtSequence
    },
    heatmapVisible: function () {
      return this.simpleVariants && this.simpleVariants.length
    },
    selectedVariant: function () {
      return this.externalSelection
        ? this.simpleAndWtVariants.filter(
            (variant) => variant.details?.accession == this.externalSelection.accession
          )[0]
        : null
    },
    wtScore: function () {
      if (!this.scoreSet?.scoreRanges) {
        return null
      }

      return this.scoreSet.scoreRanges.wtScore
    },
    showHeatmap: function () {
      if (this.variants.length === 0) {
        return false
      }
      // the early termination and wild type variants shouldn't effect the heatmap so that remove the final three rows.
      const hasVariant = Array.from({length: this.heatmapRows.length - 3}, () =>
        Array(this.heatmapRange.length).fill(false)
      )

      for (const variant of this.simpleVariants) {
        if (
          typeof variant.x === 'number' &&
          typeof variant.y === 'number' &&
          variant.x >= 0 &&
          variant.x < this.heatmapRange.length &&
          variant.y >= 0 &&
          variant.y < this.heatmapRows.length - 3
        ) {
          hasVariant[variant.y][variant.x] = true
        }
      }
      const totalItems = hasVariant.length * hasVariant[0].length

      // count of actual positions that have a variant
      let filledCount = 0
      for (let row of hasVariant) {
        for (let cell of row) {
          if (cell) filledCount++
        }
      }
      const sparsity = filledCount / totalItems

      return true
      // return sparsity > SPARSITY_THRESHOLD // A boolean value
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
      if (intervals.length < 1 || this.simpleAndWtVariants.length == 0) {
        return null
      }

      const scores = this.simpleAndWtVariants.map((v) => v.meanScore)
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
    layout: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.renderOrRefreshHeatmaps()
        }
      }
    },
    coordinates: {
      handler: function () {
        if (!this.variants) {
          this.simpleVariants = null
          this.numComplexVariants = 0
        } else {
          const {simpleVariants, numComplexVariants} = this.prepareSimpleVariants(this.variants)
          this.simpleVariants = simpleVariants
          this.numComplexVariants = numComplexVariants
        }

        this.renderOrRefreshHeatmaps()
      }
    },
    variants: {
      handler: function () {
        if (!this.variants) {
          this.simpleVariants = null
          this.numComplexVariants = 0
        } else {
          const {simpleVariants, numComplexVariants} = this.prepareSimpleVariants(this.variants)
          this.simpleVariants = simpleVariants
          this.numComplexVariants = numComplexVariants
        }

        this.renderOrRefreshHeatmaps()
      },
      immediate: true
    },
    simpleAndWtVariants: {
      handler: function () {
        this.renderOrRefreshHeatmaps()
      },
      immediate: true
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
    heatmapVisible: {
      handler: function (newValue, oldValue) {
        if (newValue === oldValue) {
          return
        }
        this.$emit('heatmapVisible', newValue)
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
    inferTargetSequenceFromVariants: function () {
      const unknownResidue = this.targetResidueType == 'aa' ? 'X' : 'N'
      const targetSequenceArr = Array(this.targetXRange.length).fill(unknownResidue)
      for (const variant of this.simpleVariants) {
        const parsedVariant = this.parseSimpleVariant(variant.instances[0].details[this.hgvsColumn])
        if (parsedVariant) {
          let referenceAllele = parsedVariant?.original
          if (referenceAllele && this.sequenceType == 'protein') {
            referenceAllele = AMINO_ACIDS.find((aa) => aa.codes.triple == referenceAllele.toUpperCase())?.codes?.single
          }
          if (referenceAllele) {
            targetSequenceArr[variant.x - this.targetXRange.start] = referenceAllele
          }
        }
      }
      return targetSequenceArr.join('')
    },
    xCoord: function (d: HeatmapDatum) {
      return d?.x
    },
    accession: function (d: HeatmapDatum) {
      return d?.details.accession
    },
    yCoord: function (d: HeatmapDatum) {
      return d?.y
    },
    vRank: function (d: HeatmapDatum) {
      return d?.scoreRank
    },

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

    // We assume that there will only be one substitution variant for each target AA at a given position.
    prepareSimpleVariantScoreRanks(simpleVariants) {
      _.mapValues(_.groupBy(simpleVariants, 'x'), (variantsAtOnePosition) => {
        const variantsSortedByScore = _.sortBy(variantsAtOnePosition, 'meanScore')
        variantsAtOnePosition.forEach((v) => (v.scoreRank = variantsSortedByScore.indexOf(v)))
      })
    },

    prepareWtVariants: function (wtSequenceArr: string[]) {
      const allowedResidues =
        this.sequenceType == 'protein'
          ? AMINO_ACIDS_WITH_TER.map((aa) => aa.codes.single)
          : NUCLEOTIDE_BASES.map((nt) => nt.codes.single)
      return wtSequenceArr
        .map((residue, i) =>
          allowedResidues.includes(residue)
            ? {
                x: i + this.targetXRange.start,
                y: this.heatmapRows.length - 1 - this.heatmapRowForVariant(residue),
                details: {
                  wt: true
                }
              }
            : null
        )
        .filter((variant) => variant != null)
    },

    prepareSimpleVariantInstances: function (variants) {
      let numComplexVariantInstances = 0

      // Count of variants that do not appear to be complex but are don't have a valid substitution
      let numIgnoredVariantInstances = 0

      const distinctAccessions = new Set()

      let simpleVariantInstances = _.filter(
        variants.map((variant) => {
          const vToParse = variant[this.hgvsColumn]
          const parsedVariant = vToParse ? this.parseSimpleVariant(vToParse) : null
          if (!parsedVariant) {
            numComplexVariantInstances++
            return null
          }
          if (parsedVariant.target) {
            distinctAccessions.add(parsedVariant.target)
          }
          // Don't display variants out of range from the provided sequence. This happens occassionally
          // with legacy variant data.
          if (variant.position > this.heatmapRange.length) {
            numIgnoredVariantInstances++
            return null
          }
          const row = this.heatmapRowForVariant(
            parsedVariant.substitution == parsedVariant.original ? '=' : parsedVariant.substitution
          )
          if (row == null) {
            numIgnoredVariantInstances++
            return null
          }
          const x = parsedVariant.position
          const y = this.heatmapRows.length - 1 - row
          return {x, y, score: variant.score, details: _.omit(variant, 'score')}
        }),
        (x) => x != null
      )
      // TODO(#237) See https://github.com/VariantEffect/mavedb-ui/issues/237.
      if (distinctAccessions.size > 1) {
        numComplexVariantInstances += simpleVariantInstances.length
        simpleVariantInstances = []
      }

      return {simpleVariantInstances, numComplexVariantInstances, numIgnoredVariantInstances}
    },

    prepareSimpleVariants: function (variants) {
      const {simpleVariantInstances, numComplexVariantInstances} = this.prepareSimpleVariantInstances(variants)

      const simpleVariants = _.flatten(
        _.values(
          _.mapValues(_.groupBy(simpleVariantInstances, 'x'), (instancesAtX) => _.values(_.groupBy(instancesAtX, 'y')))
        )
      ).map((v) => ({
        ..._.pick(v[0], ['x', 'y']),
        instances: v
      }))
      for (const simpleVariant of simpleVariants) {
        const scores = simpleVariant.instances.map((instance) => instance.score).filter((s) => s != null)
        simpleVariant.numScores = scores.length
        simpleVariant.meanScore =
          scores.length == 0 ? null : scores.reduce((a, b) => (a ? a : null + b ? b : null), 0) / scores.length
        simpleVariant.scoreStdev = stdev(scores)

        // Assume that aside from score, the details are identical for each instance.
        simpleVariant.details = _.omit(simpleVariant.instances[0].details, 'score')
      }
      this.prepareSimpleVariantScoreRanks(simpleVariants)

      return {
        simpleVariants,
        // TODO Group these to identify instances of the same variant.
        numComplexVariants: numComplexVariantInstances
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

    variantSelected: function (datum: HeatmapDatum) {
      if (datum === null) {
        this.$emit('variantSelected', null)
      } else {
        this.$emit('variantSelected', datum.details)
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
    },

    renderOrRefreshHeatmaps: function () {
      if (!this.simpleAndWtVariants) {
        return
      }

      this.heatmap?.destroy()
      this.stackedHeatmap?.destroy()

      if (this.sequenceType == 'protein' && this.layout != 'compact') {
        this.drawStackedHeatmap()
      }
      this.drawHeatmap()
    },

    // Assumes that plate dimensions do not change.
    drawHeatmap: function () {
      this.heatmap = makeHeatmap()
        .margins({top: 0, bottom: 25, left: 20, right: 20})
        .legendTitle('Functional Score')
        .drawYGroups(this.sequenceType == 'dna' ? false : true)
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
        .data(this.simpleAndWtVariants)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => (variant.details.wt ? d3.color('#ddbb00') : variant.meanScore))
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
        .render(this.$refs.simpleVariantsStackedHeatmapContainer)
        .rows(this.heatmapRows)
        .nodeSize({width: 20, height: 1})
        .xCoordinate(this.xCoord)
        .yCoordinate(this.vRank)
        .accessorField(this.accession)
        .drawY(false)
        .drawLegend(false)
        .alignViaLegend(true)
        .excludeDatum((d) => (d.details.wt ? true : false))

      if (!this.stackedHeatmap) {
        return
      }

      if (this.colorScaleDomain) {
        this.stackedHeatmap.colorScaleControlPoints(this.colorScaleDomain)
      }
      this.stackedHeatmap
        .data(this.simpleAndWtVariants)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => (variant.details.wt ? d3.color('#ddbb00') : variant.meanScore))
        .refresh()

      if (this.selectedVariant) {
        this.stackedHeatmap.selectDatum(this.selectedVariant)
      } else {
        this.stackedHeatmap.clearSelection()
      }
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

    tooltipHtmlGetter: function (variant: HeatmapDatum) {
      const parts = []
      if (variant.details.wt) {
        parts.push('WT')
      }
      const nameParts = []
      if (this.coordinates == 'mapped') {
        switch (this.sequenceType) {
          case 'dna':
            if (variantNotNullOrNA(variant.details.post_mapped_hgvs_c)) {
              nameParts.push(`Variant: ${variant.details.post_mapped_hgvs_c}`)
            }
            if (variantNotNullOrNA(variant.details.post_mapped_hgvs_p)) {
              nameParts.push(`Protein variant: ${variant.details.post_mapped_hgvs_p}`)
            } else if (variantNotNullOrNA(variant.details.hgvs_pro_inferred)) {
              nameParts.push(`Protein variant: ${variant.details.hgvs_pro_inferred}`)
            }
            break
          case 'protein':
          default:
            if (variantNotNullOrNA(variant.details.post_mapped_hgvs_p)) {
              nameParts.push(`Variant: ${variant.details.post_mapped_hgvs_p}`)
            } else if (variantNotNullOrNA(variant.details.hgvs_pro_inferred)) {
              nameParts.push(`Variant: ${variant.details.hgvs_pro_inferred}`)
            }
            if (variantNotNullOrNA(variant.details.post_mapped_hgvs_c)) {
              nameParts.push(`NT variant: ${variant.details.post_mapped_hgvs_c}`)
            }
        }
      }
      if (nameParts.length == 0) {
        if (variantNotNullOrNA(variant.details.hgvs_nt)) {
          nameParts.push(`NT variant: ${variant.details.hgvs_nt}`)
        }
        if (variantNotNullOrNA(variant.details.hgvs_pro)) {
          nameParts.push(`Protein variant: ${variant.details.hgvs_pro}`)
        } else if (variantNotNullOrNA(variant.details.hgvs_pro_inferred)) {
          nameParts.push(`Protein variant: ${variant.details.hgvs_pro_inferred}`)
        }
        if (variantNotNullOrNA(variant.details.hgvs_splice)) {
          nameParts.push(`Splice variant: ${variant.details.hgvs_splice}`)
        }
      }
      parts.push(...nameParts)
      if (variant.numScores != null) {
        parts.push(`# of observations: ${variant.numScores}`)
      }
      if (variant.numScores == 1) {
        parts.push(`Score: ${variant.meanScore}`)
      } else if (variant.numScores > 1) {
        parts.push(`Mean score: ${variant.meanScore}`)
        parts.push(`Score stdev: ${variant.scoreStdev}`)
      }

      return parts.length > 0 ? parts.join('<br />') : null
    }
  }
})
</script>

<style scoped>
.mavedb-heatmap-controls {
  display: none;
  align-items: center;
  gap: 10px;
  position: absolute;
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

.mavedb-heatmap-wrapper:hover .mavedb-heatmap-controls {
  display: flex;
  flex-direction: row;
}

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
