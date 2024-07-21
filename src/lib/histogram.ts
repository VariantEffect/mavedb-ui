import * as d3 from 'd3'
import $ from 'jquery'
import _ from 'lodash'

type FieldGetter<T> = ((d: HistogramDatum) => T) | string
type Getter<T> = () => T
type Accessor<T, Self> = (value?: T) => T | Self

export const DEFAULT_RANGE_COLOR = '#333333'
export const DEFAULT_SERIES_COLOR = '#333333'
const LABEL_SIZE = 10

/**
 * Margins of the heatmap content inside the SVG, expressed in screen units (pixels).
 *
 * This should include space for the color scale legend.
 */
export interface HistogramMargins {
  bottom: number
  left: number
  right: number
  top: number
}

export interface HistogramSerieOptions {
  title?: string
  color: string // TODO Make this optional by providing default colors.
}

interface HistogramSerie {
  /** Bins, which are an array of HistogramDatum with additional x0 and x1 properties. */
  bins: d3.Bin<HistogramDatum, number>[]

  /** The minimum of all the bins' x0 values. */
  x0: number | null

  /** The maximum of all the bins' x1 values. */
  x1: number | null

  /** The maximum number of data points in any bin. */
  maxBinSize: number

  /** A list of points describing the series bars' silhouette. */
  line: [number, number][],

  options: HistogramSerieOptions
}

export type HistogramDatum = any

export interface HistogramBin {
  x0: number
  x1: number
  yMax: number

  /**
   * Bins at this location belonging to each series.
   *
   * seriesBins[N] is the bin at this location belonging to series[N].
   */
  seriesBins: d3.Bin<HistogramDatum, number>[]
}

export interface HistogramRange {
  min: number | null
  max: number | null
  title: string | null
  color: string | null
}

export interface Histogram {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Methods
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Chart lifecycle methods
  destroy: () => void
  render: (container: HTMLElement) => Histogram
  refresh: () => Histogram
  resize: () => Histogram

  // Selection management
  clearSelection: () => void
  selectBin: (binIndex: number) => void
  selectDatum: (d: HistogramDatum) => void

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Data (histogram bin contents) */
  data: Accessor<HistogramDatum[], Histogram>
  seriesOptions: Accessor<HistogramSerieOptions[] | null, Histogram>
  seriesClassifier: Accessor<((d: HistogramDatum) => number[]) | null, Histogram>
  ranges: Accessor<HistogramRange[], Histogram>
  numBins: Accessor<number, Histogram>

  // Data fields
  valueField: Accessor<FieldGetter<number>, Histogram>
  tooltipHtml: Accessor<((
    datum: HistogramDatum | null,
    bin: HistogramBin | null,
    seriesContainingDatum: HistogramSerieOptions[],
    allSeries: HistogramSerieOptions[]
  ) => string | null) | null, Histogram>

  // Layout
  margins: Accessor<HistogramMargins, Histogram>

  // Labels
  title: Accessor<string | null, Histogram>
  leftAxisLabel: Accessor<string | null, Histogram>
  bottomAxisLabel: Accessor<string | null, Histogram>
  legendNote: Accessor<string | null, Histogram>

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  selectedBin: Getter<HistogramBin | null>
  selectedDatum: Getter<HistogramDatum | null>

  // Container
  container: Getter<HTMLElement | null>

  // Layout
  width: Getter<number>
  height: Getter<number>
}

