<template>
  <div class="mave-histogram-container" ref="histogramContainer">
  </div>
</template>

<script>

import * as d3 from 'd3'

export default {
  name: 'ScoreSetHistogram',

  props: {
    margins: { // Margins must accommodate the axis labels and title.
      type: Object,
      default: () => ({
        top: 20,
        right: 0,
        bottom: 20,
        left: 30
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
  },

  watch: {
    scores: {
      handler: function() {
        if (!this.scores) {
          this.bins = []
        } else {
          this.bins = d3.bin().thresholds(this.numBins).value((d) => d.score)(this.scores)
        }
      },
      immediate: true
    },
    bins: {
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
          bins: this.bins,
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
        return [];
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
        const width = container.clientWidth - (self.margins.left + self.margins.right)

        const contents = d3.select(container)
            .html(null)
            .append('svg')
            .attr('width', container.clientWidth)
            .attr('height', height + self.margins.top + self.margins.bottom)
        
        // Add plot title.
        contents.append('text')
            .attr('x', container.clientWidth / 2 )
            .attr('y', 12)
            .style('text-anchor', 'middle')
            .text('Histogram of Scores')
        
        // Main canvas to which chart elements will be added.
        const svg = contents
            .append('g')
            .attr('transform', `translate(${self.margins.left},${self.margins.top})`)
        
        const firstBin = bins[0]    
        const lastBin = bins[bins.length - 1]
        const xScale = d3.scaleLinear()
            // Expand domain from that of the data by the size of the first and last bin.
            // This assumes not all bins are of equal size, though they currently are.
            .domain([firstBin.x0 - (firstBin.x1 - firstBin.x0), lastBin.x1 + (lastBin.x1 - lastBin.x0)])
            .range([0, width])

        // Likewise, give 5% breathing room at the top of the chart.
        const yMax = d3.max(bins, (d) => d.length) * 1.05
        const yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([height, 0]);
        
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(10))

        svg.append('g')
            .call(d3.axisLeft(yScale).ticks(10))


        const opacity = (d, isMouseOver) => {
          // Don't show if there's no data in this bin.
          if (!d.length) {
            return 0
          }
          return isMouseOver ? 1 : 0
        }

        // Using function, not arrow notation, so that 'this' is the event target.
        const mouseover = function(event, d) {
          // Construct the tooltip.
          const parts = []
          parts.push(`Number of variants: ${d.length}`)
          parts.push(`Range: ${d.x0} to ${d.x1}`)
          self.tooltip
              .html(parts.join('<br />'))
          // Show the tooltip.
          self.tooltip.style('display', 'block')
          // Outline the highlight for this bin.
          d3.select(this)
            .select('rect.mave-histogram-hover-highlight')
              .style('opacity', opacity(d, true));
        }

        const mousemove = function(event, d) {
          // Move tooltip to be 50px to the right of the pointer.
          self.tooltip
              .style('left', (d3.pointer(event, document.body)[0] + 50) + 'px')
              .style('top', (d3.pointer(event, document.body)[1]) + 'px');
        }

        const mouseleave = function(event, d) {
          // Hide the tooltip and the highlight.
          self.tooltip.style('display', 'none')
          d3.select(this)
            .select('rect.mave-histogram-hover-highlight')
              .style('opacity', opacity(d, false));
        }

        const refresh = function(bins) {
          svg.selectAll('mave-histogram-line').remove()
          svg.selectAll('mave-histogram-hovers').remove()

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
              .attr('class', 'mave-histogram-hover-target')
              .attr('x', (d) => xScale(d.x0))
              .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
              .attr('y', (d) => yScale(yMax))
              .attr('height', (d) => yScale(0) - yScale(yMax))
              .style('fill', 'transparent')  // Necessary for mouse events to fire.

          // However, only the bin is highlighted on hover.
          hovers.append('rect')
              .attr('class', 'mave-histogram-hover-highlight')
              .attr('x', (d) => xScale(d.x0))
              .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
              .attr('y', (d) => yScale(d.length))
              .attr('height', (d) => yScale(0) - yScale(d.length))
              .style('fill', 'none')
              .style('stroke', 'black')
              .style('stroke-width', 1.5)
              .style('opacity', d => opacity(d, false))
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