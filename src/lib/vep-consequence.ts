/**
 * @fileoverview
 * How far a VEP consequence can be trusted for the allele it is shown on. VEP resolves a cDNA allele against its
 * own transcript, but a genomic allele has no transcript to match, so its consequence is VEP's worst case across
 * every overlapping transcript (`consequenceSource: 'most_severe'`). That worst case often comes from an isoform
 * the assay never touched, so it must not stand in for a transcript-specific call.
 */

import type {components} from '@/schema/openapi'

type VepAnnotation = components['schemas']['VepAnnotation']

/** Whether `vep` is VEP's worst case across all overlapping transcripts rather than a call for one transcript. */
export function isWorstCaseConsequence(vep: Pick<VepAnnotation, 'consequenceSource'> | null | undefined): boolean {
  return vep?.consequenceSource === 'most_severe'
}

/**
 * The VEP results a merged row should choose from: the worst-case results drop out when any member has a call for
 * a specific transcript (or a reference-identical one), whatever order the members come in. Rows resolved before
 * the source was recorded carry none and are kept as they are.
 */
export function specificVepFirst<T extends Pick<VepAnnotation, 'consequenceSource'>>(values: T[]): T[] {
  const specific = values.filter((v) => v.consequenceSource != null && !isWorstCaseConsequence(v))
  return specific.length > 0 ? specific : values
}
