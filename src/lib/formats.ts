import moment from 'moment'
import {Opts} from 'linkifyjs'
import linkifyHtml from 'linkify-html'

/** Humanize a `snake_case` enum token → "Title Case", e.g. `missense_variant` → "Missense Variant". */
export function formatConsequence(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

/**
 * Rank an HGVS label for use as a human display label when several alleles collapse to one annotation:
 * prefer a coding `c.` (reads more naturally), then genomic `g.`, then anything, then nothing.
 */
export function hgvsLabelRank(hgvs: string | null): number {
  if (!hgvs) return 0
  if (/(^|:)c\./.test(hgvs)) return 3
  if (/(^|:)g\./.test(hgvs)) return 2
  return 1
}

export function formatDate(x: string) {
  return moment(x).format('MMM DD, YYYY')
}
export function formatInt(x: number | null) {
  if (x == null) {
    return ''
  }
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })
}

/**
 * Safely convert plain text containing URLs into HTML with clickable links.
 * - Escapes HTML to prevent XSS
 * - Linkifies URLs via linkify-html
 *
 * @param text The plain text to linkify.
 * @param options Optional linkify-html options.
 * @returns The linkified HTML string.
 */
export function linkifyTextHtml(text: string | null | undefined, options?: Opts): string {
  if (!text) return ''

  const defaultOptions = {
    defaultProtocol: 'https',
    target: {
      url: '_blank'
    },
    rel: 'noopener noreferrer'
  }

  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const escaped = escapeHtml(text)

  return linkifyHtml(escaped, {...defaultOptions, ...options})
}
