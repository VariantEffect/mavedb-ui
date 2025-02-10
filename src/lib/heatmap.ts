import * as d3 from 'd3'
import $ from 'jquery'
import _, { filter, last } from 'lodash'

import { AMINO_ACIDS, AMINO_ACIDS_BY_HYDROPHILIA } from './amino-acids.js'
import { NUCLEOTIDE_BASES } from './nucleotides.js'

type FieldGetter<T> = ((d: HeatmapDatum) => T)
type Getter<T> = () => T
type Accessor<T, Self> = (value?: T) => T | Self

export const DEFAULT_MINIMUM_COLOR = '#3F51B5'
export const DEFAULT_PIVOT_COLOR = '#FFFFFF'
export const DEFAULT_MAXIMUM_COLOR = '#B00020'

const LABEL_SIZE = 10
const LEGEND_SIZE = 75

/** Codes used in the right part of a MaveHGVS-pro string representing a single variation in a protein sequence. */
export const MAVE_HGVS_PRO_CHANGE_CODES = [
  { codes: { single: '=' } }, // Synonymous AA variant
  { codes: { single: '*', triple: 'TER' } }, // Stop codon
  { codes: { single: '-', triple: 'DEL' } } // Deletion
]

export const HEATMAP_NUCLEOTIDE_ROWS: HeatmapRowSpecification[] = [
  ...NUCLEOTIDE_BASES.map((ntCode) => ({ code: ntCode.codes.single, label: ntCode.codes.single }))
]

/** List of single-character codes for the heatmap's rows, from bottom to top. */
export const HEATMAP_AMINO_ACID_ROWS: HeatmapRowSpecification[] = [
  { code: '=', label: '=', cssClass: 'mave-heatmap-y-axis-tick-label-lg' },
  { code: '*', label: '\uff0a' },
  { code: '-', label: '-', cssClass: 'mave-heatmap-y-axis-tick-label-lg' },
  ...AMINO_ACIDS_BY_HYDROPHILIA.map((aaCode) => ({ code: aaCode, label: aaCode }))
]

/**
 * Margins of the heatmap content inside the SVG, expressed in screen units (pixels).
*/
export interface HeatmapMargins {
  bottom: number
  left: number
  right: number
  top: number
}

/**
 * Sizes of the heatmap nodes, expressed in screen units (pixels).
*/
export interface HeatmapNodeSize {
  width: number,
  height: number
}

export interface HeatmapRowSpecification {
  /** A single-character amino acid code or single-character code from MAVE_HGVS_PRO_CHANGE_CODES. */
  code: string
  /** The tick mark label text to display for this change, which is usually the same as the code. */
  label: string
  /** An optional CSS class name to apply to the row's tick mark label. */
  cssClass?: string
}

export type HeatmapScores = any
export type HeatmapDatum = any
export type MappedDatum = { [key: number]: HeatmapDatum }

/**
 * The heatmap content. This consists of a mapping of rows which contain a list of ordered column contents.
*/
export interface HeatmapContent {
  [key: number]: MappedDatum
  columns?: number
}

export interface Heatmap {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Methods
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Chart lifecycle methods
  destroy: () => void
  render: (container: HTMLElement) => Heatmap
  refresh: () => Heatmap
  resize: () => Heatmap

  // Selection management
  clearSelection: () => void
  selectDatum: (d: HeatmapDatum) => void
  selectDatumByIndex: (x: number, y: number) => void

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Data (heatmap content) */
  data: Accessor<HeatmapDatum[], Heatmap>
  content: Accessor<HeatmapContent, Heatmap>
  rowClassifier: Accessor<((d: HeatmapDatum) => number[]) | null, Heatmap>
  colorClassifier: Accessor<((d: HeatmapDatum) => number | d3.Color), Heatmap>
  datumSelected: Accessor<((d: HeatmapDatum) => void) | null, Heatmap>
  excludeDatum: Accessor<((d: HeatmapDatum) => boolean), Heatmap>

  // Data fields
  valueField: Accessor<FieldGetter<number>, Heatmap>
  xCoordinate: Accessor<FieldGetter<number>, Heatmap>
  yCoordinate: Accessor<FieldGetter<number>, Heatmap>
  tooltipHtml: Accessor<((
    datum: HeatmapDatum | null,
  ) => string | null) | null, Heatmap>

