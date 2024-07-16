<template>
  <TabMenu class="mave-histogram-viz-select" v-if="hasTabBar" v-model:activeIndex="activeViz" :model="vizOptions" />
  <div v-if="hasControls" class="mave-histogram-controls">
    <div class="mave-histogram-control">
      <label for="mave-histogram-star-select" class="mave-histogram-control-label">Minimum ClinVar review status 'gold stars': </label>
      <Rating v-model="customMinStarRating" :stars="4" style="display: inline" inputId="mave-histogram-star-select" />
    </div>
    <div class="mave-histogram-control">
      <span class="mave-histogram-control-label">Include variants with classification: </span>
      <div class="flex flex-wrap gap-3">
        <div v-for="clnsig of clnsigs" :key="clnsig.key" class="flex gap-1 align-items-center">
          <Checkbox v-model="customSelectedClnsigs" :inputId="clnsig.key" name="clnsig" :value="clnsig.key" />
          <label :for="clnsig.key">{{ clnsig.displayName }}</label>
        </div>
      </div>
    </div>
  </div>
  <div class="mave-histogram-container" ref="histogramContainer">
  </div>
</template>

<script>

import * as d3 from 'd3'

import Checkbox from 'primevue/checkbox'
import Rating from 'primevue/rating'
import TabMenu from 'primevue/tabmenu'

import { CLNSIG_DISPLAY_NAMES, CLNREVSTAT_STARS } from '@/lib/clinvar'

const DEFAULT_CLNSIGS = [
  'Likely_pathogenic',
  'Pathogenic',
  'Pathogenic/Likely_pathogenic',
  'Likely_benign',
  'Benign',
  'Benign/Likely_benign'
]
const DEFAULT_MIN_STAR_RATING = 1

