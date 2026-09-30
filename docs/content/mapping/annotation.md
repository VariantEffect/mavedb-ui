# Annotation

Once a variant has been [mapped](../reference/variant-mapping.md) and its other molecular levels [derived](reverse-translation.md), MaveDB annotates each representation with data from external resources. This is the final stage of the pipeline, and it is what connects a functional measurement to the wider clinical-genomics ecosystem.

This page describes annotation as a **pipeline stage** — what is annotated, and at what grain. For what a given annotation *means* and how to weigh it, see [Interpreting Annotated Variants](../interpreting-annotated-variants.md). For a per-resource description of each external source, see [External Integrations](../finding-data/external-integrations.md).

!!! info "Rolling out"
    Annotation of derived (reverse-translated) representations is still being deployed across MaveDB. Some published datasets may not yet carry the full set of annotations described here.

## Registration comes first

Before annotation, each allele is registered with the [ClinGen Allele Registry](https://reg.clinicalgenome.org/) to obtain a stable **ClinGen Allele ID** (a CA identifier for nucleotide representations, a PA identifier for protein). These identifiers are the join keys MaveDB uses to look a variant up in external resources, so registration precedes the annotations that depend on it.

## What gets annotated

MaveDB attaches three kinds of annotation:

- **Clinical significance** — classifications from [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/).
- **Population frequency** — allele frequencies from [gnomAD](https://gnomad.broadinstitute.org/).
- **Predicted consequence** — molecular consequence predictions from [Ensembl VEP](https://www.ensembl.org/info/docs/tools/vep/index.html).

Each is attached at the level the resource describes variants, almost always DNA. See [External Integrations](../finding-data/external-integrations.md) for what each resource provides and how MaveDB links to it.

## Annotation grain

Annotations are attached **per representation**, not per variant. Every allele in a variant's set, the measured one and each derived (resolved, convergent, or candidate) representation, is annotated independently.

This matters because a measured allele and its derived siblings are distinct molecular descriptions, so they can carry **different** annotations. When that happens, MaveDB keeps them per-level rather than merging them into one. Which annotation to prioritize in that situation is an interpretation question. For more details on interpreting annotations across representations, see [Interpreting Annotated Variants](../interpreting-annotated-variants.md#annotations-across-representations).

## When annotation runs

Annotation runs automatically after mapping and reverse translation, once a score set's alleles have been registered with ClinGen. When a score set is re-mapped, its annotations are refreshed against the new representations.

## See also

- [Interpreting Annotated Variants](../interpreting-annotated-variants.md) — what annotations mean and how to weigh divergence
- [External Integrations](../finding-data/external-integrations.md) — per-resource detail for ClinVar, gnomAD, VEP, and ClinGen
- [Reverse Translation & Projection](reverse-translation.md) — produces the representations that get annotated
