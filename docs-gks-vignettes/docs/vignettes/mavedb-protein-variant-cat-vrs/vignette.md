---
title: "Carrying a measured variant across molecular levels with Cat-VRS"
slug: mavedb-protein-variant-cat-vrs
summary: "A multiplexed assay typically measures a variant at one molecular level (e.g. amino acid), but consumers need it at others (e.g. genomic). MaveDB plans to use Cat-VRS to present each measured variant as a category containing equivalent changes, while preserving the level of the assay."
products:
  - name: Cat-VRS
    version: "1.0"
pattern: variant-categorization
implementer: MaveDB
status: proposal
contributors:
  - bencap
  - MaveDB team
last_updated: 2026-08-03
---

# Carrying a measured variant across molecular levels with Cat-VRS

A multiplexed assay typically generates variant functional scores at a single molecular level — often the protein, sometimes the DNA.
Being able to convert between levels is essential for a variety of use cases: a clinical genomics pipeline works from DNA coordinates, while a protein modeller wants the amino acid change.
The degenerate nature of the genetic code means that one protein change can be produced by several different DNA changes, so moving between levels is not a simple one-to-one relabel. 
MaveDB plans to present each measured variant as an explicit Cat-VRS category that spans its equivalent forms across levels, while preserving the level was actually measured.
Therefore a downstream data consumer can apply variant data at the level they need without losing the provenance of the original measurement.

- **Who:** MaveDB
- **GKS products used:** Cat-VRS 1.0 (proposed), building on VRS 2.0 variants
- **Tools:** [cat-vrs](https://github.com/ga4gh/cat-vrs) (`CategoricalVariant`), [vrs-python](https://github.com/ga4gh/vrs-python)
- **Status:** proposal — MaveDB already computes the cross-level equivalent variants; presenting them as Cat-VRS categorical variants is planned

## Motivation

Consider a deep mutational scan that reports a score for the protein change UBE2I `p.Leu6Gly`.
The score was measured at the protein level, which is typical for a cDNA-based assay, but due to the redundancy in the genetic code, this amino acid change can result from multiple unique nucleotide changes.
The assay measured and reported only the amino acid variant and did not distinguish between nucleotide variants.
Assigning the score for the amino acid substitution to the underlying DNA alleles would imply that the DNA variants were measured directly, but storing it as only a protein allele disconnects the variant measurement from the DNA coordinates required by downstream tools.
The same tension runs the other way for DNA-level assays, whose measured nucleotide change implies a protein consequence a protein-focused consumer would want surfaced, where ambiguity may be introduced because of alternative protein isoforms.

MaveDB already computes these cross-level equivalents.
For a protein measurement it works out the coding and genomic changes that produce the amino acid change (i.e. reverse translation — the more challenging direction, because it is one-to-many); for a DNA measurement it derives the protein consequence and the synonymous equivalents.
Each equivalent variant is stored as a deduplicated VRS allele, tagged with its level and linked back to the assay measurement, with the measured allele marked as the authoritative one.

The plan is to expose that web of equivalent variants using the GA4GH **Categorical Variation Specification (Cat-VRS)**.
Each scored variant is presented as a `CategoricalVariant` whose **defining constraint** is the *measured* [VRS allele](../mavedb-mave-variants-vrs/vignette.md) — the level at which the variants were scored, so the measurement's provenance is explicit — and whose **members** are the equivalent VRS alleles.
This structure specifies precisely what was measured while making every equivalent change explicit and machine-resolvable, letting a consumer attach or read the score at whatever level is needed.

## Example data

A **proposed** Cat-VRS `CategoricalVariant` for the measured variant UBE2I [p.Leu6Gly](https://mavedb.org/variants/PA2579755325).
The defining constraint holds the measured MaveDB post-mapped protein allele (`ga4gh:VA.P39KFBT8…`) and an extension states that protein was the measured level.
The `members` are illustrative, showing the shape of the coding and genomic equivalents MaveDB computes, whose concrete coordinates and digests are filled in by the MaveDB processing pipeline:

???+ example "Proposed CategoricalVariant — UBE2I p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-protein-variant-cat-vrs/payloads/ube2i-leu6gly.proposed.cat-vrs.json"
    ```

## Tools

- [**cat-vrs**](https://github.com/ga4gh/cat-vrs) — the `CategoricalVariant` model, with a `DefiningAlleleConstraint` for the measured variant and `members` for its equivalents; the proposed representation.
- [**vrs-python**](https://github.com/ga4gh/vrs-python) — represents the measured allele and every member as VRS alleles.
- **MaveDB's cross-level translation** — an internal step that derives a measured variant's equivalents at the other molecular levels.
- [**MaveDB API**](https://api.mavedb.org/docs) — stores the level-tagged alleles and is where the categorical variants are assembled and served.

## Reusing this pattern

- [Cat-VRS specification and examples](https://github.com/ga4gh/cat-vrs) — `CategoricalVariant`, defining constraints, and the `proteinSequenceConsequence` recipe.
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — the alleles a categorical variant is built from.
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — where the level-tagged alleles are stored and the categorical variants will be assembled.
- Related vignette: [Sharing MAVE functional evidence with VA-Spec](../mavedb-functional-evidence-va-spec/vignette.md) — the score that attaches to this categorical variant.
