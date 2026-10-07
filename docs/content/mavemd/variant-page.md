# Variant page

When you search for a variant in MaveMD and select a measurement from the [search results](variant-search.md), you are taken to the variant page. This page is the core of the MaveMD clinical interface, bringing together functional evidence, assay metadata, and calibration information in a single view designed to support variant classification.

## Variant identifiers

The top of the page displays the variant in HGVS format, followed by its gene and GRCh38 location, and links to:

- **The protein change** -- On a nucleotide change's page, the page for the protein change it encodes.
- **ClinGen Allele Registry** -- The variant's entry in the [ClinGen Allele Registry](https://reg.clinicalgenome.org/).

The variant's **functional classification** is also prominently displayed with a color-coded label (e.g., normal, abnormal, or intermediate), based on the selected dataset's classification thresholds.

## Switching between assays

When a variant has been measured in more than one MAVE dataset, MaveMD lists every measurement in a table at the top of the page. Each row shows the score set, its assay type and model system, the functional impact and ACMG evidence code from its primary calibration, and the raw score. Scores are on each assay's own scale, so compare measurements by their functional impact rather than by score. Selecting a row jumps to its functional evidence, and the assay facts and calibration information below follow the selection. Long lists show their top-ranked measurements first, with the rest behind **Show more**.

This is important because different assays may measure different molecular properties. For example, one assay might measure overall protein abundance while another measures enzymatic activity — and the results may not always agree. Viewing each assay's evidence in context, including its [assay facts](#assay-facts) and [calibration data](#evidence-calibrations), helps you evaluate which measurements are most relevant to the clinical question.

You can also navigate to the full [score set page](../finding-data/visualizations.md) for the selected assay to view the complete dataset, including the heatmap, all variant scores, and detailed metadata.

## What each measurement measured

The measurement table groups measurements by what they assayed relative to your variant, with a heading for each group: measurements of **this exact nucleotide change**, measurements of **the protein change it encodes**, and measurements of **other nucleotide changes that encode the same protein change**. Only measurements in the first group measured your variant directly. If there are none, a notice at the top of the table says so: every measurement shown assayed a related variant.

When you select a measurement from one of the other groups, a notice at the top of the functional evidence section states what was measured instead and what that can miss. For example, a protein-level measurement may not capture nucleotide-level effects such as splicing.

## View options

The **View options** button in the page header holds two settings that change which measurements are shown: **MaveDB as of**, which shows the molecular and annotation layer as MaveDB held it on a past date (scores never change), and **Show superseded score sets**. The button shows a count when either is set. The **Key** button beside it opens a glossary of the terms on this page.

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

## Clinical and population data

Beneath the assay details, **Clinical & population data** reports external evidence for your variant first, then for the other nucleotide changes that encode the same protein change, across all of its measurements. On a protein-change page, it lists the nucleotide changes that encode that protein change. The rows do not change as you select different measurements; the one the selected measurement assayed is highlighted and tagged **Selected measurement**. A pathogenic ClinVar classification of a different nucleotide change that encodes the same protein change can support your variant's interpretation (ACMG PS1).

Each row reports the **molecular consequence** from Ensembl VEP, the **population frequency** from [gnomAD](../finding-data/external-integrations.md#gnomad), and the **clinical significance** from [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/). For population frequency:

- **AF** -- The allele frequency, the headline figure.
- **FAF95** -- The filtering allele frequency at 95% confidence, a conservative sampling-adjusted estimate. A variant whose FAF95 exceeds a disease's maximum credible allele frequency is too common to be pathogenic (ACMG BA1/BS1).
- **Allele count / allele number** -- The counts the frequency was computed from.

gnomAD and ClinVar record nucleotide changes, not protein changes, so every row is a nucleotide change and shows only its own records. Variants absent from gnomAD are reported as having no record rather than as having zero frequency.

Each source's release (VEP version, gnomAD version, ClinVar release) is shown once in the column heading when every row draws from the same release; otherwise each cell shows its own.

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

Switch to the **Controls** tab to see how the assay's functional scores correspond to independently classified clinical variants from [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/):

- **Red** -- Pathogenic or likely pathogenic variants
- **Blue** -- Benign or likely benign variants

This view shows the number of clinically classified variants in each score bin. A well-calibrated assay will show clear separation between pathogenic and benign control variants. Overlap or unexpected patterns may indicate limitations in the assay or warrant further investigation.

You can select different snapshots of the ClinVar database to see how clinical classifications have changed over time.

## Evidence calibrations

Below the histogram, the variant page displays evidence calibration information that translates functional scores into clinical evidence strength compatible with the ACMG/AMP variant classification framework. When multiple calibration methods are available for a dataset, you can toggle between them to compare their results.

The calibration table shows score ranges alongside their functional classifications (normal, abnormal, intermediate), ACMG/AMP evidence codes (e.g., PS3 Strong, BS3 Moderate), and OddsPath values when available. If the selected variant falls within a calibrated score range, the corresponding evidence strength is highlighted.

In the functional evidence section, the functional impact, ACMG code, and OddsPath ratio are grouped under the calibration they come from, apart from the score itself; when a score set has more than one calibration, you can switch between them there as well as above the histogram, and the two stay in sync. A link jumps to the full calibration below the histogram, and **View score set** opens the score set page with this measurement and calibration already selected. Calibrations marked **Research use only** are not intended for clinical or diagnostic use and are tagged as such wherever their calls appear. When no other calibration classifies a measurement, the measurement table shows its research-use-only call with that tag, but research-use-only calls never affect the table's order.

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
