# External integrations

MaveDB exchanges data with the external resources below. Most of these integrations depend on [variant mapping](../mapping/forward-mapping.md), which places MAVE variants on the human reference genome and represents them with GA4GH standards.

## ClinGen

### ClinGen Allele Registry

After mapping, MaveDB submits variant data to the [ClinGen Allele Registry](https://reg.clinicalgenome.org/) to obtain ClinGen Allele IDs (CAIDs) for each variant. CAIDs provide a stable and unique identifier for genetic variants, enabling consistent referencing across databases and publications. These identifiers power the [MaveMD variant search](../mavemd/variant-search.md), allowing users to look up variants using HGVS strings, ClinVar Variation IDs, dbSNP RSIDs, or ClinGen CAIDs and find matching MAVE functional data.

### ClinGen Linked Data Hub

When a dataset is [published](../submitting-data/publishing.md), MaveDB automatically submits the mapped variants to the [ClinGen Linked Data Hub](https://ldh.clinicalgenome.org/) (LDH). Each variant is represented as a MaveDBMapping document that includes the MAVE score, score set accession, provenance information, and a link back to the MaveDB score set page. These documents are linked to ClinGen canonical allele identifiers, enabling users to access MAVE functional evidence for a variant alongside other curation data within the ClinGen ecosystem.

Users can also navigate from the ClinGen Allele Registry directly to the corresponding [MaveMD variant page](../mavemd/variant-page.md) when functional data is available, providing a bidirectional link between the two resources.

The LDH API supports querying MaveDB data by ClinGen Allele ID (CAid), Protein Allele ID (PAid), or by MaveDB score set accession for bulk retrieval.

## ClinVar

Using the ClinGen Allele IDs obtained during the mapping process, MaveDB cross-references variants with the [ClinVar database](https://www.ncbi.nlm.nih.gov/clinvar/) to identify any existing clinical annotations. This integration serves two purposes:

1. **Visualizations** — ClinVar significance classifications are used to power [visualizations](visualizations.md) that show how well an assay segregates known pathogenic and benign variants. In the [Clinical Controls view](../mavemd/variant-page.md#clinical-controls-view) on MaveMD variant pages, ClinVar variants are color-coded by their classification (pathogenic/likely pathogenic in red, benign/likely benign in blue), revealing how functional scores correspond to independently established clinical classifications.

2. **Score calibrations** — Known pathogenic and benign ClinVar variants serve as clinical control variants for [score calibrations](../reference/score-calibrations.md), which transform MAVE functional scores into ACMG/AMP-compatible evidence strength assignments. Users can select different ClinVar database snapshots to see how calibrations relate to classifications at different points in time.

MaveDB displays ClinVar significance classifications and **star** status alongside variant effect scores and provides direct links to ClinVar entries.

ClinVar describes nucleotide variants, so MaveDB links ClinVar records to nucleotide variants only. A protein change has no ClinVar record of its own. For a protein-level measurement, MaveDB shows the classification of the nucleotide variants encoding that change, marked as an *inferred* call.

### How inferred calls are derived

A protein-level measurement is linked to every nucleotide variant that can encode its protein change, found by [reverse translation](../mapping/reverse-translation.md). MaveDB reduces the ClinVar records on those variants to one call:

- **Own record first.** A record on the measured variant itself always takes precedence. Only protein-level measurements fall back to encoding variants. A nucleotide-level measurement without its own record shows *No ClinVar record* and never borrows a related variant's call.
- **Unclassified records are ignored.** Records with no germline classification never become a call.
- **One direction.** When the records agree (for example, Benign and Likely benign), the call with the most review stars is shown as representative of the concordant records.
- **Soft conflict.** When a pathogenic or benign call appears alongside a VUS or a ClinVar *Conflicting* record, the directional call is shown with a note that a related variant is uncertain or conflicting.
- **Hard conflict.** When the records include both a pathogenic or likely pathogenic call and a benign or likely benign call, no call is shown. The measurement reads *Conflicting classifications* and is excluded from clinical controls.

Inferred calls list the records they were drawn from. Surfaces use these rules as follows:

- **Score set variant panel and histogram tooltips** show the derived call, labelled *inferred*.
- **Histogram clinical view** counts soft conflicts under their directional call and leaves out hard conflicts. Series that contain inferred calls say so in the legend. In the [custom view](visualizations.md#custom-view), soft conflicts can instead be left out, which allows separate uncertain and conflicting series.
- **Variant page** *Clinical & population data* table gives each nucleotide variant its own row with only its own record, so it shows no inferred calls.
- **CSV downloads** report ClinVar only for the measured variant, so protein-level score sets have no ClinVar values.

!!! note
    A future version of this software will allow users to submit variant interpretations back to ClinVar directly from MaveDB, streamlining the process of sharing functional evidence with the clinical genomics community.

## gnomAD

Mapped variants in MaveDB are cross-referenced with the [gnomAD database](https://gnomad.broadinstitute.org/) to retrieve population allele frequency data. This integration provides context about the prevalence of variants in diverse human populations, which is an important factor in clinical variant interpretation alongside functional evidence.

A variant's frequency is displayed on its [variant page](../mavemd/variant-page.md), and is available in bulk through the `gnomad` namespace of the variant data download. Each frequency is matched by ClinGen allele ID, so it is a direct assertion about that variant rather than an aggregate over related variants. Variants absent from gnomAD show no frequency.

A protein change has no gnomAD record of its own. For a protein-level measurement, the score set's variant panel shows the record of the nucleotide variant encoding that change with the highest FAF95, the frequency ACMG BA1/BS1 thresholds apply to. The record is labelled with that variant, and every encoding variant's record is listed alongside it. Frequencies are shown exactly as gnomAD records them and are never summed or pooled. A nucleotide-level measurement without its own record shows none, even when related variants have one. The variant page's *Clinical & population data* table and the CSV `gnomad` columns report only each variant's own record, so protein-level score sets have no gnomAD values in the CSV.

## Ensembl VEP

MaveDB uses the [Ensembl Variant Effect Predictor (VEP)](https://www.ensembl.org/info/docs/tools/vep/index.html) to annotate mapped variants with predicted functional consequences, including effects on protein coding sequences, splicing, and regulatory regions. These VEP annotations are displayed alongside variant effect scores on score set pages, providing additional context for interpreting the functional impact of each variant.

## IGVF Catalog

MaveDB is integrated with the [Impact of Genetic Variation on Function (IGVF) Consortium's Catalog](https://catalog.igvf.org/), providing access to MAVE data as it is generated by the consortium. This integration ensures that new functional datasets become discoverable through MaveDB as they are produced.

## Sequence resolution services

MaveDB relies on three open-source services to resolve and validate sequences for [accession-based targets](../submitting-data/targets.md#accession-based-targets) and [variant mapping](../mapping/forward-mapping.md).

### CDOT

[CDOT](https://cdot.cc) provides transcript data — including exon boundaries, coding regions, and transcript-to-genome alignments — for RefSeq and Ensembl accessions. MaveDB uses CDOT to retrieve transcript models when processing accession-based targets and during variant mapping.

### UTA

The [Universal Transcript Archive (UTA)](https://github.com/biocommons/uta) provides a comprehensive database of transcript alignments and annotations. MaveDB uses UTA to resolve transcript-to-genome alignments during [variant mapping](../mapping/forward-mapping.md).

### SeqRepo

[SeqRepo](https://github.com/biocommons/seqrepo) is a local sequence repository that provides fast access to biological sequences by accession identifier. MaveDB uses SeqRepo to retrieve and cache nucleotide and protein sequences for target validation and variant mapping.

## See also

- [Variant mapping](../mapping/forward-mapping.md) -- The mapping process that enables these external integrations
- [Score calibrations](../reference/score-calibrations.md) -- How functional scores are calibrated using ClinVar pathogenic and benign variant data
- [Visualizations](visualizations.md) -- How ClinVar and VEP data appear in histograms and other charts
- [Downloading data](downloading.md) -- Download annotated variant data in VRS and VA-Spec formats
- [MaveMD](../mavemd/index.md) -- Clinical interpretation tools that leverage these integrations
