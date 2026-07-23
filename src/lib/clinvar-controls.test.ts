import {describe, expect, test} from 'vitest'

import {
  clinicalSignificanceColor,
  clinvarVersionKey,
  enumerateUnderlyingClinvar,
  isUncertainSignificance,
  type MeasurementClinvarRecord,
  resolveClinvarRecords,
  selectClinvar
} from '@/lib/clinvar-controls'
import type {components} from '@/schema/openapi'

type ClinvarAnnotation = components['schemas']['ClinvarAnnotation']

const PATHOGENIC = 'var(--color-badge-pathogenic)'
const BENIGN = 'var(--color-badge-benign)'

// A ClinVar annotation with sensible defaults; only the fields a test cares about need overriding.
function clinvar(overrides: Partial<ClinvarAnnotation> & {clinvarAlleleId: string}): ClinvarAnnotation {
  return {
    clinicalSignificance: 'Uncertain significance',
    clinicalReviewStatus: 'criteria provided, single submitter',
    clinvarVariationId: null,
    dbVersion: '03_2024',
    ...overrides
  }
}

/** The ClinVar record ids in a resolved/enumerated list, in returned order. */
const ids = (list: MeasurementClinvarRecord[]) =>
  list.map((item) => item.clinvar.clinvarVariationId ?? item.clinvar.clinvarAlleleId)

/** Enumerate the underlying popover records from a raw annotations map (the real walk → project path). */
const enumerate = (
  annotations: Parameters<typeof resolveClinvarRecords>[0],
  alleles: Parameters<typeof resolveClinvarRecords>[1],
  version?: string | null
) => enumerateUnderlyingClinvar(resolveClinvarRecords(annotations, alleles, null, version))

describe('clinicalSignificanceColor', () => {
  test.each([
    ['Pathogenic', PATHOGENIC],
    ['Likely pathogenic', PATHOGENIC],
    ['Pathogenic/Likely pathogenic', PATHOGENIC],
    ['Benign', BENIGN],
    ['Likely benign', BENIGN],
    ['Benign/Likely benign', BENIGN]
  ])('%s → directional color', (significance, color) => {
    expect(clinicalSignificanceColor(significance)).toBe(color)
  })

  test.each([
    'Uncertain significance',
    'Conflicting classifications of pathogenicity',
    'Conflicting interpretations of pathogenicity',
    '-',
    '',
    null,
    undefined
  ])('%s → undefined (caller keeps its default color)', (significance) => {
    expect(clinicalSignificanceColor(significance)).toBeUndefined()
  })

  test('case-insensitive', () => {
    expect(clinicalSignificanceColor('PATHOGENIC')).toBe(PATHOGENIC)
    expect(clinicalSignificanceColor('likely benign')).toBe(BENIGN)
  })
})

describe('resolveClinvarRecords — the single walk', () => {
  test('nullish annotations → empty', () => {
    expect(resolveClinvarRecords(null, null, null)).toEqual([])
    expect(resolveClinvarRecords(undefined, undefined, undefined)).toEqual([])
  })

  test('keeps `-` records (tagged unclassified), skips alleles with no record', () => {
    const annotations = {
      a: {clinvar: [clinvar({clinvarAlleleId: 'a', clinicalSignificance: '-'})]},
      b: {clinvar: [clinvar({clinvarAlleleId: 'b', clinicalSignificance: 'Pathogenic'})]},
      c: {clinvar: null}
    }
    const records = resolveClinvarRecords(annotations, {}, null)
    expect(ids(records)).toEqual(['a', 'b'])
    expect(records.find((r) => r.digest === 'a')?.classified).toBe(false)
    expect(records.find((r) => r.digest === 'b')?.classified).toBe(true)
  })

  test('tags onAssayed against the measured digest and pairs HGVS from the sidecar', () => {
    const annotations = {
      a: {clinvar: [clinvar({clinvarAlleleId: 'a', clinicalSignificance: 'Pathogenic'})]},
      b: {clinvar: [clinvar({clinvarAlleleId: 'b', clinicalSignificance: 'Benign'})]}
    }
    const records = resolveClinvarRecords(annotations, {a: {hgvs: 'c.10A>G'}}, 'a')
    expect(records.find((r) => r.digest === 'a')).toMatchObject({onAssayed: true, hgvs: 'c.10A>G'})
    expect(records.find((r) => r.digest === 'b')).toMatchObject({onAssayed: false, hgvs: null})
  })
})

