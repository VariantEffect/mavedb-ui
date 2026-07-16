---
title: "Giving every MAVE variant a precise, computable identity with VRS"
slug: mavedb-mave-variants-vrs
summary: "MaveDB represents every variant from every multiplexed assay using GA4GH VRS, providing canonical, content-addressed identifiers that enable discovery and downstream integration."
products:
  - name: VRS
    version: "2.0"
pattern: variant-annotation
implementer: MaveDB
status: production
contributors:
  - bencap
  - afrubin
  - MaveDB team
last_updated: 2026-07-15
---

# Giving every MAVE variant a precise, computable identity with VRS

MaveDB collects the results of multiplexed assays of variant effect, experiments that measure the functional impact of thousands of genetic variants at once, as well as data from lower-throughput functional studies.
Every contributing lab describes its variants differently.
Variants are reported against an experiment-specific target sequence, may be scored at the protein level or the DNA level, and appear using whatever notation suited the experiment.
These differences create challenges when looking at records that may describe the same change, or for connecting a variant to anything outside the original study.
MaveDB now represents every variant it stores using a single shared standard that provides a precise, computable identity that any other system can recognize.

- **Who:** MaveDB
- **GKS products used:** VRS 2.0
- **Tools:** [`dcd-mapping`](https://github.com/VariantEffect/dcd_mapping2), [`vrs-python`](https://github.com/ga4gh/vrs-python) (v2.0.0-a6), [`cool-seq-tool`](https://github.com/GenomicMedLab/cool-seq-tool) (v0.4.0.dev3), [`cdot`](https://github.com/SACGF/cdot), [`seqrepo`](https://github.com/biocommons/biocommons.seqrepo)
- **Status:** production

## Motivation

A multiplexed assay reports variants in the context of its specific experimental design.
A cDNA-based deep mutational scan of a protein typically measures amino-acid changes against an engineered target; a saturation genome editing screen names nucleotide changes against a genomic window.
Therefore, we need a data standard that can flexibly represent multiple types of variants across sequence contexts and organisms.
When uploaded by users or presented for human interpretation, MaveDB uses a slightly modified subset of the HGVS nomenclature (called MAVE-HGVS), but those records can be ambiguous, making them challenging to compare or search precisely.

MaveDB resolves this by representing every variant using the GA4GH **Variant Representation Specification (VRS) 2.0**.
VRS includes built-in variant normalization as part of object generation that solves many of the challenges in MAVE-HGVS.
For example, multi-nucleotide substitution variants and their equivalent deletion-insertion represtentation evaluate to the same underlying VRS digest, indicating their identity.
VRS is also easily able to represent both nucleotide and amino acid level variants.

Because VRS uses composable JSON documents, we can also easily combine multiple variants together into a single object.
For datasets based on human sequences, the `dcd-mapping` pipeline takes each variant's HGVS description, aligns the assay's target to a standard reference sequence using `cool-seq-tool` and `cdot`, and produces a normalized VRS allele with respect to the reference.
This **post-mapped** allele can be easily stored alongside the **pre-mapped** allele as part of the same expanded JSON document.
By storing both alleles alongside, we preserve the provenance of the original assays's target sequence, while also providing the reference-based object that is more useful for downstream data integration and matching tasks.

VRS representations are fundamental for the implementation of MaveDB's modern backend. This is how variants are stored precisely, how they are searched, and what every downstream annotation relies on.

## Example data

Here is a real post-mapped VRS 2.0 Allele for the UBE2I variant [p.Leu6Gly](https://mavedb.org/variants/PA2579755325) from the deep mutational scan described in score set [`urn:mavedb:00000001-a-1`](https://mavedb.org/score-sets/urn:mavedb:00000001-a-1) (Weile et al., 2017). Because this is mapped to the reference, the `id` and `digest` are computed from the location and state, meaning the same change would produce the same digest from any source (e.g., another functional assay):

???+ example "VRS 2.0 Allele — UBE2I:p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-mave-variants-vrs/payloads/ube2i-leu6gly.vrs.json"
    ```

The `location` points into a standard protein reference (`NP_003336.1`, addressed by its content-based `refgetAccession`), the `state` records the substituted residue (`G`), and the `expressions` block carries the human-readable HGVS (`NP_003336.1:p.Leu6Gly`) alongside the machine identifier.

## Tools

- [**`dcd-mapping`**](https://github.com/VariantEffect/dcd_mapping2) — MaveDB's pipeline that aligns each assay's target to a reference and emits VRS alleles for every variant in a score set.
- [**`vrs-python`**](https://github.com/ga4gh/vrs-python) (v2.0.0-a6) — VRS 2.0 Allele/Haplotype models, normalization, and digest computation (`ga4gh_identify`).
- [**`cool-seq-tool`**](https://github.com/GenomicMedLab/cool-seq-tool) v0.4.0.dev3 and [**`cdot`**](https://github.com/SACGF/cdot) — transcript selection and alignment between assay targets and standard references.
- [**`seqrepo`**](https://github.com/biocommons/biocommons.seqrepo) — sequence storage and refget accession resolution.
- [**MaveDB API**](https://api.mavedb.org/docs) — stores the resulting VRS alleles and serves them as MaveDB's canonical variant representation.

## Reusing this pattern

- [VRS 2.0 specification and quick start](https://vrs.ga4gh.org/)
- [vrs-python documentation](https://github.com/ga4gh/vrs-python)
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — the service that maps and serves these VRS variants.
- Related vignette: [Linking the same variant across multiple assays](../mavedb-vrs-cross-score-set-harmonization/vignette.md) — using the VRS identifiers to link variants across assays.
- Related vignette: [Carrying a measured variant across molecular levels with Cat-VRS](../mavedb-protein-variant-cat-vrs/vignette.md) — implementing Cat-VRS over these alleles.
- Related vignette: [Sharing MAVE functional evidence as computable statements with VA-Spec](../mavedb-functional-evidence-va-spec/vignette.md) — attaching variant classification evidence to these VRS variants.

---
