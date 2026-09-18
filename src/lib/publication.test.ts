import {describe, expect, it} from 'vitest'

import {getPublicationUrl, type PublicationIdentifier} from './publication'

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

describe('getPublicationUrl', () => {
  it("prefers the publication's own resolved url", () => {
    const url = 'https://www.nature.com/articles/s41467-023-43041-4'
    expect(getPublicationUrl(publication({url, doi: '10.1038/s41467-023-43041-4'}))).toBe(url)
  })

  it('builds a doi.org link from a bare DOI when no url is present', () => {
    expect(getPublicationUrl(publication({url: null, doi: '10.1038/s41467-023-43041-4'}))).toBe(
      'https://doi.org/10.1038/s41467-023-43041-4'
    )
  })

  it('normalizes a prefixed DOI before building the link', () => {
    expect(getPublicationUrl(publication({url: null, doi: 'https://doi.org/10.1000/xyz'}))).toBe(
      'https://doi.org/10.1000/xyz'
    )
  })

  it('builds a PubMed link from a numeric PubMed identifier', () => {
    expect(getPublicationUrl(publication({url: null, doi: null, dbName: 'PubMed', identifier: '38057330'}))).toBe(
      'https://pubmed.ncbi.nlm.nih.gov/38057330/'
    )
  })

  it('returns null when the only identifier is a non-numeric, non-DOI, non-PubMed reference', () => {
    expect(
      getPublicationUrl(publication({url: null, doi: null, dbName: 'bioRxiv', identifier: '2022.06.10'}))
    ).toBeNull()
  })
})
