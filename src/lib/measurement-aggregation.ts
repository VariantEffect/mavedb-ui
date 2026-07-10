import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type FunctionalClassification = NonNullable<
  NonNullable<AlleleMeasurement['primaryClassification']>['functionalClassification']
>

export type EvidenceLevel = 'protein' | 'nucleotide' | 'mixed'

/** One study's evidence for a change, collapsed from however many equivalence-class representations it assayed. */
export interface StudyEvidence {
  scoreSetUrn: string
  scoreSetTitle: string
  /** The underlying measurements, revealed on expand (a saturation screen may hold many). */
  measurements: AlleleMeasurement[]
  /** The assay level(s) this study contributed: all-protein, all-nucleotide, or both. */
  level: EvidenceLevel
  /** Distinct functional classifications present — one value = concordant, several = the study disagrees internally. */
  classifications: FunctionalClassification[]
  /** Span of functional scores, or null when none carry a score. `min === max` for a single value. */
  scoreRange: {min: number; max: number} | null
}

function levelOf(measurements: AlleleMeasurement[]): EvidenceLevel {
  let protein = false
  let nucleotide = false
  for (const m of measurements) {
    if (m.assayLevel === 'protein') protein = true
    else if (m.assayLevel === 'cdna' || m.assayLevel === 'genomic') nucleotide = true

    if (protein && nucleotide) break
  }

  if (protein && nucleotide) return 'mixed'
  else if (protein) return 'protein'
  else return 'nucleotide'
}

/**
 * Collapse a closed equivalence set (a change's protein-consequence assays + its sibling nucleotide
 * encodings) into one entry per study. Reverse translation makes the individual members redundant — they
 * re-encode the same functional change — so search shows per-study evidence (level, call, score range)
 * rather than a row per representation. Studies with more corroborating measurements sort first.
 */
export function aggregateByStudy(measurements: AlleleMeasurement[]): StudyEvidence[] {
  const byStudy = new Map<string, AlleleMeasurement[]>()
  for (const m of measurements) {
    const existing = byStudy.get(m.scoreSetUrn)
    if (existing) existing.push(m)
    else byStudy.set(m.scoreSetUrn, [m])
  }

  const studies: StudyEvidence[] = []
  for (const [scoreSetUrn, list] of byStudy) {
    const scores = list.map((m) => m.score).filter((s): s is number => s != null)
    const classifications = [
      ...new Set(
        list
          .map((m) => m.primaryClassification?.functionalClassification)
          .filter((c): c is FunctionalClassification => c != null)
      )
    ]
    studies.push({
      scoreSetUrn,
      scoreSetTitle: list[0].scoreSetTitle,
      measurements: list,
      level: levelOf(list),
      classifications,
      scoreRange: scores.length ? {min: Math.min(...scores), max: Math.max(...scores)} : null
    })
  }

  return studies.sort(
    (a, b) => b.measurements.length - a.measurements.length || a.scoreSetTitle.localeCompare(b.scoreSetTitle)
  )
}
