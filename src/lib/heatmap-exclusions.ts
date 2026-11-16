/** Why a variant is absent from the heatmap at the current coordinate system and frame. Reasons are mutually exclusive. */
export interface HeatmapExclusionCounts {
  /** Plotted position, but no score, so it contributes to no cell. */
  unscored: number
  /** Resolves to no coordinate at this level or frame (unmapped, or that level absent). */
  noCoordinate: number
  /** Not a placeable single substitution: indels, multivariants, intronic/UTR. */
  complex: number
  /** Position falls outside the displayed reference sequence. */
  outOfRange: number
  /** Start- or stop-loss, hidden because the assay uses a synthetic target sequence. */
  startStopLoss: number
  /** A substitution the heatmap has no row for. */
  noRow: number
}

export type HeatmapSequenceLevel = 'protein' | 'dna' | 'genomic' | string

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

/** One phrase per non-zero reason, most common first, for the heatmap key. */
export function describeHeatmapExclusions(counts: HeatmapExclusionCounts, level: HeatmapSequenceLevel): string[] {
  const noun = level === 'protein' ? 'protein' : level === 'genomic' ? 'genomic' : 'nucleotide'
  const entries: Array<[number, string]> = [
    [counts.unscored, plural(counts.unscored, 'has no score', 'have no score')],
    [
      counts.noCoordinate,
      plural(counts.noCoordinate, `has no ${noun} position in this view`, `have no ${noun} position in this view`)
    ],
    [
      counts.complex,
      plural(
        counts.complex,
        'is too complex to plot (indel or multivariant)',
        'are too complex to plot (indels, multivariants)'
      )
    ],
    [
      counts.outOfRange,
      plural(counts.outOfRange, 'falls outside the target sequence', 'fall outside the target sequence')
    ],
    [counts.startStopLoss, plural(counts.startStopLoss, 'is a hidden start/stop loss', 'are hidden start/stop losses')],
    [
      counts.noRow,
      plural(counts.noRow, 'has a substitution with no heatmap row', 'have substitutions with no heatmap row')
    ]
  ]
  return entries
    .filter(([n]) => n > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([, text]) => text)
}

export function totalHeatmapExclusions(counts: HeatmapExclusionCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}
