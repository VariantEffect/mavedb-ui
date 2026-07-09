import type {components} from '@/schema/openapi'

// The assayed level of a measurement (from the mapping record). The two nucleotide levels share one
// visual bucket; protein is its own.
export type AssayLevel = components['schemas']['AnnotationLayer'] // 'protein' | 'cdna' | 'genomic'
export type MeasurementRelationship = components['schemas']['MeasurementRelationship']
export type LevelBucket = 'nucleotide' | 'protein'

export function assayLevelBucket(level: string | null | undefined): LevelBucket {
  return level === 'protein' ? 'protein' : 'nucleotide'
}

// Per-level display labels for the three assay levels (distinct from the two-way bucket labels above).
export const ASSAY_LEVEL_LABELS: Record<AssayLevel, string> = {
  genomic: 'Genomic',
  cdna: 'Coding',
  protein: 'Protein'
}

// A score set's variants are all assayed at one level, but some may be unmapped (null). Return the most
// common non-null level, or null when nothing is mapped.
export function dominantAssayLevel(levels: Array<AssayLevel | null | undefined>): AssayLevel | null {
  const counts = new Map<AssayLevel, number>()
  for (const level of levels) {
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1)
  }
  let best: AssayLevel | null = null
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
  nucleotide: {full: 'Nucleotide level', short: 'Nucleotide'},
  protein: {full: 'Protein level', short: 'Protein'}
}

export const LEVEL_BUCKET_CLASSES: Record<LevelBucket, string> = {
  nucleotide: 'bg-nucleotide-light text-nucleotide',
  protein: 'bg-protein-light text-protein'
}

// How a measurement relates to the queried ClinGen allele — the RT asymmetry.
export const RELATIONSHIP_LABELS: Record<MeasurementRelationship, string> = {
  direct: 'Direct measurement',
  protein_consequence: 'Protein consequence',
  nucleotide_encoding: 'Nucleotide encoding'
}
