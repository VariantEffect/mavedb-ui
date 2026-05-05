import type {ClinGenAllele, ClinGenGenomicAllele, ClinGenTranscriptAllele} from '@/api/clingen'
import type {components} from '@/schema/openapi'

type VariantMeasurement = components['schemas']['VariantEffectMeasurementWithShortScoreSet']

/**
 * Regular expression for valid CA or PA ids that can be used in ClinGen searches.
 */
export const clinGenAlleleIdRegex = /^(CA|PA)[0-9]+$/im

/**
 * Regular expression for valid ClinVar Variation IDs that can be used in ClinGen searches.
 */
export const clinVarVariationIdRegex = /^[0-9]+$/m

/**
 * Regular expression for valid Reference SNP cluster IDs that can be used in ClinGen searches.
 */
export const rsIdRegex = /^rs[0-9]+$/im

/** A single MANE coordinate extracted from a ClinGen transcript allele. */
export interface ManeCoordinate {
  sequenceType: string
  database: string
  hgvs: string | undefined
}

/** Processed ClinGen allele data used by the MaveMD search results UI. */
export interface AlleleResult {
  clingenAlleleUrl: string | undefined
  clingenAlleleId: string | undefined
  canonicalAlleleName: string | undefined
  maneStatus: string | null
  genomicAlleles: ClinGenGenomicAllele[]
  grch38Hgvs: string | null
  grch37Hgvs: string | null
  transcriptAlleles: ClinGenTranscriptAllele[]
  maneCoordinates: ManeCoordinate[]
  variantsStatus: string
  variants: {
    nucleotide: VariantMeasurement[]
    protein: VariantMeasurement[]
    associatedNucleotide: VariantMeasurement[]
  }
}

/** Extract the trailing path segment from a URL (e.g. ClinGen allele ID from its URL). */
export function extractIdFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const parts = url.split('/')
  return parts[parts.length - 1]
}

/** Transform a raw ClinGen allele API response into an AlleleResult for display. */
export function createAlleleResult(data: ClinGenAllele, maneStatus: string | null): AlleleResult {
  const allele: AlleleResult = {
    clingenAlleleUrl: data['@id'],
    clingenAlleleId: extractIdFromUrl(data['@id']),
    canonicalAlleleName: data.communityStandardTitle?.[0],
    maneStatus,
    genomicAlleles: data.genomicAlleles || [],
    grch38Hgvs: null,
    grch37Hgvs: null,
    transcriptAlleles: data.transcriptAlleles || [],
    maneCoordinates: [],
    variantsStatus: 'NotLoaded',
    variants: {nucleotide: [], protein: [], associatedNucleotide: []}
  }

  for (const genomicAllele of allele.genomicAlleles) {
    if (genomicAllele.referenceGenome === 'GRCh38') {
      allele.grch38Hgvs = genomicAllele.hgvs?.[0] ?? null
    } else if (genomicAllele.referenceGenome === 'GRCh37') {
      allele.grch37Hgvs = genomicAllele.hgvs?.[0] ?? null
    }
  }

  for (const transcriptAllele of allele.transcriptAlleles) {
    const mane = transcriptAllele.MANE
    if (mane) {
      for (const sequenceType of ['nucleotide', 'protein'] as const) {
        const records = mane[sequenceType]
        if (records) {
          for (const database in records) {
            allele.maneCoordinates.push({
              sequenceType,
              database,
              hgvs: records[database].hgvs
            })
          }
        }
      }
      // Assuming all MANE transcripts have the same MANE status, we can set it from the first one we encounter.
      break
    }
  }

  return allele
}
