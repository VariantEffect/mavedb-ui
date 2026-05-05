# Data Standards

MaveDB represents variant data using open standards developed by the [GA4GH](https://www.ga4gh.org/). These standards enable interoperability with other genomic databases, clinical interpretation tools, and variant registries.

There are two complementary standards at play:

- **VRS** provides a precise, machine-readable representation of each variant's identity and genomic location.
- **VA-Spec** builds on VRS to attach functional and clinical annotations to variants.

Together, these standards allow MAVE data from MaveDB to be consumed by downstream tools consistently and precisely without requiring custom data transformations.

## VRS — Variant Representation

The [GA4GH Variation Representation Specification (VRS)](https://vrs.ga4gh.org/) is a standard for unambiguously representing genetic variants. MaveDB uses VRS as its preferred method of representing variation — while [HGVS notation](../submitting-data/data-formats.md) is used for data submission and display, VRS provides the canonical, machine-readable identity for each variant internally and in all exported data. After [variant mapping](variant-mapping.md), MaveDB produces a structured VRS JSON object for each variant that includes its genomic coordinates, alleles, and reference sequences.

VRS objects are available for download as JSON from any score set that has been successfully mapped. Each object includes:

- A globally unique **GA4GH identifier** (e.g., `ga4gh:VA.abc123...`) that can be used to reference the variant across databases.
- A **sequence location** specifying the reference sequence and coordinates.
- The **variant state** (the alternate allele).
- **HGVS expressions** for both pre-mapped (relative to the target) and post-mapped (relative to the genomic reference) coordinates.

??? example "Example VRS object for a single amino acid substitution"

    ```json
    {
      "id": "ga4gh:VA.2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK",
      "type": "Allele",
      "digest": "2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK",
      "location": {
        "id": "ga4gh:SL.BquRGqbEMPgwG-x9BEcBaIERoanGDqGr",
        "type": "SequenceLocation",
        "start": 100,
        "end": 101,
        "sequenceReference": {
          "type": "SequenceReference",
          "refgetAccession": "SQ.reference_digest"
        }
      },
      "state": {
        "type": "LiteralSequenceExpression",
        "sequence": "V"
      },
      "expressions": [
        { "value": "NP_000050.2:p.Trp101Val", "syntax": "hgvs.p" }
      ]
    }
    ```

!!! note
    VRS objects are only available for variants that have been successfully [mapped](variant-mapping.md). Variants that could not be mapped (e.g., because they are intronic or involve frameshifts at the protein level) will not have VRS representations.

## VA-Spec — Variant Annotation

The [GA4GH Variant Annotation Specification (VA-Spec)](https://va-spec.ga4gh.org/) extends VRS with a framework for attaching annotations, classifications, and evidence to variants. MaveDB uses VA-Spec to export functional and clinical annotations derived from MAVE data and [score calibrations](score-calibrations.md).

MaveDB produces three types of VA-Spec objects, each building on the previous:

```mermaid
graph LR
    FISR("Functional Impact<br/>Study Result")
    FIS("Functional Impact<br/>Statement")
    VPS("Variant Pathogenicity<br/>Statement")

    FISR -->|"evidence for"| FIS
    FIS -->|"evidence for"| VPS

    classDef base fill:#78B793,color:#fff,stroke:#5a9375,stroke-width:1.5px
    classDef mid fill:#3d7ebd,color:#fff,stroke:#2d5f8e,stroke-width:1.5px
    classDef top fill:#8e7cc3,color:#fff,stroke:#6e5fa3,stroke-width:1.5px

    class FISR base
    class FIS mid
    class VPS top
```

Functional Impact Study Results are available for all mapped score sets. Functional Impact Statements and Variant Pathogenicity Statements additionally require [score calibrations](score-calibrations.md).

### Functional Impact Study Result

A Functional Impact Study Result captures the raw output of a MAVE experiment for a single variant. It is the foundational VA-Spec object and does not require score calibrations.

Each Study Result contains:

- The **variant** as a VRS object.
- The **functional impact score** observed in the experiment.
- The **method** used, derived from publications associated with the score set.
- The **source dataset**, identifying the MaveDB score set.
- **Provenance** information, including contributions from the MaveDB API and variant mapping pipeline.

??? example "Example Functional Impact Study Result"

    ```json
    {
      "type": "ExperimentalVariantFunctionalImpactStudyResult",
      "description": "Variant effect study result for urn:mavedb:00000050-a-1#12345.",
      "focusVariant": {
        "type": "Allele",
        "id": "ga4gh:VA.2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK",
        "...": "..."
      },
      "functionalImpactScore": -1.42,
      "specifiedBy": {
        "type": "Method",
        "description": "PMID:32855553 (PubMed)"
      },
      "sourceDataSet": {
        "type": "DataSet",
        "label": "urn:mavedb:00000050-a-1",
        "description": "Deep mutational scanning of MSH2"
      }
    }
    ```

### Functional Impact Statement

A Functional Impact Statement classifies a variant's functional impact as **Normal**, **Abnormal**, or **Indeterminate** based on where its score falls within the ranges defined by a [score calibration](score-calibrations.md).

When multiple calibrations are available for a score set, MaveDB generates an evidence line for each eligible calibration — that is, each calibration that is not marked as [research-use-only](score-calibrations.md) — and selects the **strongest** calibration to determine the statement-level classification. All evidence lines are included in the exported object for transparency.

Each Functional Impact Statement contains:

- A **classification** (`Normal`, `Abnormal`, or `Indeterminate`).
- A **direction of evidence** — `Supports` (abnormal function), `Disputes` (normal function), or `Neutral` (indeterminate) — aggregated across all evidence lines.
- **Evidence lines**, one per eligible calibration, each referencing the underlying Functional Impact Study Result and the calibration that produced the classification.

??? example "Example Functional Impact Statement"

    ```json
    {
      "type": "Statement",
      "description": "Variant functional impact statement for urn:mavedb:00000050-a-1#12345.",
      "direction": "Supports",
      "proposition": {
        "type": "ExperimentalVariantFunctionalImpactProposition",
        "predicate": "impactsFunctionOf",
        "subjectVariant": { "id": "ga4gh:VA.2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK", "...": "..." },
        "objectGene": { "label": "MSH2" }
      },
      "classification": {
        "primaryCoding": {
          "code": "Abnormal",
          "system": "ga4gh-gks-term:experimental-var-func-impact-classification"
        }
      },
      "hasEvidenceLines": [
        {
          "type": "EvidenceLine",
          "directionOfEvidenceProvided": "Supports",
          "evidenceOutcome": {
            "primaryCoding": {
              "code": "Abnormal",
              "system": "ga4gh-gks-term:experimental-var-func-impact-classification"
            }
          },
          "specifiedBy": {
            "type": "Method",
            "label": "ExCalibR score calibration"
          },
          "hasEvidenceItems": ["..."]
        }
      ]
    }
    ```

### Variant Pathogenicity Statement

A Variant Pathogenicity Statement translates functional evidence into clinical terms by mapping functional classifications to [ACMG/AMP criteria](https://pubmed.ncbi.nlm.nih.gov/25741868/). This is the primary object MaveDB exports for integration into clinical variant interpretation workflows.

Each statement assigns an ACMG criterion and evidence strength:

| ACMG criterion | Direction | Meaning |
|---|---|---|
| PS3 | Supports pathogenicity | Well-established functional study shows a damaging effect |
| BS3 | Supports benignity | Well-established functional study shows no damaging effect |

The evidence strength (e.g., `Supporting`, `Moderate`, `Strong`, `Very Strong`) indicates the level of confidence in the classification, determined by the score calibration.

When multiple calibrations are eligible, MaveDB generates a clinical evidence line for each and selects the **strongest** to determine the statement-level classification. All evidence lines are included in the output. If calibrations provide conflicting evidence at equal strength (e.g., one supports pathogenicity while another supports benignity), the classification defaults to `Uncertain Significance`.

Each Variant Pathogenicity Statement contains:

- A **classification** (`Pathogenic`, `Benign`, or `Uncertain Significance`).
- A **direction of evidence** aggregated across all clinical evidence lines.
- **Clinical evidence lines**, each containing the ACMG criterion, evidence strength, and a nested Functional Impact Statement.

??? example "Example Variant Pathogenicity Statement"

    ```json
    {
      "type": "VariantPathogenicityStatement",
      "description": "Variant pathogenicity statement for urn:mavedb:00000050-a-1#12345.",
      "direction": "Supports",
      "proposition": {
        "type": "VariantPathogenicityProposition",
        "predicate": "isCausalFor",
        "subjectVariant": { "id": "ga4gh:VA.2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK", "...": "..." },
        "objectCondition": { "label": "disease" }
      },
      "classification": {
        "primaryCoding": {
          "code": "Pathogenic",
          "system": "ACMG Guidelines, 2015"
        }
      },
      "hasEvidenceLines": [
        {
          "type": "VariantPathogenicityEvidenceLine",
          "directionOfEvidenceProvided": "Supports",
          "strengthOfEvidenceProvided": {
            "primaryCoding": {
              "code": "Strong"
            }
          },
          "evidenceOutcome": {
            "primaryCoding": {
              "code": "ps3_strong",
              "system": "ACMG Guidelines, 2015"
            },
            "name": "ACMG 2015 PS3 Criterion Met"
          },
          "hasEvidenceItems": ["..."]
        }
      ]
    }
    ```

## Transformation details

### Multi-calibration support

A score set may have multiple [score calibrations](score-calibrations.md) available. When generating VA-Spec annotations, MaveDB evaluates all eligible calibrations and builds evidence lines for each. The statement-level classification is determined by the **strongest** calibration — the one providing the highest evidence strength.

This means a single Variant Pathogenicity Statement may contain multiple evidence lines from different calibrations, giving consumers full visibility into all available evidence while clearly indicating which calibration drove the final classification.

!!! note
    Research-use-only (RUO) calibrations are excluded from VA-Spec annotations by default. Only calibrations intended for clinical use contribute evidence lines to exported objects.

### Evidence strength mapping

MaveDB's internal evidence strength scale includes a `Moderate+` level that sits between `Moderate` and `Strong`. Because the GA4GH VA-Spec standard does not include this level, MaveDB maps `Moderate+` to `Moderate` when generating Variant Pathogenicity Statements. This ensures compliance with the standard while preserving a conservative interpretation of evidence strength.

The full internal evidence strength scale, from weakest to strongest:

: `Supporting` · `Moderate` · `Moderate+` · `Strong` · `Very Strong`

In VA-Spec output, `Moderate+` appears as `Moderate`.

### Direction of evidence

VA-Spec uses a `direction` field to indicate whether evidence supports or disputes a proposition. MaveDB maps functional classifications to directions as follows:

| Functional classification | Direction | Rationale |
|---|---|---|
| Normal | Disputes | Normal function argues against pathogenicity |
| Abnormal | Supports | Abnormal function argues for pathogenicity |
| Indeterminate | Neutral | Insufficient evidence to determine direction |

!!! tip
    The default proposition being evaluated is that the variant **affects function** (for Functional Impact Statements) or **is pathogenic** (for Variant Pathogenicity Statements). This is why `Normal` function *disputes* the proposition while `Abnormal` function *supports* it.
    
When a statement includes multiple evidence lines, MaveDB aggregates their directions. If all evidence lines point in the same direction, the statement inherits that direction. If evidence lines conflict, the statement direction is set to `Neutral`.

### Variants without VRS representations

Not all variants in a score set can be represented in VRS. Variants are excluded from VRS and VA-Spec output if they:

- Are intronic (fall outside coding regions).
- Involve frameshifts at the protein level.
- Could not be resolved to a genomic location during [variant mapping](variant-mapping.md).

These variants remain available in the score and count CSV downloads but will not appear in VRS JSON or VA-Spec exports.

## Working with VRS and VA-Spec objects

VRS and VA-Spec objects exported from MaveDB are self-contained but reference other data — sequences, score sets, and variant identifiers — that you can resolve through the MaveDB API. This section walks through the end-to-end workflow of downloading these objects and extracting the information they contain.

### Downloading mapped variants

Start by fetching the mapped variants for a score set. The response is a JSON array of VRS objects, each paired with its MaveDB scores.

=== "Python"

    ```python
    import requests

    BASE_URL = "https://api.mavedb.org/api/v1"
    urn = "urn:mavedb:00000003-a-1"

    response = requests.get(f"{BASE_URL}/score-sets/{urn}/mapped-variants")
    mapped_variants = response.json()

    # Each entry contains a VRS object and associated scores
    for mv in mapped_variants[:3]:
        variant = mv["post_mapped"]
        print(variant["id"], variant["expressions"][0]["value"])
    ```

=== "R"

    ```r
    library(httr)
    library(jsonlite)

    base_url <- "https://api.mavedb.org/api/v1"
    urn <- "urn:mavedb:00000003-a-1"

    response <- GET(paste0(base_url, "/score-sets/", urn, "/mapped-variants"))
    mapped_variants <- content(response, as = "parsed")

    for (mv in mapped_variants[1:3]) {
      variant <- mv$post_mapped
      cat(variant$id, variant$expressions[[1]]$value, "\n")
    }
    ```

=== "curl"

    ```bash
    curl -o mapped_variants.json \
      https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/mapped-variants
    ```

### Retrieving reference sequences (refget)

Each VRS object includes a `refgetAccession` field (e.g., `SQ.ymbRAEaAHMm9DqGhSgMxvvo3SWjA-LME`) that identifies the reference sequence the variant is located on. This accession is a [GA4GH refget](https://samtools.github.io/hts-specs/refget.html) identifier — a truncated SHA-512 digest of the sequence, base64url-encoded.

MaveDB exposes a refget-compliant API that lets you retrieve the actual sequence behind any `refgetAccession`. The available endpoints are:

| Endpoint | Description | Docs |
|---|---|---|
| `GET /api/v1/refget/sequence/{accession}` | Fetch the full sequence, or a subsequence via `start` and `end` query parameters | [:octicons-link-external-16:](https://api.mavedb.org/docs#/Refget/get_sequence_api_v1_refget_sequence__alias__get) |
| `GET /api/v1/refget/sequence/{accession}/metadata` | Sequence metadata including length and alternative identifiers (MD5, ga4gh, trunc512) | [:octicons-link-external-16:](https://api.mavedb.org/docs#/Refget/get_metadata_api_v1_refget_sequence__alias__metadata_get) |
| `GET /api/v1/refget/sequence/service-info` | Service capabilities and supported algorithms | [:octicons-link-external-16:](https://api.mavedb.org/docs#/Refget/service_info_api_v1_refget_sequence_service_info_get) |

Given a VRS object, you can extract the reference accession and coordinates to fetch the reference allele at the variant's position:

=== "Python"

    ```python
    import requests

    BASE_URL = "https://api.mavedb.org/api/v1"

    # Extract location fields from a VRS object
    location = variant["location"]
    accession = location["sequenceReference"]["refgetAccession"]
    start = location["start"]
    end = location["end"]

    # Fetch the reference allele at this position
    response = requests.get(
        f"{BASE_URL}/refget/sequence/{accession}",
        params={"start": start, "end": end},
    )
    ref_allele = response.text
    alt_allele = variant["state"]["sequence"]

    print(f"Position {start}-{end}: {ref_allele} → {alt_allele}")
    ```

=== "R"

    ```r
    library(httr)

    base_url <- "https://api.mavedb.org/api/v1"

    # Extract location fields from a VRS object
    accession <- variant$location$sequenceReference$refgetAccession
    start <- variant$location$start
    end <- variant$location$end

    # Fetch the reference allele at this position
    response <- GET(
      paste0(base_url, "/refget/sequence/", accession),
      query = list(start = start, end = end)
    )
    ref_allele <- content(response, as = "text")
    alt_allele <- variant$state$sequence

    cat(sprintf("Position %d-%d: %s → %s\n", start, end, ref_allele, alt_allele))
    ```

=== "curl"

    ```bash
    # Fetch the reference allele at positions 100-101
    curl "https://api.mavedb.org/api/v1/refget/sequence/SQ.ymbRAEaAHMm9DqGhSgMxvvo3SWjA-LME?start=100&end=101"

    # Fetch full sequence metadata (length, alternative identifiers)
    curl https://api.mavedb.org/api/v1/refget/sequence/SQ.ymbRAEaAHMm9DqGhSgMxvvo3SWjA-LME/metadata
    ```

### Resolving score set metadata

VA-Spec objects reference their source score set by URN in the `sourceDataSet` field. You can use this to fetch the full score set metadata, including the experiment, target gene, publications, and calibrations.

=== "Python"

    ```python
    import requests

    BASE_URL = "https://api.mavedb.org/api/v1"

    # Extract the score set URN from a VA-Spec Study Result
    score_set_urn = study_result["sourceDataSet"]["label"]  # e.g., "urn:mavedb:00000050-a-1"

    # Fetch full score set metadata
    response = requests.get(f"{BASE_URL}/score-sets/{score_set_urn}")
    score_set = response.json()

    print(f"Title: {score_set['title']}")
    print(f"Target: {score_set['targetGenes'][0]['name']}")
    print(f"Variants: {score_set['numVariants']}")
    ```

=== "R"

    ```r
    library(httr)
    library(jsonlite)

    base_url <- "https://api.mavedb.org/api/v1"

    # Extract the score set URN from a VA-Spec Study Result
    score_set_urn <- study_result$sourceDataSet$label

    # Fetch full score set metadata
    response <- GET(paste0(base_url, "/score-sets/", score_set_urn))
    score_set <- content(response, as = "parsed")

    cat("Title:", score_set$title, "\n")
    cat("Target:", score_set$targetGenes[[1]]$name, "\n")
    cat("Variants:", score_set$numVariants, "\n")
    ```

=== "curl"

    ```bash
    curl https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000050-a-1
    ```

### Using GA4GH identifiers

Each VRS object has a globally unique GA4GH identifier (e.g., `ga4gh:VA.2JOqpLMF9g5JoGRYoFLz5EMqCfFj1TxK`). These identifiers are computed deterministically from the variant's properties, so the same variant will always produce the same identifier regardless of which database generates it. This makes GA4GH identifiers useful for cross-referencing variants from MaveDB with other GA4GH-compliant databases.

!!! tip "Why GA4GH identifiers matter"
    HGVS strings that describe the same variant are often not identical — differences in reference sequence versions, notation style, or coordinate systems can produce different strings for the same biological change. This makes cross-referencing variants by HGVS alone unreliable. GA4GH identifiers solve this problem by being computed deterministically from the variant's properties, guaranteeing that the same variant always produces the same identifier regardless of how it was originally described.

    GA4GH identifiers can also be used directly to search MaveMD. Paste a `ga4gh:VA.*` or `ga4gh:VH.*` identifier into the VRS search tab to retrieve matching functional measurements without going through the ClinGen Allele Registry. See [VRS identifier search](../mavemd/variant-search.md#vrs-identifier-search) for details.

### HGVS expressions

VRS objects include HGVS expressions in the `expressions` array for human readability. MaveDB typically includes both pre-mapped (relative to the target sequence) and post-mapped (relative to a genomic reference) HGVS strings. The `syntax` field indicates the type — `hgvs.p` for protein, `hgvs.g` for genomic, or `hgvs.c` for coding DNA.

## See also

- [Score calibrations](score-calibrations.md) -- the calibration data that powers functional and clinical classifications.
- [Variant mapping](variant-mapping.md) -- how variants are mapped to genomic coordinates before VRS representation.
- [Downloading data](../finding-data/downloading.md) -- download VRS and VA-Spec data from score set pages.
- [External integrations](../finding-data/external-integrations.md) -- how VA-Spec objects are shared with ClinGen and other platforms.
- [Controlled vocabulary](controlled-vocabulary.md) -- terms used in MaveDB metadata and annotations.
