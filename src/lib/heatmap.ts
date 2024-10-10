import * as d3 from 'd3'
import { AMINO_ACIDS, AMINO_ACIDS_BY_HYDROPHILIA } from './amino-acids.js'

/** Codes used in the right part of a MaveHGVS-pro string representing a single variation in a protein sequence. */
const MAVE_HGVS_PRO_CHANGE_CODES = [
  { codes: { single: '=' } }, // Synonymous AA variant
  { codes: { single: '*', triple: 'TER' } }, // Stop codon
  { codes: { single: '-', triple: 'DEL' } } // Deletion
]

interface HeatmapRowSpecification {
  /** A single-character amino acid code or single-character code from MAVE_HGVS_PRO_CHANGE_CODES. */
  code: string
  /** The tick mark label text to display for this change, which is usually the same as the code. */
  label: string
  /** An optional CSS class name to apply to the row's tick mark label. */
  cssClass?: string
}

/** List of single-character codes for the heatmap's rows, from bottom to top. */
export const HEATMAP_ROWS: HeatmapRowSpecification[] = [
  { code: '=', label: '=', cssClass: 'mave-heatmap-y-axis-tick-label-lg' },
  { code: '*', label: '\uff0a' },
  { code: '-', label: '-', cssClass: 'mave-heatmap-y-axis-tick-label-lg' },
  ...AMINO_ACIDS_BY_HYDROPHILIA.map((aaCode) => ({ code: aaCode, label: aaCode }))
]

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
export function heatmapRowForVariant(aaCodeOrChange: string): number | null {
  const singleLetterCode = singleLetterAminoAcidOrHgvsCode(aaCodeOrChange)
  const ranking = singleLetterCode ? HEATMAP_ROWS.findIndex((rowSpec) => rowSpec.code == singleLetterCode) : null
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
  tickSize = 6,
  width = 36 + tickSize,
  height = 100,
  marginTop = 12,
  marginRight = 10,
  marginBottom = 0,
  marginLeft = 10 + tickSize,
  ticks = height / 64,
  tickFormat = null,
  tickValues = null,
} = {}) {
  let tickAdjust = (g: any) => g.selectAll(".tick line").attr("x1", width - marginLeft - marginRight);

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
    .attr("transform", `translate(${width - marginLeft},0)`)
    .call(d3.axisLeft(x)
      .ticks(ticks, typeof tickFormat === "string" ? tickFormat : null)
      .tickFormat(typeof tickFormat === "function" ? tickFormat : null)
      .tickSize(tickSize)
      .tickValues(tickValues))
    .call(tickAdjust)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.append("text")
      .attr("x", marginLeft)
      .attr("y", marginTop - 5) // draw the title 5px above the color bar
      .attr("fill", "#000000")
      .attr("text-anchor", "end")
      .attr("font-weight", "bold")
      .attr("class", "title")
      .text(title));

  return containerSelection.node();
}
