import _ from 'lodash'
import DOMPurify from 'dompurify'
import {marked} from 'marked'
import type {ToastServiceMethods} from 'primevue/toastservice'

import {lookupOrcidUser} from '@/api/mavedb'
import {KEYWORDS, PHENOTYPIC_KEYWORDS} from '@/data/keywords'
import {normalizeDoi, validateDoi, normalizeRawRead, validateRawRead} from '@/lib/identifiers'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import {components} from '@/schema/openapi'

// ─── Types ───────────────────────────────────────────────────────────────────

type DoiIdentifier = components['schemas']['DoiIdentifier']
type DoiIdentifierCreate = components['schemas']['DoiIdentifierCreate']
type RawReadIdentifier = components['schemas']['RawReadIdentifier']
type RawReadIdentifierCreate = components['schemas']['RawReadIdentifierCreate']
type Contributor = components['schemas']['Contributor']

/** Minimal publication shape needed by helper functions (identifier + dbName). */
type PublicationIdentifierLike = components['schemas']['PublicationIdentifierCreate']

// ─── AutoComplete utilities ──────────────────────────────────────────────────

/** Clear an AutoComplete input after blur/escape. */
export function clearAutoCompleteInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (target) {
    target.value = ''
  }
}

/**
 * Guard against empty suggestion arrays, which cause PrimeVue AutoComplete
 * to stop showing its dropdown on subsequent searches. Returns `[{}]` as a
 * sentinel when there are no results — use `isEmptySentinel` in `#option`
 * templates to detect this and render a "no results" message.
 */
export function suggestionsForAutocomplete(suggestions: any[]): any[] {
  if (!suggestions || suggestions.length === 0) {
    return [{}]
  }
  return suggestions
}

/** Check whether an option is the empty sentinel `{}` injected by `suggestionsForAutocomplete`. */
export function isEmptySentinel(option: unknown): boolean {
  return option != null && typeof option === 'object' && Object.keys(option as object).length === 0
}

// ─── Save-time normalization ─────────────────────────────────────────────────

/**
 * Normalize identifier arrays before API submission. PrimeVue AutoComplete may
 * inject raw strings (e.g. on Enter key) that bypass the blur/space handlers.
 * This strips invalid entries and wraps valid strings as `{ identifier }`.
 */
export function normalizeDoiArray(
  items: (DoiIdentifier | DoiIdentifierCreate | string)[],
  toast?: ToastServiceMethods
): DoiIdentifierCreate[] {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim()
        if (!text) return null
        const doi = normalizeDoi(text)
        if (validateDoi(text)) return {identifier: doi}
        toast?.add({life: 3000, severity: 'warn', summary: `"${text}" is not a valid DOI`})
        return null
      }
      return item?.identifier ? {identifier: item.identifier} : null
    })
    .filter((x): x is DoiIdentifierCreate => x !== null)
}

export function normalizeRawReadArray(
  items: (RawReadIdentifier | RawReadIdentifierCreate | string)[],
  toast?: ToastServiceMethods
): RawReadIdentifierCreate[] {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim()
        if (!text) return null
        const rawRead = normalizeRawRead(text)
        if (validateRawRead(text)) return {identifier: rawRead}
        toast?.add({life: 3000, severity: 'warn', summary: `"${text}" is not a valid Raw Read identifier`})
        return null
      }
      return item?.identifier ? {identifier: item.identifier} : null
    })
    .filter((x): x is RawReadIdentifierCreate => x !== null)
}

export function normalizeContributorArray(
  items: (Contributor | string)[],
  toast?: ToastServiceMethods
): Contributor[] {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        const orcidId = item.trim()
        if (!orcidId) return null
        if (ORCID_ID_REGEX.test(orcidId)) return {orcidId}
        toast?.add({life: 3000, severity: 'warn', summary: `"${orcidId}" is not a valid ORCID ID`})
        return null
      }
      return item?.orcidId ? item : null
    })
    .filter((x): x is Contributor => x !== null)
}

// ─── DOI management ──────────────────────────────────────────────────────────

/**
 * Process a raw DOI input string: validate, normalize, check for duplicates,
 * and return the updated array (or the original if invalid/duplicate).
 */
export function addDoiIdentifier(
  input: string,
  existing: DoiIdentifierCreate[],
  toast: ToastServiceMethods,
  entityLabel = 'this item'
): DoiIdentifierCreate[] | null {
  const text = input.trim()
  if (!text) return null

  const doi = normalizeDoi(text)
  if (existing.find((item) => item.identifier === doi)) {
    toast.add({severity: 'warn', summary: `DOI "${doi}" is already associated with ${entityLabel}`, life: 3000})
    return null
  }
  if (!validateDoi(text)) {
    toast.add({severity: 'warn', summary: `"${text}" is not a valid DOI`, life: 3000})
    return null
  }
  return [...existing, {identifier: doi}]
}

// ─── Raw read management (experiments only) ──────────────────────────────────

/**
 * Process a raw read identifier input string: validate, normalize, check for
 * duplicates, and return the updated array.
 */
export function addRawReadIdentifier(
  input: string,
  existing: RawReadIdentifierCreate[],
  toast: ToastServiceMethods,
  entityLabel = 'this experiment'
): RawReadIdentifierCreate[] | null {
  const text = input.trim()
  if (!text) return null

  const rawRead = normalizeRawRead(text)
  if (existing.find((item) => item.identifier === rawRead)) {
    toast.add({
      severity: 'warn',
      summary: `Raw Read identifier "${rawRead}" is already associated with ${entityLabel}`,
      life: 3000
    })
    return null
  }
  if (!validateRawRead(text)) {
    toast.add({severity: 'warn', summary: `"${text}" is not a valid Raw Read identifier`, life: 3000})
    return null
  }
  return [...existing, {identifier: rawRead}]
}

