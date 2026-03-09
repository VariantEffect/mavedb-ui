/** Subset of the ClinGen Allele Registry allele response used by the application. */
export interface ClinGenAllele {
  '@id'?: string
  communityStandardTitle?: string[]
  genomicAlleles?: ClinGenGenomicAllele[]
  transcriptAlleles?: ClinGenTranscriptAllele[]
  aminoAcidAlleles?: ClinGenAminoAcidAllele[]
}

export interface ClinGenGenomicAllele {
  referenceGenome?: string
  hgvs?: string[]
}

export interface ClinGenTranscriptAllele {
  MANE?: {
    nucleotide?: Record<string, {hgvs?: string}>
    protein?: Record<string, {hgvs?: string}>
    maneStatus?: string
  }
  hgvs?: string
  matchingRegisteredTranscripts?: Array<{'@id'?: string}>
}

export interface ClinGenAminoAcidAllele {
  hgvs?: string[]
  matchingRegisteredTranscripts?: Array<{'@id'?: string}>
}

/** Subset of the ClinGen gene response used by the application. */
export interface ClinGenGene {
  externalRecords?: {
    MANE?: Array<{
      nucleotide?: {RefSeq?: {id?: string}}
      protein?: {RefSeq?: {id?: string}}
      maneStatus?: string
    }>
  }
}
