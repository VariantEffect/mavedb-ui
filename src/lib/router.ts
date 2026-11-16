import type {LocationQuery, LocationQueryValue} from 'vue-router'

/** Normalize a route query value (single or array) into a string array, filtering out nulls. */
export function extractQueryParam(content: LocationQueryValue | LocationQueryValue[]): Array<string> {
  if (Array.isArray(content)) {
    return content.filter((item) => !!item) as Array<string>
  }
  return content ? [content] : []
}

/**
 * Whether two query-param arrays hold the same values in the same order. Syncing filters from the route
 * assigns a fresh array even when nothing changed, so watchers compare contents rather than references.
 */
export function sameQueryValues(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/** The variant page's query axes and selected measurement, as reflected in its URL. */
export interface VariantPageQueryState {
  includeSuperseded: boolean
  includeResearchUseOnly: boolean
  asOf: string | null
  selectedVariantUrn: string | null
}

/**
 * Write the variant page's state into its route query. A null selection leaves `variant` as it is: the
 * selection is empty only while a refetch reloads the measurements, and the reload restores the
 * measurement `variant` names.
 */
export function variantPageQuery(query: LocationQuery, state: VariantPageQueryState): LocationQuery {
  const next = {...query}
  if (state.includeSuperseded) next.include_superseded = 'true'
  else delete next.include_superseded
  if (state.includeResearchUseOnly) delete next.include_research_use_only
  else next.include_research_use_only = 'false'
  if (state.asOf) next.as_of = state.asOf
  else delete next.as_of
  if (state.selectedVariantUrn) next.variant = state.selectedVariantUrn
  return next
}
