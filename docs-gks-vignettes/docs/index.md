# MaveDB × GA4GH GKS Vignettes

These pages contain eal-world walk-throughs of how **MaveDB** uses the GA4GH **Genomic Knowledge Standards** to solve fundamental problems in sharing multiplexed assay of variant effect (MAVE) and other functional assay data.

These are drafted for contribution to the [GA4GH GKS Starter Kit](https://github.com/ga4gh/gks-starter-kit); this site is an internal preview. Each vignette describes a real implementation, including the scope of the problem, the underlying data, the tools, and the GKS standards, written to be accessible to a teammate or to leadership.

## The vignettes

- [**Giving every MAVE variant a precise, computable identity with VRS**](vignettes/mavedb-mave-variants-vrs/vignette.md) — mapping every variant into VRS 2.0 as MaveDB's canonical variant representation. *(VRS · production)*
- [**Annotating a variant once across every score set that measured it**](vignettes/mavedb-vrs-cross-score-set-harmonization/vignette.md) — the VRS digest as a harmonization key. *(VRS · pilot)*
- [**Carrying a measured variant across molecular levels with Cat-VRS**](vignettes/mavedb-protein-variant-cat-vrs/vignette.md) — a variant as a category for its biologically equivalent representations. *(Cat-VRS · proposal)*
- [**Sharing MAVE functional evidence as computable statements with VA-Spec**](vignettes/mavedb-functional-evidence-va-spec/vignette.md) — study results, functional-impact statements, and pathogenicity statements. *(VA-Spec · production)*

These threads are intended to tell a connected story, following the same variants from VRS identity, through harmonization and categorization, and into VA-Spec evidence.
