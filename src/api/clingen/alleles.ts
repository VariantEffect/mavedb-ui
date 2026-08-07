import axios, {isAxiosError} from 'axios'
import {type GenomeAssembly, gnomadIdToHgvsCandidates} from '@/lib/gnomad'
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

/** An allele resolved from a gnomAD ID, with the assembly whose coordinates it was read under. */
export interface GnomadAlleleResult {
  allele: ClinGenAllele
  assembly: GenomeAssembly
}

/**
 * Look up an allele by gnomAD variant ID (e.g. 1-11796321-G-A).
 *
 * The ID is translated into genomic HGVS and resolved as such, rather than looked up among the registry's gnomAD
 * cross-references: the registry computes an allele from any coordinates that match the reference, whereas its gnomAD
 * index only covers variants it has ingested a gnomAD record for.
 *
 * A gnomAD ID doesn't name the reference genome its coordinates belong to, so by default GRCh38 is tried first and
 * GRCh37 second. A 4xx from the first attempt is how coordinates announce they belong to the older assembly — the
 * registry rejects a position whose reference allele doesn't match with `IncorrectReferenceAllele`. Note that a
 * position can be valid under both assemblies while naming a different variant in each, in which case the earlier
 * assembly wins; pass `assembly` to read the ID under a specific one instead, and let any failure propagate.
 *
 * @returns The allele, and the assembly its coordinates were read under.
 */
export async function getAlleleByGnomad(gnomadId: string, assembly?: GenomeAssembly): Promise<GnomadAlleleResult> {
  const candidates = gnomadIdToHgvsCandidates(gnomadId).filter(
    (candidate) => assembly == undefined || candidate.assembly === assembly
  )
  if (candidates.length === 0) {
    throw new Error(`Not a valid gnomAD variant ID: ${gnomadId}`)
  }

  for (const [index, candidate] of candidates.entries()) {
    const isLastCandidate = index === candidates.length - 1
    try {
      return {allele: await getAlleleByHgvs(candidate.hgvs), assembly: candidate.assembly}
    } catch (error) {
      // Only a rejection of these coordinates warrants trying the next assembly; a network failure or registry outage
      // should surface, as should the final attempt's failure.
      if (isLastCandidate || !isAxiosError(error) || !error.response || error.response.status >= 500) {
        throw error
      }
    }
  }
  // Unreachable: the loop either returns or throws on its final iteration.
  throw new Error(`Could not resolve gnomAD variant ID: ${gnomadId}`)
}