describe('enumerateUnderlyingClinvar — the popover projection', () => {
  test('nullish annotations → empty', () => {
    expect(enumerate(null, null)).toEqual([])
    expect(enumerate(undefined, undefined)).toEqual([])
  })

  test('keeps `-` records — only the fold drops them — sorted after classified calls', () => {
    const annotations = {
      a: {clinvar: [clinvar({clinvarAlleleId: 'a', clinicalSignificance: '-'})]},
      b: {clinvar: [clinvar({clinvarAlleleId: 'b', clinicalSignificance: 'Pathogenic'})]},
      c: {clinvar: null}
    }
    // b (directional) leads; a (`-`, non-directional) trails; c has no record.
    expect(ids(enumerate(annotations, {}))).toEqual(['b', 'a'])
  })

  test('keeps a distinct related sibling as context beside the measured allele`s own call', () => {
    const annotations = {
      assayed: {clinvar: [clinvar({clinvarAlleleId: 'assayed', clinicalSignificance: 'Pathogenic'})]},
      sib: {clinvar: [clinvar({clinvarAlleleId: 'sib', clinicalSignificance: 'Uncertain significance'})]}
    }
    // The measured allele's own call is the headline; the genuinely distinct sibling is offered as context.
    expect(ids(enumerateUnderlyingClinvar(resolveClinvarRecords(annotations, {}, 'assayed')))).toEqual(['sib'])
  })

  test('the same record under a non-assayed reference frame is not "underlying" the assayed call', () => {
    const annotations = {
      // One ClinVar record (variation V1), annotated on the measured protein allele `p` and again on its
      // genomic frame `g`. `g` is not a distinct sibling — it's the same record you're already looking at.
      p: {clinvar: [clinvar({clinvarAlleleId: 'x', clinvarVariationId: 'V1'})]},
      g: {clinvar: [clinvar({clinvarAlleleId: 'x', clinvarVariationId: 'V1'})]}
    }
    expect(ids(enumerateUnderlyingClinvar(resolveClinvarRecords(annotations, {}, 'p')))).toEqual([])
  })

  test('an unclassified (`-`) assayed record does not win — siblings still surface', () => {
    const annotations = {
      assayed: {clinvar: [clinvar({clinvarAlleleId: 'assayed', clinicalSignificance: '-'})]},
      sib: {clinvar: [clinvar({clinvarAlleleId: 'sib', clinicalSignificance: 'Uncertain significance'})]}
    }
    // A `-` on the measured allele carries no call, so the fold projects from the sibling — which is underlying.
    expect(ids(enumerateUnderlyingClinvar(resolveClinvarRecords(annotations, {}, 'assayed')))).toEqual(['sib'])
  })

  test('keeps a projected headline`s source sibling (measured allele carries no record)', () => {
    const annotations = {
      assayed: {clinvar: null},
      sib: {clinvar: [clinvar({clinvarAlleleId: 'sib', clinicalSignificance: 'Pathogenic'})]}
    }
    // The nucleotide sibling the protein-level headline was projected from is still an underlying record.
    expect(ids(enumerateUnderlyingClinvar(resolveClinvarRecords(annotations, {}, 'assayed')))).toEqual(['sib'])
  })

  test('sorts directional calls ahead of VUS, then by descending star rating', () => {
    const annotations = {
      vus: {clinvar: [clinvar({clinvarAlleleId: 'vus', clinicalSignificance: 'Uncertain significance'})]},
      lp1: {
        clinvar: [
          clinvar({
            clinvarAlleleId: 'lp1',
            clinicalSignificance: 'Likely pathogenic',
            clinicalReviewStatus: 'criteria provided, single submitter'
          })
        ]
      },
      p3: {
        clinvar: [
          clinvar({
            clinvarAlleleId: 'p3',
            clinicalSignificance: 'Pathogenic',
            clinicalReviewStatus: 'reviewed by expert panel'
          })
        ]
      }
    }
    // p3 (directional, 3★) → lp1 (directional, 1★) → vus (non-directional, last).
    expect(ids(enumerate(annotations, {}))).toEqual(['p3', 'lp1', 'vus'])
  })

  test('selects by version and dedupes by ClinVar record id (prefers a coding HGVS label)', () => {
    const annotations = {
      cDigest: {
        clinvar: [
          clinvar({clinvarAlleleId: 'x', clinvarVariationId: '123', clinicalSignificance: 'Benign', dbVersion: '03_2024'}),
          clinvar({clinvarAlleleId: 'x', clinvarVariationId: '123', clinicalSignificance: 'Pathogenic', dbVersion: '06_2024'})
        ]
      },
      gDigest: {
        clinvar: [clinvar({clinvarAlleleId: 'x', clinvarVariationId: '123', clinicalSignificance: 'Benign', dbVersion: '03_2024'})]
      }
    }
    const alleles = {cDigest: {hgvs: 'NM_1.2:c.10A>G'}, gDigest: {hgvs: 'NC_1.11:g.100A>G'}}
    // Both digests select the 03_2024 record (same variation id) → one entry, coding HGVS wins as the label.
    const result = enumerate(annotations, alleles, '03_2024')
    expect(result).toHaveLength(1)
    expect(result[0].hgvs).toBe('NM_1.2:c.10A>G')
    expect(result[0].clinvar.clinicalSignificance).toBe('Benign')
    // Pinning the newer release selects the pathogenic record from the allele that carries it.
    const newer = enumerate(annotations, alleles, '06_2024')
    expect(newer).toHaveLength(1)
    expect(newer[0].clinvar.clinicalSignificance).toBe('Pathogenic')
  })
})

