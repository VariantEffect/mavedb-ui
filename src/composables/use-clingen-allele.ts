import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {getAlleleByCaId} from '@/api/clingen/alleles'
import type {ClinGenAllele} from '@/api/clingen/types'

export interface GenomicLocation {
  chromosome: string
  start: string
  referenceGenome: string
}

export interface UseClingenAlleleReturn {
  allele: Ref<ClinGenAllele | undefined>
  alleleName: ComputedRef<string | undefined>
  genomicLocationText: ComputedRef<string | null>
  genomicLocations: ComputedRef<GenomicLocation[]>
  clinvarAlleleIds: ComputedRef<string[]>
  fetchAllele: () => Promise<void>
}

/**
 * ClinGen Allele Registry composable.
 *
 * Fetches allele data from the ClinGen Allele Registry API and derives
 * display fields (allele name, genomic locations, ClinVar IDs). Automatically
 * re-fetches when the allele ID changes.
 *
 * Used by: useVariantLookup (via VariantScreen.vue)
 */
export function useClingenAllele(clingenAlleleId: Ref<string>): UseClingenAlleleReturn {
  const allele = ref<ClinGenAllele | undefined>()

  async function fetchAllele() {
    allele.value = undefined
    if (!clingenAlleleId.value) return
    try {
      allele.value = await getAlleleByCaId(clingenAlleleId.value)
    } catch (error) {
      console.error(`Error while fetching ClinGen allele "${clingenAlleleId.value}"`, error)
    }
  }

  watch(clingenAlleleId, fetchAllele, {immediate: true})

  const alleleName = computed(() => allele.value?.communityStandardTitle?.[0] || undefined)

  const genomicLocations = computed<GenomicLocation[]>(() =>
    (allele.value?.genomicAlleles || [])
      .filter((a) => a.chromosome && a.coordinates?.[0]?.start && a.referenceGenome)
      .map((a) => ({
        chromosome: a.chromosome!,
        start: a.coordinates![0].start,
        referenceGenome: a.referenceGenome!
      }))
  )

  const genomicLocationText = computed(() => {
    const locs = genomicLocations.value
    if (locs.length === 0) return null
    const loc = locs[0]
    return `chr${loc.chromosome}:${Number(loc.start).toLocaleString()} (${loc.referenceGenome})`
  })

  const clinvarAlleleIds = computed(() =>
    (allele.value?.externalRecords?.ClinVarAlleles || []).map((a) => a.alleleId)
  )

  return {
    allele,
    alleleName,
    genomicLocationText,
    genomicLocations,
    clinvarAlleleIds,
    fetchAllele
  }
}
