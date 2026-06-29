# MaveDB × GA4GH GKS Vignettes

Real-world walk-throughs of how **MaveDB** uses the GA4GH **Genomic Knowledge Standards** to solve core problems in sharing multiplexed assay of variant effect (MAVE) data.

These are drafted for contribution to the [GA4GH GKS Starter Kit](https://github.com/ga4gh/gks-starter-kit); this site is an internal preview. Each vignette is a real implementation — the problem, the data, the tools, and what GKS unlocks — written to be forwardable to a teammate or to leadership.

## The vignettes

- [**Giving every MAVE variant a precise, computable identity with VRS**](vignettes/mavedb-mave-variants-vrs/vignette.md) — mapping every variant into VRS 2.0 as MaveDB's canonical representation. *(VRS · production)*
- [**Annotating a variant once, across every score set that measured it**](vignettes/mavedb-vrs-cross-score-set-harmonization/vignette.md) — the VRS digest as a harmonization key. *(VRS · pilot)*
- [**Carrying a measured variant across every molecular level with Cat-VRS**](vignettes/mavedb-protein-variant-cat-vrs/vignette.md) — a measured variant as a category over its equivalents. *(Cat-VRS · proposal)*
- [**Sharing MAVE functional evidence as computable statements with VA-Spec**](vignettes/mavedb-functional-evidence-va-spec/vignette.md) — study results, functional-impact statements, and pathogenicity statements. *(VA-Spec · production)*

These thread one connected story: the same variants flow from VRS identity, through harmonization and categorization, into VA-Spec evidence.
