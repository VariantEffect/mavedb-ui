---
title: "Annotating a variant once, across every score set that measured it"
slug: mavedb-vrs-cross-score-set-harmonization
summary: "Because every MAVE variant carries a VRS digest, the same change measured in independent experiments collapses to one record — annotated once, with a built-in path to link out to the wider variant ecosystem."
products:
  - name: VRS
    version: "2.0"
pattern: cross-source-variant-harmonization
implementer: MaveDB
status: pilot
contributors:
  - bencap
  - MaveDB team
last_updated: 2026-06-29
---

# Annotating a variant once, across every score set that measured it

**Why this matters**

The most valuable variants in MaveDB are the ones that were measured more than once. Different labs, using different experiments, often test the same genetic change — and historically each measurement sat in its own silo, described in its own terms, with no automatic way to tell that they were about the same thing. MaveDB now recognizes when independent experiments describe the same change and ties their results together automatically, so the variant is curated, annotated, and looked up as a single entity instead of a scatter of disconnected records. The same mechanism gives MaveDB a foundation for connecting its variants to the broader genomics ecosystem.

**At a glance**

- **Who:** MaveDB
- **GKS products used:** VRS 2.0
- **Tools:** [vrs-python](https://github.com/ga4gh/vrs-python) (`ga4gh.vrs` 2.0.0-a6), MaveDB allele store (`vrs_digest` unique constraint)
- **Status:** pilot — VRS-digest deduplication is built into MaveDB's allele model and populated as score sets are mapped onto it; the serving cutover and outward digest-based linking are in progress

---

## The story

TP53 is one of the most-studied genes in MaveDB: more than a dozen score sets, from at least six independent experiments, have measured its variants using assays as different as deep mutational scanning, yeast functional complementation, and base-editing tiling screens. Each of those groups deposited its own **target sequence** for TP53 — and because a [content-addressed VRS identity](../mavedb-mave-variants-vrs/vignette.md) is derived from the exact sequence and position, the same protein change starts life looking different in each submission.

Consider the substitution **TP53 p.Glu11Gln**. Three independent score sets each submitted it against a *different* target sequence — three distinct refget accessions (`SQ.JtEW…`, `SQ.KAxM…`, `SQ.jqmY…`). When MaveDB's mapping pipeline normalizes each one to a standard reference, all three resolve to a single post-mapped VRS allele: `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` (`NP_000537.3:p.Glu11Gln`).

That shared digest is the harmonization key. MaveDB's allele model enforces a **uniqueness constraint on the VRS digest**, so a change measured in five score sets occupies one allele record, not five. Annotation work — mapping, classification, evidence — happens against that single record and is shared by every score set that observed the variant. This deduplication is built into the allele model MaveDB is migrating its serving onto.

The same digest is also MaveDB's intended path *outward*. Today MaveDB reaches external resources — gnomAD, ClinVar, VEP — through the **ClinGen Allele ID** registered for each variant (e.g. [`PA215796`](https://mavedb.org/variants/PA215796) for this change); that works, but it depends on registering every allele with an external registry. Because a VRS digest is computed deterministically from sequence and position, any resource that adopts VRS arrives at the identical identifier for the same change with no registry or pre-registration step. Moving cross-resource matching onto the VRS digest — keeping the registered ClinGen IDs as an independent cross-check — is the forward-looking half of this pattern.

## The data

The same change, **TP53 p.Glu11Gln**, submitted by three independent score sets against three different target sequences — and the single post-mapped VRS allele all three normalize to:

| Score set | Submitted against (target `refgetAccession`) | Normalizes to |
|---|---|---|
| [`urn:mavedb:00000068-0-1`](https://mavedb.org/score-sets/urn:mavedb:00000068-0-1) | `SQ.JtEWOMSBOOCAxy6RBZNVl9NAKRb4t2iw` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |
| [`urn:mavedb:00001234-a-1`](https://mavedb.org/score-sets/urn:mavedb:00001234-a-1) | `SQ.KAxM06sYzBF6zFftFaYq9E_18wsnn7al` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |
| [`urn:mavedb:00001235-a-1`](https://mavedb.org/score-sets/urn:mavedb:00001235-a-1) | `SQ.jqmYcMMyIzEg4ZL0tSxF0nakvvGUJ-r6` | `ga4gh:VA.SnOzGzPkL6_TKrM0h38YeaTJ1AEgp2MJ` |

The single post-mapped VRS allele that all three collapse to — the record MaveDB annotates once:

???+ example "Post-mapped VRS Allele — TP53 p.Glu11Gln"
    ```json
    --8<-- "docs/vignettes/mavedb-vrs-cross-score-set-harmonization/payloads/tp53-glu11gln.postmapped.vrs.json"
    ```

## The tools used

- [**vrs-python**](https://github.com/ga4gh/vrs-python) (`ga4gh.vrs` 2.0.0-a6) — computes the deterministic, content-addressed digest that serves as the harmonization key.
- **MaveDB allele store** — a uniqueness constraint on the VRS digest guarantees one record per distinct variant, across all score sets.
- [**MaveDB API**](https://api.mavedb.org/docs) — resolves each variant to its shared allele record and serves the annotations attached to it.

## How to reuse this pattern

- [VRS 2.0 specification](https://vrs.ga4gh.org/) — how content-addressed identifiers enable registry-free matching.
- Foundational vignette: [Giving every MAVE variant a precise, computable identity with VRS](../mavedb-mave-variants-vrs/vignette.md) — where these digests come from.
- MaveDB API source: [VariantEffect/mavedb-api](https://github.com/VariantEffect/mavedb-api) — the allele model and digest-uniqueness constraint behind this harmonization.
- Related implementer: [BRCA Exchange](https://brcaexchange.org/) uses VRS digests for the same cross-source harmonization goal.

---
