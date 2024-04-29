import Papa from 'papaparse'

export interface ScoresOrCountsRow {
  score?: number
  [key: string]: any
}

/**
 * Parse CSV data representing variant scores or counts.
 *
 * @param csvData A CSV string representing variants and their scores or counts. There should be a header row containing
 *   column names. If there is a colum named "scores," its values should be numeric.
 * @returns The parsed data, as an array of objects with keys from the column names.
 */
export function parseScoresOrCounts(csvData: string) {
  csvData = csvData.replace(/(^|\n|\r) *#[^\n\r]*(\n|\r|\r\n|$)/g, '$1')
  const rows = Papa.parse<ScoresOrCountsRow>(csvData, {
    dynamicTyping: true,
    header: true,
    // comment: '#', // We can't use this, because our data have unescaped #s.
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length) {
        console.error("Scores CSV data could not be parsed.", results.errors);
      }
    }
  }).data
  return rows
}