describe('clinvarVersionKey — MM_YYYY ordered by year then month', () => {
  test.each([
    ['06_2024', '03_2024', true], // same year, later month is newer
    ['01_2024', '12_2020', true], // the string-comparison trap: Jan 2024 beats Dec 2020
    ['12_2020', '01_2024', false],
    ['11_2023', '12_2020', true]
  ])('%s newer than %s → %s', (a, b, aNewer) => {
    expect(clinvarVersionKey(a) > clinvarVersionKey(b)).toBe(aNewer)
  })

  test('unrecognized versions sort to the bottom', () => {
    expect(clinvarVersionKey('clinvar_2025')).toBe(-1)
    expect(clinvarVersionKey('01_2000') > clinvarVersionKey('garbage')).toBe(true)
  })
})

describe('selectClinvar — the release fallback', () => {
  test('with no version pinned, returns the newest release (not the string-max)', () => {
    // Old string comparison picked 12_2020 ('1' > '0'); the parsed key must pick 01_2024.
    const annotations = [
      clinvar({clinvarAlleleId: 'x', clinicalSignificance: 'Benign', dbVersion: '12_2020'}),
      clinvar({clinvarAlleleId: 'x', clinicalSignificance: 'Pathogenic', dbVersion: '01_2024'})
    ]
    expect(selectClinvar(annotations)?.dbVersion).toBe('01_2024')
    expect(selectClinvar(annotations)?.clinicalSignificance).toBe('Pathogenic')
  })

  test('with a version pinned, returns the exact match or null', () => {
    const annotations = [clinvar({clinvarAlleleId: 'x', dbVersion: '03_2024'})]
    expect(selectClinvar(annotations, '03_2024')?.dbVersion).toBe('03_2024')
    expect(selectClinvar(annotations, '06_2024')).toBeNull()
  })
})

describe('isUncertainSignificance', () => {
  test.each([
    ['Uncertain significance', true],
    ['Conflicting classifications of pathogenicity', true],
    ['Conflicting interpretations of pathogenicity', true],
    ['Pathogenic', false],
    ['Likely benign', false]
  ])('%s → %s', (significance, expected) => {
    expect(isUncertainSignificance(significance)).toBe(expected)
  })
})
