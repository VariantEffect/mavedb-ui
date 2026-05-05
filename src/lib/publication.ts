import _ from 'lodash'
import type {components} from '@/schema/openapi'

export type PublicationAuthor = components['schemas']['PublicationAuthors']
export type PublicationIdentifier = components['schemas']['SavedPublicationIdentifier']

/**
 * Produces a short, human-readable citation string for a publication.
 *
 * Algorithm:
 * 1. Derives the first author's last name from the first author's full name (expected format "Last, First ...").
 * 2. If multiple authors exist, appends "et al." after the last name; otherwise uses just the last name.
 * 3. Appends the publication year in parentheses if available.
 * 4. If neither author information nor year is available, falls back to the publication title.
 *
 * Examples:
 * - Single author with year: "Smith (2023)"
 * - Multiple authors with year: "Smith et al. (2023)"
 * - Missing author but year: "(2023)"
 * - Missing author and year: returns the publication title.
 *
 * @param publication The publication metadata object used to derive a short citation.
 * @returns A concise citation string prioritizing first author last name and year, or the title if necessary.
 */
export function shortCitationForPublication(publication: PublicationIdentifier): string {
    const firstAuthorName = publicationFirstAuthor(publication)?.name
    const firstAuthorLastName = !firstAuthorName || _.isEmpty(firstAuthorName) ? undefined : firstAuthorName.split(',')[0]
    const numAuthors = publication.authors.length
    const authors = firstAuthorLastName
        ? numAuthors > 1
            ? `${firstAuthorLastName} et al.`
            : firstAuthorLastName
        : undefined
    // TODO VariantEffect/mavedb-api#450
    const year = publication.publicationYear
    const parts = [authors, `(${year?.toString()})`].filter((x) => x != null)
    return parts.length > 0 ? parts.join(' ') : (publication.title)
}

/**
 * Retrieves the primary (first) author from a publication.
 *
 * @param publication - A publication identifier object that includes an `authors` array.
 * @returns The author object marked as primary, or `undefined` if none is found.
 */
export function publicationFirstAuthor(publication: PublicationIdentifier): PublicationAuthor | undefined {
    return publication.authors.find((author) => author.primary)
}