  // Layout
  margins: Accessor<HeatmapMargins, Heatmap>
  rows: Accessor<HeatmapRowSpecification[], Heatmap>
  nodeSize: Accessor<HeatmapNodeSize, Heatmap>
  nodeBorderRadius: Accessor<number, Heatmap>
  nodePadding: Accessor<number, Heatmap>

  // Color
  lowerBoundColor: Accessor<string, Heatmap>
  pivotColor: Accessor<string, Heatmap>
  upperBoundColor: Accessor<string, Heatmap>

  // Axis controls
  drawX: Accessor<boolean, Heatmap>
  drawY: Accessor<boolean, Heatmap>
  skipXTicks: Accessor<number, Heatmap>

  // Legend controls
  legendTitle: Accessor<string | null, Heatmap>
  drawLegend: Accessor<boolean, Heatmap>
  alignViaLegend: Accessor<boolean, Heatmap>

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  selectedDatum: Getter<HeatmapDatum | null>

  // Container
  container: Getter<HTMLElement | null>

  // Data
  heatmapContent: Getter<HeatmapContent | null>
  filteredData: Getter<HeatmapDatum[] | null>
  lowerBound: Getter<number | null>
  upperBound: Getter<number | null>

  // Layout
  width: Getter<number | null>
  height: Getter<number | null>

  // Color scale
  colorScale: Getter<d3.ScaleLinear<string, number> | null>

}

