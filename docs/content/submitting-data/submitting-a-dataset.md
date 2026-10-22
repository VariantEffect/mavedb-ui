# Submitting a Dataset

This page lists what to have ready and walks through the experiment and score set forms step by step. If you haven't decided how to split your study into records, read [Organizing Your Study](organizing-your-study.md) first.

To start a form, sign in, open the **Add Dataset** menu in the navigation bar, and choose **New Experiment** or **New Score Set**. Create the experiment first; every score set belongs to one.

## What to have ready

| Item | Experiment | Score set | Details |
|---|---|---|---|
| Title, short description, abstract, methods | Required | Required | [Free text metadata](metadata-guide.md#free-text-metadata) |
| Target sequence or accession | | Required | [Targets](targets.md) |
| Score CSV file | | Required | [Data Formats](data-formats.md) |
| License | | Required (defaults to CC0) | [Licenses](metadata-guide.md#licenses) |
| Publication identifiers (PubMed, bioRxiv, medRxiv, DOI) | Recommended | Recommended | [Publication details](metadata-guide.md#publication-details) |
| DOIs for other resources, such as code or external datasets | Recommended | Recommended | [DOIs](metadata-guide.md#digital-object-identifiers-dois) |
| Contributor ORCID iDs (each must have signed in to MaveDB once) | Recommended | Recommended | [Contributors](metadata-guide.md#contributors) |
| Raw data accessions (SRA, ArrayExpress, and others) | Recommended | | [Raw data accessions](metadata-guide.md#raw-data-accessions) |
| Controlled keywords | Recommended | | [Keywords](metadata-guide.md#keywords) |
| Count CSV file | | Recommended | [Count tables](data-formats.md#count-table-columns) |
| Column metadata JSON files | | Recommended | [Metadata files](data-formats.md#metadata-files) |
| Score calibration | | Recommended | [Score Calibrations](../reference/score-calibrations.md) |
| Structured JSON metadata | Optional | Optional | [Optional structured metadata](metadata-guide.md#optional-structured-metadata) |
| Data usage policy | | Optional | [Licenses](metadata-guide.md#licenses) |

## Creating an experiment

1. **Experiment information.** Enter the free text metadata, publications, DOIs, raw data accessions, and contributors. Describe the library construction, assay, and sequencing in the methods; scoring belongs in the score set.
2. **Keywords.** Choose [controlled keywords](metadata-guide.md#keywords) describing the assay, such as the variant library creation method. They feed the score set's [assay facts](../reference/assay-facts.md).

Saving the experiment also creates its experiment set.

## Creating a score set

1. **Experiment & context.** Choose the experiment this score set belongs to. Here you also say whether the score set [supersedes](publishing.md#superseding-a-score-set) a published one, or is a [meta-analysis](organizing-your-study.md#meta-analysis-score-sets-analyses-of-existing-scores) of existing score sets.
2. **Score set details.** Enter the free text metadata, license, publications, and contributors. Publications from the experiment are filled in for you; remove any that don't apply. Describe read filtering, the scoring model, and any extra data columns in the methods.
3. **Targets.** Say whether the variant library was built from a mutagenized construct (see [Choosing a target type](targets.md#choosing-a-target-type)), whether this is base editor data, and whether the score set has more than one target.
4. **Target details** (one step per target). Enter the target's sequence or accession and its metadata. See [Targets](targets.md).
5. **Score calibration.** Optionally add a [score calibration](../reference/score-calibrations.md). You can also add one later from the score set page. [Calibration controls](../reference/score-calibrations.md#calibration-controls) can only be added afterward, by editing the calibration once the scores are processed.
6. **Variant scores.** Upload the score CSV file, and optionally the count CSV file and column metadata files. MaveDB validates every variant against the target; see [Troubleshooting](../troubleshooting.md) if validation fails.

## After saving

The score set page shows processing status while MaveDB validates the data and [maps the variants](../mapping/forward-mapping.md) to the human reference. Check the mapping results before publishing. When everything looks right, [publish the score set](publishing.md).
