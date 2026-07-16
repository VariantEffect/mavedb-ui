/**
 * @fileoverview
 * Notable-variant samplers for the score-set variant search's empty state.
 *
 * When the search box is empty the dropdown offers a few "interesting" variants to jump to instead of a
 * blank list. Interest is graded by signal-richness, and each sampler here is one rung: clinical controls
 * (richest, needs a fetch), consequence exemplars (intrinsic, mapping-derived), and score extremes (the
 * universal floor — every score set has some variants with a score). A score set shows whichever rungs have data.
 *
 * These are PURE functions over the variant list so they stay trivially testable; the component groups
 * their output into the AutoComplete and renders the captions.
 */

import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  DEFAULT_MIN_STAR_RATING,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar-controls'
import type {UsableControlPlacement} from '@/lib/clinvar-control-placement'
import {consequenceBucket, EFFECT_BUCKETS} from '@/lib/consequences'
import type {DisplayVariant} from '@/lib/variants'

/** Variants carrying a numeric score — the only ones with a point to jump to. */
function scored(variants: DisplayVariant[]): DisplayVariant[] {
  return variants.filter((v) => typeof v.score === 'number')
}

/**
 * A control clean enough to headline a notables row: an unambiguous or concordant call. Soft conflicts (a
 * directional lean beside an uncertain/Conflicting record) and hard discordance are excluded. Notables should
 * be "definitive" exemplars, so we don't front a call we are hedging.
 */
function isDefinitiveControl(control: DisplayVariant['control']): control is UsableControlPlacement {
  return control != null && (control.discordance === 'none' || control.discordance === 'concordant')
}

/** Star rating of a control's review status; -1 when the status is absent/unknown (never passes a ≥ gate). */
function controlStars(variant: DisplayVariant): number {
  const control = variant.control
  const status = isDefinitiveControl(control) ? control[DEFAULT_CLNREVSTAT_FIELD] : undefined
  return status != null ? (CLINVAR_REVIEW_STATUS_STARS[status] ?? -1) : -1
}

/**
 * Clinical-control exemplars: one variant per definitive ClinVar class (P/LP, B/LB) at ≥ `minStar`,
 * picked to show the assay separating the classes. When both classes are present the "damaging"
 * direction is learned from the data (sign of the difference between the two class medians), and each
 * class's exemplar is the variant furthest into its own end — the most functionally-extreme pathogenic
 * and the most wild-type-like benign. When only one class is present there is no axis to separate, so
 * that class's exemplar is simply the variant furthest from the whole set's median. Returns ≤2 rows, in
 * pathogenic-then-benign order; empty when no definitive controls clear the star gate.
 */
export function clinicalExtremesPerClass(
  variants: DisplayVariant[],
  minStar: number = DEFAULT_MIN_STAR_RATING
): DisplayVariant[] {
  const definitive = (classes: string[]) =>
    scored(variants).filter((v) => {
      if (!isDefinitiveControl(v.control)) return false
      return classes.includes(v.control[DEFAULT_CLNSIG_FIELD]) && controlStars(v) >= minStar
    })
  const pathogenic = definitive(PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS)
  const benign = definitive(BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS)
  if (!pathogenic.length && !benign.length) return []

  // A direct call on the assayed allele is a stronger headliner than one projected from a sibling allele,
  // so pick the exemplar from the direct members when a class has any; fall back to the whole (projected)
  // group only when the class is present solely via siblings.
  const preferDirect = (group: DisplayVariant[]) => {
    const direct = group.filter((v) => !v.control?.projected)
    return direct.length ? direct : group
  }

  const scoreOf = (v: DisplayVariant) => v.score as number
  const furthestFrom = (group: DisplayVariant[], anchor: number) =>
    group.reduce((best, v) => (Math.abs(scoreOf(v) - anchor) > Math.abs(scoreOf(best) - anchor) ? v : best))

  // Both classes present: separate along the learned damaging direction. Only one: fall back to the
  // variant furthest from the set's median (still a headline extreme, just without a contrast class).
  if (pathogenic.length && benign.length) {
    const pathMedian = median(pathogenic.map(scoreOf))
    const benignMedian = median(benign.map(scoreOf))
    const damagingWard = Math.sign(pathMedian - benignMedian) || 1
    const mostWard = (group: DisplayVariant[], ward: number) =>
      group.reduce((best, v) => (scoreOf(v) * ward > scoreOf(best) * ward ? v : best))
    return [mostWard(preferDirect(pathogenic), damagingWard), mostWard(preferDirect(benign), -damagingWard)]
  }
  const anchor = median(scored(variants).map(scoreOf))
  const group = pathogenic.length ? pathogenic : benign
  return [furthestFrom(preferDirect(group), anchor)]
}

/**
 * Consequence exemplars: one representative per VEP effect bucket present, in canonical bucket order — a
 * quick sampler of the data's shape (a missense, a synonymous, a nonsense, …). 'No consequence' is
 * skipped (the unmapped/unannotated pile is not a headline). Empty on truly-unmapped sets, where VEP
 * consequence is absent for every variant.
 */
export function consequenceExemplars(variants: DisplayVariant[]): DisplayVariant[] {
  const pool = scored(variants)
  if (!pool.length) return []
  const exemplars: DisplayVariant[] = []
  for (const bucket of EFFECT_BUCKETS) {
    if (bucket.name === 'No consequence') continue
    const match = pool.find((v) => consequenceBucket(v.consequence) === bucket.name)
    if (match) exemplars.push(match)
  }
  return exemplars
}

/**
 * The `n` most extreme-scoring variants, ranked by distance from the median in robust (MAD) units.
 * MAD-from-median is used instead of standard deviation because MAVE score distributions are typically
 * bimodal — squaring residuals would let one far tail dominate the scale. Ranking by absolute deviation
 * naturally surfaces both tails. The universal fallback rung: every scored variant qualifies.
 */
export function scoreExtremes(variants: DisplayVariant[], n: number): DisplayVariant[] {
  const pool = scored(variants)
  if (!pool.length) return []
  const {median: med} = medianAndMad(pool.map((v) => v.score as number))
  return [...pool].sort((a, b) => Math.abs((b.score as number) - med) - Math.abs((a.score as number) - med)).slice(0, n)
}

/** Median of a non-empty numeric array. Assumes at least one element. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Median and median absolute deviation of a score set — the robust center/scale pair the score-extremes
 * caption reports against. `mad` is 0 when more than half the scores are identical (a degenerate scale);
 * callers should treat that as "deviations not reportable".
 */
export function medianAndMad(scores: number[]): {median: number; mad: number} {
  if (!scores.length) return {median: 0, mad: 0}
  const med = median(scores)
  return {median: med, mad: median(scores.map((s) => Math.abs(s - med)))}
}

/**
 * Signed distance of a score from the median in MAD units ("N deviations from median"), for the
 * score-extremes row caption. Null when the scale is degenerate (`mad` 0), where the count is meaningless.
 */
export function deviationsFromMedian(score: number, spread: {median: number; mad: number}): number | null {
  return spread.mad === 0 ? null : (score - spread.median) / spread.mad
}
