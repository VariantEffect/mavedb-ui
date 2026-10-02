# Reverse translation & projection

[Forward mapping](../reference/variant-mapping.md) describes a variant at the level the assay measured. **Reverse translation and projection** fill in the *other* molecular levels, so that every variant can be expressed at the genomic, coding, and amino acid levels wherever the biology allows:

- **Reverse translation** works *downward*, from a measured **protein** change to the **DNA** changes that could produce it.
- **Projection** works between the coding and genomic levels, and *upward* from a measured DNA change to its **protein** consequence.

This is the stage that produces the **resolved**, **convergent**, and **candidate** representations described in [Interpreting Annotated Variants](../interpreting-annotated-variants.md). That page explains what those labels *mean*; this page explains the mechanism that produces them.

!!! info "Rolling out"
    Reverse translation and projection of protein-only variants are still being deployed across MaveDB. Some published datasets may not yet show the full set of derived representations.

## Why reverse translation is needed

Protein-level assays measure amino-acid changes, but the clinical resources MaveDB integrates with ([ClinVar, gnomAD](../finding-data/external-integrations.md), and others) describe variants at the DNA level. To connect a protein measurement to those resources, MaveDB has to work out which DNA changes could give rise to the observed amino-acid change. That backward step is reverse translation.

## From one protein change to DNA candidates

For a measured amino-acid substitution, MaveDB enumerates every single-nucleotide change to the affected codon that produces it. Because the genetic code is redundant, there is often more than one.

The enumeration is exhaustive over these codon-level changes, which is why a protein change can fan out to several DNA candidates ([worked example](../interpreting-annotated-variants.md#why-one-protein-change-can-produce-several-candidates)). Surfacing the complete set is what lets a protein-level measurement match against *any* of the DNA descriptions those changes might appear under in an external database. Collapsing to a single arbitrary spelling would assert functional data exists for a DNA variant that was never measured.

### What can and can't be reverse-translated

Reverse translation works on amino-acid **substitutions** (including changes to a stop codon) and **single-residue deletions**. Other protein-level edits — insertions, delins, frameshifts, and stop-loss changes — are not currently supported, so a protein-only measurement of one of these produces **no** coding or genomic representation.

For the changes it does handle, MaveDB casts a deliberately wide net over candidate spellings. Alongside single-nucleotide substitutions it also generates small codon-local insertion, deletion, delins candidates (indels up to three nucleotides), and length-changing candidates for premature-stop changes. The goal is to surface every DNA description a change might plausibly appear under in an external database.

### Synonymous changes

A **synonymous** (silent) change leaves the amino acid unchanged, so there is no amino-acid difference to reverse-translate in the usual sense. MaveDB still gives these a DNA representation by generating a **wild-type codon candidate** — the reference codon at that position, spelled out. For amino acids encoded by a single codon (methionine, tryptophan) that codon is unambiguous. For all others, MaveDB looks up the transcript's actual codon.

## Projection between and across levels

Once reverse translation produces DNA candidates, **projection** establishes the faithful, one-to-one relationships between representations:

- **Coding ↔ genomic.** A coding change and its genomic description refer to the same underlying edit. MaveDB keeps them paired, so each coding representation carries a known genomic partner rather than an unlinked coordinate. This pairing is what lets a coordinate partner be labeled **Resolved** rather than left as an ambiguous candidate. When a coding candidate cannot be projected onto genomic coordinates, the pair is one-sided: the coding representation stands on its own, with no genomic partner recorded.
- **DNA → protein.** A measured DNA change has exactly one protein consequence, computed by forward-translating the codon. This is always **Resolved** — there is no ambiguity in this direction.

Because a coding variant projects up to its protein consequence, and coding/genomic descriptions stay paired, MaveDB can present a coherent multi-level view of a variant even when only one level was measured. (A non-coding target has no protein consequence, so this step does not apply to it.)

## Candidates versus convergent variants

The same codon enumeration can yield either *candidates* or *convergent* variants. The difference is whether MaveDB knows which nucleotide change was actually assayed:

- When a variant is **measured at the amino acid level**, the underlying DNA change is unknown, so every enumerated spelling is equally uncertain. Each is a **candidate**.
- When a variant is **measured at the nucleotide level**, that exact change is known. Its coordinate partner and protein consequence are **resolved**, and the *other* nucleotide changes that encode the same protein consequence become **convergent** variants — distinct, precise variants that converge on the same amino-acid change but are not the one assayed.

So a candidate reflects *uncertainty about a single measurement*, whereas a convergent variant is *a different, real variant* that happens to share a protein consequence.

## Transcript selection

Reverse translation places a protein change onto a coding transcript. MaveDB chooses that transcript to stay consistent with forward mapping:

1. Where forward mapping already selected a coding transcript for the variant, reverse translation uses that **same transcript**, so the derived coordinates line up with the mapped ones.
2. For a protein-only measurement with no coding mapping, MaveDB resolves the protein accession (`NP_`/`XP_`) to a coding transcript through UTA, preferring `NM_` over `XM_` over `ENST`, then the highest version.

If no transcript can be resolved, the variant is not reverse-translated.

## Reference data and reproducibility

Reverse translation runs on the transcript chosen during [mapping](../reference/variant-mapping.md) and against a pinned transcript-database (UTA) snapshot, used for transcript resolution and codon lookups. If that reference data changes, some candidates can change. All coordinates are relative to the **GRCh38** assembly.

## See also

- [Interpreting Annotated Variants](../interpreting-annotated-variants.md) — what Measured, Resolved, Convergent, and Candidate mean
- [Variant mapping](../reference/variant-mapping.md) — the forward mapping that precedes this stage
- [External Integrations](../finding-data/external-integrations.md) — the DNA-level resources candidates are matched against
