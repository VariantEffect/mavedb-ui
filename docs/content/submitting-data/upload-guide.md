# Upload Guide

Creating a complete entry in MaveDB requires several pieces of data and metadata. This guide walks you through the process of depositing a study, from creating your first experiment to publishing the finished dataset.

For more information on how a dataset in MaveDB is structured, including descriptions of experiment sets, experiments, and score sets, see the [Key Concepts](../getting-started/key-concepts.md) page.

## Data upload wizard

MaveDB provides a step-by-step data upload wizard to guide you through the process of depositing your data. To begin the upload process, log in to MaveDB and select either the **New experiment** or **New score set** option in the toolbar at the top of the page.

## Uploading an experiment

[Experiments](../getting-started/key-concepts.md#experiments) describe the experimental procedure for a MAVE, from library construction through sequencing ([example](https://www.mavedb.org/#/experiments/urn:mavedb:00000003-a/)).

Publications that perform more than one functional assay should be represented as multiple experiments organized under a single experiment set, and each functional assay should be described in its own experiment record. This still applies to experimental designs where the differences between assays were relatively minor, such as varying the temperature or the concentration of a small molecule.

Replicate assays should not be reported as separate experiments. Instead, the number and nature of the replicates should be clearly stated in the experiment's methods section.

### What is required to upload an experiment?

#### Required metadata

For each experiment, you are required to provide the following metadata:

- [Free text metadata](metadata-guide.md#free-text-metadata), including a title, short description, abstract, and methods.

#### Recommended metadata

You are not required to provide all optional metadata fields, but we strongly encourage you to do so to maximize the usability of your data:

- [Digital Object Identifiers (DOIs)](metadata-guide.md#digital-object-identifiers-dois) for any digital resources associated with the dataset.
- [Publication details](metadata-guide.md#publication-details) for the study reference(s) and any related publications.
- [Raw data accessions](metadata-guide.md#raw-data-accessions) for any raw sequencing data associated with the experiment.
- [Keywords](metadata-guide.md#keywords) to improve searchability and facilitate generation of [assay facts](../reference/assay-facts.md) summaries.

## Uploading a score set

[Score sets](../getting-started/key-concepts.md#score-sets) describe how scores were calculated from the raw data in their parent experiment, and are the primary way users interact with data in MaveDB ([example](https://www.mavedb.org/#/score-sets/urn:mavedb:00000003-a-1/)). All score sets must be associated with an existing experiment.

Use multiple score sets when distinct methods were used to calculate scores from the same experiment (e.g., abundance vs. activity scores). For imputed or normalized results, upload the raw scores as a normal score set and use a [meta-analysis score set](../getting-started/key-concepts.md#meta-analysis-score-sets) for the derived results.

### What is required to upload a score set?

#### Required metadata

For each score set, you are required to provide the following metadata:

- [Free text metadata](metadata-guide.md#free-text-metadata), including a title, short description, abstract, and methods.

For score sets, you are additionally required to provide:

- [Targets](targets.md) associated with the score set, including their sequences or accessions and any related metadata.
- [License](metadata-guide.md#licenses) and data usage guidelines (if needed) for the score set.
- [Score table](data-formats.md) containing the variant scores.

#### Recommended metadata

You are encouraged to also provide:

- [Digital Object Identifiers (DOIs)](metadata-guide.md#digital-object-identifiers-dois) for any digital resources associated with the dataset.
- [Publication details](metadata-guide.md#publication-details) for the study reference(s) and any related publications.
- [Calibrations](../reference/score-calibrations.md) to provide additional context for interpreting the scores.
- [Count table](data-formats.md) containing the variant counts (if available).
- [Column metadata files](data-formats.md#metadata-files) containing additional information about the score and count table columns.

## Publishing your data

When first created, records are assigned [temporary accession numbers](../reference/accession-numbers.md) and are only visible to the uploader and [contributors](metadata-guide.md#contributors). When the record is ready to be made public, click the **publish** button to publish it.

For full details on the publishing process — including what fields become un-editable, data licensing, and how to deprecate a score set if errors are discovered — see the [Publishing](publishing.md) page.

## See also

- [Before You Start](before-you-start.md) -- A checklist of everything you need before beginning the upload process.
- [Publishing](publishing.md) -- Details on making records public, licensing, and deprecating score sets.
- [Variant Mapping](../reference/variant-mapping.md) -- How MaveDB maps your uploaded variants to genomic coordinates after upload.
- [Score Calibrations](../reference/score-calibrations.md) -- How to add calibration data to provide interpretive context for scores.
