import type {components} from '@/schema/openapi'
import type {KeySection} from '@/composables/use-key-drawer'
import type {SequenceLevel} from '@/composables/use-variant-coordinates'

export type MeasurementRelationship = components['schemas']['MeasurementRelationship']

// The interface collapses the three sequence levels ('genomic' | 'cdna' | 'protein') to two assay-level
// buckets: the nucleotide levels (genomic + coding) share one; protein is 'amino acid'. The finer
// SequenceLevel stays available internally for logic — it just isn't surfaced as its own badge.
export type LevelBucket = 'nucleotide' | 'amino acid'

export function assayLevelBucket(level: string | null | undefined): LevelBucket {
  return level === 'protein' ? 'amino acid' : 'nucleotide'
}

/**
 * Single source of truth for the measurement-to-query relationship vocabulary (the RT asymmetry): the
 * card label, an optional chip class, and the Key-drawer gloss. Phrased relative to the user's variant so
 * the labels self-explain under the "relative to your variant" anchor. Insertion order is display order.
 */
export const RELATIONSHIPS: Record<MeasurementRelationship, {label: string; class?: string; definition: string}> = {
  direct: {
    label: 'Your variant',
    class: 'bg-sage/15 text-sage',
    definition: 'The result assayed exactly the allele you searched.'
  },
  protein_consequence: {
    label: 'Its protein consequence',
    definition: 'The result assayed the protein change your variant produces.'
  },
  nucleotide_encoding: {
    label: 'Encodes the protein consequence',
    definition: 'The result assayed a nucleotide allele that encodes the same protein change as your variant.'
  }
}

export const RELATIONSHIP_KEY_SECTION: KeySection = {
  id: 'relationship',
  title: 'Relationship to your variant',
  gloss: 'How each result relates to the allele you searched.',
  terms: Object.values(RELATIONSHIPS).map((r) => ({label: r.label, definition: r.definition, class: r.class}))
}

/**
 * Single source of truth for how an assay-level bucket appears in the UI — its label, color classes, and
 * Key-drawer gloss. Every level badge, pill, and the Key drawer's assay-level section derives from this,
 * so the vocabulary can never drift across surfaces.
 */
export const LEVEL_BUCKETS: Record<LevelBucket, {label: string; class: string; definition: string}> = {
  nucleotide: {
    label: 'Nucleotide',
    class: 'bg-nucleotide-light text-nucleotide',
    definition: 'Assayed as a nucleotide change.'
  },
  'amino acid': {
    label: 'Amino acid',
    class: 'bg-amino-acid-light text-amino-acid',
    definition: 'Assayed as an amino-acid change.'
  }
}

export const ASSAY_LEVEL_KEY_SECTION: KeySection = {
  id: 'assay-level',
  title: 'Assay level',
  gloss: 'The level at which a result measured the change.',
  terms: Object.values(LEVEL_BUCKETS).map((b) => ({label: b.label, definition: b.definition, class: b.class}))
}

/** The display label, color classes, and gloss for a raw SequenceLevel, collapsed to its bucket. */
export function assayLevelDisplay(level: string | null | undefined): (typeof LEVEL_BUCKETS)[LevelBucket] {
  return LEVEL_BUCKETS[assayLevelBucket(level)]
}

// A score set's variants are all assayed at one level, but some may be unmapped (null). Return the most
// common non-null level, or null when nothing is mapped.
export function dominantAssayLevel(levels: Array<SequenceLevel | null | undefined>): SequenceLevel | null {
  const counts = new Map<SequenceLevel, number>()
  for (const level of levels) {
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1)
  }
  let best: SequenceLevel | null = null
  let bestCount = 0
  for (const [level, count] of counts) {
    if (count > bestCount) {
      best = level
      bestCount = count
    }
  }
  return best
}
