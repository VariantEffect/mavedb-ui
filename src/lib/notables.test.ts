import {describe, expect, it} from 'vitest'

import {
  clinicalExtremesPerClass,
  consequenceExemplars,
  deviationsFromMedian,
  medianAndMad,
  scoreExtremes
} from '@/lib/notables'
import type {DisplayVariant} from '@/lib/variants'

// Minimal variant factory — only the fields the notable samplers read.
function v(
  urn: string,
  score: number | null,
  extras: {consequence?: string | null; clnsig?: string; stars?: keyof typeof STARS; discordance?: string} = {}
): DisplayVariant {
  const variant = {variantUrn: urn, score, consequence: extras.consequence ?? null} as DisplayVariant
  if (extras.clnsig) {
    variant.control = {
      clinicalSignificance: extras.clnsig,
      clinicalReviewStatus: extras.stars ?? '1-star',
      // Notables only headline clean/concordant controls; default to a clean call so the star/class logic
      // is exercised, and let a test opt into 'soft'/'hard' to assert exclusion.
      discordance: extras.discordance ?? 'none'
    } as DisplayVariant['control']
  }
  return variant
}

// Review-status strings that map to the star ratings we care about (see CLINVAR_REVIEW_STATUS_STARS).
const STARS = {
  '0-star': 'no assertion criteria provided',
  '1-star': 'criteria provided, single submitter',
  '2-star': 'criteria provided, multiple submitters, no conflicts'
} as const

// Rewrite the factory's star shorthand into the real review-status strings.
function withStars(variant: DisplayVariant): DisplayVariant {
  const control = variant.control
  if (!control || control.discordance === 'hard') return variant
  const shorthand = control.clinicalReviewStatus as keyof typeof STARS | undefined
  if (shorthand && STARS[shorthand]) {
    ;(control as {clinicalReviewStatus: string}).clinicalReviewStatus = STARS[shorthand]
  }
  return variant
}

describe('clinicalExtremesPerClass', () => {
  it('returns one exemplar per class, separated along the learned damaging direction', () => {
    // Pathogenic scores low, benign high → damaging direction is negative. Expect the lowest P and
    // highest B, not the middling members.
    const variants = [
      v('p-mid', -1, {clnsig: 'Pathogenic'}),
      v('p-extreme', -3, {clnsig: 'Likely pathogenic'}),
      v('b-mid', 1, {clnsig: 'Benign'}),
      v('b-extreme', 3, {clnsig: 'Likely benign'})
    ].map(withStars)
    const result = clinicalExtremesPerClass(variants)
    expect(result.map((r) => r.variantUrn)).toEqual(['p-extreme', 'b-extreme'])
  })

  it('learns the opposite polarity too (pathogenic high, benign low)', () => {
    const variants = [
      v('p-extreme', 5, {clnsig: 'Pathogenic'}),
      v('p-mid', 2, {clnsig: 'Pathogenic'}),
      v('b-extreme', -4, {clnsig: 'Benign'}),
      v('b-mid', -1, {clnsig: 'Benign'})
    ].map(withStars)
    expect(clinicalExtremesPerClass(variants).map((r) => r.variantUrn)).toEqual(['p-extreme', 'b-extreme'])
  })

  it('falls back to furthest-from-median when only one class is present', () => {
    const variants = [
      v('p-near', 0.1, {clnsig: 'Pathogenic'}),
      v('p-far', 4, {clnsig: 'Pathogenic'}),
      v('unclassified-a', -2, {}),
      v('unclassified-b', 0, {})
    ].map(withStars)
    const result = clinicalExtremesPerClass(variants)
    // Set median is ~0.05; p-far (4) is furthest.
    expect(result.map((r) => r.variantUrn)).toEqual(['p-far'])
  })

  it('excludes controls below the star threshold and VUS/unclassified', () => {
    const variants = [
      v('p-lowstar', -3, {clnsig: 'Pathogenic', stars: '0-star'}),
      v('vus', -2, {clnsig: 'Uncertain significance', stars: '2-star'}),
      v('b-ok', 3, {clnsig: 'Benign', stars: '1-star'})
    ].map(withStars)
    const result = clinicalExtremesPerClass(variants, 1)
    // Only the benign passes → single-class fallback, benign returned.
    expect(result.map((r) => r.variantUrn)).toEqual(['b-ok'])
  })

  it('excludes soft-conflict controls — a directional lean beside an uncertain record is not definitive', () => {
    const variants = [
      // Both carry a directional representative at a passing star, but the soft one is a soft conflict and
      // must not headline; only the clean pathogenic exemplar survives (single-class fallback).
      v('p-soft', -3, {clnsig: 'Pathogenic', stars: '2-star', discordance: 'soft'}),
      v('p-clean', -1, {clnsig: 'Pathogenic', stars: '2-star', discordance: 'none'})
    ].map(withStars)
    expect(clinicalExtremesPerClass(variants, 1).map((r) => r.variantUrn)).toEqual(['p-clean'])
  })

  it('includes concordant controls — a same-direction agreement is still definitive', () => {
    const variants = [
      v('p-concordant', -4, {clnsig: 'Pathogenic', stars: '2-star', discordance: 'concordant'}),
      v('b-ok', 3, {clnsig: 'Benign', stars: '1-star'})
    ].map(withStars)
    // Both classes present and usable → one exemplar each, pathogenic-then-benign.
    expect(clinicalExtremesPerClass(variants, 1).map((r) => r.variantUrn)).toEqual(['p-concordant', 'b-ok'])
  })

  it('returns nothing when no definitive controls clear the star gate', () => {
    const variants = [v('vus', 1, {clnsig: 'Uncertain significance', stars: '2-star'}), v('plain', 2)].map(withStars)
    expect(clinicalExtremesPerClass(variants)).toEqual([])
  })
})

