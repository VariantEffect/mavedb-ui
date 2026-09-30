/**
 * @fileoverview
 * Calibration controls: the variant → clinical-status pairs that serve as empirical ground truth
 * behind a score calibration. This module holds the presentational vocabulary plus the pure logic
 * the editor relies on — a client-side preview parser for the controls CSV and the PHI-acknowledgment
 * gate — kept out of the components so they stay thin and unit-testable.
 *
 * The controls CSV mirrors the `classes_file` contract: a variant column (`variant_urn`, `hgvs_nt`,
 * or `hgvs_pro`) plus a `clinical_status` column. The backend is the source of truth on save (it
 * resolves HGVS to URNs, rejects ambiguous matches, and checks score-set membership); this parser
 * only previews the upload and catches obvious structural mistakes before the round trip.
 */

import Papa from 'papaparse'

import {components} from '@/schema/openapi'

export type CalibrationControlStatus = components['schemas']['CalibrationControlStatus']
export type SavedCalibrationControl = components['schemas']['SavedCalibrationControl']

/** Variant identifier columns the controls CSV accepts, in the backend's resolution priority order. */
export const CALIBRATION_CONTROL_VARIANT_COLUMNS = ['variant_urn', 'hgvs_nt', 'hgvs_pro'] as const
export type CalibrationControlVariantColumn = (typeof CALIBRATION_CONTROL_VARIANT_COLUMNS)[number]

/** The clinical-status column name in the controls CSV. */
export const CALIBRATION_CONTROL_STATUS_COLUMN = 'clinical_status'

/** The two-tier ACMG poles a control may take. */
export const CALIBRATION_CONTROL_STATUSES: CalibrationControlStatus[] = ['pathogenic', 'benign']

/** Dropdown/legend options for the two statuses. */
export const CALIBRATION_CONTROL_STATUS_OPTIONS: {label: string; value: CalibrationControlStatus}[] =
  CALIBRATION_CONTROL_STATUSES.map((value) => ({label: calibrationControlStatusLabel(value), value}))

/** Human-readable label for a clinical status (e.g. `pathogenic` → `Pathogenic`). */
export function calibrationControlStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/** A single previewed control row, as read from the CSV before the backend resolves it. */
export interface ParsedControlRow {
  /** The variant identifier exactly as written in the chosen variant column. */
  variant: string
  /** Which variant column supplied {@link variant}. */
  variantColumn: CalibrationControlVariantColumn
  /** The normalized status, or null when the CSV value isn't a recognized status. */
  clinicalStatus: CalibrationControlStatus | null
}

/** Result of previewing a controls CSV client-side. */
export interface ControlsCsvPreview {
  /** Parsed rows carrying a variant identifier, in file order. */
  rows: ParsedControlRow[]
  /** Structural and row-level problems to surface before upload; empty when the file looks valid. */
  errors: string[]
  /** The variant column the file will be indexed by, or null when none is present. */
  variantColumn: CalibrationControlVariantColumn | null
}

/** Normalize a status cell the way the backend does: trimmed and lowercased. */
function normalizeStatus(value: unknown): CalibrationControlStatus | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  return (CALIBRATION_CONTROL_STATUSES as string[]).includes(normalized)
    ? (normalized as CalibrationControlStatus)
    : null
}

/**
 * Parse and preview a calibration controls CSV client-side.
 *
 * Detects the variant and status columns case-insensitively, normalizes statuses, and reports the
 * structural problems the backend would otherwise reject on save (missing/duplicate/unexpected
 * columns, no rows, unrecognized status values). Rows missing a variant identifier are dropped;
 * rows missing a status are dropped with an error, mirroring the backend's NA-status handling.
 */
export function parseControlsCsv(csvText: string): ControlsCsvPreview {
  const errors: string[] = []
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim()
  })

  const headers = (parsed.meta.fields ?? []).filter((h) => h.length > 0)
  if (headers.length === 0) {
    return {rows: [], errors: ['The file has no header row.'], variantColumn: null}
  }

  const lowerToActual = new Map<string, string>()
  for (const header of headers) {
    const key = header.toLowerCase()
    if (lowerToActual.has(key)) {
      errors.push(`Duplicate column: ${header}.`)
    } else {
      lowerToActual.set(key, header)
    }
  }

  const allowed = new Set<string>([...CALIBRATION_CONTROL_VARIANT_COLUMNS, CALIBRATION_CONTROL_STATUS_COLUMN])
  const unexpected = headers.filter((h) => !allowed.has(h.toLowerCase()))
  if (unexpected.length > 0) {
    errors.push(`Unexpected column(s): ${unexpected.join(', ')}.`)
  }

  const statusColumn = lowerToActual.get(CALIBRATION_CONTROL_STATUS_COLUMN)
  if (!statusColumn) {
    errors.push(`Missing required column: ${CALIBRATION_CONTROL_STATUS_COLUMN}.`)
  }

  const variantColumn =
    CALIBRATION_CONTROL_VARIANT_COLUMNS.find((c) => lowerToActual.has(c)) ?? null
  if (!variantColumn) {
    errors.push(`Missing a variant column — provide one of: ${CALIBRATION_CONTROL_VARIANT_COLUMNS.join(', ')}.`)
  }

  if (!statusColumn || !variantColumn) {
    return {rows: [], errors, variantColumn}
  }

  const variantHeader = lowerToActual.get(variantColumn)!
  const rows: ParsedControlRow[] = []
  const invalidStatuses = new Set<string>()

  for (const record of parsed.data) {
    const variant = String(record[variantHeader] ?? '').trim()
    const rawStatus = String(record[statusColumn] ?? '').trim()
    if (!variant && !rawStatus) continue // Fully-empty row.
    if (!variant) {
      errors.push('A row is missing its variant identifier.')
      continue
    }
    if (!rawStatus) {
      errors.push(`Row for ${variant} is missing a ${CALIBRATION_CONTROL_STATUS_COLUMN}.`)
      continue
    }

    const clinicalStatus = normalizeStatus(rawStatus)
    if (clinicalStatus === null) invalidStatuses.add(rawStatus)
    rows.push({variant, variantColumn, clinicalStatus})
  }

  if (invalidStatuses.size > 0) {
    errors.push(
      `Invalid ${CALIBRATION_CONTROL_STATUS_COLUMN} value(s): ${[...invalidStatuses].sort().join(', ')}. ` +
        `Allowed values are: ${CALIBRATION_CONTROL_STATUSES.join(', ')}.`
    )
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('The file has no control rows.')
  }

  return {rows, errors, variantColumn}
}

/**
 * The PHI-acknowledgment gate (#677). A calibration that carries controls may not be saved in a
 * non-private (published) state until the submitter has affirmed the controls contain no PHI. The
 * backend enforces this on publish; the editor surfaces it inline at save time. Returns the error
 * message when the box must be checked, or null when saving is allowed.
 */
export function phiAcknowledgmentError(params: {
  hasControls: boolean
  isPrivate: boolean
  controlsNotPhi: boolean | null | undefined
}): string | null {
  if (params.hasControls && !params.isPrivate && params.controlsNotPhi !== true) {
    return 'Confirm the control data contains no protected health information (PHI) before saving a published calibration.'
  }
  return null
}
