# Targets

All variants in a MaveDB [score set](../getting-started/key-concepts.md) are described relative to a target. This target should describe the sequence that was mutagenized to create the variant library. MaveDB supports two types of targets: [sequence-based targets](#sequence-based-targets) and [accession-based targets](#accession-based-targets).

Each score set in MaveDB must be associated with at least one target. Certain experiments may describe variants relative to two or more distinct sequences, such as protein-protein interaction assays that measure the effects of variants in both interacting proteins. In these cases, multiple targets may be associated with a single score set.

## Sequence-based targets

Sequence-based targets in MaveDB are based on the full sequence that was mutagenized to create the variant library, which may or may not correspond to a known sequence in an external database.

You should use this type of target when the exact sequence used in the experiment is not available in an external database, or when important differences exist between the sequence used in the experiment and the corresponding sequence in an external database. Common examples include codon-optimized sequences, non-reference backgrounds, or synthetic sequences.

For datasets that target a single functional domain, only that part of the gene should be included as the target. If multiple discontinuous functional domains were included in a single experiment, the target sequence should be given with the intervening sequence so that coordinates can be mapped back to a full-length reference.

When uploading a sequence-based target to MaveDB, the uploader must provide the target sequence. If variants describing nucleotide changes are present, the target sequence must be a DNA sequence. See [Data Formats](data-formats.md#variant-columns) for details on how variants are described relative to target sequences.

!!! tip "Target sequence translation"
    If you provide a DNA target sequence with protein-level variants (`hgvs_pro`), MaveDB will automatically translate the sequence using the [standard genetic code](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi?chapter=cgencodes#SG1) for validation and mapping. Non-standard codon usage is not supported.

Targets can also be linked to accession numbers in other databases, including [UniProt](https://www.uniprot.org/), [RefSeq](https://www.ncbi.nlm.nih.gov/refseq/), and [Ensembl](https://www.ensembl.org/). If the target sequence provided to MaveDB starts partway through the linked sequence (such as an assay targeting a single functional domain), the target should have an **offset** term. The offset is the integer value that should be added to the MaveDB coordinates (which are relative to the target sequence) in order to match the coordinates in the linked sequence.

For example, the target sequence for [urn:mavedb:00000002-a-1](https://mavedb.org/#/score-sets/urn:mavedb:00000002-a-1/) is a codon-optimized version of the WW domain of YAP1. This corresponds to UniProt identifier [P46937](https://www.uniprot.org/uniprot/P46937) with offset 169, meaning that position 1 in the MaveDB score set is position 170 in the UniProt sequence.

!!! note
    If you choose to link a sequence-based target to an external accession, consider whether using an accession-based target (described below) is more appropriate.

### Sequence-based target metadata

**Target name**
:   The name of the target sequence. This name will be displayed on the score set page and across the site when referring to this target. Most users will expect this to be a gene name or a protein name.

**Functional category**
:   The functional category of the target sequence. This should be one of the following [controlled vocabulary](../reference/controlled-vocabulary.md) terms:

    - protein coding
    - regulatory
    - other noncoding

**UniProt ID and offset** (optional)
:   The [UniProt](https://www.uniprot.org/) identifier corresponding to the target sequence, if applicable.

**Ensembl ID and offset** (optional)
:   The [Ensembl](https://www.ensembl.org) identifier corresponding to the target sequence, if applicable.

**RefSeq ID and offset** (optional)
:   The [RefSeq](https://www.ncbi.nlm.nih.gov/refseq/) identifier corresponding to the target sequence, if applicable.

**Taxonomy**
:   The organism that the target sequence is derived from, if applicable. MaveDB uses the [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy) controlled vocabulary for organism names.

**Sequence type**
:   The type of sequence provided for the target. This should be one of the following controlled vocabulary terms:

    - DNA
    - amino acid

**Sequence**
:   The full sequence of the target used in the experiment. This should be provided as a plain text string containing only valid characters for the specified sequence type (DNA or amino acid).

## Accession-based targets

Accession-based targets in MaveDB are based on sequences that are fully described in an external database. If your variants were generated by editing the genome directly (e.g., using saturation genome editing) or by mutagenizing a known reference sequence without any other changes, this target type is appropriate.

!!! warning
    When you use an accession-based target, all variants in the associated score set must be described relative to the accession identifier you provide, regardless of whether there is only a single target for the assay.

    For instance, while you might describe a variant as `c.79A>T` in a sequence-based target, the same variant would need to be described as `NM_000546.6:c.79A>T` if the target is accession-based using the RefSeq ID `NM_000546.6`.

    This requirement allows users to better understand the context of the variants in your score set, especially when they are viewed from outside MaveDB.

When uploading an accession-based target to MaveDB, you may supply either a [RefSeq](https://www.ncbi.nlm.nih.gov/refseq/) or [Ensembl](https://www.ensembl.org) identifier. MaveDB will automatically retrieve the corresponding sequence and metadata from the appropriate external database. These identifiers may refer to either full chromosomes or to individual transcripts/genes.

MaveDB uses both [CDOT](https://cdot.cc) and [SeqRepo](https://github.com/biocommons/seqrepo) to retrieve and cache sequences and metadata for accession-based targets. For more information about how we use these services, see the [external integrations](../finding-data/external-integrations.md) section. After upload, MaveDB performs [variant mapping](../reference/variant-mapping.md) using the target information to link variants to genomic coordinates.

!!! info "See also"
    [Base editor score sets](data-formats.md#base-editor-data) use the same accession-based target format as other score sets. However, even though you will be providing an `hgvs_nt` column for your variants, a special `guide_sequence` column in your uploaded scores and counts files that indicates the guide sequence used for each variant will be the index column and should be unique.

### Accession-based target metadata

**Target name**
:   The name of the target sequence. This name will be displayed on the score set page and across the site when referring to this target. Most users will expect this to be a gene name or a protein name.

**Gene name or Assembly name**
:   The gene name (for transcript or gene accessions) or assembly name (for chromosome accessions) corresponding to the target sequence.

**Accession identifier**
:   The [RefSeq](https://www.ncbi.nlm.nih.gov/refseq/) or [Ensembl](https://www.ensembl.org) identifier that describes the target sequence.

**Functional category**
:   The functional category of the target sequence. This should be one of the following controlled vocabulary terms:

    - protein coding
    - regulatory
    - other noncoding

## Multi-target score sets

Some experiments may describe variants relative to two or more distinct sequences, such as protein-protein interaction assays that measure the effects of variants in both interacting proteins. In these cases, multiple targets may be associated with a single score set.

Each target should be described using either the sequence-based or accession-based target format described above. A single score set may not mix sequence-based and accession-based targets; all targets associated with a given score set must use the same target format.

When describing variants in a multi-target score set, each variant must indicate which target it is relative to. This is done by including a label for each target (e.g., "Target 1", "Target 2") and including this label in the variant notation as if it were a prefix to the variant.

For example, if a score set includes two targets labeled "TP53" and "MDM2", a variant affecting TP53 might be described as `TP53:p.R175H`, while a variant affecting MDM2 might be described as `MDM2:p.G58S`.

While optional in single-target score sets, this label is a required field in multi-target score sets to ensure that each variant can be unambiguously mapped to the correct target.

## See also

- [Data Formats](data-formats.md) -- Formatting requirements for variant columns and fully-qualified variants.
- [Upload Guide](upload-guide.md) -- Step-by-step instructions for creating score sets and specifying targets.
- [Variant Mapping](../reference/variant-mapping.md) -- How MaveDB maps target-relative variants to genomic coordinates.
- [Accession Numbers](../reference/accession-numbers.md) -- How MaveDB URNs identify experiment sets, experiments, and score sets.
