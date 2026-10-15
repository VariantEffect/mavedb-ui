import {describe, expect, it} from 'vitest'

import {variantPageQuery} from '@/lib/router'

const state = {includeSuperseded: false, includeResearchUseOnly: true, asOf: null, selectedVariantUrn: null}

describe('variantPageQuery', () => {
  it('keeps the variant while the selection is empty during a refetch', () => {
    // Enabling superseded to resolve a cited superseded measurement must not drop the citation.
    const query = variantPageQuery({variant: 'urn:mavedb:00000001-a-1#5'}, {...state, includeSuperseded: true})
    expect(query).toEqual({variant: 'urn:mavedb:00000001-a-1#5', include_superseded: 'true'})
  })

  it('writes the selected measurement', () => {
    const query = variantPageQuery({variant: 'urn:mavedb:00000001-a-1#5'}, {...state, selectedVariantUrn: 'urn:x#2'})
    expect(query.variant).toBe('urn:x#2')
  })

  it('writes the query axes, omitting defaults', () => {
    expect(variantPageQuery({include_superseded: 'true', as_of: '2026-01-01'}, state)).toEqual({})
    expect(variantPageQuery({}, {...state, includeResearchUseOnly: false, asOf: '2026-01-01'})).toEqual({
      include_research_use_only: 'false',
      as_of: '2026-01-01'
    })
  })

  it('leaves unrelated parameters alone', () => {
    expect(variantPageQuery({tab: 'ledger'}, state)).toEqual({tab: 'ledger'})
  })
})
