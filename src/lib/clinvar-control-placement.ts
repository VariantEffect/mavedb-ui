/**
 * @fileoverview
 * The ClinVar clinical-control divergence fold.
 *
 * For an AA-resolution score set one measured protein change is encoded by several DNA variants, whose
 * ClinVar classifications can disagree. This module reduces the set of controls that reach a single
 * variant to one placement the histogram can bin off — applying source precedence (the assayed-level
 * allele's own call wins; projection siblings are only a fallback) and grading how the winning calls
 * disagree ({@link Discordance}). Directional-over-uncertain is precedence, not discordance.
 */

import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  clinvarVariantUrl,
  CLINVAR_REVIEW_STATUS_STARS,
  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  isClassifiedSignificance,
  type MeasurementClinvarRecord,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar-controls'
import type {components} from '@/schema/openapi'

type ClinvarAnnotation = components['schemas']['ClinvarAnnotation']

/**
 * How the ClinVar calls reaching a measurement disagree, ordered by placement difficulty.
 * - `none` — a single call, or uncertain-only records (a lone VUS, VUS + Conflicting). Nothing to reconcile.
 * - `concordant` — ≥2 distinct calls in a *single* direction (e.g. Likely benign + Benign); usable, and we
 *   picked a representative via star tiebreak. Purely informational: the direction is not in doubt.
 * - `soft` — a *soft conflict*: one directional lean co-occurs with an uncertain record (a VUS or a
 *   ClinVar-*Conflicting* call). Usable (the directional call is the representative) but flagged because the
 *   uncertain record hints the direction may not be settled. Places as its directional lean.
 * - `hard` — opposing directional *assertions* (P/LP and B/LB); the projection premise is broken, so there is
 *   no usable representative. Categorical — confidence within a direction never changes this.
 */
export type Discordance = 'none' | 'concordant' | 'soft' | 'hard'

/** A distinct ClinVar call in a variant's winning set. */
export interface ControlClassification {
  significance: string
  reviewStatus: string
}

/** One ClinVar control reaching a variant, tagged with the digest of the allele it annotates. */
export interface ControlLink extends ControlClassification {
  alleleDigest?: string | null
  dbIdentifier?: string
}

/** Fields present on every placement, usable or not — enough to reconstruct the winning set behind the fold. */
interface BaseControlPlacement {
  /** The winning set's distinct calls (assayed-level controls if any, else the projection siblings). */
  classifications: ControlClassification[]
  /**
   * True when the winning set came from **projection siblings**. The measured allele itself had no
   * ClinVar record, so this classification is about a *related* variant at a different level, not the
   * entity we assayed.
   */
  projected: boolean
}

/**
 * A hard-discordant placement: the winning set holds both a P/LP and a B/LB call, so there is *physically*
 * no representative — no single call can stand for a contradiction. Carries only the set (so a surface can
 * still list the conflicting calls); the representative fields are absent from the type to avoid accidental
 * misuse.
 */
export interface HardDiscordantPlacement extends BaseControlPlacement {
  discordance: 'hard'
}

/** A usable placement (`none`/`concordant`/`soft`): a single representative call the one-label surfaces read. */
export interface UsableControlPlacement extends BaseControlPlacement {
  discordance: 'none' | 'concordant' | 'soft'
  /** Representative single call (directional-preferred, then highest-star) for one-label surfaces. */
  [DEFAULT_CLNSIG_FIELD]: string
  [DEFAULT_CLNREVSTAT_FIELD]: string
  dbIdentifier?: string
  /** Whether any confident directional (P/LP or B/LB) call is present — directional dominates VUS. */
  directional: boolean
  /** VRS digest of the representative call's allele. Undefined only when the winning links carried no digest. */
  alleleDigest?: string | null
}

/**
 * The reduced result for one variant — what the histogram and per-variant surfaces read. A discriminated
 * union on `discordance`: narrow to a {@link UsableControlPlacement} (or check `discordance !== 'hard'`)
 * before reading the representative call.
 */
export type ClinvarControlPlacement = HardDiscordantPlacement | UsableControlPlacement

