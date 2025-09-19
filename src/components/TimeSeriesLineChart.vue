<template>
  <div ref="chartContainer" class="bar-line-chart-container"></div>
</template>

<script lang="ts">
import * as d3 from 'd3'
import {defineComponent, PropType, ref} from 'vue'
import makeLineChart, {BarLineChartDatum, BarLineChartMargins} from '@/lib/bar-line-chart'

export default defineComponent({
  name: 'TimeSeriesLineChart',

  props: {
    data: {
      type: Array as PropType<BarLineChartDatum[]>,
      required: true
    },
    interpolateMissingDates: {
      type: Boolean,
      default: true
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 400
    },
    level: {
      type: String,
      default: 'month'
    },
    margins: {
      type: Object as PropType<BarLineChartMargins>,
      default: () => ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
      })
    }
  },
  setup() {
    const chartContainer = ref<HTMLElement | null>(null)
    const chart = makeLineChart()
    const interpolatedData: BarLineChartDatum[] = []

    return {
      chart,
      chartContainer,
      interpolatedData
    }
  },

  watch: {
    data: {
      handler() {
        if (this.$props.interpolateMissingDates) {
          this.interpolatedData = this.interpolateData(this.$props.data)
        }

        this.refreshChart()
      },
      deep: true
    }
  },

  mounted() {
    if (this.$props.interpolateMissingDates) {
      this.interpolatedData = this.interpolateData(this.$props.data)
    }
    this.renderChart()
  },

  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },

  methods: {
    interpolateData(data: BarLineChartDatum[]) {
      const filledData: BarLineChartDatum[] = []
      const dateExtent = d3.extent(data, (d) => d.x) as [Date, Date]
      const dateRange = d3.timeMonth.range(dateExtent[0], dateExtent[1])

      dateRange.forEach((date) => {
        const existingDatum = data.find((d) => d.x.getTime() === date.getTime())
        if (existingDatum) {
          filledData.push(existingDatum)
        } else {
          filledData.push({x: date, y1: 0, y2: 0})
        }
      })

      return filledData
    },

    variantTooltipHtml(d: BarLineChartDatum | null) {
      const parts = []

      if (d) {
        if (this.$props.level === 'year') {
          parts.push(`Creation Year: ${d.x.toLocaleDateString('en-US', {year: 'numeric'})}`)
        } else {
          parts.push(`Creation Month: ${d.x.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`)
        }
        parts.push(`<hr>`)
        parts.push(`Measurements Created: ${new Intl.NumberFormat('en-US').format(d.y2)}`)
        parts.push(`Aggregate Measurements Created: ${new Intl.NumberFormat('en-US').format(d.aggregateY2)}`)
      }

      return parts.length > 0 ? parts.join('<br />') : null
    },

    datasetTooltipHtml(d: BarLineChartDatum | null) {
      let parts = []

      if (d) {
        if (this.$props.level === 'year') {
          parts.push(`Publication Year: ${d.x.toLocaleDateString('en-US', {year: 'numeric'})}`)
        } else {
          parts.push(`Publication Month: ${d.x.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`)
        }
        parts.push(`<hr>`)
        parts.push(`Published Datasets: ${new Intl.NumberFormat('en-US').format(d.y1)}`)
        parts.push(`Aggregate Published Datasets: ${new Intl.NumberFormat('en-US').format(d.aggregateY1)}`)
      }

      return parts.length > 0 ? parts.join('<br />') : null
    },

    renderChart() {
      if (this.chartContainer) {
        this.chart
          .width(this.$props.width)
          .height(this.$props.height)
          .aggregateData(true)
          .barTooltipHtml(this.datasetTooltipHtml)
          .lineTooltipHtml(this.variantTooltipHtml)
          .datumRadius(4)
          .datumSorter((a: BarLineChartDatum, b: BarLineChartDatum) => a.x.getTime() - b.x.getTime())
          .y1AxisLabel('Published Datasets')
          .y2AxisLabel('Variant Effect Measurements')
          .lineLegendLabel('Cumulative Variant Effect Measurements')
          .barLegendLabel('Cumulative Published Score Sets')
          .margins(this.$props.margins)
          .data(this.$props.interpolateMissingDates ? this.interpolatedData : this.$props.data)
          .render(this.chartContainer)
      }
    },

    refreshChart() {
      if (this.chart) {
        this.chart.data(this.$props.interpolateMissingDates ? this.interpolatedData : this.$props.data).refresh()
      }
    }
  }
})
</script>

<style scoped>
.bar-line-chart-container {
  width: 100%;
  height: 100%;
  padding: 0, 0, 0, 0;
}
</style>

<style>
.bar-line-tooltip {
  position: absolute;
}
</style>
