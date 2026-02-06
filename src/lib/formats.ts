import moment from 'moment'
import {Opts} from 'linkifyjs'
import linkifyHtml from 'linkify-html'

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
