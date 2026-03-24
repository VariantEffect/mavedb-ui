# Metadata Guide

MaveDB [experiment and score set](../getting-started/key-concepts.md) records include required and optional metadata fields to describe the data being deposited. This page describes these metadata fields in detail, along with formatting guidelines and a checklist of required information.

## Shared metadata fields

The following metadata fields are shared between experiments and score sets.

### Free text metadata

Experiments and score sets both have descriptive free text fields: **title**, **short description**, **abstract**, and **methods**.

!!! note
    These four fields are required when uploading an experiment or score set.

While the title and short description are plain text, the abstract and methods support [Markdown](https://daringfireball.net/projects/markdown/) formatting with embedded equations using [MathML](https://www.w3.org/Math/), converted using [Pandoc](https://pandoc.org/).

**Title**
:   The title of the experiment or score set, to be displayed at the top of the record page.

**Short description**
:   The short description is displayed in the search results table. It should summarize the entry at a high level in one or two sentences.

**Abstract**
:   The abstract should describe the motivation and approach for the dataset. The entry describes the MAVE data rather than a full study, so the abstract should not be copied from the related publication. Instead, focus on what the MAVE data covers — the target, the assay, and the scope of variants — and use your judgement when deciding what additional details are most relevant.

    !!! note
        It is common that experiments and score sets share the same abstract text if they are from the same study.

**Methods**
:   The methods section should describe the approach in a condensed form, suitable for a specialist audience of MAVE researchers. The recommended content for the methods section differs between experiments and score sets, as described below.

    For an **experiment**, the methods section should include:

    - Variant library construction methods
    - Description of the functional assay, including model system and selection type
    - Sequencing strategy and sequencing technology
    - Structure of biological or technical replicates (if applicable)

    For a **score set**, the methods section should include:

    - Sequence read filtering approach
    - Description of the statistical model for converting counts to scores, including normalization
    - Description of additional data columns included in the score or count tables, including column naming conventions
    - Details of how replicates were combined (if applicable)

    For a **meta-analysis score set**, the methods section should include:

    - Description of the statistical model for converting the linked scores or counts into the scores presented
    - Description of additional data columns included in the score or count tables, including column naming conventions

### Digital Object Identifiers (DOIs)

You may include a list of [DOIs](https://www.doi.org/) for any digital resources associated with the experiment or score set. You might use this field to link to datasets stored in other repositories, code repositories containing analysis pipelines, etc.

!!! warning
    DOIs for publications should not be provided here; instead, they should be included in the [publication details](#publication-details) section.

### Publication details

Publications can be included by entering their [PubMed ID](https://pubmed.ncbi.nlm.nih.gov/), [bioRxiv ID](https://www.biorxiv.org/), [medRxiv ID](https://www.medrxiv.org/), or [DOI](https://www.doi.org/) and they will appear as formatted references.

You will also have the option to indicate a primary publication for the experiment or score set. This publication will be more prominently displayed and should describe the research contribution to which this experiment or score set is most closely related.

!!! note
    When creating a score set through the web interface, publications from the parent experiment are automatically populated in the score set form. These can be removed if they are not relevant to the specific score set. The API does not auto-populate experiment publications.

### Contributors

When a record in MaveDB is created and assigned a [temporary accession number](../reference/accession-numbers.md#temporary-accession-numbers), it is only accessible to the **owner** (the user who created the record).

The owner can add additional users to the record by editing the record and specifying that user's [ORCID iD](https://orcid.org/) in the Contributors field. The prospective contributor must have logged into MaveDB at least once, or you will be unable to add them.

!!! warning
    Contributors added to a dataset will not automatically be added as contributors to associated records. You will need to add them separately in each record form.

    For instance, contributors added to an experiment will not automatically be added as contributors to associated score sets, nor will contributors added to a score set be added to the associated experiment.

Contributors have the same permissions on the dataset as the owner, with the exception that users added to a record as contributors will not be able to delete the record. This permission is reserved for the record owner and MaveDB administrators only.

### Optional structured metadata

Datasets also support the inclusion of optional [JSON](https://www.json.org/)-formatted metadata. This field is intended for machine-readable information that doesn't fit into other metadata fields — for example, experimental parameters like drug concentrations or selection timepoints, mappings between data column names and experimental conditions, or quality control thresholds used during analysis.

If optional metadata is included, the uploader should describe it in the score set methods.

## Experiment-specific metadata

In addition to the shared metadata fields described above, experiments also support the following specific metadata fields.

### Raw data accessions

Experimenters are encouraged to deposit their raw sequence data in a public repository and link it to the relevant experiment record(s).

MaveDB currently supports accession numbers for:

- [ArrayExpress](https://www.ebi.ac.uk/arrayexpress/)
- [BioProject](https://www.ncbi.nlm.nih.gov/bioproject/)
- [Gene Expression Omnibus](https://www.ncbi.nlm.nih.gov/geo/)
- [Sequence Read Archive](https://www.ncbi.nlm.nih.gov/sra)

Raw data that is stored elsewhere may be included via the DOI field.

### Keywords

Experiments may be tagged with optional, controlled keywords from the [controlled vocabulary](../reference/controlled-vocabulary.md).

These keywords improve searchability of the records within MaveDB and facilitate the generation of [assay facts](../reference/assay-facts.md) summaries.

!!! note
    While keywords are optional, we strongly encourage you to include them when uploading an experiment or score set given the contextual benefits they provide.

    In a future release, providing a minimal set of controlled keywords may become a requirement for uploading new records.

## Score set-specific metadata

In addition to the shared metadata fields described above, score sets also support the following specific metadata fields.

### Licenses

When uploading score set information to the database, the user can choose one of three licenses:

- [CC0 (Public domain)](https://creativecommons.org/publicdomain/zero/1.0/)
- [CC BY 4.0 (Attribution)](https://creativecommons.org/licenses/by/4.0/)
- [CC BY-SA 4.0 (Attribution-ShareAlike)](https://creativecommons.org/licenses/by-sa/4.0/)

!!! note
    Only datasets licensed under CC0 will be included as part of the [bulk download archive](../finding-data/downloading.md#bulk-downloads-via-zenodo).

By default, new score sets will have the CC0 license. The license can be changed after publication, but previously downloaded copies of the dataset will retain the license they were downloaded under. The license is listed in the header of [downloaded CSV files](../finding-data/downloading.md) and also in the [API](../programmatic-access/api-quickstart.md).

Users also have the option of adding a free-text data usage policy to a score set, such as terms that dictate use of pre-publication data. For example, data producers may wish to assert their right to publish the results of certain analyses first. The data usage policy will be added to the header of any downloaded data files if one is present.

### Score set targets

All variants in a MaveDB score set are described relative to a target. This target should describe the sequence that was mutagenized to create the variant library. MaveDB supports two types of targets: [sequence-based targets](targets.md) and [accession-based targets](targets.md).

Each score set in MaveDB must be associated with at least one target. Certain experiments may describe variants relative to two or more distinct sequences, such as protein-protein interaction assays that measure the effects of variants in both interacting proteins. In these cases, multiple targets may be associated with a single score set.

For detailed information about target types, metadata, and multi-target score sets, see the [Targets](targets.md) page.

### Calibrations

Score calibrations provide a way to give additional context to variant effect scores by mapping them to known reference points. This helps users interpret the scores in a biologically meaningful way.

For detailed information about score calibrations, including baseline scores, functional classifications, evidence strengths, and calibration metadata, see the [Score Calibrations](../reference/score-calibrations.md) page.

### Variant data

You must upload at least one variant **score** CSV file when creating a new score set. Optionally, you may also upload a variant **count** CSV file and JSON metadata files describing the columns in each table.

Variants are described using [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) notation and are validated against the score set's [target](targets.md) sequence. The score table must include a column named `score`; count tables have no required columns.

For detailed formatting requirements — including variant column descriptions, index column selection, base editor data, and score table examples — see the [Data Formats](data-formats.md) page.

## Metadata checklist

### Required for all experiments and score sets

- [Free text metadata](#free-text-metadata), including a title, short description, abstract, and methods.

### Recommended for all experiments and score sets

- [Digital Object Identifiers (DOIs)](#digital-object-identifiers-dois) for any digital resources associated with the dataset.
- [Publication details](#publication-details) for the study reference(s) and any related publications.

### Recommended for experiments

- [Raw data accessions](#raw-data-accessions) for any raw sequencing data associated with the experiment.
- [Keywords](#keywords) to improve searchability and facilitate generation of [assay facts](../reference/assay-facts.md) summaries.

### Additionally required for score sets

- [Targets](#score-set-targets) associated with the score set, including their sequences or accessions and any related metadata.
- [License](#licenses) and data usage guidelines (if needed) for the score set.
- [Variant data](#variant-data), including a score CSV file with variant scores. See [Data Formats](data-formats.md) for detailed requirements.

### Additionally recommended for score sets

- [Calibrations](#calibrations) to provide additional context for interpreting the scores.
- Count CSV file containing the variant counts (if available). See [Data Formats](data-formats.md#count-table-columns).
- Column metadata JSON files describing score and count table columns. See [Data Formats](data-formats.md#metadata-files).

## See also

- [Before You Start](before-you-start.md) -- A checklist of everything you need before beginning the upload process.
- [Data Formats](data-formats.md) -- Detailed formatting requirements for score and count CSV files.
- [Upload Guide](upload-guide.md) -- Step-by-step instructions for creating experiments and score sets.
- [Publishing](publishing.md) -- How to make your records publicly accessible and manage licensing.
