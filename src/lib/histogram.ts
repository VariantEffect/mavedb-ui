import * as d3 from 'd3'
import $ from 'jquery'
import _ from 'lodash'
import {v4 as uuidv4} from 'uuid'

type FieldGetter<T> = ((d: HistogramDatum) => T) | string
type Getter<T> = () => T
type Accessor<T, Self> = (value?: T) => T | Self

export const DEFAULT_SHADER_COLOR = '#333333'
export const DEFAULT_SERIES_COLOR = '#333333'
const LABEL_SIZE = 10

/**
 * Margins of the histogram content inside the SVG, expressed in screen units (pixels).
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
  line: [number, number][]

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

/** The definition for a shaded region */
export interface HistogramShader {
  /** The minimum and maximum x positions of this shaded region. */
  min: number | null
  max: number | null

  /** The displayed title of this region. */
  title: string | null

  /** The alignment of the title of this region. */
  align: 'left' | 'right' | 'center' | null

  /** The color of this shaded region. */
  color: string | null

  /** The color of the lines demarcating the shaded region at positions min and max. Also used
   * for the color of the title.
   */
  thresholdColor: string | undefined

  /** How opaque the start and end of the gradient should be. Opacity will change linearly
   * between these two values across the shaded region.
   */
  startOpacity: number | undefined
  stopOpacity: number | undefined

  /** Created dynamically by this histogram object. Identifies the linear gradient internally. */
  gradientUUID: string | undefined
}

/** An object containing definitions of each of the possible shaded regions on this Histogram. */
export interface HistogramShaderRegions {
  [key: string]: HistogramShader[]
}

/** An object configuring which shaders are displayed where */
export interface HistogramShaderDisplay {
  /** Key of the shader to show on the histogram */
  histogram?: string
  /** Keys of shaders to show below the histogram, in order from top to bottom */
  bottom?: string[]
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
  selectDatum: (datum: HistogramDatum) => void
  selectScore: (score: number | null | undefined) => void

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Data (histogram bin contents) */
  data: Accessor<HistogramDatum[], Histogram>
  seriesOptions: Accessor<HistogramSerieOptions[] | null, Histogram>
  seriesClassifier: Accessor<((d: HistogramDatum) => number[]) | null, Histogram>
  numBins: Accessor<number, Histogram>

  // Data fields
  valueField: Accessor<FieldGetter<number>, Histogram>
  accessorField: Accessor<FieldGetter<string>, Histogram>
  tooltipHtml: Accessor<
    | ((
        datum: HistogramDatum | null,
        bin: HistogramBin | null,
        seriesContainingDatum: HistogramSerieOptions[],
        allSeries: HistogramSerieOptions[]
      ) => string | null)
    | null,
    Histogram
  >

  // Layout
  margins: Accessor<HistogramMargins, Histogram>

  // Labels
  title: Accessor<string | null, Histogram>
  leftAxisLabel: Accessor<string | null, Histogram>
  bottomAxisLabel: Accessor<string | null, Histogram>
  legendNote: Accessor<string | null, Histogram>

  // Shaded regions
  shaderDisplay: Accessor<HistogramShaderDisplay | null, Histogram>
  shaders: Accessor<HistogramShaderRegions | null, Histogram>
  renderShaderTitles: Accessor<'show' | 'hide' | 'auto', Histogram>

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  selectedBin: Getter<HistogramBin | null>
  selectedDatum: Getter<HistogramDatum | null>
  selectedScore: Getter<number | null>

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
  let numBins = 30

  // Data fields
  let valueField: FieldGetter<number> = (d) => d as number
  let accessionField: FieldGetter<string> = (d) => d as string
  let tooltipHtml:
    | ((
        datum: HistogramDatum | null,
        bin: HistogramBin | null,
        seriesContainingDatum: HistogramSerieOptions[],
        allSeries: HistogramSerieOptions[]
      ) => string | null)
    | null = null

  // Layout
  let margins: HistogramMargins = {top: 20, right: 20, bottom: 30, left: 20}

  // Title
  let title: string | null = null
  let leftAxisLabel: string | null = null
  let bottomAxisLabel: string | null = null
  let legendNote: string | null = null

