import type {ClinGenAllele, ClinGenGenomicAllele, ClinGenTranscriptAllele} from '@/api/clingen'
import type {components} from '@/schema/openapi'
import {hgvsSearchStringRegex} from './mave-hgvs'

type VariantMeasurement = components['schemas']['VariantEffectMeasurementWithShortScoreSet']

/**
 * Regular expression for valid CA or PA ids that can be used in ClinGen searches.
 */
export const clinGenAlleleIdRegex = /^(CA|PA)[0-9]+$/im

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
export const clinVarVariationIdRegex = /^[0-9]+$/m

/**
 * Regular expression for valid Reference SNP cluster IDs that can be used in ClinGen searches.
 */
export const rsIdRegex = /^rs[0-9]+$/im

/**
 * Regular expression for valid gnomAD variant IDs that can be used in ClinGen searches.
 *
 * gnomAD writes these as chromosome-position-reference-alternate (e.g. 1-11796321-G-A). The capture groups are those
 * four parts, in that order, which parseGnomadId relies on to translate an ID into HGVS.
 */
export const gnomadIdRegex = /^(1[0-9]|2[0-2]|[1-9]|X|Y|MT?)-([0-9]+)-([ACGT]+)-([ACGT]+)$/i

/**
 * Regular expression for HGNC gene symbols.
 *
 * A symbol begins with a letter and may carry digits, hyphenated parts (HLA-A, MT-CO1) and a trailing @ for cluster
 * symbols (IGH@). This is by far the most permissive of the identifier patterns — any bare word satisfies it — so it
 * is only ever applied once every more specific form has been ruled out.
 */
export const geneSymbolRegex = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*@?$/i

/**
 * Identifier patterns in the order they are tried when detecting what a search string is.
 *
 * Order matters wherever the patterns overlap. A VRS digest also satisfies the deliberately loose HGVS pattern, since
 * that only asks for an identifier, a colon and a description, so it has to be recognized first. A bare number is a
 * ClinVar Variation ID only once the more specific forms have been ruled out, and a gene symbol — which any bare word
 * resembles — only once everything else has been.
 */
const SEARCH_TYPE_PATTERNS: [string, RegExp][] = [
  ['vrsDigest', vrsDigestRegex],
  ['clinGenAlleleId', clinGenAlleleIdRegex],
  ['dbSnpRsId', rsIdRegex],
  ['gnomadId', gnomadIdRegex],
  ['hgvs', hgvsSearchStringRegex],
  ['clinVarVariationId', clinVarVariationIdRegex],
  ['geneSymbol', geneSymbolRegex]
]

/**
 * Work out which kind of identifier a search string is, for the "Any" search type.
 *
 * @returns The matching search type code, or null if the string resembles no supported identifier.
 */
export function detectSearchType(searchString: string): string | null {
  const trimmedSearchString = searchString.trim()
  return SEARCH_TYPE_PATTERNS.find(([, pattern]) => pattern.test(trimmedSearchString))?.[0] ?? null
}

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
  /** MaveDB variant URN — present when a VRS digest search resolves to a variant without a ClinGen Allele ID. */
  variantUrn?: string | null
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
