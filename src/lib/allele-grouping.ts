/**
 * @fileoverview
 * Allele grouping: collapse a variant's alleles into one or more groups for display, pairing c↔g projections
 * and deduplicating their annotations. The groups are the rendered entries in the variant detail's
 * "alleles" section, and the source of truth for the histogram's per-allele controls.
 */

import _ from 'lodash'

import {selectClinvar} from '@/lib/clinvar-controls'
import type {components} from '@/schema/openapi'

type AlleleIdentity = components['schemas']['AlleleIdentity']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type VariantDetail = components['schemas']['VariantDetail']

// ── DERIVATION: how a group's coordinate was established ──

/**
 * Confidence/provenance axis (orthogonal to Cat-VRS's `relation`); strongest confidence first. The
 * measured allele carries no derivation — it is flagged `isFocus` on the identity instead (the API
 * dropped the `authoritative` derivation value in favour of that focus marker).
 */
export type Derivation = 'projection' | 'convergent' | 'candidate'
const DERIVATION_RANK: Record<string, number> = {projection: 0, convergent: 1, candidate: 2}

// Level display order (genomic → coding → protein) so a group reads bottom-up through the layer stack.
const LEVEL_ORDER: Record<string, number> = {genomic: 0, cdna: 1, protein: 2}

/** A member of an allele group: a single level's identity, its annotations, and whether it is the page root. */
export interface AlleleMember extends AlleleIdentity {
  digest: string
  annotations: AlleleAnnotations | null
  // Whether this allele is the CAID/PAID the page is anchored on.
  pageRoot: boolean
}

/**
 * A group of alleles rendered as one entry. Either a single allele (the protein apex, an unpaired
 * measured allele, or a projection-failed one-member candidate) or a c↔g projection pair collapsed into
 * one (the same change at two levels).
 */
export interface AlleleGroup {
  key: string
  members: AlleleMember[]
  // Whether the group contains the view's focus allele (the measured allele on the variant page).
  measured: boolean
  // Whether this group contains the page-anchor allele.
  pageRoot: boolean
  // Grouped confidence: the strongest derivation among the members.
  derivation: Derivation | null
  // Whether the members' annotations can render as one block.
  annotationsMatch: boolean
  // The per-field union of the members' annotations (present-wins).
  coalescedAnnotations: AlleleAnnotations | null
  // Distinct linked CAIDs to surface.
  clingenLinks: string[]
}

/**
 * The member whose HGVS titles a group. A projection pair holds one change in two coordinate frames
 * (genomic + coding); lead with cDNA (community-preferred), then protein, then genomic.
 */
export function titleMember(group: Pick<AlleleGroup, 'members'>): AlleleMember | null {
  return (
    group.members.find((m) => m.level === 'cdna') ??
    group.members.find((m) => m.level === 'protein') ??
    group.members[0] ??
    null
  )
}

// ── GROUPING: collapse a variant's alleles into rendered groups ──

export interface GroupAllelesInput {
  alleles: Record<string, AlleleIdentity>
  annotations: Record<string, AlleleAnnotations>
  /** The ClinGen id the page is anchored on. */
  pageClingenAlleleId: string | null
}

/**
 * Merge the members' annotations field-by-field, present-wins. Missingness is not divergence: a field on
 * only one member is simply carried through. `conflict` is true only when two members both carry a field
 * and disagree — the case worth flagging as "differs by level".
 */
function coalesceAnnotations(members: AlleleMember[]): {merged: AlleleAnnotations | null; conflict: boolean} {
  const present = members.map((m) => m.annotations).filter((a): a is AlleleAnnotations => a != null)
  if (present.length === 0) return {merged: null, conflict: false}
  if (present.length === 1) return {merged: present[0], conflict: false}

  const merged: Record<string, unknown> = {}
  let conflict = false
  for (const key of _.union(...present.map((a) => Object.keys(a)))) {
    const values = present.map((a) => (a as Record<string, unknown>)[key]).filter((v) => v != null)
    if (values.length === 0) continue
    if (values.length > 1 && !values.every((v) => _.isEqual(v, values[0]))) conflict = true
    merged[key] = values[0]
  }
  return {merged: merged as AlleleAnnotations, conflict}
}

function pickDerivation(members: AlleleMember[]): Derivation | null {
  let best: Derivation | null = null
  let bestRank = Infinity
  for (const m of members) {
    const rank = m.derivation != null ? DERIVATION_RANK[m.derivation] : undefined
    if (rank != null && rank < bestRank) {
      bestRank = rank
      best = m.derivation as Derivation
    }
  }
  return best
}

// A digest -> its projection map: the two members of a projection pair (the same change expressed at
// coding and genomic level). Mutual by construction, but honor a one-sided link too so a pair is never
// split by iteration order.
function buildProjectionMap(alleles: Record<string, AlleleIdentity>): Map<string, string> {
  const projectionOf = new Map<string, string>()
  for (const [digest, identity] of Object.entries(alleles)) {
    const projection = identity.projectionOf
    if (projection && projection !== digest && alleles[projection]) {
      projectionOf.set(digest, projection)
      projectionOf.set(projection, digest)
    }
  }
  return projectionOf
}