const isPathogenic = (significance: string) => PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isBenign = (significance: string) => BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isDirectional = (significance: string) => isPathogenic(significance) || isBenign(significance)
const isConflicting = (significance: string) => CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const starsOf = (reviewStatus: string) => CLINVAR_REVIEW_STATUS_STARS[reviewStatus] ?? -1

/**
 * Reduce the ClinVar controls reaching one variant to a single {@link ClinvarControlPlacement}.
 *
 * **Precedence:** if any control annotates the variant's own assayed-level allele
 * (`alleleDigest === assayLevelDigest`), those controls are the winning set and the projection siblings
 * are ignored — a direct call on the assayed entity is not diluted by the fan-out. Otherwise the
 * siblings are the winning set. Over the winning set:
 *   - **hard** (both a P/LP and a B/LB call) → `discordance: 'hard'`, not a usable control;
 *   - **soft** (a directional lean + an uncertain record — a VUS or a ClinVar-*Conflicting* call) →
 *     `discordance: 'soft'`, usable — the lean is the representative, but the surface can flag the soft conflict;
 *   - **concordant** (≥2 distinct calls in a single direction, e.g. LB + B, no uncertain record) →
 *     `discordance: 'concordant'`, usable, representative by star tiebreak;
 *   - the distinct calls flow through as `classifications`, and `directional` records whether any confident
 *     P/LP or B/LB call is present, so the histogram can drop VUS when a directional call dominates.
 *
 * Returns `null` when no *classified* control reaches the variant.
 */
export function reduceControlPlacement(
  links: ControlLink[],
  assayLevelDigest: string | null | undefined
): ClinvarControlPlacement | null {
  // Drop ClinVar "no classification" placeholders (a literal `-`/empty) up front, so they neither become a
  // call nor — as a `-` on the assayed allele — block fall-through to a real projection sibling.
  const classified = links.filter((link) => isClassifiedSignificance(link.significance))
  if (classified.length === 0) {
    return null
  }

  const assayedLevel = assayLevelDigest ? classified.filter((link) => link.alleleDigest === assayLevelDigest) : []
  const winning = assayedLevel.length > 0 ? assayedLevel : classified
  // Fell through to siblings — but only *claim* projection when the assayed digest is known; an absent
  // digest means unknown provenance, which we don't surface as "related variant" (avoids mislabeling).
  const projected = Boolean(assayLevelDigest) && assayedLevel.length === 0

  // Distinct calls, preserving first-seen order.
  const seen = new Set<string>()
  const classifications: ControlClassification[] = []
  for (const link of winning) {
    if (!seen.has(link.significance)) {
      seen.add(link.significance)
      classifications.push({significance: link.significance, reviewStatus: link.reviewStatus})
    }
  }

  const pathogenicCalls = classifications.filter((c) => isPathogenic(c.significance))
  const benignCalls = classifications.filter((c) => isBenign(c.significance))
  const directional = pathogenicCalls.length > 0 || benignCalls.length > 0
  // Any non-directional call is "uncertain" — a VUS *or* ClinVar's own aggregate Conflicting value.
  const uncertainPresent = classifications.some((c) => !isDirectional(c.significance))

  // Grade the disagreement. Opposite directions is hard (unusable). Otherwise, with a single direction:
  // a co-occurring uncertain record (VUS/Conflicting) is a *soft conflict* — the lean stands but the direction
  // may not be settled; ≥2 distinct calls in that one direction (no uncertain record) is merely concordant.
  if (pathogenicCalls.length > 0 && benignCalls.length > 0) {
    // Hard: opposing directional assertions break the projection premise, so there is no single winning call.
    // No representative is computed, and the type withholds those fields so no surface can read a fake one.
    return {discordance: 'hard', classifications, projected}
  }
  // soft > concordant > none.
  const discordance: 'none' | 'concordant' | 'soft' =
    directional && uncertainPresent
      ? 'soft'
      : pathogenicCalls.length > 1 || benignCalls.length > 1
        ? 'concordant'
        : 'none'

  // Representative for one-label surfaces (search dot, notables, tooltip): a directional call is more
  // informative than a co-occurring VUS, so prefer directional calls when present, then highest star.
  const candidates = directional ? winning.filter((link) => isDirectional(link.significance)) : winning
  const representative = candidates.reduce((best, link) =>
    starsOf(link.reviewStatus) > starsOf(best.reviewStatus) ? link : best
  )

  return {
    [DEFAULT_CLNSIG_FIELD]: representative.significance,
    [DEFAULT_CLNREVSTAT_FIELD]: representative.reviewStatus,
    dbIdentifier: representative.dbIdentifier,
    classifications,
    discordance,
    directional,
    alleleDigest: representative.alleleDigest,
    projected
  }
}

/**
 * A note qualifying a representative `call` — what, beyond the call itself, the headline should say.
 * - `none` — a lone, unambiguous call; show it plainly.
 * - `concordant` — the call represents ≥2 agreeing same-direction records; a quiet "representative of concordant
 *   records" aside.
 * - `soft-vus` — a soft conflict where the co-occurring uncertain record is a plain VUS.
 * - `soft-conflicting` — a soft conflict where ClinVar itself marks a related record *Conflicting*.
 *
 * The two `soft-*` values are split so the surface can word the two soft conflicts differently; `soft-conflicting`
 * wins when both a VUS and a Conflicting record co-occur (ClinVar's explicit conflict verdict is the stronger flag).
 */
export type ClinvarCallNote = 'none' | 'concordant' | 'soft-vus' | 'soft-conflicting'

/**
 * What a one-headline ClinVar surface should display for a measurement — a discriminated union so the
 * component switches on `kind` instead of re-deriving a precedence ladder in its template.
 * - `conflicting` — hard-discordant winning set; no single call to show.
 * - `call` — the representative usable call (assayed-level or a projection sibling), with a {@link ClinvarCallNote}
 *   qualifying it (concordant aside, or a soft-conflict flag). The lib owns that decision so the template renders it.
 * - `presence` — no usable call, but a ClinVar record exists (a `-` germline-less submission); link out.
 * - `none` — nothing reaches the measurement.
 */
export type ClinvarHeadline =
  | {kind: 'conflicting'; placement: HardDiscordantPlacement}
  | {kind: 'call'; clinvar: ClinvarAnnotation; placement: UsableControlPlacement; note: ClinvarCallNote}
  | {kind: 'presence'; record: MeasurementClinvarRecord}
  | {kind: 'none'}

/** Derive the {@link ClinvarCallNote} for a usable placement — the lib's single display decision for a call. */
function resolveCallNote(placement: UsableControlPlacement): ClinvarCallNote {
  if (placement.discordance === 'concordant') return 'concordant'
  if (placement.discordance === 'soft') {
    return placement.classifications.some((c) => isConflicting(c.significance)) ? 'soft-conflicting' : 'soft-vus'
  }
  return 'none'
}

/** Pick the germline-less record to represent a measurement when the fold yields no call: the measured
 *  allele's own record wins, then any linkable one, else first-seen. */
function selectPresence(records: MeasurementClinvarRecord[]): MeasurementClinvarRecord | null {
  if (records.length === 0) return null
  return records.find((r) => r.onAssayed) ?? records.find((r) => Boolean(clinvarVariantUrl(r.clinvar))) ?? records[0]
}

/**
 * Resolve what a one-headline ClinVar surface shows, over a resolved walk. Runs the fold and, when it yields
 * no usable call, falls back to a `-` presence record — the single precedence decision every such surface
 * reads, so the stat cell and variant screen agree.
 */
export function resolveClinvarHeadline(
  records: MeasurementClinvarRecord[],
  assayLevelDigest: string | null | undefined
): ClinvarHeadline {
  const placement = reduceControlPlacement(
    records.map((r) => ({
      significance: r.clinvar.clinicalSignificance,
      reviewStatus: r.clinvar.clinicalReviewStatus,
      alleleDigest: r.digest
    })),
    assayLevelDigest
  )
  if (placement?.discordance === 'hard') return {kind: 'conflicting', placement}
  if (placement) {
    const representative = records.find((r) => r.digest === placement.alleleDigest)
    if (representative) {
      return {kind: 'call', clinvar: representative.clinvar, placement, note: resolveCallNote(placement)}
    }
  }
  // No usable call — a real classification would have folded above, so any surviving record is a `-`.
  const presence = selectPresence(records)
  return presence ? {kind: 'presence', record: presence} : {kind: 'none'}
}
