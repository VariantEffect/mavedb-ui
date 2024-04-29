<template>
  <div v-if="showHeatmap">
    <div class="mave-simple-variants-heatmaps-container">
      <div class="mave-simple-variants-heatmap-container" ref="simpleVariantsStackedHeatmapContainer" />
      <div class="mave-simple-variants-heatmap-container" ref="simpleVariantsHeatmapContainer" />
    </div>
    <div v-if="numComplexVariants > 0">{{numComplexVariants}} variants are complex and cannot be shown on this type of chart.</div>
  </div>
</template>

<script>

import _ from 'lodash'
import * as d3 from 'd3'

import geneticCodes from '@/lib/genetic-codes'
import {heatmapRowForVariant, HEATMAP_ROWS} from '@/lib/heatmap'
import {parseSimpleProVariant} from '@/lib/mave-hgvs'

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
    showHeatmap: function() {
      return this.simpleVariants && this.simpleVariants.length
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
      const simpleVariantInstances = _.filter(
        scores.map((score) => {
          const variant = parseSimpleProVariant(score.hgvs_pro)
          if (!variant) {
            numComplexVariantInstances++
            return null
          }
          if (variant.substitution == 'Ter') {
            return null
          }
          const x = variant.position
          const y = HEATMAP_ROWS.length - 1 - heatmapRowForVariant(variant.substitution)
          return {x, y, score: score.score, details: _.omit(score, 'score')}
        }),
        (x) => x != null
      )
      return {simpleVariantInstances, numComplexVariantInstances}
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
        simpleVariant.meanScore = scores.length == 0 ? null : (scores.reduce((a, b) => a + b, 0) / scores.length)
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
          showYTickMarks: false
        })
      }
    },

    renderTooltip: function() {
      let self = this
      self.tooltip = d3.select(document.body)
          .append('div')
          .style('display', 'none')
          .attr('class', 'samplify-gene-expression-assay-results-plate-view-tooltip')
          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('padding', '5px')
          .style('z-index', 2001)
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
      showYTickMarks = true
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
                    .tickFormat((n) => {
                      // Get the row's amino acid code or variation symbol.
                      const label = HEATMAP_ROWS[HEATMAP_ROWS.length - 1 - n]
                      // If the row's symbol is * (deletion), display a centered asterisk instead.
                      return label == '*' ? '\uff0a' : label
                    })
              )
              .select('.domain').remove()
          // Use larger text for - and = symbols.
          svg.selectAll('g.mave-heatmap-y-axis-tick-labels g.tick')
              .classed('mave-heatmap-y-axis-tick-label-lg', (n) => {
                const text = HEATMAP_ROWS[HEATMAP_ROWS.length - 1 - n]
                return ['-', '='].includes(text)
              })
        }

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

        const mouseover = function() { //event, d) {
          self.tooltip.style('display', 'block')
          //tooltip.style('opacity', 1)
          d3.select(this)
              .attr('x', d => xScale(xCoordinate(d)) + strokeWidth(d, true) / 2)
              .attr('y', d => yScale(yCoordinate(d)) + strokeWidth(d, true) / 2)
              .attr('width', d => xScale.bandwidth() - strokeWidth(d, true))
              .attr('height', d => yScale.bandwidth() - strokeWidth(d, true))
              .style('stroke', d => stroke(d, true))
              .style('stroke-width', d => strokeWidth(d, true))
              .style('opacity', 1);
        }

        const mousemove = function(event, d) {
          const parts = []
          if (d.details.wt) {
            parts.push('WT')
          }
          if (d.details.hgvs_nt && d.details.hgvs_nt != 'NA') {
            parts.push(`NT variant: ${d.details.hgvs_nt}`)
          }
          if (d.details.hgvs_pro && d.details.hgvs_pro != 'NA') {
            parts.push(`Protein variant: ${d.details.hgvs_pro}`)
          }
          if (d.details.hgvs_splice && d.details.hgvs_splice != 'NA') {
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
          /*
          if (d.details.accession) {
            parts.push(`Accession: ${d.details.accession}`)
          }
          */
          self.tooltip
              .html(parts.join('<br />'))
              .style('left', (d3.pointer(event, document.body)[0] + 50) + 'px')
              .style('top', (d3.pointer(event, document.body)[1]) + 'px');
        }

        const mouseleave = function() { //event, d) {
          self.tooltip.style('display', 'none')
          //tooltip.style('opacity', 0)
          d3.select(this)
              .attr('x', d => xScale(xCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('y', d => yScale(yCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('width', d => xScale.bandwidth() - strokeWidth(d, false))
              .attr('height', d => yScale.bandwidth() - strokeWidth(d, false))
              .style('stroke', d => stroke(d, false))
              .style('stroke-width', d => strokeWidth(d, false))
              .style('opacity', 0.8);
        }

        const click = function(event, d) {
          let previousSelectionIndex = self.wellSelectionIndex(d);
          if (previousSelectionIndex != null) {
            self.deselectWells({itemIds: [d._id]})
          } else {
            self.selectWells({itemIds: [d._id], addToSelection: event.shiftKey})
          }
        }

        const doubleClick = function() {}

        const color = function(d) {
          if (d.details.wt) {
            return d3.color('#ddbb00')
          }
          return d3.interpolateRdBu(1.0 - d.meanScore / 2.0)
        }

        const cancelableClick = function() {
          // Euclidean distance
          const dist = (a, b) => {
            return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
          }

          // Method is assumed to be a standard D3 getter-setter:
          // If passed with no arguments, gets the value.
          // If passed with arguments, sets the value and returns the target.
          const rebindMethod = (target, source, method) => {
            return (...args) => {
              const value = method.apply(source, args)
              return value === source ? target : value
            }
          }

          // Copy a variable number of methods from source to target.
          const rebind = (target, source, ...methods) => {
            for (let method of methods) {
              target[method] = rebindMethod(target, source, source[method])
            }
            return target
          }

          // see: http://bl.ocks.org/ropeladder/83915942ac42f17c087a82001418f2ee
          //      based on: http://bl.ocks.org/couchand/6394506
          return({tolerance = 5, timeout = 200} = {}) => {
            const dispatcher = d3.dispatch('click', 'dblclick');

            const cc = (selection) => {
              let downPt;
              //let lastTs;
              let waitId;
              let eventArgs;

              selection.on('mousedown', (event, ...args) => {
                downPt = d3.pointer(event, document.body);
                //lastTs = Date.now();
                eventArgs = [event, ...args];
              });

              selection.on('click', (e) => {
                if (dist(downPt, d3.pointer(e, document.body)) >= tolerance) {
                  return;
                }

                if (waitId) {
                  window.clearTimeout(waitId);
                  waitId = null;
                  dispatcher.apply('dblclick', selection, eventArgs);
                } else {
                  waitId = window.setTimeout(
                    () => {
                      dispatcher.apply('click', selection, eventArgs);
                      waitId = null;
                    },
                    timeout
                  );
                }
              });
            };

            return rebind(cc, dispatcher, 'on');
          }
        }

        let cc = cancelableClick()({
          // Maximum Euclidean distance from mouse down (x,y) to mouse up (x,y) that will count as one click
          tolerance: 10,
          // Maximum duration of a double-click. All single clicks will have to wait this long.
          timeout: 300,
        })

        cc.on('click', click)
            .on('dblclick', doubleClick)

        const refresh = function(variants) {
          const chartVariants = svg.selectAll('rect.well')
              .data(variants, (d) => d)
          chartVariants.exit().remove()
          chartVariants.enter()
              .append('rect')
              .attr('class', 'mave-heatmap-item')
              .attr('rx', 4)
              .attr('ry', 4)
              .style('cursor', 'pointer')
              .style('opacity', 0.8)
              .on('mouseover', mouseover)
              .on('mousemove', mousemove)
              .on('mouseleave', mouseleave)
              .call(cc)
          .merge(chartVariants)
              .attr('x', d => xScale(xCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('y', d => yScale(yCoordinate(d)) + strokeWidth(d, false) / 2)
              .attr('width', d => xScale.bandwidth() - strokeWidth(d, false))
              .attr('height', d => yScale.bandwidth() - strokeWidth(d, false))
              .style('fill', d => color(d))
              .style('stroke-width', d => strokeWidth(d, false))
              .style('stroke', d => stroke(d, false))
        }

        refresh(variants)

        return {refresh}
      }
    }
  }
}

</script>

<style>

.samplify-gene-expression-assay-results-plate-view-tooltip {
  position: absolute;
}

</style>

<style scoped>

.mave-simple-variants-heatmaps-container {
  position: relative;
  overflow-x: auto;
}

.mave-simple-variants-heatmaps-container:deep(.mave-heatmap-y-axis-tick-labels) {
  font-size: 14px;
}

.mave-simple-variants-heatmaps-container:deep(.mave-heatmap-y-axis-tick-label-lg) {
  font-size: 22px;
}

</style>
