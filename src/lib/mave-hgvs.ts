/**
 * An object holding parsed values from a simple MaveHGVS-pro string representing a variation at one locus in a protein.
 */
interface SimpleMaveVariant {
  /** The MaveDB Accession for a variant. */
  accession: string
  /** The nucleotide HGVS string. */
  hgvs_nt: string
  /** The protein HGVS string. */
  hgvs_pro: string
  /** The splice HGVS string. */
  hgvs_splice: string
}

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

type VariantLabel = {
  mavedb_label: string
}

/**
 * Regular expression for parsing simple MaveHGVS-pro and -nt expressions.
 *
 * MaveHGVS doesn't allow single-character codes in substitutions, but for flexibility we allow * and - here. These are
 * properly represented as Ter and del in MaveHGVS.
 */
const proVariantRegex = /^p\.([A-Za-z]{3})([0-9]+)([A-Za-z]{3}|=|\*|-)$/
const ntVariantRegex = /^c|g|n\.([0-9]+)([ACGTacgt]{1})(>)([ACGTactg]{1})$/

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
 * Parse a MaveHGVS nucleotide variant representing a variation at one locus.
 *
 * @param variant A MaveHGVS-nt variant string representing a single variation.
 * @returns An object with properties indicating
 */
export function parseSimpleNtVariant(variant: string): SimpleProteinVariation | null {
  const parts = variant.split(":")
  const variation = parts.length == 1 ? parts[0] : parts[1]
  const target = parts.length == 1 ? null : parts[0]
  const match = variation.match(ntVariantRegex)
  if (!match) {
    // console.log(`WARNING: Unrecognized pro variant: ${variant}`)
    return null
  }
  return {
    position: parseInt(match[1]),
    original: match[2],
    substitution: match[4],
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


/**
 * Return the preferred variant label for a given variant. Protein variation is preferred
 * to nucleotide variation, which is preferred to splice variation.
 *
 * hgvs_pro > hgvs_nt > hgvs_splice
 *
 * @param variant An object representing a simple MaveDB variant.
 * @returns the label of the preferred variant, or just the accession if none are valid.
 */
export function preferredVariantLabel(variant: SimpleMaveVariant): VariantLabel {
  if (variantNotNullOrNA(variant.hgvs_pro)) {
    return {mavedb_label: variant.hgvs_pro}
  } else if (variantNotNullOrNA(variant.hgvs_nt)) {
    return {mavedb_label: variant.hgvs_nt}
  } else if (variantNotNullOrNA(variant.hgvs_splice)) {
    return {mavedb_label: variant.hgvs_splice}
  } else {
    return {mavedb_label: variant.accession}
  }
}
