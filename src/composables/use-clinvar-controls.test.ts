import {effectScope, nextTick, ref} from 'vue'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import axios from 'axios'

import {useClinvarControls} from '@/composables/use-clinvar-controls'
import type {DisplayVariant} from '@/lib/variants'

vi.mock('axios')

const OPTIONS = [{dbName: 'ClinVar', availableVersions: ['clinvar_2025']}]
const CONTROLS = [
  {
    dbName: 'ClinVar',
    dbVersion: 'clinvar_2025',
    dbIdentifier: '12345',
    clinicalSignificance: 'Pathogenic',
    clinicalReviewStatus: 'criteria provided, single submitter',
    clinvarLinks: [{variantUrn: 'urn:mavedb:1#1'}]
  }
]

function mockAxios() {
  ;(axios.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.endsWith('/clinical-controls/options')) return Promise.resolve({status: 200, data: OPTIONS})
    if (url.includes('/clinical-controls')) return Promise.resolve({status: 200, data: CONTROLS})
    return Promise.reject(new Error(`unexpected url ${url}`))
  })
}

async function settle(ticks = 6) {
  for (let i = 0; i < ticks; i++) {
    await nextTick()
    await Promise.resolve()
  }
}

describe('useClinvarControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAxios()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    mockAxios()
  })

  test('variants present before controls: associates and flips someVariants', async () => {
    const variants = ref<DisplayVariant[] | null>([
      {variantUrn: 'urn:mavedb:1#1', score: -2} as unknown as DisplayVariant,
      {variantUrn: 'urn:mavedb:1#2', score: 0.1} as unknown as DisplayVariant
    ])
    const scope = effectScope()
    let store!: ReturnType<typeof useClinvarControls>
    scope.run(() => {
      store = useClinvarControls(ref('urn:mavedb:1'), variants)
    })
    await settle()

    expect(store.refreshed).toBe(true)
    expect(store.controls.length).toBe(1)
    expect(store.someVariantsHaveClinicalSignificance).toBe(true)
    expect((variants.value![0] as {control?: unknown}).control).toBeTruthy()
    expect((variants.value![1] as {control?: unknown}).control ?? null).toBeNull()
    scope.stop()
  })

  test('variants arrive AFTER controls: re-associates when variants populate', async () => {
    const variants = ref<DisplayVariant[] | null>(null)
    const scope = effectScope()
    let store!: ReturnType<typeof useClinvarControls>
    scope.run(() => {
      store = useClinvarControls(ref('urn:mavedb:1'), variants)
    })
    await settle()
    // Controls loaded, but no variants yet to associate.
    expect(store.controls.length).toBe(1)
    expect(store.someVariantsHaveClinicalSignificance).toBe(false)

    variants.value = [{variantUrn: 'urn:mavedb:1#1', score: -2} as unknown as DisplayVariant]
    await settle()
    expect(store.someVariantsHaveClinicalSignificance).toBe(true)
    expect((variants.value[0] as {control?: unknown}).control).toBeTruthy()
    scope.stop()
  })
})
