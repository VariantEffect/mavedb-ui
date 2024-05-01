<template>
  <div class="mave-histogram-container" ref="histogramContainer">
  </div>
</template>

<script>

import * as d3 from 'd3'

export default {
  name: 'ScoreSetHistogram',

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
  }),

  computed: {
    lines: function() {
      const bins = this.bins
      return bins
    },
    selectedBin: function() {
      const externalSelection = this.externalSelection
      const bins = this.bins

      const binContainsScore = function(bin) {
        return externalSelection ? externalSelection.score >= bin.x0 && externalSelection.score < bin.x1 : false
      }

      return bins.find(binContainsScore)
    }
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
    externalSelection: {
      handler: function() {
        this.renderOrRefreshHistogram()
      },
      immediate: true
    }
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

    binsToLine: function(bins, filter = (item) => true) {
      if (!bins.length) {
        return []
      }

      // Start the line at the bottom-left of the first bin.
      const line = [{x: bins[0].x0, y: 0}]

      // Draw the two ends of what would be the 'top' of each bin.
      bins.forEach((bin) => {
        const filtered = bin.filter(filter)
        line.push({x: bin.x0, y: filtered.length})
        line.push({x: bin.x1, y: filtered.length})
      })

      // End the line at the bottom-right of the last bin.
      line.push({x: bins[bins.length - 1].x1, y: 0})

      return line
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

        // First, calculate space required for y axis and label.
        // Give 5% breathing room at the top of the chart.
        const yMax = d3.max(bins, (d) => d.length) * 1.05
        const yScale = d3.scaleLinear()
            .domain([0, yMax])
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

        // Add plot title.
        contents.append('text')
            .attr('x', margins.left + width / 2 )
            .attr('y', 12)
            .style('text-anchor', 'middle')
            .text('Distribution of Functional Scores')

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

        // Add final y axis and label.
        const yAxis = svg.append('g')
            .call(d3.axisLeft(yScale).ticks(10))

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
          if (!d.length) {
            return 0
          }
          return isMouseOver ? 1 : 0
        }

        const showTooltip = (tooltip, d) => {
          // Construct the tooltip.
          const parts = []
          parts.push(`Number of variants: ${d.length}`)
          parts.push(`Range: ${d.x0} to ${d.x1}`)

          tooltip.html(parts.join('<br />'))

          // Show the tooltip.
          tooltip.style('display', 'block')
        }

        // Using function, not arrow notation, so that 'this' is the event target.
        const mouseover = function(event, d) {
          // Hide the selected variant tooltip
          if (self.externalSelection) {
            d3.select(`.mave-histogram-hover-highlight-${self.selectedBin.idx}`).style('opacity', opacity(self.selectedBin, false))
          }

          // show the mouse over tooltip and hide the tooltip for the currently selected variant.
          showTooltip(self.tooltip, d)
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
          if (!self.externalSelection) {
            return
          }

          showTooltip(selectionTooltip, self.selectedBin)
          positionSelectionTooltip()

          // highlight the bin
          d3.select(`.mave-histogram-hover-highlight-${self.selectedBin.idx}`).style('opacity', opacity(self.selectedBin, true))
        }

        const positionSelectionTooltip = function() {
          const elementProperties = document.getElementById('mave-selection-histogram-tooltip')

          // position of this tooltip is relative to the parent div.
          const left = xScale(self.selectedBin.x1) + margins.left
          var top = -(yScale(0) - yScale(self.selectedBin.length)) - margins.bottom

          // element properties are necessary to properly place the relative div within the document.
          const height = elementProperties.clientHeight;
          const borders = elementProperties.clientTop;

          // Move the tooltip above the x-axis if it would have obscured it.
          if (top > -(height + margins.bottom)) {
            top -= height
          }

          selectionTooltip
            // Add a small buffer area to both the left and top of the tooltip.
            .style('left', left + 5 + "px")
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
          svg.selectAll('.mave-histogram-line').remove()
          svg.selectAll('.mave-histogram-hovers').remove()

          const line = self.binsToLine(bins)
          const path = d3.line((d) => xScale(d.x), (d) => yScale(d.y))

          svg.append('g')
              .attr('class', 'mave-histogram-line')
            .append('path')
            .attr('fill', 'rgba(153,153,153,.25)')
            .attr('stroke', 'rgba(153,153,153,1)')
            .attr('stroke-width', 1.5)
            .attr('d', path(line))

          const hovers = svg.append('g')
              .attr('class', 'mave-histogram-hovers')
            .selectAll('g')
            .data(bins)
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

          // However, only the bin is highlighted on hover.
          hovers.append('rect')
              .attr('class', (d) => `mave-histogram-hover-highlight-${d.idx}`)
              .attr('x', (d) => xScale(d.x0))
              .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
              .attr('y', (d) => yScale(d.length))
              .attr('height', (d) => yScale(0) - yScale(d.length))
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

</style>
