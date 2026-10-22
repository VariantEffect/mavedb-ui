import {describe, expect, it} from 'vitest'

import {accessKeyRowState, maskAccessKey} from './access-keys'
import type {components} from '@/schema/openapi'

type AccessKey = components['schemas']['AccessKey']
type NewAccessKey = components['schemas']['NewAccessKey']

const listed = (id: number, keyHint = 'abcd'): AccessKey => ({id, keyHint})
const created = (id: number, keyId = 'full-key-wxyz'): NewAccessKey => ({
  id,
  keyHint: keyId.slice(-4),
  keyId,
  privateKey: 'private'
})

describe('accessKeyRowState', () => {
  it('shows nothing when the role has no key', () => {
    expect(accessKeyRowState(undefined, undefined)).toEqual({accessKey: null, newKey: null})
  })

  it('shows a listed key masked, without its full value', () => {
    expect(accessKeyRowState(listed(1), undefined)).toEqual({accessKey: listed(1), newKey: null})
  })

  it('shows the full value of a key just generated, once it is listed', () => {
    expect(accessKeyRowState(listed(2, 'wxyz'), created(2))).toEqual({
      accessKey: listed(2, 'wxyz'),
      newKey: 'full-key-wxyz'
    })
  })

  it('shows a key just generated before the list reloads', () => {
    const key = created(2)
    expect(accessKeyRowState(undefined, key)).toEqual({accessKey: key, newKey: 'full-key-wxyz'})
  })

  it('never shows a generated key against a different listed key', () => {
    expect(accessKeyRowState(listed(3), created(2))).toEqual({accessKey: listed(3), newKey: null})
  })
})

describe('maskAccessKey', () => {
  it('keeps only the hint', () => {
    expect(maskAccessKey('wxyz')).toBe('••••••••wxyz')
  })

  it('masks fully when there is no hint', () => {
    expect(maskAccessKey(null)).toBe('••••••••')
  })
})
