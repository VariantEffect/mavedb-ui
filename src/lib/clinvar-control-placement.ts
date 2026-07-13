import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  isClassifiedSignificance,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar-controls'

/**
 * The ClinVar clinical-control divergence fold.
 *
 * For an AA-resolution score set one measured protein change is encoded by several DNA variants, whose
 * ClinVar classifications can disagree. This module reduces the set of controls that reach a single
 * variant to one placement the histogram can bin off — applying source precedence (the assayed-level
 * allele's own call wins; projection siblings are only a fallback) and the hard/soft discordance rule.
 */

/** A distinct ClinVar call in a variant's winning set. */
export interface ControlClassification {
  significance: string
  reviewStatus: string
}

/** One ClinVar control reaching a variant, tagged with the digest of the allele it annotates. */
export interface ControlLink extends ControlClassification {
  /** VRS digest of the allele the control annotates; compared to the variant's `assayLevelDigest`. */
  alleleDigest?: string | null
  dbIdentifier?: string
}

/** The reduced result for one variant — what the histogram and per-variant surfaces read. */
export interface ClinvarControlPlacement {
  /** Representative single call (directional-preferred, then highest-star) for one-label surfaces. */
  [DEFAULT_CLNSIG_FIELD]: string
  [DEFAULT_CLNREVSTAT_FIELD]: string
  dbIdentifier?: string
  /** The winning set's distinct calls (assayed-level controls if any, else the projection siblings). */
  classifications: ControlClassification[]
  /** Hard discordance — the winning set holds both a P/LP and a B/LB call; not a usable control. */
  excluded: boolean
  /** Whether any confident directional (P/LP or B/LB) call is present — directional dominates VUS. */
  directional: boolean
  /**
   * VRS digest of the representative call's allele — lets a per-variant surface resolve that allele's
   * level/HGVS (to name a projected sibling) and its ClinVar link-out. Undefined only when the winning
   * links carried no digest.
   */
  alleleDigest?: string | null
  /**
   * True when the winning set came from **projection siblings** — the measured allele itself had no
   * ClinVar record, so this classification is about a *related* variant at a different level, not the
   * entity we assayed. Drives the "related variant" tooltip note that reconciles a control series
   * membership with an empty measured-level ClinVar. Only asserted when the assayed-level digest is
   * known (so a genuinely-direct call is never mislabeled when the digest is merely absent).
   */
  projected: boolean
}

const isPathogenic = (significance: string) => PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isBenign = (significance: string) => BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isDirectional = (significance: string) => isPathogenic(significance) || isBenign(significance)
const starsOf = (reviewStatus: string) => CLINVAR_REVIEW_STATUS_STARS[reviewStatus] ?? -1

/**
 * Reduce the ClinVar controls reaching one variant to a single {@link ClinvarControlPlacement}.
 *
 * **Precedence:** if any control annotates the variant's own assayed-level allele
 * (`alleleDigest === assayLevelDigest`), those controls are the winning set and the projection siblings
 * are ignored — a direct call on the assayed entity is not diluted by the fan-out. Otherwise the
 * siblings are the winning set. Over the winning set:
 *   - **hard discordance** (both a P/LP and a B/LB call) → `excluded` (not a usable control);
 *   - otherwise the distinct calls flow through as `classifications`, and `directional` records whether
 *     any confident P/LP or B/LB call is present, so the histogram can drop VUS when a directional call
 *     dominates.
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

  const pathogenicPresent = classifications.some((c) => isPathogenic(c.significance))
  const benignPresent = classifications.some((c) => isBenign(c.significance))
  const directional = pathogenicPresent || benignPresent

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
    excluded: pathogenicPresent && benignPresent,
    directional,
    alleleDigest: representative.alleleDigest,
    projected
  }
}
