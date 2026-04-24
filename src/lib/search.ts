import router from '@/router'
import {components} from '@/schema/openapi'
import {hgvsSearchStringRegex} from './mave-hgvs'
import {clinGenAlleleIdRegex, rsIdRegex} from './mavemd'

type ShortScoreSet = components['schemas']['ShortScoreSet']

/** Maximum number of score sets returned per search request. */
export const SEARCH_RESULT_LIMIT = 100

/** Available sort options for search results, each with a label and comparator. */
export const SORT_OPTIONS = [
  {
    value: 'recent' as const,
    label: 'Most recent',
    compare: (a: ShortScoreSet, b: ShortScoreSet) =>
      (b.publishedDate || b.modificationDate || '').localeCompare(a.publishedDate || a.modificationDate || '')
  },
  {
    value: 'variants' as const,
    label: 'Most variants',
    compare: (a: ShortScoreSet, b: ShortScoreSet) => (b.numVariants || 0) - (a.numVariants || 0)
  },
  {
    value: 'title' as const,
    label: 'Title A\u2013Z',
    compare: (a: ShortScoreSet, b: ShortScoreSet) => a.title.localeCompare(b.title)
  }
]

export type SortValue = (typeof SORT_OPTIONS)[number]['value']

/** A single option in a search filter sidebar list. */
export interface FilterOption {
  value: string
  badge: number
  title?: string
  groupKey?: string
}

/** A group of score sets sharing the same experiment, used for grouped result rendering. */
export interface ExperimentGroup {
  experimentUrn: string
  experimentTitle: string
  scoreSets: components['schemas']['ShortScoreSet'][]
}

/** A currently-applied filter chip shown above search results. */
export interface ActiveFilter {
  key: string
  value: string
  label: string
}

/** All filter dimensions available on the score set search page. */
export interface SearchFilters {
  searchText: string | null
  filterTargetNames: string[]
  filterTargetOrganismNames: string[]
  filterTargetAccession: string[]
  filterTargetTypes: string[]
  filterPublicationAuthors: string[]
  filterPublicationDatabases: string[]
  filterPublicationJournals: string[]
  filterControlledKeywords: string[]
}

/** Convert SearchFilters into the param shape expected by the search API. */
export function buildSearchParams(filters: SearchFilters) {
  return {
    text: filters.searchText || undefined,
    targets: filters.filterTargetNames.length > 0 ? filters.filterTargetNames : undefined,
    targetOrganismNames: filters.filterTargetOrganismNames.length > 0 ? filters.filterTargetOrganismNames : undefined,
    targetAccessions: filters.filterTargetAccession.length > 0 ? filters.filterTargetAccession : undefined,
    targetTypes: filters.filterTargetTypes.length > 0 ? filters.filterTargetTypes : undefined,
    authors: filters.filterPublicationAuthors.length > 0 ? filters.filterPublicationAuthors : undefined,
    databases: filters.filterPublicationDatabases.length > 0 ? filters.filterPublicationDatabases : undefined,
    journals: filters.filterPublicationJournals.length > 0 ? filters.filterPublicationJournals : undefined,
    controlledKeywords:
      filters.filterControlledKeywords.length > 0
        ? filters.filterControlledKeywords.map((v) => {
            const [key, label] = v.split('::', 2)
            return { key, label }
          })
        : undefined
  }
}

/** If the search text looks like a variant identifier (ClinGen, dbSNP, or HGVS), navigate to MaveMD. Returns true if routed. */
export function routeToVariantSearchIfVariantIsSearchable(searchText: string | null | undefined): boolean {
  if (!searchText || searchText.trim() === '') {
    return false
  }

  searchText = searchText.trim()

  // Don't intercept MaveDB URNs — let the normal text search handle them.
  if (/^urn:mavedb:/i.test(searchText)) {
    return false
  }

  if (clinGenAlleleIdRegex.test(searchText)) {
    console.log(`Routing to mavemd with ClinGen Allele ID: ${searchText}`)
    router.push({name: 'mavemd', query: {search: searchText, searchType: 'clinGenAlleleId'}})
    return true
  }

  if (rsIdRegex.test(searchText)) {
    console.log(`Routing to mavemd with RS ID: ${searchText}`)
    router.push({name: 'mavemd', query: {search: searchText, searchType: 'dbSnpRsId'}})
    return true
  }

  const hgvsMatches = hgvsSearchStringRegex.exec(searchText)
  if (hgvsMatches && hgvsMatches.groups) {
    const identifier = hgvsMatches.groups.identifier
    const description = hgvsMatches.groups.description

    // Regex for RefSeq/Ensembl transcript IDs
    const accessionRegex = /^(N[CMPR]_|X[MR]_|ENST|ENSMUST|ENSP)[0-9]+(\.[0-9]+)?$/gm
    if (accessionRegex.test(identifier)) {
      // Transcript: treat as normal HGVS
      console.log(`Routing to mavemd with HGVS: ${hgvsMatches[0]}`)
      router.push({name: 'mavemd', query: {search: hgvsMatches[0], searchType: 'hgvs'}})
      return true
    } else {
      // Assume identifier is an HGNC gene symbol, parse description for guided search
      // Example: BRCA1:c.123A>G or BRCA1:p.Arg123Gly
      const gene = identifier
      let variantType = ''
      let variantPosition = ''
      let refAllele = ''
      let altAllele = ''

      // Try to parse c. or p. notation
      const guidedMatch = /^(c\.|p\.)?([A-Za-z]+)?([0-9]+)([A-Za-z*-]+)?(?:>([A-Za-z*-]+))?$/gm.exec(description)
      if (guidedMatch) {
        variantType = guidedMatch[1] || ''
        if (variantType === 'c.') {
          variantPosition = guidedMatch[3] || ''
          refAllele = guidedMatch[4] || ''
          altAllele = guidedMatch[5] || ''
        } else if (variantType === 'p.') {
          refAllele = guidedMatch[2] || ''
          variantPosition = guidedMatch[3] || ''
          altAllele = guidedMatch[4] || ''
        }

        router.push({
          name: 'mavemd',
          query: {
            gene,
            variantType,
            variantPosition,
            refAllele,
            altAllele
          }
        })
        return true
      } else {
        // The search looks like an HGVS string but with an invalid accession, and it's not a p. or c. string preceded by
        // a gene name. Forward to the variant search screen, which will deal with the problem.
        console.log(`Routing to mavemd with HGVS: ${hgvsMatches[0]}`)
        router.push({name: 'mavemd', query: {search: hgvsMatches[0], searchType: 'hgvs'}})
        return true
      }
    }
  }
  return false
}
