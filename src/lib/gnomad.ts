/**
 * @fileoverview
 * gnomAD population frequency annotations and related utilities.
 *
 * gnomAD is a population-scale variant frequency database. MaveDB links each mapped variant to the
 * single gnomAD record sharing its ClinGen allele ID, so a variant's frequency is a direct assertion
 * about that variant — there is no projection or pooling to reason about.
 *
 * Frequencies reach the client as the `gnomad` namespace of the score-set variant data CSV, where
 * every field arrives as a number or the string `'NA'`. {@link gnomadFromVariantRow} is the seam that
 * turns one of those rows into the shape the display components consume.
 */
import {gnomadIdRegex} from './mavemd'
import type {components} from '@/schema/openapi'
import type {RawVariant} from '@/lib/variants'

/**
 * One gnomAD frequency record, as consumed by the display components.
 *
 * Picked from the generated schema rather than restated, so renaming or retyping a field on the API's
 * model breaks compilation here.
 *
 * Caveat: the CSV columns come from the API's namespace specs, a different code path from the view
 * model. Both project the same `GnomADVariant` ORM columns, so this tracks names and types but is not
 * a guarantee that the two stay column-for-column aligned.
 */
export type GnomadFrequency = Pick<
  components['schemas']['GnomADVariantWithMappedVariants'],
  'alleleFrequency' | 'alleleCount' | 'alleleNumber' | 'faf95Max' | 'faf95MaxAncestry' | 'dbIdentifier' | 'dbVersion'
>

/** A CSV cell from the `gnomad` namespace: a number, the `'NA'` sentinel, or absent. */
type GnomadCell = number | string | null | undefined

/**
 * Translation of gnomAD variant IDs (e.g. 1-11796321-G-A) into genomic HGVS.
 *
 * A gnomAD ID is a VCF-style chromosome-position-reference-alternate tuple that doesn't name the reference genome its
 * coordinates belong to, so it is translated against each supported assembly in turn and the ClinGen Allele Registry
 * decides which one the coordinates actually match.
 */

/** Assemblies tried, in order, when resolving a gnomAD ID. */
export const GNOMAD_ASSEMBLY_SEARCH_ORDER = ['grch38', 'grch37'] as const

export type GenomeAssembly = (typeof GNOMAD_ASSEMBLY_SEARCH_ORDER)[number]

/** Display names for the assemblies, for use in user-facing text. */
export const GENOME_ASSEMBLY_NAMES: Record<GenomeAssembly, string> = {
  grch38: 'GRCh38',
  grch37: 'GRCh37'
}

/** The assembly to offer as an alternative interpretation of the same gnomAD ID. */
export function otherAssembly(assembly: GenomeAssembly): GenomeAssembly {
  return assembly === 'grch38' ? 'grch37' : 'grch38'
}

/**
 * RefSeq chromosome accessions per assembly, keyed by gnomAD chromosome name.
 *
 * These are GRCh37 accessions rather than UCSC hg19 ones, which is a distinction that matters only for the
 * mitochondrion: GRCh37 and GRCh38 both use the revised Cambridge Reference Sequence, so it shares one accession here,
 * whereas UCSC hg19 uses the older NC_001807 sequence. gnomAD's mitochondrial calls are GRCh38/rCRS in any case.
 */
