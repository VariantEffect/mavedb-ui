import {describe, expect, test} from 'vitest'

import {reduceControlPlacement, type ControlLink} from '@/lib/clinvar-control-placement'
import {resolveControlSeries, type ControlSeriesOptions} from '@/lib/clinvar-control-series'

// Review statuses and their star ratings (mirrors CLINVAR_REVIEW_STATUS_STARS).
const ONE_STAR = 'criteria provided, single submitter' // 1★
const TWO_STAR = 'criteria provided, multiple submitters, no conflicts' // 2★

const ASSAY = 'assayed-level-digest'
const SIB = 'sibling-digest'
const SIB2 = 'sibling-digest-2'

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

describe('resolveControlSeries — single-membership histogram placement', () => {
  // Everything selected (all directional + both uncertain calls) and no star floor, unless a test overrides it,
  // so membership is decided by the placement/toggle, not filtered out by selection or stars.
  const ALL_SELECTED = [P, LP, PLP, B, LB, BLB, VUS, CONFLICTING]
  const opts = (softConflictsEnabled: boolean, over: Partial<ControlSeriesOptions> = {}): ControlSeriesOptions => ({
    softConflictsEnabled,
    selectedSignificances: ALL_SELECTED,
    minStars: Number.NEGATIVE_INFINITY,
    ...over
  })
  const place = (...links: ControlLink[]) => reduceControlPlacement(links, ASSAY)

  test('no placement → null in either mode', () => {
    expect(resolveControlSeries(null, opts(true))).toBeNull()
    expect(resolveControlSeries(undefined, opts(false))).toBeNull()
  })

  test('hard discordance → null in either mode (never a valid home)', () => {
    const hard = place(link(P, SIB), link(B, SIB2))
    expect(resolveControlSeries(hard, opts(true))).toBeNull()
    expect(resolveControlSeries(hard, opts(false))).toBeNull()
  })

  describe('clean/concordant directional → its directional series, in either mode', () => {
    test.each([
      ['single P', [link(P, ASSAY)], 'pathogenic'],
      ['single LB', [link(LB, ASSAY)], 'benign'],
      ['concordant {P, LP}', [link(P, SIB), link(LP, SIB2)], 'pathogenic'],
      ['concordant {B, LB}', [link(B, SIB), link(LB, SIB2)], 'benign']
    ])('%s → %s', (_label, links, expected) => {
      const p = place(...links)
      expect(resolveControlSeries(p, opts(true))).toBe(expected)
      expect(resolveControlSeries(p, opts(false))).toBe(expected)
    })
  })

  describe('soft conflict → directional lean only while the fold is on', () => {
    test.each([
      ['directional + VUS', [link(LP, SIB), link(VUS, SIB2)], 'pathogenic'],
      ['directional + Conflicting', [link(B, SIB), link(CONFLICTING, SIB2)], 'benign']
    ])('%s → %s when on, null when off', (_label, links, expected) => {
      const p = place(...links)
      expect(p!.discordance).toBe('soft')
      expect(resolveControlSeries(p, opts(true))).toBe(expected)
      expect(resolveControlSeries(p, opts(false))).toBeNull()
    })
  })

  describe('pure uncertain → its uncertain series only while the fold is off (mutual exclusion)', () => {
    test('single VUS → uncertain when off, null when on', () => {
      const p = place(link(VUS, ASSAY))
      expect(resolveControlSeries(p, opts(false))).toBe('uncertain')
      expect(resolveControlSeries(p, opts(true))).toBeNull()
    })

    test('lone Conflicting → conflicting when off, null when on', () => {
      const p = place(link(CONFLICTING, ASSAY))
      expect(resolveControlSeries(p, opts(false))).toBe('conflicting')
      expect(resolveControlSeries(p, opts(true))).toBeNull()
    })

    test('{VUS, Conflicting} → exactly one uncertain series (its representative), never both', () => {
      const p = place(link(VUS, SIB, TWO_STAR), link(CONFLICTING, SIB2, ONE_STAR))
      // Representative is the higher-star uncertain call (VUS @ 2★), so it lands in the VUS series alone.
      expect(resolveControlSeries(p, opts(false))).toBe('uncertain')
      expect(resolveControlSeries(p, opts(true))).toBeNull()
    })
  })

  describe('the star gate is on the representative', () => {
    test('representative below minStars → null', () => {
      const p = place(link(P, ASSAY, ONE_STAR))
      expect(resolveControlSeries(p, opts(true, {minStars: 2}))).toBeNull()
    })

    test('representative clearing minStars → placed', () => {
      const p = place(link(P, ASSAY, TWO_STAR))
      expect(resolveControlSeries(p, opts(true, {minStars: 2}))).toBe('pathogenic')
    })
  })

  describe('selection gates on the representative (single-representative membership)', () => {
    // Concordant {P@2★, LP@1★}: representative is the higher-star P. It is placed once, by P — not by both
    // filters. So an "LP-only" selection excludes it even though LP is in the winning set.
    test('representative P dropped when only LP is selected', () => {
      const p = place(link(P, SIB, TWO_STAR), link(LP, SIB2, ONE_STAR))
      expect(resolveControlSeries(p, opts(true, {selectedSignificances: [LP]}))).toBeNull()
      expect(resolveControlSeries(p, opts(true, {selectedSignificances: [P]}))).toBe('pathogenic')
    })
  })
})
