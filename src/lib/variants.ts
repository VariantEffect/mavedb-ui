import _ from 'lodash'

import {singleLetterAminoAcidOrHgvsCode} from '@/lib/amino-acids'
import type {ClinvarControlPlacement} from '@/lib/clinvar-control-placement'
import type {components} from '@/schema/openapi'

/**
 * The lean per-variant record served by `GET /score-sets/{urn}/variants`, mirrored from the API's
 * OpenAPI schema. This is the shape the score-set and variant views read: the migration off the
 * CSV-derived `Variant`/`RawVariant` types is complete and those types are gone.
 */
export type HgvsField = components['schemas']['HgvsField']
export type LeanVariant = components['schemas']['LeanVariant']

/**
 * A lean variant as displayed on the score-set page, with the one client-side augmentation the views
 * add on top of the API record: `control` (clinical-control data merged in by variant URN). Score-set
 * visualizations and search consume this shape.
 */
export type DisplayVariant = LeanVariant & {
  control?: ClinvarControlVariant | null
}

export interface SequenceRange {
  start: number
  length: number
}

/**
 * The clinical-control facet merged onto a variant: the divergence fold's placement
 * ({@link ClinvarControlPlacement}) — representative call for one-label surfaces, plus the winning-set
 * classifications and the excluded/directional flags the histogram bins off.
 */
export type ClinvarControlVariant = ClinvarControlPlacement

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
function proteinConsequenceBlock(variant: DisplayVariant): HgvsField | null {
  return variant.mapped?.protein ?? variant.hgvsPro ?? null
}

/**
 * Whether a variant is a start-loss (loss of the initiator methionine) or stop-loss event.
 *
 * Prefers the VEP consequence when present; otherwise reads the protein block off the lean record and
 * decides on the residues themselves. Used as the heatmap's plotted-representation filter, where VEP may
 * be absent and the amino-acid change being drawn is the right signal.
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