export const CHROMOSOME_REFSEQ_IDS: Record<string, Record<GenomeAssembly, string>> = {
  '1': {grch38: 'NC_000001.11', grch37: 'NC_000001.10'},
  '2': {grch38: 'NC_000002.12', grch37: 'NC_000002.11'},
  '3': {grch38: 'NC_000003.12', grch37: 'NC_000003.11'},
  '4': {grch38: 'NC_000004.12', grch37: 'NC_000004.11'},
  '5': {grch38: 'NC_000005.10', grch37: 'NC_000005.9'},
  '6': {grch38: 'NC_000006.12', grch37: 'NC_000006.11'},
  '7': {grch38: 'NC_000007.14', grch37: 'NC_000007.13'},
  '8': {grch38: 'NC_000008.11', grch37: 'NC_000008.10'},
  '9': {grch38: 'NC_000009.12', grch37: 'NC_000009.11'},
  '10': {grch38: 'NC_000010.11', grch37: 'NC_000010.10'},
  '11': {grch38: 'NC_000011.10', grch37: 'NC_000011.9'},
  '12': {grch38: 'NC_000012.12', grch37: 'NC_000012.11'},
  '13': {grch38: 'NC_000013.11', grch37: 'NC_000013.10'},
  '14': {grch38: 'NC_000014.9', grch37: 'NC_000014.8'},
  '15': {grch38: 'NC_000015.10', grch37: 'NC_000015.9'},
  '16': {grch38: 'NC_000016.10', grch37: 'NC_000016.9'},
  '17': {grch38: 'NC_000017.11', grch37: 'NC_000017.10'},
  '18': {grch38: 'NC_000018.10', grch37: 'NC_000018.9'},
  '19': {grch38: 'NC_000019.10', grch37: 'NC_000019.9'},
  '20': {grch38: 'NC_000020.11', grch37: 'NC_000020.10'},
  '21': {grch38: 'NC_000021.9', grch37: 'NC_000021.8'},
  '22': {grch38: 'NC_000022.11', grch37: 'NC_000022.10'},
  X: {grch38: 'NC_000023.11', grch37: 'NC_000023.10'},
  Y: {grch38: 'NC_000024.10', grch37: 'NC_000024.9'},
  M: {grch38: 'NC_012920.1', grch37: 'NC_012920.1'}
}

/** A gnomAD variant ID parsed into its parts, with the chromosome normalized to a {@link CHROMOSOME_REFSEQ_IDS} key. */
export interface GnomadVariant {
  chromosome: string
  position: number
  referenceAllele: string
  alternateAllele: string
}

/** Parse a gnomAD variant ID. Returns null if it is malformed or names a chromosome we have no accessions for. */
export function parseGnomadId(gnomadId: string): GnomadVariant | null {
  const match = gnomadIdRegex.exec(gnomadId.trim())
  if (!match) {
    return null
  }
  const [, chromosome, position, referenceAllele, alternateAllele] = match
  // gnomAD writes the mitochondrion as either M or MT.
  const normalizedChromosome = chromosome.toUpperCase() === 'MT' ? 'M' : chromosome.toUpperCase()
  if (!(normalizedChromosome in CHROMOSOME_REFSEQ_IDS)) {
    return null
  }
  return {
    chromosome: normalizedChromosome,
    position: parseInt(position),
    referenceAllele: referenceAllele.toUpperCase(),
    alternateAllele: alternateAllele.toUpperCase()
  }
}

/**
 * Build the HGVS description (the part after the colon) for a VCF-style change at a genomic position.
 *
 * gnomAD anchors indels on the base preceding the change, so the alleles are first reduced to a minimal
 * representation: the common prefix is trimmed before any common suffix, which keeps the resulting coordinates as far
 * 3' as the input allows. The registry applies full HGVS 3' normalization on its end.
 *
 * @returns The description, or null if the reference and alternate alleles describe no change.
 */
function describeGenomicChange(position: number, referenceAllele: string, alternateAllele: string): string | null {
  let reference = referenceAllele
  let alternate = alternateAllele
  let start = position

  let prefixLength = 0
  while (
    prefixLength < reference.length &&
    prefixLength < alternate.length &&
    reference[prefixLength] === alternate[prefixLength]
  ) {
    prefixLength++
  }
  reference = reference.slice(prefixLength)
  alternate = alternate.slice(prefixLength)
  start += prefixLength

  while (
    reference.length > 0 &&
    alternate.length > 0 &&
    reference[reference.length - 1] === alternate[alternate.length - 1]
  ) {
    reference = reference.slice(0, -1)
    alternate = alternate.slice(0, -1)
  }

  const end = start + reference.length - 1

  if (reference.length === 0 && alternate.length === 0) {
    return null
  }
  if (reference.length === 0) {
    return `g.${start - 1}_${start}ins${alternate}`
  }
  if (alternate.length === 0) {
    return reference.length === 1 ? `g.${start}del` : `g.${start}_${end}del`
  }
  if (reference.length === 1 && alternate.length === 1) {
    return `g.${start}${reference}>${alternate}`
  }
  return reference.length === 1 ? `g.${start}delins${alternate}` : `g.${start}_${end}delins${alternate}`
}

