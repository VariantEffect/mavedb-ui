import moment from 'moment'

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
 * - Linkifies http/https URLs and bare www. domains
 * - Preserves trailing punctuation outside the link
 */
export function linkifyTextHtml(text: string | null | undefined): string {
  if (!text) return ''

  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const escaped = escapeHtml(text)

  // Linkify http/https URLs
  let linked = escaped.replace(/\bhttps?:\/\/[^\s<)]+[\w\/#?=&%+\-._~]*\b[\)\]]?/gi, (raw) => {
    let url = raw
    const m = url.match(/[).,!?:;]+$/)
    const trailing = m ? m[0] : ''
    if (trailing) url = url.slice(0, -trailing.length)
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trailing}`
  })

  // Linkify bare www. domains
  linked = linked.replace(/(^|[^\w/])(www\.[^\s<)]+)\b/gi, (match, pre, host) => {
    return `${pre}<a href="http://${host}" target="_blank" rel="noopener noreferrer">${host}</a>`
  })

  return linked
}
