<template>
  <div v-if="heatmapVisible">
    <div v-if="targetNameOptions.length > 1">
      <Dropdown
        v-model="selectedTargetName"
        :options="targetNameOptions"
        placeholder="Select a target"
      />
    </div>
    <div style="text-align: center;">
      <span v-if="targetNameOptions.length > 1">{{ selectedTargetName }}:</span>
      Functional Score by Variant
    </div>
    <div class="mave-heatmap-wrapper">
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
      </div>
    </div>
    <div v-if="numComplexVariantsForSelectedTarget > 0">{{numComplexVariantsForSelectedTarget}} variant observations are for complex variants and cannot be shown on this type of chart.</div>
  </div>
</template>

<script lang="ts">

import * as d3 from 'd3'
import _ from 'lodash'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import {PropType} from 'vue'

import {saveChartAsFile} from '@/lib/chart-export'
import geneticCodes from '@/lib/genetic-codes'
import makeHeatmap, {
  heatmapRowForNucleotideVariant,
  heatmapRowForProteinVariant,
  HEATMAP_AMINO_ACID_ROWS,
  HEATMAP_NUCLEOTIDE_ROWS,
  type Heatmap,
  type HeatmapDatum,
  type HeatmapRowSpecification
} from '@/lib/heatmap'
import {getVariantTarget, parseSimpleProVariant, parseSimpleNtVariant, variantNotNullOrNA} from '@/lib/mave-hgvs'
import {components} from '@/schema/openapi'

