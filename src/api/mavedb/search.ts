import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type ScoreSetSearch = components['schemas']['ScoreSetsSearch']
type ScoreSetsSearchResponse = components['schemas']['ScoreSetsSearchResponse']
export type ScoreSetsSearchFilterOptionsResponse = components['schemas']['ScoreSetsSearchFilterOptionsResponse']

export async function searchScoreSets(params: ScoreSetSearch, signal?: AbortSignal): Promise<ScoreSetsSearchResponse> {
  const response = await axios.post(`${config.apiBaseUrl}/score-sets/search`, params, {
    headers: {accept: 'application/json'},
    signal
  })
  return response.data || {scoreSets: [], numScoreSets: 0}
}

export async function getSearchFilterOptions(
  params: ScoreSetSearch,
  signal?: AbortSignal
): Promise<ScoreSetsSearchFilterOptionsResponse> {
  const response = await axios.post(`${config.apiBaseUrl}/score-sets/search/filter-options`, params, {
    headers: {accept: 'application/json'},
    signal
  })
  return response.data
}
