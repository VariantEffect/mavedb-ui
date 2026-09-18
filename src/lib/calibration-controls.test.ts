import {describe, expect, it} from 'vitest'

import {
  calibrationControlStatusLabel,
  parseControlsCsv,
  phiAcknowledgmentError,
  CALIBRATION_CONTROL_STATUS_OPTIONS
} from './calibration-controls'

describe('calibrationControlStatusLabel', () => {
  it('title-cases known statuses', () => {
    expect(calibrationControlStatusLabel('pathogenic')).toBe('Pathogenic')
    expect(calibrationControlStatusLabel('benign')).toBe('Benign')
  })

  it('returns an empty string for nullish input', () => {
    expect(calibrationControlStatusLabel(null)).toBe('')
    expect(calibrationControlStatusLabel(undefined)).toBe('')
  })
})

describe('CALIBRATION_CONTROL_STATUS_OPTIONS', () => {
  it('offers exactly the two ACMG poles', () => {
    expect(CALIBRATION_CONTROL_STATUS_OPTIONS).toEqual([
      {label: 'Pathogenic', value: 'pathogenic'},
      {label: 'Benign', value: 'benign'}
    ])
  })
})

describe('parseControlsCsv', () => {
  it('parses a variant_urn CSV', () => {
    const preview = parseControlsCsv('variant_urn,clinical_status\nurn:mavedb:00000001-a-1#1,pathogenic\nurn:mavedb:00000001-a-1#2,benign\n')
    expect(preview.errors).toEqual([])
    expect(preview.variantColumn).toBe('variant_urn')
    expect(preview.rows).toEqual([
      {variant: 'urn:mavedb:00000001-a-1#1', variantColumn: 'variant_urn', clinicalStatus: 'pathogenic'},
      {variant: 'urn:mavedb:00000001-a-1#2', variantColumn: 'variant_urn', clinicalStatus: 'benign'}
    ])
  })

  it('is case-insensitive on headers and status values, and trims whitespace', () => {
    const preview = parseControlsCsv('Variant_URN, Clinical_Status\n urn:x#1 , PATHOGENIC \n')
    expect(preview.errors).toEqual([])
    expect(preview.variantColumn).toBe('variant_urn')
    expect(preview.rows).toEqual([{variant: 'urn:x#1', variantColumn: 'variant_urn', clinicalStatus: 'pathogenic'}])
  })

  it('prefers variant_urn over hgvs columns', () => {
    const preview = parseControlsCsv('hgvs_pro,variant_urn,clinical_status\np.Arg1Cys,urn:x#1,benign\n')
    expect(preview.variantColumn).toBe('variant_urn')
    expect(preview.rows[0].variant).toBe('urn:x#1')
  })

  it('falls back to hgvs_nt, then hgvs_pro, when no variant_urn column is present', () => {
    expect(parseControlsCsv('hgvs_nt,clinical_status\nc.1A>G,benign\n').variantColumn).toBe('hgvs_nt')
    expect(parseControlsCsv('hgvs_pro,clinical_status\np.Met1?,benign\n').variantColumn).toBe('hgvs_pro')
  })

  it('flags an unrecognized status but still previews the row', () => {
    const preview = parseControlsCsv('variant_urn,clinical_status\nurn:x#1,likely_pathogenic\n')
    expect(preview.rows).toEqual([{variant: 'urn:x#1', variantColumn: 'variant_urn', clinicalStatus: null}])
    expect(preview.errors.join(' ')).toContain('likely_pathogenic')
  })

  it('errors when the clinical_status column is missing', () => {
    const preview = parseControlsCsv('variant_urn,disease\nurn:x#1,Brugada\n')
    expect(preview.rows).toEqual([])
    expect(preview.errors.join(' ')).toContain('clinical_status')
  })

  it('errors when no variant column is present', () => {
    const preview = parseControlsCsv('clinical_status\npathogenic\n')
    expect(preview.variantColumn).toBeNull()
    expect(preview.errors.join(' ')).toMatch(/variant_urn/)
  })

  it('flags unexpected columns', () => {
    const preview = parseControlsCsv('variant_urn,clinical_status,notes\nurn:x#1,benign,hello\n')
    expect(preview.errors.join(' ')).toContain('notes')
  })

  it('drops a row missing its status and reports it', () => {
    const preview = parseControlsCsv('variant_urn,clinical_status\nurn:x#1,\nurn:x#2,benign\n')
    expect(preview.rows).toEqual([{variant: 'urn:x#2', variantColumn: 'variant_urn', clinicalStatus: 'benign'}])
    expect(preview.errors.join(' ')).toContain('urn:x#1')
  })

  it('reports a file with a header but no data rows', () => {
    const preview = parseControlsCsv('variant_urn,clinical_status\n')
    expect(preview.rows).toEqual([])
    expect(preview.errors.join(' ')).toContain('no control rows')
  })

  it('reports an empty file', () => {
    expect(parseControlsCsv('').errors.join(' ')).toContain('no header row')
  })
})

describe('phiAcknowledgmentError', () => {
  it('requires acknowledgment for a published calibration with unacknowledged controls', () => {
    expect(phiAcknowledgmentError({hasControls: true, isPrivate: false, controlsNotPhi: null})).not.toBeNull()
    expect(phiAcknowledgmentError({hasControls: true, isPrivate: false, controlsNotPhi: false})).not.toBeNull()
  })

  it('allows saving once acknowledged', () => {
    expect(phiAcknowledgmentError({hasControls: true, isPrivate: false, controlsNotPhi: true})).toBeNull()
  })

  it('does not gate private drafts', () => {
    expect(phiAcknowledgmentError({hasControls: true, isPrivate: true, controlsNotPhi: null})).toBeNull()
  })

  it('does not gate calibrations without controls', () => {
    expect(phiAcknowledgmentError({hasControls: false, isPrivate: false, controlsNotPhi: null})).toBeNull()
  })
})