export default {
  name: 'ScoreSetHistogram',
  components: { Checkbox, Rating, TabMenu, },

  props: {
    margins: { // Margins must accommodate the X axis label and title.
      type: Object,
      default: () => ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 20
      })
    },
    numBins: {
      type: Number,
      default: 30,
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
      default: null,
      required: false
    }
  },

  mounted: function() {
    this.renderTooltip()
    this.isMounted = true
    this.renderOrRefreshHistogram()
  },

  beforeUnmount: function() {
    this.isMounted = false
    if (this.tooltip) {
      this.tooltip.remove()
    }
  },

  data: () => ({
    isMounted: false,
    bins: [],
    seriesBinned: [],
    activeViz: 0,
    clnsigs: Object.keys(CLNSIG_DISPLAY_NAMES).map((clnsig) => {
      return {
        key: clnsig,
        displayName: CLNSIG_DISPLAY_NAMES[clnsig].short_name,
      }
    }),
    customMinStarRating: DEFAULT_MIN_STAR_RATING,
    customSelectedClnsigs: DEFAULT_CLNSIGS,
  }),

  computed: {
    selectionBinIdx: function() {
      const self = this
      const binContainsScore = function(bin) {
        return self.externalSelection?.score && self.externalSelection.score != 'NA' ?
            self.externalSelection.score >= bin.x0 && self.externalSelection.score < bin.x1 : false
      }

      return self.bins.findIndex(binContainsScore)
    },
    selectionSeries: function() {
      if (this.selectionBinIdx == -1) {
        return null
      }
      // Check to see if this variant is in any currently displayed series in the bin that contains it. If not, return null.
      const serie = this.seriesBinned[this.selectionBinIdx].seriesBins.find((serie) => {
        return serie.some((variant) => variant.accession == this.externalSelection.accession)
      })
      return serie || null
    },
    vizOptions: function() {
      const ret = [{label: 'Overall Distribution'}]
      if (this.scores.some((item) => item.mavedb_clnsig !== undefined)) {
        ret.push({label: 'Clinical View'})
        ret.push({label: 'Custom'})
      }
      return ret
    },
    hasTabBar: function() {
      return this.vizOptions.length > 1
    },
    hasControls: function() {
      return this.activeViz == 2
    },
    selectedClnsigs: function() {
      if (this.activeViz == 1) {
        return DEFAULT_CLNSIGS
      }
      return this.customSelectedClnsigs
    },
    minStarRating: function() {
      if (this.activeViz == 1) {
        return DEFAULT_MIN_STAR_RATING
      }
      return this.customMinStarRating
    },
  },

  watch: {
    scores: {
      handler: function() {
        if (!this.scores) {
          this.bins = []
        } else {
          this.bins = d3.bin().thresholds(this.numBins).value((d) => d.score)(this.scores)

          // add an index to each bin to simplify class based fetching of bin divs.
          this.bins.forEach(function(bin, index) {
            bin.idx = index;
          });
        }
      },
      immediate: true
    },
    bins: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    },
    activeViz: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    },
    externalSelection: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    },
    minStarRating: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    },
    selectedClnsigs: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    },
  },

  methods: {
    renderOrRefreshHistogram: function() {
      if (!this.bins) {
        return
      }
      if (this.histogram) {
        this.histogram.refresh(this.bins)
      } else {
        this.histogram = this.renderHistogram({
          container: this.$refs.histogramContainer,
          bins: this.bins
        })
      }
    },

    renderTooltip: function() {
      let self = this
      self.tooltip = d3.select(document.body)
          .append('div')
          .style('display', 'none')
          .attr('class', 'mave-histogram-tooltip')
          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('padding', '5px')
          .style('z-index', 2001)
      },

    binsToSeries: function(bins, {filter = (item) => true, color = '153,153,153', displayName = ''} = {}) {
      if (!bins.length) {
        return []
      }
      const ret = []
      
      // Indexed by x0
      const binCounts = {}

      // Start the line at the bottom-left of the first bin.
      const line = [{x: bins[0].x0, y: 0}]

      // Draw the two ends of what would be the 'top' of each bin.
      bins.forEach((bin) => {
        const filtered = bin.filter(filter)
        ret.push(filtered)
        const binCount = filtered.length
        binCounts[bin.x0] = binCount
        line.push({x: bin.x0, y: binCount})
        line.push({x: bin.x1, y: binCount})
      })
      const maxBinCount = d3.max(Object.values(binCounts))

      // End the line at the bottom-right of the last bin.
      line.push({x: bins[bins.length - 1].x1, y: 0})

      return Object.assign(ret, { line, maxBinCount, color, binCounts, displayName })
    },

    // -------------------------------------------------------------------------------------------------
    // Clinical variant parsing
    // -------------------------------------------------------------------------------------------------
    filterVariants: function({
      allowable_clnsig,
      clnsig_field = 'mavedb_clnsig',
      clnrevstat_field = 'mavedb_clnrevstat',
    }) {
      return (variant) => {
        if (allowable_clnsig.includes(variant[clnsig_field]) &&
            CLNREVSTAT_STARS[variant[clnrevstat_field]] >= this.minStarRating) {
          return true
        }
        return false
      }
    },

    // -------------------------------------------------------------------------------------------------
    // Histogram rendering & drawing
    // -------------------------------------------------------------------------------------------------

    renderHistogram: function({
      container,
      bins,
      height = 300,
    } = {}) {
      // d3 makes special use of 'this' in event handlers, so we use 'self' to refer to the component here.
      const self = this

      if (!self.isMounted || !bins || !bins.length || !container) {
        return null
      } else {
        const contents = d3.select(container)
            .html(null)
            .append('svg')
            .attr('width', container.clientWidth)
            .attr('height', height + self.margins.top + self.margins.bottom)

        // First, calculate space required for y axis and label for the largest possible number of
        // variants. We will need to re-scale the y-axis for displaying smaller numbers (i.e. for the
        // clinical view), but this will give us enough space for the y-axis at maximum axis width (i.e.
        // with the longest number in the variant count).
        // Give 5% breathing room at the top of the chart.
        const yMaxAll = d3.max(bins, (d) => d.length) * 1.05
        let yScale = d3.scaleLinear()
            .domain([0, yMaxAll])
            .range([height, 0])

        // Add temporary y axis, for measuring.
        const tempYAxis = contents.append('g')
            .style('visibility', 'hidden')
            .call(d3.axisLeft(yScale).ticks(10))

        const labelSize = 10;
        const yAxisWidthWithLabel = tempYAxis.node().getBoundingClientRect().width + labelSize

        tempYAxis.remove()

        // Calculate final margins using calculated width.
        const margins = {
          top: self.margins.top,
          right: self.margins.right,
          bottom: self.margins.bottom,
          left: self.margins.left + yAxisWidthWithLabel,
        }
        const width = container.clientWidth - (margins.left + margins.right)

        // Add plot title when only one visualization is present.
        if (!self.hasTabBar) {
          contents.append('text')
              .attr('x', margins.left + width / 2 )
              .attr('y', 24)
              .style('text-anchor', 'middle')
              .text('Distribution of Functional Scores')
        }

        // Main canvas to which chart elements will be added.
        const svg = contents
            .append('g')
            .attr('transform', `translate(${margins.left},${margins.top})`)

        const firstBin = bins[0]
        const lastBin = bins[bins.length - 1]
        const xScale = d3.scaleLinear()
            // Expand domain from that of the data by the size of the first and last bin.
            // This assumes not all bins are of equal size, though they currently are.
            .domain([firstBin.x0 - (firstBin.x1 - firstBin.x0), lastBin.x1 + (lastBin.x1 - lastBin.x0)])
            .range([0, width])

        // Add x axis and label.
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(10))

        svg.append('text')
            .attr('class', 'mave-histogram-axis-label')
            .attr('x', width / 2)
            .attr('y', height + 25)
            .attr('font-size', labelSize)
            .style('text-anchor', 'middle')
            .text('Functional Score')

        svg.append('text')
            .attr('class', 'mave-histogram-axis-label')
            .attr('transform', `translate(${-(yAxisWidthWithLabel - labelSize / 2)},${height / 2})rotate(-90)`)
            .attr('font-size', labelSize)
            .style('text-anchor', 'middle')
            .text('Number of Variants')

        const selectionTooltip = d3.select(this.$refs.histogramContainer)
          .append('div')
          .style('display', 'none')
          .attr('class', 'mave-selection-histogram-tooltip')
          .attr('id', 'mave-selection-histogram-tooltip')

          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('padding', '5px')

          .style('position', 'relative')
          .style('width', 'fit-content')

          .style('z-index', 1)

        const opacity = (d, isMouseOver) => {
          // Don't show if there's no data in this bin.
          if (!d.seriesBins.some((serie) => serie.length)) {
            return 0
          }
          return isMouseOver ? 1 : 0
        }

        const showTooltip = (tooltip, d, variant) => {
          // Construct the tooltip.
          const parts = []

          if (variant) {
            parts.push(variant.mavedb_label)
            let variantDescription = ''
            if (self.selectionSeries == null) {
              variantDescription += '(not shown) '
            } else if (self.selectionSeries?.displayName) {
              variantDescription +=
                `<span class="mave-histogram-tooltip-variant-color" style="background-color: rgb(${
                  self.selectionSeries.color})"></span>`
            }
            if (variant.mavedb_clnsig && variant.mavedb_clnsig != 'NA') {
              variantDescription += `${CLNSIG_DISPLAY_NAMES[variant.mavedb_clnsig].variant_name} `
            }
            if (variant.mavedb_clnrevstat && variant.mavedb_clnrevstat != 'NA') {
              const num_stars = CLNREVSTAT_STARS[variant.mavedb_clnrevstat]

              // Create an array of 4 stars to hold clinical review status a la ClinVar.
              const stars = new Array(4).fill(
                '<span class="mave-histogram-tooltip-variant-star mave-histogram-tooltip-variant-star-filled">★</span>')
                  .fill('<span class="mave-histogram-tooltip-variant-star">☆</span>', num_stars)
              variantDescription += `(${stars.join('')})`
            }
            if (variantDescription) {
              parts.push(variantDescription)
            }
            if (variant.score) {
                parts.push(`Score: ${variant.score.toPrecision(4)}`)
            }
            parts.push('')
          }

          parts.push(`Range: ${d.x0} to ${d.x1}`)

          // TODO: Instead of using series display names here, could break out into specific variant category.
          d.seriesBins.forEach((serie) => {
            parts.push(`Number of ${serie.displayName ? serie.displayName + ' ' : ''}variants: ${serie.length}`)
          })

          tooltip.html(parts.join('<br />'))

          // Show the tooltip.
          tooltip.style('display', 'block')
        }

        // Using function, not arrow notation, so that 'this' is the event target.
        const mouseover = function(event, d) {
          // Hide the selected variant tooltip
          if (self.externalSelection && self.selectionBinIdx != -1) {
            d3.select(`.mave-histogram-hover-highlight-${self.selectionBinIdx}`).style(
              'opacity', opacity(self.seriesBinned[self.selectionBinIdx], false))
          }

          // show the mouse over tooltip and hide the tooltip for the currently selected variant.
          showTooltip(self.tooltip, d, null)
          hideSelectionTooltip()

          // Outline the highlight for this bin.
          d3.select(this)
            .select(`rect.mave-histogram-hover-highlight-${d.idx}`)
              .style('opacity', opacity(d, true))
        }

        const mousemove = function(event, d) {
          // Move tooltip to be 50px to the right of the pointer.
          self.tooltip
              .style('left', (d3.pointer(event, document.body)[0] + 50) + 'px')
              .style('top', (d3.pointer(event, document.body)[1]) + 'px')
        }

        const mouseleave = function(event, d) {
          // Hide the tooltip and the highlight.
          self.tooltip.style('display', 'none')
          d3.select(this)
            .select(`rect.mave-histogram-hover-highlight-${d.idx}`)
              .style('opacity', opacity(d, false))

          // redraw the tooltip from the selected variant
          displaySelectionTooltip()
        }

        const displaySelectionTooltip = function() {
          // Don't do anything if there is no selected variant.
          if (!self.externalSelection || self.selectionBinIdx == -1) {
            selectionTooltip
              .style('display', 'none')
            return
          }

          showTooltip(selectionTooltip, self.seriesBinned[self.selectionBinIdx], self.externalSelection)
          positionSelectionTooltip()

          // highlight the bin
          d3.select(`.mave-histogram-hover-highlight-${self.selectionBinIdx}`).style(
            'opacity', opacity(self.seriesBinned[self.selectionBinIdx], true))
        }

        const positionSelectionTooltip = function() {
          const width = document.body.clientWidth
          const left = xScale(self.seriesBinned[self.selectionBinIdx].x1) + margins.left
          var top = -(yScale(0) - yScale(self.seriesBinned[self.selectionBinIdx].maxBinSize)) - margins.bottom

          selectionTooltip
            // Add a small buffer area to the left side of the tooltip so it doesn't overlap with the bin.
            .style('left', left + 5 + "px")
            // Ensure the tooltip doesn't extend outside of the histogram container.
            .style('max-width', width - left + "px")

          const elementProperties = document.getElementById('mave-selection-histogram-tooltip')
          const height = elementProperties.clientHeight;
          const borders = elementProperties.clientTop;

          // Move the tooltip above the x-axis if it would have obscured it.
          if (top > -(height + margins.bottom)) {
            top -= height
          }

          selectionTooltip
            // Add a small buffer to the vertical placement of the tooltip so it doesn't overlap with the axis.
            .style('top', top - 15 + "px")
            // A pretty silly workaround to the fact that this div is relatively positioned and would
            // otherwise take up space in the document flow.
            .style('margin-bottom', -height -(borders*2) + "px")
        }

        const hideSelectionTooltip = function() {
          selectionTooltip
            .style('display', 'none')
        }

        const refresh = function(bins) {
          svg.selectAll('.mave-histogram-no-data-message').remove()
          svg.selectAll('.mave-histogram-line').remove()
          svg.selectAll('.mave-histogram-hovers').remove()
          svg.selectAll('.mave-histogram-y-axis').remove()
          svg.selectAll('.mave-histogram-legend').remove()

          let series = []
          if (self.activeViz == 0) {
            series = [self.binsToSeries(bins)]
          } else {
            const pathogenicFilter = self.filterVariants({
              allowable_clnsig: ['Likely_pathogenic', 'Pathogenic', 'Pathogenic/Likely_pathogenic'].filter(
                (clnsig) => self.selectedClnsigs.includes(clnsig)
              ),
            })
            const benignFilter = self.filterVariants({
              allowable_clnsig: ['Likely_benign', 'Benign', 'Benign/Likely_benign'].filter(
                (clnsig) => self.selectedClnsigs.includes(clnsig)
              ),
            })
            // Display names must be unique for tooltips to work.
            // TODO: update these display names so that they change depending on whether or not likely (etc.) variants are included.
            series = [
              self.binsToSeries(bins, {
                filter: pathogenicFilter,
                color: "228,26,28",
                displayName: 'Pathogenic/Likely Pathogenic'
              }),
              self.binsToSeries(bins, {
                filter: benignFilter,
                color: "55,126,184",
                displayName: 'Benign/Likely Benign'
              }),
            ]

            if (self.selectedClnsigs.includes('Uncertain_significance')) {
              series.push(self.binsToSeries(bins, {
                filter: self.filterVariants({allowable_clnsig: ['Uncertain_significance']}),
                // Default grey color
                displayName: 'Uncertain significance',
              }))
            }
            if (self.selectedClnsigs.includes('Conflicting_interpretations_of_pathogenicity')) {
              series.push(self.binsToSeries(bins, {
                filter: self.filterVariants({allowable_clnsig: ['Conflicting_interpretations_of_pathogenicity']}),
                color: '152,78,163',
                displayName: 'Conflicting',
              }))
            }
          }
          self.seriesBinned = bins.map((bin, idx) => {
            const seriesBins = series.map((serie) => Object.assign(serie[idx], {color: serie.color, displayName: serie.displayName}))
            const maxBinSize = d3.max(seriesBins, (bin) => bin.length)
            return {
              x0: bin.x0,
              x1: bin.x1,
              idx: bin.idx,
              seriesBins, 
              maxBinSize,
            }
          })

          const yMax = d3.max(series, (d) => d.maxBinCount) * 1.05
          yScale = d3.scaleLinear()
              .domain([0, yMax])
              .range([height, 0])
          
          const yAxis = svg.append('g')
              .attr('class', 'mave-histogram-y-axis')
              .call(d3.axisLeft(yScale).ticks(10))

          if (yMax == 0) {
            svg.append('text')
                .attr('class', 'mave-histogram-no-data-message')
                .attr('x', width / 2 )
                .attr('y', height / 2 )
                .style('text-anchor', 'middle')
                .text('No data')
            return
          }

          // Add a legend for clinical views.
          if (self.activeViz != 0) {
            const legend = svg.append('g')
                .attr('class', 'mave-histogram-legend')
            const legendItems = legend.selectAll('g')
              .data(series)
              .join('g')
                .attr('class', 'mave-histogram-legend-item')
          
            const legendX = 32
            const legendY = 12
            const legendItemHeight = 22
            const legendFontSize = '13px'
            const legendCircleWidth = 7
            const legendSpacing = 5
            legendItems.append('circle')
                .attr('r', legendCircleWidth)
                .attr('cx', legendX)
                .attr('cy', (d, i) => legendY + i*legendItemHeight)
                .style('fill', (d) => `rgba(${d.color},1)`)
          
            legendItems.append('text')
                .attr('x', legendX + legendCircleWidth + legendSpacing)
                .attr('y', (d, i) => legendY + i*legendItemHeight + legendSpacing)
                .style('font-size', legendFontSize)
                .text((d) => d.displayName)

            // Add text to the end of the legend indicating the source of clinical data.
            legend.append('text')
                .attr('x', legendX - legendCircleWidth)
                .attr('y', legendY + series.length*legendItemHeight + legendSpacing - 1)
                .style('font-size', legendFontSize)
                .text('ClinVar data from time of publication')
          }

          const path = d3.line((d) => xScale(d.x), (d) => yScale(d.y))

          series.forEach((serie) => {
            svg.append('g')
                .attr('class', 'mave-histogram-line')
              .append('path')
              .attr('fill', `rgba(${serie.color},.25)`)
              .attr('stroke', `rgba(${serie.color},1)`)
              .attr('stroke-width', 1.5)
              .attr('d', path(serie.line))
          })

          const hovers = svg.append('g')
              .attr('class', 'mave-histogram-hovers')
            .selectAll('g')
            .data(self.seriesBinned)
            .join('g')
              .attr('class', 'mave-histogram-hover')
              .on('mouseover', mouseover)
              .on('mousemove', mousemove)
              .on('mouseleave', mouseleave)

          // Hover target is the full height of the chart.
          hovers.append('rect')
              .attr('class', (d) => `mave-histogram-hover-target-${d.idx}`)
              .attr('x', (d) => xScale(d.x0))
              .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
              .attr('y', (d) => yScale(yMax))
              .attr('height', (d) => yScale(0) - yScale(yMax))
              .style('fill', 'transparent')  // Necessary for mouse events to fire.

          // However, only the largest bin is highlighted on hover.
          hovers.append('rect')
              .attr('class', (d) => `mave-histogram-hover-highlight-${d.idx}`)
              .attr('x', (d) => xScale(d.x0))
              .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
              .attr('y', (d) => yScale(d.maxBinSize))
              .attr('height', (d) => yScale(0) - yScale(d.maxBinSize))
              .style('fill', 'none')
              .style('stroke', 'black')
              .style('stroke-width', 1.5)
              .style('opacity', d => opacity(d, false))

          if (self.externalSelection) {
            displaySelectionTooltip()
          }
          else {
            hideSelectionTooltip()
          }
        }
        refresh(bins)
        return {refresh}
      }
    }
  }
}

</script>

<style> 
.mave-histogram-tooltip {
  position: absolute;
}

.mave-histogram-tooltip-variant-color {
  display: inline-block;
  height: 12px;
  width: 12px;
  margin-right: 4px;
  border-radius: 100%;
}

.mave-histogram-tooltip-variant-star {
  margin: 0 1.5px;
}
.mave-histogram-tooltip-variant-star-filled {
  color: #fdb81e
}
</style>

<style scoped>

.mave-histogram-control {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.mave-histogram-viz-select {
  padding-bottom: 16px;
}
.mave-histogram-viz-select:deep(.p-tabmenu-nav),
.mave-histogram-viz-select:deep(.p-menuitem-link) {
  background: transparent;
}

</style>