function makeMember(
  digest: string,
  identity: AlleleIdentity,
  annotations: Record<string, AlleleAnnotations>,
  pageClingenAlleleId: string | null
): AlleleMember {
  return {
    digest,
    level: identity.level,
    hgvs: identity.hgvs,
    clingenAlleleId: identity.clingenAlleleId ?? null,
    isFocus: identity.isFocus,
    relation: identity.relation ?? null,
    derivation: identity.derivation ?? null,
    annotations: annotations[digest] ?? null,
    pageRoot: identity.clingenAlleleId != null && identity.clingenAlleleId === pageClingenAlleleId
  }
}

/**
 * Collapse the detail envelope's `alleles` sidecar into rendered groups, pairing each c↔g projection
 * (linked by `projectionOf`) into one entry and deduplicating its annotations. `derivation` labels the
 * group's confidence — orthogonal to Cat-VRS `relation`, which stays per member. Groups are ordered
 * measured/page-root first, then bottom-up by level.
 */
export function groupAlleles(input: GroupAllelesInput): AlleleGroup[] {
  const {alleles, annotations, pageClingenAlleleId} = input
  const projectionOf = buildProjectionMap(alleles)

  // Pair-and-consume: each allele is visited once; its projection (if any) is pulled in immediately.
  const done = new Set<string>()
  const groups: AlleleGroup[] = []
  for (const [digest, identity] of Object.entries(alleles)) {
    if (done.has(digest)) continue
    done.add(digest)
    const members = [makeMember(digest, identity, annotations, pageClingenAlleleId)]
    const projection = projectionOf.get(digest)
    if (projection && !done.has(projection)) {
      done.add(projection)
      members.push(makeMember(projection, alleles[projection], annotations, pageClingenAlleleId))
    }
    // Sort members genomic → cDNA → protein so the group reads consistently regardless of input order.
    members.sort((a, b) => (LEVEL_ORDER[a.level ?? ''] ?? 99) - (LEVEL_ORDER[b.level ?? ''] ?? 99))

    // See coalesceAnnotations for the present-wins/conflict rule.
    const {merged, conflict} = coalesceAnnotations(members)

    groups.push({
      key: members[0].digest,
      members,
      measured: members.some((m) => m.isFocus),
      pageRoot: members.some((m) => m.pageRoot),
      derivation: pickDerivation(members),
      annotationsMatch: !conflict,
      coalescedAnnotations: merged,
      clingenLinks: _.uniq(
        members.map((m) => m.clingenAlleleId).filter((id): id is string => id != null && id !== pageClingenAlleleId)
      )
    })
  }

  // Measured/page-root groups float to the top; within those, measured beats page-root-only.
  // Remaining groups sort by their first member's level (genomic → cDNA → protein).
  return groups.sort((a, b) => {
    const aPinned = a.measured || a.pageRoot
    const bPinned = b.measured || b.pageRoot
    if (aPinned !== bPinned) return aPinned ? -1 : 1
    if (a.measured !== b.measured) return a.measured ? -1 : 1
    return (LEVEL_ORDER[a.members[0].level ?? ''] ?? 99) - (LEVEL_ORDER[b.members[0].level ?? ''] ?? 99)
  })
}

/**
 * Every allele across a page's loaded variant details, so page-wide tables don't change with the selection.
 *
 * An identity's `derivation`, `relation` and `projectionOf` are relative to its own envelope's focus, so an allele
 * the selected detail carries takes the selected detail's identity; others keep the first-seen one. Focus comes
 * from the selected detail alone.
 */
export function mergeDetailAlleles(
  details: VariantDetail[],
  selected: VariantDetail | null
): {alleles: Record<string, AlleleIdentity>; annotations: Record<string, AlleleAnnotations>} {
  const alleles: Record<string, AlleleIdentity> = {}
  const annotations: Record<string, AlleleAnnotations> = {}
  for (const detail of [...(selected ? [selected] : []), ...details]) {
    for (const [digest, identity] of Object.entries(detail.alleles ?? {})) {
      alleles[digest] ??= {...identity, isFocus: selected?.alleles?.[digest]?.isFocus ?? false}
    }
    for (const [digest, annotation] of Object.entries(detail.annotations ?? {})) {
      annotations[digest] ??= annotation
    }
  }
  return {alleles, annotations}
}

/**
 * Each source's release when every group with a record agrees on one, else null (groups then show their own
 * release). ClinVar compares the release each group displays: `clinvarVersion` when pinned, else its latest.
 */
export function sharedReleases(
  groups: AlleleGroup[],
  clinvarVersion: string | null
): {vep: string | null; gnomad: string | null; clinvar: string | null} {
  const annotations = groups.map((group) => group.coalescedAnnotations)
  const single = (values: (string | null | undefined)[]) => {
    const distinct = new Set(values.filter((v): v is string => v != null))
    return distinct.size === 1 ? [...distinct][0] : null
  }
  return {
    vep: single(annotations.map((a) => a?.vep?.sourceVersion)),
    gnomad: single(annotations.map((a) => a?.gnomad?.dbVersion)),
    clinvar: single(annotations.map((a) => selectClinvar(a?.clinvar, clinvarVersion)?.dbVersion))
  }
}
