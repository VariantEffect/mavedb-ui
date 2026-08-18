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

// ── CONFIDENCE BADGES: how a group's coordinate was established ──

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

/** A provenance badge + its Key-drawer gloss: how a group's coordinate was established. */
export interface ConfidenceBadge {
  label: string
  class: string
  definition: string
}

// Single source for the confidence axis (badges + the Key drawer's "confidence" section), keyed by outcome
// rather than raw `Derivation`. Each value paints from its own same-named CSS token (see the "Allele
// relationship axis" block in assets/app.css) so a token can never drift from the label it styles.
// `convergent` and `candidate` share a hex — both say "not the change that was measured" — but hold
// separate tokens so they can diverge without touching this file. Insertion order is the drawer's
// display order.
export const ALLELE_CONFIDENCE: Record<string, ConfidenceBadge> = {
  measured: {
    label: 'This measurement',
    class: 'bg-measured-light text-measured',
    definition: 'Directly measured in this assay.'
  },
  projection: {
    label: 'Resolved',
    class: 'bg-resolved-light text-resolved',
    definition: 'Derived from the measured allele. The same change expressed at an un-measured coordinate level.'
  },
  convergent: {
    label: 'Convergent',
    class: 'bg-convergent-light text-convergent',
    definition:
      'A different nucleotide change than what was measured, which happens to produce the same protein change as the measured variant.'
  },
  candidate: {
    label: 'Candidate',
    class: 'bg-candidate-light text-candidate',
    definition:
      'A possible nucleotide change encoding a protein-level measurement. This variant is one of several synonymous codons. The assay did not report which one was measured.'
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
