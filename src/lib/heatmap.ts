import * as d3 from 'd3'
import _ from 'lodash'

type FieldGetter<T> = (d: HeatmapDatum) => T
type Getter<T> = () => T
type Accessor<T, Self> = (value?: T) => T | Self

export const DEFAULT_MINIMUM_COLOR = '#3F51B5'
export const DEFAULT_PIVOT_COLOR = '#FFFFFF'
export const DEFAULT_MAXIMUM_COLOR = '#B00020'

const LABEL_SIZE = 10
const LEGEND_SIZE = 80

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
  width: number
  height: number
}

export interface HeatmapRowSpecification {
  /** A single-character code for this row. */
  code: string
  /** The tick mark label text to display for this row, which is usually the same as the code. */
  label: string
  /** An optional CSS class name to apply to the row's tick mark label. */
  cssClass?: string
  /** An optional group code. */
  groupCode?: string
  /** An optional label to display for this row's group, which is usually the same as the group code. */
  groupLabel?: string
}

export type HeatmapScores = any
export type HeatmapDatum = any
export type MappedDatum = {[key: number]: HeatmapDatum}

type RangeSelectionMode = 'column' | 'row' | 'box' | null
type AxisSelectionMode = 'x' | 'y' | null

export interface HeatmapColorScaleControlPoint {
  value: number
  colorKey: string
}

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
  render: (container: HTMLElement, wrapper?: HTMLElement) => Heatmap
  refresh: () => Heatmap
  resize: () => Heatmap

  // Selection management
  clearSelection: () => void
  selectDatum: (datum: HeatmapDatum) => void
  selectDatumByIndex: (x: number, y: number) => void
  selectRangeByIndex: (start: {x: number; y: number}, end: {x: number; y: number}) => void

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /** Data (heatmap content) */
  data: Accessor<HeatmapDatum[], Heatmap>
  content: Accessor<HeatmapContent, Heatmap>
  rowClassifier: Accessor<((d: HeatmapDatum) => number[]) | null, Heatmap>
  colorClassifier: Accessor<(d: HeatmapDatum) => number | d3.Color, Heatmap>
  datumSelected: Accessor<((d: HeatmapDatum) => void) | null, Heatmap>
  columnRangesSelected: Accessor<((ranges: Array<{start: number; end: number}>) => void) | null, Heatmap>
  rowSelected: Accessor<((data: HeatmapDatum[]) => void) | null, Heatmap>
  rowRangesSelected: Accessor<((ranges: Array<{start: number, end: number}>) => void) | null, Heatmap>
  excludeDatum: Accessor<((d: HeatmapDatum) => boolean), Heatmap>

  // Data fields
  valueField: Accessor<FieldGetter<number>, Heatmap>
  accessorField: Accessor<FieldGetter<string>, Heatmap>
  xCoordinate: Accessor<FieldGetter<number>, Heatmap>
  yCoordinate: Accessor<FieldGetter<number>, Heatmap>
  tooltipHtml: Accessor<((datum: HeatmapDatum | null) => string | null) | null, Heatmap>

  // Layout
  margins: Accessor<HeatmapMargins, Heatmap>
  rows: Accessor<HeatmapRowSpecification[], Heatmap>
  nodeSize: Accessor<HeatmapNodeSize, Heatmap>
  nodeBorderRadius: Accessor<number, Heatmap>
  nodePadding: Accessor<number, Heatmap>

  // Color
  colorScaleControlPoints: Accessor<HeatmapColorScaleControlPoint[] | null, Heatmap>
  lowerBoundColor: Accessor<string, Heatmap>
  pivotColor: Accessor<string, Heatmap>
  upperBoundColor: Accessor<string, Heatmap>

  // Axis controls
  drawX: Accessor<boolean, Heatmap>
  drawY: Accessor<boolean, Heatmap>
  drawYGroups: Accessor<boolean, Heatmap>
  skipXTicks: Accessor<number, Heatmap>
  tooltipTickLabelHtml: Accessor<((
    rowNumber: number | null,
  ) => string | null) | null, Heatmap>

  // Legend controls
  legendTitle: Accessor<string | null, Heatmap>
  drawLegend: Accessor<boolean, Heatmap>
  alignViaLegend: Accessor<boolean, Heatmap>

  // Selection mode
  rangeSelectionMode: Accessor<RangeSelectionMode, Heatmap>
  axisSelectionMode: Accessor<AxisSelectionMode, Heatmap>

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Getters
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Selection
  selectedDatum: Getter<HeatmapDatum | null>
  selectionStartDatum: Getter<HeatmapDatum | null>
  selectionEndDatum: Getter<HeatmapDatum | null>
  selectedRows: Getter<number[] | null>

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

  // User interaction
  lastSelectedDOMPoint: Getter<DOMPoint | null>
}

