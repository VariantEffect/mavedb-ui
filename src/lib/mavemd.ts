import type {ClinGenAllele, ClinGenGenomicAllele, ClinGenTranscriptAllele} from '@/api/clingen'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

/**
 * Regular expression for valid CA or PA ids that can be used in ClinGen searches.
 */
export const clinGenAlleleIdRegex = /^(CA|PA)[0-9]+$/i

/**
 * Regular expression for GA4GH VRS identifiers: ga4gh:<type>.<32-char base64url digest>.
 */
export const vrsDigestRegex = /^ga4gh:[^.]+\.[0-9A-Za-z_-]{32}$/

/**
 * Extracts the score set URN from a MaveDB variant URN.
 * Variant URNs follow the format urn:mavedb:XXXXXXXX-X-N-SUFFIX.
 * The score set URN is the first three hyphenated segments.
 */
export function scoreSetUrnFromVariantUrn(variantUrn: string): string | null {
  const match = variantUrn.match(/^(urn:mavedb:[^-]+-[^-]+-[^-]+)(?:-.+)?$/)
  return match?.[1] ?? null
}

/**
 * Regular expression for valid ClinVar Variation IDs that can be used in ClinGen searches.
 */
export const clinVarVariationIdRegex = /^[0-9]+$/

/**
 * Regular expression for valid Reference SNP cluster IDs that can be used in ClinGen searches.
 */
export const rsIdRegex = /^rs[0-9]+$/i

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
  // Measurements of this allele's equivalence class, bucketed by each one's relationship to the searched
  // change (mirrors the API `AlleleMeasurement.relationship`).
  variants: {
    direct: AlleleMeasurement[]
    proteinConsequence: AlleleMeasurement[]
    nucleotideEncoding: AlleleMeasurement[]
  }
  /** MaveDB variant URN — present when a VRS digest search resolves to a variant without a ClinGen Allele ID. */
  variantUrn?: string
}

/**
 * Fold one allele's spellings (transcript / genomic / MANE coordinates) into another. Used to collapse a
 * protein change's several registered transcript alleles onto ONE search result — the change is a single
 * finding, and its transcript spellings are representations to list, not separate hits. MANE coordinates
 * are deduplicated so shared entries aren't repeated.
 */
export function mergeAlleleSpellings(target: AlleleResult, source: AlleleResult): void {
  const seen = new Set(target.maneCoordinates.map((c) => `${c.sequenceType}|${c.database}|${c.hgvs}`))
  for (const coord of source.maneCoordinates) {
    const key = `${coord.sequenceType}|${coord.database}|${coord.hgvs}`
    if (!seen.has(key)) {
      seen.add(key)
      target.maneCoordinates.push(coord)
    }
  }
  target.transcriptAlleles.push(...source.transcriptAlleles)
  target.genomicAlleles.push(...source.genomicAlleles)
  target.grch38Hgvs ??= source.grch38Hgvs
  target.grch37Hgvs ??= source.grch37Hgvs
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
    genomicAlleles: data.genomicAlleles ?? [],
    grch38Hgvs: null,
    grch37Hgvs: null,
    transcriptAlleles: data.transcriptAlleles ?? [],
    maneCoordinates: [],
    variantsStatus: 'NotLoaded',
    variants: {direct: [], proteinConsequence: [], nucleotideEncoding: []}
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
          for (const [database, record] of Object.entries(records)) {
            allele.maneCoordinates.push({
              sequenceType,
              database,
              hgvs: record.hgvs
            })
          }
        }
      }
      // All MANE statuses should be identical, use the first.
      break
    }
  }

  return allele
}
