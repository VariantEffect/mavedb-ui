import type {components} from '@/schema/openapi'
import type {SequenceLevel} from '@/composables/use-variant-coordinates'

// A measurement is assayed at one of the three sequence levels ('protein' | 'cdna' | 'genomic'). The two
// nucleotide levels share one visual bucket; protein is its own. "Assay level" is the concept; the value
// space is just `SequenceLevel`, so we reuse that type rather than mint a parallel one.
export type MeasurementRelationship = components['schemas']['MeasurementRelationship']
export type LevelBucket = 'nucleotide' | 'protein'

export function assayLevelBucket(level: string | null | undefined): LevelBucket {
  return level === 'protein' ? 'protein' : 'nucleotide'
}

// Per-level display labels for the three assay levels (distinct from the two-way bucket labels above).
export const ASSAY_LEVEL_LABELS: Record<SequenceLevel, string> = {
  genomic: 'Genomic',
  cdna: 'Coding',
  protein: 'Protein'
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

export const LEVEL_BUCKET_LABELS: Record<LevelBucket, {full: string; short: string}> = {
  nucleotide: {full: 'Nucleotide', short: 'Nucleotide'},
  protein: {full: 'Protein', short: 'Protein'}
}

export const LEVEL_BUCKET_CLASSES: Record<LevelBucket, string> = {
  nucleotide: 'bg-nucleotide-light text-nucleotide',
  protein: 'bg-protein-light text-protein'
}

// How a measurement relates to the queried ClinGen allele — the RT asymmetry. Phrased relative to the
// user's variant, so the labels self-explain under the "relative to your variant" anchor heading.
export const RELATIONSHIP_LABELS: Record<MeasurementRelationship, string> = {
  direct: 'Your variant',
  protein_consequence: 'Its protein consequence',
  nucleotide_encoding: 'Encodes the protein consequence'
}
