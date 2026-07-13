import {describe, expect, test} from 'vitest'

import {reduceControlPlacement, type ClinvarControlPlacement, type ControlLink} from '@/lib/clinvar-control-placement'

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

describe('reduceControlPlacement — divergence fold', () => {
  test('no controls reach the variant → null', () => {
    expect(reduceControlPlacement([], ASSAY)).toBeNull()
  })

  describe('single direct call at the assayed level (projected = false)', () => {
    test.each([
      [P, {directional: true, excluded: false}],
      [LP, {directional: true, excluded: false}],
      [PLP, {directional: true, excluded: false}],
      [B, {directional: true, excluded: false}],
      [LB, {directional: true, excluded: false}],
      [BLB, {directional: true, excluded: false}],
      [VUS, {directional: false, excluded: false}],
      // ClinVar's own aggregate "conflicting" value is neither pathogenic- nor benign-side, so it is not
      // directional and does not by itself trigger hard-discordance exclusion.
      [CONFLICTING, {directional: false, excluded: false}]
    ])('%s → directional/excluded flags, not projected', (significance, expected) => {
      const p = reduceControlPlacement([link(significance, ASSAY)], ASSAY)!
      expect(p.directional).toBe(expected.directional)
      expect(p.excluded).toBe(expected.excluded)
      expect(p.projected).toBe(false)
      expect(sigs(p)).toEqual([significance])
      expect(p.clinicalSignificance).toBe(significance)
    })
  })

  describe('precedence — the assayed level wins; siblings are ignored', () => {
    test('a lone assayed VUS blocks a sibling LP (any assayed call stops the fall-through)', () => {
      const p = reduceControlPlacement([link(VUS, ASSAY), link(LP, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([VUS])
      expect(p.directional).toBe(false)
      expect(p.projected).toBe(false)
    })

    test('an assayed directional call is not overridden into hard discordance by a discordant sibling', () => {
      const p = reduceControlPlacement([link(P, ASSAY), link(B, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([P])
      expect(p.excluded).toBe(false)
      expect(p.projected).toBe(false)
    })

    test('multiple assayed-level calls are all consulted (assayed-level discordance is still real)', () => {
      // Two ClinVar submissions on the *same* assayed allele that disagree on direction → excluded.
      const p = reduceControlPlacement([link(P, ASSAY), link(B, ASSAY), link(LP, SIB)], ASSAY)!
      expect(p.excluded).toBe(true)
      expect(p.projected).toBe(false)
      // The sibling LP is not consulted — only the two assayed-level calls.
      expect(sigs(p)).toEqual([B, P])
    })
  })

  describe('fall-through to projection siblings (measured allele unannotated → projected = true)', () => {
    test('single sibling call → placed on its side, flagged projected', () => {
      const p = reduceControlPlacement([link(LB, SIB)], ASSAY)!
      expect(sigs(p)).toEqual([LB])
      expect(p.directional).toBe(true)
      expect(p.projected).toBe(true)
    })

    describe('hard discordance (both directions present) → excluded', () => {
      test.each([
        ['P + B', [P, B]],
        ['P + LB', [P, LB]],
        ['LP + B', [LP, B]],
        ['LP + LB', [LP, LB]],
        ['PLP + BLB', [PLP, BLB]],
        ['P + B + VUS (VUS does not rescue)', [P, B, VUS]]
      ])('%s → excluded', (_label, significances) => {
        const links = significances.map((s, i) => link(s, i === 0 ? SIB : SIB2))
        const p = reduceControlPlacement(links, ASSAY)!
        expect(p.excluded).toBe(true)
        expect(p.projected).toBe(true)
      })
    })

    describe('soft discordance (one direction, ± VUS) → included, multi-membership', () => {
      test('same-side {P, LP} → both calls carried, pathogenic, not excluded', () => {
        const p = reduceControlPlacement([link(P, SIB), link(LP, SIB2)], ASSAY)!
        expect(p.excluded).toBe(false)
        expect(p.directional).toBe(true)
        expect(sigs(p)).toEqual([LP, P])
      })

      test('same-side {B, LB} → benign', () => {
        const p = reduceControlPlacement([link(B, SIB), link(LB, SIB2)], ASSAY)!
        expect(p.excluded).toBe(false)
        expect(sigs(p)).toEqual([B, LB])
      })

      test('directional + VUS {LP, VUS} → directional (VUS suppressed downstream)', () => {
        const p = reduceControlPlacement([link(LP, SIB), link(VUS, SIB2)], ASSAY)!
        expect(p.directional).toBe(true)
        expect(p.excluded).toBe(false)
        expect(sigs(p)).toEqual([LP, VUS])
      })

      test('benign + VUS {B, VUS} → directional benign', () => {
        const p = reduceControlPlacement([link(B, SIB), link(VUS, SIB2)], ASSAY)!
        expect(p.directional).toBe(true)
        expect(sigs(p)).toEqual([B, VUS])
      })
    })

    test('VUS-only siblings → not directional (lands in the VUS series)', () => {
      const p = reduceControlPlacement([link(VUS, SIB), link(VUS, SIB2)], ASSAY)!
      expect(p.directional).toBe(false)
      expect(p.excluded).toBe(false)
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
      expect(p.clinicalSignificance).toBe(LP)
    })

    test('among directional calls, the highest-star one represents', () => {
      const p = reduceControlPlacement([link(LP, SIB, ONE_STAR), link(P, SIB2, TWO_STAR)], ASSAY)!
      expect(p.clinicalSignificance).toBe(P)
      expect(p.clinicalReviewStatus).toBe(TWO_STAR)
    })

    test('VUS-only → the VUS represents', () => {
      const p = reduceControlPlacement([link(VUS, SIB, TWO_STAR)], ASSAY)!
      expect(p.clinicalSignificance).toBe(VUS)
    })
  })

  describe('representative allele digest (for resolving the winning call on a per-variant surface)', () => {
    test('carries the digest of the representative call', () => {
      const p = reduceControlPlacement([link(LP, 's1', ONE_STAR), link(P, 's2', TWO_STAR)], 'assay')!
      // Representative is the highest-star directional (P on s2), so its digest surfaces.
      expect(p.alleleDigest).toBe('s2')
    })

    test('a direct assayed-level call surfaces the assayed digest', () => {
      const p = reduceControlPlacement([link(P, ASSAY), link(LP, SIB)], ASSAY)!
      expect(p.alleleDigest).toBe(ASSAY)
      expect(p.projected).toBe(false)
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
