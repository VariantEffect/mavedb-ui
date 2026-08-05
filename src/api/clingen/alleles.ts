import axios, {isAxiosError} from 'axios'
import {gnomadIdToHgvsCandidates} from '@/lib/gnomad'
import type {ClinGenAllele, ClinGenGene} from './types'

const CLINGEN_BASE_URL = 'https://reg.genome.network'

export async function getAlleleByCaId(caId: string): Promise<ClinGenAllele> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/allele/${caId}`)
  return response.data
}

export async function getAlleleByHgvs(hgvs: string): Promise<ClinGenAllele> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/allele`, {
    params: {hgvs}
  })
  return response.data
}

export async function getAlleleByDbSnp(rsId: string): Promise<ClinGenAllele[]> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/alleles`, {
    params: {'dbSNP.rs': rsId}
  })
  return response.data
}

export async function getAlleleByClinVar(variationId: string): Promise<ClinGenAllele[]> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/alleles`, {
    params: {'ClinVar.variationId': variationId}
  })
  return response.data
}

export async function getGeneBySymbol(symbol: string): Promise<ClinGenGene> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/gene`, {
    params: {'HGNC.symbol': symbol}
  })
  return response.data
}

/**
 * Look up an allele by gnomAD variant ID (e.g. 1-11796321-G-A).
 *
 * The ID is translated into genomic HGVS and resolved as such, rather than looked up among the registry's gnomAD
 * cross-references: the registry computes an allele from any coordinates that match the reference, whereas its gnomAD
 * index only covers variants it has ingested a gnomAD record for.
 *
 * A gnomAD ID doesn't name the reference genome its coordinates belong to, so GRCh38 is tried first and GRCh37
 * second. A 4xx from the first attempt is how coordinates announce they belong to the older assembly — the registry
 * rejects a position whose reference allele doesn't match with `IncorrectReferenceAllele`.
 */
export async function getAlleleByGnomad(gnomadId: string): Promise<ClinGenAllele> {
  const [grch38Hgvs, grch37Hgvs] = gnomadIdToHgvsCandidates(gnomadId)
  if (!grch38Hgvs) {
    throw new Error(`Not a valid gnomAD variant ID: ${gnomadId}`)
  }

  try {
    return await getAlleleByHgvs(grch38Hgvs)
  } catch (error) {
    // Only a rejection of these coordinates warrants retrying; a network failure or registry outage should surface.
    if (!isAxiosError(error) || !error.response || error.response.status >= 500) {
      throw error
    }
  }
  return await getAlleleByHgvs(grch37Hgvs)
}
