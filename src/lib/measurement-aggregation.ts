import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type FunctionalClassification = NonNullable<
  NonNullable<AlleleMeasurement['preferredClassification']>['functionalClassification']
>

export type EvidenceLevel = 'protein' | 'nucleotide' | 'mixed'

/** One score set's evidence for a change, collapsed from however many equivalence-class representations it assayed. */
export interface ScoreSetEvidence {
  scoreSetUrn: string
  scoreSetTitle: string
  /** The underlying measurements, revealed on expand (a saturation screen may hold many). */
  measurements: AlleleMeasurement[]
  /** The assay level(s) this score set contributed: all-protein, all-nucleotide, or both. */
  level: EvidenceLevel
  /** Distinct functional classifications present — one value = concordant, several = the score set disagrees internally. */
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
 * encodings) into one entry per score set. Reverse translation makes the individual members redundant —
 * they re-encode the same functional change — so search shows per-score-set evidence (level, call, score
 * range) rather than a row per representation. Score sets with more corroborating measurements sort first.
 */
export function aggregateByScoreSet(measurements: AlleleMeasurement[]): ScoreSetEvidence[] {
  const byScoreSet = new Map<string, AlleleMeasurement[]>()
  for (const m of measurements) {
    const existing = byScoreSet.get(m.scoreSetUrn)
    if (existing) existing.push(m)
    else byScoreSet.set(m.scoreSetUrn, [m])
  }

  const scoreSets: ScoreSetEvidence[] = []
  for (const [scoreSetUrn, list] of byScoreSet) {
    const scores = list.map((m) => m.score).filter((s): s is number => s != null)
    const classifications = [
      ...new Set(
        list
          .map((m) => m.preferredClassification?.functionalClassification)
          .filter((c): c is FunctionalClassification => c != null)
      )
    ]
    scoreSets.push({
      scoreSetUrn,
      scoreSetTitle: list[0].scoreSetTitle,
      measurements: list,
      level: levelOf(list),
      classifications,
      scoreRange: scores.length ? {min: Math.min(...scores), max: Math.max(...scores)} : null
    })
  }

  return scoreSets.sort(
    (a, b) => b.measurements.length - a.measurements.length || a.scoreSetTitle.localeCompare(b.scoreSetTitle)
  )
}
