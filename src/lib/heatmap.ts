import {AMINO_ACIDS, AMINO_ACIDS_BY_HYDROPHILIA} from './amino-acids.js'

/** Codes used in the right part of a MaveHGVS-pro string representing a single variation in a protein sequence. */
const MAVE_HGVS_PRO_CHANGE_CODES = [
  {codes: {single: '='}}, // Synonymous AA variant
  {codes: {single: '*', triple: 'TER'}}, // Stop codon
  {codes: {single: '-', triple: 'DEL'}} // Deletion
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
  {code: '=', label: '=', cssClass: 'mave-heatmap-y-axis-tick-label-lg'},
  {code: '*', label: '\uff0a'},
  {code: '-', label: '-', cssClass: 'mave-heatmap-y-axis-tick-label-lg'},
  ...AMINO_ACIDS_BY_HYDROPHILIA.map((aaCode) => ({code: aaCode, label: aaCode}))
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