export default function makeHeatmap(): Heatmap {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Read/write properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Data fields
  let valueField: FieldGetter<number> = (d) => d as number
  let accessorField: FieldGetter<string> = (d) => d as string
  let xCoordinate: FieldGetter<number> = (d) => d as number
  let yCoordinate: FieldGetter<number> = (d) => d as number
  let tooltipHtml: ((datum: HeatmapDatum | null) => string | null) | null = null

  // Data
  let data: HeatmapDatum[] = []
  let rowClassifier: ((d: HeatmapDatum) => number[]) | null = null
  let colorClassifier: (d: HeatmapDatum) => number | d3.Color = valueField
  let datumSelected: ((d: HeatmapDatum) => void) | null = null
  let columnRangesSelected: ((ranges: Array<{start: number; end: number}>) => void) | null = null
  let rowSelected: ((data: HeatmapDatum[]) => void) | null = null
  let rowRangesSelected: ((ranges: Array<{start: number, end: number}>) => void) | null = null
  let excludeDatum: ((d: HeatmapDatum) => boolean) = (d) => false as boolean

  // Layout
  let margins: HeatmapMargins = {top: 20, right: 20, bottom: 30, left: 20}
  let nodeBorderRadius: number = 4
  let nodePadding: number = .1
  let nodeSize: HeatmapNodeSize = { width: 20, height: 20}
  let rows: HeatmapRowSpecification[] = []

  // Colors
  let colorScaleControlPoints: HeatmapColorScaleControlPoint[] | null = null
  let lowerBoundColor: string = DEFAULT_MINIMUM_COLOR
  let pivotColor: string = DEFAULT_PIVOT_COLOR
  let upperBoundColor: string = DEFAULT_MAXIMUM_COLOR

  // Axis controls
  let drawX: boolean = true
  let drawY: boolean = true
  let drawYGroups: boolean = false
  let skipXTicks: number = 1
  let tooltipTickLabelHtml: ((
    rowNumber: number | null,
  ) => string | null) | null = null

  // Legend controls
  let legendTitle: string | null = null
  let drawLegend: boolean = true
  let alignViaLegend: boolean = false

  // Selection mode
  let rangeSelectionMode: RangeSelectionMode = null
  let axisSelectionMode: AxisSelectionMode = null

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
  let selectionStartDatum: HeatmapDatum | null = null
  let selectionEndDatum: HeatmapDatum | null = null
  let selectedRows: number[] | null = null

  let selectionStartPoint: DOMPoint | null = null

  // Container
  let _container: HTMLElement | null = null

  // Wrapper
  let _wrapper: HTMLElement | null = null

  // Layout
  let height: number | null = null
  let width: number | null = null

  let heatmapNodesElemDOMMatrix: DOMMatrix | null = null
  let heatmapNodesElemBoundingRect: DOMRect | null = null

  // Color scale
  let colorScale: d3.ScaleLinear<string, number> | null = null

  // User interaction
  let lastSelectedDOMPoint: DOMPoint | null = null

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Internal properties
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Hovering
  let hoverDatum: HeatmapDatum | null = null

  // Layout

  /** Margins of the heatmap itself, after leaving space for other drawn elements. */
  let effectiveMargins: HeatmapMargins = {top: 0, right: 0, bottom: 0, left: 0}

  // D3 selections containing DOM elements
  let svg: d3.Selection<SVGElement, any, any, any> | null = null
  let yAxisSvg: d3.Selection<SVGElement, any, any, any> | null = null
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
    let xMin: number | undefined = undefined
    let xMax: number | undefined = undefined
    for (const datum of data) {
      datum.isVisible = !excludeDatum(datum)

      const x = xCoordinate(datum)
      if (xMin == undefined || x < xMin) {
        xMin = x
      }
      if (xMax == undefined || x > xMax) {
        xMax = x
      }
      content[x] = content[x] || {}
      content[x][yCoordinate(datum)] = datum

      if (!isNaN(valueField(datum))) {
        lowerBound = lowerBound ? Math.min(lowerBound, valueField(datum)) : valueField(datum)
        upperBound = upperBound ? Math.max(upperBound, valueField(datum)) : valueField(datum)
      }

      idxLowerBound = idxLowerBound ? Math.min(idxLowerBound, x) : x
      idxUpperBound = idxUpperBound ? Math.max(idxUpperBound, x) : x

      if (datum.isVisible) {
        filteredData.push(datum)
      }
    }
    if (xMin != undefined && xMax != undefined) {
      content.columns = xMax - xMin + 1
    } else {
      content.columns = 0
    }
    buildColorScale()
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Coloring
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const color = function (d: HeatmapDatum) {
    let classification: number | d3.Color = colorClassifier(d)
    return typeof classification === 'number' ? (colorScale ? colorScale(classification) : null) : classification
  }

  const buildColorScale = function () {
    if (colorScaleControlPoints) {
      const colors = {
        'neutral': pivotColor,
        'normal': lowerBoundColor,
        'abnormal': upperBoundColor
      }
      colorScale = d3.scaleLinear()
          .domain(colorScaleControlPoints.map((controlPoint) => controlPoint.value))
          .range(colorScaleControlPoints.map((controlPoint) => colors[controlPoint.colorKey] ?? pivotColor))
    } else {
      const imputedDomain = [
        lowerBound ? lowerBound : 0,
        ((lowerBound ? lowerBound : 0) + (upperBound ? upperBound : 1)) / 2,
        upperBound ? upperBound : 1
      ]
      const imputedRange = [lowerBoundColor, pivotColor, upperBoundColor]
      colorScale = d3.scaleLinear().domain(imputedDomain).range(imputedRange)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Clicking
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const selectRow: (rowNumber: number) => void = (rowNumber: number) => {
      if (svg) {
        svg.select('g.heatmap-axis-selection-rectangle').selectAll('rect').remove()
        svg.select('g.heatmap-axis-selection-rectangle')
          .append('rect')
          .attr('x', 0)
          .attr('y', rowNumber * yScale.step() + (nodePadding * yScale.step()/2))
          .attr('width', (content.columns ? content.columns : 0) * xScale.step())
          .attr('height', yScale.step())
          .style('fill', 'none')
          .style('stroke-width', 2)
          .style('stroke', '#808')
          .raise()
      }
      if (rowSelected) rowSelected(data.filter((d: HeatmapDatum) => yCoordinate(d) === rowNumber))
  }

  const selectRowRange: (startRowNumber: number, rowCount: number) => void = (startRowNumber: number, rowCount: number) => {
      if (svg) {
        svg.select('g.heatmap-axis-selection-rectangle').selectAll('rect').remove()
        svg.select('g.heatmap-axis-selection-rectangle')
          .append('rect')
          .attr('x', 0)
          .attr('y', startRowNumber * yScale.step() + (nodePadding * yScale.step()/2))
          .attr('width', (content.columns ? content.columns : 0) * xScale.step())
          .attr('height', rowCount * yScale.step())
          .style('fill', 'none')
          .style('stroke-width', 2)
          .style('stroke', '#808')
          .raise()
      }
      if (rowRangesSelected) rowRangesSelected([{ start: startRowNumber, end: startRowNumber + rowCount - 1 }])
  }

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

  const heatmapMainMousedown = function (event: MouseEvent) {
    if (rangeSelectionMode && svg) {
      if (svg) svg.select('g.heatmap-selection-rectangle').selectAll('rect').remove()

      hideTooltip(hoverTooltip)
      hideTooltip(selectionTooltip)

      const heatmapNodesElem = svg.select('g.heatmap-nodes').node() as SVGGraphicsElement
      heatmapNodesElemBoundingRect = heatmapNodesElem.getBoundingClientRect()
      heatmapNodesElemDOMMatrix = heatmapNodesElem.getScreenCTM()!.inverse()

      const y = rangeSelectionMode == 'column' ? heatmapNodesElemBoundingRect?.top : event.y
      const x = rangeSelectionMode == 'row' ? heatmapNodesElemBoundingRect?.left : event.x
      const pt = new DOMPoint(x, y)
      const targetPt = pt.matrixTransform(heatmapNodesElemDOMMatrix)

      selectionStartPoint = targetPt
      const xScaleStep = xScale.step()
      const yScaleStep = yScale.step()

      svg
        .select('g.heatmap-selection-rectangle')
        .append('rect')
        .attr('x', Math.floor(targetPt.x / xScaleStep) * xScaleStep)
        .attr('y', Math.floor(targetPt.y / yScaleStep) * yScaleStep)
        .attr('width', 4)
        .attr('height', 4)
        .style('fill', 'none')
        .raise()
    }
  }

  const heatmapMainMouseup = function (event: MouseEvent) {
    if (rangeSelectionMode && selectionStartPoint && svg) {
      const y = rangeSelectionMode == 'column' ? heatmapNodesElemBoundingRect?.top : event.y
      const x = rangeSelectionMode == 'row' ? heatmapNodesElemBoundingRect?.left : event.x
      const pt = new DOMPoint(x, y)
      const selectionEndPoint = pt.matrixTransform(heatmapNodesElemDOMMatrix!)

      // If the selection end point is the same as the selection start point, call mouse move to update the selection rectangle.
      // Othersiwse, clear the single datum selection.
      if (selectionStartPoint.x == selectionEndPoint.x && selectionStartPoint.y == selectionEndPoint.y) {
        heatmapMainMousemove(event)
      } else {
        hideHighlight(selectedDatum)
        selectedDatum = null
        hideTooltip(selectionTooltip)
      }

      // convert the selection rectangle to heatmap coordinates
      const heatmapSelectionRect = svg.select('g.heatmap-selection-rectangle').select('rect').node() as SVGRectElement
      const heatmapSelectionBBox = heatmapSelectionRect.getBBox()

      const xScaleStep = xScale.step()
      const yScaleStep = yScale.step()

      // offsets to adjust the selection rectangle coordinates to the center of the heatmap nodes.
      const xOffsetNodeMidpoint = nodeSize.width * strokeWidth(true) * 0.5
      const yOffsetNodeMidpoint = nodeSize.height * strokeWidth(true) * 0.5

      // top left coordinates of the selection rectangle in heatmap coordinates.
      const rangeStart = {
        x: Math.floor((heatmapSelectionBBox.x + xOffsetNodeMidpoint) / xScaleStep) + 1,
        y: Math.floor((heatmapSelectionBBox.y + yOffsetNodeMidpoint) / yScaleStep) + 1
      }
      // bottom right coordinates of the selection rectangle in heatmap coordinates.
      const rangeEnd = {
        x: Math.floor((heatmapSelectionBBox.x + heatmapSelectionBBox.width - xOffsetNodeMidpoint) / xScaleStep) + 1,
        y: Math.floor((heatmapSelectionBBox.y + heatmapSelectionBBox.height - yOffsetNodeMidpoint) / yScaleStep) + 1
      }

      if (rangeSelectionMode == 'column' && columnRangesSelected) {
        columnRangesSelected([{start: rangeStart.x, end: rangeEnd.x}])
      }
    }
    selectionStartPoint = null
  }

  const heatmapMainMousemove = function (event: MouseEvent) {
    if (rangeSelectionMode && selectionStartPoint) {
      if (svg) {
        const pt = new DOMPoint(event.x, event.y)
        const targetPt = pt.matrixTransform(heatmapNodesElemDOMMatrix!)

        const xScaleStep = xScale.step()
        const yScaleStep = yScale.step()

        // Adjust the target point to snap to the nearest grid point based on the scale step.
        const adjTargetPt = new DOMPoint(
          targetPt.x < selectionStartPoint.x
            ? Math.floor(targetPt.x / xScaleStep) * xScaleStep
            : Math.ceil(targetPt.x / xScaleStep) * xScaleStep,
          targetPt.y < selectionStartPoint.y
            ? Math.floor(targetPt.y / yScaleStep) * yScaleStep
            : Math.ceil(targetPt.y / yScaleStep) * yScaleStep
        )

        const selectionRectWidth =
          rangeSelectionMode == 'row'
            ? width
            : Math.ceil(Math.abs(adjTargetPt.x - selectionStartPoint.x) / xScaleStep) * xScaleStep
        const selectionRectHeight =
          rangeSelectionMode == 'column'
            ? height
            : Math.ceil(Math.abs(adjTargetPt.y - selectionStartPoint.y) / yScaleStep) * yScaleStep

        svg
          .select('g.heatmap-selection-rectangle')
          .select('rect')
          .attr('x', Math.floor(Math.min(selectionStartPoint.x, targetPt.x) / xScaleStep) * xScaleStep)
          .attr('y', Math.floor(Math.min(selectionStartPoint.y, targetPt.y) / yScaleStep) * yScaleStep)
          .attr('width', selectionRectWidth)
          .attr('height', selectionRectHeight)
          .style('stroke-width', 2)
          .style('stroke', '#d3a')
      }
    }
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

  const refreshSelectedRange = function (start: {x: number; y: number}, end: {x: number; y: number}) {
    hideHighlight(selectedDatum)
    selectedDatum = null
    hideTooltip(selectionTooltip)

    if (svg) {
      svg.select('g.heatmap-selection-rectangle').selectAll('rect').remove()

      const heatmapNodesElem = svg.select('g.heatmap-nodes').node() as SVGGraphicsElement
      heatmapNodesElemBoundingRect = heatmapNodesElem.getBoundingClientRect()
      heatmapNodesElemDOMMatrix = heatmapNodesElem.getScreenCTM()!.inverse()

      const startNode = svg.select(`g.heatmap-nodes`).select(`rect.node-${start.x}-${start.y}`).node() as Element
      const startNodeBoundingRect = startNode.getBoundingClientRect()

      const endNode = svg.select(`g.heatmap-nodes`).select(`rect.node-${end.x}-${end.y}`).node() as Element
      const endNodeBoundingRect = endNode.getBoundingClientRect()

      const startY = rangeSelectionMode == 'column' ? heatmapNodesElemBoundingRect?.top : startNodeBoundingRect.y
      const startX = rangeSelectionMode == 'row' ? heatmapNodesElemBoundingRect?.left : startNodeBoundingRect.x

      const endY = rangeSelectionMode == 'column' ? heatmapNodesElemBoundingRect?.bottom : endNodeBoundingRect.bottom
      const endX = rangeSelectionMode == 'row' ? heatmapNodesElemBoundingRect?.right : endNodeBoundingRect.right

      const startPt = new DOMPoint(startX, startY)
      const endPt = new DOMPoint(endX, endY)

      const startTargetPt = startPt.matrixTransform(heatmapNodesElemDOMMatrix)
      const endTargetPt = endPt.matrixTransform(heatmapNodesElemDOMMatrix)

      const selectionRectWidth = rangeSelectionMode == 'row' ? width : endTargetPt.x - startTargetPt.x
      const selectionRectHeight = rangeSelectionMode == 'column' ? height : endTargetPt.y - startTargetPt.y

      svg
        .select('g.heatmap-selection-rectangle')
        .append('rect')
        .attr('x', startTargetPt.x)
        .attr('y', startTargetPt.y)
        .attr('width', selectionRectWidth)
        .attr('height', selectionRectHeight)
        .style('fill', 'none')
        .style('stroke-width', 2)
        .style('stroke', '#d3a')
        .raise()

      lastSelectedDOMPoint = startTargetPt
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Scrolling
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const scrollToDatum = function (d: HeatmapDatum) {
    if (_container) {
      const scrollValue = xScale(xCoordinate(d)) + strokeWidth(d) / 2

      // Only scroll if the variant is not in view.
      const variantIsInView =
        _container.parentElement.scrollLeft < scrollValue &&
        _container.clientWidth + _container.parentElement.scrollLeft > scrollValue
      if (!variantIsInView) {
        _container.parentElement.scrollLeft = scrollValue
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Hovering
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const mouseover = (event: MouseEvent, d: HeatmapDatum) => {
    if (!selectionStartPoint) {
      const target = event.target
      refreshHoverDatum(d)

      if (target instanceof Element) {
        showTooltip(hoverTooltip, hoverDatum)
      }
    }
  }

  const mousemove = (event: MouseEvent, d: HeatmapDatum) => {
    if (!selectionStartDatum && hoverTooltip) {
      // Move tooltip to be 30px to the right of the pointer.
      hoverTooltip
        .style('left', d3.pointer(event, document.body)[0] + 30 + 'px')
        .style('top', d3.pointer(event, document.body)[1] + 'px')
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

  const mouseoverYAxisTickLabel = (event: MouseEvent, rowNumber: number | null) => {
    const target = event.target
    refreshHoverDatum(null)
    hideTooltip(hoverTooltip)

    if (hoverTooltip && target instanceof Element) {
      showTickLabelTooltip(hoverTooltip, rowNumber)
      hoverTooltip
        .style('left', (d3.pointer(event, document.body)[0] + 30) + 'px')
        .style('top', (d3.pointer(event, document.body)[1]) + 'px')
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
    hoverTooltip = d3
      .select(document.body)
      .append('div')
      .style('display', 'none')
      .attr('class', 'heatmap-tooltip')
      .style('background-color', '#fff')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('color', '#000')
      .style('padding', '5px')
      .style('line-height', '1.5')
      .style('z-index', 2001)

    selectionTooltip = d3
      .select(_container)
      .append('div')
      .style('display', 'none')
      .attr('class', 'heatmap-selection-tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('color', '#000')
      .style('padding', '5px')
      .style('line-height', '1.5')
      .style('position', 'relative')
      .style('width', 'fit-content')
      .style('z-index', 1)
  }

  const showTooltip = (tooltip: d3.Selection<HTMLDivElement, any, any, any> | null, datum: HeatmapDatum | null) => {
    if (datum) {
      if (tooltipHtml) {
        const html = tooltipHtml(datum)

        if (html && tooltip) {
          tooltip.html(html)
          tooltip.style('display', 'block')
        }
      }
    }
  }

  const showTickLabelTooltip = (
    tooltip: d3.Selection<HTMLDivElement, any, any, any> | null,
    rowNumber: number | null
  ) => {
      if (tooltipTickLabelHtml) {
        const html = tooltipTickLabelHtml(
          rowNumber
        )

        if (html && tooltip) {
          tooltip.html(html)
          tooltip.style('display', 'block')
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
      selectionTooltip.style('margin-bottom', -tooltipHeight + 'px')

      // TODO: Bug- Drawing the selection tooltip makes the SVG scroll container add tooltipHeight worth of height
      //            to the scroll container.

      // Show the tooltip to the left of the datum node if it would overflow from the right side of the heatmap container.
      if (
        left + effectiveMargins.left + 1.5 * nodeSize.width + tooltipWidth >
        scrollPosition + _container.clientWidth
      ) {
        selectionTooltip
          // When drawing the tooltip to the right of the node, the width of the tooltip influences how far to move it.
          .style('left', left - 0.5 * tooltipWidth - nodeSize.width + 0.5 * strokeWidth(true) + 'px')
      } else {
        selectionTooltip.style(
          'left',
          left + effectiveMargins.left + 1.5 * nodeSize.width + 0.5 * strokeWidth(true) + 'px'
        )
      }

      // Show the tooltip under the datum node if it would overflow from the top of the heatmap container.
      if (rows.length < 4 || yCoordinate(selectedDatum) <= 2) {
        selectionTooltip
          .style('top', null)
          .style('bottom', _container.clientHeight - top - tooltipHeight + 0.5 * strokeWidth(true) + 'px')
      } else {
        selectionTooltip
          .style('top', -(_container.clientHeight - top) + nodeSize.height + 0.5 * strokeWidth(true) + 'px')
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

  const strokeWidth = function (draw: boolean) {
    return draw ? 2 : 0
  }

  const hideHighlight = (d: HeatmapDatum) => {
    if (svg) {
      svg
        .select(`g.heatmap-nodes`)
        .selectAll(`rect.node-${xCoordinate(d)}-${yCoordinate(d)}`)
        .style('stroke', stroke(false))
        .style('stroke-width', strokeWidth(false))
    }
  }

  const showHighlight = (d: HeatmapDatum) => {
    if (svg) {
      svg
        .select(`g.heatmap-nodes`)
        .selectAll(`rect.node-${xCoordinate(d)}-${yCoordinate(d)}`)
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

    render: (container: HTMLElement, wrapper?: HTMLElement) => {
      _container = container
      _wrapper = wrapper || null

      if (_container) {
        svg = d3.select(_container).html(null).append('svg')
        svg.append('defs')
        // Draw the legend after applying the margins.
        const legendGroup = svg
          .append('g')
          .attr('class', 'heatmap-legend')
          .attr('transform', `translate(${margins.left},${margins.top})`)
        legendGroup.append('g').attr('class', 'heatmap-vertical-color-legend')
        const mainGroup = svg.append('g').attr('class', 'heatmap-main')
        mainGroup.append('g').attr('class', 'heatmap-bottom-axis')
        mainGroup.append('g').attr('class', 'heatmap-y-axis-tick-labels')
        mainGroup.append('g').attr('class', 'heatmap-nodes')
        mainGroup.append('g').attr('class', 'heatmap-selection-rectangle')
        mainGroup.append('g').attr('class', 'heatmap-axis-selection-rectangle')

        // TODO drawLegend is always set to true here. Setting to false via accessor method still results in left margin
        // being adjusted to include LEGEND_SIZE. Consider moving this to refresh method and/or calculating legend size
        // based on content.
        if (alignViaLegend || drawLegend) {
          // Update the heatmap effective margins to take the legend into account.
          effectiveMargins = {
            ...margins,
            left: margins.left + LEGEND_SIZE + (drawYGroups ? 10 : 0),
          }
        }

        // Main group's margins must include the legend.
        svg.select('g.heatmap-main').attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)
      } else {
        svg = null
      }

      if (_wrapper) {
        yAxisSvg = d3
          .select(_wrapper)
          .append('svg')
          .style('position', 'absolute')
          .style('top', 0)
          .style('left', 0)
          .style('height', '100%')
          .style('z-index', 2002)
          .style('background-color', '#f7f7f7')
          .classed('exclude-from-export', true)
        const legendGroup = yAxisSvg
          .append('g')
          .attr('class', 'heatmap-legend')
          .attr('transform', `translate(${margins.left},${margins.top})`)
        legendGroup.append('g').attr('class', 'heatmap-vertical-color-legend')
        yAxisSvg
          .append('g')
          .attr('class', 'heatmap-y-axis-tick-labels')
          .attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)
      }

      renderTooltips()
      chart.resize()

      return chart
    },

    refresh: () => {
      if (_container && svg) {
        chart.resize()
        prepareData()

        // Create group data for row groupCodes
        const groupData = _.chain(rows)
          .groupBy('groupCode')
          .map((groupRows, groupCode) => ({
            groupCode,
            groupLabel: groupRows[0].groupLabel || groupCode,
            startRowNumber: rows.length - (rows.findIndex(row => row.groupCode === groupCode) + groupRows.length),
            rowCount: groupRows.length
          }))
          .filter(group => group.groupCode && group.groupCode !== 'undefined')
          .value()

        if (drawLegend) {
          const legend = svg.select('g.heatmap-vertical-color-legend').attr('width', LEGEND_SIZE).attr('height', height)
          verticalColorLegend(legend, {
            color: colorScale,
            title: legendTitle,
            height: height,
            marginTop: 0
          })
          if (_wrapper && yAxisSvg) {
            // Add padding to offset the legend to the top of the heatmap container, accounting for the stacked heatmap height or other content
            const paddingTop = _container.getBoundingClientRect().top - _wrapper.getBoundingClientRect().top
            yAxisSvg.style('padding-top', `${paddingTop}px`)
            const legendAbsolute = yAxisSvg
              .select('g.heatmap-vertical-color-legend')
              .attr('width', LEGEND_SIZE)
              .attr('height', height)

            verticalColorLegend(legendAbsolute, {
              color: colorScale,
              title: legendTitle,
              height: height,
              marginTop: 0
            })
          }
        }

        // Set the Y scale. We are placing all row content starting at screen position 0 and continuing to the heatmap height.
        yScale.range([0, height]).domain(_.range(0, rows.length)).padding(nodePadding)

        // Set the X scale. We are placing idxLowerBound to idxUpperBound (all heatmap content) starting at screen position 0 and continuing to the effective heatmap width.
        xScale
          .range([0, width - effectiveMargins.left])
          .domain(idxLowerBound && idxUpperBound ? _.range(idxLowerBound, idxUpperBound + 1) : [])
          .padding(nodePadding)

        // Refresh the axes.
        if (drawX) {
          svg.select('g.heatmap-bottom-axis')
            .style('font-size', 15)
            .attr('transform', `translate(0,${height})`)
            // @ts-ignore
            .call(d3.axisBottom(xScale).ticks(0))
            .select('.domain')
            .remove()

          // Skip x-axis labels by making them invisible.
          svg
            .select('g.heatmap-bottom-axis')
            .selectAll('g.tick')
            .attr('class', (n) => (skipXTicks > 0 && n % (skipXTicks + 1) === 1 ? '' : 'heatmap-x-axis-invisible'))
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
          svg
            .selectAll('g.heatmap-y-axis-tick-labels g.tick')
            .attr('class', (n) => rows[rows.length - 1 - n].cssClass || '')

          if (_wrapper && yAxisSvg) {
            const yAxisLabels = yAxisSvg.select('g.heatmap-y-axis-tick-labels')
            // @ts-ignore
            // Get the row's amino acid code or variation symbol
            yAxisLabels
              .call(
                d3
                  .axisLeft(yScale)
                  .tickSize(0)
                  .tickFormat((n) => rows[rows.length - 1 - n].label)
              )
              .select('.domain')
              .remove()

            // Center the text labels after the axis is created
            yAxisLabels.selectAll('g.tick text')
              .attr('text-anchor', 'middle')
              .attr('x', -8)
              .on('mouseover', mouseoverYAxisTickLabel)
              .on('mouseleave', mouseleave)

            if (axisSelectionMode == 'y') {
              yAxisLabels.style('cursor', 'pointer')
                .on('click', function(event) {
                  const datum = d3.select(event.target).datum()
                  if (_.isInteger(datum)) {
                    selectRow(datum as number)
                  } else if (_.isInteger((datum as any).startRowNumber) && _.isInteger((datum as any).rowCount)) {
                      selectRowRange((datum as any).startRowNumber, (datum as any).rowCount)
                  }
                })
            }

            // Apply row-specific CSS classes to Y-axis tick mark labels.
            yAxisSvg
              .selectAll('g.heatmap-y-axis-tick-labels g.tick')
              .attr('class', (n) => rows[rows.length - 1 - n].cssClass || '')

            if (drawYGroups) {
              // Add group elements for each groupCode in wrapper
              if (groupData.length > 0) {
                const groupElementsWrapper = yAxisSvg.select('g.heatmap-y-axis-tick-labels')
                  .selectAll('g.group-label')
                  .data(groupData)
                  .enter()
                  .append('g')
                  .attr('class', 'group-label')
                  .attr('data-group-code', d => d.groupCode)

                  // Add background rectangle for each group
                  groupElementsWrapper.append('rect')
                    .attr('x', -40)
                    .attr('y', d => {
                      const startY = yScale(d.startRowNumber) + yScale.bandwidth() / 2
                      return startY - (nodeSize.height / 2)
                    })
                    .attr('width', 20)
                    .attr('height', d => {
                      const startY = yScale(d.startRowNumber) + yScale.bandwidth() / 2
                      const endY = yScale(d.startRowNumber + d.rowCount - 1) + yScale.bandwidth() / 2
                      return endY - startY + (nodeSize.height)
                    })
                    .attr('fill', '#ccc')
                    .attr('stroke-width', 1)
                    .attr('rx', 3)
                    .attr('ry', 3)

                // Add group label text
                groupElementsWrapper.append('text')
                  .attr('x', -30)
                  .attr('y', d => {
                    const startY = yScale(d.startRowNumber) + yScale.bandwidth() / 2
                    const endY = yScale(d.startRowNumber + d.rowCount - 1) + yScale.bandwidth() / 2
                    return (startY + endY) / 2
                  })
                  .attr('dy', '0.35em')
                  .attr('text-anchor', 'middle')
                  .attr('fill', '#666')
                  .attr('font-size', '11px')
                  .attr('font-weight', 'bold')
                  .attr('transform', d => {
                    const startY = yScale(d.startRowNumber) + yScale.bandwidth() / 2
                    const endY = yScale(d.startRowNumber + d.rowCount - 1) + yScale.bandwidth() / 2
                    const centerY = (startY + endY) / 2
                    return `rotate(-90, -30, ${centerY})`
                  })
                  .text(d => d.groupLabel)
              }
            }

            // Set the width of the Y-axis SVG to accommodate legend and tick labels.
            const mainYAxisTickLabelsWidth = (svg?.select('g.heatmap-y-axis-tick-labels')?.node() as Element).getBoundingClientRect().width
            if (mainYAxisTickLabelsWidth) yAxisSvg.style('width', `${LEGEND_SIZE + (drawYGroups ? 10 : 0) + mainYAxisTickLabelsWidth + 3}px`)
          }
        }

        // Refresh each heatmap node.
        const chartedDatum = svg
          .select('g.heatmap-nodes')
          .selectAll('rect')
          .data(filteredData, (d) => d)
        chartedDatum.exit().remove()
        chartedDatum
          .enter()
          .append('rect')
          .attr('class', (d) => `node-${xCoordinate(d)}-${yCoordinate(d)}`)
          .attr('rx', nodeBorderRadius)
          .attr('ry', nodeBorderRadius)
          .style('cursor', 'pointer')
          .style('opacity', 0.8)
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseleave', mouseleave)
          .on('click', click)
          .merge(chartedDatum)
          .attr('x', (d) => xScale(xCoordinate(d)))
          .attr('y', (d) => yScale(yCoordinate(d)))
          // bandwidth is directly proportional to the controllable nodeHeight and nodeWidth properties.
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .style('fill', (d) => color(d))
          .style('stroke-width', (d) => strokeWidth(d === selectedDatum))
          .style('stroke', (d) => stroke(d === selectedDatum))
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
        const heatmapTotalWidth =
          (margins.left + margins.right + (drawLegend || alignViaLegend ? LEGEND_SIZE : 0) + heatmapCalculatedWidth) *
          (1 + nodePadding)
        const heatmapTotalHeight = (margins.top + margins.bottom + heatmapCalculatedHeight) * (1 + nodePadding)

        // Total width/height, less any provided margins.
        const drawableHeight = heatmapTotalHeight - margins.top - margins.bottom
        const drawableWidth = heatmapTotalWidth - margins.left - margins.right

        // Use these properties to draw heatmap elements.
        height = drawableHeight
        width = drawableWidth

        svg
          .attr('height', heatmapTotalHeight)
          .attr('width', heatmapTotalWidth)
          .on('mousedown', heatmapMainMousedown)
          .on('mousemove', heatmapMainMousemove)
          .on('mouseup', heatmapMainMouseup)
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

    selectDatum: (datum: HeatmapDatum) => {
      const selectedDatum = data.find((d) => accessorField(d) == accessorField(datum))
      refreshSelectedDatum(selectedDatum, false)
      updateSelectionTooltipAfterRefresh()
    },

    selectRangeByIndex: (start: {x: number; y: number}, end: {x: number; y: number}) => {
      refreshSelectedRange(start, end)
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

    colorClassifier: (value?: (d: HeatmapDatum) => number | d3.Color) => {
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

    columnRangesSelected: (value?: ((ranges: Array<{start: number; end: number}>) => void) | null) => {
      if (value === undefined) {
        return columnRangesSelected
      }
      columnRangesSelected = value
      return chart
    },

    rowSelected: (value?: ((data: HeatmapDatum[]) => void) | null) => {
      if (value === undefined) {
        return rowSelected
      }
      rowSelected = value
      return chart
    },

    rowRangesSelected: (value?: ((ranges: Array<{start: number, end: number}>) => void) | null) => {
      if (value === undefined) {
        return rowRangesSelected
      }
      rowRangesSelected = value
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

    accessorField: (value?: FieldGetter<string>) => {
      if (value === undefined) {
        return accessorField
      }
      accessorField = value
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

    tooltipHtml: (value?: ((datum: HeatmapDatum | null) => string | null) | null) => {
      if (value === undefined) {
        return tooltipHtml
      }
      tooltipHtml = value
      return chart
    },

    tooltipTickLabelHtml: (value?: ((
      rowNumber: number | null,
    ) => string | null) | null) => {
      if (value === undefined) {
        return tooltipTickLabelHtml
      }
      tooltipTickLabelHtml = value
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

    colorScaleControlPoints: (value?: HeatmapColorScaleControlPoint[] | null) => {
      if (value === undefined) {
        return colorScaleControlPoints
      }
      colorScaleControlPoints = value
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

    drawYGroups: (value?: boolean) => {
      if (value === undefined) {
        return drawYGroups
      }

      drawYGroups = value
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

    rangeSelectionMode: (value?: RangeSelectionMode) => {
      if (value === undefined) {
        return rangeSelectionMode
      }

      rangeSelectionMode = value
      return chart
    },

    axisSelectionMode: (value?: AxisSelectionMode) => {
      if (value === undefined) {
        return axisSelectionMode
      }

      axisSelectionMode = value
      return chart
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Getters
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    selectedDatum: () => selectedDatum,
    selectionStartDatum: () => selectionStartDatum,
    selectionEndDatum: () => selectionEndDatum,

    container: () => _container,

    height: () => height,

    width: () => width,

    colorScale: () => colorScale,

    lastSelectedDOMPoint: () => lastSelectedDOMPoint,

    lowerBound: () => lowerBound,

    upperBound: () => upperBound,

    filteredData: () => filteredData,

    content: () => content
  }

  return chart
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
  canvas.width = 1
  canvas.height = n

  const context = canvas.getContext('2d')
  if (context === null) {
    return canvas
  }

  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1))
    context.fillRect(0, n - i, 1, 1)
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
export function verticalColorLegend(
  containerSelection: d3.Selection<Element, SVGGElement, Element, Element>,
  {
    color = d3.scaleSequential(d3.interpolateRdBu).domain([0, 1]),
    title = 'Legend',
    tickSize = 5,
    width = 36 + tickSize,
    height = 100,
    marginTop = 12,
    marginRight = 5,
    marginBottom = 0,
    marginLeft = 15 + tickSize,
    ticks = height / 64,
    tickFormat = null,
    tickValues = null
  } = {}
) {
  let tickAdjust = (g: any) => g.selectAll('.tick line').attr('x1', width - marginLeft - marginRight + tickSize)

  // Continuous color scale
  const n = Math.min(color.domain().length, color.range().length)
  const x: any = color.copy().rangeRound(d3.quantize(d3.interpolate(height - marginBottom, marginTop), n))

  // Construct image of the legend
  containerSelection
    .append('image')
    .attr('x', marginLeft + tickSize)
    .attr('y', marginTop)
    .attr('width', width - marginLeft - marginRight)
    .attr('height', height - marginTop - marginBottom)
    .attr('preserveAspectRatio', 'none')
    .attr('xlink:href', ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL())

  // Add legend title, axis tick marks, and axis labels
  containerSelection
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(
      d3
        .axisLeft(x)
        .ticks(Math.max(ticks, 4), typeof tickFormat === 'string' ? tickFormat : null)
        .tickFormat(typeof tickFormat === 'function' ? tickFormat : null)
        .tickSize(tickSize)
        .tickValues(tickValues)
    )
    .call(tickAdjust)
    .call((g) => g.select('.domain').remove())
    .call((g) =>
      g
        .append('text')
        .attr('x', 0)
        .attr('y', marginTop)
        .attr('fill', '#000000')
        .attr('text-anchor', 'middle')
        .attr('class', 'title')
        .attr('font-size', LABEL_SIZE)
        .attr('transform', `translate(${-(width - marginLeft / 2)}, ${height / 2}) rotate(-90)`)
        .text(title)
    )

  return containerSelection.node()
}
