import * as d3 from 'd3'

const DEFAULT_LINE_COLOR = d3.color('#f8971c')!
const DEFAULT_DATUM_COLOR = d3.color('#f8971c')!
const DEFAULT_BAR_COLOR = d3.color('#3f51b5')!

export type BarLineChartDatum = any
type Accessor<T, Self> = (value?: T) => T | Self

export interface BarLineChartMargins {
  bottom: number
  left: number
  right: number
  top: number
}

export interface BarLineChart {
  // Methods
  destroy: () => void
  render: (container: HTMLElement) => BarLineChart
  refresh: () => BarLineChart
  resize: () => BarLineChart
  barTooltipHtml: Accessor<((datum: BarLineChartDatum | null) => string | null) | null, BarLineChart>
  lineTooltipHtml: Accessor<((datum: BarLineChartDatum | null) => string | null) | null, BarLineChart>
  datumSorter: Accessor<((datumA: BarLineChartDatum, datumB: BarLineChartDatum) => number) | null, BarLineChart>

  // Accessors
  data: Accessor<BarLineChartDatum[], BarLineChart>
  margins: Accessor<BarLineChartMargins, BarLineChart>
  width: Accessor<number, BarLineChart>
  height: Accessor<number, BarLineChart>
  aggregateData: Accessor<boolean, BarLineChart>
  datumRadius: Accessor<number, BarLineChart>
  lineColor: Accessor<d3.Color, BarLineChart>
  barColor: Accessor<d3.Color, BarLineChart>
  datumColor: Accessor<d3.Color, BarLineChart>
  xAxisLabel: Accessor<string | null, BarLineChart>
  y1AxisLabel: Accessor<string | null, BarLineChart>
  y2AxisLabel: Accessor<string | null, BarLineChart>
  lineLegendLabel: Accessor<string | null, BarLineChart>
  barLegendLabel: Accessor<string | null, BarLineChart>
}

