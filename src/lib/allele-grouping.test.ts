import {describe, expect, it} from 'vitest'

import {
  type AlleleGroup,
  groupAlleles,
  mergeDetailAlleles,
  sharedReleases,
  titleMember,
  type GroupAllelesInput
} from '@/lib/allele-grouping'
import type {components} from '@/schema/openapi'

type AlleleIdentity = components['schemas']['AlleleIdentity']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type VariantDetail = components['schemas']['VariantDetail']

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
    c: {level: 'cdna', hgvs: 'NM_x:c.6C>T', relation: null, isFocus: true, projectionOf: 'g'},
    g: {
      level: 'genomic',
      hgvs: 'NC_x:g.100C>T',
      relation: 'coordinate_representation_of',
      isFocus: false,
      derivation: 'projection',
      projectionOf: 'c'
    },
    p: {level: 'protein', hgvs: 'NP_x:p.Leu2Phe', relation: 'translation_of', isFocus: false, derivation: 'projection'}
  }

  it('collapses the measured c↔g pair into one group and keeps the apex separate', () => {
    const groups = run({alleles: nucleotide})
    expect(groups).toHaveLength(2)

    const [pair, apex] = groups
    // Measured pair floats to the top and carries both levels; its confidence comes from the genomic
    // projection member (the focus/measured member has no derivation of its own).
    expect(pair.measured).toBe(true)
    expect(pair.derivation).toBe('projection')
    expect(pair.members.map((m) => m.level)).toEqual(['genomic', 'cdna'])

    expect(apex.measured).toBe(false)
    expect(apex.members).toHaveLength(1)
    expect(apex.derivation).toBe('projection')
  })

  // Protein assay: the protein apex is the focus/measured allele; the nucleotide fan-out is candidate pairs.
  const protein: Record<string, AlleleIdentity> = {
    p: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, isFocus: true},
    c1: {
      level: 'cdna',
      hgvs: 'NM_x:c.16C>G',
      relation: 'encodes',
      isFocus: false,
      derivation: 'candidate',
      projectionOf: 'g1'
    },
    g1: {
      level: 'genomic',
      hgvs: 'NC_x:g.200C>G',
      relation: 'coordinate_representation_of',
      isFocus: false,
      derivation: 'candidate',
      projectionOf: 'c1'
    },
    c2: {
      level: 'cdna',
      hgvs: 'NM_x:c.16C>A',
      relation: 'encodes',
      isFocus: false,
      derivation: 'candidate',
      projectionOf: 'g2'
    },
    g2: {
      level: 'genomic',
      hgvs: 'NC_x:g.200C>A',
      relation: 'coordinate_representation_of',
      isFocus: false,
      derivation: 'candidate',
      projectionOf: 'c2'
    }
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

  it('coalesces missing-vs-present annotations (missingness is not a difference)', () => {
    // Only the cdna member is annotated; the genomic member has nothing. This must NOT read as divergence.
    const groups = run({
      alleles: nucleotide,
      annotations: {c: vep('missense_variant')}
    })
    const pair = groups.find((g) => g.members.length === 2)!
    expect(pair.annotationsMatch).toBe(true)
    expect(pair.coalescedAnnotations?.vep?.consequence).toBe('missense_variant')
  })

  it('coalesces disjoint fields across levels into one block', () => {
    const groups = run({
      alleles: nucleotide,
      annotations: {
        c: {vep: {consequence: 'missense_variant'}},
        g: {gnomad: {alleleFrequency: 0.01}}
      } as unknown as Record<string, AlleleAnnotations>
    })
    const pair = groups.find((g) => g.members.length === 2)!
    expect(pair.annotationsMatch).toBe(true)
    expect(pair.coalescedAnnotations?.vep?.consequence).toBe('missense_variant')
    expect(pair.coalescedAnnotations?.gnomad?.alleleFrequency).toBe(0.01)
  })

  it('leaves a projection-failed candidate (dangling projectionOf) as a one-member group', () => {
    const groups = run({
      alleles: {
        p: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, isFocus: true},
        c1: {
          level: 'cdna',
          hgvs: 'NM_x:c.16C>G',
          relation: 'encodes',
          isFocus: false,
          derivation: 'candidate',
          projectionOf: 'missing'
        }
      }
    })
    const candidate = groups.find((g) => g.derivation === 'candidate')!
    expect(candidate.members).toHaveLength(1)
  })

  // `measured` keys off `isFocus`, not relation == null: the focus allele AND any non-member link both
  // carry relation null, so a null-relation non-focus allele must NOT be pinned.
  it('does not flag a null-relation non-focus allele as measured', () => {
    const groups = run({
      alleles: {
        n: {level: 'protein', hgvs: 'NP_x:p.Leu6Gly', relation: null, isFocus: false, derivation: 'projection'}
      }
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].measured).toBe(false)
  })

  it('surfaces distinct linked CAIDs, excluding the page anchor', () => {
    const groups = run({
      alleles: {
        c: {
          level: 'cdna',
          hgvs: 'NM_x:c.6C>T',
          relation: null,
          clingenAlleleId: 'CA1',
          isFocus: true,
          projectionOf: 'g'
        },
        g: {
          level: 'genomic',
          hgvs: 'NC_x:g.100C>T',
          relation: 'coordinate_representation_of',
          clingenAlleleId: 'CA1',
          isFocus: false,
          derivation: 'projection',
          projectionOf: 'c'
        }
      },
      pageClingenAlleleId: 'CA1'
    })
    // The shared CAID is the page anchor, so no outward link and the group is flagged page-root.
    expect(groups[0].pageRoot).toBe(true)
    expect(groups[0].clingenLinks).toEqual([])
  })
})

