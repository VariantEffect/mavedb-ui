import {beforeEach, describe, expect, it, vi} from 'vitest'
import {nextTick, ref, type Ref} from 'vue'

import {useCanonicalUrn} from './use-canonical-urn'

const replace = vi.fn()
const route = {
  name: 'scoreSet' as string | null,
  params: {urn: ''} as Record<string, unknown>,
  query: {} as Record<string, unknown>,
  hash: ''
}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({replace: (...args: unknown[]) => replace(...args)})
}))

const RETIRED_URN = 'tmp:6b0e6f6a-2f1e-4a8f-9a1e-0f2c3d4e5f60'
const PUBLISHED_URN = 'urn:mavedb:00000001-a-1'

interface Record_ {
  urn?: string | null
}

/** Load a record under the URN the route asked for, and report what the router was told to do. */
async function load(itemId: string, loaded: Record_ | null): Promise<void> {
  const item: Ref<Record_ | null> = ref(null)
  useCanonicalUrn(item, ref(itemId))
  item.value = loaded
  await nextTick()
}

beforeEach(() => {
  replace.mockReset()
  route.name = 'scoreSet'
  route.params = {urn: RETIRED_URN}
  route.query = {}
  route.hash = ''
})

describe('useCanonicalUrn', () => {
  it('replaces the route when the record answers to a different URN', async () => {
    await load(RETIRED_URN, {urn: PUBLISHED_URN})

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith({
      name: 'scoreSet',
      params: {urn: PUBLISHED_URN},
      query: {},
      hash: ''
    })
  })

  it('carries the query and hash onto the canonical URL', async () => {
    route.query = {variant: 'p.Met1Leu'}
    route.hash = '#scores'

    await load(RETIRED_URN, {urn: PUBLISHED_URN})

    expect(replace).toHaveBeenCalledWith({
      name: 'scoreSet',
      params: {urn: PUBLISHED_URN},
      query: {variant: 'p.Met1Leu'},
      hash: '#scores'
    })
  })

  it('keeps the rest of the path, for a sub-resource route', async () => {
    route.name = 'scoreSetCalibrations'

    await load(RETIRED_URN, {urn: PUBLISHED_URN})

    // The route name rebuilds /score-sets/:urn/calibrations; only the param is substituted.
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({name: 'scoreSetCalibrations'}))
  })

  it('leaves the route alone when the record answers to the URN asked for', async () => {
    route.params = {urn: PUBLISHED_URN}

    await load(PUBLISHED_URN, {urn: PUBLISHED_URN})

    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the route alone while no record has arrived', async () => {
    await load(RETIRED_URN, null)

    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves the route alone when the record reports no URN', async () => {
    await load(RETIRED_URN, {urn: null})

    expect(replace).not.toHaveBeenCalled()
  })

  it('leaves an unnamed route alone, having no name to rebuild it from', async () => {
    route.name = null

    await load(RETIRED_URN, {urn: PUBLISHED_URN})

    expect(replace).not.toHaveBeenCalled()
  })
})
