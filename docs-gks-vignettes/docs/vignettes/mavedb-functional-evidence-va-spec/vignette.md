---
title: "Sharing computable functional evidence with VA-Spec"
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
last_updated: 2026-08-06
---

# Sharing computable functional evidence with VA-Spec

Multiplexed assays measure how genetic variants behave using experimental models, and those measurements are some of the strongest evidence available for deciding whether a variant is pathogenic or benign.
Historically, this evidence has lived in spreadsheets or other tabular format that required clinical curators to read and understand often-complex research papers before they could inform a variant's classification.
MaveDB now produces a structured statement for reach variant that represents the score, experimental design, and provenance of the data and metadata using a structured format that clinical information systems can process unambiguously.
Furthermore, because this VA-Spec format is part of a constellation of related standards that are interoperable with the models for functional data implemented by MaveDB, this is also a potent enabler for integration across diverse evidence types beyond functional assays.

- **Who:** MaveDB
- **GKS products used:** VA-Spec 0.4 with VRS 2.0 variant representations
- **Tools:** [ga4gh-va-spec](https://github.com/ga4gh/va-spec-python) (`ga4gh-va-spec` ~0.4.2), MaveDB annotation pipeline
- **Status:** production

## Motivation

A multiplexed assay of variant effect produces a numeric functional score for each variant that summarizes how the variant performed in the experiment.
On its own, a score is hard to reuse and interpret because a downstream consumer needs to know precisely which variant it refers to, what the number means, how it was generated, and whether its provenance is trustworthy enough to act on (e.g. what information was peer reviewed).

MaveDB represents this using the GA4GH **Variant Annotation Specification (VA-Spec)**, implemented as a stack of three statement types at increasing levels.

The foundational object is the `ExperimentalVariantFunctionalImpactStudyResult` that contains the numeric score from the assay.
Its `focusVariant` is the variant's [VRS allele](../mavedb-mave-variants-vrs/vignette.md), which anchors the evidence to a precise, content-addressed identity.
The `functionalImpactScore` carries the measured value.
A `contributions` chain records the record's provenance by naming the MaveDB API and VRS-mapping software (with versions), the original submitter (by ORCID iD), and the relevant dates.
The `sourceDataSet` describes the MaveDB score set, its publication, and its license and the `reportedIn` entry links back to the live MaveDB record.
MaveDB produces an `ExperimentalVariantFunctionalImpactStudyResult` for every mappable variant in every published score set.

Before a functional score can be used as evidence for variant classification, it needs to be calibrated using reference variants of known effect.
There are several methods for calibrating datasets but the most widely-used assign a variant to a functional classification (e.g. `abnormal` or `normal`) based on its score and assigning evidence based on these groups.
MaveDB stores these assignments using `Statement` objects in VA-Spec, with an associated `ExperimentalVariantFunctionalImpactProposition` specifying whether the variant affects target function or not (i.e. is `abnormal` or `normal`).
The associated information about these functional classifications, such as score ranges and their provenance, are also included here.
The `ExperimentalVariantFunctionalImpactStudyResult` is included as an `EvidenceLine`, because this is the evidence used to support or refute the proposition.

Once the functional scores are calibrated, they are assigned *evidence strength* that may be applied in a variant classification framework (e.g. PS3_Strong or BS3_Supporting for ACMG v3).
These evidence strengths are representing using another `Statement` object with an associated `VariantPathogenicityProposition`.
Similar to above, the functional classification `Statement` are included as `EvidenceLine` members as needed (note that some calibration methods assign evidence to variants directly based on their scores and do not require functional classes).
MaveDB generates one variant pathogenicity `Statement` for each variant in a given score set containing all possible calibration informations.
Downstream users can choose which calibration to apply based on the metadata provided and their own expert judgement.

## Example data

We provide two examples.
The first is an `ExperimentalVariantFunctionalImpactStudyResult` for UBE2I [p.Leu6Gly](https://mavedb.org/variants/PA2579755325) (`urn:mavedb:00000001-a-1#2323`, from the [Weile et al., 2017 score set](https://mavedb.org/score-sets/urn:mavedb:00000001-a-1)). Its `focusVariant.id` is the VRS digest produced by the variant-mapping pattern:

???+ example "ExperimentalVariantFunctionalImpactStudyResult — UBE2I p.Leu6Gly"
    ```json
    --8<-- "docs/vignettes/mavedb-functional-evidence-va-spec/payloads/ube2i-leu6gly.study-result.va.json"
    ```

The second is a variant-level pathogenicity `Statement` for a [GCK variant](https://mavedb.org/variants/PA2579976630) (`urn:mavedb:00000096-a-1#2446`, from [this score set](https://mavedb.org/score-sets/urn:mavedb:00000096-a-1)).
There are two separate calibrations, one performed using all possible variants and another performed using only missense variants.
These were performed without any specific disease condition or phenotype in mind, so the proposition's condition is MedGen `C0012634`, the generic "Disease" concept; most calibrations in MaveDB are done in this way but calibrations for specific conditions are supported through this property.
For both calibrations, the variant provides moderate pathogenic evidence (supporting the pathogenicity proposition) and is assigned the ACMG v3 evidence code `PS3_Moderate`:

??? example "Pathogenicity Statement — GCK variant (1,332 lines)"
    ```json
    --8<-- "docs/vignettes/mavedb-functional-evidence-va-spec/payloads/gck-pathogenicity-statement.va.json"
    ```

## Tools

- [**ga4gh-va-spec**](https://github.com/ga4gh/va-spec-python) (`ga4gh-va-spec` ~0.4.2) — the VA-Spec `StudyResult`, `Statement`, `EvidenceLine`, `Contribution`, and `DataSet` models.
- [**MaveDB API**](https://api.mavedb.org/docs) — generates and serves these VA-Spec annotations as well as the associated data.

## Reusing this pattern

- [VA-Spec specification](https://va-ga4gh.readthedocs.io/) — definitions for the shared models.
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — the `focusVariant` used by these statements.
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — where these VA-Spec statements are assembled and served.
