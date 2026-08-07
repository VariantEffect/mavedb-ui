import {describe, expect, it} from 'vitest'

import {SEARCH_COLORS, SEARCH_PLACEHOLDERS, SEARCH_TYPES} from './search'
import {SEARCH_TYPE_OPTIONS} from './mavemd'
import {detectSearchType} from '@/lib/mavemd'

/**
 * A dbSNP rsID may be written without its rs prefix, but only the ClinVar pattern matches a bare number, so this
 * example resolves to ClinVar under the "Any" search type. Searching it needs the dbSNP type chosen explicitly.
 */
const AMBIGUOUS_EXAMPLES: Record<string, string> = {'900082291': 'clinVarVariationId'}

describe('SEARCH_TYPE_OPTIONS examples', () => {
  it('each resolve to their own search type under "Any"', () => {
    for (const {code, examples} of SEARCH_TYPE_OPTIONS) {
      if (code === 'any') continue
      for (const example of examples ?? []) {
        expect(detectSearchType(example), example).toBe(AMBIGUOUS_EXAMPLES[example] ?? code)
      }
    }
  })

  it('resolve the examples "Any" itself advertises', () => {
    const anyExamples = SEARCH_TYPE_OPTIONS.find((option) => option.code === 'any')?.examples ?? []
    expect(anyExamples.length).toBeGreaterThan(0)
    for (const example of anyExamples) {
      expect(detectSearchType(example), example).not.toBeNull()
    }
  })
})

describe('SEARCH_TYPES', () => {
  it('has a color for every type, which the homepage dropdown indexes without a fallback', () => {
    for (const {value} of SEARCH_TYPES) {
      expect(SEARCH_COLORS[value], value).toBeDefined()
    }
  })

  it('has a placeholder for every type', () => {
    for (const {value} of SEARCH_TYPES) {
      expect(SEARCH_PLACEHOLDERS[value], value).toBeDefined()
    }
  })

  it('uses values the MaveMD search screen recognizes, since they pass through as query params', () => {
    const supported = SEARCH_TYPE_OPTIONS.map((option) => option.code)
    for (const {value} of SEARCH_TYPES) {
      expect(supported, value).toContain(value)
    }
  })
})
