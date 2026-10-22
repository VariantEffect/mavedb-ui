import {describe, expect, it} from 'vitest'

import {describeExpectedReturn, describeScheduledWindow, parseMaintenanceNotice} from './maintenance'

const NOW = new Date('2026-10-20T12:00:00Z')

describe('parseMaintenanceNotice', () => {
  it.each([
    ['null', null],
    ['a string (CloudFront serves index.html for a missing file)', '<!doctype html>'],
    ['an array', []],
    ['an empty object', {}],
    ['an unknown status', {status: 'none'}],
    ['a misspelled status', {status: 'Active'}]
  ])('returns no notice for %s', (_label, raw) => {
    expect(parseMaintenanceNotice(raw, NOW)).toBeNull()
  })

  it('parses a scheduled window', () => {
    const notice = parseMaintenanceNotice(
      {
        status: 'scheduled',
        message: '  Database upgrade.  ',
        start: '2026-10-21T16:00:00Z',
        end: '2026-10-21T20:00:00Z'
      },
      NOW
    )
    expect(notice).toEqual({
      status: 'scheduled',
      message: 'Database upgrade.',
      start: new Date('2026-10-21T16:00:00Z'),
      end: new Date('2026-10-21T20:00:00Z')
    })
  })

  it('treats blank messages and unparseable dates as absent', () => {
    const notice = parseMaintenanceNotice({status: 'active', message: '   ', start: 'tomorrow', end: 42}, NOW)
    expect(notice).toEqual({status: 'active', message: null, start: null, end: null})
  })

  it('drops a scheduled notice once its window has ended', () => {
    expect(parseMaintenanceNotice({status: 'scheduled', end: '2026-10-20T11:59:00Z'}, NOW)).toBeNull()
  })

  it('keeps an active notice after its announced end', () => {
    expect(parseMaintenanceNotice({status: 'active', end: '2026-10-20T11:59:00Z'}, NOW)?.status).toBe('active')
  })
})

describe('describeScheduledWindow', () => {
  const base = {status: 'scheduled' as const, message: null, start: null, end: null}

  it('names both ends of the window when known', () => {
    const text = describeScheduledWindow(
      {...base, start: new Date('2026-10-21T16:00:00Z'), end: new Date('2026-10-21T20:00:00Z')},
      'en-US'
    )
    expect(text).toMatch(/^MaveDB will be unavailable for scheduled maintenance from .+ to .+\.$/)
  })

  it('falls back to a start-only or undated sentence', () => {
    expect(describeScheduledWindow({...base, start: new Date('2026-10-21T16:00:00Z')}, 'en-US')).toMatch(/starting /)
    expect(describeScheduledWindow(base)).toBe('MaveDB will be unavailable for scheduled maintenance soon.')
  })
})

describe('describeExpectedReturn', () => {
  const base = {status: 'active' as const, message: null, start: null}

  it('gives the expected return time while the window is open', () => {
    expect(describeExpectedReturn({...base, end: new Date('2026-10-20T14:00:00Z')}, NOW, 'en-US')).toMatch(
      /^We expect to be back by /
    )
  })

  it('acknowledges an overrun window', () => {
    expect(describeExpectedReturn({...base, end: new Date('2026-10-20T11:00:00Z')}, NOW)).toMatch(
      /longer than expected/
    )
  })

  it('handles a window with no announced end', () => {
    expect(describeExpectedReturn({...base, end: null}, NOW)).toBe('We will be back as soon as possible.')
  })
})
