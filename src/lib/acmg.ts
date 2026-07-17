/**
 * The clinical bridge of the calibration layer: the ACMG functional-evidence vocabulary that translates
 * an assay's functional impact into clinical evidence. `PS3`/`BS3` are the ACMG functional-evidence
 * criteria; the strength ladder and point values are the ACMG/ClinGen SVI (Bayesian points) system.
 * Kept dependency-light (schema types only) so read-side surfaces can import it without pulling in the
 * calibration container's axios/histogram dependencies.
 */

import {components} from '@/schema/openapi'
import type {KeySection} from '@/composables/use-key-drawer'

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
 * The two ACMG functional-evidence criteria with their Key-drawer glosses, keyed by criterion code so the
 * drawer labels are the very constants the evidence tags render — they can't drift. Pathogenic first
 * (display order).
 */
export const ACMG_CRITERIA: Record<string, {label: string; definition: string}> = {
  [PATHOGENIC_CRITERION]: {
    label: PATHOGENIC_CRITERION,
    definition: 'Functional evidence supporting a pathogenic classification.'
  },
  [BENIGN_CRITERION]: {
    label: BENIGN_CRITERION,
    definition: 'Functional evidence supporting a benign classification.'
  }
}

export const ACMG_KEY_SECTION: KeySection = {
  id: 'acmg',
  title: 'ACMG functional evidence',
  gloss: 'How the functional result maps onto clinical-classification evidence.',
  terms: [
    ...Object.values(ACMG_CRITERIA),
    {label: 'Evidence strength', definition: 'How much weight the evidence carries: supporting → moderate → strong → very strong.'},
    {label: 'OddsPath', definition: 'The odds of pathogenicity implied by the score; sets the evidence strength.'}
  ]
}

export function formatEvidenceCode(
  classification: ScoreCalibrationFunctionalClassification | null | undefined
): string {
  if (!classification?.acmgClassification?.evidenceStrength) return ''
  const criterion = classification.acmgClassification.criterion
  const strength = classification.acmgClassification.evidenceStrength.toUpperCase()
  return `${criterion}_${strength}`
}
