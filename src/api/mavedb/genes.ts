import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

export type GeneScoreSet = components['schemas']['ShortScoreSet']
export type GeneResponse = components['schemas']['GeneResponse']

export interface GetGeneParams {
  limit?: number
  offset?: number
}

export async function getGene(symbol: string, params: GetGeneParams = {}, signal?: AbortSignal): Promise<GeneResponse> {
  const response = await axios.get<GeneResponse>(`${config.apiBaseUrl}/genes/${encodeURIComponent(symbol)}`, {
    headers: {accept: 'application/json'},
    params,
    signal
  })
  return response.data
}
