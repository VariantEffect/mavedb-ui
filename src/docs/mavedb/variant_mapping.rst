Variant Mapping
===================================

.. _variant-mapping-intro:

MaveDB uses the variant descriptions provided in the score and count data tables
to map variants to genomic coordinates. This mapping allows MaveDB to integrate with
external resources such as :ref:`clingen`, :ref:`clinvar`, and :ref:`gnomad`.

.. note::
    Variant mapping is only performed for datasets with a human target sequence.

This process was made possible by a novel method for mapping MAVE data written by 
`Arbesfeld et al. (2025) <http://dx.doi.org/10.1186/s13059-025-03647-x>`_. The method 
is described in detail in the linked publication, and summarized briefly below.

.. _end-variant-mapping-intro:

Mapping process
-----------------------------------

.. _mapping-process:

Variants are mapped to genomic coordinates upon upload of a score set. The mapping process involves the following steps:

1. **Target sequence alignment**: The target sequence provided with the score set is aligned to the reference genome using
   `BLAT <https://genome.ucsc.edu/FAQ/FAQblat.html>`_. This step determines the genomic location of the target sequence and
   identifies the corresponding transcript(s).
2. **Transcript selection**: If multiple candidate transcripts are identified in the alignment step, the most appropriate transcript
   is selected. Where possible, we prioritize MANE Select transcripts, followed by RefSeq Select transcripts, and then the longest
   matching transcript.
3. **Variant translation**: Each variant in the score and count data tables is converted from MAVE-HGVS format to standard HGVS format
   and translated with respect to the selected transcript. This step accounts for any offset between the target sequence and the transcript.
4. **VRS translation**: The HGVS variant descriptions are then converted to `GA4GH VRS <https://vrs.ga4gh.org/en/stable/>`_ format
   using the `VRS-Python <https://github.com/ga4gh/vrs-python>`_ library. This standardized representation facilitates interoperability 
   with other genomic databases and tools, as well as standardizing all output variant representations for future mapped variation.

.. note::
   In some cases, variants may not be successfully mapped due to issues such as ambiguous target sequences,
   complex variant types, or discrepancies between the target and reference genome. MaveDB logs these instances
   and provides feedback to data contributors to help resolve mapping issues. 
   
   Although some mapping failures
   represent true limitations of the data, others can be addressed by correcting errors in the submitted variants
   or target sequences.

   **It is highly recommended that data contributors review the mapping results after uploading a score set
   to ensure that variants have been accurately mapped.** Contributors can view mapping results on the score set page and download a report of mapped and unmapped variants.

   Mapping failures do not prevent datasets from being published in MaveDB, but mapped variants
   are required for certain features such as :ref:`variant search<variant search>`, linkages with
   certain :ref:`external resources<external integrations>`, and inclusion in :ref:`mavemd`.

.. _end-mapping-process:

Mapping integrations
-----------------------------------

.. _mapping-integrations:

Mapped variants are integral to MaveDB's integration with :ref:`external data sources<external integrations>`. Whereas variants prior to mapping
are only described with respect to the target sequence, mapped variants can be linked to
genomic coordinates and transcripts, enabling connections to resources such as ClinVar, gnomAD,
and ClinGen. Mapped variants also enable MaveDB to provide
`GA4GH VRS <https://vrs.ga4gh.org/en/stable/>`_ representations of variants for download and programmatic access via the MaveDB API.

This mapping and the integrations they facilitate enhance the utility of MaveDB and power MaveMD by enabling features 
like :ref:`variant search<variant search>` and :ref:`score calibrations<score calibrations>`.

.. _end-mapping-integrations: