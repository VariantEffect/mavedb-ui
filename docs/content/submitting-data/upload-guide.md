# Upload Guide

Creating a complete entry in MaveDB requires several pieces of data and metadata. This guide walks you through the process of depositing a study, from creating your first experiment to publishing the finished dataset.

For more information on how a dataset in MaveDB is structured, including descriptions of experiment sets, experiments, and score sets, see the [Key Concepts](../getting-started/key-concepts.md) page.

## Data upload wizard

Experiments and score sets each have their own step-by-step form. To start one, log in to MaveDB, open the **Add Dataset** menu in the navigation bar, and choose **New Experiment** or **New Score Set**. Before you start, gather the fields in the [Before You Start](before-you-start.md#what-you-will-need) checklist.

## Uploading an experiment

[Experiments](../getting-started/key-concepts.md#experiments) describe the experimental procedure for a MAVE, from library construction through sequencing ([example](https://www.mavedb.org/#/experiments/urn:mavedb:00000003-a/)).

Describe each functional assay in its own experiment, and report replicates in the methods rather than as separate experiments. See [Key Concepts](../getting-started/key-concepts.md#experiments) for how to split a study into experiment sets and experiments.

### Experiment form steps

1. **Experiment information** -- the free-text metadata, publications, DOIs, raw data accessions, and contributors. See the [Metadata Guide](metadata-guide.md) for each field.
2. **Keywords** -- optional [controlled keywords](metadata-guide.md#keywords) describing the assay.

## Uploading a score set

[Score sets](../getting-started/key-concepts.md#score-sets) describe how scores were calculated from the raw data in their parent experiment, and are the primary way users interact with data in MaveDB ([example](https://www.mavedb.org/#/score-sets/urn:mavedb:00000003-a-1/)). All score sets must be associated with an existing experiment.

See [Key Concepts](../getting-started/key-concepts.md#score-sets) for when to use several score sets, or a meta-analysis score set, for one experiment.

### Score set form steps

1. **Experiment & context** -- choose the parent experiment, and say whether this score set [supersedes](publishing.md#superseding-a-score-set) a published one or is a meta-analysis.
2. **Score set details** -- the free-text metadata, license, publications, and contributors. See the [Metadata Guide](metadata-guide.md).
3. **Targets** -- whether the variant library was built from a mutagenized construct, whether this is base editor data, and how many targets the score set has. See [Choosing a target type](targets.md#choosing-a-target-type).
4. **Target** (one step per target) -- the sequence or accession and its metadata. See [Targets](targets.md).
5. **Score calibration** -- an optional [score calibration](../reference/score-calibrations.md).
6. **Variant scores** -- the score CSV file and optional count CSV and column metadata files. See [Data Formats](data-formats.md).

## Publishing your data

When first created, records are assigned [temporary accession numbers](../reference/accession-numbers.md) and are only visible to the uploader and [contributors](metadata-guide.md#contributors). When the record is ready to be made public, click **Publish** on the score set page.

For full details on the publishing process — including what fields become un-editable, data licensing, and how to supersede a score set if errors are discovered — see the [Publishing](publishing.md) page.

## See also

- [Before You Start](before-you-start.md) -- A checklist of everything you need before beginning the upload process.
- [Publishing](publishing.md) -- Details on making records public, licensing, and superseding score sets.
- [Variant Mapping](../mapping/forward-mapping.md) -- How MaveDB maps your uploaded variants to genomic coordinates after upload.
- [Score Calibrations](../reference/score-calibrations.md) -- How to add calibration data to provide interpretive context for scores.
