import _ from 'lodash'

import {AMINO_ACIDS, AMINO_ACIDS_WITH_TER, singleLetterAminoAcidOrHgvsCode} from '@/lib/amino-acids'
import {DEFAULT_CLNREVSTAT_FIELD, DEFAULT_CLNSIG_FIELD} from '@/lib/clinical-controls'
import geneticCodes from '@/lib/genetic-codes'
import {parseSimpleNtVariant, parseSimpleProVariant} from '@/lib/mave-hgvs'
import type {SimpleDnaVariation, SimpleProteinVariation} from '@/lib/mave-hgvs'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

export type HgvsReferenceSequenceType = 'c' | 'p' // | 'n'

export interface SequenceRange {
  start: number
  length: number
}

export interface ClinicalControlVariant {
  [DEFAULT_CLNSIG_FIELD]: string
  [DEFAULT_CLNREVSTAT_FIELD]: string
}

export interface RawVariant {
  accession: string
  score?: number
  control?: ClinicalControlVariant
  hgvs_nt?: string
  hgvs_pro?: string
  hgvs_splice?: string
  post_mapped_hgvs_c?: string
  post_mapped_hgvs_p?: string
  mavedb_label?: string
}

export interface VariantPropertiesAddedByPreparingCodingVariants {
  // Added by prepareSimpleCodingVariants.
  parsedPostMappedHgvsC?: SimpleDnaVariation
  parsedPostMappedHgvsP?: SimpleProteinVariation
}

export interface Variant extends RawVariant, VariantPropertiesAddedByPreparingCodingVariants {
  // Added by translateSimpleCodingVariants
  translated_hgvs_p?: string
}

export const HGVS_REFERENCE_SEQUENCE_TYPES: {
  [type: HgvsReferenceSequenceType]: {parsedPostMappedHgvsField: keyof VariantPropertiesAddedByPreparingCodingVariants}
} = {
  c: {
    parsedPostMappedHgvsField: 'parsedPostMappedHgvsC'
  },
  p: {
    parsedPostMappedHgvsField: 'parsedPostMappedHgvsP'
  }
}

export interface ParsedPostMappedVariantProperties {
  [type: string]: keyof VariantPropertiesAddedByPreparingCodingVariants
}

export const VARIANT_EFFECT_TYPE_OPTIONS = [
  {
    name: 'Synonymous',
    description: 'Show all synonymous variants',
    shortDescription: 'Synonymous variants'
  },
  {
    name: 'Missense',
    description: 'Show all missense variants',
    shortDescription: 'Missense variants'
  },
  {
    name: 'Nonsense',
    description: 'Show all nonsense variants',
    shortDescription: 'Nonsense variants'
  },
  {
    name: 'Start/Stop Loss',
    description: 'Show all start/stop loss variants',
    shortDescription: 'Start/Stop Loss variants'
  },
  {
    name: 'Other',
    description: 'Show all other variant types',
    shortDescription: 'Others'
  }
]

export const DEFAULT_VARIANT_EFFECT_TYPES = ['Missense', 'Nonsense', 'Synonymous', 'Other']

export const PARSED_POST_MAPPED_VARIANT_PROPERTIES: ParsedPostMappedVariantProperties = {
  c: 'parsedPostMappedHgvsC',
  g: 'parsedPostMappedHgvsC',
  p: 'parsedPostMappedHgvsP'
}

function getParsedPostMappedHgvs(variant: Variant, type: HgvsReferenceSequenceType) {
  const field = PARSED_POST_MAPPED_VARIANT_PROPERTIES[type]
  return field ? variant[field] : undefined
}

/**
 * Add parsed post-mapped HGVS c. and p. strings to variants wherever possible.
 *
 * When a mapped c. or p. string is not present but unmapped c. or p. strings are present and have references, use them
 * instead. This is a temporary measure until we have more thorough access to mapped c. and p. strings.
 *
 * Notice that this function alters members of the variants array by adding parsedPostMappedHgvsC and
 * parsedPostMappedHgvsP properties.
 *
 * @param variants The variants to modify.
 */
export function parseSimpleCodingVariants(variants: Variant[]) {
  for (const v of variants) {
    if (v.post_mapped_hgvs_c && v.post_mapped_hgvs_c != 'NA') {
      const parsedHgvs = parseSimpleNtVariant(v.post_mapped_hgvs_c)
      if (parsedHgvs && parsedHgvs.referenceType == 'c') {
        v.parsedPostMappedHgvsC = parsedHgvs
        v.parsedPostMappedHgvsC.residueType = 'nt'
        v.parsedPostMappedHgvsC.origin = 'mapped'
      }
    } else if (v.hgvs_nt && v.hgvs_nt != 'NA') {
      // If a mapped HGVS c. string is missing but the raw HGVS string is a c. string with reference, us it instead.
      const parsedHgvs = parseSimpleNtVariant(v.hgvs_nt)
      // Treat g. and n. the same as c. for now, and allow there to be no accession.
      if (parsedHgvs && ['c', 'g', 'n'].includes(parsedHgvs.referenceType)) {
        //} && parsedHgvs.target) {
        v.post_mapped_hgvs_c = v.hgvs_nt
        v.parsedPostMappedHgvsC = parsedHgvs
        v.parsedPostMappedHgvsC.residueType = 'nt'
        v.parsedPostMappedHgvsC.origin = 'unmapped'
      }
    }

    if (v.post_mapped_hgvs_p && v.post_mapped_hgvs_p != 'NA') {
      const parsedHgvs = parseSimpleProVariant(v.post_mapped_hgvs_p)
      if (parsedHgvs) {
        v.parsedPostMappedHgvsP = parsedHgvs
        v.parsedPostMappedHgvsP.residueType = 'aa'
        v.parsedPostMappedHgvsP.origin = 'mapped'
      }
    } else if (v.hgvs_pro && v.hgvs_pro != 'NA') {
      const parsedHgvs = parseSimpleProVariant(v.hgvs_pro)
      // Allow there to be no accession.
      if (parsedHgvs) {
        v.post_mapped_hgvs_p = v.hgvs_pro
        v.parsedPostMappedHgvsP = parsedHgvs
        v.parsedPostMappedHgvsP.residueType = 'aa'
        v.parsedPostMappedHgvsP.origin = 'unmapped'
      }
    }
  }
}

export function filterVariantsForTargetInference(variants: any[]) {
  // Use p. variants unless there are c. variants that don't have p. strings.
  let referenceType: HgvsReferenceSequenceType = 'p'
  if (variants.some((v) => !v.parsedPostMappedHgvsP && v.parsedPostMappedHgvsC)) {
    referenceType = 'c'
  }

  // Filter on variants with the chosen HGVS string type.
  return {
    referenceType,
    variants: variants.filter((v) => getParsedPostMappedHgvs(v, referenceType))
  }
}

/**
 * Determine the range of substitution positions in a set of variants. Ignore variants that are not simple
 * substitutions.
 *
 * This function presumes that any simple substitutions in the set of variants have their parsed HGVS
 * (parsedPostMappedHgvsC or parsedPostMappedHgvsP, depending on referenceType) property set.
 *
 * @param simpleVariants A list of variants
 * @param referenceType The type of reference (c for coding DNA nucleotide sequence or p for protein amino acid
 *   sequence) with respect to which positions are given. This determines which HGVS property of the variants,
 *   parsedPostMappedHgvsC or parsedPostMappedHgvsP, is used to obtain positions.
 * @returns An object with start and length properties representing the range of positions of variation. The length is
 *   0 if there are no variants.
 */
function getReferenceRange(variants: Variant[], referenceType: HgvsReferenceSequenceType): SequenceRange {
  // Assume that all variants have the same residue type and reference.
  if (variants.length == 0) {
    return {
      start: 0,
      length: 0
    }
  }
  const positionMin = _.min(variants.map((v) => getParsedPostMappedHgvs(v, referenceType)?.position)) ?? 0
  const positionMax = _.max(variants.map((v) => getParsedPostMappedHgvs(v, referenceType)?.position)) ?? 0
  return {
    start: positionMin,
    length: positionMax - positionMin + 1
  }
}

/**
 * Infer a DNA or protein reference sequence from variants with parsed HGVS strings.
 *
 * This function looks at each variant's parsedPostMappedHgvsC or parsedPostMappedHgvsP property (depending on the
 * specified reference type) and constructs a DNA reference sequence from the references alleles, wherever the parsed
 * HGVS property is populated. The returned reference sequence is accompanied by an object specifying the range of
 * positions it describes. For instance, if the 5'-most variant is c.101A>C, then the reference sequence will begin with
 * "A," and range.start will be 101. For any position at which no reference allele can be found among the variants, the
 * reference will have an "N" (for DNA sequences) or an "X" (for protein sequences).
 *
 * If no variants have their parsed HGVS property set, then an empty coding sequence is returned.
 *
 * @param variants An array of variants from which to infer a coding sequence.
 * @param referenceType The HGVS reference type, which may be "c" or "p." Any other reference types, including "g" and
 *   "n," will yield an empty reference sequence.
 * @returns TODO
 */
export function inferReferenceSequenceFromVariants(variants: Variant[], referenceType: HgvsReferenceSequenceType) {
  if (variants.length == 0 || !['c', 'p'].includes(referenceType)) {
    return {
      referenceSequence: '',
      referenceSequenceResidueType: referenceType == 'p' ? 'aa' : 'nt',
      referenceSequenceRange: {start: 0, length: 0}
    }
  }
  const referenceSequenceRange = getReferenceRange(variants, referenceType)
  const unknownResidue = referenceType == 'p' ? 'X' : 'N'
  const referenceSequenceArr = Array(referenceSequenceRange.length).fill(unknownResidue)
  for (const variant of variants) {
    const parsedHgvs = getParsedPostMappedHgvs(variant, referenceType)
    if (!parsedHgvs || parsedHgvs.position == null) {
      continue
    }
    if (referenceSequenceArr[parsedHgvs.position - referenceSequenceRange.start] == unknownResidue) {
      const referenceAllele = parsedHgvs.original
      const referenceAllele1Char =
        referenceType == 'p' ? singleLetterAminoAcidOrHgvsCode(referenceAllele) : referenceAllele
      if (referenceAllele1Char != null) {
        referenceSequenceArr[parsedHgvs.position - referenceSequenceRange.start] = referenceAllele1Char
      }
      // Uncomment to validate that all reference alleles at a position are identical. To do this, we also have to move
      // the definition of referenceAllele1Char up, and we wind up running singleLetterAminoAcidOrHgvsCode for many more
      // variants.

      // } else if (referenceAllele1Char != referenceSequenceArr[parsedHgvs.position - referenceSequenceRange.start]) {
      //   console.log(
      //     `WARNING: Two variants with simple HGVS strings have different reference alleles at position ${parsedHgvs.position}.`
      //   )
      //   return {
      //     referenceSequence: '',
      //     referenceSequenceResidueType: referenceType == 'p' ? 'aa' : 'nt',
      //     referenceSequenceRange: {start: 0, length: 0}
      //   }
    }
  }
  return {
    referenceSequence: referenceSequenceArr.join(''),
    referenceSequenceResidueType: referenceType == 'p' ? 'aa' : 'nt',
    referenceSequenceRange
  }
}

/**
 * Translate simple coding variants, adding an translated_hgvs_p column and setting parsedPostMappedHgvsP.
 *
 * This function looks at the parsedPostMappedHgvsC and parsedPostMappedHgvsP properties of every variant in the list.
 * If no variant with parsedPostMappedHgvsC lacks parsedPostMappedHgvsP, then there is nothing to translate, and this
 * function does nothing.
 *
 * If there is something to translate, then it calls inferCodingSequenceFromVariants to construct a coding sequence from
 * the already-parsed c. HGVS strings. It uses this to translate every variant for which the reference sequence has a
 * complete codon, and for which parsedPostMappedHgvsC is not already populated.
 *
 * In every variant that is successfully translated, two properties are set:
 * - hgvs_pro_translated is the translated HGVS string with a "p." reference type.
 * - parsedPostMappedHgvsP is set to a persed version of the HGVS string.
 *
 * Typically, parseSimpleCodingVariants should be called before this function in order to populate the variants'
 * parsedPostMappedHgvsC and parsedPostMappedHgvsP properties.
 *
 * Notice that this function alters members of the variants array by setting their translated_hgvs_p and
 * parsedPostMappedHgvsC properties.
 *
 * @param variants The array of variants to translate.
 */
