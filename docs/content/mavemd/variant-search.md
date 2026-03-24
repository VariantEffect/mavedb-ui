# Variant search

MaveMD provides a dedicated variant search that lets you look up individual genetic variants and find any MAVE functional data available for them in MaveDB. This is separate from the MaveDB [dataset search](../finding-data/searching.md), which finds experiments and score sets by gene, target, or publication.

## Supported identifiers

You can search for variants using any of the following identifier types:

| Identifier | Example | Source |
|---|---|---|
| HGVS string | `NM_007294.4:c.5123C>A` | Standard variant nomenclature |
| ClinVar Variation ID | `55367` | [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) |
| dbSNP RSID | `rs80357906` | [dbSNP](https://www.ncbi.nlm.nih.gov/snp/) |
| ClinGen Allele ID (CAID) | `CA024716` | [ClinGen Allele Registry](https://reg.clinicalgenome.org/) |

## How search works

MaveMD variant search is powered by the [ClinGen Allele Registry](https://reg.clinicalgenome.org/). When MaveDB [maps variants](../reference/variant-mapping.md) to human genomic coordinates, it registers them with the ClinGen Allele Registry and obtains ClinGen Allele IDs (CAIDs). These stable, universal identifiers allow MaveMD to match your search query — regardless of which identifier type you use — to the correct variant across all datasets.

This means you can search using a ClinVar Variation ID from a clinical report and find the same variant in MAVE datasets that originally used HGVS notation on a different transcript, as long as both resolve to the same genomic variant.

## Fuzzy search

In addition to searching by identifier, MaveMD provides a structured fuzzy search interface for cases where you don't have a complete identifier. The fuzzy search accepts:

- **Gene symbol** -- The HGNC gene symbol (e.g., BRCA1)
- **Variant type** -- Protein or cDNA
- **Position** -- The amino acid or nucleotide position
- **Reference allele** -- The reference residue or base
- **Alternate allele** -- The variant residue or base

The fuzzy search validates your input and queries the ClinGen Allele Registry to resolve the variant.

## Search results

When a variant is found in one or more MaveMD datasets, the results page displays:

- **Available measurements** -- A list of MAVE datasets (assays) that include functional data for the variant. When the variant has been measured in multiple assays, each is listed separately.
- **Variant representation** -- The variant shown in HGVS format along with alternate identifiers (ClinGen Allele ID, ClinVar Variation ID, dbSNP RSID) where available.

Select a measurement to view the full [variant page](variant-page.md) with detailed functional evidence, assay facts, and calibration information.

## Linking from external resources

MaveMD variants are accessible from external platforms through the ClinGen Linked Data Hub. When viewing a variant in the [ClinGen Allele Registry](https://reg.clinicalgenome.org/), you can navigate directly to the corresponding MaveMD variant page if functional data is available.

## See also

- [Variant page](variant-page.md) -- Detailed view of functional evidence for a variant
- [External Integrations](../finding-data/external-integrations.md) -- How MaveDB connects with ClinGen, ClinVar, and other resources
- [Variant Mapping](../reference/variant-mapping.md) -- How MAVE variants are mapped to genomic coordinates and registered with ClinGen
