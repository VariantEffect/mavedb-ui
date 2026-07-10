import {describe, expect, it} from 'vitest'

import {groupAlleles, type GroupAllelesInput} from '@/lib/allele-grouping'
import type {components} from '@/schema/openapi'

type AlleleIdentity = components['schemas']['AlleleIdentity']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']

function vep(consequence: string): AlleleAnnotations {
  return {vep: {consequence}} as AlleleAnnotations
}

function run(overrides: Partial<GroupAllelesInput>) {
  return groupAlleles({
    alleles: {},
    annotations: {},
    pageClingenAlleleId: null,
    ...overrides
  })
}

describe('groupAlleles — projection pairing + confidence', () => {
  // Nucleotide (cdna) assay: the measured cdna folds into its pair's group with its genomic projection;
  // the protein apex is a deterministic projection, unpaired.
  const nucleotide: Record<string, AlleleIdentity> = {
    c: {level: 'cdna', hgvs: 'NM_x:c.6C>T', relation: null, derivation: 'authoritative', projectionOf: 'g'},
    g: {level: 'genomic', hgvs: 'NC_x:g.100C>T', relation: 'is_genomic_of', derivation: 'projection', projectionOf: 'c'},
    p: {level: 'protein', hgvs: 'NP_x:p.Leu2Phe', relation: 'translation_of', derivation: 'projection'}
  }

  it('collapses the measured c↔g pair into one group and keeps the apex separate', () => {
    const groups = run({alleles: nucleotide})
    expect(groups).toHaveLength(2)

    const [pair, apex] = groups
    // Measured pair floats to the top, carries both levels, and is labeled by the authoritative member.
    expect(pair.measured).toBe(true)
    expect(pair.derivation).toBe('authoritative')
    expect(pair.members.map((m) => m.level)).toEqual(['genomic', 'cdna'])

    expect(apex.measured).toBe(false)
    expect(apex.members).toHaveLength(1)
    expect(apex.derivation).toBe('projection')
  })

  // Protein assay: the protein apex is authoritative/measured; the nucleotide fan-out is candidate pairs.
  const protein: Record<string, AlleleIdentity> = {
    p: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, derivation: 'authoritative'},
    c1: {level: 'cdna', hgvs: 'NM_x:c.16C>G', relation: 'encodes', derivation: 'candidate', projectionOf: 'g1'},
    g1: {level: 'genomic', hgvs: 'NC_x:g.200C>G', relation: 'is_genomic_of', derivation: 'candidate', projectionOf: 'c1'},
    c2: {level: 'cdna', hgvs: 'NM_x:c.16C>A', relation: 'encodes', derivation: 'candidate', projectionOf: 'g2'},
    g2: {level: 'genomic', hgvs: 'NC_x:g.200C>A', relation: 'is_genomic_of', derivation: 'candidate', projectionOf: 'c2'}
  }

  it('keeps the apex measured and collapses each candidate hypothesis into one group', () => {
    const groups = run({alleles: protein})
    expect(groups).toHaveLength(3) // apex + 2 candidate pairs

    expect(groups[0].measured).toBe(true) // apex pinned first
    const candidates = groups.filter((g) => g.derivation === 'candidate')
    expect(candidates).toHaveLength(2)
    expect(candidates.every((g) => g.members.length === 2 && !g.measured)).toBe(true)
  })

  it('flags a projection pair whose annotations diverge instead of hiding the difference', () => {
    const groups = run({
      alleles: nucleotide,
      annotations: {c: vep('missense_variant'), g: vep('intron_variant'), p: vep('missense_variant')}
    })
    const pair = groups.find((g) => g.members.length === 2)!
    expect(pair.annotationsMatch).toBe(false)
  })

  it('treats a matching pair as one deduplicated block', () => {
    const groups = run({
      alleles: nucleotide,
      annotations: {c: vep('missense_variant'), g: vep('missense_variant')}
    })
    const pair = groups.find((g) => g.members.length === 2)!
    expect(pair.annotationsMatch).toBe(true)
  })

  it('leaves a projection-failed candidate (dangling projectionOf) as a one-member group', () => {
    const groups = run({
      alleles: {
        p: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, derivation: 'authoritative'},
        c1: {level: 'cdna', hgvs: 'NM_x:c.16C>G', relation: 'encodes', derivation: 'candidate', projectionOf: 'missing'}
      }
    })
    const candidate = groups.find((g) => g.derivation === 'candidate')!
    expect(candidate.members).toHaveLength(1)
  })

  // `measured` keys off derivation === 'authoritative', not relation == null: the defining allele AND any
  // non-member link both carry relation null, so a null-relation non-authoritative allele must NOT be pinned.
  it('does not flag a null-relation non-authoritative allele as measured', () => {
    const groups = run({
      alleles: {
        n: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, derivation: 'projection'}
      }
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].measured).toBe(false)
  })

  it('surfaces distinct linked CAIDs, excluding the page anchor', () => {
    const groups = run({
      alleles: {
        c: {level: 'cdna', hgvs: 'NM_x:c.6C>T', relation: null, clingenAlleleId: 'CA1', derivation: 'authoritative', projectionOf: 'g'},
        g: {level: 'genomic', hgvs: 'NC_x:g.100C>T', relation: 'is_genomic_of', clingenAlleleId: 'CA1', derivation: 'projection', projectionOf: 'c'}
      },
      pageClingenAlleleId: 'CA1'
    })
    // The shared CAID is the page anchor, so no outward link and the group is flagged page-root.
    expect(groups[0].pageRoot).toBe(true)
    expect(groups[0].clingenLinks).toEqual([])
  })
})
