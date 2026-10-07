import {assayLevelBucket, type MeasurementRelationship} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

export interface MeasurementGroup {
  relationship: MeasurementRelationship
  // The measured variant's HGVS when every member shares one (indirect groups only).
  hgvs: string | null
  measurements: AlleleMeasurement[]
}

const RELATIONSHIP_ORDER: MeasurementRelationship[] = ['direct', 'protein_consequence', 'nucleotide_encoding']

/**
 * Group measurements by their relationship to the page's variant, preserving the API's ranking within each
 * group.
 */
export function buildMeasurementGroups(measurements: AlleleMeasurement[]): MeasurementGroup[] {
  return RELATIONSHIP_ORDER.flatMap((relationship) => {
    const members = measurements.filter((m) => m.relationship === relationship)
    if (members.length === 0) return []
    const hgvsSet = new Set(members.map((m) => m.assayLevelHgvs ?? null))
    const hgvs = relationship !== 'direct' && hgvsSet.size === 1 ? [...hgvsSet][0] : null
    return [{relationship, hgvs, measurements: members}]
  })
}

// What each group measured, completing "N measurements of …". Keyed by whether the anchor variant is a nucleotide
// change (CA) or a protein change (PA): the same relationship reads differently from each side.
const GROUP_SUBJECTS: Record<'nucleotide' | 'protein', Record<MeasurementRelationship, string>> = {
  nucleotide: {
    direct: 'this exact nucleotide change',
    protein_consequence: 'the protein change it encodes',
    nucleotide_encoding: 'other nucleotide changes that encode the same protein change'
  },
  protein: {
    direct: 'this exact protein change',
    protein_consequence: 'this exact protein change',
    nucleotide_encoding: 'nucleotide changes that encode this protein change'
  }
}

/**
 * The subject that completes a group's header sentence, "N measurements of …". Shared by the variant page's
 * measurement table and the search results so both name a relationship the same way.
 */
export function groupSubject(group: MeasurementGroup, anchorIsProtein: boolean): string {
  // Every member measured the one named variant, so the subject is singular.
  if (group.relationship === 'nucleotide_encoding' && group.hgvs) {
    return anchorIsProtein
      ? 'a nucleotide change that encodes this protein change'
      : 'another nucleotide change that encodes the same protein change'
  }
  return GROUP_SUBJECTS[anchorIsProtein ? 'protein' : 'nucleotide'][group.relationship]
}

/** An HGVS string without its reference-sequence prefix, for headers that already name the gene context. */
export function shortHgvs(hgvs: string): string {
  return hgvs.includes(':') ? hgvs.slice(hgvs.indexOf(':') + 1) : hgvs
}

/** Whether a group mixes assay levels. Levels usually follow the relationship, so only then does a per-row level tag
 * tell rows apart. */
export function hasMixedLevels(group: MeasurementGroup): boolean {
  return new Set(group.measurements.map((m) => assayLevelBucket(m.assayLevel))).size > 1
}

/** A variant-page group shows this many measurements until expanded… */
const TABLE_PREVIEW_COUNT = 5
/** …but only truncates when it would hide at least this many. */
const TABLE_MIN_HIDDEN = 3

/**
 * The rows a variant-page group shows and how many stay behind "Show N more". The selected measurement always
 * stays visible, appended after the preview when it ranks below it.
 */
export function tablePreview(
  group: MeasurementGroup,
  {expanded, selectedUrn}: {expanded: boolean; selectedUrn: string | null}
): {visible: AlleleMeasurement[]; hiddenCount: number} {
  const beyond = group.measurements.slice(TABLE_PREVIEW_COUNT)
  if (expanded || beyond.length < TABLE_MIN_HIDDEN) return {visible: group.measurements, hiddenCount: 0}
  const selected = beyond.filter((m) => m.variantUrn === selectedUrn)
  return {
    visible: [...group.measurements.slice(0, TABLE_PREVIEW_COUNT), ...selected],
    hiddenCount: beyond.length - selected.length
  }
}

/**
 * A search-result group's top-ranked rows, or all of them when collapsing would hide just one (a "1 more" link
 * costs as much space as the row).
 */
export function searchPreview(group: MeasurementGroup, previewCount: number): AlleleMeasurement[] {
  const hidden = group.measurements.length - previewCount
  return hidden >= 2 ? group.measurements.slice(0, previewCount) : group.measurements
}

/**
 * The one place an indirect measurement's caveat is spelled out: what was measured instead, then what that can
 * miss. Null for a direct measurement. `measuredHgvs` names the measured variant when the envelope carries it.
 */
export function indirectMeasurementNotice(
  relationship: MeasurementRelationship | null | undefined,
  anchorIsProtein: boolean,
  measuredHgvs: string | null
): {lead: string; caveat: string} | null {
  if (!relationship || relationship === 'direct') return null
  const hgvs = measuredHgvs ? ` (${shortHgvs(measuredHgvs)})` : ''
  if (relationship === 'protein_consequence') {
    return {
      lead: `Measured as the protein change your variant encodes${hgvs}.`,
      caveat: 'Nucleotide-level effects, such as splicing, may not be captured.'
    }
  }
  if (anchorIsProtein) {
    return {
      lead: `Measured on a nucleotide change that encodes this protein change${hgvs}.`,
      caveat: 'The score may include nucleotide-level effects, such as splicing, beyond the protein change.'
    }
  }
  return {
    lead: `Measured on a different nucleotide change that encodes the same protein change${hgvs}.`,
    caveat: 'Effects specific to your nucleotide change, such as splicing, may differ.'
  }
}
