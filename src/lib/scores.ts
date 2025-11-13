import Papa from 'papaparse'

export interface ScoresOrCountsRow {
  scores?: {score?: number | 'NA'; [key: string]: any}
  [key: string]: any
}

/**
 * Transform flat namespaced columns into nested objects.
 * Converts columns like "namespace.colname" into nested structure { namespace: { colname: value } }
 */
function transformNamespacedColumns(row: ScoresOrCountsRow): ScoresOrCountsRow {
  const transformedRow: ScoresOrCountsRow = {}

  for (const [key, value] of Object.entries(row)) {
    if (key.includes('.')) {
      const parts = key.split('.')
      const namespace = parts[0]
      const columnName = parts.slice(1).join('.') // Handle nested dots like "ns.sub.col"

      if (!transformedRow[namespace]) {
        transformedRow[namespace] = {}
      }
      transformedRow[namespace][columnName] = value
    } else {
      // Keep non-namespaced columns at the root level
      transformedRow[key] = value
    }
  }

  return transformedRow
}

/**
 * Parse CSV data representing variant scores or counts.
 *
 * @param csvData A CSV string representing variants and their scores or counts. There should be a header row containing
 *   column names. Column names with dots (e.g., "namespace.colname") will be transformed into nested objects.
 * @returns The parsed data, as an array of objects with keys from the column names.
 */
export function parseScoresOrCounts(csvData: string, namespaced: boolean): ScoresOrCountsRow[] {
  csvData = csvData.replace(/(^|\n|\r) *#[^\n\r]*(\n|\r|\r\n|$)/g, '$1')
  const rows = Papa.parse<ScoresOrCountsRow>(csvData, {
    dynamicTyping: true,
    header: true,
    // comment: '#', // We can't use this, because our data have unescaped #s.
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length) {
        console.error('Scores CSV data could not be parsed.', results.errors)
      }
    }
  }).data

  if (namespaced) {
    return rows.map((row) => transformNamespacedColumns(row))
  }

  return rows
}
