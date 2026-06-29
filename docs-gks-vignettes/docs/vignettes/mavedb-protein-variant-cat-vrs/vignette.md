---
title: "Carrying a measured variant across every molecular level with Cat-VRS"
slug: mavedb-protein-variant-cat-vrs
summary: "A multiplexed assay measures a variant at one molecular level, but consumers need it at others. MaveDB plans to use Cat-VRS to present each measured variant as a category spanning all equivalent changes — without losing which level was measured."
products:
  - name: Cat-VRS
    version: "1.0"
pattern: variant-categorization
implementer: MaveDB
status: proposal
contributors:
  - bencap
  - MaveDB team
last_updated: 2026-06-29
---

# Carrying a measured variant across every molecular level with Cat-VRS

**Why this matters**

A multiplexed assay measures a variant at a single molecular level — often the protein, sometimes the DNA. But the same change exists at every level, and whoever uses the result may need a different one: a clinical pipeline works from DNA coordinates, while a protein modeller wants the amino-acid change. The catch is that one protein change can be produced by several different DNA changes, so moving between levels is not a simple relabel. MaveDB plans to present each measured variant as an explicit category that spans all of its equivalent forms across levels — while always recording which level was actually measured, so a consumer can reason at the level they need without losing the provenance of the original measurement.

**At a glance**

- **Who:** MaveDB
- **GKS products used:** Cat-VRS 1.0 (proposed), building on VRS 2.0 variants
- **Tools:** [cat-vrs](https://github.com/ga4gh/cat-vrs) (`CategoricalVariant`), [vrs-python](https://github.com/ga4gh/vrs-python)
- **Status:** proposal — MaveDB already computes the cross-level equivalent variants; presenting them as Cat-VRS categorical variants is planned

---

## The story

Take a deep mutational scan that reports a score for the protein change UBE2I p.Leu6Gly. The score was measured at the protein level, but the genetic code is degenerate: that one amino-acid change can be encoded by more than one codon and reached from the reference by more than one DNA change. The assay did not distinguish between them — it measured the protein outcome. Storing the result as a single DNA allele would assert more than the experiment showed; storing it only as a protein allele leaves it disconnected from the DNA coordinates downstream tools and clinical workflows depend on. The same tension runs the other way for DNA-level assays, whose measured nucleotide change implies a protein consequence a protein-focused consumer would want surfaced.

MaveDB already computes these cross-level equivalents. For a protein measurement it works out the coding and genomic changes that produce the amino-acid change (reverse translation — the genuinely hard direction, because it is one-to-many); for a DNA measurement it derives the protein consequence and the synonymous equivalents. Each equivalent is stored as a deduplicated VRS allele, tagged with its level and linked back to the assay measurement, with the measured allele marked as the authoritative one.

The plan is to expose that web of equivalents using the GA4GH **Categorical Variation Specification (Cat-VRS)**. Each scored variant is presented as a `CategoricalVariant` whose **defining constraint** is the *measured* [VRS allele](../mavedb-mave-variants-vrs/vignette.md) — the level the assay actually scored, so the measurement's provenance is explicit — and whose **members** are the equivalent VRS alleles at the other levels. The categorical variant says precisely what was measured while making every equivalent change explicit and machine-resolvable, letting a consumer attach or read the score at whatever level they work in. This is the unit of molecular representation MaveDB plans to expose, rather than a bare allele, while the underlying storage stays as the deduplicated, level-tagged alleles it is assembled from.

## The data

A **proposed** Cat-VRS `CategoricalVariant` for the measured variant UBE2I [p.Leu6Gly](https://mavedb.org/variants/PA2579755325). The defining constraint holds the *real* MaveDB post-mapped protein allele (`ga4gh:VA.P39KFBT8…`) and an extension records that protein was the measured level; the `members` are illustrative — they show the shape of the coding and genomic equivalents MaveDB computes, whose concrete coordinates and digests the pipeline fills in:

???+ example "Proposed CategoricalVariant — UBE2I p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-protein-variant-cat-vrs/payloads/ube2i-leu6gly.proposed.cat-vrs.json"
    ```

## The tools used

- [**cat-vrs**](https://github.com/ga4gh/cat-vrs) — the `CategoricalVariant` model, with a `DefiningAlleleConstraint` for the measured variant and `members` for its equivalents; the proposed representation.
- [**vrs-python**](https://github.com/ga4gh/vrs-python) — represents the measured allele and every member as VRS alleles.
- **MaveDB's cross-level translation** — an internal step that derives a measured variant's equivalents at the other molecular levels.
- [**MaveDB API**](https://api.mavedb.org/docs) — stores the level-tagged alleles and is where the categorical variants are assembled and served.

## How to reuse this pattern

- [Cat-VRS specification and examples](https://github.com/ga4gh/cat-vrs) — `CategoricalVariant`, defining constraints, and the `proteinSequenceConsequence` recipe.
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — the alleles a categorical variant is built from.
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — where the level-tagged alleles are stored and the categorical variants will be assembled.
- Related vignette: [Sharing MAVE functional evidence with VA-Spec](../mavedb-functional-evidence-va-spec/vignette.md) — the score that attaches to this categorical variant.

---