// ─── Contributor management ──────────────────────────────────────────────────

/**
 * Validate an ORCID ID input, look up the user, and return the updated
 * contributors array. Performs the lookup before updating to avoid race
 * conditions with PrimeVue AutoComplete's blur handling.
 */
export async function addContributor(
  input: string,
  existing: Contributor[],
  toast: ToastServiceMethods,
  onUpdate: (contributors: Contributor[]) => void
) {
  const orcidId = input.trim()
  if (!orcidId) return

  if (!ORCID_ID_REGEX.test(orcidId)) {
    toast.add({life: 3000, severity: 'warn', summary: `${orcidId} is not a valid ORCID ID`})
    return
  }

  if (existing.some((c) => c.orcidId === orcidId)) {
    toast.add({life: 3000, severity: 'warn', summary: `Contributor ${orcidId} is already added`})
    return
  }

  // Look up the user's name, then add the contributor in a single update
  const orcidUser = await lookupOrcidUser(orcidId)
  const contributor = orcidUser || {orcidId}
  onUpdate([...existing, contributor])

  if (!orcidUser) {
    toast.add({life: 3000, severity: 'warn', summary: `Could not look up name for ORCID ID ${orcidId}.`})
  }
}

// ─── Publication management ──────────────────────────────────────────────────

/**
 * After a publication is selected from the autocomplete, check for duplicates.
 */
export function acceptNewPublicationIdentifier(
  publicationIdentifiers: PublicationIdentifierLike[],
  toast: ToastServiceMethods,
  entityLabel = 'this item'
) {
  const newIdx = publicationIdentifiers.length - 1
  if (newIdx < 0 || !publicationIdentifiers[newIdx]) return
  const newIdentifier = publicationIdentifiers[newIdx].identifier
  if (publicationIdentifiers.findIndex((pub) => pub.identifier === newIdentifier) < newIdx) {
    publicationIdentifiers.splice(newIdx, 1)
    toast.add({
      severity: 'warn',
      summary: `Identifier "${newIdentifier}" is already associated with ${entityLabel}`,
      life: 3000
    })
  }
}

/** Truncate a publication title for display. */
export function truncatePublicationTitle(title: string, maxLen = 50): string {
  return title.length > maxLen ? title.slice(0, maxLen) + '...' : title
}

/** Format a publication for tag/option display. */
export function pubOptionLabel(x: {identifier: string; title?: string | null}): string {
  return `${x.identifier}: ${truncatePublicationTitle(x.title || '')}`
}

/** Format a contributor for tag display. */
export function contributorLabel(x: Contributor): string {
  return x.givenName || x.familyName ? `${x.givenName} ${x.familyName} (${x.orcidId})` : x.orcidId
}

/**
 * Build the publication identifiers payload for API submission, splitting
 * all publications into primary and secondary groups.
 */
export function buildPublicationPayload(
  allPublications: PublicationIdentifierLike[],
  primaryPublications: PublicationIdentifierLike[]
) {
  const pick = ({identifier, dbName}: PublicationIdentifierLike) => ({identifier, dbName})
  const primary = primaryPublications.map(pick)
  const secondary = allPublications
    .map(pick)
    .filter((sec) => !primary.some((pri) => pri.identifier === sec.identifier && pri.dbName === sec.dbName))
  return {primaryPublicationIdentifiers: primary, secondaryPublicationIdentifiers: secondary}
}

// ─── Markdown rendering ──────────────────────────────────────────────────────

/** Render markdown to sanitized HTML. */
export function markdownToHtml(markdown: string | null | undefined): string {
  return DOMPurify.sanitize(marked(markdown || '') as string)
}

// ─── Keyword utilities ───────────────────────────────────────────────────────

/** Format a keyword option for display in a Select dropdown. */
export function formatKeywordOptionLabel(option: {code?: string; label: string}): string {
  return option.code ? `${option.code} - ${option.label}` : option.label
}

/** Creates initial validation error state for keywords. */
export function initKeywordValidationErrors() {
  return {
    keywords: _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])) as Record<string, string | null>,
    keywordDescriptions: _.fromPairs(KEYWORDS.map((kw) => [kw.key, null])) as Record<string, string | null>
  }
}

/**
 * Builds the keywords payload for the API from the form's keyword state.
 * Combines method-group-specific keywords with all phenotypic keywords.
 */
export function buildKeywordPayload(
  keywordKeys: Record<string, string | null>,
  keywordDescriptions: Record<string, string | null>,
  keywordGroups: Record<string, string[]>
) {
  const combinedKeywords: Array<{keyword: {key: string; label: string | null}; description: string | null}> = []
  const methodKey = keywordKeys['Variant Library Creation Method']

  if (methodKey && keywordGroups[methodKey]) {
    keywordGroups[methodKey].forEach((key) => {
      combinedKeywords.push({
        keyword: {key, label: keywordKeys[key]},
        description: keywordDescriptions[key]
      })
    })
  }

  const phenotypicEntries = PHENOTYPIC_KEYWORDS.map((kw) => ({
    keyword: {key: kw.key, label: keywordKeys[kw.key]},
    description: keywordDescriptions[kw.key]
  }))
  combinedKeywords.push(...phenotypicEntries)

  return combinedKeywords
}