/** An HGVS reading of a gnomAD ID, valid only if the ID's coordinates belong to `assembly`. */
export interface GnomadHgvsCandidate {
  assembly: GenomeAssembly
  hgvs: string
}

/**
 * Translate a gnomAD variant ID into genomic HGVS strings, one per supported assembly, in the order they should be
 * tried. Returns an empty array if the ID cannot be translated.
 */
export function gnomadIdToHgvsCandidates(gnomadId: string): GnomadHgvsCandidate[] {
  const variant = parseGnomadId(gnomadId)
  if (!variant) {
    return []
  }
  const description = describeGenomicChange(variant.position, variant.referenceAllele, variant.alternateAllele)
  if (!description) {
    return []
  }
  return GNOMAD_ASSEMBLY_SEARCH_ORDER.map((assembly) => ({
    assembly,
    hgvs: `${CHROMOSOME_REFSEQ_IDS[variant.chromosome][assembly]}:${description}`
  }))
}

/** The HGVS reading of a gnomAD ID under one assembly, or null if the ID cannot be translated. */
export function gnomadIdToHgvs(gnomadId: string, assembly: GenomeAssembly): string | null {
  return gnomadIdToHgvsCandidates(gnomadId).find((candidate) => candidate.assembly === assembly)?.hgvs ?? null
}

function numberOrNull(value: GnomadCell): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringOrNull(value: GnomadCell): string | null {
  if (typeof value === 'number') return String(value)
  return value && value.toUpperCase() !== 'NA' ? value : null
}

/**
 * Read a variant's gnomAD frequency out of its score-set data row.
 *
 * Returns null unless the row carries the fields the display depends on — the frequency itself, the
 * AC/AN behind it, and the gnomAD variant id used to link out. Variants with no gnomAD record report
 * `'NA'` across the namespace and yield null here.
 *
 * Requires the `gnomad` namespace to have been requested; see `variantPageVariantDataUrl`.
 */
export function gnomadFromVariantRow(variant: RawVariant | null | undefined): GnomadFrequency | null {
  const gnomad = variant?.gnomad
  if (!gnomad) return null

  const alleleFrequency = numberOrNull(gnomad.gnomad_af)
  const alleleCount = numberOrNull(gnomad.gnomad_ac)
  const alleleNumber = numberOrNull(gnomad.gnomad_an)
  const dbIdentifier = stringOrNull(gnomad.gnomad_id)
  if (alleleFrequency == null || alleleCount == null || alleleNumber == null || dbIdentifier == null) {
    return null
  }

  return {
    alleleFrequency,
    alleleCount,
    alleleNumber,
    faf95Max: numberOrNull(gnomad.gnomad_faf95_max),
    faf95MaxAncestry: stringOrNull(gnomad.gnomad_faf95_max_ancestry),
    dbIdentifier,
    dbVersion: stringOrNull(gnomad.gnomad_version) ?? 'unknown'
  }
}

/** Deep link to a gnomAD variant page, choosing the dataset that matches the record's version. */
export function gnomadVariantUrl(gnomad: {dbIdentifier: string; dbVersion: string}): string {
  // Versions are stored with a leading "v" (e.g. "v4.1"), so strip non-digits before reading the major.
  const major = parseInt(gnomad.dbVersion.replace(/^\D+/, ''), 10)
  const dataset = major === 3 ? 'gnomad_r3' : major === 2 ? 'gnomad_r2_1' : 'gnomad_r4'
  return `https://gnomad.broadinstitute.org/variant/${encodeURIComponent(gnomad.dbIdentifier)}?dataset=${dataset}`
}

/** A frequency (e.g. gnomAD AF): scientific notation for the very rare, else 3 significant figures. */
export function formatFrequency(value: number | null | undefined): string {
  if (value == null) return '—'
  return value < 0.0001 ? value.toExponential(2) : value.toPrecision(3)
}
