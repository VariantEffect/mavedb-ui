import {describe, expect, it} from 'vitest'

import {isWorstCaseConsequence, specificVepFirst} from '@/lib/vep-consequence'

const transcript = {consequence: 'synonymous_variant', consequenceSource: 'transcript' as const}
const worstCase = {consequence: 'splice_polypyrimidine_tract_variant', consequenceSource: 'most_severe' as const}
const noChange = {consequence: 'no_change', consequenceSource: 'reference_identical' as const}
const legacy = {consequence: 'missense_variant', consequenceSource: null}

describe('isWorstCaseConsequence', () => {
  it.each([
    ['most_severe', worstCase, true],
    ['transcript', transcript, false],
    ['reference_identical', noChange, false],
    ['unrecorded source', legacy, false],
    ['absent', null, false]
  ])('%s → %s', (_label, vep, expected) => {
    expect(isWorstCaseConsequence(vep)).toBe(expected)
  })
})

describe('specificVepFirst', () => {
  it('drops the worst case whichever order it comes in', () => {
    expect(specificVepFirst([worstCase, transcript])).toEqual([transcript])
    expect(specificVepFirst([transcript, worstCase])).toEqual([transcript])
  })

  it('treats a reference-identical call as specific', () => {
    expect(specificVepFirst([worstCase, noChange])).toEqual([noChange])
  })

  it('keeps the worst case when it is all there is', () => {
    expect(specificVepFirst([worstCase])).toEqual([worstCase])
  })

  it('leaves values without a recorded source as they are', () => {
    expect(specificVepFirst([worstCase, legacy])).toEqual([worstCase, legacy])
  })
})
