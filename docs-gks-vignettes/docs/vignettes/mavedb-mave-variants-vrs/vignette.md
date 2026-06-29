---
title: "Giving every MAVE variant a precise, computable identity with VRS"
slug: mavedb-mave-variants-vrs
summary: "MaveDB maps every variant from every multiplexed assay into VRS 2.0, turning lab-specific notation into one canonical, content-addressed identifier."
products:
  - name: VRS
    version: "2.0"
pattern: variant-annotation
implementer: MaveDB
status: production
contributors:
  - bencap
  - MaveDB team
last_updated: 2026-06-29
---

# Giving every MAVE variant a precise, computable identity with VRS

**Why this matters**

MaveDB collects the results of multiplexed assays of variant effect — experiments that measure the functional impact of thousands of genetic variants at once. Every contributing lab describes its variants differently: against its own engineered target sequence, at the protein level or the DNA level, in whatever notation suited the experiment. That made it hard to know when two records described the same change, or to connect a measured variant to anything outside the original study. MaveDB now maps every variant it stores into a single shared standard, so each one carries a precise, computable identity that any other system can recognize without having to understand how the original experiment was written down.

**At a glance**

- **Who:** MaveDB
- **GKS products used:** VRS 2.0
- **Tools:** [dcd-mapping](https://github.com/VariantEffect/dcd_mapping2), [vrs-python](https://github.com/ga4gh/vrs-python) (`ga4gh.vrs` 2.0.0-a6), [cool-seq-tool](https://github.com/GenomicMedLab/cool-seq-tool) 0.4.0.dev3, [cdot](https://github.com/SACGF/cdot), [seqrepo](https://github.com/biocommons/biocommons.seqrepo)
- **Status:** production

---

## The story

A multiplexed assay reports variants in the terms of its own experiment. A deep mutational scan of a protein names amino-acid changes against an engineered target; a saturation genome editing screen names nucleotide changes against a genomic window. The same biological change can therefore arrive in MaveDB in several notations, on several reference sequences, depending on who ran the assay. Stored as raw strings, those records can't be compared, searched precisely, or linked to the wider variant ecosystem.

MaveDB resolves this by mapping every variant into the GA4GH **Variant Representation Specification (VRS) 2.0**. The `dcd-mapping` pipeline takes each variant's HGVS description, aligns the assay's target to a standard reference sequence using `cool-seq-tool` and `cdot`, and produces a normalized VRS Allele. VRS then computes a **content-addressed digest** — a hash derived deterministically from the variant's location and state — and uses it as the allele's identifier (`ga4gh:VA.…`). Two records that describe the same change normalize to the same digest, no matter how the original experiments phrased them.

MaveDB keeps both a **pre-mapped** allele (on the assay's own target sequence, preserving exactly what was measured) and a **post-mapped** allele (on a standard human reference), so nothing about the original experiment is lost while everything gains a shared identity. This VRS representation is the substrate for the rest of MaveDB's modern backend: it is how variants are stored precisely, how they are searched, and what every downstream annotation hangs off of.

## The data

A real post-mapped VRS 2.0 Allele for the UBE2I variant [p.Leu6Gly](https://mavedb.org/variants/PA2579755325), from the deep mutational scan in score set [`urn:mavedb:00000001-a-1`](https://mavedb.org/score-sets/urn:mavedb:00000001-a-1) (Weile et al., 2017). The `id`/`digest` are computed from the location and state — the same change would produce the same digest from any source:

???+ example "VRS 2.0 Allele — UBE2I p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-mave-variants-vrs/payloads/ube2i-leu6gly.vrs.json"
    ```

The `location` points into a standard protein reference (`NP_003336.1`, addressed by its content-based `refgetAccession`), the `state` records the substituted residue (`G`), and the `expressions` block carries the human-readable HGVS (`NP_003336.1:p.Leu6Gly`) alongside the machine identifier.

## The tools used

- [**dcd-mapping**](https://github.com/VariantEffect/dcd_mapping2) — MaveDB's pipeline that aligns each assay's target to a reference and emits VRS alleles for every variant in a score set.
- [**vrs-python**](https://github.com/ga4gh/vrs-python) (`ga4gh.vrs` 2.0.0-a6) — VRS 2.0 Allele/Haplotype models, normalization, and digest computation (`ga4gh_identify`).
- [**cool-seq-tool**](https://github.com/GenomicMedLab/cool-seq-tool) 0.4.0.dev3 and [**cdot**](https://github.com/SACGF/cdot) — transcript selection and alignment between assay targets and standard references.
- [**seqrepo**](https://github.com/biocommons/biocommons.seqrepo) — sequence storage and refget accession resolution.
- [**MaveDB API**](https://api.mavedb.org/docs) — stores the resulting VRS alleles and serves them as MaveDB's canonical variant representation.

## How to reuse this pattern

- [VRS 2.0 specification and quick start](https://vrs.ga4gh.org/)
- [vrs-python documentation](https://github.com/ga4gh/vrs-python)
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — the service that maps and serves these VRS variants.
- Related vignette: [Annotating a variant once, across every score set](../mavedb-vrs-cross-score-set-harmonization/vignette.md) — what the shared VRS digest unlocks.
- Related vignette: [Representing a scored protein variant as a category of changes](../mavedb-protein-variant-cat-vrs/vignette.md) — Cat-VRS over these alleles.
- Related vignette: [Sharing MAVE functional evidence with VA-Spec](../mavedb-functional-evidence-va-spec/vignette.md) — the evidence built on these VRS variants.

---