describe('titleMember', () => {
  it('leads a projection pair with its cDNA member', () => {
    const [pair] = run({
      alleles: {
        c: {level: 'cdna', hgvs: 'NM_x:c.6C>T', relation: null, isFocus: true, projectionOf: 'g'},
        g: {level: 'genomic', hgvs: 'NC_x:g.100C>T', relation: null, isFocus: false, projectionOf: 'c'}
      }
    })
    expect(titleMember(pair)?.hgvs).toBe('NM_x:c.6C>T')
  })

  it('falls back to protein, then the first member', () => {
    const [protein] = run({alleles: {p: {level: 'protein', hgvs: 'NP_x:p.Leu2Phe', relation: null, isFocus: true}}})
    expect(titleMember(protein)?.hgvs).toBe('NP_x:p.Leu2Phe')
    expect(titleMember({members: []})).toBeNull()
  })
})

describe('mergeDetailAlleles', () => {
  const identity = (overrides: Partial<AlleleIdentity>): AlleleIdentity =>
    ({level: 'cdna', hgvs: 'NM_x:c.1A>G', relation: null, isFocus: false, ...overrides}) as AlleleIdentity
  const detail = (alleles: Record<string, AlleleIdentity>, annotations: Record<string, AlleleAnnotations> = {}) =>
    ({alleles, annotations}) as unknown as VariantDetail

  it('unions alleles and annotations across details', () => {
    const merged = mergeDetailAlleles([detail({a: identity({})}, {a: vep('x')}), detail({b: identity({})})], null)
    expect(Object.keys(merged.alleles).sort()).toEqual(['a', 'b'])
    expect(merged.annotations).toEqual({a: vep('x')})
  })

  it("takes an allele's identity from the selected detail, whose focus it is relative to", () => {
    const other = detail({a: identity({derivation: 'candidate'})})
    const selected = detail({a: identity({derivation: 'projection', isFocus: true})})
    expect(mergeDetailAlleles([other, selected], selected).alleles.a).toMatchObject({
      derivation: 'projection',
      isFocus: true
    })
  })

  it('takes focus from the selected detail alone', () => {
    const other = detail({a: identity({isFocus: true})})
    expect(mergeDetailAlleles([other], detail({})).alleles.a.isFocus).toBe(false)
  })
})

describe('sharedReleases', () => {
  const group = (coalescedAnnotations: AlleleAnnotations | null) => ({coalescedAnnotations}) as AlleleGroup
  const annotations = (vepVersion: string, gnomad: string, clinvar: string[]) =>
    ({
      vep: {sourceVersion: vepVersion},
      gnomad: {dbVersion: gnomad},
      clinvar: clinvar.map((dbVersion) => ({dbVersion}))
    }) as unknown as AlleleAnnotations

  it('reports a release every group with a record agrees on, ignoring groups without one', () => {
    const groups = [group(annotations('112', 'v4.1', ['01_2026'])), group(null)]
    expect(sharedReleases(groups, null)).toEqual({vep: '112', gnomad: 'v4.1', clinvar: '01_2026'})
  })

  it('is null for a source whose groups disagree', () => {
    const groups = [group(annotations('112', 'v4.1', [])), group(annotations('113', 'v4.1', []))]
    expect(sharedReleases(groups, null)).toMatchObject({vep: null, gnomad: 'v4.1', clinvar: null})
  })

  it('compares the pinned ClinVar release rather than each latest', () => {
    const groups = [
      group(annotations('112', 'v4.1', ['01_2026', '03_2026'])),
      group(annotations('112', 'v4.1', ['01_2026']))
    ]
    expect(sharedReleases(groups, null).clinvar).toBeNull()
    expect(sharedReleases(groups, '01_2026').clinvar).toBe('01_2026')
  })
})
