# Organizing Your Study

Before you upload, decide how your study maps onto MaveDB's records: [experiment sets, experiments, and score sets](../getting-started/key-concepts.md#data-model-overview). This page gives the rules for each.

## Experiment sets: one per target

An experiment set should contain data for a single target. Group the experiments a publication performed on that target into one set. A publication that studied several targets needs one experiment set per target.

You don't create experiment sets directly. MaveDB creates one when you save its first experiment. To add another experiment to an existing set, use the **Add an experiment** button on the experiment set page.

## Experiments: one per functional assay

Describe each functional assay in its own experiment, even when assays differ only slightly, such as in temperature or the concentration of a small molecule.

An experiment covers everything up to and including sequencing: library construction, the assay, and the sequencing strategy. Read filtering, counting, and scoring belong in the score set.

Do not create separate experiments for replicates. State the number and nature of the replicates in the experiment's methods.

## Score sets: one per scoring method

Create one score set for each distinct method used to calculate scores from the experiment's raw data. Common examples are abundance-based and activity-based scores from the same experiment, or rescoring the raw data with an updated method.

To add a score set to an existing experiment, choose the experiment in the first step of the score set form.

## Meta-analysis score sets: analyses of existing scores

When an analysis starts from existing score sets rather than raw data, upload it as a [meta-analysis score set](../getting-started/key-concepts.md#meta-analysis-score-sets), linked to the score sets it uses. Typical cases are:

- Combining scores across several experiments.
- Imputing or normalizing existing scores.
- Re-scoring existing score sets with an updated model.

For imputed or normalized results, upload a rawer form of the scores (e.g., enrichment ratios) as a regular score set first, then the derived scores as a meta-analysis. The original scores stay available for people who want to apply their own methods or whose models are sensitive to normalization.

## Example

The *BRCA1* study [urn:mavedb:00000003](https://www.mavedb.org/#/experiment-sets/urn:mavedb:00000003/) tested one variant library in two assays, yeast complementation and phage display. It is one experiment set (one target) with two experiments (two assays), and each experiment has two score sets (two scoring methods).

<figure markdown="span">
  ![Data model diagram](../images/brca1_mavedb_cartoon.svg)
  <figcaption>The <i>BRCA1</i> experiment set, with two experiments and four score sets.</figcaption>
</figure>

## See also

- [Key Concepts](../getting-started/key-concepts.md) -- Definitions of each record type.
- [Submitting a Dataset](submitting-a-dataset.md) -- What to have ready and how to fill in each form.