export default function makeBarLineChart(): BarLineChart {
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Setup
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Read/write properties
  let data: BarLineChartDatum[] = []
  let margins: BarLineChartMargins = {top: 20, right: 20, bottom: 30, left: 50}
  let width: number = 800
  let height: number = 400
  let datumRadius: number = 5
  let aggregateData: boolean = false
  let lineColor: d3.Color = DEFAULT_LINE_COLOR
  let barColor: d3.Color = DEFAULT_BAR_COLOR
  let datumColor: d3.Color = DEFAULT_DATUM_COLOR
  let xAxisLabel: string | null = null
  let y1AxisLabel: string | null = null
  let y2AxisLabel: string | null = null
  let lineLegendLabel: string | null = null
  let barLegendLabel: string | null = null

  // Configurable methods
  let barTooltipHtml: ((datum: BarLineChartDatum | null) => string | null) | null = null
  let lineTooltipHtml: ((datum: BarLineChartDatum | null) => string | null) | null = null
  let datumSorter: ((datumA: BarLineChartDatum, datumB: BarLineChartDatum) => number) | null = null

  // Read-only properties
  let _container: HTMLElement | null = null
  let _hoverDatum: BarLineChartDatum | null = null
  let _hoverTooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null

  // D3 selections containing DOM elements
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

  // Scales
  const xScale = d3.scaleTime()
  const yScale1 = d3.scaleLinear()
  const yScale2 = d3.scaleLinear()

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Datum Preparation
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const line = d3
    .line<BarLineChartDatum>()
    .x((d) => xScale(d.x))
    .y((d) => (aggregateData ? yScale2(d.aggregateY2) : yScale2(d.y2)))

  const prepareData = () => {
    data.sort((a, b) => (datumSorter ? datumSorter(a, b) : 0))

    let runningTotalY1 = 0
    let runningTotalY2 = 0
    data.forEach((d, i) => {
      d.index = i

      if (aggregateData) {
        runningTotalY1 += d.y1
        runningTotalY2 += d.y2
        d.aggregateY1 = runningTotalY1
        d.aggregateY2 = runningTotalY2
      }
    })
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Hovering
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const mouseover = (event: MouseEvent, d: BarLineChartDatum) => {
    const target = event.target as Element
    refreshHoverDatum(d, target.nodeName)

    if (target instanceof Element) {
      showTooltip(_hoverTooltip, _hoverDatum, target.nodeName)
    }
  }

  const mousemove = (event: MouseEvent) => {
    if (_hoverTooltip) {
      // Move tooltip to be 30px to the right of the pointer.
      _hoverTooltip
        .style('left', d3.pointer(event, document.body)[0] + 30 + 'px')
        .style('top', d3.pointer(event, document.body)[1] + 'px')
    }
  }

  const mouseleave = (event: MouseEvent, d: BarLineChartDatum) => {
    const target = event.target as Element
    refreshHoverDatum(null, target.nodeName)

    // Hide the tooltip and the highlight.
    hideTooltip(_hoverTooltip)
    hideHighlight(d, target.nodeName)
  }

  const refreshHoverDatum = function (d: BarLineChartDatum | null, nodeName: string) {
    _hoverDatum = d
    if (_hoverDatum) {
      showHighlight(_hoverDatum, nodeName)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Tooltip management
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const renderTooltips = () => {
    _hoverTooltip = d3
      .select(document.body)
      .append('div')
      .style('display', 'none')
      .attr('class', 'bar-line-tooltip')
      .style('background-color', '#fff')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('color', '#000')
      .style('padding', '5px')
      .style('z-index', 2001)
  }

  const showTooltip = (
    tooltip: d3.Selection<HTMLDivElement, any, any, any> | null,
    datum: BarLineChartDatum | null,
    nodeName: string | null
  ) => {
    if (datum) {
      let html = null
      if (nodeName === 'rect' && barTooltipHtml) {
        html = barTooltipHtml(datum)
      } else if (nodeName === 'circle' && lineTooltipHtml) {
        html = lineTooltipHtml(datum)
      }

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

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Bin highlighting for selections and hovering
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const stroke = (draw: boolean) => {
    return draw ? '#000' : 'none'
  }

  const strokeWidth = function (draw: boolean) {
    return draw ? 2 : 0
  }

  const hideHighlight = (d: BarLineChartDatum, nodeName: string) => {
    if (svg) {
      svg
        .select(`g.${nodeName}s`)
        .selectAll(`${nodeName}.node-${d.index}`)
        .style('stroke', stroke(false))
        .style('stroke-width', strokeWidth(false))
    }
  }

  const showHighlight = (d: BarLineChartDatum, nodeName: string) => {
    if (svg) {
      svg
        .select(`g.${nodeName}s`)
        .selectAll(`${nodeName}.node-${d.index}`)
        .style('stroke', stroke(true))
        .style('stroke-width', strokeWidth(true))
    }
  }

  const chart: BarLineChart = {
    destroy: () => {
      if (svg) {
        svg.remove()
        svg = null
      }
      data = []
      data = []
    },

    render: (container: HTMLElement) => {
      _container = container

      if (_container) {
        svg = d3.select(_container).html(null).append('svg')

        if (svg) {
          svg
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${margins.left},${margins.top})`)

          svg.append('g').attr('class', 'x-axis')

          svg.append('g').attr('class', 'y-axis1')

          svg.append('g').attr('class', 'y-axis2')

          if (lineLegendLabel || barLegendLabel) {
            const legend = svg
              .append('g')
              .attr('class', 'legend')
              .attr('transform', `translate(${margins.left + 10}, ${margins.top})`)

            if (lineLegendLabel) {
              legend
                .append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 10)
                .attr('height', 10)
                .style('fill', lineColor.toString())

              legend
                .append('text')
                .attr('x', 15)
                .attr('y', 10)
                .text(lineLegendLabel)
                .style('font-size', '12px')
                .attr('alignment-baseline', 'start')
            }

            if (barLegendLabel) {
              legend
                .append('rect')
                .attr('x', 0)
                .attr('y', 20)
                .attr('width', 10)
                .attr('height', 10)
                .style('fill', barColor.toString())

              legend
                .append('text')
                .attr('x', 15)
                .attr('y', 30)
                .text(barLegendLabel)
                .style('font-size', '12px')
                .attr('alignment-baseline', 'start')
            }
          }

          if (xAxisLabel) {
            svg
              .append('text')
              .attr('class', 'x-axis-label')
              .attr('text-anchor', 'middle')
              .attr('x', width / 2)
              .attr('y', height + margins.bottom - 10)
              .text(xAxisLabel)
          }

          if (y1AxisLabel) {
            svg
              .append('text')
              .attr('class', 'y1-axis-label')
              .attr('text-anchor', 'middle')
              .attr('transform', 'rotate(-90)')
              .attr('font-size', '12px')
              .text(y1AxisLabel)
          }

          if (y2AxisLabel) {
            svg
              .append('text')
              .attr('class', 'y2-axis-label')
              .attr('text-anchor', 'middle')
              .attr('transform', 'rotate(-90)')
              .attr('font-size', '12px')
              .text(y2AxisLabel)
          }

          svg.append('path').attr('class', 'line')

          svg.append('g').attr('class', 'rects')

          svg.append('g').attr('class', 'circles')
        }

        chart.refresh()
      }

      return chart
    },

    refresh: () => {
      if (_container && svg) {
        chart.resize()
        prepareData()

        // On year based scales, a time extent without this additional padding will often be shoved
        // up against our axes, making the chart look cramped. `.nice()` works poorly for such data,
        // since years are already considered 'nice' by D3. Adding a padding of one time step to each
        // extent is a rough workaround.
        const timeExtent = d3.extent(data, (d) => d.x) as [unknown, unknown] as [Date, Date]
        if (timeExtent[0] && timeExtent[1]) {
          const timePadding = (timeExtent[1].getTime() - timeExtent[0].getTime()) / data.length
          timeExtent[0] = new Date(timeExtent[0].getTime() - timePadding)
          timeExtent[1] = new Date(timeExtent[1].getTime() + timePadding)
        }
        xScale
          .domain(timeExtent)
          .range([margins.left, width - margins.right - margins.left])
          .nice()

        yScale1
          .domain([0, d3.max(data, (d) => (aggregateData ? d.aggregateY1 : d.y1)) as number])
          .range([height - margins.bottom, margins.top])

        yScale2
          .domain([0, d3.max(data, (d) => (aggregateData ? d.aggregateY2 : d.y2)) as number])
          .range([height - margins.bottom, margins.top])

        svg
          .select('.x-axis')
          .attr('transform', `translate(0,${height - margins.bottom})`)
          .call(d3.axisBottom(xScale).ticks(10, d3.timeFormat('%B, %Y')).tickSizeInner(8) as any)
          .selectAll('text')
          .style('text-anchor', 'center')

        svg
          .select('.y-axis1')
          .attr('transform', `translate(${margins.left},0)`)
          .call(d3.axisLeft(yScale1).ticks(12).tickSizeOuter(0) as any)

        svg
          .select('.y-axis2')
          .attr('transform', `translate(${width - margins.right - margins.left},0)`)
          .call(d3.axisRight(yScale2).ticks(12).tickSizeOuter(0) as any)

        if (xAxisLabel) {
          svg
            .select('.x-axis-label')
            .attr('x', width / 2)
            .attr('y', height + margins.bottom - 10)
            .text(xAxisLabel)
        }

        if (y1AxisLabel) {
          svg
            .select('.y1-axis-label')
            .attr('x', -height / 2)
            .attr('y', 0 + margins.left * 0.25)
            .text(y1AxisLabel)
        }

        if (y2AxisLabel) {
          svg
            .select('.y2-axis-label')
            .attr('x', -height / 2)
            .attr('y', width - margins.right * 0.1)
            .text(y2AxisLabel)
        }

        svg
          .select('.line')
          .datum(data)
          .attr('d', line(data))
          .attr('fill', 'none')
          .attr('stroke', lineColor.toString())
          .attr('stroke-width', 1.5)

        const barWidth = (xScale.range()[1] - xScale.range()[0]) / (data.length * 2)
        svg.select('g.rects').selectAll('rect').remove()
        svg
          .select('g.rects')
          .selectAll('rect')
          .data(data, (d: BarLineChartDatum) => d.index)
          .enter()
          .append('rect')
          .attr('class', (d) => `node-${d.index}`)
          .style('cursor', 'pointer')
          .style('opacity', 0.8)
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseleave', mouseleave)
          .attr('x', (d) => xScale(d.x) - barWidth / 2)
          .attr('y', (d) => (aggregateData ? yScale1(d.aggregateY1) : yScale1(d.y1)))
          .attr('width', barWidth)
          .attr('height', (d) =>
            d ? height - margins.bottom - (aggregateData ? yScale1(d.aggregateY1) : yScale1(d.y1)) : 0
          )
          .style('fill', barColor.toString())

        svg.select('g.circles').selectAll('circle').remove()
        svg
          .select('g.circles')
          .selectAll('circle')
          .data(data, (d: BarLineChartDatum) => d.index)
          .enter()
          .append('circle')
          .attr('class', (d) => `node-${d.index}`)
          .style('cursor', 'pointer')
          .style('opacity', 0.8)
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseleave', mouseleave)
          .attr('cx', (d) => `${xScale(d.x)}px`)
          .attr('cy', (d) => `${aggregateData ? yScale2(d.aggregateY2) : yScale2(d.y2)}px`)
          .style('fill', datumColor.toString())
          .style('r', `${datumRadius}px`)

        renderTooltips()
      }

      return chart
    },

    resize: () => {
      if (_container && svg) {
        const containerWidth = _container.clientWidth
        const containerHeight = _container.clientHeight

        width = containerWidth
        height = containerHeight

        svg.attr('width', containerWidth).attr('height', containerHeight)
      }

      return chart
    },

    data: (value?: BarLineChartDatum[]) => {
      if (value === undefined) {
        return data
      }
      data = value
      return chart
    },

    barTooltipHtml: (value?: ((datum: BarLineChartDatum | null) => string | null) | null) => {
      if (value === undefined) {
        return barTooltipHtml
      }
      barTooltipHtml = value
      return chart
    },

    lineTooltipHtml: (value?: ((datum: BarLineChartDatum | null) => string | null) | null) => {
      if (value === undefined) {
        return lineTooltipHtml
      }
      lineTooltipHtml = value
      return chart
    },

    datumSorter: (value?: ((datumA: BarLineChartDatum, datumB: BarLineChartDatum) => number) | null) => {
      if (value === undefined) {
        return datumSorter
      }
      datumSorter = value
      return chart
    },

    margins: (value?: BarLineChartMargins) => {
      if (value === undefined) {
        return margins
      }
      margins = value
      return chart
    },

    width: (value?: number) => {
      if (value === undefined) {
        return width
      }
      width = value
      return chart
    },

    height: (value?: number) => {
      if (value === undefined) {
        return height
      }
      height = value
      return chart
    },

    aggregateData: (value?: boolean) => {
      if (value === undefined) {
        return aggregateData
      }
      aggregateData = value
      return chart
    },

    lineColor: (value?: d3.Color) => {
      if (value === undefined) {
        return lineColor
      }
      lineColor = value
      return chart
    },

    barColor: (value?: d3.Color) => {
      if (value === undefined) {
        return lineColor
      }
      barColor = value
      return chart
    },

    datumColor: (value?: d3.Color) => {
      if (value === undefined) {
        return datumColor
      }
      datumColor = value
      return chart
    },

    datumRadius: (value?: number) => {
      if (value === undefined) {
        return datumRadius
      }
      datumRadius = value
      return chart
    },
    xAxisLabel: (value?: string | null) => {
      if (value === undefined) {
        return xAxisLabel
      }
      xAxisLabel = value
      return chart
    },
    y1AxisLabel: (value?: string | null) => {
      if (value === undefined) {
        return y1AxisLabel
      }
      y1AxisLabel = value
      return chart
    },
    y2AxisLabel: (value?: string | null) => {
      if (value === undefined) {
        return y2AxisLabel
      }
      y2AxisLabel = value
      return chart
    },
    lineLegendLabel: (value?: string | null) => {
      if (value === undefined) {
        return lineLegendLabel
      }
      lineLegendLabel = value
      return chart
    },
    barLegendLabel: (value?: string | null) => {
      if (value === undefined) {
        return barLegendLabel
      }
      barLegendLabel = value
      return chart
    }
  }

  return chart
}
