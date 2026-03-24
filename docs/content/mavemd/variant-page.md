# Variant page

When you search for a variant in MaveMD and select a measurement from the [search results](variant-search.md), you are taken to the variant page. This page is the core of the MaveMD clinical interface, bringing together functional evidence, assay metadata, and calibration information in a single view designed to support variant classification.

## Variant identifiers

The top of the page displays the variant in HGVS format along with alternate identifiers where available:

- **ClinGen Allele ID** -- A stable identifier from the [ClinGen Allele Registry](https://reg.clinicalgenome.org/), linked directly to the registry entry.
- **ClinVar Variation ID** -- Links to the variant's [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) entry, if one exists.
- **dbSNP RSID** -- Links to the variant's [dbSNP](https://www.ncbi.nlm.nih.gov/snp/) entry, if one exists.

The variant's **functional classification** is also prominently displayed with a color-coded label (e.g., normal, abnormal, or intermediate), based on the selected dataset's classification thresholds.

## Switching between assays

When a variant has been measured in more than one MAVE dataset, MaveMD lists all available measurements at the top of the page. You can select a different assay to view its functional evidence, assay facts, and calibration information independently.

This is important because different assays may measure different molecular properties. For example, one assay might measure overall protein abundance while another measures enzymatic activity — and the results may not always agree. Viewing each assay's evidence in context, including its [assay facts](#assay-facts) and [calibration data](#evidence-calibrations), helps you evaluate which measurements are most relevant to the clinical question.

You can also navigate to the full [score set page](../finding-data/visualizations.md) for the selected assay to view the complete dataset, including the heatmap, all variant scores, and detailed metadata.

## Assay facts

Each dataset on the variant page includes an [assay fact](../reference/assay-facts.md) label that summarizes the key properties of the functional assay. These labels are designed to help you quickly assess whether an assay is relevant to your clinical context. Key properties include:

- **Assay type** -- Whether the assay measures cell fitness, uses a reporter, or measures direct protein function.
- **Molecular phenotype** -- The specific molecular process being measured.
- **Model system** -- The biological system used (e.g., human cells, yeast).
- **Variant consequences detected** -- Whether the assay detects loss of function, gain of function, dominant negative effects, or a combination.
- **Splicing and NMD detection** -- Whether the assay can detect variants that affect splicing or trigger NMD.
- **Clinical performance** -- OddsPath values and evidence strength codes for normal and abnormal functional readouts, when available.

!!! tip "Assay design affects what variants can be detected"
    cDNA-based assays introduce a synthetic copy of the gene and therefore **cannot detect splicing variants or variants subject to NMD** in a physiological context. The assay facts label can be used to identify how these nuances in assay design can affect the interpretation of functional scores for different variant types.

For the full list of assay fact properties and their definitions, see the [assay facts reference](../reference/assay-facts.md).

## Interactive histogram

The variant page includes the same interactive score histogram shown on score set pages, but with the selected variant's position highlighted within the distribution. This visualization helps you see where the variant falls relative to all other measured variants in the assay.

### Overall Distribution view

The default view shows the full distribution of variant effect scores across all tested variants. Colored backgrounds indicate the author-specified functional classes:

- **Blue** -- Normal or wild-type-like function
- **Red** -- Abnormal or loss of function
- **Yellow** -- Intermediate

Vertical bars mark the boundaries between functional classes.

!!! note "Score direction varies by assay"
    In most MAVE datasets, higher scores indicate more normal function. However, this is not universal. For example, in some DNA mismatch repair assays (such as those for MSH2), lower scores indicate normal protein activity. Always check the functional class labels and color coding rather than assuming a fixed score direction.

### Clinical Controls view

Toggle to the Clinical Controls view to see how the assay's functional scores correspond to independently classified clinical variants from [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/):

- **Red** -- Pathogenic or likely pathogenic variants
- **Blue** -- Benign or likely benign variants

This view shows the number of clinically classified variants in each score bin. A well-calibrated assay will show clear separation between pathogenic and benign control variants. Overlap or unexpected patterns may indicate limitations in the assay or warrant further investigation.

You can select different snapshots of the ClinVar database to see how clinical classifications have changed over time.

## Evidence calibrations

Below the histogram, the variant page displays evidence calibration information that translates functional scores into clinical evidence strength compatible with the ACMG/AMP variant classification framework. When multiple calibration methods are available for a dataset, you can toggle between them to compare their results.

The calibration table shows score ranges alongside their functional classifications (normal, abnormal, intermediate), ACMG/AMP evidence codes (e.g., PS3_Strong, BS3_Moderate), and OddsPath values when available. If the selected variant falls within a calibrated score range, the corresponding evidence strength is highlighted.

For details on calibration methods, how calibrations are uploaded, and how primary calibrations are selected, see [Score Calibrations](../reference/score-calibrations.md).


## Downloading data

From the variant page, you can download data using GA4GH standard formats:

- **VRS format** -- Genomic variant representations following the [GA4GH Variant Representation Specification](https://vrs.ga4gh.org/).
- **VA-Spec format** -- Annotated variant data following the [GA4GH Variant Annotation Specification](https://github.com/ga4gh/va-spec), including functional scores, classifications, and evidence strength assignments.

For details on how MaveMD generates VRS and VA-Spec objects — including object structure, multi-calibration support, and transformation details — see the [Data Standards](../reference/data-standards.md) reference page.

## See also

- [Variant search](variant-search.md) -- How to find variants in MaveMD
- [Assay facts](../reference/assay-facts.md) -- Full reference for assay fact properties
- [Score calibrations](../reference/score-calibrations.md) -- How functional scores are calibrated to evidence strength
- [Visualizations](../finding-data/visualizations.md) -- Score histograms and heatmaps on score set pages
- [External Integrations](../finding-data/external-integrations.md) -- ClinVar, gnomAD, and ClinGen connections
