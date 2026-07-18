# Interpreting annotated variants

When you upload a variant to MaveDB, it is described relative to the experiment's own target sequence. Before that variant can be searched, compared to clinical databases, or interpreted in a clinical context, MaveDB does two things to it:

1. **Maps** it onto standard human reference coordinates (GRCh38), and
2. **Annotates** it with data from external resources — clinical significance (ClinVar), population frequency (gnomAD), and predicted consequences (Ensembl VEP).

The result is an **annotated variant**: the original measurement, expressed across molecular levels and enriched with external evidence. This page explains what each element of an
annotated variant represents and how they can be interpreted.

!!! info "Rolling out"
    These multi-level representations are still being deployed across MaveDB. Some published datasets may not yet have a full derived variant data set as described below.

## One variant, several representations

A variant can be described at three molecular levels:

- **Genomic** (`g.`) — position on the chromosome.
- **Coding** (`c.`) — position within a transcript's coding sequence.
- **Protein** (`p.`) — the amino-acid change.

MaveDB shows a variant at whichever of these levels apply. The important point is that **these levels are not all equally direct.** An assay measures a variant at one of these levels. We must *derive* all other levels from that measurement. How faithfully a level can be derived and interpreted depends on the underlying biology, which the labels below seek to capture.

## Measured, resolved, convergent, and candidate

Every representation of an annotated variant carries one of four labels describing how it relates to the variant the assay explicitly measured:

| Label | What it means | How much to trust it |
|---|---|---|
| **Measured** | The level at which the variant was assayed. This is the observed experimental result. | Highest — this is the evidence itself. |
| **Resolved** | The measured change expressed at another coordinate level: its exact coordinate partner across the coding and genomic levels, or the single protein consequence of a measured DNA change. Deterministic and precise. | High — one measured change maps to exactly one resolved representation, with no guesswork. |
| **Convergent** | A *distinct*, real nucleotide change that produces the *same* protein change as the measured variant — a separate variant that converges on the same consequence, not the one assayed here. | Moderate — a precise variant, but a different one from what was measured. |
| **Candidate** | One of *several possible* nucleotide spellings behind a protein-level measurement, when the DNA change that was actually assayed is unknown. | Interpret with care — MaveDB surfaces all of them and privileges none. |

These four labels form a confidence ladder. **Measured** is the experimental result itself; **Resolved** is a faithful, one-to-one translation of it to another coordinate level. **Convergent** and **Candidate** are both *other* nucleotide changes that share the measured protein change — the difference is precision: a **convergent** variant is a distinct, real change that happens to encode the same amino acid, whereas a **candidate** is one of several possible spellings of a protein-level measurement whose true DNA change is unknown.

## Why one protein change can produce several candidates

Assays that measure variants at the **protein level** create ambiguity when their variants are expressed at the nucleotide level. Because the genetic code is redundant, a single amino-acid change can be spelled by more than one nucleotide change. The assay does not observe which one occurred.

!!! example "A protein change fanning out to candidates"
    Suppose an assay measured the protein change **p.Glu23Asp** (glutamate → aspartate).

    Glutamate is encoded by `GAA` or `GAG`; aspartate by `GAT` or `GAC`. If the coding sequence uses `GAA` at this position (`c.67_69`), aspartate can be reached by **two different single-nucleotide changes**:

    - **c.69A>T** → `GAT` (Asp)
    - **c.69A>C** → `GAC` (Asp)

    Both produce exactly the observed protein change, and nothing in a protein-level measurement tells you which one the underlying DNA carried. MaveDB therefore surfaces **both** as *candidates*.

MaveDB shows the full set for a reason: most clinically relevant external databases serve annotations at the DNA level. Surfacing the complete candidate set allows us to link a protein level variant to all possible clinically relevant annotations.

### Not everything can be reverse-translated

Not every protein change can be reverse-translated. Simple **substitutions** (and single-residue deletions) can be; more complex edits — insertions, delins, and frameshifts — cannot, so a protein-only measurement of one of these shows **no** derived coding or genomic variants.

For the mechanism behind candidate generation — codon enumeration, synonymous handling, transcript selection, and the intronic/exon-spanning flags — see [Reverse Translation & Projection](mapping/reverse-translation.md).

## Where you will (and won't) see candidates

*Where* you look changes *what* you see:

- **Detail surfaces** — the MaveMD [variant page](mavemd/variant-page.md) and the score set detail panel — show the full set of representations, each with its Measured / Resolved / Convergent / Candidate label.
- **Overview surfaces** — search results and the score set table — show only the primary representation. For a protein-only assay, the coding and genomic slots may simply be **empty** rather than showing a candidate. MaveDB does not fabricate a single DNA coordinate where only an ambiguous set exists.

So a variant that appears to have no coding or genomic coordinate in a search result may still have a full set of candidates on its detail page.

## Annotations across representations

External annotations (ClinVar, gnomAD, Ensembl VEP) attach at the level where those resources describe variants — almost always DNA. Because a measured level and its derived siblings are different molecular descriptions, they can occasionally carry **different** annotations. When that happens, MaveDB shows them per-level rather than merging them.

When annotations diverge, weigh the annotation on the **measured** level most heavily — it describes the variant that was actually assayed. A sibling representation's annotation is supporting context, not the primary signal.

How annotations are attached, and how divergence is handled, is covered in [Annotation](mapping/annotation.md); for what each external resource provides, see [External Integrations](finding-data/external-integrations.md).

## Identifiers

MaveDB variants carry ClinGen Allele identifiers, which act as stable cross-references to other clinical genomics resources. The identifier tracks the **level of the representation**, not the level that was measured:

- **Nucleotide** representations (genomic and coding) carry a **canonical-allele (CA)** identifier.
- **Protein** representations carry a **protein-allele (PA)** identifier.

Because every variant is projected up to its protein consequence, an annotated variant typically has a **PA identifier for its protein level and CA identifiers for its nucleotide representations — regardless of the level at which it was originally measured.** A variant measured at the nucleotide level still projects up to a protein representation with its own PA identifier; a protein-only measurement still receives a CA identifier for each of its nucleotide candidates.

## In short

- A variant is shown across genomic, coding, and protein levels. It can only be **measured** at one level. All other levels are derived.
- A **resolved** representation is a faithful one-to-one derivation of the measured change. A **convergent** variant is a distinct real change that produces the same protein consequence. A **candidate** is one of several possible spellings of a protein measurement, and is never treated as canonical.
- A protein-only assay can fan out to several DNA candidates — or, for edits that can't be reverse-translated, to none.
- Trust in order: **measured**, then **resolved**, then **convergent**, then **candidate**.
- Detail pages show the full picture; overview and search surfaces may be limited to only the primary representation.

## See also

- [Variant page](mavemd/variant-page.md) — reading these representations on the MaveMD clinical interface
- [Variant mapping](reference/variant-mapping.md) — how variants are mapped to reference coordinates
- [External Integrations](finding-data/external-integrations.md) — the ClinVar, gnomAD, and ClinGen resources behind annotations
- [Data Formats](submitting-data/data-formats.md) — how variants are described on upload
