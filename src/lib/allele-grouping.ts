/**
 * @fileoverview
 * Allele grouping: collapse a variant's alleles into one or more groups for display, pairing c↔g projections
 * and deduplicating their annotations. The groups are the rendered entries in the variant detail's
 * "alleles" section, and the source of truth for the histogram's per-allele controls.
 */

import _ from 'lodash'

import type {components} from '@/schema/openapi'
import type {KeySection} from '@/composables/use-key-drawer'

type AlleleIdentity = components['schemas']['AlleleIdentity']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']

/** Confidence/provenance axis (orthogonal to Cat-VRS's `relation`); strongest confidence first. */
export type Derivation = 'authoritative' | 'projection' | 'candidate'
const DERIVATION_RANK: Record<string, number> = {authoritative: 0, projection: 1, candidate: 2}

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
  // The measured (authoritative) allele.
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

/** A provenance badge + its Key-drawer gloss: how a group's coordinate was established. */
export interface ConfidenceBadge {
  label: string
  class: string
  definition: string
}

// Single source for the confidence axis (badges + the Key drawer's "confidence" section). Keyed by
// outcome, not raw `Derivation`: `measured` (authoritative) reads "Measured"; the two derived states map
// straight from `derivation`. Insertion order is the drawer's display order.
export const ALLELE_CONFIDENCE: Record<string, ConfidenceBadge> = {
  measured: {label: 'Measured', class: 'bg-sage/15 text-sage', definition: 'Directly assayed in this score set.'},
  projection: {
    label: 'Resolved',
    class: 'bg-nucleotide-light text-nucleotide',
    definition: 'Derived from the measured allele by reverse translation — the same change expressed at another level.'
  },
  candidate: {
    label: 'Candidate',
    class: 'bg-amber-100 text-amber-700',
    definition: 'A change that encodes the same protein change as your variant, but is a distinct nucleotide change.'
  }
}

export const CONFIDENCE_KEY_SECTION: KeySection = {
  id: 'confidence',
  title: 'How a coordinate was established',
  terms: Object.values(ALLELE_CONFIDENCE).map((c) => ({label: c.label, definition: c.definition, class: c.class}))
}

/** Confidence badge for a group: `measured` wins, else the derived state; null when neither applies. */
export function confidenceBadge(group: Pick<AlleleGroup, 'measured' | 'derivation'>): ConfidenceBadge | null {
  if (group.measured) return ALLELE_CONFIDENCE.measured
  return group.derivation ? (ALLELE_CONFIDENCE[group.derivation] ?? null) : null
}

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

// Mutual by construction, but honor a one-sided link too so a group is never split by iteration order.
function buildPartnerMap(alleles: Record<string, AlleleIdentity>): Map<string, string> {
  const partnerOf = new Map<string, string>()
  for (const [digest, identity] of Object.entries(alleles)) {
    const sibling = identity.projectionOf
    if (sibling && sibling !== digest && alleles[sibling]) {
      partnerOf.set(digest, sibling)
      partnerOf.set(sibling, digest)
    }
  }
  return partnerOf
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
  const partnerOf = buildPartnerMap(alleles)

  // Pair-and-consume: each allele is visited once; its projection partner (if any) is pulled in immediately.
  const done = new Set<string>()
  const groups: AlleleGroup[] = []
  for (const [digest, identity] of Object.entries(alleles)) {
    if (done.has(digest)) continue
    done.add(digest)
    const members = [makeMember(digest, identity, annotations, pageClingenAlleleId)]
    const sibling = partnerOf.get(digest)
    if (sibling && !done.has(sibling)) {
      done.add(sibling)
      members.push(makeMember(sibling, alleles[sibling], annotations, pageClingenAlleleId))
    }
    // Sort members genomic → cDNA → protein so the group reads consistently regardless of input order.
    members.sort((a, b) => (LEVEL_ORDER[a.level ?? ''] ?? 99) - (LEVEL_ORDER[b.level ?? ''] ?? 99))

    // Coalesce annotations across levels (present-wins); only a real present-vs-present disagreement
    // counts as divergence. Missing-on-one-level is not treated as different.
    const {merged, conflict} = coalesceAnnotations(members)

    groups.push({
      key: members[0].digest,
      members,
      measured: members.some((m) => m.derivation === 'authoritative'),
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
