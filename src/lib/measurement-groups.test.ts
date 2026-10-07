import {describe, expect, it} from 'vitest'

import {
  buildMeasurementGroups,
  groupSubject,
  hasMixedLevels,
  indirectMeasurementNotice,
  type MeasurementGroup,
  searchPreview,
  shortHgvs,
  tablePreview
} from '@/lib/measurement-groups'
import type {MeasurementRelationship} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

// Minimal measurement factory — only the fields the grouping reads.
function m(
  scoreSetUrn: string,
  relationship: MeasurementRelationship = 'direct',
  assayLevelHgvs: string | null = null
): AlleleMeasurement {
  return {
    variantUrn: `${scoreSetUrn}#1`,
    scoreSetUrn,
    scoreSetTitle: scoreSetUrn,
    relationship,
    assayLevelHgvs,
    isCurrent: true
  } as AlleleMeasurement
}

const P = 'NP_000537.3:p.Arg175His'

describe('buildMeasurementGroups', () => {
  it('groups by relationship in direct → protein → nucleotide order, preserving API order within', () => {
    const groups = buildMeasurementGroups([
      m('urn:mavedb:00000002-a-1', 'nucleotide_encoding'),
      m('urn:mavedb:00000003-a-1', 'protein_consequence', P),
      m('urn:mavedb:00000001-a-1'),
      m('urn:mavedb:00000004-a-1', 'protein_consequence', P)
    ])

    expect(groups.map((g) => g.relationship)).toEqual(['direct', 'protein_consequence', 'nucleotide_encoding'])
    expect(groups[1].measurements.map((x) => x.scoreSetUrn)).toEqual([
      'urn:mavedb:00000003-a-1',
      'urn:mavedb:00000004-a-1'
    ])
  })

  it('omits empty groups', () => {
    const groups = buildMeasurementGroups([m('urn:mavedb:00000001-a-1')])

    expect(groups.map((g) => g.relationship)).toEqual(['direct'])
  })

  it('names the shared HGVS for indirect groups only, and only when every member shares it', () => {
    const [direct, protein, nucleotide] = buildMeasurementGroups([
      m('urn:mavedb:00000001-a-1', 'direct', 'NC_000017.11:g.1A>G'),
      m('urn:mavedb:00000002-a-1', 'protein_consequence', P),
      m('urn:mavedb:00000003-a-1', 'nucleotide_encoding', 'NM_1:c.1A>G'),
      m('urn:mavedb:00000004-a-1', 'nucleotide_encoding', 'NM_1:c.3G>A')
    ])

    expect(direct.hgvs).toBeNull()
    expect(protein.hgvs).toBe(P)
    expect(nucleotide.hgvs).toBeNull()
  })
})

describe('groupSubject', () => {
  const group = (relationship: MeasurementRelationship, hgvs: string | null = null) => ({
    relationship,
    hgvs,
    measurements: []
  })

  it('names each relationship from a nucleotide-change page', () => {
    expect(groupSubject(group('direct'), false)).toBe('this exact nucleotide change')
    expect(groupSubject(group('protein_consequence'), false)).toBe('the protein change it encodes')
    expect(groupSubject(group('nucleotide_encoding'), false)).toBe(
      'other nucleotide changes that encode the same protein change'
    )
  })

  it('is singular when every member measured one named nucleotide change', () => {
    expect(groupSubject(group('nucleotide_encoding', 'NM_000059.4:c.6953G>A'), false)).toBe(
      'another nucleotide change that encodes the same protein change'
    )
  })

  it('names nucleotide measurements as encodings from a protein-change page', () => {
    expect(groupSubject(group('nucleotide_encoding'), true)).toBe('nucleotide changes that encode this protein change')
    expect(groupSubject(group('nucleotide_encoding', 'NM_000059.4:c.6953G>A'), true)).toBe(
      'a nucleotide change that encodes this protein change'
    )
  })
})

describe('shortHgvs', () => {
  it('drops the reference-sequence prefix', () => {
    expect(shortHgvs(P)).toBe('p.Arg175His')
    expect(shortHgvs('p.Arg175His')).toBe('p.Arg175His')
  })
})

function direct(count: number): MeasurementGroup {
  const measurements = Array.from({length: count}, (_, i) => m(`urn:mavedb:0000000${i}-a-1`))
  return {relationship: 'direct', hgvs: null, measurements}
}

describe('hasMixedLevels', () => {
  it('is false when every member shares a level bucket, cdna and genomic included', () => {
    const group = direct(2)
    group.measurements[0].assayLevel = 'cdna'
    group.measurements[1].assayLevel = 'genomic'
    expect(hasMixedLevels(group)).toBe(false)
  })

  it('is true when nucleotide and amino-acid measurements share a group', () => {
    const group = direct(2)
    group.measurements[1].assayLevel = 'protein'
    expect(hasMixedLevels(group)).toBe(true)
  })
})

describe('tablePreview', () => {
  it('shows a group in full when truncating would hide fewer than three', () => {
    expect(tablePreview(direct(7), {expanded: false, selectedUrn: null})).toEqual({
      visible: direct(7).measurements,
      hiddenCount: 0
    })
  })

  it('previews the top five behind a count of the rest', () => {
    const {visible, hiddenCount} = tablePreview(direct(8), {expanded: false, selectedUrn: null})
    expect(visible).toHaveLength(5)
    expect(hiddenCount).toBe(3)
  })

  it('keeps a selected measurement beyond the preview visible, out of the hidden count', () => {
    const group = direct(9)
    const selected = group.measurements[7]
    const {visible, hiddenCount} = tablePreview(group, {expanded: false, selectedUrn: selected.variantUrn})
    expect(visible).toEqual([...group.measurements.slice(0, 5), selected])
    expect(hiddenCount).toBe(3)
  })

  it('shows everything once expanded', () => {
    expect(tablePreview(direct(9), {expanded: true, selectedUrn: null}).hiddenCount).toBe(0)
  })
})

describe('searchPreview', () => {
  it('truncates only when it would hide at least two', () => {
    expect(searchPreview(direct(4), 3)).toHaveLength(4)
    expect(searchPreview(direct(5), 3)).toHaveLength(3)
  })
})

describe('indirectMeasurementNotice', () => {
  it('is null for a direct measurement', () => {
    expect(indirectMeasurementNotice('direct', false, null)).toBeNull()
    expect(indirectMeasurementNotice(undefined, false, null)).toBeNull()
  })

  it('names the measured protein change by its short HGVS', () => {
    expect(indirectMeasurementNotice('protein_consequence', false, P)?.lead).toBe(
      'Measured as the protein change your variant encodes (p.Arg175His).'
    )
  })

  it('words a nucleotide encoding from each side of the page', () => {
    expect(indirectMeasurementNotice('nucleotide_encoding', true, null)?.lead).toBe(
      'Measured on a nucleotide change that encodes this protein change.'
    )
    expect(indirectMeasurementNotice('nucleotide_encoding', false, null)?.lead).toBe(
      'Measured on a different nucleotide change that encodes the same protein change.'
    )
  })
})
