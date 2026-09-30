/**
 * The subject allele of an annotation surface (ClinVar, gnomAD), as its digest(s).
 *
 * Usually a single digest — the measured allele. But a variant page's subject is one physical allele stored
 * as two digests: its coding and genomic representations (a c↔g projection pair). External databases attach
 * to only one of them (no fixed level→source mapping), so both must count as "the subject's own" or a record
 * on the projection reads as a different allele.
 */
export type SubjectDigest = string | string[] | null | undefined

/** Normalize a {@link SubjectDigest} to a set for membership tests. */
export function toSubjectDigestSet(subject: SubjectDigest): Set<string> {
  return new Set(subject == null ? [] : Array.isArray(subject) ? subject : [subject])
}
