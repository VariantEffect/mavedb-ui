External integrations
===========================================

.. _external-integrations-intro:

MaveDB integrates with several external resources to enrich hosted data sets and facilitate data sharing and interpretation.

Many of these integrations rely on :ref:`variant mapping<variant mapping>` to link MAVE variants to genomic coordinates and transcripts.

.. _end-external-integrations-intro:

ClinGen
-------------------------------------------

.. _clingen-integration:

After mapping, MaveDB submits variant data to the `ClinGen Allele Registry <https://reg.clinicalgenome.org/>`_ to obtain ClinGen Allele IDs (CAIDs) for each variant. 
CAIDs provide a stable and unique identifier for genetic variants, enabling consistent referencing across databases and publications.

When a data set is published, MaveDB automatically submits the mapped variants to the ClinGen Linked Data Hub. This submission includes relevant metadata about the variants and their associated scores.
This allows ClinGen to display information about the functional data from MaveDB directly on their platform, enhancing the visibility and utility of MAVE data for the clinical genomics community.

.. _end-clingen-integration:


ClinVar
-------------------------------------------

.. _clinvar-integration:

Using the ClinGen Allele IDs obtained during the mapping process, MaveDB cross-references variants with the `ClinVar database <https://www.ncbi.nlm.nih.gov/clinvar/>`_ to identify any existing annotations.
These annotations power visualizations in MaveDB intended to show the segretation ability of an assay with respect to known pathogenic and benign variants. MaveDB displays ClinVar significance classifications 
and 'star' status alongside variant effect scores, allowing users to assess how well the MAVE data aligns with established clinical interpretations and links to ClinVar entries for further information.

.. note::
    A future version of this software will allow users to submit variant interpretations back to ClinVar directly from MaveDB, streamlining the process of sharing functional evidence with the clinical genomics community.    

.. _end-clinvar-integration:


gnomAD
-------------------------------------------

.. _gnomad-integration:

Mapped variants in MaveDB are also cross-referenced with the `gnomAD database <https://gnomad.broadinstitute.org/>`_ to retrieve population frequency data. This integration provides users with important context about the prevalence of variants in diverse human populations.

.. _end-gnomad-integration:

VEP
-------------------------------------------

.. _vep-integration:

MaveDB utilizes the `Ensembl Variant Effect Predictor (VEP) <https://www.ensembl.org/info/docs/tools/vep/index.html>`_ to annotate mapped variants with predicted functional consequences. VEP provides insights into how variants may impact gene function, including effects on protein coding sequences, splicing, and regulatory regions.

.. _end-vep-integration: