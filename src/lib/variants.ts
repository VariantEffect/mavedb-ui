import _ from 'lodash'

import {AMINO_ACIDS_WITH_TER, singleLetterAminoAcidOrHgvsCode} from '@/lib/amino-acids'
import {DEFAULT_CLNREVSTAT_FIELD, DEFAULT_CLNSIG_FIELD} from '@/lib/clinical-controls'
import geneticCodes from '@/lib/genetic-codes'
import {parseSimpleNtVariant, parseSimpleProVariant} from '@/lib/mave-hgvs'
import {parseScoresOrCounts} from '@/lib/scores'
import type {components} from '@/schema/openapi'
import type {SimpleDnaVariation, SimpleProteinVariation} from '@/lib/mave-hgvs'

/**
 * The lean per-variant record served by `GET /score-sets/{urn}/variants`, mirrored from the API's
 * OpenAPI schema. This is the target shape for the score-set view reshape; consumers migrate onto it
 * slice by slice, at which point the legacy CSV-derived `Variant`/`RawVariant` types below are removed.
 */
export type HgvsField = components['schemas']['HgvsField']
export type LeanVariant = components['schemas']['LeanVariant']

/**
 * A lean variant as displayed on the score-set page, with the one client-side augmentation the views
 * add on top of the API record: `control` (clinical-control data merged in by variant URN). Score-set
 * visualizations and search consume this shape.
 */
export type DisplayVariant = LeanVariant & {
  control?: ClinicalControlVariant | null
}

export type HgvsReferenceSequenceType = 'c' | 'p' // | 'n'

export interface SequenceRange {
  start: number
  length: number
}

export interface ClinicalControlVariant {
  [DEFAULT_CLNSIG_FIELD]: string
  [DEFAULT_CLNREVSTAT_FIELD]: string
  dbIdentifier?: string
}

type ParsedSimpleDnaVariation = SimpleDnaVariation & {
  residueType?: 'nt'
  origin?: 'mapped' | 'unmapped'
}

type ParsedSimpleProteinVariation = SimpleProteinVariation & {
  residueType?: 'aa'
  origin?: 'mapped' | 'unmapped'
}

export interface RawVariant {
  accession: string
  hgvs_nt?: string
  hgvs_pro?: string
  hgvs_splice?: string

  scores: {
    score: number | 'NA'
    [key: string]: any
  }
  counts?: {
    [key: string]: any
  }
  mavedb?: {
    post_mapped_hgvs_c?: string
    post_mapped_hgvs_p?: string
    post_mapped_vrs_digest?: string
  }
  vep?: {
    vep_functional_consequence?: string
  }
  clingen?: {
    clingen_allele_id?: string
  }

  control?: ClinicalControlVariant
  mavedb_label?: string
}

export interface VariantPropertiesAddedByPreparingCodingVariants {
  // Added by parseSimpleCodingVariants.
  parsedPostMappedHgvsC?: ParsedSimpleDnaVariation
  parsedPostMappedHgvsP?: ParsedSimpleProteinVariation
}

export interface Variant extends RawVariant, VariantPropertiesAddedByPreparingCodingVariants {
  // Added by translateSimpleCodingVariants
  translated_hgvs_p?: string
}

export const HGVS_REFERENCE_SEQUENCE_TYPES: Record<
  HgvsReferenceSequenceType,
  {parsedPostMappedHgvsField: keyof VariantPropertiesAddedByPreparingCodingVariants}
