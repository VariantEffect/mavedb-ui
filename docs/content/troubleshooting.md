# Troubleshooting

This page covers common errors you may encounter when using MaveDB, along with explanations and solutions. If you don't find your issue here, reach out on [MaveDB Zulip](https://mavedb.zulipchat.com/) for help.

## Variant validation errors

Variant validation is the most common source of upload errors. MaveDB validates all variants against the [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) specification and the target sequence(s) defined in your score set. This section covers the most frequently encountered issues.

### HGVS prefix errors

Every variant must use a prefix that matches its column and is consistent across all rows in that column.

??? failure "variant column 'hgvs_nt' has inconsistent variant prefixes"
    All variants in a single column must use the same prefix. You cannot mix `c.` and `n.` variants in the same `hgvs_nt` column, for example. Pick one prefix and use it for all rows.

??? failure "is not a transcript variant. The accepted transcript variant prefixes are 'c.', 'n.'"
    The `hgvs_nt` column only accepts coding (`c.`) or non-coding (`n.`) transcript prefixes. If you have genomic variants (`g.`), they belong in the `hgvs_nt` column only when splice variants are also defined.

??? failure "is not a protein variant. The accepted protein variant prefix is 'p.'"
    The `hgvs_pro` column only accepts the `p.` prefix. If you see this error, check whether you accidentally placed nucleotide-level variants in the protein column.

??? failure "nucleotide variants must use valid genomic prefix when splice variants are present"
    When your data includes an `hgvs_splice` column, the `hgvs_nt` column must use genomic (`g.`) notation rather than transcript notation. This is because splice variants already describe the transcript-level effect.

??? failure "splice variants must use 'c.' prefix when protein variants are present"
    When your data includes an `hgvs_pro` column, splice variants must use the coding (`c.`) prefix to establish the coding frame relationship with the protein.

### Column structure errors

??? failure "score dataframe must have a 'score' column"
    Every score CSV file must contain a column named exactly `score` (lowercase). This is the primary numeric column MaveDB uses for visualizations and analysis.

??? failure "counts dataframe must not have a 'score' column"
    Count files should not contain a column named `score`. If you have a count file that includes a score column, either rename it or move it to the score file.

??? failure "dataframe does not define any variant columns"
    Your CSV must include at least one of the variant identifier columns: `hgvs_nt`, `hgvs_splice`, or `hgvs_pro`. Check that the column names are spelled correctly and in lowercase.

??? failure "dataframes with 'hgvs_splice' must also define a 'hgvs_nt' and 'hgvs_pro' column"
    When using splice variants, you must also provide both `hgvs_nt` and `hgvs_pro` columns. The splice column cannot be used alone.

??? failure "duplicate column names are not allowed (case-insensitive)"
    Column names must be unique regardless of case. For example, you cannot have both `Score` and `score` in the same file.

??? failure "column names cannot be empty or whitespace"
    Check for trailing commas in your CSV header row — these create unnamed columns. Open the file in a text editor to inspect the header.

### Variant-target mismatch errors

??? failure "target sequence mismatch for variant at row N"
    The variant at the specified row describes a change that doesn't match the target sequence. Common causes:

    - The target sequence is wrong (e.g., pasted a protein sequence when nucleotide was expected, or vice versa).
    - The variant uses 1-based positions but the sequence uses a different numbering scheme.
    - The reference base in the variant (e.g., the `A` in `c.123A>G`) doesn't match the base at that position in the target sequence.

    **Solution**: Verify that the target sequence you provided matches the sequence your variants are described relative to. For accession-based targets, confirm that the accession and version number are correct.

