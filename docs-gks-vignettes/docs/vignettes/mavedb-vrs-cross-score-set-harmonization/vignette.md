---
title: "Linking the same variant across multiple assays"
slug: mavedb-vrs-cross-score-set-harmonization
summary: "Assigning a VRS digest to every MAVE variant allows the same change measured in independent experiments to be linked together, annotated once, and connected to the wider variant ecosystem."
products:
  - name: VRS
    version: "2.0"
pattern: cross-source-variant-harmonization
implementer: MaveDB
status: pilot
contributors:
  - bencap
  - afrubin
  - MaveDB team
last_updated: 2026-08-03
---

# Linking the same variant across multiple assays

Some of the most interesting variants in MaveDB are the ones that were measured more than once.
Different labs may test the same genetic change with different assays, but due to technical differences in assay design it can be challenging to identify these cases.
MaveDB now recognizes when independent experiments describe the same change and ties their results together automatically, so the variant can be identified and annotated as a single entity instead of as multiple disconnected records.
The same mechanism gives MaveDB a foundation for connecting its variants to the broader genomics ecosystem.

- **Who:** MaveDB
- **GKS products used:** VRS 2.0
- **Tools:** [`vrs-python`](https://github.com/ga4gh/vrs-python) (v2.0.0-a6), MaveDB allele store (`vrs_digest` unique constraint)
- **Status:** pilot — VRS-digest deduplication is built into MaveDB's allele model and populated as score sets are mapped onto it; cutover and outward digest-based linking are in progress

## Motivation

TP53 is one of the most well-studied genes in MaveDB.
More than a dozen score sets, from at least six independent experiments, have measured its variants using diverse methods including deep mutational scanning, yeast functional complementation, and base-editing tiling screens.
Each research study used its own **target sequence** for TP53, and because a [content-addressed VRS identity](../mavedb-mave-variants-vrs/vignette.md) is derived from the exact sequence and position, the same protein change looks different in each submission.

Consider the substitution **TP53:p.Glu11Gln**.
Three independent score sets each submitted it against a *different* target sequence, each with its own distinct refget accession (`SQ.JtEW…`, `SQ.KAxM…`, `SQ.jqmY…`).
When MaveDB's mapping pipeline normalizes each one to a standard reference, all three resolve to a single post-mapped VRS allele based on a [MANE Select](https://www.ncbi.nlm.nih.gov/refseq/MANE/) transcript: `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` (`NP_000537.3:p.Glu11Gln`).

That shared digest (`ga4gh:VA.SnOz...`) is the harmonization key.
MaveDB's allele model enforces a **uniqueness constraint on the VRS digest**, so a change measured in five score sets occupies one allele record, not five.
Annotation work (e.g., mapping, classification, evidence assignment) happens against that single record and is shared by every score set that observed the variant.
This deduplication is built into the allele model MaveDB is adopting.

The same digest is also MaveDB's intended path *outward*.
Today MaveDB reaches external resources (e.g., gnomAD, ClinVar, VEP) through the **ClinGen Allele ID** registered for each variant ([`PA215796`](https://mavedb.org/variants/PA215796) for this change).
This works, but it depends on registering every allele with an external registry.
However, because a VRS digest is computed deterministically from sequence and position, any resource that adopts VRS arrives at the identical identifier for the same change with no registry or pre-registration step.
Moving forward, we intend to move cross-resource matching onto the VRS digest and keep the registered ClinGen IDs as an independent cross-check.

## Example data

The same change, **TP53:p.Glu11Gln** was submitted as part of three independent score sets each using a different target sequence.
Using VRS, we can normalize these all to the same digest.

| Score set | Submitted against (target `refgetAccession`) | Normalizes to |
|---|---|---|
| [`urn:mavedb:00000068-0-1`](https://mavedb.org/score-sets/urn:mavedb:00000068-0-1) | `SQ.JtEWOMSBOOCAxy6RBZNVl9NAKRb4t2iw` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |
| [`urn:mavedb:00001234-a-1`](https://mavedb.org/score-sets/urn:mavedb:00001234-a-1) | `SQ.KAxM06sYzBF6zFftFaYq9E_18wsnn7al` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |
| [`urn:mavedb:00001235-a-1`](https://mavedb.org/score-sets/urn:mavedb:00001235-a-1) | `SQ.jqmYcMMyIzEg4ZL0tSxF0nakvvGUJ-r6` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |

This single post-mapped VRS allele is annotated by MaveDB once:

???+ example "Post-mapped VRS Allele — TP53:p.Glu11Gln"
    ```json
    --8<-- "docs/vignettes/mavedb-vrs-cross-score-set-harmonization/payloads/tp53-glu11gln.postmapped.vrs.json"
    ```

## Tools

- [**`vrs-python`**](https://github.com/ga4gh/vrs-python) (v2.0.0-a6) — computes the deterministic, content-addressed digest that serves as the harmonization key
- **MaveDB allele store** — applies a uniqueness constraint on the VRS digest that guarantees one record per distinct variant, across all score sets
- [**MaveDB API**](https://api.mavedb.org/docs) — resolves each variant to its shared allele record and serves the annotations attached to it

## Reusing this pattern

- [VRS 2.0 specification](https://vrs.ga4gh.org/) — how content-addressed identifiers enable registry-free matching
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — where these digests come from
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — the allele model and digest-uniqueness constraint behind this harmonization
- Related implementer: [BRCA Exchange](https://brcaexchange.org/) uses VRS digests for the same cross-source harmonization goal
