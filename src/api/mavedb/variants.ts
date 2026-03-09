import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type ClingenAlleleIdVariantLookupResponse = components['schemas']['ClingenAlleleIdVariantLookupResponse']

export async function lookupVariantsByClingenId(
  clingenAlleleIds: string[]
): Promise<ClingenAlleleIdVariantLookupResponse[]> {
  const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
    clingenAlleleIds
  })
  return response.data
}

export async function getScoreSet(urn: string): Promise<ScoreSet> {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${urn}`)
  return response.data
}
