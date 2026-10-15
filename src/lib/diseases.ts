/**
 * @fileoverview
 * Disease-term helpers for calibrations. Disease is served as a GA4GH `MappableConcept` (MONDO-coded)
 * and edited as a lightweight `{code, label}` selection. The backend stores disease non-null and
 * defaults an unspecified disease to the generic "disease or disorder" root; that generic term is
 * surfaced explicitly in the editor and viewer rather than hidden.
 */

import {components} from '@/schema/openapi'

export type DiseaseConcept = components['schemas']['MappableConcept']

/** The MONDO "disease or disorder" root — the backend's default when no specific disease is chosen. */
export const MONDO_GENERIC_CODE = 'MONDO:0000001'
export const MONDO_GENERIC_LABEL = 'disease or disorder'

/** A lightweight disease selection the editor holds for display; only the `code` is sent on save. */
export interface DraftDisease {
  code: string
  label: string
}

/** The generic disease term, used as the explicit default for a calibration with no specific disease. */
export const GENERIC_DISEASE: DraftDisease = {code: MONDO_GENERIC_CODE, label: MONDO_GENERIC_LABEL}

/** Convert a served disease MappableConcept to the editor's `{code, label}` shape; null when it carries no code. */
export function conceptToDraftDisease(concept: DiseaseConcept | null | undefined): DraftDisease | null {
  const code = concept?.primaryCoding?.code
  if (!code) return null
  return {code, label: concept?.name || code}
}

/**
 * Coerce a disease value — a served MappableConcept, an existing draft selection, or nothing — into the
 * editor's `{code, label}`, defaulting to the generic term. The draft always holds a term (never null),
 * so the default is surfaced explicitly rather than shown as an empty field.
 */
export function toDraftDisease(value: DiseaseConcept | DraftDisease | null | undefined): DraftDisease {
  if (value && ('primaryCoding' in value || 'conceptType' in value)) {
    return conceptToDraftDisease(value as DiseaseConcept) ?? {...GENERIC_DISEASE}
  }
  const draft = value as DraftDisease | null | undefined
  return draft?.code ? {code: draft.code, label: draft.label} : {...GENERIC_DISEASE}
}

/**
 * Display label for a served disease concept (including the generic term); null only when absent.
 * Shows the MONDO code alongside the name, matching the editor's autocomplete, so the term a
 * calibration was saved with is verifiable against the ontology.
 */
export function diseaseDisplayLabel(concept: DiseaseConcept | null | undefined): string | null {
  if (!concept) return null
  const code = concept.primaryCoding?.code
  if (!concept.name) return code ?? null
  return code ? `${concept.name} (${code})` : concept.name
}
