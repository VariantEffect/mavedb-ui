<template>
  <div v-if="heatmapVisible">
    <div id="mave-heatmap-scroll-container" class="heatmapContainer">
      <div id="mave-stacked-heatmap-container" class="mave-simple-variants-heatmap-container" ref="simpleVariantsStackedHeatmapContainer" />
      <div id="mave-variants-heatmap-container" class="mave-simple-variants-heatmap-container" ref="simpleVariantsHeatmapContainer" />
    </div>
    <div v-if="numComplexVariants > 0">{{numComplexVariants}} variants are complex and cannot be shown on this type of chart.</div>
  </div>
</template>

<script>

import _ from 'lodash'
import * as d3 from 'd3'

import geneticCodes from '@/lib/genetic-codes'
import {heatmapRowForVariant, HEATMAP_ROWS} from '@/lib/heatmap'
import {parseSimpleProVariant, variantNotNullOrNA} from '@/lib/mave-hgvs'

function stdev(array) {
  if (!array || array.length === 0) {
    return 0
  }
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

export default {
  name: 'ScoreSetHeatmap',

  emits: ['variantSelected', 'heatmapVisible'],

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
    }
  },

  mounted: function() {
    this.renderTooltip()
    this.isMounted = true
    this.renderOrRefreshHeatmap()
    this.renderOrRefreshStackedHeatmap()
  },

  beforeUnmount: function() {
    this.isMounted = false
    if (this.tooltip) {
      this.tooltip.remove()
    }
  },

  data: () => ({
    isMounted: false,
    simpleVariants: null,
    numComplexVariants: 0,
  }),

  computed: {
    heatmapColumns: function() {
      const variants = this.simpleAndWtVariants
      if (variants && variants.length > 0) {
        return _.range(_.minBy(variants, 'x').x, _.maxBy(variants, 'x').x + 1)
      } else {
        return []
      }
    },
    simpleAndWtVariants: function() {
      return [...this.simpleVariants || [], ...this.wtVariants || []]
    },
    // TODO: Swappable targets
    wtAminoAcids: function() {
      const wtDnaSequenceType = _.get(this.scoreSet, 'targetGenes[0].targetSequence.sequenceType')
      const wtDnaSequence = _.get(this.scoreSet, 'targetGenes[0].targetSequence.sequence')
      if (!wtDnaSequence || wtDnaSequenceType != 'dna') {
        return []
      }
      return this.translateDnaToAminoAcids1Char(wtDnaSequence)
    },
    wtVariants: function() {
      return this.wtAminoAcids ? this.prepareWtVariants(this.wtAminoAcids) : []
    },
    heatmapVisible: function() {
      const heatmapVisible = this.simpleVariants && this.simpleVariants.length
      this.$emit('heatmapVisible', heatmapVisible)
      return heatmapVisible
    },
    selectedVariant: function() {
      return this.externalSelection ? this.simpleAndWtVariants.filter((variant) => variant.details?.accession == this.externalSelection.accession)[0] : null
    }
  },

  watch: {
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
      },
      immediate: true
    },
    simpleAndWtVariants: {
      handler: function() {
        this.renderOrRefreshHeatmap()
      },
      immediate: true
    },
    externalSelection: {
      handler: function() {
        this.refreshSelectionTooltipIfRendered()
      },
      immediate: true
    }
    /*
    variantsByPositionSorted: {
      handler: function() {
        this.renderOrRefreshStackedHeatmap()
      }
    }
    */
  },

  methods: {
    // We assume that there will only be one substitution variant for each target AA at a given position.
    prepareSimpleVariantScoreRanks(simpleVariants) {
      _.mapValues(_.groupBy(simpleVariants, 'x'), (variantsAtOnePosition) => {
        const variantsSortedByScore = _.sortBy(variantsAtOnePosition, 'meanScore')
        variantsAtOnePosition.forEach((v) => v.scoreRank = variantsSortedByScore.indexOf(v))
      })
    },

    prepareWtVariants: function(wtAminoAcids) {
      return wtAminoAcids.map((aa, i) => aa == null ? null : ({
        x: i + 1,
        y: HEATMAP_ROWS.length - 1 - heatmapRowForVariant(aa),
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
          const variant = parseSimpleProVariant(score.hgvs_pro)
          if (!variant) {
            numComplexVariantInstances++
            return null
          }
          if (variant.target) {
            distinctAccessions.add(variant.target)
          }
          const row = heatmapRowForVariant(variant.substitution)
          if (row == null) {
            numIgnoredVariantInstances++
            return null
          }
          const x = variant.position
          const y = HEATMAP_ROWS.length - 1 - row
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

    translateCodon: function(codon) {
      return geneticCodes.standard.dna.codonToAa[codon]
    },

    // Assumes that plate dimensions do not change.
    renderOrRefreshHeatmap: function() {
      console.log("re-rendering")
      if (!this.simpleAndWtVariants) {
        return
      }
      if (this.heatmap) {
        this.heatmap.refresh(this.simpleAndWtVariants)
      } else {
        this.heatmap = this.renderHeatmap({
          container: this.$refs.simpleVariantsHeatmapContainer,
          variants: this.simpleAndWtVariants,
          rowHeight: 20,
          colWidth: 20
        })
      }
    },

    refreshSelectionTooltipIfRendered: function() {
      if (!this.simpleAndWtVariants) {
        return
      }
      if (this.heatmap) {
        this.heatmap.refreshSelectionTooltip()
      } else {
        return
      }
    },

    // Assumes that plate dimensions do not change.
    renderOrRefreshStackedHeatmap: function() {
      if (!this.simpleVariants) {
        return
      }
      if (this.stackedHeatmap) {
        this.stackedHeatmap.refresh(this.simpleVariants)
      } else {
        this.stackedHeatmap = this.renderHeatmap({
          container: this.$refs.simpleVariantsStackedHeatmapContainer,
          variants: this.simpleVariants,
          rowHeight: 2,
          colWidth: 20,
          yCoordinate: (d) => d.scoreRank,
          showYTickMarks: false,
          showSelectionTooltip: false
        })
      }
    },

    renderTooltip: function() {
      let self = this
      self.tooltip = d3.select(document.body)
          .append('div')
          .style('display', 'none')
          .attr('class', 'heatmap-mouseover-selection-tooltip')
          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('padding', '5px')
          .style('z-index', 2001)
    },

    variantSelected: function(variant) {
      this.$emit('variantSelected', variant.details)
    },

    // -------------------------------------------------------------------------------------------------
    // Heatmap rendering & drawing
    // -------------------------------------------------------------------------------------------------

    renderHeatmap: function({
      container,
      variants,
      rowHeight = 20,
      colWidth = 20,
      xCoordinate = (d) => d.x,
      yCoordinate = (d) => d.y,
      showYTickMarks = true,
      showSelectionTooltip = true
    } = {}) {
      const self = this

      // const variants = self.simpleAndWtVariants

      if (!self.isMounted || !variants || variants.length == 0 || !container) {
        return null
      } else {
        // let rows = _.sortBy(_.uniq(_.map(self.scores, 'y')))
        // const cols = _.sortBy(_.uniq(_.map(self.scores, 'x')))
        const rows = _.range(0, HEATMAP_ROWS.length)
        const cols = self.heatmapColumns // _.range(_.minBy(variants, 'x').x, _.maxBy(variants, 'x').x + 1)

        const height = rowHeight * rows.length
        const width = colWidth * cols.length

        var priorSelection = self.selectedVariant

        const svg = d3.select(container)
            .html(null)
            .append('svg')
            .attr('width', width + self.margins.left + self.margins.right)
            .attr('height', height + self.margins.top + self.margins.bottom)
            .append('g')
            .attr('transform', 'translate(' + self.margins.left + ',' + self.margins.top + ')')

        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(cols)
            .padding(0.05)
        svg.append('g')
            .style('font-size', 15)
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(xScale).tickSize(0))
            .select('.domain').remove()

        const yScale = d3.scaleBand()
            .range([0, height])
            .domain(rows)
            .padding(0.05)
        if (showYTickMarks) {
          svg.append('g')
              .attr('class', 'mave-heatmap-y-axis-tick-labels')
              .call(
                d3.axisLeft(yScale)
                    .tickSize(0)
                    // Get the row's amino acid code or variation symbol.
                    .tickFormat((n) => HEATMAP_ROWS[HEATMAP_ROWS.length - 1 - n].label)
              )
              .select('.domain').remove()
          // Apply row-specific CSS classes to Y-axis tick mark labels.
          svg.selectAll('g.mave-heatmap-y-axis-tick-labels g.tick')
              .attr('class', (n) => HEATMAP_ROWS[HEATMAP_ROWS.length - 1 - n].cssClass || '')
        }

        const selectionTooltip = d3.select(this.$refs.simpleVariantsHeatmapContainer)
          .append('div')
          .style('display', 'none')
          .attr('class', 'heatmap-external-selection-tooltip')
          .attr('id', 'heatmap-external-selection-tooltip')
          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('padding', '5px')
          .style('position', 'relative')
          .style('width', 'fit-content')
          .style('z-index', 1)

        const stroke = function(d, isMouseOver) {
          if (isMouseOver) {
            return '#000'
          } else {
            return 'none'
          }
        }

        const strokeWidth = function(d, isMouseOver) {
          let strokeColor = stroke(d, isMouseOver)
          if (strokeColor == 'none') {
            return 0
          }
          return isMouseOver ? 2 : 0;
        }

        const constructTooltip = function(d) {
          const parts = []
          if (d.details.wt) {
            parts.push('WT')
          }
          if (variantNotNullOrNA(d.details.hgvs_nt)) {
            parts.push(`NT variant: ${d.details.hgvs_nt}`)
          }
          if (variantNotNullOrNA(d.details.hgvs_pro)) {
            parts.push(`Protein variant: ${d.details.hgvs_pro}`)
          }
          if (variantNotNullOrNA(d.details.hgvs_splice)) {
            parts.push(`Splice variant: ${d.details.hgvs_splice}`)
          }
          if (d.numScores != null) {
            parts.push(`# of observations: ${d.numScores}`)
          }
          if (d.numScores == 1) {
              parts.push(`Score: ${d.meanScore}`)
          } else if (d.numScores > 1) {
            parts.push(`Mean score: ${d.meanScore}`)
            parts.push(`Score stdev: ${d.scoreStdev}`)
          }

          return parts
        }

        const showVariantOutline = function(d) {
          d3.selectAll(`.mave-heatmap-item-${d.x}-${d.y}`)
            .style('stroke', stroke(d, true))
            .style('stroke-width', strokeWidth(d, true))
            .style('opacity', 1);
        }

        const hideVariantOutline = function(d) {
          d3.selectAll(`.mave-heatmap-item-${d.x}-${d.y}`)
            .style('stroke', stroke(d, false))
            .style('stroke-width', strokeWidth(d, false))
            .style('opacity', 0.8);
        }

        const scrollToVariant = function(d) {
          const scrollValue = xScale(xCoordinate(d)) + strokeWidth(d) / 2
          const scrollDiv = document.getElementById("mave-heatmap-scroll-container")

          // Only scroll if the variant is not in view.
          const variantIsInView = scrollDiv.scrollLeft < scrollValue && scrollDiv.clientWidth + scrollDiv.scrollLeft > scrollValue
          if (!variantIsInView) {
            document.getElementById("mave-heatmap-scroll-container").scrollLeft = scrollValue
          }
        }

        const mouseover = function(event, d) {
          // If we are moused over the selected variant, don't display this tooltip.
          if (self.selectedVariant && self.selectedVariant == d) {
            self.tooltip.style('display', 'none')
            return
          }

          self.tooltip.style('display', 'block')
          showVariantOutline(d)
        }

        const mousemove = function(event, d) {
          // If we mouse onto the selected variant, don't display this tooltip.
          if (self.selectedVariant && self.selectedVariant == d) {
            self.tooltip.style('display', 'none')
            return
          }

          const parts = constructTooltip(d)
          self.tooltip
              .html(parts.join('<br />'))
              .style('left', (d3.pointer(event, document.body)[0] + 50) + 'px')
              .style('top', (d3.pointer(event, document.body)[1]) + 'px');
        }

        const mouseleave = function(event, d) {
          self.tooltip.style('display', 'none')

          // Don't undraw the variant outline when the mouse leaves the selected variant.
          if (!(self.selectedVariant && self.selectedVariant == d)) {
            hideVariantOutline(d)
          }

        }

        const displaySelectionTooltip = function() {
          const parts = constructTooltip(self.selectedVariant)

          selectionTooltip
            .html(parts.join('<br />'))
            .style('display', 'block')

          // Scroll to variant prior to setting constant properties so we are operating with the correct values.
          scrollToVariant(self.selectedVariant)

          // The left and top anchor positions for this tooltip.
          const left = xScale(xCoordinate(self.selectedVariant) + 2) + strokeWidth(self.selectedVariant, false) / 2
          const top = yScale(yCoordinate(self.selectedVariant)) - strokeWidth(self.selectedVariant, false) / 2

          // Properties of this tooltip.
          const elementProperties = document.getElementById('heatmap-external-selection-tooltip')
          const tooltipHeight = elementProperties.clientHeight;
          const tooltipWidth = elementProperties.clientWidth;
          const tooltipBorders = elementProperties.clientTop;

          // The divs which contain this tooltip.
          const scrollableContainer = document.getElementById("mave-heatmap-scroll-container")
          const heatmapContainer = document.getElementById("mave-variants-heatmap-container")

          // Setting the margin-bottom property to a negative value equal to the total height of the tooltip
          // ensures the tooltip div doesn't occupy any space in the document flow.
          selectionTooltip.style('margin-bottom', -tooltipHeight -(tooltipBorders*2) + "px")

          // Show the tooltip to the right of the variant if it would overflow from the heatmap container.
          if (left + tooltipWidth > scrollableContainer.scrollLeft + scrollableContainer.clientWidth) {
            // tooltip needs a small amount of additional padding when shown on the inverse side to look correct.
            selectionTooltip
              .style('left', left - tooltipWidth - (tooltipBorders * 2) - colWidth - 5 + 'px')
          } else {
            selectionTooltip
              .style('left', left + tooltipBorders + 'px')
          }

          // Show the tooltip under the variant square if it is in the top quarter of the heatmap so
          // it doesn't obscure the stacked heatmap.
          if (yCoordinate(self.selectedVariant) < rows.length / 4) {
            selectionTooltip
              .style('top', null)
              .style('bottom', heatmapContainer.clientHeight - top - tooltipHeight + 'px')
          } else {
            selectionTooltip
              .style('top', -(heatmapContainer.clientHeight - top) + rowHeight + 'px')
              .style('bottom', null)
          }

          showVariantOutline(self.selectedVariant)
        }

        const hideTooltipForVariant = function(variant) {
          selectionTooltip.style('display', 'none')
          hideVariantOutline(variant)
        }

        const click = function(event, d) {
          self.variantSelected(d)
        }

        const color = function(d) {
          if (d.details.wt) {
            return d3.color('#ddbb00')
          }
          return d3.interpolateRdBu(1.0 - d.meanScore / 2.0)
        }

        const refresh = function(variants) {
          const chartVariants = svg.selectAll('rect.well')
              .data(variants, (d) => d)
          chartVariants.exit().remove()
          chartVariants.enter()
              .append('rect')
              .attr('class', d => `mave-heatmap-item-${d.x}-${d.y}`)
              .attr('rx', 4)
              .attr('ry', 4)
              .style('cursor', 'pointer')
              .style('opacity', 0.8)
              .on('mouseover', mouseover)
              .on('mousemove', mousemove)
              .on('mouseleave', mouseleave)
              .on('click', click)
          .merge(chartVariants)
              .attr('x', d => xScale(xCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('y', d => yScale(yCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('width', d => xScale.bandwidth() - strokeWidth(d, false))
              .attr('height', d => yScale.bandwidth() - strokeWidth(d, false))
              .style('fill', d => color(d))
              .style('stroke-width', d => strokeWidth(d, false))
              .style('stroke', d => stroke(d, false))

          refreshSelectionTooltip()
        }

        const refreshSelectionTooltip = function() {
          if (!showSelectionTooltip) {
            if (self.selectedVariant) {
              hideTooltipForVariant(self.selectedVariant)
            }
            if (priorSelection) {
              hideTooltipForVariant(self.selectedVariant)
            }
            return
          }

          if (priorSelection) {
            hideTooltipForVariant(priorSelection)
          }

          if (!self.selectedVariant){
            priorSelection = null
            return
          }

          priorSelection = self.selectedVariant
          displaySelectionTooltip()
          // spoof a mouseover event so we can undraw the mouseover tooltip in the case that the
          // mouse is hovering over the selected variant.
          mouseover({}, self.selectedVariant)
        }

        refresh(variants)

        return {refresh, refreshSelectionTooltip}
      }
    }
  }
}

</script>

<style>

.heatmap-mouseover-selection-tooltip {
  position: absolute;
}

</style>

<style scoped>

.heatmapContainer {
  position: relative;
  overflow-x: auto;
}

.heatmapContainer:deep(.mave-heatmap-y-axis-tick-labels) {
  font-size: 14px;
}

.heatmapContainer:deep(.mave-heatmap-y-axis-tick-label-lg) {
  font-size: 22px;
}

</style>
