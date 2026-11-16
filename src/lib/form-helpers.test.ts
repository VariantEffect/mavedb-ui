import type {ToastServiceMethods} from 'primevue/toastservice'
import {describe, expect, it, vi} from 'vitest'

import {addDoiIdentifier, normalizeDoiArray} from '@/lib/form-helpers'

// form-helpers imports lib/orcid, which reads `window` when it loads.
vi.mock('@/lib/orcid', () => ({ORCID_ID_REGEX: /^\d{4}-\d{4}-\d{4}-(\d{4}|\d{3}X)$/}))
vi.mock('@/api/mavedb', () => ({lookupOrcidUser: vi.fn()}))

function fakeToast() {
  return {add: vi.fn()} as unknown as ToastServiceMethods & {add: ReturnType<typeof vi.fn>}
}

describe('addDoiIdentifier', () => {
  it('adds a new DOI', () => {
    const toast = fakeToast()
    expect(addDoiIdentifier('10.1000/abc', [], toast)).toEqual([{identifier: '10.1000/abc'}])
    expect(toast.add).not.toHaveBeenCalled()
  })

  it('rejects a DOI that differs from an existing one only in case', () => {
    const toast = fakeToast()
    expect(addDoiIdentifier('10.1000/abc', [{identifier: '10.1000/ABC'}], toast)).toBeNull()
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'warn'}))
  })
})

describe('normalizeDoiArray', () => {
  it('keeps listed DOIs and adds a typed one', () => {
    const toast = fakeToast()
    expect(normalizeDoiArray([{identifier: '10.1000/ABC'}, '10.1000/def'], toast)).toEqual([
      {identifier: '10.1000/ABC'},
      {identifier: '10.1000/def'}
    ])
    expect(toast.add).not.toHaveBeenCalled()
  })

  it('rejects a typed DOI that differs from a listed one only in case', () => {
    const toast = fakeToast()
    expect(normalizeDoiArray([{identifier: '10.1000/ABC'}, '10.1000/abc'], toast)).toEqual([
      {identifier: '10.1000/ABC'}
    ])
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'warn'}))
  })
})