> = {
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

export function parseScoreSetVariantData(csvData: string): Variant[] {
  const variants = parseScoresOrCounts(csvData, true) as Variant[]
  prepareScoreSetVariantData(variants)
  return variants
}

function prepareScoreSetVariantData(variants: Variant[]) {
  parseSimpleCodingVariants(variants)
  translateSimpleCodingVariants(variants)
}

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
function parseSimpleCodingVariants(variants: Variant[]) {
  for (const v of variants) {
    // Create the mavedb namespace if it doesn't exist.
    if (!v.mavedb) v.mavedb = {}

    if (v.mavedb.post_mapped_hgvs_c && v.mavedb.post_mapped_hgvs_c != 'NA') {
      const parsedHgvs = parseSimpleNtVariant(v.mavedb.post_mapped_hgvs_c)
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
        v.mavedb.post_mapped_hgvs_c = v.hgvs_nt
        v.parsedPostMappedHgvsC = parsedHgvs
        v.parsedPostMappedHgvsC.residueType = 'nt'
        v.parsedPostMappedHgvsC.origin = 'unmapped'
      }
    }

    if (v.mavedb.post_mapped_hgvs_p && v.mavedb.post_mapped_hgvs_p != 'NA') {
      const parsedHgvs = parseSimpleProVariant(v.mavedb.post_mapped_hgvs_p)
      if (parsedHgvs) {
        v.parsedPostMappedHgvsP = parsedHgvs
        v.parsedPostMappedHgvsP.residueType = 'aa'
        v.parsedPostMappedHgvsP.origin = 'mapped'
      }
    } else if (v.hgvs_pro && v.hgvs_pro != 'NA') {
      const parsedHgvs = parseSimpleProVariant(v.hgvs_pro)
      // Allow there to be no accession.
      if (parsedHgvs) {
        v.mavedb.post_mapped_hgvs_p = v.hgvs_pro
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
 * Infer a wild-type reference sequence from lean variant records, in whatever coordinate frame the
 * caller's block accessor resolves. `getBlock` returns the HGVS block (with `position`/`ref`) for a
 * variant in the desired (level, frame); the reference residue at each position is taken from the
 * first block that covers it. Positions with no covering variant are filled with the unknown residue
 * (`X` for protein, `N` for nucleotide). This is the Option A analogue of
 * `inferReferenceSequenceFromVariants` — it works off the resolved blocks, so it reprojects with the
 * frame instead of assuming the post-mapped parse.
 */
export function inferReferenceSequenceFromBlocks(
  variants: DisplayVariant[],
  getBlock: (variant: DisplayVariant) => HgvsField | null,
  residueType: 'nt' | 'aa'
): {referenceSequence: string; referenceSequenceRange: SequenceRange} {
  const blocks = variants.map(getBlock).filter((block): block is HgvsField => block != null && block.position != null)
  if (blocks.length == 0) {
    return {referenceSequence: '', referenceSequenceRange: {start: 0, length: 0}}
  }
  const start = _.min(blocks.map((block) => block.position!))!
  const end = _.max(blocks.map((block) => block.position!))!
  const length = end - start + 1
  const unknownResidue = residueType == 'aa' ? 'X' : 'N'
  const referenceSequenceArr = Array(length).fill(unknownResidue)
  for (const block of blocks) {
    const index = block.position! - start
    if (referenceSequenceArr[index] == unknownResidue && block.ref != null) {
      const oneChar = residueType == 'aa' ? singleLetterAminoAcidOrHgvsCode(block.ref) : block.ref
      if (oneChar != null) {
        referenceSequenceArr[index] = oneChar
      }
    }
  }
  return {referenceSequence: referenceSequenceArr.join(''), referenceSequenceRange: {start, length}}
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
function translateSimpleCodingVariants(variants: Variant[]) {
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
 * The protein-level HGVS block used to classify a variant's consequence when a VEP consequence is
 * absent: the mapped protein representation preferred, falling back to the submitted protein HGVS.
 */
function proteinConsequenceBlock(variant: DisplayVariant): HgvsField | null {
  return variant.mapped?.protein ?? variant.hgvsPro ?? null
}

/**
 * Determines whether a given variant represents either a start-loss (loss of the initiator methionine)
 * or a stop-loss (loss of a terminal stop/termination signal) event based on its protein-level HGVS notation.
 *
 * Detection logic:
 * 1. If the variant has a VEP consequence, it is used directly to determine start-loss or stop-loss.
 * 2. If no VEP consequence is available, the function attempts to extract a protein-level HGVS block from the variant.
 * 3. Selects the first available, non-null / non-"NA" protein HGVS string from:
 *    - variant.post_mapped_hgvs_p
 *    - variant.hgvs_pro_inferred
 *    - variant.hgvs_pro
 * 4. Parses the HGVS protein string via parseSimpleProVariant (external utility).
 * 5. Returns:
 *    - true if the variant alters the initiator methionine at position 1 (original == 'Met') to a different residue.
 *    - true if the variant alters a termination symbol at position 1 (original == 'Ter' or '*') to a non-stop residue.
 * 6. Returns false if no suitable HGVS string is found, parsing fails, or the criteria above are not met.
 *
 * Notes:
 * - The function currently infers start-loss strictly when position == 1 and original is 'Met'.
 *
 * Parameter requirements:
 * - variant should be an object containing at least one of the HGVS protein fields listed above.
 * - External helpers required: variantNotNullOrNA, parseSimpleProVariant.
 *
 * @param variant Arbitrary variant-like object holding HGVS protein annotations.
 * @returns true if the variant is classified as start-loss or stop-loss; false (or undefined) otherwise.
 */
export function isStartOrStopLoss(variant: DisplayVariant): boolean {
  if (variant.consequence && variant.consequence != 'NA') {
    return variant.consequence == 'start_lost' || variant.consequence == 'stop_lost'
  }
  const block = proteinConsequenceBlock(variant)
  if (!block || block.ref == null || block.alt == null) {
    return false
  }
  if (block.position == 1 && block.ref == 'Met' && block.alt != 'Met') {
    // Start loss
    return true
  }
  if ((block.ref == 'Ter' || block.ref == '*') && block.alt != 'Ter' && block.alt != '*') {
    // Stop loss
    return true
  }

  return false
}

// Protein-effect classification by VEP consequence now lives in `lib/consequences.ts`
// (`consequenceBucket`). `isStartOrStopLoss` above is intentionally block-aware and stays here: it is
// the heatmap's plotted-representation filter (hiding start/stop-loss cells on synthetic targets),
// where VEP may be absent and the amino-acid change being drawn is the right signal.
