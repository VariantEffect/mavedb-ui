<template>
  <div v-if="heatmapVisible">
    <div class="mave-heatmap-wrapper">
      <template v-if="showHeatmap">
        <div style="text-align: center;">Functional Score by Variant</div>
        <div id="mave-heatmap-container" class="heatmapContainer" ref="heatmapContainer">
          <div id="mave-heatmap-scroll-container" class="heatmapScrollContainer" ref="heatmapScrollContainer">
            <div id="mave-stacked-heatmap-container" class="mave-simple-variants-stacked-heatmap-container" ref="simpleVariantsStackedHeatmapContainer" />
            <div id="mave-variants-heatmap-container" class="mave-simple-variants-heatmap-container" ref="simpleVariantsHeatmapContainer" />
          </div>
        </div>
        <div class="mave-heatmap-controls">
          <span class="mave-heatmap-controls-title">Heatmap format</span>
          <SelectButton
            v-model="layout"
            :allow-empty="false"
            option-label="title"
            option-value="value"
            :options="[{title: 'Normal', value: 'normal'}, {title: 'Compact', value: 'compact'}]"
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
          <p>A variant should be present at <strong>at least 5% of possible positions</strong> to generate a heatmap.</p>
        </div>
      </template>
    </div>
    <div v-if="numComplexVariants > 0">{{numComplexVariants}} variants are complex and cannot be shown on this type of chart.</div>
  </div>
</template>

<script lang="ts">

import * as d3 from 'd3'
import _ from 'lodash'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'

import geneticCodes from '@/lib/genetic-codes'
import makeHeatmap, {heatmapRowForNucleotideVariant, heatmapRowForProteinVariant, HEATMAP_AMINO_ACID_ROWS, HEATMAP_NUCLEOTIDE_ROWS, HeatmapDatum} from '@/lib/heatmap'
import {parseSimpleProVariant, parseSimpleNtVariant, variantNotNullOrNA} from '@/lib/mave-hgvs'
import { saveChartAsFile } from '@/lib/chart-export'
import { Heatmap } from '@/lib/heatmap'
import { PropType } from 'vue'
import {SPARSITY_THRESHOLD} from '@/lib/scoreSetHeatmap'

