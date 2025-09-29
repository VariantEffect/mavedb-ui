import _ from 'lodash'

import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type Author = components["schemas"]["PublicationAuthors"]

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