export default function makeHistogram(): Histogram {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read/write properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Data
  let data: HistogramDatum[] = []
  let seriesOptions: HistogramSerieOptions[] | null = null
  let seriesClassifier: ((d: HistogramDatum) => number[]) | null = null
  let ranges: HistogramRange[] = []
  let numBins = 30

  // Data fields
  let valueField: FieldGetter<number> = (d) => d as number
  let tooltipHtml: ((
    datum: HistogramDatum | null,
    bin: HistogramBin | null,
    seriesContainingDatum: HistogramSerieOptions[],
    allSeries: HistogramSerieOptions[]
  ) => string | null) | null = null

  // Layout
  let margins: HistogramMargins = {top: 20, right: 20, bottom: 30, left: 20}

  // Title
  let title: string | null = null
  let leftAxisLabel: string | null = null
  let bottomAxisLabel: string | null = null
  let legendNote: string | null = null

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read-only properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  let selectedDatum: HistogramDatum | null = null
  let selectedBin: HistogramBin | null = null

  // Container
  let _container: HTMLElement | null = null

  // Layout
  let height: number = 100
  let width: number = 100

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Internal properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  
  // Data
  let series: HistogramSerie[] = []
  let bins: HistogramBin[] = []

  // Hovering
  let hoverBin: HistogramBin | null = null

  // Layout

  /** Margins of the actual historgram itself after leaving space for labels */
  let effectiveMargins: HistogramMargins = {top: 0, right: 0, bottom: 0, left: 0}

  // D3 selections containing DOM elements
  let svg: d3.Selection<SVGSVGElement, any, any, any> | null = null
  let tooltip: d3.Selection<HTMLDivElement, any, any, any> | null = null
  let selectionTooltip: d3.Selection<HTMLDivElement, any, any, any> | null = null

  // Scales
  const xScale = d3.scaleLinear()
  const yScale = d3.scaleLinear()

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Data series & bin preparation
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const prepareData = () => {
    // Bin all the data, regardless of what series each datum belongs to.
    const overallBins = d3.bin<HistogramDatum, number>().thresholds(numBins).value((d) => applyField(d, valueField))(data)
    const thresholds = (overallBins.length > 0 ? [overallBins[0].x0, ...overallBins.map((bin) => bin.x1)] : [])
        .filter((t) => t != null)
    const domain: [number, number] = [thresholds[0] || 0, thresholds[thresholds.length - 1] || 0]

    const classifier = seriesClassifier // Make this a const so that TypeScript will be certain it remains non-null.
    if (seriesOptions && classifier) {
      const binClassifier = d3.bin<HistogramDatum, number>()
          .domain(domain)
          .thresholds(thresholds)
          .value((d) => applyField(d, valueField))
      series = seriesOptions.map((serieOptions, i) => ({
        bins: binClassifier(data.filter((datum) => classifier(datum).includes(i))),
        x0: null,
        x1: null,
        maxBinSize: 0,
        line: [],
        options: serieOptions
      }))
    } else {
      series = [{
        bins: overallBins,
        x0: null,
        x1: null,
        maxBinSize: 0,
        line: [],
        options: seriesOptions?.[0] || {
          color: '#999999'
        }
      }]
    }

    for (const serie of series) {
      serie.x0 = serie.bins[0]?.x0 || null
      serie.x1 = _.last(serie.bins)?.x0 || null
      serie.maxBinSize = Math.max(...serie.bins.map((bin) => bin.length))
      if (serie.x0 && serie.x1) {
        serie.line.push([serie.x0, 0])
        for (const bin of serie.bins) {
          if (bin.x0 != null) {
            serie.line.push([bin.x0, bin.length])
          }
          if (bin.x1 != null) {
            serie.line.push([bin.x1, bin.length])
          }
        }
        serie.line.push([serie.x1, 0])
      }
    }

    bins = overallBins.map((bin, binIndex) => ({
      x0: bin.x0 || 0,
      x1: bin.x1 || 0,
      yMax: Math.max(...series.map((serie, i) => serie.bins[binIndex].length)),
      seriesBins: series.map((serie) => serie.bins[binIndex])
    }))
  }

  const findBinIndex = (x: number) => {
    // The lower threshold of a bin is inclusive, the upper exclusive: [X0, x1).
    const index = bins.findIndex((bin) => bin.x0 <= x && x < bin.x1)
    return (index == -1) ? null : index
  }

  function applyField<T>(d: HistogramDatum, field: FieldGetter<T>) {
    return _.isString(field) ? (_.get(d, field) as T) : (field(d) as T)
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Hovering
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const mouseover = (event: MouseEvent, d: HistogramBin) => {
    const target = event.target

    hoverBin = d
    refreshHighlighting()

    if (target instanceof Element) {
      // Show the mouseover tooltip, and hide the tooltip for any currently selected variant.
      if (tooltip) {
        showTooltip(tooltip, hoverBin, null)
      }
      hideSelectionTooltip()
    }
  }

  const mousemove = (event: MouseEvent) => {
    if (tooltip) {
      // Move tooltip to be 50px to the right of the pointer.
      tooltip
          .style('left', (d3.pointer(event, document.body)[0] + 50) + 'px')
          .style('top', (d3.pointer(event, document.body)[1]) + 'px')
    }
  }

  const mouseleave = (event: MouseEvent, d: HistogramBin) => {
    if (d == hoverBin) {
      hoverBin = null
      refreshHighlighting()
    }

    // Hide the tooltip and the highlight.
    if (tooltip) {
      tooltip.style('display', 'none')
    }

    // Show the selection tooltip, if there is a selection.
    showSelectionTooltip()
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Tooltip management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const renderTooltips = () => {
    tooltip = d3.select(document.body)
        .append('div')
        .style('display', 'none')
        .attr('class', 'histogram-tooltip')
        .style('background-color', '#fff')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('color', '#000')
        .style('padding', '5px')
        .style('z-index', 2001)

    selectionTooltip = d3.select(_container)
          .append('div')
          .style('display', 'none')
          .attr('class', 'histogram-selection-tooltip')
          .style('background-color', 'white')
          .style('border', 'solid')
          .style('border-width', '2px')
          .style('border-radius', '5px')
          .style('color', '#000')
          .style('padding', '5px')
          .style('position', 'relative')
          .style('width', 'fit-content')
          .style('z-index', 1)
  }

  const showTooltip = (
    tooltip: d3.Selection<HTMLDivElement, any, any, any>,
    bin: HistogramBin,
    datum: HistogramDatum | null
  ) => {
    if (tooltipHtml) {
      const seriesContainingDatum = datum ?
          (series && seriesClassifier) ?
          seriesClassifier(datum).map((seriesIndex) => series[seriesIndex])
          : series[0] ? [series[0]] : []
          : []
      const html = tooltipHtml(
        datum,
        bin,
        seriesContainingDatum.map((s) => s.options),
        series ? series.map((s) => s.options) : []
      )

      if (html) {
        tooltip.html(html)
        tooltip.style('display', 'block')
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Selection tooltip management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const showSelectionTooltip = () => {
    if (selectionTooltip) {
      // Don't show the tooltip if no bin is selected. (A bin can be selected without a datum, but not vice versa.)
      if (!selectedBin) {
        selectionTooltip.style('display', 'none')
      } else {
        showTooltip(selectionTooltip, selectedBin, selectedDatum)
        positionSelectionTooltip()
      }
    }
  }

  const positionSelectionTooltip = function() {
    if (selectionTooltip && selectedBin) {
      const documentWidth = document.body.clientWidth

      // Tooltip position relative to SVG, and therefore also relative to the offset parent, which should be _container
      const left = xScale(selectedBin.x1) + effectiveMargins.left
      let top = -(yScale(0) - yScale(selectedBin.yMax)) - effectiveMargins.bottom

      selectionTooltip
          // Add a small buffer area to the left side of the tooltip so it doesn't overlap with the bin.
          .style('left', `${left + 5}px`)
          // Ensure the tooltip doesn't extend outside of the histogram container.
          .style('max-width', `${documentWidth - left}px`)

      // Having set the max width, get the height and border.
      const tooltipHeight = selectionTooltip.node()?.clientHeight || 0
      const topBorderWidth = selectionTooltip.node()?.clientTop || 0

      // Move the tooltip above the x-axis if it would have obscured it.
      if (top > -(tooltipHeight + effectiveMargins.bottom)) {
        top -= tooltipHeight
      }

      selectionTooltip
          // Add a small buffer to the vertical placement of the tooltip so it doesn't overlap with the axis.
          .style('top', `${top - 15}px`)
          // A pretty silly workaround for the fact that this div is relatively positioned and would otherwise take up
          // space in the document flow.
          .style('margin-bottom', `${-height - (topBorderWidth * 2)}px`)
    }
  }

  const hideSelectionTooltip = () => {
    selectionTooltip?.style('display', 'none')
  }

  const updateSelectionAfterRefresh = () => {
    if (selectedDatum) {
      const value = applyField(selectedDatum, valueField)
      const selectedBinIndex = findBinIndex(value)
      selectedBin = selectedBinIndex == null ? null : bins[selectedBinIndex]
    }
    if (selectedBin) {
      showSelectionTooltip()
    } else {
      hideSelectionTooltip()
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Bin highlighting for selections and hovering
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const hoverOpacity = (d: HistogramBin) => {
    // Don't highlight the bin if no serie has any data in this bin.
    if (!d.seriesBins.some((bin) => bin.length > 0)) {
      return 0
    }
    // If the cursor is hovering over a bin, ignore the selection and just highlight the hovered bin.
    if (hoverBin) {
      return d == hoverBin ? 1 : 0
    }
    // Highlight the selected bin if there is one.
    return d == selectedBin ? 1 : 0
  }

  const refreshHighlighting = () => {
    if (svg) {
      svg.selectAll('.histogram-hover-highlight')
          .style('opacity', (d) => hoverOpacity(d as HistogramBin))
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Ranges
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const rangePolygon = (range: HistogramRange, yMax: number) => {
    const points = []
    const {min: xMin, max: xMax} = visibleRange(range)
    const yMin = yScale.domain()[0]

    // Start at the top left.
    points.push([xMin, yMax])

    // Trace the contour formed by the baseline and the bins, between xMin and xMax
    let x = xMin

    // First trace any portion to the left of the bins.
    if (bins.length == 0 || x < bins[0].x0) {
      points.push([x, yMin]) // Bottom left, if outside all bins
      if (bins.length > 0) {
        x = Math.min(bins[0].x1, xMax)
        points.push([x, yMin]) // Base of first bin, or end of range if entire range is to the left of all bins
      }
    }
    
    // Trace the portion above bins.
    const startBinIndex = findBinIndex(x)
    const xMaxBinIndex = findBinIndex(xMax)
    const endBinIndex = xMaxBinIndex == null ? bins.length - 1 : xMaxBinIndex
    if (x < xMax && startBinIndex != null) {
      for (let binIndex = startBinIndex; binIndex <= endBinIndex; binIndex++) {
        const bin = bins[binIndex]
        points.push([x, bin.yMax])
        x = Math.min(bin.x1, xMax)
        points.push([x, bin.yMax])
      }
    }

    // Trace any portion to the right of the bins.
    if (x < xMax) {
      points.push([x, yMin])
      points.push([xMax, yMin])
    }

    // End at the top right.
    points.push([xMax, yMax])

    return points
  }

  const visibleRange = (range: HistogramRange) => {
    return {
      min: range.min == null ? xScale.domain()[0] : Math.max(range.min, xScale.domain()[0]),
      max: range.max == null ? xScale.domain()[1] : Math.min(range.max, xScale.domain()[1])
    }
  }

  const chart: Histogram = {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Chart lifecyle methods
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    destroy: () => {
      if (svg) {
        svg.remove()
        svg = null
      }
      if (tooltip) {
        tooltip.remove()
        tooltip = null
      }
      if (selectionTooltip) {
        selectionTooltip.remove()
        selectionTooltip = null
      }
      data = []
      series = []
    },

    render: (container: HTMLElement) => {
      _container = container

      if (_container) {
        svg = d3.select(_container)
            .html(null)
            .append('svg')
        svg.append('defs')
        const mainGroup = svg.append('g')
            .attr('class', 'histogram-main')
            .attr('transform', `translate(${margins.left},${margins.top})`)
        mainGroup.append('g')
            .attr('class', 'histogram-ranges')
        mainGroup.append('g')
            .attr('class', 'histogram-range-thresholds')
        mainGroup.append('g')
            .attr('class', 'histogram-bars')
        mainGroup.append('g')
            .attr('class', 'histogram-left-axis')
        mainGroup.append('g')
            .attr('class', 'histogram-bottom-axis')
        mainGroup.append('g')
            .attr('class', 'histogram-legend')
        mainGroup.append('g')
            .attr('class', 'histogram-hovers')
      } else {
        svg = null
      }

      renderTooltips()
      chart.resize()

      return chart
    },

    refresh: () => {
      if (_container && svg) {
        chart.resize()
        prepareData()

        //resizeTo Container()

        // Calculate space required for y axis and label for the largest possible number of bin members. We will need to
        // re-scale the y-axis for displaying smaller numbers but this will give us enough space for the y-axis at maximum
        // axis width (i.e. with the longest numbers in the counts.
        //
        // Also leave 5% breathing room at the top of the chart.
        const yMax = (d3.max(series, (s) => s.maxBinSize) || 0) * 1.05
        const chartHasContent = yMax > 0
        yScale.domain([0, yMax])
            .range([height, 0])

        // Add temporary y axis and measure its width
        const tempYAxis = svg.append('g')
            .style('visibility', 'hidden')
            .call(d3.axisLeft(yScale).ticks(10))
        const yAxisWidthWithLabel = (tempYAxis.node()?.getBoundingClientRect()?.width || 0) + LABEL_SIZE
        tempYAxis.remove()

        // Calculate final margins using calculated width.
        effectiveMargins = {
          ...margins,
          left: margins.left + yAxisWidthWithLabel
        }
        width = _container.clientWidth - (effectiveMargins.left + effectiveMargins.right)

        // Update the main group's margins inside the SVG.
        svg.select('g.histogram-main')
            .attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)

        // Set the X scale. Expand its domain from that of the data by the size of the first and last bin. Assume that
        // all bins are of equal size.
        if (bins.length > 0) {
          const firstBinInfo = bins[0]
          const lastBinInfo = bins[bins.length - 1]
          xScale.domain([
            firstBinInfo.x0 - (firstBinInfo.x1 - firstBinInfo.x0),
            lastBinInfo.x1 * 2 - lastBinInfo.x0
          ])
        } else {
          xScale.domain([0, 0])
        }
        xScale.range([0, width])

        // Refresh the axes.
        svg.select('g.histogram-bottom-axis')
            .attr('transform', `translate(0,${height})`)
            // @ts-ignore
            .call(d3.axisBottom(xScale).ticks(10))
        svg.select('g.histogram-left-axis')
            // @ts-ignore
            .call(d3.axisLeft(yScale).ticks(10))

        // Refresh the chart title.
        svg.select('g.histogram-main')
            .selectAll('text.histogram-title')
            .data(title ? [title] : [], (d) => d as any)
            .join('text')
            .attr('class', 'histogram-title')
            .attr('x', width / 2 )
            .attr('y', 4)
            .style('text-anchor', 'middle')
            .text((d) => d)

        // Refresh the axis labels.
        svg.select('g.histogram-main')
            .selectAll('text.histogram-bottom-axis-label')
            .data(bottomAxisLabel ? [bottomAxisLabel] : [], (d) => d as any)
            .join('text')
            .attr('class', 'histogram-axis-label histogram-bottom-axis-label')
            .attr('font-size', LABEL_SIZE)
            .attr('x', width / 2)
            .attr('y', height + 25)
            .style('text-anchor', 'middle')
            .text((d) => d)
        svg.select('g.histogram-main')
            .selectAll('text.histogram-left-axis-label')
            .data(leftAxisLabel ? [leftAxisLabel] : [], (d) => d as any)
            .join('text')
            .attr('class', 'histogram-axis-label histogram-left-axis-label')
            .attr('font-size', LABEL_SIZE)
            .attr('transform', `translate(${-(yAxisWidthWithLabel - LABEL_SIZE / 2)}, ${height / 2}) rotate(-90)`)
            .style('text-anchor', 'middle')
            .text((d) => d)

        // Refresh the legend, which is displayed when there is more than one serie.
        const legendX = 32
        const legendY = 12
        const legendItemHeight = 22
        const legendFontSize = '13px'
        const legendCircleWidth = 7
        const legendSpacing = 5
        const legend = svg.select('g.histogram-legend')
        const legendItem = legend.selectAll('g.histogram-legend-item')
            .data(chartHasContent && series.length > 1 ? series : [])
            .join(
              (enter) => {
                const g = enter.append('g')
                    .attr('class', 'histogram-legend-item')
                g.append('circle')
                    .attr('r', legendCircleWidth)
                    .attr('cx', legendX)
                    //.attr('cy', (d, i) => legendY + i * legendItemHeight)
                    //.style('fill', (d) => d.options.color)
                g.append('text')
                    .attr('x', legendX + legendCircleWidth + legendSpacing)
                    .attr('y', (_d: HistogramSerie, i) => legendY + i * legendItemHeight + legendSpacing)
                    .style('font-size', legendFontSize)
                    //.text((d, i) => d.options.title || `Series ${i + 1}`)
                return g
              },
              (update) => update,
              (exit) => exit.remove()
            )
        legendItem.select('circle')
            // @ts-ignore
            .attr('cy', (_d: HistogramSerie, i) => legendY + i * legendItemHeight)
            // @ts-ignore
            .style('fill', (d: HistogramSerie) => d.options.color)
        legendItem.select('text')
            // @ts-ignore
            .text((d: HistogramSerie, i) => d.options.title || `Series ${i + 1}`)

        // The client may have specified a line of text to display below the legend.
        legend.selectAll('text.histogram-legend-note')
            .data(chartHasContent && legendNote ? [legendNote] : [])
            .join('text')
            .attr('class', 'histogram-legend-note')
            .attr('font-size', legendFontSize)
            .attr('x', legendX - legendCircleWidth)
            .attr('y', legendY + (series.length == 1 ? 0 : series.length) * legendItemHeight + legendSpacing - 1)
            .text((d) => d)

        svg.selectAll('text.histogram-no-data-message')
            .data(chartHasContent ? [] : ['No data'])
            .join('text')
            .attr('class', 'histogram-no-data-message')
            .attr('x', width / 2 )
            .attr('y', height / 2 )
            .style('text-anchor', 'middle')
            .text((d) => d)

        const path = d3.line((d) => xScale(d[0]), (d) => yScale(d[1]))

        const seriesLine = svg.select('g.histogram-bars')
            .selectAll('g.histogram-line')
            .data(chartHasContent ? series : [], (d) => d as any)
            // @ts-ignore
            .join(
              // @ts-ignore
              (enter) => {
                const g = enter.append('g')
                    .attr('class', 'histogram-line')
                g.append('path')
                return g
              },
              (update) => update,
              (exit) => exit.remove()
            )
        seriesLine.select('path')
            .attr('class', 'histogram-line')
            .attr('fill', (d) => d.options.color)
            .attr('fill-opacity', '.25')
            .attr('stroke', (d) => d.options.color)
            .attr('stroke-width', 1.5)
            .attr('d', (d) => path(d.line))

        // Refresh the hover and highlight boxes.
        const hovers = svg.select('g.histogram-hovers')
            .selectAll('g.histogram-hover')
            .data(bins, (d) => d as any)
            .join('g')
            .attr('class', 'histogram-hover')
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseleave', mouseleave)

        // Hover target is the full height of the chart.
        hovers.append('rect')
            .attr('class', (d) => `histogram-hover-target`)
            .attr('x', (d) => xScale(d.x0))
            .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
            .attr('y', () => yScale(yMax))
            .attr('height', () => yScale(0) - yScale(yMax))
            .style('fill', 'transparent')  // Necessary for mouse events to fire.

        // However, only the largest bin is highlighted on hover.
        hovers.append('rect')
            .attr('class', (d) => `histogram-hover-highlight`)
            .attr('x', (d) => xScale(d.x0))
            .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
            .attr('y', (d) => yScale(d.yMax))
            .attr('height', (d) => yScale(0) - yScale(d.yMax))
            .style('fill', 'none')
            .style('stroke', 'black')
            .style('stroke-width', 1.5)
            .style('opacity', d => hoverOpacity(d))

        // Refresh the ranges.
        svg.select('defs')
            .selectAll('linearGradient')
            .data(ranges)
            .join(
              (enter) => {
                const gradient = enter.append('linearGradient')
                    .attr('id', (d, i) => `histogram-range-gradient-${i}`) // TODO Include a UUID for this chart.
                    .attr('gradientTransform', 'rotate(45)')
                gradient.append('stop')
                    .attr('offset', '0')
                    .attr('stop-color', (d) => d.color || DEFAULT_SERIES_COLOR)
                    .attr('stop-opacity', '0.15')
                gradient.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', (d) => d.color || DEFAULT_SERIES_COLOR)
                    .attr('stop-opacity', '0.05')
                return gradient
              }
            )
        const rangeG = svg.select('g.histogram-ranges')
            .selectAll('g.histogram-range')
            .data(chartHasContent ? ranges : [])
            .join(
              (enter) => {
                const g = enter.append('g')
                g.append('polygon')
                g.append('text')
                return g
              },
              (update) => update,
              (exit) => exit.remove()
            )
        rangeG.attr('class', 'histogram-range')
            .style('fill', (d, i) => `url(#histogram-range-gradient-${i})`)
        rangeG.select('polygon')
            .attr('points', (d) => rangePolygon(d, yMax).map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(' '))
        rangeG.select('text')
            .attr('class', 'histogram-range-title')
            .style('fill', (d) => d.color || '#000000')
            .attr('x', (d) => {
              const span = visibleRange(d)
              return xScale((span.min + span.max) / 2)
            })
            .attr('y', 15)
            .style('text-anchor', 'middle')
            .style('visibility', (d) => d.title ? 'visible' : 'hidden')
            .text((d) => d.title)
        const rangeThresholds = ranges.map((range) => [
          ...(range.min != null && range.min > xScale.domain()[0]) ? [{x: range.min, range}] : [],
          ...(range.max != null && range.max < xScale.domain()[1]) ? [{x: range.max, range}] : [],
        ]).flat()
        svg.select('g.histogram-range-thresholds')
            .selectAll('path.histogram-range-threshold')
            .data(chartHasContent ? rangeThresholds : [])
            .join('path')
            .attr('class', 'histogram-range-threshold')
            .attr('stroke', (d) => d.range.color || DEFAULT_RANGE_COLOR)
            .attr('stroke-dasharray', '4 4')
            .attr('stroke-width', 1.5)
            .attr('d', (d) => {
              const intersectedBinIndex = findBinIndex(d.x)
              let yMin = (intersectedBinIndex == null) ? yScale.domain()[0] : bins[intersectedBinIndex].yMax
              if (intersectedBinIndex != null && intersectedBinIndex > 0 && d.x == bins[intersectedBinIndex].x0) {
                yMin = Math.max(yMin, bins[intersectedBinIndex - 1].x1)
              }
              return path([[d.x, yMin], [d.x, yMax]])
            })
      }

      updateSelectionAfterRefresh()
      
      return chart
    },

    resize: () => {
      if (_container && svg) {
        const heightWithMargins = $(_container).height() || 500
        const widthWithMargins = $(_container).width() || 500
        height = heightWithMargins - margins.top - margins.bottom
        width = widthWithMargins - margins.left - margins.right
        svg.attr('height', heightWithMargins)
            .attr('width', widthWithMargins)
      }
      return chart
    },

    clearSelection: () => {
      selectedBin = null
      selectedDatum = null
      refreshHighlighting()
      hideSelectionTooltip()
    },

    selectBin: (binIndex: number) => {
      selectedBin = bins[binIndex] || null
      selectedDatum = null
      refreshHighlighting()
      showSelectionTooltip()
    },

    selectDatum: (d: HistogramDatum) => {
      selectedDatum = d
      const value = applyField(d, valueField)

      // Also select the bin in which the datum falls. 
      const selectedBinIndex = findBinIndex(value)
      selectedBin = selectedBinIndex == null ? null : bins[selectedBinIndex]

      refreshHighlighting()
      showSelectionTooltip()
    },
  
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Accessors
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    data: (value?: HistogramDatum[]) => {
      if (value === undefined) {
        return data
      }
      data = value
      return chart
    },

    seriesOptions: (value?: HistogramSerieOptions[] | null) => {
      if (value === undefined) {
        return seriesOptions
      }
      seriesOptions = value
      return chart
    },

    seriesClassifier: (value?: ((d: HistogramDatum) => number[]) | null) => {
      if (value === undefined) {
        return seriesClassifier
      }
      seriesClassifier = value
      return chart
    },

    ranges: (value?: HistogramRange[]) => {
      if (value === undefined) {
        return ranges
      }
      ranges = value
      return chart
    },

    numBins: (value?: number) => {
      if (value === undefined) {
        return numBins
      }
      numBins = value
      return chart
    },

    valueField: (value?: FieldGetter<number>) => {
      if (value === undefined) {
        return valueField
      }
      valueField = value
      return chart
    },

    tooltipHtml: (value?: ((
      datum: HistogramDatum | null,
      bin: HistogramBin | null,
      seriesContainingDatum: HistogramSerieOptions[],
      allSeries: HistogramSerieOptions[]
    ) => string | null) | null) => {
      if (value === undefined) {
        return tooltipHtml
      }
      tooltipHtml = value
      return chart
    },

    margins: (value?: HistogramMargins) => {
      if (value === undefined) {
        return margins
      }
      margins = value
      return chart
    },

    title: (value?: string | null) => {
      if (value === undefined) {
        return title
      }
      title = value
      return chart
    },

    leftAxisLabel: (value?: string | null) => {
      if (value === undefined) {
        return leftAxisLabel
      }
      leftAxisLabel = value
      return chart
    },

    bottomAxisLabel: (value?: string | null) => {
      if (value === undefined) {
        return bottomAxisLabel
      }
      bottomAxisLabel = value
      return chart
    },

    legendNote: (value?: string | null) => {
      if (value === undefined) {
        return legendNote
      }
      legendNote = value
      return chart
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Getters
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    selectedBin: () => selectedBin,

    selectedDatum: () => selectedDatum,

    container: () => _container,

    height: () => height,

    width: () => width
  }

  return chart
}
