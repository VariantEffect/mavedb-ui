import {describe, expect, test} from 'vitest'

import {
  reduceControlPlacement,
  resolveClinvarHeadline,
  type ClinvarControlPlacement,
  type ControlLink,
  type UsableControlPlacement
} from '@/lib/clinvar-control-placement'
import type {MeasurementClinvarRecord} from '@/lib/clinvar-controls'

// Review statuses and their star ratings (mirrors CLINVAR_REVIEW_STATUS_STARS), so the representative-pick
// and per-classification-status tests are explicit about stars.
const NO_CRITERIA = 'no assertion criteria provided' // 0★
const ONE_STAR = 'criteria provided, single submitter' // 1★
const TWO_STAR = 'criteria provided, multiple submitters, no conflicts' // 2★
const THREE_STAR = 'reviewed by expert panel' // 3★

const ASSAY = 'assayed-level-digest'
const SIB = 'sibling-digest'
const SIB2 = 'sibling-digest-2'

// Significances (exact strings the P/LP and B/LB membership lists key on).
const P = 'Pathogenic'
const LP = 'Likely pathogenic'
const PLP = 'Pathogenic/Likely pathogenic'
const B = 'Benign'
const LB = 'Likely benign'
const BLB = 'Benign/Likely benign'
const VUS = 'Uncertain significance'
const CONFLICTING = 'Conflicting classifications of pathogenicity'

function link(significance: string, alleleDigest?: string, reviewStatus: string = ONE_STAR): ControlLink {
  return {significance, reviewStatus, alleleDigest, dbIdentifier: `${significance}@${alleleDigest ?? '?'}`}
}

/** The set of distinct significances in a placement (order-independent assertions). */
const sigs = (p: ClinvarControlPlacement) => p.classifications.map((c) => c.significance).sort()

/** Narrow to a usable placement — hard discordance has no representative, so asserting one there is a bug. */
function usable(p: ClinvarControlPlacement): UsableControlPlacement {
  if (p.discordance === 'hard') throw new Error('expected a usable placement, got hard discordance')
  return p
}

