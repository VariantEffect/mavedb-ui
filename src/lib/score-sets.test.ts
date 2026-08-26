import {describe, expect, it} from 'vitest'

import {getPublicationUrl} from './score-sets'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type PublicationIdentifier = ScoreSet['primaryPublicationIdentifiers'][0]

function publication(overrides: Partial<PublicationIdentifier> = {}): PublicationIdentifier {
  return {
    identifier: '38057330',
    dbName: 'PubMed',
    title: 'A study',
    authors: [],
    id: 1,
    ...overrides
  } as PublicationIdentifier
}

function scoreSet(publications: PublicationIdentifier[]): ScoreSet {
  return {primaryPublicationIdentifiers: publications} as ScoreSet
}

describe('getPublicationUrl', () => {
  it('returns null when there is no primary publication', () => {
    expect(getPublicationUrl(scoreSet([]))).toBeNull()
  })

  it("delegates to the primary publication's resolved url when one is present", () => {
    const url = 'https://www.nature.com/articles/s41467-023-43041-4'
    expect(getPublicationUrl(scoreSet([publication({url})]))).toBe(url)
  })
})
