/**
 * VEP consequence taxonomy for the score-set views.
 *
 * The API annotates each variant with a VEP functional consequence — a free-form Sequence Ontology
 * (SO) term (`missense_variant`, `splice_acceptor_variant`, …). This module is the single source of
 * truth for grouping that open-ended set into a small, fixed set of display buckets (the histogram
 * effect series) and for rendering a term human-readably (tooltips). It operates on the consequence
 * *string*, so it has no dependency on any variant shape and stays trivially testable.
 */

export type EffectBucketName =
  | 'Missense'
  | 'Synonymous'
  | 'Nonsense'
  | 'Start/Stop Loss'
  | 'Indel/Frameshift'
  | 'Splice'
  | 'Other'
  | 'No consequence'

export interface EffectBucket {
  name: EffectBucketName
  color: string
  description: string
  /** VEP SO terms mapped into this bucket. Empty for the two catch-alls (`Other`, `No consequence`). */
  soTerms: string[]
}

/**
 * The display buckets, in series order. Every VEP consequence resolves to exactly one:
 * - a term listed below → that bucket,
 * - a term present but not listed → `Other` (so new API terms never break the UI — they still render
 *   their specific term in the tooltip),
 * - no consequence at all (unmapped / unannotated) → `No consequence`.
 */
export const EFFECT_BUCKETS: EffectBucket[] = [
  {
    name: 'Missense',
    color: '#ffcd3a',
    description: 'Missense variants',
    soTerms: ['missense_variant', 'rare_amino_acid_variant']
  },
  {
    name: 'Synonymous',
    color: '#6aa84f',
    description: 'Synonymous variants',
    soTerms: ['synonymous_variant', 'stop_retained', 'start_retained', 'incomplete_terminal_codon_variant']
  },
  {
    name: 'Nonsense',
    color: '#681a1a',
    description: 'Nonsense (stop-gained) variants',
    soTerms: ['stop_gained']
  },
  {
    name: 'Start/Stop Loss',
    color: '#cd3aff',
    description: 'Start- and stop-loss variants',
    soTerms: ['start_lost', 'stop_lost']
  },
  {
    name: 'Indel/Frameshift',
    color: '#ff8c00',
    description: 'In-frame indels and frameshifts',
    soTerms: [
      'frameshift_variant',
      'inframe_insertion',
      'inframe_deletion',
      'disruptive_inframe_insertion',
      'disruptive_inframe_deletion',
      'protein_altering_variant'
    ]
  },
  {
    name: 'Splice',
    color: '#1f77b4',
    description: 'Splice-site variants',
    soTerms: ['splice_acceptor_variant', 'splice_donor_variant', 'splice_region_variant']
  },
  {
    name: 'Other',
    color: '#3affcd',
    description: 'Other annotated consequences (non-coding, regulatory, …)',
    soTerms: []
  },
  {
    name: 'No consequence',
    color: '#9e9e9e',
    description: 'No VEP consequence (unmapped or unannotated)',
    soTerms: []
  }
]

const CONSEQUENCE_TO_BUCKET: Record<string, EffectBucketName> = Object.fromEntries(
  EFFECT_BUCKETS.flatMap((bucket) => bucket.soTerms.map((term) => [term, bucket.name]))
)

/**
 * The display bucket for a VEP consequence term. `No consequence` when the term is absent/`NA`
 * (unmapped or unannotated); `Other` when it is present but not one of the headline categories.
 */
export function consequenceBucket(consequence: string | null | undefined): EffectBucketName {
  if (!consequence || consequence === 'NA') {
    return 'No consequence'
  }
  return CONSEQUENCE_TO_BUCKET[consequence] ?? 'Other'
}

// A curated label where the raw SO term reads poorly as an effect (`stop_gained` is really "nonsense").
// The long tail falls back to the de-underscored term with a capitalised first letter.
const CONSEQUENCE_LABELS: Record<string, string> = {
  stop_gained: 'Nonsense (stop gained)',
  stop_lost: 'Stop loss',
  start_lost: 'Start loss'
}

/**
 * A human-readable rendering of a VEP consequence term for tooltips. Known terms get a curated label;
 * the long tail is the de-underscored term with its first letter capitalised, preserving embedded
 * casing (`splice_acceptor_variant` → 'Splice acceptor variant', `5_prime_UTR_variant` → '5 prime UTR
 * variant'). Returns `null` when there is no consequence.
 */
export function humanReadableConsequence(consequence: string | null | undefined): string | null {
  if (!consequence || consequence === 'NA') {
    return null
  }
  if (CONSEQUENCE_LABELS[consequence]) {
    return CONSEQUENCE_LABELS[consequence]
  }
  const spaced = consequence.replace(/_/g, ' ').trim()
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : consequence
}

export interface EffectTypeFilterOption {
  name: EffectBucketName
  shortDescription: string
  description: string
}

/** Filter checkbox options for the protein-effect and control panels — one per bucket, in series order. */
export const EFFECT_TYPE_FILTER_OPTIONS: EffectTypeFilterOption[] = EFFECT_BUCKETS.map((bucket) => ({
  name: bucket.name,
  shortDescription: bucket.name,
  description: bucket.description
}))

/**
 * Buckets selected by default. Covers every annotated coding/other category so control variants of any
 * kind still show without opt-in (as they did when `Other` was a catch-all). Excludes `Start/Stop Loss`
 * (added conditionally by callers that hide it for synthetic targets) and `No consequence` (the
 * unannotated pile is opt-in).
 */
export const DEFAULT_EFFECT_TYPE_FILTERS: EffectBucketName[] = [
  'Missense',
  'Synonymous',
  'Nonsense',
  'Indel/Frameshift',
  'Splice',
  'Other'
]
