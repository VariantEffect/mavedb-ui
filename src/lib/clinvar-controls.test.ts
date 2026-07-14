import {describe, expect, test} from 'vitest'

import {clinicalSignificanceColor} from '@/lib/clinvar-controls'

const PATHOGENIC = 'var(--color-badge-pathogenic)'
const BENIGN = 'var(--color-badge-benign)'

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
