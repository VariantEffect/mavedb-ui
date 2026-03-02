# Data table formats

MaveDB accepts and provides data tables in CSV format. Each row of the data table describes a single variant, and variants are described using [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) format. Each non-variant column must contain a single consistent data type (e.g., all numeric or all string values). For an overview of how data tables fit into the MaveDB data model, see [Key Concepts](../getting-started/key-concepts.md).

## Variant columns

For both score and count data tables, there are three variant columns:

- `hgvs_nt` -- describes variants with respect to the nucleotide [target sequence](targets.md)
- `hgvs_splice` -- describes variants with respect to a transcript model
- `hgvs_pro` -- describes variants with respect to the amino acid [target sequence](targets.md)

`hgvs_nt` and `hgvs_pro` variants are required to be described in relation to the score set [target](targets.md).

!!! tip
    You must supply at least one of `hgvs_nt` or `hgvs_pro` for each variant, but you can include both if you have them.

All variants must be described in [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) format, which is a subset of the [HGVS](https://varnomen.hgvs.org/) format. This includes using the appropriate prefix (`c.` for coding DNA, `n.` for non-coding DNA, `p.` for protein) and using brackets for complex variants that affect multiple positions (e.g., `c.[123A>G;125_T>C]`).

MaveDB validates submitted variants against the score set's target sequence to ensure correctness. However, intronic variants cannot be validated because the target sequence only covers the mutagenized region (typically exonic sequence). MaveDB accepts intronic variants and their scores but they are stored without validation.

!!! note
    Datasets with only `hgvs_pro` variants can specify nucleotide target sequences. The target sequence will be translated using the [standard amino acid translation table](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi?chapter=cgencodes#SG1) for validation.

The `hgvs_splice` variants are not validated against a transcript model or target sequence. This is a convenience feature for datasets that contain splice variants; most datasets will not use `hgvs_splice`. Datasets that use `hgvs_splice` must also have `hgvs_nt`, and the `hgvs_nt` variants must use the `g.` prefix.

### Index column

MaveDB uses one variant column as the **index column** (primary key) for each dataset. The index column uniquely identifies each variant in the score set — every value in this column must be unique, and it is used internally to link score and count data for the same variant.

MaveDB selects the index column automatically based on which columns are present:

1. **`hgvs_nt`** is used as the index column if present.
2. **`hgvs_pro`** is used as the index column if `hgvs_nt` is not present.
3. **`guide_sequence`** is used as the index column for [base editor datasets](#base-editor-data), replacing `hgvs_nt`.

This means that if your dataset includes both `hgvs_nt` and `hgvs_pro`, the nucleotide column determines uniqueness. Two rows may share the same `hgvs_pro` value (e.g., synonymous nucleotide variants that produce the same protein change), but each `hgvs_nt` value must be unique.

### Fully-qualified variants

"Fully-qualified variants" refer to variants submitted with complete information about their transcript or relative sequence. For [accession-based targets](targets.md#accession-based-targets), this means variants are submitted with respect to a specific RefSeq or Ensembl transcript (e.g., `NM_000546.5:c.215C>G`). When submitting accession-based targets, MaveDB requires fully-qualified variants to ensure unambiguous mapping to the target sequence.

For [sequence-based targets](targets.md#sequence-based-targets), fully-qualified variants include the full sequence context of the variant. When you are submitting variants with respect to a single sequence-based target, your variants need not be fully qualified. However, if you are submitting variants with respect to multiple sequence-based targets, MaveDB requires fully-qualified variants to ensure unambiguous mapping to the correct target sequence. You should use the target label as the prefix for the variant (e.g., `target1:c.215C>G`).

For more information on targets, see the [Targets](targets.md) section.

### Base editor data

If you are submitting data from a base editor experiment, you must also include a `guide_sequence` column in your score and/or count data table. This column should contain the guide RNA sequence used to generate each variant. For base editor datasets, `guide_sequence` replaces `hgvs_nt` as the [index column](#index-column) and must be unique.

## Score table columns

All score tables must have a column named `score` that describes the score of that variant in the assay. Score tables may have any number of additional numeric columns.

Suggested numeric columns include a standard deviation or variance, or some other measure of uncertainty for the score such as a 95% confidence interval (represented as two columns, e.g., `ci_lower` and `ci_upper`).

Score sets that describe experiments with multiple replicates often include the score and standard deviation for each replicate as additional columns.

!!! note
    MaveDB is purposefully flexible about the column names for additional data columns to support a wide range of experimental designs and data types. You can use any naming convention you like, but we recommend using consistent and descriptive names for ease of interpretation by users. Be sure to describe your column naming convention in the free-text methods and/or metadata fields when you create your score set.

### Score table examples

Here is a short excerpt from the score table for [urn:mavedb:00000003-a-1](https://mavedb.org/#/score-sets/urn:mavedb:00000003-a-1/).

This dataset uses `hgvs_nt` as the [index column](#index-column). It has several additional data columns with the scores and error estimates for multiple biological replicates.

Note that some variants do not have a score. This is permitted (and encouraged) for variants that were observed in the experiment but did not have a score calculated for them (e.g., due to low counts or missing data). These variants should be included in the score table with `NA` values for the score and any additional columns. This allows users to see the full set of variants that were observed in the experiment, even if some of them do not have scores.

| hgvs_nt | hgvs_splice | hgvs_pro | score | SE | epsilon |
|---------|-------------|----------|-------|----|---------|
| c.38T>C | NA | p.Val13Ala | -0.128 | 0.115 | 0.000 |
| c.186A>T | NA | p.Leu62Phe | -4.132 | 0.396 | 0.000 |
| c.164A>T | NA | p.Lys55Ile | -0.655 | 0.112 | 0.000 |
| c.[439C>A;441G>A;842C>A] | NA | p.[Gln147Lys;Ser281Ter] | NA | NA | NA |
| c.22_23delinsCC | NA | p.Glu8Pro | -0.375 | 0.280 | 0.000 |
| c.598G>A | NA | p.Asp200Asn | 0.271 | 0.170 | 0.000 |
| c.285C>G | NA | p.Asp95Glu | NA | NA | NA |
| c.[64G>C;142C>T] | NA | p.Glu22Gln | NA | NA | NA |
| c.869T>G | NA | p.Leu290Ter | -1.231 | 0.245 | 0.000 |
| c.200T>G | NA | p.Ile67Arg | NA | NA | NA |
| c.[1G>T;97_99delinsGGG] | NA | p.[Asp1Tyr;Pro33Gly] | NA | NA | NA |
| c.476G>T | NA | p.Gly159Val | -1.192 | 0.100 | 0.000 |

<!-- The full original table includes many more replicate columns (e.g., SE_PlusE2NewRep3, score_PlusE2NewRep3, etc.) that have been truncated here for readability. The actual dataset at the linked URN contains all columns. -->

## Count table columns

Count data are optional for MaveDB score sets, but are strongly recommended. Including count data improves reproducibility and allows others to reanalyze your data with different scoring methods.

Count tables use the same [variant columns](#variant-columns) and [index column](#index-column) as score tables. There are no required data columns beyond the variant identifiers — MaveDB is intentionally flexible to support a wide range of experimental designs.

!!! tip
    Score and count tables must share the same set of variants and the same index column, but they do not need to have the same additional columns. For example, your score table may have a `score` column and a `standard_error` column, while your count table may have `input_count_rep1`, `input_count_rep2`, `selection_count_rep1`, and `selection_count_rep2` columns.

Count tables typically include columns such as:

- **Input library counts** — the number of reads for each variant before selection.
- **Post-selection counts** — the number of reads for each variant after one or more rounds of selection.
- **Replicate counts** — separate columns for each biological or technical replicate (e.g., `input_rep1`, `selection_rep1`, `input_rep2`, `selection_rep2`).
- **Timepoint counts** — for time-course experiments, counts at each sampled timepoint.

As with score tables, uploaders should use a consistent and descriptive naming convention for columns and describe it in the free-text methods and/or column metadata fields when creating the score set.

## Metadata files

Users may also upload metadata files in JSON format to provide additional structured metadata about the columns in the score and count tables. These files are optional, but recommended, especially if you provide additional columns beyond the required `score` column. Providing metadata about your columns improves the interpretability and reusability of your data by other users, and providing them in this structured format makes it much easier to parse and use programmatically than including this information in free-text fields.

The metadata files should contain a JSON object where each key is a column name from the corresponding data table, and the value is another JSON object with additional metadata about that column. The additional JSON object may contain the following fields:

- `description` -- A string describing the column.
- `details` -- A string with additional details about the contents of the column (optional).

## See also

- [Targets](targets.md) -- How to define sequence-based and accession-based targets for your score set.
- [Upload Guide](upload-guide.md) -- Step-by-step instructions for creating experiments and score sets.
- [Metadata Guide](metadata-guide.md) -- Detailed descriptions of all metadata fields, including free-text methods where you should describe your column naming conventions.
- [Downloading Data](../finding-data/downloading.md) -- How users can download the data you upload, including CSV and VRS formats.
- [Variant Mapping](../reference/variant-mapping.md) -- How MaveDB maps your uploaded variants to genomic coordinates.
