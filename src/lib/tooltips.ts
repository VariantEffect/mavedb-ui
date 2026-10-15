// Shared builders for the d3-injected chart tooltips (histogram + heatmap).
//
// These tooltips are appended to document.body and rendered via d3 `.html()`, so they live
// outside the Vue component tree: styling uses global Tailwind utilities (no scoped CSS would
// reach them), and only data-driven colors are inline. Keep class strings literal so Tailwind's
// scanner picks them up.

/** Wrap composed sections in the tooltip root, or return null when there is nothing to show. */
export function tooltipRoot(sections: (string | null | undefined)[]): string | null {
  const html = sections.filter(Boolean).join('')
  return html ? `<div class="text-xs leading-snug max-w-[320px]">${html}</div>` : null
}

// A tooltip section. Sections after the first are separated by a divider. Returns empty when it has no
// content, so callers can compose optional sections without leaving stray dividers behind.
export function tooltipSection(rows: (string | null | undefined)[]): string {
  const body = rows.filter(Boolean).join('')
  if (!body) {
    return ''
  }
  return `<div class="mt-1.5 pt-1.5 border-t border-black/10 first:mt-0 first:pt-0 first:border-t-0">${body}</div>`
}

/** A small, muted, uppercase section heading (e.g. "ClinVar", "Bin 1 to 1.05"). */
export function tooltipSectionLabel(text: string): string {
  return `<div class="uppercase text-[10px] tracking-[0.04em] opacity-[.55] mb-0.5">${text}</div>`
}

export function tooltipTitle(text: string): string {
  return `<div class="font-semibold">${text}</div>`
}

export function tooltipConsequence(text: string): string {
  return `<div class="italic opacity-[.85]">${text}</div>`
}

/** A muted, italicized aside (e.g. "Could not be mapped"). */
export function tooltipNote(text: string): string {
  return `<div class="italic opacity-[.75]">${text}</div>`
}

export function tooltipFootnote(text: string): string {
  return `<div class="text-[11px] opacity-[.65] italic mt-1">*${text}</div>`
}

export function tooltipText(text: string): string {
  return `<div>${text}</div>`
}

export function tooltipEmptyLine(): string {
  return `<div class="h-1"></div>`
}

export function tooltipKeyValue(label: string, value: string | number | null | undefined): string {
  return `<div><span class="opacity-60">${label}:</span> ${value ?? ''}</div>`
}

export function tooltipLink(href: string, text: string): string {
  return `<a href="${href}" target="_blank" class="text-link block mt-0.5">${text}</a>`
}

/** ClinGen variant-details link — shared by both charts. */
export function tooltipVariantDetailsLink(clingenAlleleId: string, variantUrn?: string | null): string {
  const query = variantUrn ? `?variant=${encodeURIComponent(variantUrn)}` : ''
  return tooltipLink(`/variants/${clingenAlleleId}${query}`, 'View variant details')
}

/** A round color swatch, used to tie series/legend colors to their labels. */
export function tooltipSwatch(color: string): string {
  return `<span class="inline-block h-3 w-3 mr-1.5 rounded-full shrink-0" style="background-color: ${color}"></span>`
}

/** A colored, titled classification/shader badge. */
export function tooltipBadge(color: string, text: string): string {
  return `<span class="inline-block px-1 py-0.5 rounded text-[11px] font-bold text-white" style="background-color: ${color}">${text}</span>`
}

/** A badge on its own line, spaced from the line above (e.g. a classification under a score). */
export function tooltipBadgeBlock(color: string, text: string): string {
  return `<div class="mt-1">${tooltipBadge(color, text)}</div>`
}

/** A wrapping row of badges. */
export function tooltipBadgeRow(badges: string[]): string {
  return `<div class="flex flex-wrap gap-1 mb-1">${badges.join('')}</div>`
}

/** A `swatch · label · count` row. `active` bolds it (e.g. the hovered variant's series). */
export function tooltipCountRow(options: {color: string; label: string; count: number; active?: boolean}): string {
  const {color, label, count, active = false} = options
  return (
    `<div class="flex items-center${active ? ' font-semibold' : ''}">` +
    tooltipSwatch(color) +
    `<span class="flex-auto">${label ? label : '<i>No series label</i>'}</span>` +
    `<span class="ml-4 tabular-nums">${count}</span>` +
    '</div>'
  )
}

/** Four-star review rating, ClinVar-style (filled stars first). */
export function tooltipReviewStars(numStars: number): string {
  const filled = '<span class="mx-px text-[#fdb81e]">★</span>'
  const empty = '<span class="mx-px">☆</span>'
  const stars = new Array(4).fill(filled).fill(empty, numStars)
  return `(${stars.join('')})`
}
