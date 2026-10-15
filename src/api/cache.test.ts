import {beforeEach, describe, expect, it, vi} from 'vitest'

import {clearReadCache, memoizeRead} from './cache'

describe('memoizeRead', () => {
  let calls: number

  beforeEach(() => {
    calls = 0
    clearReadCache()
  })

  function read() {
    return memoizeRead(
      async (urn: string) => {
        calls += 1
        return {urn, calls}
      },
      (urn) => urn
    )
  }

  it('serves a repeat read from the cache', async () => {
    const get = read()
    await get('urn:1')
    await get('urn:1')
    expect(calls).toBe(1)
  })

  it('keys distinct arguments separately', async () => {
    const get = read()
    await get('urn:1')
    await get('urn:2')
    expect(calls).toBe(2)
  })

  // Guards the viewer-scoping fix: `scoreCalibrations`/`supersedingScoreSet` differ per identity, and the
  // cache key carries no viewer, so a signed-out session must not keep serving the previous identity's
  // response. Sign-out calls this; without it the entry survives for the full TTL.
  it('drops cached reads when the viewer changes', async () => {
    const get = read()
    await get('urn:1')

    clearReadCache()
    await get('urn:1')

    expect(calls).toBe(2)
  })

  it('clears every cache, not just the most recent', async () => {
    const first = read()
    const second = read()
    await first('urn:1')
    await second('urn:1')
    expect(calls).toBe(2)

    clearReadCache()
    await first('urn:1')
    await second('urn:1')
    expect(calls).toBe(4)
  })
})

describe('signOut', () => {
  // The wiring itself: sign-out must reach clearReadCache, or the fix above is unreachable in production.
  it('clears memoized reads', async () => {
    // orcid.ts reads these at module scope; these tests run in the node environment.
    const storage = {getItem: () => null, setItem: () => {}, removeItem: () => {}}
    vi.stubGlobal('window', {location: {origin: 'https://example.org'}, localStorage: storage})
    vi.stubGlobal('localStorage', storage)

    vi.resetModules()
    const {memoizeRead: mr} = await import('./cache')
    let n = 0
    const get = mr(
      async (urn: string) => {
        n += 1
        return urn
      },
      (urn) => urn
    )
    await get('urn:1')
    await get('urn:1')
    expect(n).toBe(1)

    const {signOut} = await import('@/lib/orcid')
    signOut()

    await get('urn:1')
    expect(n).toBe(2)
  })
})
