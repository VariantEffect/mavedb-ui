import axios from 'axios'

import config from '@/config'

export async function getScoreSetsByText(text: string, mine = false) {
  const url = mine ? `${config.apiBaseUrl}/me/score-sets/search` : `${config.apiBaseUrl}/score-sets/search`
  const response = await axios.post(url, {text: text || null}, {headers: {accept: 'application/json'}})
  return response.data?.scoreSets || []
}

export async function searchMyScoreSets(text?: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/me/score-sets/search`,
    {text: text || null},
    {headers: {accept: 'application/json'}}
  )
  return response.data?.scoreSets || []
}

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
