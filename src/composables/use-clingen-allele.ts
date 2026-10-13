import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'

import {getAlleleByCaId} from '@/api/clingen/alleles'
import type {ClinGenAllele} from '@/api/clingen/types'
import {extractIdFromUrl} from '@/lib/mavemd'

export interface GenomicLocation {
  chromosome: string
  start: string
  referenceGenome: string
}

export interface UseClingenAlleleReturn {
  allele: Ref<ClinGenAllele | undefined>
  alleleName: ComputedRef<string | undefined>
  grch38LocationText: ComputedRef<string | null>
  genomicLocations: ComputedRef<GenomicLocation[]>
  clinvarAlleleIds: ComputedRef<string[]>
  maneTranscripts: ComputedRef<string[]>
  fetchAllele: () => Promise<void>
}

/**
 * ClinGen Allele Registry composable.
 *
 * Fetches allele data from the ClinGen Allele Registry API and derives
 * display fields (allele name, genomic locations, ClinVar IDs, MANE transcripts). Automatically
 * re-fetches when the allele ID changes.
 *
 * Used by: useVariantLookup (via VariantScreen.vue)
 */
export function useClingenAllele(clingenAlleleId: Ref<string>): UseClingenAlleleReturn {
  const allele = ref<ClinGenAllele | undefined>()
  // The record MANE transcripts are read from: the allele itself, or for an amino-acid (PA) record, which lists
  // none, the first nucleotide allele it encodes.
  const maneSource = ref<ClinGenAllele | undefined>()

  async function fetchAllele() {
    allele.value = undefined
    maneSource.value = undefined
    if (!clingenAlleleId.value) return
    try {
      allele.value = await getAlleleByCaId(clingenAlleleId.value)
      const encodingId = extractIdFromUrl(
        allele.value.aminoAcidAlleles?.[0]?.matchingRegisteredTranscripts?.[0]?.['@id']
      )
      maneSource.value =
        allele.value.transcriptAlleles?.length || !encodingId ? allele.value : await getAlleleByCaId(encodingId)
    } catch (error) {
      console.error(`Error while fetching ClinGen allele "${clingenAlleleId.value}"`, error)
    }
  }

  watch(clingenAlleleId, fetchAllele, {immediate: true})

  // Amino-acid (PA) records carry no communityStandardTitle; their protein HGVS is the name.
  const alleleName = computed(
    () => allele.value?.communityStandardTitle?.[0] || allele.value?.aminoAcidAlleles?.[0]?.hgvs?.[0] || undefined
  )

  const genomicLocations = computed<GenomicLocation[]>(() =>
    (allele.value?.genomicAlleles || [])
      .filter((a) => a.chromosome && a.coordinates?.[0]?.start && a.referenceGenome)
      .map((a) => ({
        chromosome: a.chromosome!,
        start: a.coordinates![0].start,
        referenceGenome: a.referenceGenome!
      }))
  )

  // GRCh38 only; the ClinGen Allele Registry link carries the other builds.
  const grch38LocationText = computed(() => {
    const loc = genomicLocations.value.find((l) => l.referenceGenome === 'GRCh38')
    return loc ? `chr${loc.chromosome}:${Number(loc.start).toLocaleString()} (GRCh38)` : null
  })

  const clinvarAlleleIds = computed(() => (allele.value?.externalRecords?.ClinVarAlleles || []).map((a) => a.alleleId))

  // RefSeq and Ensembl accessions of the allele's MANE transcripts.
  const maneTranscripts = computed(() =>
    (maneSource.value?.transcriptAlleles || []).flatMap((a) =>
      Object.values(a.MANE?.nucleotide ?? {})
        .map((record) => record.hgvs?.split(':')[0])
        .filter((accession): accession is string => accession != null)
    )
  )

  return {
    allele,
    alleleName,
    grch38LocationText,
    genomicLocations,
    clinvarAlleleIds,
    maneTranscripts,
    fetchAllele
  }
}
