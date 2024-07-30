/**
 * An object holding parsed values from a simple MaveHGVS-pro string representing a variation at one locus in a protein.
 */
interface SimpleProteinVariation {
  /** The numeric position from a MaveHGVS-pro string. */
  position: number
  /** The substring of a MaveHGVS-pro string representing the wild-type amino acid or stop codon at this position. */
  original: string
  /**
   * The substring of a MaveHGVS-pro string representing the variant's content at this position.
   *
   * This may be a one- or three-letter amino acid code (for substitutions), but it may also be a code representing a
   * change of another sort.
   */
  substitution: string
  /** The genomic target (accession) from a fully qualified MaveHGVS-pro string. */
  target: null | string
}

/**
 * Regular expression for parsing simple MaveHGVS-pro expressions.
 *
 * MaveHGVS doesn't allow single-character codes in substitutions, but for flexibility we allow * and - here. These are
 * properly represented as Ter and del in MaveHGVS.
 */
const proVariantRegex = /^p\.([A-Za-z]{3})([0-9]+)([A-Za-z]{3}|=|\*|-)$/

/**
 * Parse a MaveHGVS protein variant representing a variation at one locus.
 *
 * @param variant A MaveHGVS-pro variant string representing a single variation.
 * @returns An object with properties indicating
 */
export function parseSimpleProVariant(variant: string): SimpleProteinVariation | null {
  const parts = variant.split(":")
  const variation = parts.length == 1 ? parts[0] : parts[1]
  const target = parts.length == 1 ? null : parts[0]
  const match = variation.match(proVariantRegex)
  if (!match) {
    // console.log(`WARNING: Unrecognized pro variant: ${variant}`)
    return null
  }
  return {
    position: parseInt(match[2]),
    original: match[1],
    substitution: match[3],
    target: target
  }
}


/**
 * Checks whether a provided variant is null or na
 *
 * @param variant A MaveHGVS-pro variant string representing a single variation.
 * @returns a boolean indicating whether the variant is NA or null.
 */
export function variantNotNullOrNA(variant: string | null | undefined): boolean {
  return variant ? variant.toLowerCase() !== "na" : false
}