  // Shaded regions
  let shaderDisplay: HistogramShaderDisplay | null = null
  let shaders: HistogramShaderRegions | null = null
  let renderShaderTitles: 'show' | 'hide' | 'auto' = 'auto'

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read-only properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  let selectedBin: HistogramBin | null = null
  let selectedDatum: HistogramDatum | null = null
  let selectedScore: number | null = null

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
    // Filter NaN entries from the data property. We're unable to place such scores on the histogram.
    const filteredData = data.filter((d) => !isNaN(applyField(d, valueField)))

    // Bin all the data, regardless of what series each datum belongs to.
    const overallBins = d3
      .bin<HistogramDatum, number>()
      .thresholds(numBins)
      .value((d) => applyField(d, valueField))(filteredData)
    const thresholds = (overallBins.length > 0 ? [overallBins[0].x0, ...overallBins.map((bin) => bin.x1)] : []).filter(
      (t) => t != null
    )
    const domain: [number, number] = [thresholds[0] || 0, thresholds[thresholds.length - 1] || 0]

    const classifier = seriesClassifier // Make this a const so that TypeScript will be certain it remains non-null.
    if (seriesOptions && classifier) {
      const binClassifier = d3
        .bin<HistogramDatum, number>()
        .domain(domain)
        .thresholds(thresholds)
        .value((d) => applyField(d, valueField))
      series = seriesOptions.map((serieOptions, i) => ({
        bins: binClassifier(filteredData.filter((datum) => classifier(datum).includes(i))),
        x0: null,
        x1: null,
        maxBinSize: 0,
        line: [],
        options: serieOptions
      }))
    } else {
      series = [
        {
          bins: overallBins,
          x0: null,
          x1: null,
          maxBinSize: 0,
          line: [],
          options: seriesOptions?.[0] || {
            color: '#999999'
          }
        }
      ]
    }

