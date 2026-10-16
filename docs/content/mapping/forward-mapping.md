# Forward mapping

Forward mapping is the first stage of the [mapping and annotation pipeline](index.md). MaveDB uses the variant descriptions in a score set's [score and count data tables](../submitting-data/data-formats.md) to place each variant onto standard human reference coordinates. This is what allows MaveDB to integrate with [external resources such as ClinGen, ClinVar, and gnomAD](../finding-data/external-integrations.md), powers the [MaveMD variant search](../mavemd/variant-search.md), and enables [score calibrations](../reference/score-calibrations.md) for clinical interpretation.

!!! note
    Mapping is only performed for datasets with a **human** target sequence.

This method was developed by [Arbesfeld et al. (2025)](https://doi.org/10.1186/s13059-025-03647-x) and is described in detail in the linked publication. The sections below give an overview of the pipeline.

## Why mapping is needed

Most MAVE experiments describe variants relative to an assay-specific target sequence uploaded by the data submitter. This target sequence is often not identical to a human reference sequence — it may be codon-optimized for expression in a model organism, contain synthetic elements such as minigene constructs, or represent only a portion of the full gene. Additionally, protein-level variants from cDNA-based assays may span exon boundaries when represented at the genomic level.

These differences mean that MAVE variant descriptions cannot be directly compared to variants reported by clinical sequencing pipelines or described in databases like ClinVar. Mapping resolves this by translating each variant from the experimental target-sequence coordinate system to standard human reference coordinates (GRCh38).

## Mapping process

Mapping runs when a score set's variant data is [uploaded](../submitting-data/upload-guide.md). It involves the following steps:

```mermaid
flowchart LR
    A["Target sequence<br>alignment<br>(BLAT → GRCh38)"] --> B["Transcript<br>selection<br>(MANE Select)"]
    B --> C["Variant<br>translation<br>(MAVE-HGVS → HGVS)"]
    C --> D["VRS<br>translation<br>(HGVS → VRS)"]
```

1. **Target sequence alignment**: The target sequence is aligned to the GRCh38 assembly with [BLAT](https://genome.ucsc.edu/FAQ/FAQblat.html) — nucleotide targets directly against the genome, amino-acid targets in protein space instead. The alignment fixes the target's genomic location and candidate transcripts, and the **gene is taken from the locus the target aligns to**, not from a submitter-declared gene name. Alignment is the objective signal, so a target that aligns somewhere unexpected resolves to whatever gene sits at that locus.

2. **Transcript selection**: MaveDB maps to a **single representative transcript** per target rather than to every overlapping transcript, prioritizing [MANE Select](https://www.ncbi.nlm.nih.gov/refseq/MANE/) (the clinical-reporting standard), then MANE Plus Clinical, and falling back to the longest compatible transcript when no MANE transcript applies. An offset is computed to locate the MAVE sequence within the selected reference. This gives one stable, standard coordinate system; alternate transcripts are not represented. This step applies to sequence-based targets. A score set with an [accession-based target](../submitting-data/targets.md#accession-based-targets) on a transcript keeps that transcript, even when it is not the MANE Select transcript.

3. **Variant translation**: Each variant in the score and count data tables is converted from [MAVE-HGVS](../submitting-data/data-formats.md#variant-columns) format to standard HGVS format and translated with respect to the selected transcript. This step accounts for any offset between the target sequence and the transcript.

4. **VRS translation**: The HGVS descriptions are converted to [GA4GH VRS](https://vrs.ga4gh.org/en/stable/) format using the [VRS-Python](https://github.com/ga4gh/vrs-python) library. Each representation receives a unique, computable VRS digest, enabling precise identification and data provenance.

!!! warning "Review mapping results"
    In some cases, variants may not be successfully mapped due to issues such as ambiguous target sequences, complex variant types, or discrepancies between the target and reference genome. MaveDB logs these instances and provides feedback to data contributors to help resolve mapping issues.

    Although some mapping failures represent true limitations of the data, others can be addressed by correcting errors in the submitted variants or target sequences.

    **It is highly recommended that data contributors review the mapping results after uploading a score set to ensure that variants have been accurately mapped.** Until a score set is published, its page shows the mapping status: whether all variants mapped, some did not, or mapping failed, with the error message for a failed mapping.

    Mapping failures do not prevent datasets from being published in MaveDB, but a successful mapping is required for certain features such as [variant search](../mavemd/variant-search.md), linkages with certain [external resources](../finding-data/external-integrations.md), and inclusion in [MaveMD](../mavemd/index.md).

## Submitted and reference variants

Mapping turns each **submitted variant** into one or more **reference variants**:

- The **submitted variant** is the variant as uploaded, described against the score set's target. MaveDB keeps it, so the experimental context is never lost.
- The **reference variants** describe the same change on the human reference, at the genomic, coding, and protein levels wherever the biology allows. Each is stored as a distinct allele with its own GA4GH VRS object and stable digest.

This per-level representation is what lets a variant be expressed consistently across molecular levels and matched against external resources. The [reverse translation and projection](reverse-translation.md) stage fills in the levels a given assay did not measure. [Interpreting Annotated Variants](../interpreting-annotated-variants.md) explains how to read the resulting multi-level view.

## Assay target vs. human reference

Because an assay's target sequence is often not identical to the human reference, a submitted variant and its reference variants can **differ**. Keeping both lets users see exactly how the assay relates to the human reference, so clinical users can judge whether the experimental evidence fits their interpretation context.

These differences are expected, not errors. They arise from legitimate differences between experimental and reference sequences:

- **Codon optimization** — synonymous nucleotide changes introduced to optimize expression in the assay system.
- **Non-homologous sequence content** — synthetic elements like minigene constructs that do not align to the human genome.
- **Exon-boundary spanning** — protein-level changes that, at the genomic level, correspond to nucleotide changes across exon–intron boundaries.

## What isn't mapped

Not every submitted variant yields a reference variant, and an absence is not always a failure. MaveDB distinguishes two cases:

- **Benign absences** — variants that legitimately have no reference variant. The main case is a **submitted intronic variant**: an intronic position has no protein consequence and cannot be represented at the levels MaveDB serves. Other changes with no protein consequence are treated the same way.
- **Failures** — variants that *should* map but didn't: ambiguous alignments, complex or malformed variant descriptions, or discrepancies between the target and reference genome. These are reflected in the mapping status on the score set page for the contributor to review.

Only genuine failures count against a score set's mapping; benign absences do not, and neither blocks publication.

## Downstream integrations

Reference variants are what connect MaveDB to [external resources](../finding-data/external-integrations.md): ClinGen Allele Registry identifiers, ClinGen Linked Data Hub submissions, ClinVar classifications, gnomAD allele frequencies, and Ensembl VEP consequences. They also power [MaveMD](../mavemd/index.md), including [variant search](../mavemd/variant-search.md) and [score calibrations](../reference/score-calibrations.md).

## Programmatic access

The [MaveDB API](../programmatic-access/api-quickstart.md)'s `/score-sets/{urn}/variant-details` endpoint streams one NDJSON record per variant that mapped. In each record, the submitted and reference variants' VRS objects are the `preMapped` and `postMapped` fields, alongside the variant's categorical variant and annotations. The same records are downloadable from individual score set pages in [VRS and VA-Spec JSON formats](../reference/data-standards.md#vrs-variant-representation). The older `/score-sets/{urn}/mapped-variants` endpoint returns `410 Gone`.

## See also

- [Variant mapping & annotation](index.md) — the pipeline this stage belongs to
- [Reverse Translation & Projection](reverse-translation.md) — deriving the levels an assay did not measure
- [Interpreting Annotated Variants](../interpreting-annotated-variants.md) — reading a variant's representations across levels
- [External Integrations](../finding-data/external-integrations.md) — how mapping connects MaveDB to external genomic platforms
- [Data Formats](../submitting-data/data-formats.md) — how variants are described in score and count data files
- [Targets](../submitting-data/targets.md) — sequence-based and accession-based target types
