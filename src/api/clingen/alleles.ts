import axios from 'axios'

import {memoizeRead} from '@/api/cache'
import type {ClinGenAllele, ClinGenGene} from './types'

const CLINGEN_BASE_URL = 'https://reg.genome.network'

export const getAlleleByCaId = memoizeRead(
  async (caId: string): Promise<ClinGenAllele> => {
    const response = await axios.get(`${CLINGEN_BASE_URL}/allele/${caId}`)
    return response.data
  },
  (caId) => caId
)

export async function getAlleleByHgvs(hgvs: string): Promise<ClinGenAllele> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/allele`, {
    params: {hgvs}
  })
  return response.data
}

export async function getAlleleByDbSnp(rsId: string): Promise<ClinGenAllele> {
  const response = await axios.get(`${CLINGEN_BASE_URL}/alleles`, {
    params: {'dbSNP.rs': rsId}
  })
  return response.data
}

export async function getAlleleByClinVar(variationId: string): Promise<ClinGenAllele> {
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
