import axios from 'axios'

import {memoizeRead} from '@/api/cache'
import config from '@/config'
import {components} from '@/schema/openapi'

type VariantDetail = components['schemas']['VariantDetail']
type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type VariantVrsMatch = components['schemas']['VariantVrsMatch']
type AvailableCsvNamespace = components['schemas']['AvailableCsvNamespace']

// Entrypoint for the ClinGen-allele-centric variant page: every measurement whose cross-layer
// equivalence class touches this CAID/PAID, in the API's default order (direct-first).
// A CA query also pulls in its protein consequence and that consequence's other encodings;
// a PA query pulls in its nt encodings. `includeSuperseded` opts in to superseded score-set versions.
export const getAlleleMeasurements = memoizeRead(
  async (
    clingenAlleleId: string,
    options?: {includeSuperseded?: boolean; asOf?: string}
  ): Promise<AlleleMeasurement[]> => {
    const params: Record<string, string | boolean> = {}
    if (options?.includeSuperseded) params.include_superseded = true
    if (options?.asOf) params.as_of = options.asOf
    const response = await axios.get(
      `${config.apiBaseUrl}/clingen-alleles/${encodeURIComponent(clingenAlleleId)}/measurements`,
      {params}
    )
    return response.data
  },
  (clingenAlleleId, options) => `${clingenAlleleId}|${options?.includeSuperseded ?? false}|${options?.asOf ?? ''}`
)

// The endpoint resolves the live mapping layer by default, which is what the retired `only_current=true`
// asked for; pass `asOf` to reconstruct it at a past instant instead.
export async function lookupVariantsByVrsDigest(identifier: string, asOf?: string): Promise<VariantVrsMatch[]> {
  const params: Record<string, string> = {}
  if (asOf) params.as_of = asOf
  const response = await axios.get(`${config.apiBaseUrl}/variants/vrs/${encodeURIComponent(identifier)}`, {params})
  return response.data
}

export const getVariantDetail = memoizeRead(
  async (urn: string, options?: {asOf?: string}): Promise<VariantDetail> => {
    const params: Record<string, string> = {}
    if (options?.asOf) params.as_of = options.asOf
    const response = await axios.get(`${config.apiBaseUrl}/variants/${encodeURIComponent(urn)}`, {params})
    return response.data
  },
  (urn, options) => `${urn}|${options?.asOf ?? ''}`
)

export async function getVariantAnnotation(variantUrn: string, annotationType: string): Promise<unknown> {
  const response = await axios.get(
    `${config.apiBaseUrl}/variants/${encodeURIComponent(variantUrn)}/va/${encodeURIComponent(annotationType)}`,
    {responseType: 'json'}
  )
  return response.data
}

/** Fetch the CSV column namespaces this variant has data for. */
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
