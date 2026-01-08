import _ from 'lodash'

import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type PublicationIdentifier = components['schemas']['ScoreSet']['primaryPublicationIdentifiers'][0]
type Author = components['schemas']['PublicationAuthors']

/**
 * Get the first author of a score set.
 *
 * In ScoreSet.authors, the first author is identified by its primary attribute being set to true.
 *
 * @param scoreSet A score set.
 * @returns The first author, or undefined if there is none.
 */
export function getScoreSetFirstAuthor(scoreSet: ScoreSet): Author | undefined {
  return scoreSet.primaryPublicationIdentifiers[0]?.authors.find((author) => author.primary)
}

/**
 * Get the last name of the first author of a score set.
 *
 * @param scoreSet A score set.
 * @returns The last name of the first author, or undefined if there is none.
 */
export function firstAuthorLastName(scoreSet: ScoreSet): string | undefined {
  const firstAuthor = getScoreSetFirstAuthor(scoreSet)
  return !firstAuthor || _.isEmpty(firstAuthor?.name) ? undefined : firstAuthor.name.split(',')[0]
}

/**
 * Get the number of authors of a score set's primary publication.
 *
 * @param scoreSet A score set.
 * @returns The number of authors, or 0 if there is no primary publication or no authors.
 */
export function scoreSetNumAuthors(scoreSet: ScoreSet): number {
  return scoreSet.primaryPublicationIdentifiers[0]?.authors.length ?? 0
}

/**
 * Get a short name for a score set. If the score set has primary publication information or a gene name, this will have
 * the form "FirstAuthorLastName [et al.] GeneName PublicationYear" where "et al." is present only if there are multiple
 * authors.
 *
 * If there is no primary publication but there is a gene name, the gene name is used as the score set's short name.
 *
 * If neither primary publication nor gene name is present, the score set's title (or, failing that, short description)
 * is used.
 *
 * The short name is not unique, and it is especially ambiguous when no primary publication information exists. But even
 * then it is suitable as a browser tab title.
 *
 * Notice that the short name matches the assay fact sheet's heading, except that the latter includes a publication name
 * and italic formatting.
 *
 * @param scoreSet A score set.
 * @returns A suitable short name for the score set.
 */
export function getScoreSetShortName(scoreSet: ScoreSet): string {
  const firstAuthorName = getScoreSetFirstAuthor(scoreSet)?.name
  const firstAuthorLastName = !firstAuthorName || _.isEmpty(firstAuthorName) ? undefined : firstAuthorName.split(',')[0]
  const numAuthors = scoreSet.primaryPublicationIdentifiers[0]?.authors.length ?? 0
  const authors = firstAuthorLastName
    ? numAuthors > 1
      ? `${firstAuthorLastName} et al.`
      : firstAuthorLastName
    : undefined
  // TODO VariantEffect/mavedb-api#450
  const gene = scoreSet.targetGenes?.[0]?.name
  const year = scoreSet.primaryPublicationIdentifiers[0]?.publicationYear
  const parts = [authors, gene, year?.toString()].filter((x) => x != null)
  return parts.length > 0 ? parts.join(' ') : (scoreSet.title ?? scoreSet.shortDescription ?? 'Score set')
}

/**
 * Filters a collection of publication identifier objects and returns only those
 * that match the dbName + identifier pairs provided in a source array.
 *
 * Each element in sourceArr is treated as a (dbName, identifier) criterion. The
 * function searches the sources list for exact matches (both dbName and
 * identifier must match) and returns the subset that satisfies at least one
 * criterion. If no matches are found, or if either input is missing/invalid,
 * null is returned.
 *
 * Matching preserves the original objects from the sources list (it does not
 * clone or transform them) and maintains the order in which matching criteria
 * appear in sourceArr (not the original order in sources).
 *
 *
 * @param sourceArr An array of (dbName, identifier) pairs to match against the sources list. If not an array, the function returns null.
 * @param sources A list of publication identifiers to search (e.g., fetched from an API). Must support Array.prototype.find; if undefined, returns null.
 * @returns An array of matched publication identifiers (in the order of the matching criteria) or null if there are no matches or inputs are invalid.
 */
export function matchSources(
  sourceArr: Array<{dbName: string; identifier: string}> | undefined,
  sources: PublicationIdentifier[] | undefined
): PublicationIdentifier[] | null {
  if (!Array.isArray(sourceArr) || !sources) return null
  const matchedSources = []
  for (const source of sourceArr) {
    const match = sources.find((s) => s.dbName === source.dbName && s.identifier === source.identifier)
    if (match) matchedSources.push(match)
  }
  return matchedSources.length > 0 ? matchedSources : null
}

/** * Determine whether a score set has any score calibrations with evidence strengths.
 *
 * @param scoreSet A score set.
 * @param excludeResearchUseOnly If true, score calibrations marked as research-use-only are ignored.
 * @returns True if the score set has at least one score calibration with odds paths (and not marked as research-use-only, if specified).
 */
export function scoreSetHasCalibrationWithEvidenceStrengths(
  scoreSet: ScoreSet,
  excludeResearchUseOnly: boolean
): boolean {
  if (!scoreSet.scoreCalibrations) {
    return false
  }

  for (const calibration of scoreSet.scoreCalibrations) {
    if (excludeResearchUseOnly && calibration.researchUseOnly) {
      continue
    }
    if (
      calibration.functionalRanges &&
      calibration.functionalRanges.some((range) => range.acmgClassification != null)
    ) {
      return true
    }
  }
}
