import {describe, expect, test} from 'vitest'

import {missingRequiredFieldErrors} from '@/lib/form-validation'

describe('missingRequiredFieldErrors', () => {
  test('flags null, undefined, blank strings and empty arrays', () => {
    expect(
      missingRequiredFieldErrors({title: null, shortDescription: undefined, abstractText: '   ', contributors: []})
    ).toEqual({
      title: 'This field is required.',
      shortDescription: 'This field is required.',
      abstractText: 'This field is required.',
      contributors: 'This field is required.'
    })
  })

  test('ignores filled values, including falsy non-empty ones', () => {
    expect(missingRequiredFieldErrors({title: 'BRCA2 SGE', experiment: {urn: 'urn:mavedb:1'}, numTargets: 0})).toEqual(
      {}
    )
  })

  test('uses the provided message', () => {
    expect(missingRequiredFieldErrors({experiment: null}, 'Choose an experiment.')).toEqual({
      experiment: 'Choose an experiment.'
    })
  })
})