export function translateSimpleCodingVariants(variants: Variant[]) {
  const {referenceSequence: codingSequence, referenceSequenceRange: codingSequenceRange} =
    inferReferenceSequenceFromVariants(variants, 'c')
  if (codingSequence.length > 0) {
    for (const v of variants) {
      // We can only translate c. variants.
      if (!v.parsedPostMappedHgvsP && v.parsedPostMappedHgvsC && v.parsedPostMappedHgvsC.referenceType == 'c') {
        const translatedHgvsP = translateSimpleCodingHgvsCVariant(
          v.parsedPostMappedHgvsC,
          codingSequence,
          codingSequenceRange
        )
        if (translatedHgvsP) {
          const parsedHgvsP = parseSimpleProVariant(translatedHgvsP)
          if (parsedHgvsP) {
            v.translated_hgvs_p = translatedHgvsP
            v.parsedPostMappedHgvsP = parsedHgvsP
          }
        }
      }
    }
  }
}

/**
 * Translate one simple coding DNA variant.
 *
 * @param parsedHgvsC The variant's parsed HGVS "c." string.
 * @param codingReferenceSequence All or part of the DNA reference sequence from an open reading frame. The variant's
 *   reference allele is assumed to agree with the reference and is not checked.
 * @param codingSequenceRange The range of nucleotide positions represented by the refernce sequence, relative to the
 *   reference used by the parsed HGVS expression. If the reference contains the whole ORF, then this will be 1, but
 *   it may be higher if the reference only represents part of the ORF.
 * @returns
 */
function translateSimpleCodingHgvsCVariant(
  parsedHgvsC: SimpleDnaVariation,
  codingReferenceSequence: string,
  codingReferenceSequenceRange: SequenceRange
) {
  if (parsedHgvsC.position == null) {
    return undefined
  }
  const offsetInCodon = (parsedHgvsC.position - 1) % 3
  const codonStartPosition = parsedHgvsC.position - offsetInCodon
  const aaPosition = Math.floor((codonStartPosition - 1) / 3) + 1
  if (codonStartPosition < codingReferenceSequenceRange.start) {
    return undefined
  }
  const codon = codingReferenceSequence.substring(
    codonStartPosition - codingReferenceSequenceRange.start,
    codonStartPosition - codingReferenceSequenceRange.start + 3
  )
  if (codon.length != 3 || codon.includes('N')) {
    return undefined
  }
  const codonArr = codon.split('')
  codonArr[offsetInCodon] = parsedHgvsC.substitution
  const variantCodon = codonArr.join('')
  // @ts-expect-error codonToAa is not reflected in the type yet
  const originalAaResidue = geneticCodes.standard.dna.codonToAa[codon]
  // @ts-expect-error codonToAa is not reflected in the type yet
  const variantAaResidue = geneticCodes.standard.dna.codonToAa[variantCodon]
  const originalAaTriple = _.startCase(
    AMINO_ACIDS_WITH_TER.find((aa) => aa.codes.single == originalAaResidue)?.codes?.triple?.toLowerCase()
  )
  const variantAaTriple = _.startCase(
    AMINO_ACIDS_WITH_TER.find((aa) => aa.codes.single == variantAaResidue)?.codes?.triple?.toLowerCase()
  )
  return `p.${originalAaTriple}${aaPosition}${variantAaTriple}`
}