    for (const serie of series) {
      serie.x0 = serie.bins[0]?.x0 === undefined ? null : serie.bins[0].x0
      // @ts-ignore - We protect against the return value of `_.last(serie.bins)` being undefined.
      serie.x1 = _.last(serie.bins)?.x1 === undefined ? null : _.last(serie.bins).x1
      serie.maxBinSize = Math.max(...serie.bins.map((bin) => bin.length))
      if (serie.x0 !== null && serie.x1 !== null) {
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
      yMax: Math.max(...series.map((serie) => serie.bins[binIndex].length)),
      seriesBins: series.map((serie) => serie.bins[binIndex])
    }))
  }

  const findBinIndex = (x: number) => {
    // The lower threshold of a bin is inclusive, the upper exclusive: [X0, x1).
    const index = bins.findIndex((bin) => bin.x0 <= x && x < bin.x1)
    return index == -1 ? null : index
  }

  function applyField<T>(d: HistogramDatum, field: FieldGetter<T>) {
    return _.isString(field) ? (_.get(d, field) as T) : (field(d) as T)
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Canvas placement calculations
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const alignTextInRegion = (min: number, max: number, align: string | null) => {
    switch (align) {
      case 'left':
        return min
      case 'right':
        return max
      default:
        return (min + max) / 2
    }
  }

  const padTextInElement = (
    elem: d3.Selection<d3.BaseType | SVGGElement, HistogramShader, d3.BaseType, any>,
    align: string | null,
    text: string | null
  ) => {
    const tempText = elem.append('g').append('text').style('visibility', 'hidden').text(text)
    const textWidth = tempText.node()?.getBoundingClientRect()?.width || 0

    switch (align) {
      case 'left':
        return 10
      case 'right':
        return -textWidth
      default:
        return 0
    }
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
        .style('left', d3.pointer(event, document.body)[0] + 50 + 'px')
        .style('top', d3.pointer(event, document.body)[1] + 'px')
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
    tooltip = d3
      .select(document.body)
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

    selectionTooltip = d3
      .select(_container)
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
      const seriesContainingDatum = datum
        ? series && seriesClassifier
          ? seriesClassifier(datum).map((seriesIndex) => series[seriesIndex])
          : series[0]
            ? [series[0]]
            : []
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

  const positionSelectionTooltip = function () {
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
        .style('margin-bottom', `${-height - topBorderWidth * 2}px`)
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
      svg.selectAll('.histogram-hover-highlight').style('opacity', (d) => hoverOpacity(d as HistogramBin))
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Score selection marker
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const refreshScoreSelectionMarker = () => {
    if (svg) {
      const scoreSelectionMarkerSel = svg
        .select('.histogram-score-selections')
        .selectAll('g.histogram-score-selection')
        .data(selectedScore ? [selectedScore] : [], (d) => d)
        .join('g')
        .attr('class', 'histogram-score-selection')
      scoreSelectionMarkerSel
        .append('line')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', yScale.range()[0])
        .attr('y2', yScale.range()[1])
        .style('stroke', '#ff8800')
        .style('stroke-width', 3)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Shaders
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const shaderPolygon = (shaderRegion: HistogramShader, yMin: number, yMax: number, renderingOnHistogram: boolean) => {
    const points = []
    const {min: xMin, max: xMax} = visibleShaderRegion(shaderRegion)

    // Start at the top left.
    points.push([xMin, yMax])

    // Trace the contour formed by the baseline and the bins, between xMin and xMax
    let x = xMin

    // First trace any portion to the left of the bins.
    if (renderingOnHistogram) {
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

  const visibleShaderRegion = (region: HistogramShader) => {
    return {
      min: region.min == null ? xScale.domain()[0] : Math.max(region.min, xScale.domain()[0]),
      max: region.max == null ? xScale.domain()[1] : Math.min(region.max, xScale.domain()[1])
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
        svg = d3.select(_container).html(null).append('svg')
        svg.append('defs')
        const mainGroup = svg
          .append('g')
          .attr('class', 'histogram-main')
          .attr('transform', `translate(${margins.left},${margins.top})`)
        mainGroup.append('g').attr('class', 'histogram-shaders')
        mainGroup.append('g').attr('class', 'histogram-shader-thresholds')
        mainGroup.append('g').attr('class', 'histogram-outside-shaders')
        mainGroup.append('g').attr('class', 'histogram-bars')
        mainGroup.append('g').attr('class', 'histogram-left-axis')
        mainGroup.append('g').attr('class', 'histogram-bottom-axis')
        mainGroup.append('g').attr('class', 'histogram-legend-background')
        mainGroup.append('g').attr('class', 'histogram-legend')
        mainGroup.append('g').attr('class', 'histogram-hovers')
        mainGroup.append('g').attr('class', 'histogram-score-selections')
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

        // Leave space for any shaders displayed under the chart.
        const outsideShaderHeight = 40
        const outsideShaderHeadingHeight = 20
        const outsideShaderSpacing = 40
        const numBottomShaders = (shaderDisplay?.bottom ?? []).length
        const bottomShadersHeight =
          numBottomShaders * (outsideShaderHeight + outsideShaderHeadingHeight + outsideShaderSpacing)

        // Calculate space required for y axis and label for the largest possible number of bin members. We will need to
        // re-scale the y-axis for displaying smaller numbers but this will give us enough space for the y-axis at maximum
        // axis width (i.e. with the longest numbers in the counts.
        //
        // Also leave 5% breathing room at the top of the chart.
        const yMax = (d3.max(series, (s) => s.maxBinSize) || 0) * 1.1
        const chartHasContent = yMax > 0
        yScale.domain([0, yMax]).range([height - bottomShadersHeight, 0])

        // Add temporary y axis and measure its width
        const tempYAxis = svg.append('g').style('visibility', 'hidden').call(d3.axisLeft(yScale).ticks(10))
        const yAxisWidthWithLabel = (tempYAxis.node()?.getBoundingClientRect()?.width || 0) + LABEL_SIZE
        tempYAxis.remove()

        // Calculate final margins using calculated width.
        effectiveMargins = {
          ...margins,
          bottom: margins.bottom + bottomShadersHeight,
          left: margins.left + yAxisWidthWithLabel
        }
        width = _container.clientWidth - (effectiveMargins.left + effectiveMargins.right)
        height = _container.clientHeight - (effectiveMargins.top + effectiveMargins.bottom)

        // Update the main group's margins inside the SVG.
        svg.select('g.histogram-main').attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)

        // Set the X scale. Expand its domain from that of the data by the size of the first and last bin. Assume that
        // all bins are of equal size.
        if (bins.length > 0) {
          const firstBinInfo = bins[0]
          const lastBinInfo = bins[bins.length - 1]
          xScale.domain([firstBinInfo.x0 - (firstBinInfo.x1 - firstBinInfo.x0), lastBinInfo.x1 * 2 - lastBinInfo.x0])
        } else {
          xScale.domain([0, 0])
        }
        xScale.range([0, width])

        // Refresh the axes.
        svg
          .select('g.histogram-bottom-axis')
          .attr('transform', `translate(0,${height})`)
          // @ts-ignore
          .call(d3.axisBottom(xScale).ticks(10))
        svg
          .select('g.histogram-left-axis')
          // @ts-ignore
          .call(d3.axisLeft(yScale).ticks(10))

        // Refresh the chart title.
        svg
          .select('g.histogram-main')
          .selectAll('text.histogram-title')
          .data(title ? [title] : [], (d) => d as any)
          .join('text')
          .attr('class', 'histogram-title')
          .attr('x', width / 2)
          .attr('y', -margins.top / 4)
          .style('text-anchor', 'middle')
          .text((d) => d)

        // Refresh the axis labels.
        svg
          .select('g.histogram-main')
          .selectAll('text.histogram-bottom-axis-label')
          .data(bottomAxisLabel ? [bottomAxisLabel] : [], (d) => d as any)
          .join('text')
          .attr('class', 'histogram-axis-label histogram-bottom-axis-label')
          .attr('font-size', LABEL_SIZE)
          .attr('x', width / 2)
          .attr('y', height + 25)
          .style('text-anchor', 'middle')
          .text((d) => d)
        svg
          .select('g.histogram-main')
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
        const legendItem = legend
          .selectAll('g.histogram-legend-item')
          .data(chartHasContent && series.length > 1 ? series : [])
          .join(
            (enter) => {
              const g = enter.append('g').attr('class', 'histogram-legend-item')
              g.append('circle').attr('r', legendCircleWidth).attr('cx', legendX)
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
        legendItem
          .select('circle')
          // @ts-ignore
          .attr('cy', (_d: HistogramSerie, i) => legendY + i * legendItemHeight)
          // @ts-ignore
          .style('fill', (d: HistogramSerie) => d.options.color)
        legendItem
          .select('text')
          // @ts-ignore
          .text((d: HistogramSerie, i) => d.options.title || `Series ${i + 1}`)

        // The client may have specified a line of text to display below the legend.
        legend
          .selectAll('text.histogram-legend-note')
          .data(chartHasContent && legendNote ? [legendNote] : [])
          .join('text')
          .attr('class', 'histogram-legend-note')
          .attr('font-size', legendFontSize)
          .attr('x', legendX - legendCircleWidth)
          .attr('y', legendY + (series.length == 1 ? 0 : series.length) * legendItemHeight + legendSpacing - 1)
          .text((d) => d)

        // Add a background for the legend, for visibility.
        const legendBounds = (legend.node() as SVGGraphicsElement | null)?.getBBox()
        svg
          .select('g.histogram-legend-background')
          .selectAll('rect.histogram-legend-background')
          .data(legendBounds ? [legendBounds] : [])
          .join('rect')
          .attr('class', 'histogram-legend-background')
          .attr('fill', '#ffffff')
          .attr('fill-opacity', '.6')
          .attr('y', (d) => d.x - 5 - margins.top)
          .attr('x', (d) => d.x - 5)
          .attr('height', (d) => d.height + 10)
          .attr('width', (d) => d.width + 10)

        svg
          .selectAll('text.histogram-no-data-message')
          .data(chartHasContent ? [] : ['No data'])
          .join('text')
          .attr('class', 'histogram-no-data-message')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .style('text-anchor', 'middle')
          .text((d) => d)

        // Line generator for shaded ranges within the histogram. For these, both x- and y-coordinates must be scaled
        // to match the chart's scales.
        const histogramScaledPath = d3.line(
          (d) => xScale(d[0]),
          (d) => yScale(d[1])
        )
        // Line generator for shaded ranges outside the histogram. For these, only the x-coordinage must be scaled to
        // match the chart's x-axis scale. The y-coordinate of these ranges will be given in SVG coordinates.
        const xScaledPath = d3.line(
          (d) => xScale(d[0]),
          (d) => d[1]
        )

        const seriesLine = svg
          .select('g.histogram-bars')
          .selectAll('g.histogram-line')
          .data(chartHasContent ? series : [], (d) => d as any)
          .join(
            (enter) => {
              const g = enter.append('g').attr('class', 'histogram-line')
              g.append('path')
              return g
            },
            (update) => update,
            (exit) => exit.remove()
          )
        seriesLine
          .select('path')
          .attr('class', 'histogram-line')
          .attr('fill', (d) => d.options.color)
          .attr('fill-opacity', '.25')
          .attr('stroke', (d) => d.options.color)
          .attr('stroke-width', 1.5)
          .attr('d', (d) => histogramScaledPath(d.line))

        // Refresh the hover and highlight boxes.
        const hovers = svg
          .select('g.histogram-hovers')
          .selectAll('g.histogram-hover')
          .data(bins, (d) => d as any)
          .join('g')
          .attr('class', 'histogram-hover')
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseleave', mouseleave)

        // Hover target is the full height of the chart.
        hovers
          .append('rect')
          .attr('class', () => `histogram-hover-target`)
          .attr('x', (d) => xScale(d.x0))
          .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
          .attr('y', () => yScale(yMax))
          .attr('height', () => yScale(0) - yScale(yMax))
          .style('fill', 'transparent') // Necessary for mouse events to fire.

        // However, only the largest bin is highlighted on hover.
        hovers
          .append('rect')
          .attr('class', () => `histogram-hover-highlight`)
          .attr('x', (d) => xScale(d.x0))
          .attr('width', (d) => xScale(d.x1) - xScale(d.x0))
          .attr('y', (d) => yScale(d.yMax))
          .attr('height', (d) => yScale(0) - yScale(d.yMax))
          .style('fill', 'none')
          .style('stroke', 'black')
          .style('stroke-width', 1.5)
          .style('opacity', (d) => hoverOpacity(d))

        function clearShaderGradients() {
          if (svg) {
            svg.select('defs').selectAll('linearGradient').remove()
          }
        }

        function renderShader(
          shader: HistogramShaderRegions | null,
          shaderContainerSelection,
          thresholdsContainerSelection,
          renderingOnHistogram: boolean
        ) {
          if (svg) {
            // Select the active shader elements.
            const shaderG = shaderContainerSelection
              .selectAll('g.histogram-shader')
              .data(chartHasContent && shader ? shader : [])
              .join(
                (enter) => {
                  const g = enter.append('g')
                  g.append('polygon')
                  g.append('text').attr('class', 'histogram-shader-title')
                  g.append('text').attr('class', 'histogram-shader-title-line-2')
                  return g
                },
                (update) => update,
                (exit) => exit.remove()
              )

            if (shader) {
              if (renderingOnHistogram) {
                // Add the gradients for the active shader.
                svg
                  .select('defs')
                  .selectAll('linearGradient')
                  .data(shader)
                  .join((enter) => {
                    const gradient = enter
                      .append('linearGradient')
                      .attr('id', (d) => {
                        d.gradientUUID = uuidv4()
                        return `histogram-gradient-${d.gradientUUID}`
                      })
                      .attr('gradientTransform', 'rotate(45)')
                    gradient
                      .append('stop')
                      .attr('offset', '0')
                      .attr('stop-color', (d) => d.color || DEFAULT_SERIES_COLOR)
                      .attr('stop-opacity', (d) => d.startOpacity || '0.15')
                    gradient
                      .append('stop')
                      .attr('offset', '100%')
                      .attr('stop-color', (d) => d.color || DEFAULT_SERIES_COLOR)
                      .attr('stop-opacity', (d) => d.stopOpacity || '0.05')

                    return gradient
                  })

                shaderG
                  .attr('class', 'histogram-shader')
                  .style('fill', (d) => `url(#histogram-gradient-${d.gradientUUID})`)
              } else {
                shaderG.attr('class', 'histogram-shader').style('fill', (d) => d.color)
              }

              shaderG.select('polygon').attr('points', (d) => {
                const points = shaderPolygon(
                  d,
                  renderingOnHistogram ? yScale.domain()[0] : 0,
                  renderingOnHistogram ? yMax : outsideShaderHeight,
                  renderingOnHistogram
                )
                if (renderingOnHistogram) {
                  return points.map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(' ')
                } else {
                  return points.map(([x, y]) => `${xScale(x)},${y}`).join(' ')
                }
              })
              shaderG
                .select('text.histogram-shader-title')
                .attr('class', 'histogram-shader-title')
                .style('fill', (d) => d.textColor || '#000000')
                .attr('x', (d) => {
                  const span = visibleShaderRegion(d)
                  return (
                    xScale(alignTextInRegion(span.min, span.max, d.align)) + padTextInElement(shaderG, d.align, d.title)
                  )
                })
                .attr('y', 15)
                .style('text-anchor', 'middle')
                .style('visibility', (d) => (d.title ? 'visible' : 'hidden'))
                .text((d) => {
                  const span = visibleShaderRegion(d)
                  if (span.max > span.min) {
                    return d.title
                  }
                  return ''
                })
              shaderG
                .select('text.histogram-shader-title-line-2')
                .attr('class', 'histogram-shader-title-line-2')
                .style('fill', (d) => d.textColor || '#000000')
                .attr('x', (d) => {
                  const span = visibleShaderRegion(d)
                  return (
                    xScale(alignTextInRegion(span.min, span.max, d.align)) + padTextInElement(shaderG, d.align, d.title)
                  )
                })
                .attr('y', 35)
                .style('text-anchor', 'middle')
                .style('visibility', (d) => (d.title ? 'visible' : 'hidden'))
                .text((d) => {
                  const span = visibleShaderRegion(d)
                  if (span.max > span.min) {
                    return d.titleLine2 ?? ''
                  }
                  return ''
                })

              // Hide shader titles which do not fit inside their region if the user has requested automatic title rendering.
              // Note that this hides lines 1 and 2 separately for now.
              if (renderShaderTitles === 'auto') {
                shaderG.select('text').each(function (d) {
                  const node = this as SVGTextElement
                  const span = visibleShaderRegion(d)
                  const regionPixelWidth = xScale(span.max) - xScale(span.min)
                  const textWidth = node.getBBox().width

                  if (textWidth > regionPixelWidth) {
                    d3.select(node).style('visibility', 'hidden')
                  }
                })
              }

              // Draw the shader thresholds.
              const shaderThresholds = shader
                .map((region) => [
                  ...(region.min != null && region.min > xScale.domain()[0] && region.min < xScale.domain()[1]
                    ? [{x: region.min, region}]
                    : []),
                  ...(region.max != null && region.max > xScale.domain()[0] && region.max < xScale.domain()[1]
                    ? [{x: region.max, region}]
                    : [])
                ])
                .flat()
              thresholdsContainerSelection
                .selectAll('path.histogram-shader-threshold')
                .data(chartHasContent ? shaderThresholds : [])
                .join('path')
                .attr('class', 'histogram-shader-threshold')
                .style('visibility', (d) => (d.region.thresholdColor ? 'visible' : 'hidden'))
                .attr('stroke', (d) => d.region.thresholdColor || DEFAULT_SHADER_COLOR)
                .attr('stroke-dasharray', '4 4')
                .attr('stroke-width', 1.5)
                .attr('d', (d) => {
                  if (renderingOnHistogram) {
                    const intersectedBinIndex = findBinIndex(d.x)
                    let yMin = intersectedBinIndex == null ? yScale.domain()[0] : bins[intersectedBinIndex].yMax
                    if (intersectedBinIndex != null && intersectedBinIndex > 0 && d.x == bins[intersectedBinIndex].x0) {
                      yMin = Math.max(yMin, bins[intersectedBinIndex - 1].x1)
                    }
                    return histogramScaledPath([
                      [d.x, 0],
                      [d.x, yMax]
                    ])
                  } else {
                    return xScaledPath([
                      [d.x, 0],
                      [d.x, outsideShaderHeight]
                    ])
                  }
                })
            } else {
              shaderG.remove()
              thresholdsContainerSelection.selectAll('path.histogram-shader-threshold').remove()
            }
          }
        }

        // Clear any shader gradients.
        clearShaderGradients()

        // Render the shader that appears on the histogram, if any.
        const histogramShader = shaders && shaderDisplay?.histogram ? shaders[shaderDisplay?.histogram] : null
        renderShader(
          histogramShader,
          svg.select('g.histogram-shaders'),
          svg.select('g.histogram-shader-thresholds'),
          true
        )

        // Render any shaders configured to appear outside the histogram.
        svg
          .select('g.histogram-outside-shaders')
          .selectAll('path.histogram-shader-threshold')
          .data(
            chartHasContent
              ? (shaderDisplay?.bottom ?? []).map((key) => ({shaderKey: key, shaders: shaders?.[key]}))
              : []
          )
          .join(
            (enter) => {
              const g = enter.append('g').attr('class', 'histogram-outside-shader')
              g.append('text').attr('transform', 'translate(0, -10)')
              return g
            },
            (update) => update,
            (exit) => exit.remove()
          )
        svg
          .select('g.histogram-outside-shaders')
          .selectAll('g.histogram-outside-shader')
          .each(function (d: HistogramShaderRegions, i: number) {
            const g = d3.select(this)
            g.attr(
              'transform',
              `translate(0, ${height + margins.bottom + i * outsideShaderHeight + (i + 1) * (outsideShaderHeadingHeight + outsideShaderSpacing)})`
            )
            g.select('text').text(d.shaderKey)

            renderShader(d.shaders, g, g, false)
          })
      }

      updateSelectionAfterRefresh()
      refreshScoreSelectionMarker()

      return chart
    },

    resize: () => {
      if (_container && svg) {
        const heightWithMargins = $(_container).height() || 500
        const widthWithMargins = $(_container).width() || 500
        height = heightWithMargins - margins.top - margins.bottom
        width = widthWithMargins - margins.left - margins.right
        svg.attr('height', heightWithMargins).attr('width', widthWithMargins)
      }
      return chart
    },

    clearSelection: () => {
      selectedBin = null
      selectedDatum = null
      selectedScore = null
      refreshHighlighting()
      refreshScoreSelectionMarker()
      hideSelectionTooltip()
    },

    selectBin: (binIndex: number) => {
      selectedBin = bins[binIndex] || null
      selectedDatum = null
      refreshHighlighting()
      showSelectionTooltip()
    },

    selectDatum: (datum: HistogramDatum) => {
      selectedDatum = data.find((d) => applyField(d, accessionField) == applyField(datum, accessionField))

      // Also select the bin in which the datum falls.
      const selectedBinIndex = findBinIndex(applyField(selectedDatum, valueField))
      selectedBin = selectedBinIndex == null ? null : bins[selectedBinIndex]

      refreshHighlighting()
      showSelectionTooltip()
    },

    selectScore: (score: number | null | undefined) => {
      selectedScore = score == null ? null : score

      refreshScoreSelectionMarker()
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

    shaders: (value?: HistogramShaderRegions | null) => {
      if (value === undefined) {
        return shaders
      }
      shaders = value
      return chart
    },

    shaderDisplay: (value?: HistogramShaderDisplay | null) => {
      if (value === undefined) {
        return shaderDisplay
      }
      // Don't allow rendering of a shader which does not have a shader definition.
      if (!shaders && value) {
        return shaderDisplay
      } else if (shaders && value?.histogram && !(value?.histogram in shaders)) {
        return shaderDisplay
      } else if (shaders && value?.bottom && !value.bottom.every((key) => key in shaders)) {
        return shaderDisplay
      }

      shaderDisplay = value
      return chart
    },

    renderShaderTitles: (value?: 'show' | 'hide' | 'auto') => {
      if (value === undefined) {
        return renderShaderTitles
      }
      renderShaderTitles = value
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

    accessorField: (value?: FieldGetter<string>) => {
      if (value === undefined) {
        return accessionField
      }
      accessionField = value
      return chart
    },

    tooltipHtml: (
      value?:
        | ((
            datum: HistogramDatum | null,
            bin: HistogramBin | null,
            seriesContainingDatum: HistogramSerieOptions[],
            allSeries: HistogramSerieOptions[]
          ) => string | null)
        | null
    ) => {
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

    selectedScore: () => selectedScore,

    container: () => _container,

    height: () => height,

    width: () => width
  }

  return chart
}