function stdev(array: number[]) {
  if (!array || array.length === 0) {
    return 0
  }
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

type HeatmapLayout = 'normal' | 'compact'

type ScoreSet = components['schemas']['ScoreSet']

/** A variant observation. */
interface VariantObservation {
  hgvs_nt?: string
  hgvs_pro?: string
  score?: number
  [key: string]: any
}

/** A variant observation, with its target and heatmap coordinates extracted. */
interface HeatmapVariantObservation {
  target: string
  x: number
  y: number
  score?: number
  /** The underlying observation details, excluding the score. */
  observation: Omit<VariantObservation, 'score'>
}

/**
 * A variant to be plotted on the heatmap.
 *
 * It may represent
 * - One or more observations of the same variant (wild-type or substitution)
 * - Or a wild-type variant that has no observations.
 */
interface HeatmapVariant {
  target: string
  x: number
  y: number
  /** The mean score, or undefined if no observations have scores. */
  meanScore?: number
  /** The scores' standard deviation, 0 if there are no scores. */
  scoreStdev?: number
  /** This variant's rank among all variants at this position, sorted by score, where rank 0 has the lowest score. */
  scoreRank?: number
  /** The number of observations of this variant. */
  numObservations: number
  /** Observations of this variant. This may be empty for wild-type variants. */
  observations: VariantObservation[]
  details: (Omit<VariantObservation, 'score'> & {wt?: boolean})
}

export default {
  name: 'ScoreSetHeatmap',
  components: {Dropdown, SelectButton},
  emits: ['exportChart', 'heatmapVisible', 'variantSelected'],

  props: {
    // Margins must accommodate the axis labels.
    margins: {
      type: Object as PropType<{top: number, right: number, bottom: number, left: number}>,
      default: () => ({
        top: 0,
        right: 0,
        bottom: 20,
        left: 20
      })
    },
    scores: {
      type: Array as PropType<VariantObservation[]>,
      required: true
    },
    scoreSet: {
      type: Object as PropType<ScoreSet>,
      required: true
    },
    externalSelection: {
      type: Object,
      required: false,
      default: null
    }
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
    // Status
    isMounted: false,

    // Data
    simpleVariants: {} as {[target: string]: HeatmapVariant[]},
    numComplexVariantObservations: {} as {[target: string]: number},

    // Heatmap visualizations
    heatmap: null as Heatmap | null,
    stackedHeatmap: null as Heatmap | null,

    // User-selectable options
    selectedTargetName: '',
    layout: 'normal' as HeatmapLayout
  }),

  computed: {
    numComplexVariantsForSelectedTarget: function(): number {
      return this.numComplexVariantObservations[this.selectedTargetName] || 0
    },
    simpleAndWtVariantsForSelectedTarget: function(): HeatmapVariant[] {
      return [...this.simpleVariants[this.selectedTargetName] || [], ...this.wtVariantsForSelectedTarget || []]
    },
    allVariantsHaveHgvsPro: function(): boolean {
      return this.scores.every((variantObservation) => variantObservation.hgvs_pro != null && variantObservation.hgvs_pro != 'NA')
    },
    /**
     * Whether to treat the score set as nucleic-acid-based.
     *
     * Any score set lacking at least one hgvs_pro field is treated as nucleic-acid-based. This does not mean we will
     * show a nucleotide heatmap, but it does mean that we will not show amino acid heatmaps.
     */
    isNucleicAcidScoreSet: function(): boolean {
      return !this.allVariantsHaveHgvsPro
    },
    /**
     * Whether to show a nucleotide heatmap.
     *
     * We show the nucleotide heatmap when the score set is nucleic-acid-based and the target category is
     * `other-noncoding` or `regulatory`.
     */
    isNucleotideHeatmap: function(): boolean {
      const targetCategory = this.selectedTargetGene?.category
      // return !this.allVariantsHaveHgvsPro && targetCategory != null && ['other_noncoding', 'regulatory'].includes(targetCategory)
      return !this.allVariantsHaveHgvsPro && targetCategory != null && ['protein_coding', 'other_noncoding', 'regulatory'].includes(targetCategory)
    },
    heatmapRows: function(): HeatmapRowSpecification[] {
      return this.allVariantsHaveHgvsPro ? HEATMAP_AMINO_ACID_ROWS : HEATMAP_NUCLEOTIDE_ROWS
    },
    heatmapRowForVariant: function () {
      return this.allVariantsHaveHgvsPro ? heatmapRowForProteinVariant : heatmapRowForNucleotideVariant
    },
    parseSimpleVariant: function () {
      return this.allVariantsHaveHgvsPro ? parseSimpleProVariant : parseSimpleNtVariant
    },
    selectedTargetGene: function() {
      return this.getTargetGene(this.selectedTargetName)
    },
    wtSequenceForSelectedTarget: function() {
      return this.getWtSequenceForTarget(this.selectedTargetName)
    },
    wtVariantsForSelectedTarget: function() {
      return this.wtSequenceForSelectedTarget ?
          this.prepareWtVariantsForSelectedTarget(this.selectedTargetName, this.wtSequenceForSelectedTarget) : []
    },
    heatmapVisible: function() {
      return this.targetNameOptions.length > 0 && (!this.isNucleicAcidScoreSet || this.isNucleotideHeatmap)
    },
    selectedVariant: function() {
      return this.externalSelection ? this.simpleAndWtVariantsForSelectedTarget.filter(
        (variant) => variant.details?.accession == this.externalSelection.accession
      )[0] : null
    },
    /**
     * List of target names that can be selected in the dropdown.
     *
     * Target names can be obtained either from the variant MaveHGVS strings or from the target names in the score set's
     * list of target genes. MaveDB's validation ensures that these are consistent, except when there is one target gene,
     * in which case the MaveHGVS strings need not have a prefix (or, in some legacy score sets, may have a prefix other
     * than the target gene's name).
     *
     * If there is only one target, '' will be used as its target name, and the dropdown will not be shown.
     */
    targetNameOptions: function(): string[] {
      const targetNames = this.scoreSet?.targetGenes?.map((targetGene) => targetGene.name) || []
      if (targetNames.length == 1) {
        return ['']
      }
      return targetNames
    },
    /**
     * Whether to ignore reference identifiers that occur as prefixes in variant MaveHGVS strings.
     *
     * Reference identifiers are ignored when there is only one target, because in this case they are optional in the
     * MaveHGVS strings. (And for some legacy score sets, they may be present but inconsistent with the target gene's
     * name.)
     */
    ignoreHgvsReferences: function(): boolean {
      return this.targetNameOptions.length < 2
    },
    wtScore: function() {
      if (!this.scoreSet?.scoreRanges) {
        return null
      }
      return this.scoreSet.scoreRanges.wtScore
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
          this.simpleVariants = {}
          this.numComplexVariantObservations = {}
          this.selectedTargetName = ''
        } else {
          const {simpleVariants, numComplexVariantObservations} = this.prepareVariants(this.scores)
          this.simpleVariants = simpleVariants
          this.numComplexVariantObservations = numComplexVariantObservations
          if (!Object.keys(this.simpleVariants).includes(this.selectedTargetName)) {
            this.selectedTargetName = this.targetNameOptions[0]
          }
        }

        this.renderOrRefreshHeatmaps()
      },
      immediate: true
    },
    simpleAndWtVariantsForSelectedTarget: {
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
    yCoord: function(d: HeatmapDatum) {
      return d?.y
    },
    vRank: function(d: HeatmapDatum) {
      return d?.scoreRank
    },

    exportChart() {
      saveChartAsFile(this.$refs.heatmapContainer, `${this.scoreSet.urn}-scores-heatmap`, 'mave-heatmap-container')
    },

    /**
     * Rank the variants at each position by score.
     *
     * This is necessary for the stacked heatmap, which displays variants at each position sorted by score.
     */
    prepareSimpleVariantScoreRanks(simpleVariants: {[target: string]: HeatmapVariant[]}) {
      for (const targetName of Object.keys(simpleVariants)) {
        _.mapValues(_.groupBy(simpleVariants[targetName], 'x'), (variantsAtOnePosition) => {
          const variantsSortedByScore = _.sortBy(variantsAtOnePosition, 'meanScore')
          variantsAtOnePosition.forEach((v) => v.scoreRank = variantsSortedByScore.indexOf(v))
        })
      }
    },

    /**
     * Prepare one target's wild-type variants for the heatmap.
     *
     * The variants returned do not have scores or observations, and they have details.wt set to true.
     *
     * TODO We currently assume that there are no observations of wild-type variants.
     *
     * @param targetName The target name, which may be an empty string in the case of a single-target score set.
     * @param wtSequence The wild-type sequence for one target.
     * @return An array of HeatmapVariant objects describing the wild-type variants.
     */
    prepareWtVariantsForSelectedTarget: function(targetName: string, wtSequence: string[]) {
      return wtSequence.map((base, i) => {
        const row = base ? this.heatmapRowForVariant(base) : null
        if (row == null) {
          return null
        }
        return {
          target: targetName,
          x: i + 1,
          y: this.heatmapRows.length - 1 - row,
          numObservations: 0,
          observations: [],
          details: {
            wt: true
          }
        }
      })
          .filter((x) => x != null)
    },

    /**
     * Prepare variant observations for the heatmap by extracting the target, x and y coordinates, and score of each
     * observation.
     *
     * Complex variants are ignored. The number of complex variants is counted for each target.
     *
     * Variants are also ignored if they lie outside the target sequence's range of positions or if their alternate
     * allele does not correspond to a heatmap row (which means that it is not recognized as a valid substitution). The
     * number of ignored variants is counted for each target.
     *
     * @param variantObservations All variant observations in the score set.
     * @return An object containing the simple variant observations, the number of complex variant observations, and the
     *   number of ignored variant observations. Each property is a map keyed by target name.
     */
    prepareVariantObservations: function(variantObservations: VariantObservation[]) {
      const numComplexVariantObservations: {[target: string]: number} = {}

      // Count of variants that do not appear to be complex but are don't have a valid substitution
      const numIgnoredVariantObservations: {[target: string]: number} = {}

      const targetSequences = _.fromPairs(
        this.targetNameOptions.map(
          (targetName) => [targetName, this.getWtSequenceForTarget(targetName)]
        )
      )

      const simpleVariantObservations: {[target: string]: HeatmapVariantObservation[]} = _.groupBy(
        _.filter(
          variantObservations.map((variantObservation) => {
            // We only use the hgvs_pro field if all variants have it. Otherwise we treat this as a nucleic-acid-based
            // score set.
            const hgvs = this.allVariantsHaveHgvsPro ? variantObservation.hgvs_pro : variantObservation.hgvs_nt
            if (!hgvs || hgvs == 'NA') {
              return null
            }
            const variant = this.parseSimpleVariant(hgvs)

            // Get the effective target name. If there is only one target, use an empty string; otherwise get the target
            // name from the HGVS string.
            const targetName = (this.ignoreHgvsReferences ? '' : (variant ? variant.target : getVariantTarget(hgvs))) || ''

            if (!variant) {
              numComplexVariantObservations[targetName] = (numComplexVariantObservations[targetName] || 0) + 1
              return null
            }
            // Don't display variants out of range from the provided sequence. This happens occassionally
            // with legacy variant data.
            if (variant.position > this.getWtSequenceForTarget(targetName).length) {
              console.log(`WARNING: Variant out of target range: ${hgvs}`)
              numIgnoredVariantObservations[targetName] = (numIgnoredVariantObservations[targetName] || 0) + 1
              return null
            }
            const row = this.heatmapRowForVariant(variant.substitution)
            if (row == null) {
              console.log(`WARNING: Unrecognized substitution in variant: ${hgvs}`)
              numIgnoredVariantObservations[targetName] = (numIgnoredVariantObservations[targetName] || 0) + 1
              return null
            }
            const x = variant.position
            const y = this.heatmapRows.length - 1 - row
            return {
              target: targetName,
              x,
              y,
              score: variantObservation.score,
              observation: _.omit(variantObservation, 'score')
            }
          }),
          (variantData) => variantData != null
        ),
        'target'
      )

      return {simpleVariantObservations, numComplexVariantObservations, numIgnoredVariantObservations}
    },

    /***
     * Prepare the simple variants for the heatmap.
     *
     * @param variantObservations All variant observations in the score set.
     * @return An object containing the simple variants and the number of complex variant observations. Both properties
     *   are maps keyed by target name. If there are no simple variants for a target, the target will not appear in the
     *   simple variants map.
     */
    prepareVariants: function(variantObservations: VariantObservation[]) {
      const {simpleVariantObservations, numComplexVariantObservations} = this.prepareVariantObservations(variantObservations)

      const simpleVariantObservationsByHeatmapPosition = _.mapValues(simpleVariantObservations,
        (observations: HeatmapVariantObservation[], _target) => _.flatten(
          _.values(
            _.mapValues(
              _.groupBy(observations, 'x'),
              (observationsAtX) => _.values(_.groupBy(observationsAtX, 'y'))
            )
          )
        )
      )
      const simpleVariants: {[target: string]: HeatmapVariant[]} = _.mapValues(simpleVariantObservationsByHeatmapPosition,
        (observationsByHeatmapPosition, _target) => observationsByHeatmapPosition.map(
          (observations) => {
            const scores = observations.map((observation) => observation.score).filter((score) => score != null)
            return {
              ..._.pick(observations[0], ['target', 'x', 'y']),
              meanScore: scores.length == 0 ? undefined : (scores.reduce((a, b) => a + b, 0) / scores.length),
              scoreStdev: stdev(scores),
              numObservations: observations.length,
              observations,

              // Assume that aside from the score, details are identical for each observation of the variant.
              details: _.omit(observations[0].observation, 'score')
            }
          }
        )
      )
      this.prepareSimpleVariantScoreRanks(simpleVariants)

      return {
        simpleVariants,
        numComplexVariantObservations
      }
    },

    getTargetGene: function(targetName: string) {
      if (this.ignoreHgvsReferences) {
        return this.scoreSet.targetGenes[0]
      }
      console.log(this.scoreSet.targetGenes)
      return this.scoreSet.targetGenes.find((targetGene) => targetGene.name == targetName)
    },

    getWtSequenceForTarget: function(targetName: string) {
      const targetGene = this.getTargetGene(targetName)
      const wtSequence = targetGene?.targetSequence?.sequence
      const wtSequenceType = targetGene?.targetSequence?.sequenceType

      if (!wtSequence) {
        return []
      } else if (wtSequenceType === 'protein') {
        return _.toArray(wtSequence)
      } else if (this.isNucleotideHeatmap) {
        return this.dnaToSingletons(wtSequence)
      } else {
        return this.translateDnaToAminoAcids1Char(wtSequence)
      }
    },

    translateDnaToAminoAcids1Char: function(dna: string | string[]): string[] {
      const triplets = this.dnaToTriplets(dna)
      return triplets.map((triplet) => this.translateCodon(triplet))
    },

    dnaToTriplets: function(dna: string | string[]): string[] {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /.../g)
    },

    dnaToSingletons: function(dna: string | string[]): string[] {
      if (_.isArray(dna)) {
        dna = dna.join('')
      }
      return _.words(dna, /./g)
    },

    translateCodon: function(codon: string): string | undefined {
      return geneticCodes.standard.dna.codonToAa[codon]
    },

    variantSelected: function(datum: HeatmapDatum) {
      if (datum === null) {
        this.$emit('variantSelected', null)
      } else {
        this.$emit('variantSelected', datum.details)
      }
    },

    renderOrRefreshHeatmaps: function() {
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
        .tooltipHtml(this.tooltipHtmlGetter)
        .datumSelected(this.variantSelected)

      if (this.layout == 'compact') {
        this.heatmap.nodeBorderRadius(0)
          .nodePadding(0)
          .nodeSize({width: 1, height: 20})
          .skipXTicks(99)
      }

      this.heatmap.data(this.simpleAndWtVariantsForSelectedTarget)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => variant.details.wt ? d3.color('#ddbb00') : variant.meanScore)
        .refresh()
        .selectDatum(this.selectedVariant)
    },

    drawStackedHeatmap: function() {
      this.stackedHeatmap = makeHeatmap()
        .margins({top: 20, bottom: 25, left: 20, right: 20})
        .render(this.$refs.simpleVariantsStackedHeatmapContainer)
        .rows(this.heatmapRows)
        .nodeSize({width: 20, height: 1})
        .xCoordinate(this.xCoord)
        .yCoordinate(this.vRank)
        .drawY(false)
        .drawLegend(false)
        .alignViaLegend(true)
        .excludeDatum((d) => d.details.wt ? true : false)

      this.stackedHeatmap.data(this.simpleAndWtVariantsForSelectedTarget)
        .valueField((d) => d.meanScore)
        .colorClassifier((variant) => variant.details.wt ? d3.color('#ddbb00') : variant.meanScore)
        .refresh()
        .selectDatum(this.selectedVariant)
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
}

.heatmapContainer:deep(.heatmap-color-bar-labels) {
  font-size: 14px;
}

.heatmapContainer:deep(.heatmap-y-axis-tick-label-lg) {
  font-size: 22px;
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