describe('consequenceExemplars', () => {
  it('returns one representative per present bucket in canonical order, skipping No consequence', () => {
    const variants = [
      v('syn-1', 1, {consequence: 'synonymous_variant'}),
      v('mis-1', 2, {consequence: 'missense_variant'}),
      v('mis-2', 3, {consequence: 'missense_variant'}),
      v('non-1', 4, {consequence: 'stop_gained'}),
      v('none-1', 5, {consequence: null})
    ]
    const result = consequenceExemplars(variants)
    // Canonical order is Missense, Synonymous, Nonsense, … → first-seen rep of each, No consequence dropped.
    expect(result.map((r) => r.variantUrn)).toEqual(['mis-1', 'syn-1', 'non-1'])
  })

  it('is empty when every variant lacks a consequence (truly-unmapped set)', () => {
    const variants = [v('a', 1, {consequence: null}), v('b', 2, {consequence: 'NA'})]
    expect(consequenceExemplars(variants)).toEqual([])
  })

  it('ignores unscored variants', () => {
    const variants = [v('unscored', null, {consequence: 'missense_variant'}), v('scored', 1, {consequence: 'stop_gained'})]
    expect(consequenceExemplars(variants).map((r) => r.variantUrn)).toEqual(['scored'])
  })
})

describe('scoreExtremes', () => {
  it('returns the n variants furthest from the median, both tails', () => {
    const variants = [v('a', 0), v('b', 1), v('c', 2), v('d', 10), v('e', -8)]
    // Median 1; distances: e=9, d=9, a=1, c=1, b=0. Top 2 are the two tails.
    expect(scoreExtremes(variants, 2).map((r) => r.variantUrn).sort()).toEqual(['d', 'e'])
  })

  it('caps at the requested count and ignores unscored variants', () => {
    const variants = [v('a', 0), v('b', 5), v('unscored', null)]
    const result = scoreExtremes(variants, 5)
    expect(result).toHaveLength(2)
    expect(result.every((r) => typeof r.score === 'number')).toBe(true)
  })

  it('is empty on a set with no scored variants', () => {
    expect(scoreExtremes([v('a', null)], 3)).toEqual([])
  })
})

describe('medianAndMad / deviationsFromMedian', () => {
  it('computes median and MAD', () => {
    // Values 1,2,4,6,8: median 4; abs devs 3,2,0,2,4 → MAD 2.
    expect(medianAndMad([1, 2, 4, 6, 8])).toEqual({median: 4, mad: 2})
  })

  it('reports signed deviations in MAD units', () => {
    const spread = {median: 4, mad: 2}
    expect(deviationsFromMedian(10, spread)).toBe(3)
    expect(deviationsFromMedian(0, spread)).toBe(-2)
  })

  it('returns null deviations when the scale is degenerate (MAD 0)', () => {
    const spread = medianAndMad([5, 5, 5, 5, 9])
    expect(spread.mad).toBe(0)
    expect(deviationsFromMedian(9, spread)).toBeNull()
  })

  it('handles an even-length array', () => {
    expect(medianAndMad([1, 3]).median).toBe(2)
  })
})
