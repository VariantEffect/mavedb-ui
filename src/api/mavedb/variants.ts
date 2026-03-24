import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type VariantEffectMeasurementWithScoreSet = components['schemas']['VariantEffectMeasurementWithScoreSet']
type ClingenAlleleIdVariantLookupResponse = components['schemas']['ClingenAlleleIdVariantLookupResponse']

export async function lookupVariantsByClingenId(
  clingenAlleleIds: string[]
): Promise<ClingenAlleleIdVariantLookupResponse[]> {
  const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
    clingenAlleleIds
  })
  return response.data
}

export async function getVariantDetail(urn: string): Promise<VariantEffectMeasurementWithScoreSet> {
  const response = await axios.get(`${config.apiBaseUrl}/variants/${encodeURIComponent(urn)}`)
  return response.data
}

export async function getVariantScores(scoreSetUrn: string): Promise<string> {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(scoreSetUrn)}/variants/data`)
  return response.data
}

export async function getVariantAnnotation(variantUrn: string, annotationType: string): Promise<unknown> {
  const response = await axios.get(
    `${config.apiBaseUrl}/mapped-variants/${encodeURIComponent(variantUrn)}/va/${encodeURIComponent(annotationType)}`,
    {responseType: 'json'}
  )
  return response.data
}

export async function getScoreSet(urn: string): Promise<ScoreSet> {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}`)
  return response.data
}
