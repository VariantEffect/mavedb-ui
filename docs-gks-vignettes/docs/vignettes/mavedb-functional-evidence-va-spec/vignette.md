---
title: "Sharing MAVE functional evidence as computable statements with VA-Spec"
slug: mavedb-functional-evidence-va-spec
summary: "MaveDB publishes its functional measurements as a layered stack of VA-Spec statements — raw study results, per-assay functional-impact calls, and variant-level pathogenicity statements — turning experimental scores into provenance-rich evidence clinical interpretation pipelines can consume directly."
products:
  - name: VA-Spec
    version: "0.4"
pattern: clinical-evidence-sharing
implementer: MaveDB
status: production
contributors:
  - bencap
  - MaveDB team
last_updated: 2026-06-29
---

# Sharing MAVE functional evidence as computable statements with VA-Spec

**Why this matters**

Multiplexed assays measure how genetic variants behave in the lab, and those measurements are some of the strongest evidence available for deciding whether a variant is pathogenic. But that evidence has historically lived as spreadsheets of numbers that a human had to find, interpret, and transcribe before it could inform a clinical assessment. MaveDB now publishes each measurement as a structured statement that records the score, what was measured, how, by whom, and where it came from — in a shared format that variant-interpretation systems can read automatically. Experimental evidence becomes something software can pick up and use, with its full provenance attached.

**At a glance**

- **Who:** MaveDB
- **GKS products used:** VA-Spec 0.4, building on VRS 2.0 variants
- **Tools:** [ga4gh-va-spec](https://github.com/ga4gh/va-spec-python) (`ga4gh-va-spec` ~0.4.2), MaveDB annotation pipeline
- **Status:** production

---

## The story

A multiplexed assay of variant effect produces a functional score for each variant — a number summarizing how the variant behaved in the experiment. On its own, a score is hard to reuse: a downstream consumer needs to know which variant it refers to (precisely), what the number means, how it was generated, and whether its provenance is trustworthy enough to act on.

MaveDB expresses this using the GA4GH **Variant Annotation Specification (VA-Spec)**, as a stack of three statement types at rising altitudes.

At the base is the `ExperimentalVariantFunctionalImpactStudyResult` — the raw measurement. Its `focusVariant` is the variant's [VRS allele](../mavedb-mave-variants-vrs/vignette.md), anchoring the evidence to a precise, content-addressed identity rather than a free-text label, and `functionalImpactScore` carries the measured value. Around that it records structured **provenance**: a `contributions` chain naming the MaveDB API and VRS-mapping software (with versions), the original submitter (by ORCID), and the relevant dates; a `sourceDataSet` describing the score set, its publication, and its license; and `reportedIn` links back to the live MaveDB records. MaveDB emits one for every mappable variant in every published score set.

*Calibration* is what turns a raw score into evidence: using reference variants of known effect, it sets the score thresholds — and the ACMG evidence strength (*supporting*, *moderate*, *strong*) — at which the assay's scores support a normal or abnormal functional call. Where a score set has been calibrated, MaveDB raises its raw results into a per-assay **functional-impact `Statement`** — the assay's normal/abnormal call. It aggregates the assay's calibrations into a single functional classification (for example `abnormal` or `normal`) rooted in the study result beneath it: the assay saying what its numbers *mean*, not just what they were.

At the top sits a variant-level **pathogenicity `Statement`**, the only layer that aggregates *across assays*. It carries one evidence line per assay that measured the variant — each wrapping that assay's functional-impact statement, scored against an ACMG criterion such as PS3 — and integrates them into an ACMG-style classification. Crucially, it integrates MaveDB's **functional evidence only**: it is the functional *contribution* to a classification, not a standalone clinical verdict, which also requires population, segregation, and computational evidence that a downstream knowledgebase supplies. The layers nest — a pathogenicity statement contains its functional statements, which contain their study results — so a single object can carry the conclusion together with the full evidentiary chain beneath it. Because the evidence is structured and VRS-anchored at every level, a variant-interpretation pipeline can ingest any of these layers directly.

## The data

Two real exports, at opposite ends of the stack.

The base unit — an `ExperimentalVariantFunctionalImpactStudyResult` for UBE2I [p.Leu6Gly](https://mavedb.org/variants/PA2579755325) (`urn:mavedb:00000001-a-1#2323`, from the [Weile et al., 2017 score set](https://mavedb.org/score-sets/urn:mavedb:00000001-a-1)). Its `focusVariant.id` is exactly the VRS digest produced by the variant-mapping pattern:

???+ example "ExperimentalVariantFunctionalImpactStudyResult — UBE2I p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-functional-evidence-va-spec/payloads/ube2i-leu6gly.study-result.va.json"
    ```

The apex — the full, real variant-level pathogenicity `Statement` for a [GCK variant](https://mavedb.org/variants/PA2579976630) (`urn:mavedb:00000096-a-1#2446`, from [this score set](https://mavedb.org/score-sets/urn:mavedb:00000096-a-1)). It is classified `pathogenic` and aggregates **two assays'** evidence lines, each an *ACMG 2015 PS3 Criterion Met* at `moderate` strength, each wrapping an `abnormal` functional-impact statement rooted in its own study result — the entire evidentiary stack in one object. Note the proposition's condition: MedGen `C0012634`, the generic *"Disease"* concept. MaveDB currently calibrates its functional scores against this single generic disease condition rather than any gene-specific disorder, so the classification expresses functional impact toward disease in general, not a specific clinical diagnosis:

??? example "Pathogenicity Statement — GCK variant (1,332 lines)"
    ```json
    --8<-- "docs/vignettes/mavedb-functional-evidence-va-spec/payloads/gck-pathogenicity-statement.va.json"
    ```

## The tools used

- [**ga4gh-va-spec**](https://github.com/ga4gh/va-spec-python) (`ga4gh-va-spec` ~0.4.2) — the VA-Spec `StudyResult`, `Statement`, `EvidenceLine`, `Contribution`, and `DataSet` models MaveDB populates across all three altitudes.
- [**MaveDB API**](https://api.mavedb.org/docs) — generates and serves these VA-Spec annotations (the `MaveDB API` agent stamped into each statement's `contributions`) alongside the underlying score-set data.

## How to reuse this pattern

- [VA-Spec specification](https://va-ga4gh.readthedocs.io/) — the statement and study-result model.
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — the `focusVariant` these statements point at.
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — where these VA-Spec statements are assembled and served.
- Related vignette: [Annotating a variant once, across every score set](../mavedb-vrs-cross-score-set-harmonization/vignette.md) — why one variant's evidence can draw on many experiments.

---