/**
 * Determines whether a given variant represents either a start-loss (loss of the initiator methionine)
 * or a stop-loss (loss of a terminal stop/termination signal) event based on its protein-level HGVS notation.
 *
 * Detection logic:
 * 1. Selects the first available, non-null / non-"NA" protein HGVS string from:
 *    - variant.post_mapped_hgvs_p
 *    - variant.hgvs_pro_inferred
 *    - variant.hgvs_pro
 * 2. Parses the HGVS protein string via parseSimpleProVariant (external utility).
 * 3. Returns:
 *    - true if the variant alters the initiator methionine at position 1 (original == 'Met') to a different residue.
 *    - true if the variant alters a termination symbol at position 1 (original == 'Ter' or '*') to a non-stop residue.
 * 4. Returns false if no suitable HGVS string is found, parsing fails, or the criteria above are not met.
 *
 * Notes:
 * - The function currently infers start-loss strictly when position == 1 and original is 'Met'.
 *
 *
 * Parameter requirements:
 * - variant should be an object containing at least one of the HGVS protein fields listed above.
 * - External helpers required: variantNotNullOrNA, parseSimpleProVariant.
 *
 * @param variant Arbitrary variant-like object holding HGVS protein annotations.
 * @returns true if the variant is classified as start-loss or stop-loss; false (or undefined) otherwise.
 */
export function isStartOrStopLoss(variant: any) {
  const parsedVariant = variant.parsedPostMappedHgvsP
  if (!parsedVariant) {
    return false
  }
  if (parsedVariant.position == 1 && parsedVariant.original == 'Met' && parsedVariant.substitution != 'Met') {
    // Start loss
    return true
  }
  if (
    (parsedVariant.original == 'Ter' || parsedVariant.original == '*') &&
    parsedVariant.substitution != 'Ter' &&
    parsedVariant.substitution != '*'
  ) {
    // Stop loss
    return true
  }

  return false
}

export function variantIsMissense(variant: Variant) {
  const parsedVariant = variant.parsedPostMappedHgvsP
  if (!parsedVariant) {
    return false
  }
  const refAllele = parsedVariant.original.toUpperCase()
  const altAllele = parsedVariant.substitution.toUpperCase()
  const refAlleleIsAA = AMINO_ACIDS.find((aa) => aa.codes.triple == refAllele)
  const altAlleleIsAA = AMINO_ACIDS.find((aa) => aa.codes.triple == altAllele)
  const startLoss = parsedVariant.position == 1 && refAllele == 'MET'
  return !!(refAlleleIsAA && altAlleleIsAA && !startLoss && refAllele != altAllele)
}

export function variantIsSynonymous(variant: Variant) {
  const parsedVariant = variant.parsedPostMappedHgvsP
  if (!parsedVariant) {
    return false
  }
  const refAllele = parsedVariant.original.toUpperCase()
  const altAllele = parsedVariant.substitution.toUpperCase()
  const refAlleleIsAA = AMINO_ACIDS.find((aa) => aa.codes.triple == refAllele)
  return !!(refAlleleIsAA && (refAllele == altAllele || altAllele == '='))
}

export function variantIsNonsense(variant: Variant) {
  const parsedVariant = variant.parsedPostMappedHgvsP
  if (!parsedVariant) {
    return false
  }
  const altAllele = parsedVariant.substitution.toUpperCase()
  return altAllele == 'TER' || altAllele == '*'
}

export function variantIsOther(variant: Variant) {
  return (
    !variantIsMissense(variant) &&
    !variantIsSynonymous(variant) &&
    !variantIsNonsense(variant) &&
    !isStartOrStopLoss(variant)
  )
}

/**
 * Check that this application is able to determine the protein consequence of every variant.
 *
 * This means that every variant either has a parseable protein HGVS string or is known to be non-coding.
 *
 * Here we distinguish known a non-coding variant by the facts that (a) it has a parsed HGVS c. string and (b) the
 * position in this string is not an integer.
 *
 * @param variants A list of variants.
 * @returns True if every variant has a protein consequence determinable by this application.
 */
export function allCodingVariantsHaveProteinConsequence(variants: Variant[]) {
  return variants.every(
    (v) =>
      v.parsedPostMappedHgvsP != null ||
      (v.parsedPostMappedHgvsC?.referenceType == 'c' && v.parsedPostMappedHgvsC?.position == null)
  )
}
