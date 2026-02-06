Bulk downloads
==================================

.. _bulk-downloads:

A complete set of MaveDB data and metadata is available as a bulk download 
hosted on `Zenodo <https://zenodo.org/>`_.

.. note::
   The associated DOI for the most recent version of the archive is
   `10.5281/zenodo.11201736 <https://doi.org/10.5281/zenodo.11201736>`_.

   The archive will be updated twice yearly in May and November.

The archive contains a single JSON document called ``main.json`` that provides
the structured metadata for every :ref:`experiment set<experiment sets>`,
:ref:`experiment<experiments>`, and :ref:`score set<score sets>`.
Score set data is provided in ``.csv`` format,
with separate score and count files for each record as appropriate.
Each file is named using the :ref:`score set urn<mavedb accession numbers>`.

Users who are interested in downloading a large number of MaveDB datasets are
strongly encouraged to use and cite these archival releases, 
particularly for machine learning or AI-based studies where the associated data
needs to be clearly identified for reproducibility.

Datasets released using the `CC0 <https://creativecommons.org/public-domain/cc0/>`_
public domain license are included in the archive, and this is the license
applied to the archive itself.
Datasets provided by MaveDB under other licenses are not currently included.

.. _end-bulk-downloads: