export type DataSetType = 'scoreSet' | 'experiment'

/** Human-readable display labels for dataset types. */
export const DATA_SET_TYPE_LABELS: Record<DataSetType, string> = {
  scoreSet: 'score set',
  experiment: 'experiment'
}