describe('reduceControlPlacement — divergence fold', () => {
  test('no controls reach the variant → null', () => {
    expect(reduceControlPlacement([], ASSAY)).toBeNull()
  })

  describe('single direct call at the assayed level (projected = false)', () => {
    test.each([
      [P, {directional: true}],
      [LP, {directional: true}],
      [PLP, {directional: true}],
      [B, {directional: true}],
      [LB, {directional: true}],
      [BLB, {directional: true}],
      [VUS, {directional: false}],
      // ClinVar's own aggregate "conflicting" value is neither pathogenic- nor benign-side, so it is not
      // directional and does not by itself trigger any discordance.
      [CONFLICTING, {directional: false}]
    ])('%s → directional flag, no discordance, not projected', (significance, expected) => {
      const p = reduceControlPlacement([link(significance, ASSAY)], ASSAY)!
      expect(usable(p).directional).toBe(expected.directional)
      expect(p.discordance).toBe('none')
      expect(p.projected).toBe(false)
      expect(sigs(p)).toEqual([significance])
      expect(usable(p).clinicalSignificance).toBe(significance)
    })
  })

  describe('precedence — the assayed level wins; siblings are ignored', () => {
    test('a lone assayed VUS blocks a sibling LP (any assayed call stops the fall-through)', () => {
      const p = reduceControlPlacement([link(VUS, ASSAY), link(LP, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([VUS])
      expect(usable(p).directional).toBe(false)
      expect(p.projected).toBe(false)
    })

    test('an assayed directional call is not overridden into hard discordance by a discordant sibling', () => {
      const p = reduceControlPlacement([link(P, ASSAY), link(B, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([P])
      expect(p.discordance).toBe('none')
      expect(p.projected).toBe(false)
    })

    test('multiple assayed-level calls are all consulted (assayed-level discordance is still real)', () => {
      // Two ClinVar submissions on the *same* assayed allele that disagree on direction → hard.
      const p = reduceControlPlacement([link(P, ASSAY), link(B, ASSAY), link(LP, SIB)], ASSAY)!
      expect(p.discordance).toBe('hard')
      expect(p.projected).toBe(false)
      // The sibling LP is not consulted — only the two assayed-level calls.
      expect(sigs(p)).toEqual([B, P])
    })
  })

  describe('fall-through to projection siblings (measured allele unannotated → projected = true)', () => {
    test('single sibling call → placed on its side, flagged projected', () => {
      const p = reduceControlPlacement([link(LB, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([LB])
      expect(usable(p).directional).toBe(true)
      expect(p.discordance).toBe('none')
      expect(p.projected).toBe(true)
    })

    describe('hard discordance (both directions present) → discordance = hard', () => {
      test.each([
        ['P + B', [P, B]],
        ['P + LB', [P, LB]],
        ['LP + B', [LP, B]],
        ['LP + LB', [LP, LB]],
        ['PLP + BLB', [PLP, BLB]],
        ['P + B + VUS (VUS does not rescue)', [P, B, VUS]]
      ])('%s → hard', (_label, significances) => {
        const links = significances.map((s, i) => link(s, i === 0 ? SIB : SIB2))
        const p = reduceControlPlacement(links, ASSAY)!
        expect(p.discordance).toBe('hard')
        expect(p.projected).toBe(true)
      })

      test('carries the full set to reconstruct, but no representative — no fake single winner', () => {
        const p = reduceControlPlacement([link(P, SIB, ONE_STAR), link(B, SIB2, TWO_STAR)], ASSAY)!
        expect(p.discordance).toBe('hard')
        // The conflicting calls are still enumerable by any surface.
        expect(sigs(p)).toEqual([B, P])
        // But there is physically no winner: the representative fields are absent from the value (and type).
        expect('clinicalSignificance' in p).toBe(false)
        expect('alleleDigest' in p).toBe(false)
        expect('directional' in p).toBe(false)
      })
    })

    describe('concordant (≥2 distinct calls in one direction, no uncertain record) → discordance = concordant', () => {
      test('same-side {P, LP} → both calls carried, pathogenic, concordant', () => {
        const p = reduceControlPlacement([link(P, SIB), link(LP, SIB2)], ASSAY)!
        expect(p.discordance).toBe('concordant')
        expect(usable(p).directional).toBe(true)
        expect(sigs(p)).toEqual([LP, P])
      })

      test('same-side {B, LB} → benign, concordant', () => {
        const p = reduceControlPlacement([link(B, SIB), link(LB, SIB2)], ASSAY)!
        expect(p.discordance).toBe('concordant')
        expect(sigs(p)).toEqual([B, LB])
      })
    })

    describe('soft conflict (a directional lean + an uncertain record) → discordance = soft', () => {
      // The VUS widening: a directional lean beside a VUS is now a *soft conflict* (was previously `none`).
      // The lean still represents and `directional` stays true; the histogram folds it into the directional
      // series only while its soft-conflicts toggle is on.
      test('directional + VUS {LP, VUS} → soft, lean represents', () => {
        const p = reduceControlPlacement([link(LP, SIB), link(VUS, SIB2)], ASSAY)!
        expect(p.discordance).toBe('soft')
        expect(usable(p).directional).toBe(true)
        expect(usable(p).clinicalSignificance).toBe(LP)
        expect(sigs(p)).toEqual([LP, VUS])
      })

      test('benign + VUS {B, VUS} → soft, benign lean represents', () => {
        const p = reduceControlPlacement([link(B, SIB), link(VUS, SIB2)], ASSAY)!
        expect(p.discordance).toBe('soft')
        expect(usable(p).directional).toBe(true)
        expect(usable(p).clinicalSignificance).toBe(B)
        expect(sigs(p)).toEqual([B, VUS])
      })

      // A directional lean beside a ClinVar-*Conflicting* record is the same soft conflict (folds in what was
      // the retired `contested` value).
      test('directional + Conflicting {P, CONFLICTING} → soft, directional lean represents', () => {
        const p = reduceControlPlacement([link(P, SIB), link(CONFLICTING, SIB2)], ASSAY)!
        expect(p.discordance).toBe('soft')
        expect(usable(p).directional).toBe(true)
        expect(usable(p).clinicalSignificance).toBe(P)
        expect(sigs(p)).toEqual([CONFLICTING, P].sort())
      })

      test('same-direction multiplicity + an uncertain record → soft outranks concordant', () => {
        const p = reduceControlPlacement([link(P, SIB), link(LP, SIB2), link(CONFLICTING, SIB)], ASSAY)!
        expect(p.discordance).toBe('soft')
        expect(usable(p).directional).toBe(true)
      })
    })

    test('VUS-only siblings → not directional (lands in the VUS series)', () => {
      const p = reduceControlPlacement([link(VUS, SIB), link(VUS, SIB2)], ASSAY)!
      expect(usable(p).directional).toBe(false)
      expect(p.discordance).toBe('none')
      // Duplicate significances collapse to one classification.
      expect(sigs(p)).toEqual([VUS])
    })
  })

  describe('classifications set — distinct, order-preserving, status-carrying', () => {
    test('duplicate significances across siblings collapse to one classification', () => {
      const p = reduceControlPlacement([link(P, SIB), link(P, SIB2)], ASSAY)!
      expect(p.classifications).toHaveLength(1)
      expect(p.classifications[0].significance).toBe(P)
    })

    test('each classification keeps its own review status (for the downstream ≥minStar gate)', () => {
      const p = reduceControlPlacement([link(P, SIB, TWO_STAR), link(LP, SIB2, NO_CRITERIA)], ASSAY)!
      const byName = Object.fromEntries(p.classifications.map((c) => [c.significance, c.reviewStatus]))
      expect(byName[P]).toBe(TWO_STAR)
      expect(byName[LP]).toBe(NO_CRITERIA)
    })

    test('first-seen order is preserved', () => {
      const p = reduceControlPlacement([link(LP, SIB), link(P, SIB2)], ASSAY)!
      expect(p.classifications.map((c) => c.significance)).toEqual([LP, P])
    })
  })

  describe('representative pick (for one-label surfaces: search dot, notables, tooltip)', () => {
    test('a directional call is preferred over a higher-star VUS', () => {
      const p = reduceControlPlacement([link(LP, SIB, ONE_STAR), link(VUS, SIB2, THREE_STAR)], ASSAY)!
      expect(usable(p).clinicalSignificance).toBe(LP)
    })

    test('among directional calls, the highest-star one represents', () => {
      const p = usable(reduceControlPlacement([link(LP, SIB, ONE_STAR), link(P, SIB2, TWO_STAR)], ASSAY)!)
      expect(p.clinicalSignificance).toBe(P)
      expect(p.clinicalReviewStatus).toBe(TWO_STAR)
    })

    test('VUS-only → the VUS represents', () => {
      const p = reduceControlPlacement([link(VUS, SIB, TWO_STAR)], ASSAY)!
      expect(usable(p).clinicalSignificance).toBe(VUS)
    })
  })

  describe('representative allele digest (for resolving the winning call on a per-variant surface)', () => {
    test('carries the digest of the representative call', () => {
      const p = reduceControlPlacement([link(LP, 's1', ONE_STAR), link(P, 's2', TWO_STAR)], 'assay')!
      // Representative is the highest-star directional (P on s2), so its digest surfaces.
      expect(usable(p).alleleDigest).toBe('s2')
    })

    test('a direct assayed-level call surfaces the assayed digest', () => {
      const p = reduceControlPlacement([link(P, ASSAY), link(LP, SIB)], ASSAY)!
      expect(usable(p).alleleDigest).toBe(ASSAY)
      expect(p.projected).toBe(false)
    })
  })

  describe('none (a single call, or uncertain-only records) → discordance = none', () => {
    test('a lone Conflicting record (no directional lean) is not a soft conflict', () => {
      const p = reduceControlPlacement([link(CONFLICTING, SIB)], ASSAY)!
      expect(p.discordance).toBe('none')
      expect(usable(p).directional).toBe(false)
      expect(usable(p).clinicalSignificance).toBe(CONFLICTING)
    })

    test('uncertain-only {VUS, Conflicting} → none (no directional lean to conflict with)', () => {
      const p = reduceControlPlacement([link(VUS, SIB), link(CONFLICTING, SIB2)], ASSAY)!
      expect(p.discordance).toBe('none')
      expect(usable(p).directional).toBe(false)
      expect(sigs(p)).toEqual([CONFLICTING, VUS].sort())
    })

    test('opposite directions outrank an uncertain record → hard, not soft', () => {
      const p = reduceControlPlacement([link(P, SIB), link(B, SIB2), link(CONFLICTING, SIB2)], ASSAY)!
      expect(p.discordance).toBe('hard')
    })
  })

  describe('unclassified ClinVar values ("-"/empty) are not treated as calls', () => {
    test('a dash-only set → null (not a control, not a call)', () => {
      expect(reduceControlPlacement([link('-', ASSAY), link('-', SIB)], ASSAY)).toBeNull()
    })

    test('a dash on the assayed allele does NOT block fall-through to a real sibling', () => {
      // The `-` (no germline classification) is filtered, so the assayed allele reads as unannotated and
      // the real sibling LP wins — the fall-through fires, projected.
      const p = reduceControlPlacement([link('-', ASSAY), link(LP, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([LP])
      expect(p.projected).toBe(true)
    })

    test('empty/whitespace/multi-dash significances are ignored', () => {
      const p = reduceControlPlacement([link('', SIB), link('--', SIB2), link(P, SIB2)], ASSAY)!
      expect(sigs(p)).toEqual([P])
    })
  })

  describe('unknown assayed-level digest — provenance not claimed', () => {
    test.each([[null], [undefined]])('digest = %s → all links win, projected = false', (digest) => {
      const p = reduceControlPlacement([link(P, SIB), link(LP, SIB2)], digest)!
      // With no assayed digest we cannot say a call is "on the measured allele", so we do NOT flag it as
      // projected (which would wrongly imply we know it is about a *different* level).
      expect(p.projected).toBe(false)
      expect(sigs(p)).toEqual([LP, P])
    })
  })
})

/** A resolved record for one allele — the walk's output that the headline projects from. */
function rec(significance: string, digest: string, reviewStatus: string = ONE_STAR): MeasurementClinvarRecord {
  return {
    digest,
    onAssayed: digest === ASSAY,
    hgvs: null,
    classified: !!significance.trim() && !/^-+$/.test(significance.trim()),
    clinvar: {
      clinicalSignificance: significance,
      clinicalReviewStatus: reviewStatus,
      clinvarVariationId: null,
      clinvarAlleleId: `${significance}@${digest}`,
      dbVersion: '03_2024'
    }
  }
}

describe('reduceControlPlacement — assay-level gating of projection', () => {
  test('protein level projects a sibling call when the measured allele has none', () => {
    const p = reduceControlPlacement([link(P, SIB)], ASSAY, 'protein')
    expect(p?.projected).toBe(true)
    expect(usable(p!).clinicalSignificance).toBe(P)
  })

  test('nucleotide level does not project — no direct record → null', () => {
    expect(reduceControlPlacement([link(P, SIB)], ASSAY, 'cdna')).toBeNull()
    expect(reduceControlPlacement([link(P, SIB)], ASSAY, 'genomic')).toBeNull()
  })

  test('nucleotide level still honors the measured allele`s own direct call', () => {
    const p = reduceControlPlacement([link(P, ASSAY), link(VUS, SIB)], ASSAY, 'cdna')
    expect(usable(p!).clinicalSignificance).toBe(P)
    expect(usable(p!).projected).toBe(false)
  })

  test('unknown level preserves the prior behavior — projects', () => {
    expect(reduceControlPlacement([link(P, SIB)], ASSAY)?.projected).toBe(true)
  })

  test('a subject digest *set* (c↔g twin) counts a record on either representation as direct', () => {
    // The physical allele is stored as ASSAY (coding) + SIB (its genomic twin); ClinVar linked the record to
    // the twin. Anchoring on both digests keeps it a direct call, not a projection off a "sibling".
    const p = reduceControlPlacement([link(P, SIB)], [ASSAY, SIB], 'cdna')
    expect(usable(p!).clinicalSignificance).toBe(P)
    expect(usable(p!).projected).toBe(false)
  })
})

describe('resolveClinvarHeadline — the display decision', () => {
  test('no records → none', () => {
    expect(resolveClinvarHeadline([], ASSAY)).toEqual({kind: 'none'})
  })

  test('nucleotide level, no direct record but classified siblings → kind "absent"', () => {
    expect(resolveClinvarHeadline([rec(P, SIB)], ASSAY, 'cdna')).toEqual({kind: 'absent'})
    expect(resolveClinvarHeadline([rec(P, SIB), rec(VUS, SIB2)], ASSAY, 'genomic')).toEqual({kind: 'absent'})
  })

  test('protein level, no direct record → projects to kind "call"', () => {
    expect(resolveClinvarHeadline([rec(P, SIB)], ASSAY, 'protein').kind).toBe('call')
  })

  test('measured allele has no record, only germline-less related records → absent (not a sibling presence)', () => {
    // The measured variant has no record of its own; a sibling`s `-` must not be shown as this variant`s state.
    expect(resolveClinvarHeadline([rec('-', SIB)], ASSAY, 'cdna')).toEqual({kind: 'absent'})
    expect(resolveClinvarHeadline([rec('-', SIB)], ASSAY, 'protein')).toEqual({kind: 'absent'})
  })

  test('nucleotide level, measured allele carries a `-` record → presence, not absent', () => {
    const headline = resolveClinvarHeadline([rec('-', ASSAY), rec(P, SIB)], ASSAY, 'cdna')
    expect(headline.kind).toBe('presence')
    if (headline.kind !== 'presence') throw new Error('expected presence')
    expect(headline.record.onAssayed).toBe(true)
  })

  test('nucleotide level, measured allele has its own call → kind "call" (direct, not projected)', () => {
    const headline = resolveClinvarHeadline([rec(P, ASSAY), rec(VUS, SIB)], ASSAY, 'cdna')
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.placement.projected).toBe(false)
  })

  test('a usable call → kind "call", carrying the representative record and placement', () => {
    const headline = resolveClinvarHeadline([rec(P, ASSAY), rec(VUS, SIB)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.clinvar.clinicalSignificance).toBe(P)
    expect(headline.placement.discordance).not.toBe('hard')
  })

  test('opposite-direction calls in the winning set → kind "conflicting"', () => {
    const headline = resolveClinvarHeadline([rec(P, ASSAY), rec(B, ASSAY)], ASSAY)
    expect(headline.kind).toBe('conflicting')
  })

  test('a directional lean + a Conflicting sibling → kind "call", note "soft-conflicting"', () => {
    const headline = resolveClinvarHeadline([rec(P, SIB), rec(CONFLICTING, SIB2)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    // The lean shows, and the note flags ClinVar's own conflict verdict for the surface to render.
    expect(headline.clinvar.clinicalSignificance).toBe(P)
    expect(headline.placement.discordance).toBe('soft')
    expect(headline.note).toBe('soft-conflicting')
  })

  test('a directional lean + a VUS sibling → kind "call", note "soft-vus"', () => {
    const headline = resolveClinvarHeadline([rec(LP, SIB), rec(VUS, SIB2)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.clinvar.clinicalSignificance).toBe(LP)
    expect(headline.placement.discordance).toBe('soft')
    expect(headline.note).toBe('soft-vus')
  })

  test('≥2 agreeing same-direction records → kind "call", note "concordant"', () => {
    const headline = resolveClinvarHeadline([rec(P, SIB), rec(LP, SIB2)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.placement.discordance).toBe('concordant')
    expect(headline.note).toBe('concordant')
  })

  test('a lone unambiguous call → kind "call", note "none"', () => {
    const headline = resolveClinvarHeadline([rec(P, ASSAY)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.note).toBe('none')
  })

  test('only a `-` record → kind "presence" (not dropped; precedence, not the fold)', () => {
    const headline = resolveClinvarHeadline([rec('-', ASSAY)], ASSAY)
    expect(headline.kind).toBe('presence')
    if (headline.kind !== 'presence') throw new Error('expected presence')
    expect(headline.record.digest).toBe(ASSAY)
  })

  test('a real call outranks a co-occurring `-` — presence never shadows a classification', () => {
    const headline = resolveClinvarHeadline([rec('-', ASSAY), rec(LP, SIB)], ASSAY)
    expect(headline.kind).toBe('call')
    if (headline.kind !== 'call') throw new Error('expected a call')
    expect(headline.clinvar.clinicalSignificance).toBe(LP)
  })

  test('presence prefers the measured allele`s own `-` record over a sibling`s', () => {
    const headline = resolveClinvarHeadline([rec('-', SIB), rec('-', ASSAY)], ASSAY)
    expect(headline.kind).toBe('presence')
    if (headline.kind !== 'presence') throw new Error('expected presence')
    expect(headline.record.onAssayed).toBe(true)
  })
})