export default function makeHeatmap(): Heatmap {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read/write properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Data fields
  let valueField: FieldGetter<number> = (d) => d as number
  let xCoordinate: FieldGetter<number> = (d) => d as number
  let yCoordinate: FieldGetter<number> = (d) => d as number
  let tooltipHtml: ((
    datum: HeatmapDatum | null,
  ) => string | null) | null = null

  // Data
  let data: HeatmapDatum[] = []
  let rowClassifier: ((d: HeatmapDatum) => number[]) | null = null
  let colorClassifier: ((d: HeatmapDatum) => number | d3.Color) = valueField
  let datumSelected: ((d: HeatmapDatum) => void) | null = null
  let excludeDatum: ((d: HeatmapDatum) => boolean) = (d) => false as boolean

  // Layout
  let margins: HeatmapMargins = { top: 20, right: 20, bottom: 30, left: 20 }
  let nodeBorderRadius: number = 4
  let nodePadding: number = .1
  let nodeSize: HeatmapNodeSize = { width: 20, height: 20}
  let rows: HeatmapRowSpecification[] = HEATMAP_AMINO_ACID_ROWS

  // Colors
  let lowerBoundColor: string = DEFAULT_MINIMUM_COLOR
  let pivotColor: string = DEFAULT_PIVOT_COLOR
  let upperBoundColor: string = DEFAULT_MAXIMUM_COLOR

  // Axis controls
  let drawX: boolean = true
  let drawY: boolean = true
  let skipXTicks: number = 1

  // Legend controls
  let legendTitle: string | null = null
  let drawLegend: boolean = true
  let alignViaLegend: boolean = false

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read-only properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Content
  let content: HeatmapContent = {
    columns: undefined
  }
  let filteredData: HeatmapDatum[] = []
  let lowerBound: number | null = null
  let upperBound: number | null = null

  // Selection
  let selectedDatum: HeatmapDatum | null = null

  // Container
  let _container: HTMLElement | null = null

  // Layout
  let height: number | null = null
  let width: number | null = null

  // Color scale
  let colorScale: d3.ScaleLinear<string, number> | null = null

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Internal properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Hovering
  let hoverDatum: HeatmapDatum | null = null

  // Layout

  /** Margins of the heatmap itself, after leaving space for other drawn elements. */
  let effectiveMargins: HeatmapMargins = { top: 0, right: 0, bottom: 0, left: 0 }

  // D3 selections containing DOM elements
  let svg: d3.Selection<SVGSVGElement, any, any, any> | null = null
  let hoverTooltip: d3.Selection<HTMLDivElement, any, any, any> | null = null
  let selectionTooltip: d3.Selection<HTMLDivElement, any, any, any> | null = null

  // Scales
  const xScale: d3.ScaleBand<number> = d3.scaleBand()
  const yScale: d3.ScaleBand<number> = d3.scaleBand()

  // Index bounds
  let idxLowerBound: number | null = null
  let idxUpperBound: number | null = null

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Data series & row/column preparation
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const prepareData = () => {
    for (let datum of data) {
      datum.isVisible = !excludeDatum(datum)

      content[xCoordinate(datum)] = content[xCoordinate(datum)] || {}
      content[xCoordinate(datum)][yCoordinate(datum)] = datum

      if (!isNaN(valueField(datum))) {
        lowerBound = lowerBound ? Math.min(lowerBound, valueField(datum)) : valueField(datum)
        upperBound = upperBound ? Math.max(upperBound, valueField(datum)) : valueField(datum)
      }

      idxLowerBound = idxLowerBound ? Math.min(idxLowerBound, xCoordinate(datum)) : xCoordinate(datum)
      idxUpperBound = idxUpperBound ? Math.max(idxUpperBound, xCoordinate(datum)) : xCoordinate(datum)

      if (datum.isVisible) {
        filteredData.push(datum)
      }
    }
    content.columns = Object.keys(content).length - 1
    buildColorScale()
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Coloring
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const color = function (d: HeatmapDatum) {
    let classification: number | d3.Color = colorClassifier(d)
    return typeof classification === "number" ? (colorScale ? colorScale(classification) : null) : classification
  }

  const buildColorScale = function () {
    const imputedDomain = [
      (lowerBound ? lowerBound : 0),
      ((lowerBound ? lowerBound : 0) + (upperBound ? upperBound : 1)) / 2,
      (upperBound ? upperBound : 1),
    ]
    const imputedRange = [lowerBoundColor, pivotColor, upperBoundColor]
    colorScale = d3.scaleLinear()
      .domain(imputedDomain)
      .range(imputedRange)
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Clicking
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const click = function (event: MouseEvent, d: HeatmapDatum) {
    const target = event.target
    refreshSelectedDatum(d, true)

    if (datumSelected) {
      datumSelected(selectedDatum)
    }

    if (target instanceof Element) {
      updateSelectionTooltipAfterRefresh()
    }

    // Hide the hover tooltip.
    hideTooltip(hoverTooltip)
  }

  const refreshSelectedDatum = function (d: HeatmapDatum | null, unset: boolean) {
    if (selectedDatum !== null) {
      hideHighlight(selectedDatum)
    }

    // If unset is passed, de-select the selection if it is the same as the refreshed datum.
    if (selectedDatum === d && unset) {
      selectedDatum = null
    } else {
      selectedDatum = d
    }

    if (selectedDatum) {
      showHighlight(selectedDatum)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Scrolling
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const scrollToDatum = function (d: HeatmapDatum) {
    if (_container) {
      const scrollValue = xScale(xCoordinate(d)) + strokeWidth(d) / 2

      // Only scroll if the variant is not in view.
      const variantIsInView = _container.parentElement.scrollLeft < scrollValue && _container.clientWidth + _container.parentElement.scrollLeft > scrollValue
      if (!variantIsInView) {
        _container.parentElement.scrollLeft = scrollValue
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Hovering
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const mouseover = (event: MouseEvent, d: HeatmapDatum) => {
    const target = event.target
    refreshHoverDatum(d)

    if (target instanceof Element) {
      showTooltip(hoverTooltip, hoverDatum)
    }
  }

  const mousemove = (event: MouseEvent) => {
    if (hoverTooltip) {
      // Move tooltip to be 30px to the right of the pointer.
      hoverTooltip
        .style('left', (d3.pointer(event, document.body)[0] + 30) + 'px')
        .style('top', (d3.pointer(event, document.body)[1]) + 'px')
    }
  }

  const mouseleave = (event: MouseEvent, d: HeatmapDatum) => {
    refreshHoverDatum(null)

    // Hide the tooltip and the highlight.
    hideTooltip(hoverTooltip)
  }

  const refreshHoverDatum = function (d: HeatmapDatum | null) {
    // Don't hide the highlight if we happen to be hovering over the selectedDatum.
    if (selectedDatum !== hoverDatum && hoverDatum) {
      hideHighlight(hoverDatum)
    }
    hoverDatum = d
    if (hoverDatum) {
      showHighlight(hoverDatum)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Legend Management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // todo

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Tooltip management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const renderTooltips = () => {
    hoverTooltip = d3.select(document.body)
      .append('div')
      .style('display', 'none')
      .attr('class', 'heatmap-tooltip')
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
      .attr('class', 'heatmap-selection-tooltip')
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
    tooltip: d3.Selection<HTMLDivElement, any, any, any> | null,
    datum: HeatmapDatum | null
  ) => {
    if (datum) {
      if (tooltipHtml) {
        const html = tooltipHtml(
          datum
        )

        if (html && tooltip) {
          tooltip.html(html)
          tooltip.style('display', 'block')
        }
      }
    }
  }

  const hideTooltip = (tooltip: d3.Selection<HTMLDivElement, any, any, any> | null) => {
    if (tooltip) {
      tooltip.style('display', 'none')
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Selection tooltip management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const positionSelectionTooltip = function () {
    if (selectionTooltip && selectedDatum && _container) {
      scrollToDatum(selectedDatum)

      // The left and top anchor positions for this tooltip.
      const left = xScale(xCoordinate(selectedDatum)) || 0
      const top = yScale(yCoordinate(selectedDatum)) || 0

      // The tooltip dimensions.
      const tooltipHeight = selectionTooltip.node()?.getBoundingClientRect().height || 0
      const tooltipWidth = selectionTooltip.node()?.getBoundingClientRect().width || 0

      // How far to the left we have scrolled the parent element of the heatmap container
      const scrollPosition = _container.parentElement?.scrollLeft || 0

      // Set the bottom margin equal to the total height of the tooltip. This ensures the tooltip
      // does not take up any vertical space in the document, despite being rentered with relative position.
      selectionTooltip
        .style('margin-bottom', -tooltipHeight + "px")

      // TODO: Bug- Drawing the selection tooltip makes the SVG scroll container add tooltipHeight worth of height
      //            to the scroll container.

      // Show the tooltip to the left of the datum node if it would overflow from the right side of the heatmap container.
      if (left + effectiveMargins.left + (1.5 * nodeSize.width) + (tooltipWidth) > scrollPosition + _container.clientWidth) {
        selectionTooltip
          // When drawing the tooltip to the right of the node, the width of the tooltip influences how far to move it.
          .style('left', left - (0.5 * tooltipWidth) - (nodeSize.width) + (0.5 * strokeWidth(true)) + 'px')
      } else {
        selectionTooltip
          .style('left', left + effectiveMargins.left + (1.5 * nodeSize.width) + (0.5 * strokeWidth(true)) + 'px')
      }

      // Show the tooltip under the datum node if it would overflow from the top of the heatmap container.
      if (yCoordinate(selectedDatum) < rows.length / 4) {
        selectionTooltip
          .style('top', null)
          .style('bottom', _container.clientHeight - top - tooltipHeight + (0.5 * strokeWidth(true)) + 'px')
      } else {
        selectionTooltip
          .style('top', -(_container.clientHeight - top) + nodeSize.height + (0.5 * strokeWidth(true)) + 'px')
          .style('bottom', null)
      }
    }
  }

  const updateSelectionTooltipAfterRefresh = () => {
    if (selectedDatum) {
      // Construct, then position, the click tooltip. If we do this the other way, our positioning
      // function won't see the correct tooltip dimensions.
      showTooltip(selectionTooltip, selectedDatum)
      positionSelectionTooltip()
    } else {
      hideTooltip(selectionTooltip)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Bin highlighting for selections and hovering
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const stroke = (draw: boolean) => {
    return draw ? '#000' : 'none'
  }

  const strokeWidth = function(draw: boolean) {
    return draw ? 2 : 0;
  }

  const hideHighlight = (d: HeatmapDatum) => {
    if (svg) {
      svg.select(`g.heatmap-nodes`).selectAll(`rect.node-${xCoordinate(d)}-${yCoordinate(d)}`)
        .style('stroke', stroke(false))
        .style('stroke-width', strokeWidth(false))
    }
  }

  const showHighlight = (d: HeatmapDatum) => {
    if (svg) {
      svg.select(`g.heatmap-nodes`).selectAll(`rect.node-${xCoordinate(d)}-${yCoordinate(d)}`)
        .style('stroke', stroke(true))
        .style('stroke-width', strokeWidth(true))
    }
  }

  const chart: Heatmap = {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Chart lifecyle methods
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    destroy: () => {
      if (svg) {
        svg.remove()
        svg = null
      }
      if (hoverTooltip) {
        hoverTooltip.remove()
        hoverTooltip = null
      }
      if (selectionTooltip) {
        selectionTooltip.remove()
        selectionTooltip = null
      }
      data = []
      filteredData = []
      content = {columns: undefined}
    },

    render: (container: HTMLElement) => {
      _container = container

      if (_container) {
        svg = d3.select(_container)
          .html(null)
          .append('svg')
        svg.append('defs')
        // Draw the legend after applying the margins.
        const legendGroup = svg.append('g')
          .attr('class', 'heatmap-legend')
          .attr('transform', `translate(${margins.left},${margins.top})`)
        legendGroup.append('g')
          .attr('class', 'heatmap-vertical-color-legend')
        const mainGroup = svg.append('g')
          .attr('class', 'heatmap-main')
        mainGroup.append('g')
          .attr('class', 'heatmap-bottom-axis')
        mainGroup.append('g')
          .attr('class', 'heatmap-left-axis')
        mainGroup.append('g')
          .attr('class', 'heatmap-y-axis-tick-labels')
        mainGroup.append('g')
          .attr('class', 'heatmap-hovers')
        mainGroup.append('g')
          .attr('class', 'heatmap-nodes')

        if (alignViaLegend || drawLegend) {
          // Update the heatmap effective margins to take the legend into account.
          effectiveMargins = {
            ...margins,
            left: margins.left + LEGEND_SIZE
          }
        }

        // Main group's margins must include the legend.
        svg.select('g.heatmap-main')
            .attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)

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

        if (drawLegend) {
          const legend = d3.select('g.heatmap-vertical-color-legend')
            .attr('width', LEGEND_SIZE)
            .attr('height', height)

          verticalColorLegend(
            legend, {
              color: colorScale,
              title: legendTitle,
              height: height,
              marginTop: 0,
            })
        }

        // Set the Y scale. We are placing all row content starting at screen position 0 and continuing to the heatmap height.
        yScale.range([0, height]).domain(_.range(0, rows.length)).padding(nodePadding)

        // Set the X scale. We are placing idxLowerBound to idxUpperBound (all heatmap content) starting at screen position 0 and continuing to the effective heatmap width.
        xScale.range([0, width - effectiveMargins.left]).domain((idxLowerBound && idxUpperBound ? _.range(idxLowerBound, idxUpperBound + 1) : [])).padding(nodePadding)

        // Refresh the axes.
        if (drawX) {
          svg.select('g.heatmap-bottom-axis')
          .style('font-size', 15)
          .attr('transform', `translate(0,${height})`)
          // @ts-ignore
          .call(d3.axisBottom(xScale).ticks(0))
          .select('.domain').remove()

          // Skip x-axis labels by making them invisible.
          svg.select('g.heatmap-bottom-axis').selectAll('g.tick')
            .attr('class', (n) => (skipXTicks > 0 && (n % (skipXTicks + 1) === 1)) ? '' : 'heatmap-x-axis-invisible')
        }
        if (drawY) {
          svg.select('g.heatmap-y-axis-tick-labels')
          // @ts-ignore
          // Get the row's amino acid code or variation symbol
          .call(d3.axisLeft(yScale)
            .tickSize(0)
            .tickFormat((n) => rows[rows.length - 1 - n].label)
          )
          .select('.domain').remove()

          // Apply row-specific CSS classes to Y-axis tick mark labels.
          svg.selectAll('g.heatmap-y-axis-tick-labels g.tick')
            .attr('class', (n) => rows[rows.length - 1 - n].cssClass || '')
        }



        // Refresh each heatmap node.
        const chartedDatum = svg.select('g.heatmap-nodes').selectAll('rect').data(filteredData, (d) => d)
        chartedDatum.exit().remove()
        chartedDatum.enter()
          .append('rect')
          .attr('class', d => `node-${xCoordinate(d)}-${yCoordinate(d)}`)
          .attr('rx', nodeBorderRadius)
          .attr('ry', nodeBorderRadius)
          .style('cursor', 'pointer')
          .style('opacity', 0.8)
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseleave', mouseleave)
          .on('click', click)
          .merge(chartedDatum)
          .attr('x', d => xScale(xCoordinate(d)))
          .attr('y', d => yScale(yCoordinate(d)))
          // bandwidth is directly proportional to the controllable nodeHeight and nodeWidth properties.
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .style('fill', d => color(d))
          .style('stroke-width', d => strokeWidth(d === selectedDatum))
          .style('stroke', d => stroke(d === selectedDatum))
      }

      updateSelectionTooltipAfterRefresh()
      return chart
    },

    resize: () => {
      if (_container && svg) {
        // Implied height/width bbased on the provided node sizes and heatmap contents.
        const heatmapCalculatedHeight = nodeSize.height * rows.length
        const heatmapCalculatedWidth = nodeSize.width * (content.columns ? content.columns : 0)

        // Total width/height, including all margins and additional elements.
        const heatmapTotalWidth = ((margins.left + margins.right) + (drawLegend || alignViaLegend ? LEGEND_SIZE : 0) + heatmapCalculatedWidth) * (1 + nodePadding)
        const heatmapTotalHeight = ((margins.top + margins.bottom) + heatmapCalculatedHeight) * (1 + nodePadding)

        // Total width/height, less any provided margins.
        const drawableHeight = heatmapTotalHeight - margins.top - margins.bottom
        const drawableWidth = heatmapTotalWidth - margins.left - margins.right

        // Use these properties to draw heatmap elements.
        height = drawableHeight
        width = drawableWidth

        svg.attr('height', heatmapTotalHeight)
          .attr('width', heatmapTotalWidth)
      }
      return chart
    },

    clearSelection: () => {
      hideHighlight(selectedDatum)
      selectedDatum = null
      hideTooltip(selectionTooltip)
    },

    selectDatumByIndex: (datumRowIndex: number, datumColumnIndex: number) => {
      refreshSelectedDatum(content[datumRowIndex][datumColumnIndex], false)
      updateSelectionTooltipAfterRefresh()
    },

    selectDatum: (d: HeatmapDatum) => {
      refreshSelectedDatum(d, false)
      updateSelectionTooltipAfterRefresh()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Accessors
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    data: (value?: HeatmapDatum[]) => {
      if (value === undefined) {
        return data
      }
      data = value
      prepareData()
      return chart
    },

    rows: (value?: HeatmapRowSpecification[]) => {
      if (value === undefined) {
        return data
      }
      rows = value
      return chart
    },

    rowClassifier: (value?: ((d: HeatmapDatum) => number[]) | null) => {
      if (value === undefined) {
        return rowClassifier
      }
      rowClassifier = value
      return chart
    },

    colorClassifier: (value?: ((d: HeatmapDatum) => number | d3.Color)) => {
      if (value === undefined) {
        return colorClassifier
      }
      colorClassifier = value
      return chart
    },

    datumSelected: (value?: ((d: HeatmapDatum) => void) | null) => {
      if (value === undefined) {
        return datumSelected
      }
      datumSelected = value
      return chart
    },

    excludeDatum: (value?: ((d: HeatmapDatum) => boolean)) => {
      if (value === undefined) {
        return excludeDatum
      }
      excludeDatum = value
      return chart
    },

    valueField: (value?: FieldGetter<number>) => {
      if (value === undefined) {
        return valueField
      }
      valueField = value
      return chart
    },

    xCoordinate: (value?: FieldGetter<number>) => {
      if (value === undefined) {
        return xCoordinate
      }
      xCoordinate = value
      return chart
    },

    yCoordinate: (value?: FieldGetter<number>) => {
      if (value === undefined) {
        return yCoordinate
      }
      yCoordinate = value
      return chart
    },

    tooltipHtml: (value?: ((
      datum: HeatmapDatum | null,
    ) => string | null) | null) => {
      if (value === undefined) {
        return tooltipHtml
      }
      tooltipHtml = value
      return chart
    },

    margins: (value?: HeatmapMargins) => {
      if (value === undefined) {
        return margins
      }
      margins = value
      return chart
    },

    nodeBorderRadius: (value?: number) => {
      if (value === undefined) {
        return nodeBorderRadius
      }
      nodeBorderRadius = value
      return chart
    },

    nodePadding: (value?: number) => {
      if (value === undefined) {
        return nodePadding
      }
      nodePadding = value
      return chart
    },

    nodeSize: (value?: HeatmapNodeSize) => {
      if (value === undefined) {
        return nodeSize
      }
      nodeSize = value
      return chart
    },

    lowerBoundColor: (value?: string) => {
      if (value === undefined) {
        return lowerBoundColor
      }
      lowerBoundColor = value
      return chart
    },

    pivotColor: (value?: string) => {
      if (value === undefined) {
        return pivotColor
      }
      pivotColor = value
      return chart
    },

    upperBoundColor: (value?: string) => {
      if (value === undefined) {
        return upperBoundColor
      }
      upperBoundColor = value
      return chart
    },

    drawX: (value?: boolean) => {
      if (value === undefined) {
        return drawX
      }

      drawX = value
      return chart
    },

    drawY: (value?: boolean) => {
      if (value === undefined) {
        return drawY
      }

      drawY = value
      return chart
    },

    skipXTicks: (value?: number) => {
      if (value === undefined) {
        return skipXTicks
      }

      skipXTicks = value
      return chart
    },

    legendTitle: (value?: string | null) => {
      if (value === undefined) {
        return legendTitle
      }

      legendTitle = value
      return chart
    },

    drawLegend: (value?: boolean) => {
      if (value === undefined) {
        return drawLegend
      }

      drawLegend = value
      return chart
    },

    alignViaLegend: (value?: boolean) => {
      if (value === undefined) {
        return alignViaLegend
      }

      alignViaLegend = value
      return chart
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Getters
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    selectedDatum: () => selectedDatum,

    container: () => _container,

    height: () => height,

    width: () => width,

    colorScale: () => colorScale,

    lowerBound: () => lowerBound,

    upperBound: () => upperBound,

    filteredData: () => filteredData,

    content: () => content,
  }

  return chart
}

/**
 * Given a MaveHGVS-pro amino acid code or code representing deletion, synonmyous variation, or stop codon, return the
 * corresponding single-character code (which is the code used in our heatmap's y-axis).
 *
 * @param aaCodeOrChange A one- or three-character code representing an amino acid or the result of a variation at a
 *   single locus in a protein sequence. If not an amino acid code, it should be a code representing synonymous
 *   variation (=), stop codon (*), or deletion (- or del).
 * @return The one-character code representing the same amino acid or change, or null if the input was not a supported
 *   amino acid or change.
 */
export function singleLetterAminoAcidOrHgvsCode(aaCodeOrChange: string): string | null {
  const code = aaCodeOrChange.toUpperCase()
  if (code.length == 1) {
    return code
  }
  if (code.length == 3) {
    return AMINO_ACIDS.find((aa) => aa.codes.triple == code)?.codes?.single
      || MAVE_HGVS_PRO_CHANGE_CODES.find((change) => change.codes.triple == code)?.codes?.single
      || null
  }
  // TODO What about D-amino acids? The "d-" prefix has been capitalized at this point, so if we need to handle these,
  // we should match against capitalized five-letter codes.
  return null
}

/**
 * Given a MaveHGVS-pro amino acid code or code representing deletion, synonmyous variation, or stop codon, return the
 * heatmap row number on which a single-AA variant should be displayed.
 *
 * @param aaCodeOrChange A one- or three-character code representing an amino acid or the result of a variation at a
 *   single locus in a protein sequence. If not an amino acid code, it should be a code representing synonymous
 *   variation (=), stop codon (*), or deletion (- or del).
 * @returns The heatmap row number, from 0 (the bottom row) to 22 (the top row).
 */
export function heatmapRowForProteinVariant(aaCodeOrChange: string): number | null {
  const singleLetterCode = singleLetterAminoAcidOrHgvsCode(aaCodeOrChange)
  const ranking = singleLetterCode ? HEATMAP_AMINO_ACID_ROWS.findIndex((rowSpec) => rowSpec.code == singleLetterCode) : null
  return (ranking != null && ranking >= 0) ? ranking : null
}


/**
 * Given a MaveHGVS-pro amino acid code or code representing deletion, synonmyous variation, or stop codon, return the
 * heatmap row number on which a single-AA variant should be displayed.
 *
 * @param ntCodeOrChange A one-character code representing a nucleotide base or the result of a variation at a
 *   single locus in a nucleotide sequence.
 * @returns The heatmap row number, from 0 (the bottom row) to 3 (the top row).
 */
export function heatmapRowForNucleotideVariant(ntCodeOrChange: string): number | null {
  const singleLetterCode = ntCodeOrChange.toUpperCase()
  const ranking = singleLetterCode ? HEATMAP_NUCLEOTIDE_ROWS.findIndex((rowSpec) => rowSpec.code == singleLetterCode) : null
  return (ranking != null && ranking >= 0) ? ranking : null
}


/**
 * Given a D3 color scale over a given domain, construct a canvas filled with rectangles of the colors interpolated
 * over the domain.
 *
 * @param color A d3 color scale interpolated over a domain.
 * @param n An optional value that defines the number of interpolated rectangles to construct on the canvas (Default: 256).
 * @returns A canvas of the interpolated colors.
 */
function ramp(color: Function, n = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = 1;
  canvas.height = n;

  const context = canvas.getContext("2d");
  if (context === null) {
    return canvas
  }

  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(0, n - i, 1, 1);
  }

  return canvas
}


/**
 * Draws a vertical color legend within the provided container. Callers may provide an optional
 * object of color legend settings that alter the way in which this legend is drawn.
 *
 * @param containerSelection The container within which to draw the vertical color legend
 * @param colorLegendSettings An optional object containing color legend settings.
 * @returns The node element containing the color legend
 */
export function verticalColorLegend(containerSelection: d3.Selection<Element, SVGGElement, Element, Element>, {
  color = d3.scaleSequential(d3.interpolateRdBu).domain([0, 1]),
  title = "Legend",
  tickSize = 5,
  width = 36 + tickSize,
  height = 100,
  marginTop = 12,
  marginRight = 5,
  marginBottom = 0,
  marginLeft = 15 + tickSize,
  ticks = height / 64,
  tickFormat = null,
  tickValues = null,
} = {}) {
  let tickAdjust = (g: any) => g.selectAll(".tick line").attr("x1", width - marginLeft - marginRight + tickSize);

  // Continuous color scale
  const n = Math.min(color.domain().length, color.range().length);
  const x: any = color.copy().rangeRound(d3.quantize(d3.interpolate(height - marginBottom, marginTop), n));

  // Construct image of the legend
  containerSelection.append("image")
    .attr("x", marginLeft + tickSize)
    .attr("y", marginTop)
    .attr("width", width - marginLeft - marginRight)
    .attr("height", height - marginTop - marginBottom)
    .attr("preserveAspectRatio", "none")
    .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());

  // Add legend title, axis tick marks, and axis labels
  containerSelection.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(x)
      .ticks(Math.max(ticks, 4), typeof tickFormat === "string" ? tickFormat : null)
      .tickFormat(typeof tickFormat === "function" ? tickFormat : null)
      .tickSize(tickSize)
      .tickValues(tickValues))
    .call(tickAdjust)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.append("text")
      .attr("x", 0)
      .attr("y", marginTop)
      .attr("fill", "#000000")
      .attr("text-anchor", "middle")
      .attr("class", "title")
      .attr('font-size', LABEL_SIZE)
      .attr('transform', `translate(${-(width - marginLeft / 2)}, ${height / 2}) rotate(-90)`)
      .text(title));

  return containerSelection.node();
}
