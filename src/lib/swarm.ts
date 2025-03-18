import * as d3 from 'd3'
import $ from 'jquery'
import _ from 'lodash'
import Config from '@/config'
import { number } from 'yup'

type FieldGetter<T> = ((d: SwarmDatum) => T) | string
type Getter<T> = () => T
type Accessor<T, Self> = (value?: T) => T | Self

const DEFAULT_EMPHASIS_COLOR = d3.color('#f8971c')!;
const DEFAULT_DATUM_COLOR = d3.color('#3f51b5')!;
const LABEL_SIZE = 10

/**
 * Margins of the swarm content inside the SVG, expressed in screen units (pixels).
 *
 * This should include space for the color scale legend.
 */
export interface SwarmMargins {
    bottom: number
    left: number
    right: number
    top: number
}

export interface SwarmCircle {
    x: number,
    y: number,
    data: SwarmDatum,
    next: SwarmCircle | null
}

export type SwarmSeries = Array<SwarmCircle>


export type SwarmDatum = any

export interface Swarm {
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Methods
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Chart lifecycle methods
    destroy: () => void
    render: (container: HTMLElement) => Swarm
    refresh: () => Swarm
    resize: () => Swarm

    // Selection management
    emphasisValues: (value: Array<any>) => void
    emphasisField: Accessor<FieldGetter<any>, Swarm>

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Accessors
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Data */
    data: Accessor<SwarmDatum[], Swarm>
    radius: Accessor<number, Swarm>

    // Data fields
    valueField: Accessor<FieldGetter<number>, Swarm>
    tooltipHtml: Accessor<((
        datum: SwarmDatum | null,
    ) => string | null) | null, Swarm>

    // Layout
    margins: Accessor<SwarmMargins, Swarm>

    // Labels
    title: Accessor<string | null, Swarm>
    leftAxisLabel: Accessor<string | null, Swarm>
    bottomAxisLabel: Accessor<string | null, Swarm>
    legendNote: Accessor<string | null, Swarm>

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Getters
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Container
    container: Getter<HTMLElement | null>

    // Layout
    width: Getter<number>
    height: Getter<number>
}

