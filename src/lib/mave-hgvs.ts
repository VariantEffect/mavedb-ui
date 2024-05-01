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
}

/** Regular expression for parsing simple MaveHGVS-pro expressions. */
const proVariantRegex = /^p\.([A-Za-z]{3})([0-9]+)([A-Za-z]{3}|=)$/

/**
 * Parse a MaveHGVS protein variant representing a variation at one locus.
 *
 * @param variant A MaveHGVS-pro variant string representing a single variation.
 * @returns An object with properties indicating
 */
export function parseSimpleProVariant(variant: string): SimpleProteinVariation | null {
  const match = variant.match(proVariantRegex)
  if (!match) {
    // console.log(`WARNING: Unrecognized pro variant: ${variant}`)
    return null
  }
  return {
    position: parseInt(match[2]),
    original: match[1],
    substitution: match[3]
  }
}


  /**
 * Checks whether a provided variant is null or na
 *
 * @param variant A MaveHGVS-pro variant string representing a single variation.
 * @returns a boolean indicating whether the variant is NA or null.
 */
export function variantNotNullOrNA(variant: string | null): boolean {
  return !(variant === null || variant === "na")
}
