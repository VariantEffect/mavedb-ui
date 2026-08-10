import axios from 'axios'

import config from '@/config'
import {variantPageVariantDataUrl} from '@/api/mavedb/score-sets'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type VariantEffectMeasurementWithScoreSet = components['schemas']['VariantEffectMeasurementWithScoreSet']
type ClingenAlleleIdVariantLookupResponse = components['schemas']['ClingenAlleleIdVariantLookupResponse']
type MappedVariant = components['schemas']['MappedVariant']
type AvailableCsvNamespace = components['schemas']['AvailableCsvNamespace']

export async function lookupVariantsByClingenId(
  clingenAlleleIds: string[]
): Promise<ClingenAlleleIdVariantLookupResponse[]> {
  const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
    clingenAlleleIds
  })
  return response.data
}

export async function lookupVariantsByVrsDigest(identifier: string): Promise<MappedVariant[]> {
  const response = await axios.get(`${config.apiBaseUrl}/mapped-variants/vrs/${encodeURIComponent(identifier)}`, {
    params: {only_current: true}
  })
  return response.data
}

export async function getVariantDetail(urn: string): Promise<VariantEffectMeasurementWithScoreSet> {
  const response = await axios.get(`${config.apiBaseUrl}/variants/${encodeURIComponent(urn)}`)
  return response.data
}

/** The containing score set's variant table, as read by the variant page. */
export async function getVariantPageScoreSetData(scoreSetUrn: string): Promise<string> {
  const response = await axios.get(variantPageVariantDataUrl(scoreSetUrn))
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

/**
 * Fetch the CSV column namespaces this variant has data for.
 */
export async function getVariantCsvNamespaces(urn: string, signal?: AbortSignal): Promise<AvailableCsvNamespace[]> {
  const response = await axios.get(`${config.apiBaseUrl}/variants/${encodeURIComponent(urn)}/csv-namespaces`, {signal})
  return response.data
}

export function variantCsvUrl(urn: string, namespaces?: string[]): string {
  const params = new URLSearchParams()
  for (const namespace of namespaces ?? []) params.append('namespaces', namespace)
  const query = params.toString()
  const baseUrl = `${config.apiBaseUrl}/variants/${encodeURIComponent(urn)}/csv`
  return query ? `${baseUrl}?${query}` : baseUrl
}

export async function downloadVariantCsv(urn: string, namespaces?: string[]): Promise<string> {
  const response = await axios.get(variantCsvUrl(urn, namespaces))
  return response.data
}