function stdev(array: number[]) {
  if (!array || array.length === 0) {
    return 0
  }
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

type HeatmapLayout = 'normal' | 'compact'

export default {
  name: 'ScoreSetHeatmap',
  components: {SelectButton, Button},
  emits: ['variantSelected', 'variantColumnRangesSelected', 'heatmapVisible', 'exportChart', 'onDidClickShowProteinStructure'],

  props: {
    margins: { // Margins must accommodate the axis labels
      type: Object,
      default: () => ({
        top: 0,
        right: 0,
        bottom: 20,
        left: 20
      })
    },
    scores: {
      type: Array,
      required: true
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
      type: Boolean,
      default: true,
    },
    mode: {
      type: String as PropType<'standard' | 'protein-viz'>,
      default: 'standard'
    },
  },

  mounted: function() {
    this.renderOrRefreshHeatmaps()
    this.$emit('exportChart', this.exportChart)
  },

  beforeUnmount: function() {
    if (this.heatmap) {
      this.heatmap.destroy()
      this.heatmap = null
    }
    if (this.stackedHeatmap) {
      this.stackedHeatmap.destroy()
      this.stackedHeatmap = null
    }
  },

  data: () => ({
    isMounted: false,
    proteinStructureVisible: false,
    simpleVariants: null,
    numComplexVariants: 0,
    heatmap: null as Heatmap | null,
    stackedHeatmap: null as Heatmap | null,
    layout: 'normal' as HeatmapLayout
  }),

  expose: ['simpleVariants', 'heatmap', 'scrollToPosition'],


  computed: {
    simpleAndWtVariants: function() {
      return [...this.simpleVariants || [], ...this.wtVariants || []]
    },
    isNucleotideHeatmap: function() {
      const targetCategory = _.get(this.scoreSet, 'targetGenes[0].category')
      const proteinVariantsAreDefined = this.scores.every((elem) => !isNaN(elem.hgvs_pro))
      return !proteinVariantsAreDefined && (targetCategory === 'other_noncoding' || targetCategory == "regulatory")
    },
    heatmapRows: function() {
      return this.isNucleotideHeatmap ? HEATMAP_NUCLEOTIDE_ROWS : HEATMAP_AMINO_ACID_ROWS
    },
    heatmapRowForVariant: function () {
      return this.isNucleotideHeatmap ? heatmapRowForNucleotideVariant : heatmapRowForProteinVariant
    },
    parseSimpleVariant: function () {
      return this.isNucleotideHeatmap ? parseSimpleNtVariant : parseSimpleProVariant
    },
    // TODO: Swapable Targets
    heatmapRange: function() {
      const wtSequence = _.get(this.scoreSet, 'targetGenes[0].targetSequence.sequence')
      const wtSequenceType = _.get(this.scoreSet, 'targetGenes[0].targetSequence.sequenceType')

      if (!wtSequence) {
        return []
      } else if (wtSequenceType === "protein") {
        return _.toArray(wtSequence)
      } else if (this.isNucleotideHeatmap) {
        return this.dnaToSingletons(wtSequence)
      } else {
        return this.translateDnaToAminoAcids1Char(wtSequence)
      }
    },
    wtVariants: function() {
      return this.heatmapRange ? this.prepareWtVariants(this.heatmapRange) : []
    },
    heatmapVisible: function() {
      return this.simpleVariants && this.simpleVariants.length
    },
    selectedVariant: function() {
      return this.externalSelection ? this.simpleAndWtVariants.filter((variant) => variant.details?.accession == this.externalSelection.accession)[0] : null
    },
    wtScore: function() {
      if (!this.scoreSet?.scoreRanges) {
        return null
      }

      return this.scoreSet.scoreRanges.wtScore
    },
    showHeatmap: function() {
      if (this.scores.length === 0) {
        return false
      }
      // the early termination and wild type variants shouldn't effect the heatmap so that remove the final three rows.
      const hasVariant = Array.from({ length: this.heatmapRows.length - 3 }, () =>
        Array(this.heatmapRange.length).fill(false)
      )

      for (const variant of this.simpleVariants) {
        if (
          typeof variant.x === 'number' &&
          typeof variant.y === 'number' &&
          variant.x >= 0 && variant.x < this.heatmapRange.length &&
          variant.y >= 0 && variant.y < this.heatmapRows.length - 3
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

      return sparsity > SPARSITY_THRESHOLD // A boolean value
    },
  },

  watch: {
    layout: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.renderOrRefreshHeatmaps()
        }
      }
    },
    scores: {
      handler: function() {
        if (!this.scores) {
          this.simpleVariants = null
          this.numComplexVariants = 0
        } else {
          const {simpleVariants, numComplexVariants} = this.prepareSimpleVariants(this.scores)
          this.simpleVariants = simpleVariants
          this.numComplexVariants = numComplexVariants
        }

        this.renderOrRefreshHeatmaps()
      },
      immediate: true
    },
    simpleAndWtVariants: {
      handler: function() {
        this.renderOrRefreshHeatmaps()
      },
      immediate: true
    },
    selectedVariant: {
      handler: function(newValue) {
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
      handler: function(newValue, oldValue) {
        if (newValue === oldValue) {
          return
        }
        this.$emit('heatmapVisible', newValue)
      },
      immediate: true
    }
  },

  methods: {
    xCoord: function(d: HeatmapDatum) {
      return d?.x
    },
    accession: function(d: HeatmapDatum) {
      return d?.details.accession
    },
    yCoord: function(d: HeatmapDatum) {
      return d?.y
    },
    vRank: function(d: HeatmapDatum) {
      return d?.scoreRank
    },

    scrollToPosition: function(position: number) {
      this.$refs.heatmapScrollContainer.scrollTo({
        left: position,
        behavior: 'smooth'
      })
    },

    exportChart() {
      saveChartAsFile(this.$refs.heatmapContainer, `${this.scoreSet.urn}-scores-heatmap`, 'mave-heatmap-container')
    },

    showProteinStructure() {
      this.proteinStructureVisible = true
    },

    // We assume that there will only be one substitution variant for each target AA at a given position.
    prepareSimpleVariantScoreRanks(simpleVariants) {
      _.mapValues(_.groupBy(simpleVariants, 'x'), (variantsAtOnePosition) => {
        const variantsSortedByScore = _.sortBy(variantsAtOnePosition, 'meanScore')
        variantsAtOnePosition.forEach((v) => v.scoreRank = variantsSortedByScore.indexOf(v))
      })
    },

    prepareWtVariants: function(heatmapRange) {
      return heatmapRange.map((el, i) => el == null ? null : ({
        x: i + 1,
        y: this.heatmapRows.length - 1 - this.heatmapRowForVariant(el),
        details: {
          wt: true
        }
      }))
          .filter((x) => x != null)
    },

    prepareSimpleVariantInstances: function(scores) {
      let numComplexVariantInstances = 0

      // Count of variants that do not appear to be complex but are don't have a valid substitution
      let numIgnoredVariantInstances = 0

      const distinctAccessions = new Set()

      let simpleVariantInstances = _.filter(
        scores.map((score) => {
          const vToParse = this.isNucleotideHeatmap ? score.hgvs_nt : score.hgvs_pro
          const variant = this.parseSimpleVariant(vToParse)
          if (!variant) {
            numComplexVariantInstances++
            return null
          }
          if (variant.target) {
            distinctAccessions.add(variant.target)
          }
          // Don't display variants out of range from the provided sequence. This happens occassionally
          // with legacy variant data.
          if (variant.position > this.heatmapRange.length) {
            numIgnoredVariantInstances++
            return null
          }
          const row = this.heatmapRowForVariant(variant.substitution)
          if (row == null) {
            numIgnoredVariantInstances++
            return null
          }
          const x = variant.position
          const y = this.heatmapRows.length - 1 - row
          return {x, y, score: score.score, details: _.omit(score, 'score')}
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

    prepareSimpleVariants: function(scores) {
      const {simpleVariantInstances, numComplexVariantInstances} = this.prepareSimpleVariantInstances(scores)

      const simpleVariants = _.flatten(
        _.values(
          _.mapValues(
            _.groupBy(simpleVariantInstances, 'x'),
            (instancesAtX) => _.values(_.groupBy(instancesAtX, 'y'))
          )
        )
      )
          .map((v) => ({
            ..._.pick(v[0], ['x', 'y']),
            instances: v
          }))
      for (const simpleVariant of simpleVariants) {
        const scores = simpleVariant.instances.map((instance) => instance.score).filter((s) => s != null)
        simpleVariant.numScores = scores.length
        simpleVariant.meanScore = scores.length == 0 ? null : (scores.reduce((a, b) => a ? a:null + b ? b:null, 0) / scores.length)
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

    translateDnaToAminoAcids1Char: function(dna) {
      const triplets = this.dnaToTriplets(dna)
      return triplets.map((triplet) => this.translateCodon(triplet))
    },

    dnaToTriplets: function(dna) {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /.../g)
    },

    dnaToSingletons: function(dna) {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /./g)
    },

    translateCodon: function(codon) {
      return geneticCodes.standard.dna.codonToAa[codon]
    },

    variantSelected: function(datum: HeatmapDatum) {
      if (datum === null) {
        this.$emit('variantSelected', null)
      } else {
        this.$emit('variantSelected', datum.details)
      }
    },

    variantColumnRangesSelected: function(ranges: Array<{start: number, end: number}>) {
      this.$emit('variantColumnRangesSelected', ranges)
    },

    renderOrRefreshHeatmaps: function() {
      if (!this.simpleAndWtVariants) {
        return
      }

      this.heatmap?.destroy()
      this.stackedHeatmap?.destroy()

      this.drawHeatmap()
      if (!this.isNucleotideHeatmap && this.layout != 'compact') {
        this.drawStackedHeatmap()
      }
    },

    // Assumes that plate dimensions do not change.
    drawHeatmap: function() {
      this.heatmap = makeHeatmap()
        .margins({top: 0, bottom: 25, left: 20, right: 20})
        .legendTitle("Functional Score")
        .render(this.$refs.simpleVariantsHeatmapContainer)
        .rows(this.heatmapRows)
        .xCoordinate(this.xCoord)
        .yCoordinate(this.yCoord)
        .accessorField(this.accession)
        .tooltipHtml(this.tooltipHtmlGetter)
        .datumSelected(this.variantSelected)

      if (!this.heatmap) {
        return
      }

      if (this.mode == 'protein-viz') {
        this.heatmap.rangeSelectionMode('column')
          .columnRangesSelected(this.variantColumnRangesSelected)
      }

      if (this.layout == 'compact') {
        this.heatmap.nodeBorderRadius(0)
          .nodePadding(0)
          .nodeSize({width: 1, height: 20})
          .skipXTicks(99)
      }

      this.heatmap.data(this.simpleAndWtVariants)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => variant.details.wt ? d3.color('#ddbb00') : variant.meanScore)
        .refresh()

      if (this.selectedVariant) {
        this.heatmap.selectDatum(this.selectedVariant)
      } else {
        this.heatmap.clearSelection()
      }
    },

    drawStackedHeatmap: function() {
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
        .excludeDatum((d) => d.details.wt ? true : false)

      if (!this.stackedHeatmap) {
        return
      }

      this.stackedHeatmap.data(this.simpleAndWtVariants)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => variant.details.wt ? d3.color('#ddbb00') : variant.meanScore)
        .refresh()

      if (this.selectedVariant) {
        this.stackedHeatmap.selectDatum(this.selectedVariant)
      } else {
        this.stackedHeatmap.clearSelection()
      }
    },

    tooltipHtmlGetter: function(variant: HeatmapDatum) {
        const parts = []
        if (variant.details.wt) {
          parts.push('WT')
        }
        if (variantNotNullOrNA(variant.details.hgvs_nt)) {
          parts.push(`NT variant: ${variant.details.hgvs_nt}`)
        }
        if (variantNotNullOrNA(variant.details.hgvs_pro)) {
          parts.push(`Protein variant: ${variant.details.hgvs_pro}`)
        }
        if (variantNotNullOrNA(variant.details.hgvs_splice)) {
          parts.push(`Splice variant: ${variant.details.hgvs_splice}`)
        }
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
  }

</script>

<style>

.heatmap-tooltip {
  position: absolute;
}

</style>

<style scoped>

.mave-heatmap-controls {
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

.mave-heatmap-controls .p-selectbutton {
  display: inline-block;
}

.mave-heatmap-controls * {
  vertical-align: middle;
}

.mave-heatmap-controls-title {
  font-weight: bold;
}

.mave-heatmap-wrapper {
  position: relative;
}

.mave-heatmap-wrapper:hover .mave-heatmap-controls {
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

.heatmapLegendContainer {
  float: left;
  position: absolute;
}

.heatmapScrollContainer {
  overflow-x: auto;
  position: relative;
}

.heatmapContainer:deep(.heatmap-y-axis-tick-labels) {
  font-size: 14px;
  user-select: none;
}

.heatmapContainer:deep(.heatmap-color-bar-labels) {
  font-size: 14px;
  user-select: none;
}

.heatmapContainer:deep(.heatmap-y-axis-tick-label-lg) {
  font-size: 22px;
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
  height: .5em;
}

::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, .5);
  box-shadow: 0 0 1px rgba(255, 255, 255, .5);
}
</style>
