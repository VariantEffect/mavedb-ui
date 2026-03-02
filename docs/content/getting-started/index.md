# Getting Started

## What is MaveDB?

**Multiplexed Assays of Variant Effect** (MAVEs) are high-throughput experimental techniques that measure the functional impact of thousands to millions of genetic variants in a single experiment. Common MAVE approaches include:

- **Deep Mutational Scanning (DMS)** -- systematically introduces mutations into a protein-coding gene and measures the effect of each variant on protein function using a selection assay.
- **Massively Parallel Reporter Assays (MPRA)** -- tests the effect of sequence variants on gene regulatory elements such as promoters and enhancers.
- **Saturation Genome Editing (SGE)** -- uses CRISPR-based editing to introduce variants directly into the endogenous genomic locus, measuring their functional effects in the native regulatory and chromatin context.

These experiments generate large datasets that associate individual variants with quantitative functional scores, providing valuable evidence for understanding gene function and interpreting variants of uncertain significance in clinical genomics.

**MaveDB** is the public repository for these datasets. It stores the experimental metadata, variant scores, and count data from MAVE studies, organized in a structured hierarchy of [experiment sets, experiments, and score sets](key-concepts.md). MaveDB also supports [variant mapping](../reference/variant-mapping.md) to genomic coordinates, [score calibrations](../reference/score-calibrations.md) for clinical interpretation, and integration with [external resources](../finding-data/external-integrations.md) such as ClinVar, gnomAD, and ClinGen.

## What can you do with MaveDB?

### Search for datasets

Use the MaveDB [search interface](../finding-data/searching.md) to find MAVE datasets by gene name, target organism, publication, or keywords. Results are grouped by experiment, making it easy to browse related score sets.

### Browse dataset details

Each score set page provides a detailed view of the data, including metadata about the experiment, target information, interactive [visualizations](../finding-data/visualizations.md) (such as heatmaps and histograms), and links to associated publications.

### Download data

Download variant scores and counts in CSV format from individual score set pages. [Mapped variants](../reference/variant-mapping.md) are available in GA4GH VRS JSON format, and annotated variants are available in VA-Spec format. For large-scale analyses, a [bulk download archive](../finding-data/downloading.md) is available on Zenodo.

### Upload experiments and score sets

Researchers can [deposit their MAVE data](../submitting-data/before-you-start.md) into MaveDB using a step-by-step upload wizard. Uploaded datasets can be kept private during review and then published to make them accessible to the community.

### Use the API

The [MaveDB API](../programmatic-access/api-quickstart.md) provides programmatic access to all public datasets. The [`mavedb` Python package](../programmatic-access/python-usage.md) is also available for local validation and programmatic submission.

## Quick start

Already know what you want to do? Jump directly to the relevant guide:

| I want to...                                | Go to                                                      |
|---------------------------------------------|--------------------------------------------------------------|
| Find data for a specific gene               | [Searching datasets](../finding-data/searching.md)           |
| Upload my MAVE data                         | [Before you start](../submitting-data/before-you-start.md)   |
| Look up a variant's clinical significance   | [MaveMD](../mavemd/index.md)                                 |
| Download data programmatically              | [API quickstart](../programmatic-access/api-quickstart.md)   |
| Understand the MaveDB data model            | [Key concepts](key-concepts.md)                              |

## Next steps

- Learn about the [key concepts](key-concepts.md) behind MaveDB's data model, including how experiment sets, experiments, and score sets relate to each other.
- Set up your [user account](accounts.md) to start submitting data or accessing private datasets via the API.
- Explore the [search interface](../finding-data/searching.md) to find datasets for your gene of interest.
- Learn how [score calibrations](../reference/score-calibrations.md) enable clinical interpretation of MAVE data.
