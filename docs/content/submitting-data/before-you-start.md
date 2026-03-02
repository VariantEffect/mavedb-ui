# Before You Start

This page describes what you need to prepare before depositing data into MaveDB. Having these items ready before you begin will make the upload process faster and smoother.

## Prerequisites

Before you can submit data to MaveDB, you must:

1. **Have an ORCID account.** MaveDB uses [ORCID](https://orcid.org/) for authentication. If you do not have an ORCID iD, you can [register for free](https://orcid.org/register). See [User Accounts](../getting-started/accounts.md) for more details.

2. **Set an email address.** MaveDB requires an email address to upload datasets. You can provide one on the [Profile settings page](https://www.mavedb.org/#/settings/) after logging in. See [User Accounts](../getting-started/accounts.md#setting-an-email-address) for instructions.

3. **Understand the record types.** MaveDB organizes data into experiment sets, experiments, and score sets. Review the [Key Concepts](../getting-started/key-concepts.md) page to understand how these relate to each other and when to create multiples of each.

!!! danger
    **Do not submit patient data or anything that could be used to identify individuals to MaveDB.**

## Submission workflow overview

The typical workflow for depositing a study in MaveDB is:

```mermaid
graph LR
    A["Create<br/>experiment"] --> B["Create<br/>score set"]
    B --> C["Review &<br/>publish"]

    style A fill:#4a90d9,color:#fff
    style B fill:#4a90d9,color:#fff
    style C fill:#7ab648,color:#fff
```

1. **Create an experiment** -- Describe the MAVE assay, including library construction, functional assay, and sequencing strategy. This automatically creates an experiment set.
2. **Create a score set** -- Define the score set's target, analysis methods, and upload your data in a single form submission. This includes:
      - Associating the score set with the experiment you created.
      - Specifying the [target](targets.md) sequence or accession that was mutagenized.
      - Uploading your variant score CSV file (required) and count CSV file (recommended). See [Data Formats](data-formats.md) for file specifications.
3. **Review and publish** -- Review your submission for completeness, then [publish](publishing.md) to make it publicly accessible.

!!! note
    When you first create records, they are assigned [temporary accession numbers](../reference/accession-numbers.md#temporary-accession-numbers) (beginning with `tmp:`) and are only visible to you and any [contributors](metadata-guide.md#contributors) you add. You can continue editing until you are ready to publish.

!!! warning
    Once a record is published, certain fields (including the target, scores, and counts) become un-editable. Make sure everything is correct before publishing. If you need to fix errors after publication, you can [deprecate and replace](publishing.md) the score set.

## What you will need

Use the checklist below to gather everything before starting the upload process.

### Required for all records

- [ ] **Title** -- A descriptive title for the experiment or score set.
- [ ] **Short description** -- One or two sentences summarizing the record.
- [ ] **Abstract** -- A longer description of the motivation and approach. Supports [Markdown](https://daringfireball.net/projects/markdown/) formatting.
- [ ] **Methods** -- A detailed description of the experimental or analytical methods.

See the [Metadata Guide](metadata-guide.md#free-text-metadata) for formatting guidelines and recommended content for each field.

### Required for score sets

- [ ] **Score CSV file** -- A CSV file containing variant scores. Must include a `score` column and at least one variant column (`hgvs_nt` or `hgvs_pro`). See [Data Formats](data-formats.md) for detailed formatting requirements.
- [ ] **Target information** -- Either a target sequence (DNA or amino acid) or an external accession number (RefSeq or Ensembl). See [Targets](targets.md) for guidance on choosing the right target type.
- [ ] **License selection** -- Choose from CC0, CC BY 4.0, or CC BY-SA 4.0. The default is CC0. See the [Metadata Guide](metadata-guide.md#licenses) for details.

### Recommended for all records

- [ ] **Publication identifiers** -- DOIs, PubMed IDs, bioRxiv IDs, or medRxiv IDs for associated publications.
- [ ] **Digital Object Identifiers (DOIs)** -- For any non-publication digital resources (e.g., code repositories, external datasets).
- [ ] **Contributor ORCID iDs** -- ORCID identifiers for all contributors. Each contributor must have logged into MaveDB at least once. See [Contributors](metadata-guide.md#contributors) for details on permissions.

### Recommended for experiments

- [ ] **Raw data accession numbers** -- Accession numbers for raw sequencing data in public repositories such as the [Sequence Read Archive (SRA)](https://www.ncbi.nlm.nih.gov/sra) or [ArrayExpress](https://www.ebi.ac.uk/biostudies/arrayexpress).
- [ ] **Controlled keywords** -- Keywords from the [controlled vocabulary](../reference/controlled-vocabulary.md) to improve searchability and facilitate assay facts generation.

### Recommended for score sets

- [ ] **Count CSV file** -- A CSV file containing variant count data. Count data supports the development of new statistical models for calculating variant effect scores. See [Data Formats](data-formats.md#count-table-columns) for details.
- [ ] **Score calibrations** -- Calibration data that maps functional scores to clinical evidence strength, enabling clinical interpretation of variants. See [Score Calibrations](../reference/score-calibrations.md).
- [ ] **Column metadata files** -- JSON files describing the columns in your score and count tables. See [Data Formats](data-formats.md#metadata-files) for the expected format.

### Optional for score sets

- [ ] **Extra metadata** -- A JSON object containing any additional structured metadata.
- [ ] **Data usage policy** -- Free-text terms describing any restrictions on data use (e.g., pre-publication data sharing agreements).

## Next steps

Once you have gathered the required information:

1. Review the [Data Formats](data-formats.md) page to ensure your CSV files meet MaveDB's formatting requirements.
2. Review the [Metadata Guide](metadata-guide.md) for detailed descriptions of every metadata field.
3. Follow the [Upload Guide](upload-guide.md) for step-by-step instructions on creating experiments and score sets.
