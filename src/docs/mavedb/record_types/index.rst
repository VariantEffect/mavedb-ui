Record types
==================================

.. _record-types:

MaveDB has three kinds of records: :ref:`experiment sets<experiment sets>`, :ref:`experiments<experiments>`, and :ref:`score sets<score sets>`.
These records are organized hierarchically.
Each experiment set can contain multiple experiments and each experiment can contain multiple score sets.
MaveDB also supports meta-analysis score sets, which are based on one or more existing score sets.
Each of these record types are described in more detail below.

.. _end-record-types:

.. figure:: ../images/brca1_mavedb_cartoon.svg
   :name: experiment-set-cartoon
   :alt: cartoon schematic of an experiment set with multiple experiments and score sets in MaveDB
   :align: left

   Schematic of an experiment set.

   This cartoon shows the experiment set for
   `urn:mavedb:00000003 <https://www.mavedb.org/#/experiment-sets/urn:mavedb:00000003/>`_,
   which describes two distinct assays performed on a single *BRCA1* variant library,
   each with two associated score sets.
   This nested structure is typical of a MaveDB record describing a complex study with multiple elements.
   Note that each assay (symbolized by the yeast and bacteriophage and their associated sequencing instruments)
   is described in its own experiment record,
   and that each experiment has its own score set records that describe the analysis and results
   (symbolized by the computer and data table).

.. _record-types-index:

.. toctree::
   :maxdepth: 2

   experiment_sets
   experiments
   score_sets
   metadata_guide

.. _end-record-types-index: