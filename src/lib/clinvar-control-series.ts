/**
 * @fileoverview
 * How the score-set histogram bins a ClinVar {@link ClinvarControlPlacement} into a single filtered series.
 *
 * This is the histogram's clinical control visualization of placements ({@link module:clinvar-control-placement}):
 * Given a ClinVar placement, this module answers which of the four clinical histogram series it belongs to, or null
 * if it is excluded by the user's filters.
 *
 */

import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar-controls'
import type {ClinvarControlPlacement} from '@/lib/clinvar-control-placement'

const isPathogenic = (significance: string) => PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isBenign = (significance: string) => BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const isDirectional = (significance: string) => isPathogenic(significance) || isBenign(significance)
const isConflicting = (significance: string) => CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)
const starsOf = (reviewStatus: string) => CLINVAR_REVIEW_STATUS_STARS[reviewStatus] ?? -1

/** The clinical-control histogram series a variant can be placed in — exactly one, or none. */
export type ClinvarControlSeriesKey = 'pathogenic' | 'benign' | 'uncertain' | 'conflicting'

/** How the histogram should read a placement into a series: the soft-conflict fold, the selection, the star gate. */
export interface ControlSeriesOptions {
  softConflictsEnabled: boolean
  /** The significances the user has selected to include; membership gates on the *representative's* own value. */
  selectedSignificances: string[]
  /** Minimum review-status stars the representative must clear. */
  minStars: number
}

/** Map a directional representative to its aggregate series, gated on it being a selected significance. */
function directionalSeries(representative: string, selected: string[]): ClinvarControlSeriesKey | null {
  if (!selected.includes(representative)) return null
  if (isPathogenic(representative)) return 'pathogenic'
  return isBenign(representative) ? 'benign' : null
}

/** Map an uncertain representative (VUS or Conflicting) to its series, gated on it being selected. */
function uncertainSeries(representative: string, selected: string[]): ClinvarControlSeriesKey | null {
  if (!selected.includes(representative)) return null
  if (UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS.includes(representative)) return 'uncertain'
  return isConflicting(representative) ? 'conflicting' : null
}

/**
 * The single clinical-control series a placement belongs to — or null (excluded). **Never two:** membership is
 * fixed by the placement's representative call, so a variant is placed once, not once per granularity filter it
 * happens to intersect (this guarantees we don't "double count" controls).
 *
 *   - no placement / hard discordance → null (no representative; never a valid home);
 *   - representative below `minStars` → null (the star gate is on the *representative*, not "any winning call");
 *   - soft conflict (a directional lean beside an uncertain/Conflicting record) → its directional series, but only
 *     while `softConflictsEnabled`; off, it is excluded so the uncertain series stay genuinely uncertain;
 *   - a pure uncertain representative (VUS / lone Conflicting) → its uncertain series, but only while
 *     `softConflictsEnabled` is OFF (the soft-fold and uncertain-series are mutually exclusive modes);
 *   - a clean or concordant directional representative → its directional series.
 *
 * `selectedSignificances` gates on the representative's own significance, so e.g. a variant whose representative
 * is `Pathogenic` drops out when only `Likely pathogenic` is selected.
 */
export function resolveControlSeries(
  placement: ClinvarControlPlacement | null | undefined,
  opts: ControlSeriesOptions
): ClinvarControlSeriesKey | null {
  if (!placement || placement.discordance === 'hard') return null
  if (starsOf(placement[DEFAULT_CLNREVSTAT_FIELD]) < opts.minStars) return null

  const representative = placement[DEFAULT_CLNSIG_FIELD]
  // soft conflict: place by the directional lean, but only while the soft-fold is on.
  if (placement.discordance === 'soft') {
    return opts.softConflictsEnabled ? directionalSeries(representative, opts.selectedSignificances) : null
  }
  // none/concordant: place by the representative's own bucket.
  if (isDirectional(representative)) {
    return directionalSeries(representative, opts.selectedSignificances)
  }
  // A pure uncertain representative shows only in the uncertain-series mode.
  return opts.softConflictsEnabled ? null : uncertainSeries(representative, opts.selectedSignificances)
}
