import axios from 'axios'

import config from '@/config'
import type {DiseaseConcept} from '@/lib/diseases'

/** Search MONDO disease terms for the calibration disease typeahead. */
export async function searchDiseases(query: string, signal?: AbortSignal): Promise<DiseaseConcept[]> {
  const response = await axios.get(`${config.apiBaseUrl}/diseases/search`, {params: {q: query}, signal})
  return response.data || []
}