??? failure "invalid variant string at row N"
    The variant at the specified row is not valid MAVE-HGVS. Common causes:

    - Missing or extra parentheses in protein variants (e.g., `p.Met1Val` should be `p.Met1Val` or `p.(Met1Val)` depending on whether the effect was experimentally determined or predicted).
    - Using three-letter amino acid codes inconsistently with one-letter codes in the same file.
    - Malformed insertion, deletion, or substitution syntax.

    **Solution**: Consult the [MAVE-HGVS documentation](https://www.mavedb.org/docs/mavehgvs/index.html) and check the syntax of the flagged variant.

### Deprecated HGVS notation

??? failure "_sy is no longer supported and should be replaced by p.(=)"
    The `_sy` (synonymous) notation is deprecated. Replace all instances with `p.(=)` to indicate a protein sequence that is unchanged.

??? failure "_wt is no longer supported and should be replaced by (cgnp).="
    The `_wt` (wild-type) notation is deprecated. Replace with the appropriate equals notation for your variant type: `c.=` (coding), `n.=` (non-coding), `g.=` (genomic), or `p.(=)` (protein).

### Data quality errors

??? failure "primary variant column cannot contain null values"
    The column used as the primary variant index (typically `hgvs_nt` or `hgvs_pro`) cannot have empty cells. Every row must have a variant identifier in the index column.

??? failure "primary variant column must contain unique values"
    Each variant can only appear once in the primary index column. If you have duplicate rows, merge them or remove the duplicates before uploading.

??? failure "data column 'score' contains no data"
    The `score` column exists but is completely empty. Populate it with numeric values.

??? failure "data column has mixed string and numeric types"
    A data column (score or count) contains a mix of numbers and text. Common causes include `NA`, `NaN`, or `#DIV/0!` values from spreadsheet software. Remove or replace non-numeric values — MaveDB uses empty cells to represent missing data.

??? failure "found N null rows in the data frame"
    Your file contains rows where every column is empty. These typically appear at the end of files exported from spreadsheet software. Open the file in a text editor and remove trailing blank lines.

### Score and count file matching

??? failure "both score and count dataframes must define matching HGVS columns"
    Your score and count CSV files must use the same set of variant identifier columns. If the score file has `hgvs_nt` and `hgvs_pro`, the count file must also have both.

??? failure "both score and count dataframes must define matching variants"
    The variants (rows) in the score and count files must be identical. If a variant appears in one file but not the other, the upload will fail. Ensure both files were generated from the same variant set.

### Multi-target errors

??? failure "variant column has N unqualified variants"
    When a score set defines multiple targets, each variant must be prefixed with its target label (e.g., `target_name:c.123A>G`). This error means some variants are missing the target prefix.

??? failure "Target sequence labels cannot be empty when multiple targets are defined"
    Each target must have a unique label when defining more than one target. Add a label to each target sequence or accession.

??? failure "Target sequence labels cannot be duplicated"
    Each target in a multi-target score set must have a different label. Rename duplicates.

## Metadata errors

??? failure "This field is required and cannot be empty"
    Experiments and score sets require a **title**, **short description**, **abstract**, and **methods** section. Make sure all four fields are filled in.

??? failure "Score sets should define at least one target"
    Every score set needs at least one target — either a [sequence-based target](submitting-data/targets.md#sequence-based-targets) or an [accession-based target](submitting-data/targets.md#accession-based-targets).

??? failure "experiment URN is required unless your score set is a meta-analysis"
    Non-meta-analysis score sets must be associated with an experiment. Provide the experiment URN when creating the score set.

??? failure "Multiple primary publication identifiers are not allowed"
    You can only designate one publication as the primary publication for a record. Move additional publications to the secondary publications list.

## Identifier validation errors

??? failure "is not a valid DOI or a valid PubMed, bioRxiv, or medRxiv identifier"
    Publication identifiers must be in one of these formats:

    - **DOI**: e.g., `10.1038/s41586-024-07084-x`
    - **PubMed ID**: e.g., `12345678` (numeric, typically 8 digits)
    - **bioRxiv/medRxiv DOI**: e.g., `10.1101/2024.01.01.123456`

??? failure "is not a valid UniProt accession"
    UniProt accessions follow a specific format (e.g., `P12345` or `A0A0B4J2F0`). Check that you haven't included a version number or extra characters.

??? failure "is not a valid RefSeq accession"
    RefSeq accessions follow the pattern `NM_000001.3` (with version) or `NM_000001` (without). Make sure you're using a transcript accession (`NM_` or `NR_`), not a protein accession (`NP_`) when a transcript is expected.

## Calibration errors

??? failure "Calibrations with functional classifications must provide at least one method source publication"
    When your calibration includes functional classifications, you must provide at least one [method source](reference/score-calibrations.md#calibration-metadata) publication reference.

??? failure "Calibrations with functional classifications must provide at least one threshold source publication"
    When your calibration includes functional classifications, you must provide at least one [threshold source](reference/score-calibrations.md#calibration-metadata) publication reference.

??? failure "Calibrations with ACMG classifications must provide at least one evidence source publication"
    When your calibration includes ACMG/AMP evidence strengths, you must provide at least one [evidence source](reference/score-calibrations.md#calibration-metadata) publication reference.

??? failure "A functional range must specify either a numeric range or a class"
    Each functional classification must be defined by either a numeric score range (threshold-based) or a class name (direct assignment), but not both and not neither.

??? failure "The following classes are not defined in the calibration"
    Your [classes file](reference/score-calibrations.md#functional-classifications) contains class names that don't match any functional classification defined in the calibration. Check spelling and ensure class names match exactly.

??? failure "Some defined classes in the calibration are missing from the classes file"
    Every functional classification defined in the calibration must appear at least once in the classes file. Add any missing classes.

??? failure "The following resources do not exist in the score set"
    The variant identifiers in your calibration classes file don't match variants in the score set. Verify that you're using the correct variant URNs, `hgvs_nt`, or `hgvs_pro` values from the published score set.

## Column metadata errors

??? failure "Score column metadata key does not exist in score_columns list"
    The metadata JSON file references a column name that doesn't exist in the score CSV. Ensure the keys in your metadata file match your CSV column names exactly (case-sensitive).

??? failure "standard column cannot have metadata defined"
    You cannot add custom metadata to standard columns (`hgvs_nt`, `hgvs_splice`, `hgvs_pro`, `score`, `guide_sequence`). Remove these keys from your metadata JSON file.

??? failure "Counts column metadata provided without counts dataframe"
    You uploaded a counts metadata file but no counts CSV. Either upload the counts file or remove the counts metadata.

## Still stuck?

If your issue isn't covered here:

- **[MaveDB Zulip](https://mavedb.zulipchat.com/)** -- Ask questions and get help from the MaveDB team and community.
- **[GitHub Issues](https://github.com/VariantEffect/mavedb-api/issues)** -- Report bugs or unexpected behavior.
- **[API Documentation](https://api.mavedb.org/docs)** -- Check the interactive API docs for endpoint-specific validation requirements.
