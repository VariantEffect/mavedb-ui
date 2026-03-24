# MaveMD

MaveMD (MAVEs for MeDicine) is a clinical interface built on MaveDB that helps clinicians, genetic counselors, and variant curators use Multiplexed Assay of Variant Effect (MAVE) data for clinical variant interpretation. It brings together curated MAVE datasets, standardized metadata, evidence calibrations, and intuitive visualizations in a single platform designed to support the ACMG/AMP variant classification workflow.

!!! danger "Community database"
    MaveDB is an open, community-driven database. Datasets and score calibrations are contributed by researchers and may not always have been independently verified by MaveDB. While MaveMD provides curated metadata and standardized calibrations to support clinical interpretation, users should exercise their own professional judgment when applying these results, especially in a clinical setting.

## Why MaveMD?

Variants of uncertain significance (VUS) are a major obstacle in genetic medicine — individuals undergoing genetic testing often receive VUS results that cannot be used for clinical decision-making. MAVE data can help resolve VUS by providing functional evidence, but using this data has historically required clinicians to:

- Search across supplemental tables, lab websites, and multiple repositories to find relevant datasets
- Evaluate assay quality and relevance without standardized metadata
- Calibrate functional scores to clinical evidence strength independently

MaveMD eliminates these barriers by centralizing curated data with clinical-grade metadata, pre-computed calibrations, and a purpose-built search and visualization interface.

## What's in MaveMD?

MaveMD currently contains **82 curated MAVE datasets** spanning **39 disease-associated genes**, including 12 genes on the ACMG secondary findings list. These datasets encompass:

- **476,076 variant effect measurements** (268,862 unique variants)
- **251,573** measurements with OddsPath evidence strength assignments
- **452,304** measurements with ExCALIBR evidence strength assignments

This collection enables classification of approximately **75% of ClinVar VUS** and **62% of future variants** in the covered genes.

### How datasets were selected

The initial MaveMD collection was established through systematic curation of published functional studies. Candidate datasets were identified by searching MaveDB, querying ClinVar for publications citing foundational MAVE methodology and calibration papers, and soliciting expert recommendations. To ensure clinical relevance, only genes with moderate or greater disease associations (as determined by ClinGen Gene-Disease Validity classifications or the GenCC database) were included.

A multidisciplinary curation team extracted standardized metadata across six domains encompassing over 180 individual fields, covering dataset identification, assay design, technical performance, functional scoring, score classification, and clinical performance metrics. This comprehensive curation directly informed the metadata displayed in MaveMD's [assay facts](../reference/assay-facts.md) and [score calibrations](../reference/score-calibrations.md).

MaveMD is continuously updated as new datasets are curated and added.

## Key features

<div class="grid cards" markdown>

-   :material-magnify:{ .lg .middle } **Variant search**

    ---

    Search for individual variants using HGVS strings, ClinVar Variation IDs, dbSNP RSIDs, or ClinGen Allele IDs. A fuzzy search interface also lets you search by gene symbol, variant type, position, and alleles.

    [:octicons-arrow-right-24: Variant search](variant-search.md)

-   :material-file-document-outline:{ .lg .middle } **Variant page**

    ---

    View detailed functional evidence for a variant, including its functional classification, score distribution context, clinical control comparisons, and calibrated evidence strength.

    [:octicons-arrow-right-24: Variant page](variant-page.md)

-   :material-clipboard-text:{ .lg .middle } **Assay facts**

    ---

    Each dataset includes a structured assay fact label summarizing the assay type, molecular phenotype, model system, detectable variant consequences, and clinical performance. 

    [:octicons-arrow-right-24: Assay facts reference](../reference/assay-facts.md)

-   :material-tune-vertical:{ .lg .middle } **Score calibrations**

    ---

    MaveMD supports score calibrations from the community that map functional scores to clinical evidence strength. These calibrations are displayed on the variant page and can be used to inform clinical interpretation.

    [:octicons-arrow-right-24: Score calibrations](../reference/score-calibrations.md)

</div>

## Integrations

MaveMD connects with several external resources:

- **[ClinGen Allele Registry](https://reg.clinicalgenome.org/)** -- Powers variant search and provides stable ClinGen Allele IDs for cross-referencing. Users can also navigate from the ClinGen Allele Registry to MaveMD variants via the ClinGen Linked Data Hub.
- **[ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/)** -- Supplies pathogenic and benign clinical control variants used in calibrations and displayed in the Clinical Controls View.
- **[gnomAD](https://gnomad.broadinstitute.org/)** -- Provides population allele frequency data displayed alongside variant information.
- **[IGVF Catalog](https://catalog.igvf.org/)** -- MaveMD is integrated with the Impact of Genetic Variation on Function Consortium's Catalog, providing access to MAVE data as it is generated.

For details on how MaveMD integrates with these resources see the [external integrations](../finding-data/external-integrations.md) reference page.

## Data standards

MaveMD uses modern GA4GH standards for data representation and exchange:

- **[GA4GH VRS](https://vrs.ga4gh.org/)** -- Variant Representation Specification for describing genomic variants.
- **[GA4GH VA-Spec](https://github.com/ga4gh/va-spec)** -- Variant Annotation Specification for describing assay scores, functional annotations, and clinical evidence strength.

For details on how MaveDB generates VRS and VA-Spec objects — including object structure, multi-calibration support, and transformation details — see the [Data Standards](../reference/data-standards.md) reference page.


## Citing MaveMD

If you use MaveMD in your research or clinical practice, please cite both MaveMD and MaveDB. See the [citation page](../citation.md) for details.

## See also

- [Score Calibrations](../reference/score-calibrations.md) -- How functional scores are calibrated to clinical evidence strength
- [Assay Facts](../reference/assay-facts.md) -- Structured summaries of experimental assay properties
- [Variant Mapping](../reference/variant-mapping.md) -- How MaveDB maps variants to genomic coordinates
- [External Integrations](../finding-data/external-integrations.md) -- Connections to ClinVar, gnomAD, ClinGen, and other resources
