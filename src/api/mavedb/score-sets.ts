import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type ScoreSetSearch = components['schemas']['ScoreSetsSearch']
type ScoreSetsSearchResponse = components['schemas']['ScoreSetsSearchResponse']
export type ScoreSetsSearchFilterOptionsResponse = components['schemas']['ScoreSetsSearchFilterOptionsResponse']

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

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

export async function searchMyScoreSets(text?: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/me/score-sets/search`,
    {text: text || null},
    {headers: {accept: 'application/json'}}
  )
  return response.data?.scoreSets || []
}

export async function searchScoreSetsByPublication(identifier: string, dbName: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/score-sets/search`,
    {publication_identifiers: [identifier], databases: [dbName]},
    {headers: {accept: 'application/json'}}
  )
  return response.data?.scoreSets || []
}

// ---------------------------------------------------------------------------
// CRUD & data operations
// ---------------------------------------------------------------------------

export async function createScoreSet(payload: Record<string, unknown>) {
  return axios.post(`${config.apiBaseUrl}/score-sets/`, payload)
}

export async function updateScoreSetWithVariants(urn: string, formData: FormData) {
  return axios.patch(`${config.apiBaseUrl}/score-sets-with-variants/${urn}`, formData, {
    headers: {'Content-Type': 'multipart/form-data'}
  })
}

export async function uploadVariantData(urn: string, formData: FormData) {
  return axios.post(`${config.apiBaseUrl}/score-sets/${urn}/variants/data`, formData, {
    headers: {'Content-Type': 'multipart/form-data'}
  })
}

export async function deleteScoreSet(urn: string) {
  const response = await axios.delete(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}`)
  return response.data
}

export async function publishScoreSet(urn: string) {
  const response = await axios.post(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/publish`)
  return response.data
}

export async function getScoreSetClinicalControlOptions(urn: string) {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/clinical-controls/options`)
  return response.data
}

export async function downloadScoreSetFile(urn: string, type: 'scores' | 'counts'): Promise<string> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/${type}?drop_na_columns=true`
  )
  return response.data
}

export async function downloadScoreSetVariantData(urn: string, params: URLSearchParams): Promise<string> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/variants/data?${params.toString()}`
  )
  return response.data
}

export async function getScoreSetScoresPreview(urn: string): Promise<string> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/scores?drop_na_columns=true`
  )
  return response.data
}

export async function getScoreSetCountsPreview(urn: string): Promise<string> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/counts?drop_na_columns=true`
  )
  return response.data
}

export async function downloadMappedVariants(urn: string) {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}/mapped-variants`)
  return response.data
}

export async function getRecentlyPublishedScoreSets(signal?: AbortSignal): Promise<components['schemas']['ScoreSet'][]> {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/recently-published`, {
    headers: {accept: 'application/json'},
    signal
  })
  return response.data || []
}
