import axios from 'axios'

import config from '@/config'

export async function getExperiment(urn: string) {
  const response = await axios.get(`${config.apiBaseUrl}/experiments/${urn}`)
  return response.data
}

export async function createExperiment(payload: Record<string, unknown>) {
  return axios.post(`${config.apiBaseUrl}/experiments/`, payload)
}

export async function updateExperiment(urn: string, payload: Record<string, unknown>) {
  return axios.put(`${config.apiBaseUrl}/experiments/${urn}`, payload)
}

export async function searchMyExperiments(filters: {metaAnalysis?: boolean} = {}) {
  const response = await axios.post(`${config.apiBaseUrl}/me/experiments/search`, filters)
  return response.data
}
