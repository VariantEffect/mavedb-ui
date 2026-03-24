import {beforeEach, describe, expect, it, vi} from 'vitest'

type ScoreSetLike = {
  urn: string
}

type GetBufferedScoreSet = (urn: string) => Promise<ScoreSetLike>

let getBufferedScoreSet: GetBufferedScoreSet
let mockedAxiosGet: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()

  mockedAxiosGet = vi.fn(async (_url: string, config: {params: {urns: string}}) => {
    const urns = config.params.urns.split(',').filter((urn) => urn.length > 0)
    return {data: urns.map((urn) => ({urn}))}
  })

  vi.doMock('axios', () => ({
    default: {
      get: mockedAxiosGet
    }
  }))

  vi.doMock('@/config', () => ({
    default: {
      apiBaseUrl: 'https://api.example'
    }
  }))
  ;({getBufferedScoreSet} = await import('./buffered-score-set-requests'))
})

describe('getBufferedScoreSet', () => {
  it('batches multiple buffered URNs into a single request when under the limit', async () => {
    const urns = ['urn:mavedb:00000001-a-1', 'urn:mavedb:00000001-a-2', 'urn:mavedb:00000001-a-3']

    const results = await Promise.all(urns.map((urn) => getBufferedScoreSet(urn)))

    expect(mockedAxiosGet).toHaveBeenCalledTimes(1)
    expect(mockedAxiosGet).toHaveBeenCalledWith('https://api.example/score-sets/', {
      params: {urns: urns.join(',')}
    })
    expect(results.map((result) => result.urn)).toEqual(urns)
  })

  it('splits buffered requests into multiple calls when the query string would exceed 2048 characters', async () => {
    const urns = Array.from(
      {length: 6},
      (_, index) => `urn:mavedb:${String(index).padStart(8, '0')}-${'x'.repeat(450)}`
    )

    const results = await Promise.all(urns.map((urn) => getBufferedScoreSet(urn)))

    expect(mockedAxiosGet.mock.calls.length).toBeGreaterThan(1)

    for (const [, requestConfig] of mockedAxiosGet.mock.calls as Array<[string, {params: {urns: string}}]>) {
      const encodedQueryLength = `urns=${encodeURIComponent(requestConfig.params.urns)}`.length
      expect(encodedQueryLength).toBeLessThanOrEqual(2048)
    }

    expect(results.map((result) => result.urn)).toEqual(urns)
  })
})
