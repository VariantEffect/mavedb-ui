/**
 * Maintenance notices, read from a static `maintenance.json` served next to the UI bundle.
 *
 * The file lives in the UI's S3 bucket rather than behind the API so that it stays reachable while the API and
 * database are down. Operators edit it by hand; see the maintenance runbook in the deployment repository
 * (`docs/maintenance.md`) for the schema and the procedure.
 */

export type MaintenanceStatus = 'scheduled' | 'active'

export interface MaintenanceNotice {
  /** `scheduled` shows a site-wide banner; `active` replaces the app with the maintenance screen. */
  status: MaintenanceStatus
  /** Optional operator-written detail (e.g. what is being upgraded), shown after the generated window text. */
  message: string | null
  start: Date | null
  end: Date | null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Interpret the contents of `maintenance.json`.
 *
 * Anything unrecognized yields no notice: the file is hand-edited, and when it is absent CloudFront answers with
 * `index.html`, so a malformed or missing file must never take the site down. A scheduled notice whose end time has
 * passed is dropped so a forgotten file does not linger; an active one is kept until an operator lifts it, because
 * overrunning the announced window is exactly when users most need to see it.
 */
export function parseMaintenanceNotice(raw: unknown, now: Date = new Date()): MaintenanceNotice | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>
  if (data.status !== 'scheduled' && data.status !== 'active') return null

  const notice: MaintenanceNotice = {
    status: data.status,
    message: typeof data.message === 'string' && data.message.trim() ? data.message.trim() : null,
    start: parseDate(data.start),
    end: parseDate(data.end)
  }

  if (notice.status === 'scheduled' && notice.end && notice.end <= now) return null
  return notice
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
}

/** Format a maintenance time in the viewer's locale and time zone. */
export function formatMaintenanceTime(date: Date, locale?: string): string {
  return date.toLocaleString(locale, DATE_FORMAT)
}

/** Banner text for a scheduled window, in the viewer's time zone. */
export function describeScheduledWindow(notice: MaintenanceNotice, locale?: string): string {
  const {start, end} = notice
  if (start && end) {
    return `MaveDB will be unavailable for scheduled maintenance from ${formatMaintenanceTime(start, locale)} to ${formatMaintenanceTime(end, locale)}.`
  }
  if (start)
    return `MaveDB will be unavailable for scheduled maintenance starting ${formatMaintenanceTime(start, locale)}.`
  return 'MaveDB will be unavailable for scheduled maintenance soon.'
}

/** Status line for the maintenance screen, accounting for windows that have run long. */
export function describeExpectedReturn(notice: MaintenanceNotice, now: Date = new Date(), locale?: string): string {
  if (!notice.end) return 'We will be back as soon as possible.'
  if (notice.end > now) return `We expect to be back by ${formatMaintenanceTime(notice.end, locale)}.`
  return 'Maintenance is taking longer than expected. We will be back as soon as possible.'
}
