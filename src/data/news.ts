/**
 * News items displayed in the "What's new" section on the homepage.
 *
 * HOW TO ADD A NEWS ITEM
 * ──────────────────────
 * 1. Copy one of the existing entries in the NEWS_ITEMS array below.
 * 2. Paste it at the TOP of the array (newest items go first).
 * 3. Fill in the fields:
 *
 *    date         A short date string shown next to the tag, e.g. "Mar 2025"
 *    tag          One of: "feature", "improvement", or "fix"
 *                   - "feature"     = a new capability or major expansion of an existing one
 *                   - "improvement" = an enhancement to something existing
 *                   - "fix"         = a bug fix
 *    title        A short headline (1 sentence max)
 *    description  A 1–2 sentence summary of the change
 *    href         (optional) A URL to link the title to. Omit this line if
 *                 the item should not link anywhere.
 *
 * 4. Save the file and commit. The homepage will pick up the new entry
 *    automatically on the next deploy.
 *
 * EXAMPLE
 * ───────
 *   {
 *     date: 'Apr 2026',
 *     tag: 'feature',
 *     title: 'Bulk download support',
 *     description: 'You can now download all scores for a collection in a single ZIP file.'
 *   },
 */

export type NewsTag = 'feature' | 'improvement' | 'fix'

export interface NewsItem {
  date: string
  tag: NewsTag
  title: string
  href?: string
  description: string
}

export const NEWS_TAG_STYLES: Record<NewsTag, {bg: string; text: string}> = {
  feature: {bg: 'bg-[#e8f0fe]', text: 'text-[#1a56a0]'},
  improvement: {bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]'},
  fix: {bg: 'bg-[#fff3e0]', text: 'text-[#e65100]'}
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    date: 'Feb 2026',
    tag: 'feature',
    title: 'Categorical Calibrations',
    description:
      'Calibrations now support categorical classifications, allowing you to define discrete categories (e.g. "benign", "pathogenic") with associated evidence strengths.'
  },
  {
    date: 'Jan 2026',
    tag: 'feature',
    title: 'IGVF data linkages',
    description: 'MaveDB score sets are now linked to IGVF data, enabling cross-resource variant effect comparisons.'
  },
  {
    date: 'Dec 2025',
    tag: 'improvement',
    title: 'Variant search expanded to support ClinGen CAId',
    description:
      'You can now look up variants using ClinGen Canonical Allele Identifiers in addition to HGVS, dbSNP, and ClinVar IDs.'
  }
]
