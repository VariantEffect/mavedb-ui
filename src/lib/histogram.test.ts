import {describe, expect, test} from 'vitest'

import {axisTickCount} from '@/lib/histogram'

describe('axisTickCount', () => {
  test('caps at ten ticks on desktop-width charts', () => {
    expect(axisTickCount(900)).toBe(10)
  })

  test('thins ticks on phone-width charts', () => {
    expect(axisTickCount(260)).toBe(5)
  })

  test('never drops below two ticks', () => {
    expect(axisTickCount(40)).toBe(2)
    expect(axisTickCount(0)).toBe(2)
  })
})
