import axios from 'axios'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {getScoreSetCountsPreview, getScoreSetScoresPreview} from './score-sets'

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

const mockedAxiosGet = vi.mocked(axios.get)

function requestedParams(callIndex: number): URLSearchParams {
  return new URL(String(mockedAxiosGet.mock.calls[callIndex][0]), 'http://localhost').searchParams
}

describe('score set preview requests', () => {
  beforeEach(() => {
    mockedAxiosGet.mockReset()
    mockedAxiosGet.mockResolvedValue({data: 'accession\n'} as never)
  })

  it('asks for only the requested number of rows', async () => {
    await getScoreSetScoresPreview('urn:mavedb:00000001-a-1', 5)
    await getScoreSetCountsPreview('urn:mavedb:00000001-a-1', 5)

    expect(requestedParams(0).get('limit')).toBe('5')
    expect(requestedParams(1).get('limit')).toBe('5')
  })

  it('omits the limit when none is given', async () => {
    await getScoreSetScoresPreview('urn:mavedb:00000001-a-1')

    expect(requestedParams(0).has('limit')).toBe(false)
  })

  // Dropping columns that are empty in the first rows would hide columns the full download contains.
  it('keeps unused HGVS columns so the preview matches the download', async () => {
    await getScoreSetScoresPreview('urn:mavedb:00000001-a-1', 5)
    await getScoreSetCountsPreview('urn:mavedb:00000001-a-1', 5)

    expect(requestedParams(0).get('drop_unused_hgvs_columns')).toBe('false')
    expect(requestedParams(1).get('drop_unused_hgvs_columns')).toBe('false')
  })
})
