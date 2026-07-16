/**
 * The clinical bridge of the calibration layer: the ACMG functional-evidence vocabulary that translates
 * an assay's functional impact into clinical evidence. `PS3`/`BS3` are the ACMG functional-evidence
 * criteria; the strength ladder and point values are the ACMG/ClinGen SVI (Bayesian points) system.
 * Kept dependency-light (schema types only) so read-side surfaces can import it without pulling in the
 * calibration container's axios/histogram dependencies.
 */

import {components} from '@/schema/openapi'

type ScoreCalibrationFunctionalClassification =
  components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']

/** ACMG functional-evidence criteria: benign-supporting (BS3) and pathogenic-supporting (PS3). */
export const BENIGN_CRITERION = 'BS3'
export const PATHOGENIC_CRITERION = 'PS3'

/** Points each evidence-strength tier contributes on the ClinGen SVI (Bayesian) scale. */
export const EVIDENCE_STRENGTH_AS_POINTS = {
  VERY_STRONG: 8,
  STRONG: 4,
  MODERATE_PLUS: 3,
  MODERATE: 2,
  SUPPORTING: 1
}

/** The evidence-strength tiers, strongest first. */
export const EVIDENCE_STRENGTH = Object.keys(EVIDENCE_STRENGTH_AS_POINTS)

/**
 * Formats the ACMG evidence code from a functional classification's ACMG classification data.
 *
 * @param classification - A functional classification that may contain an `acmgClassification`
 *   with `criterion` (e.g. "PS3", "BS3") and `evidenceStrength` (e.g. "Strong", "Moderate").
 * @returns A formatted code like "PS3_STRONG", or an empty string if evidence data is missing.
 */
export function formatEvidenceCode(
  classification: ScoreCalibrationFunctionalClassification | null | undefined
): string {
  if (!classification?.acmgClassification?.evidenceStrength) return ''
  const criterion = classification.acmgClassification.criterion
  const strength = classification.acmgClassification.evidenceStrength.toUpperCase()
  return `${criterion}_${strength}`
}