export default function makeSwarm(): Swarm {
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Read/write properties
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Data
    let data: SwarmDatum[] = []
    let radius = 2

    // Data fields
    let valueField: FieldGetter<number> = (d) => d as number
    let emphasisField: FieldGetter<any> = (d) => d as any
    let emphasisValues: Array<any> = []
    let tooltipHtml: ((
        datum: SwarmDatum | null,
    ) => string | null) | null = null

    // Layout
    let margins: SwarmMargins = { top: 20, right: 20, bottom: 30, left: 20 }

    // Title
    let title: string | null = null
    let leftAxisLabel: string | null = null
    let bottomAxisLabel: string | null = null
    let legendNote: string | null = null

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Read-only properties
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Container
    let _container: HTMLElement | null = null

    // Layout
    let height: number = 100
    let width: number = 100

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Internal properties
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Data
    let swarm: SwarmSeries = []

    // Hovering
    let hoverSwarm: SwarmCircle | null = null

    // Layout

    /** Margins of the actual historgram itself after leaving space for labels */
    let effectiveMargins: SwarmMargins = { top: 0, right: 0, bottom: 0, left: 0 }

    // D3 selections containing DOM elements
    let svg: d3.Selection<SVGSVGElement, any, any, any> | null = null
    let tooltip: d3.Selection<HTMLDivElement, any, any, any> | null = null

    // Scales
    const xScale = d3.scaleLinear()
    const yScale = d3.scaleLinear()

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Data series & bin preparation
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const prepareData = () => {
        // Filter NaN entries from the data property. We're unable to place such values in the swarm plot.
        const filteredData = data.filter((d) => !isNaN(applyField(d, valueField)))
        swarm = intersections(filteredData, { radius: radius * 2 + 1, x: d => xScale(applyField(d, valueField)) })

    }

    function applyField<T>(d: SwarmDatum, field: FieldGetter<T>) {
        return _.isString(field) ? (_.get(d, field) as T) : (field(d) as T)
    }


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Canvas placement calculations
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const alignTextInRegion = (min: number, max: number, align: string | null) => {
        switch (align) {
            case "left":
                return min
            case "right":
                return max
            default:
                return (min + max) / 2
        }
    }

    const intersections = (data: SwarmDatum, { radius = 1, x = (d: number) => d } = {}) => {
        const radius2 = radius ** 2;
        const circles = data.map(
            (d: number, i: number, data: Array<SwarmDatum>) => ({ ...d, x: +x(d, i, data), index: i })
        ).sort(
            (a: SwarmCircle, b: SwarmCircle) => applyField(a, valueField) - applyField(b, valueField)
        );
        const epsilon = 1e-3;
        let head: SwarmCircle | null = null;
        let tail: SwarmCircle | null = null;

        // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
        function intersects(x: number, y: number) {
            let a = head;
            while (a) {
                if (radius2 - epsilon > (a.x - x) ** 2 + (yScale(a.y) - yScale(y)) ** 2) {
                    return true;
                }
                a = a.next;
            }
            return false;
        }

        // Place each circle sequentially.
        for (const b of circles) {

            // Remove circles from the queue that can’t intersect the new circle b.
            while (head && applyField(head, valueField) < applyField(b, valueField) - radius2) head = head.next;

            // Choose the minimum non-intersecting tangent.
            if (intersects(b.x, b.y = 0)) {
                let a = head;
                b.y = Infinity;
                do {
                    let y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
                    if (y < b.y && !intersects(b.x, y)) b.y = y;
                    a = a.next;
                } while (a);
            }

            // Add b to the queue.
            b.next = null;
            if (head === null) head = tail = b;
            else tail = tail.next = b;
        }

        return circles;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Hovering
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const mouseover = (event: MouseEvent, d: SwarmCircle) => {
        const target = event.target

        hoverSwarm = d
        showHighlight(d)

        if (target instanceof Element) {
            showTooltip()
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

    const mouseleave = (event: MouseEvent, d: SwarmCircle) => {
        if (d == hoverSwarm) {
            hoverSwarm = null
            hideHighlight(d)
        }

        // Hide the tooltip and the highlight.
        if (tooltip) {
            tooltip.html(null)
            tooltip.style('display', 'none')
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Clicking
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const click = function (event: MouseEvent, d: SwarmDatum) {
        if (d && d.scoreSet) {
            const baseUrl = Config.appBaseUrl || '';
            const url = `${baseUrl}/score-sets/${d.scoreSet}`;
            window.open(url, '_blank');
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Tooltip management
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const renderTooltips = () => {
        tooltip = d3.select(document.body)
            .append('div')
            .style('display', 'none')
            .attr('class', 'swarm-tooltip')
            .style('background-color', '#fff')
            .style('border', 'solid')
            .style('border-width', '2px')
            .style('border-radius', '5px')
            .style('color', '#000')
            .style('padding', '5px')
            .style('z-index', 2001)
    }

    const showTooltip = () => {
        if (tooltipHtml) {
            const html = tooltipHtml(hoverSwarm)

            if (html) {
                tooltip.html(html)
                tooltip.style('display', 'block')
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Bin highlighting for selections and hovering
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const stroke = (draw: boolean) => {
        return draw ? '#000' : 'none'
    }

    const strokeWidth = function (draw: boolean) {
        return draw ? 2 : 0;
    }

    const hideHighlight = (d: SwarmDatum) => {
        if (svg) {
            svg.select(`g.swarm-circles`).selectAll(`circle.node-${d.index}`)
                .style('stroke', stroke(false))
                .style('stroke-width', strokeWidth(false))
        }
    }

    const showHighlight = (d: SwarmDatum) => {
        if (svg) {
            svg.select(`g.swarm-circles`).selectAll(`circle.node-${d.index}`)
                .style('stroke', stroke(true))
                .style('stroke-width', strokeWidth(true))

        }
    }

    const chart: Swarm = {
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
            data = []
            swarm = []
        },

        render: (container: HTMLElement) => {
            _container = container

            if (_container) {
                svg = d3.select(_container)
                    .html(null)
                    .append('svg')
                svg.append('defs')
                const mainGroup = svg.append('g')
                    .attr('class', 'swarm-main')
                    .attr('transform', `translate(${margins.left},${margins.top})`)
                mainGroup.append('g')
                    .attr('class', 'swarm-circles')
                mainGroup.append('g')
                    .attr('class', 'swarm-left-axis')
                mainGroup.append('g')
                    .attr('class', 'swarm-bottom-axis')
                mainGroup.append('g')
                    .attr('class', 'swarm-legend-background')
                mainGroup.append('g')
                    .attr('class', 'swarm-legend')
                mainGroup.append('g')
                    .attr('class', 'swarm-hovers')
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

                // Calculate space required for y axis and label for the largest y value of swarm circles. We will need to
                // re-scale the y-axis for displaying smaller numbers but this will give us enough space for the y-axis at maximum
                // axis width (i.e. with the longest numbers in the counts.
                //
                // Also leave 5% breathing room at the top of the chart.
                const yMax = (d3.max(swarm, (s) => s.y) || 0) * 1.10

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
                svg.select('g.swarm-main')
                    .attr('transform', `translate(${effectiveMargins.left}, ${effectiveMargins.top})`)

                // Set the X scale to the size of the data.
                xScale.domain(d3.extent(swarm, (s) => applyField(s, valueField)) as [number, number]).range([0, width]).nice()

                // Refresh the axes.
                svg.select('g.swarm-bottom-axis')
                    .attr('transform', `translate(0,${height})`)
                    // @ts-ignore
                    .call(d3.axisBottom(xScale).ticks(10))
                svg.select('g.swarm-left-axis')
                    // @ts-ignore
                    .call(d3.axisLeft(yScale).ticks(10))

                // Refresh the chart title.
                svg.select('g.swarm-main')
                    .selectAll('text.swarm-title')
                    .data(title ? [title] : [], (d) => d as any)
                    .join('text')
                    .attr('class', 'swarm-title')
                    .attr('x', width / 2)
                    .attr('y', 4)
                    .style('text-anchor', 'middle')
                    .text((d) => d)

                // Refresh the axis labels.
                svg.select('g.swarm-main')
                    .selectAll('text.swarm-bottom-axis-label')
                    .data(bottomAxisLabel ? [bottomAxisLabel] : [], (d) => d as any)
                    .join('text')
                    .attr('class', 'swarm-axis-label swarm-bottom-axis-label')
                    .attr('font-size', LABEL_SIZE)
                    .attr('x', width / 2)
                    .attr('y', height + 25)
                    .style('text-anchor', 'middle')
                    .text((d) => d)
                svg.select('g.swarm-main')
                    .selectAll('text.swarm-left-axis-label')
                    .data(leftAxisLabel ? [leftAxisLabel] : [], (d) => d as any)
                    .join('text')
                    .attr('class', 'swarm-axis-label swarm-left-axis-label')
                    .attr('font-size', LABEL_SIZE)
                    .attr('transform', `translate(${-(yAxisWidthWithLabel - LABEL_SIZE / 2)}, ${height / 2}) rotate(-90)`)
                    .style('text-anchor', 'middle')
                    .text((d) => d)

                // // Refresh the legend, which is displayed when there is more than one serie.
                // const legendX = 32
                // const legendY = 12
                // const legendItemHeight = 22
                // const legendFontSize = '13px'
                // const legendCircleWidth = 7
                // const legendSpacing = 5
                // const legend = svg.select('g.swarm-legend')
                // const legendItem = legend.selectAll('g.swarm-legend-item')
                //   .data(chartHasContent && series.length > 1 ? series : [])
                //   .join(
                //     (enter) => {
                //       const g = enter.append('g')
                //         .attr('class', 'swarm-legend-item')
                //       g.append('circle')
                //         .attr('r', legendCircleWidth)
                //         .attr('cx', legendX)
                //       //.attr('cy', (d, i) => legendY + i * legendItemHeight)
                //       //.style('fill', (d) => d.options.color)
                //       g.append('text')
                //         .attr('x', legendX + legendCircleWidth + legendSpacing)
                //         .attr('y', (_d: SwarmSerie, i) => legendY + i * legendItemHeight + legendSpacing)
                //         .style('font-size', legendFontSize)
                //       //.text((d, i) => d.options.title || `Series ${i + 1}`)
                //       return g
                //     },
                //     (update) => update,
                //     (exit) => exit.remove()
                //   )
                // legendItem.select('circle')
                //   // @ts-ignore
                //   .attr('cy', (_d: SwarmSerie, i) => legendY + i * legendItemHeight)
                //   // @ts-ignore
                //   .style('fill', (d: SwarmSerie) => d.options.color)
                // legendItem.select('text')
                //   // @ts-ignore
                //   .text((d: SwarmSerie, i) => d.options.title || `Series ${i + 1}`)

                // // The client may have specified a line of text to display below the legend.
                // legend.selectAll('text.swarm-legend-note')
                //   .data(chartHasContent && legendNote ? [legendNote] : [])
                //   .join('text')
                //   .attr('class', 'swarm-legend-note')
                //   .attr('font-size', legendFontSize)
                //   .attr('x', legendX - legendCircleWidth)
                //   .attr('y', legendY + (series.length == 1 ? 0 : series.length) * legendItemHeight + legendSpacing - 1)
                //   .text((d) => d)

                // // Add a background for the legend, for visibility.
                // const legendBounds = (legend.node() as SVGGraphicsElement | null)?.getBBox()
                // svg.select('g.swarm-legend-background')
                //   .selectAll('rect.swarm-legend-background')
                //   .data(legendBounds ? [legendBounds] : [])
                //   .join('rect')
                //   .attr('class', 'swarm-legend-background')
                //   .attr('fill', '#ffffff')
                //   .attr('fill-opacity', '.6')
                //   .attr('y', (d) => d.x - 5 - margins.top)
                //   .attr('x', (d) => d.x - 5)
                //   .attr('height', (d) => d.height + 10)
                //   .attr('width', (d) => d.width + 10)

                svg.selectAll('text.swarm-no-data-message')
                    .data(chartHasContent ? [] : ['No data'])
                    .join('text')
                    .attr('class', 'swarm-no-data-message')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .style('text-anchor', 'middle')
                    .text((d) => d)

                const transformedData = intersections(swarm, { radius: radius * 2 + 2, x: d => xScale(d.x) })
                const chartedSwarm = svg.select('g.swarm-circles').selectAll('circle').data(transformedData, (d) => d)
                chartedSwarm.exit().remove()
                chartedSwarm.enter()
                    .append('circle')
                    .attr('class', d => `node-${d.index}`)
                    .attr('cx', (d) => d.x)
                    .attr("cy", (d) => height - d.y - radius)
                    .attr("r", `${radius}px`)
                    .on('mouseover', mouseover)
                    .on('mousemove', mousemove)
                    .on('mouseleave', mouseleave)
                    .on('click', click)
                    .style("fill", (d) => emphasisValues.includes(applyField(d, emphasisField)) ? DEFAULT_EMPHASIS_COLOR : DEFAULT_DATUM_COLOR)
            }

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

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Accessors
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        data: (value?: SwarmDatum[]) => {
            if (value === undefined) {
                return data
            }
            data = value
            return chart
        },

        valueField: (value?: FieldGetter<number>) => {
            if (value === undefined) {
                return valueField
            }
            valueField = value
            return chart
        },

        emphasisField: (value?: FieldGetter<any>) => {
            if (value === undefined) {
                return emphasisField
            }
            emphasisField = value
            return chart
        },

        tooltipHtml: (value?: ((
            datum: SwarmDatum | null
        ) => string | null) | null) => {
            if (value === undefined) {
                return tooltipHtml
            }
            tooltipHtml = value
            return chart
        },

        margins: (value?: SwarmMargins) => {
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

        radius: (value?: number) => {
            if (value === undefined) {
                return radius
            }
            radius = value
            return chart
        },

        emphasisValues: (value: Array<any>) => {
            if (value === undefined) {
                return emphasisValues
            }
            emphasisValues = value
            return chart
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Getters
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        container: () => _container,

        height: () => height,

        width: () => width
    }

    return chart
}
