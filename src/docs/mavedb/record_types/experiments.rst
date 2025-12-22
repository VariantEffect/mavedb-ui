Experiments
============================================

.. _experiment-intro:

Experiments describe the data generated from performing a MAVE on a target.
This includes all steps of the experimental procedure up to and including high-throughput sequencing.
Library construction, assay design, and sequencing strategy are all described in the experiment record
(`example experiment <https://www.mavedb.org/#/experiments/urn:mavedb:00000003-a/>`_).

.. seealso::
   Data analysis steps including read filtering, read counting, and score calculation are described in a
   :ref:`score set<score sets>`.

Publications that perform more than one functional assay should be represented as multiple experiments organized under
a single :ref:`experiment set<experiment sets>`, and each functional assay should be described in its own experiment record.
This still applies to experimental designs where the differences between assays were relatively minor,
such as varying the temperature or the concentration of a small molecule.

Replicate assays should not be reported as separate experiments,
instead the number and nature of the replicates should be clearly stated in the experiment's methods section.

.. _end-experiment-intro:

To assign a new experiment to an existing experiment set, use the 'Add an experiment' button on the experiment set page.

Experiment contributors
-----------------------------------

.. include:: ./metadata_guide.rst
   :start-after: .. _data-set-contributors:
   :end-before: .. _end-data-set-contributors:

Experiment metadata
------------------------------------

.. _experiment-metadata:

**Title**
   The title of the experiment, to be displayed at the top of the experiment record page.

**Short description**
   A brief summary of the experiment. This should be one or two sentences that summarize the experiment and are displayed
   in search results to give users an overview of the experiment.

**Abstract**
   A longer description of the experiment, including the motivation for performing it and a summary of the approach taken.
   The focus should be on describing the MAVE experiment rather than the full study.
   This field supports `Markdown <https://daringfireball.net/projects/markdown/>`_ formatting.

   .. note::
      It is common for experiments and score sets from the same study to share the same abstract text.

**Methods**
   A detailed description of the experimental methods used to generate the data, starting from raw sequence data.
   This field should include information on:
   * Variant library construction methods
   * Description of the functional assay, including model system and selection type
   * Sequencing strategy and sequencing technology
   * Structure of biological or technical replicates (if applicable)

**DOIs**
   A list of `Digital Object Identifiers (DOIs) <https://www.doi.org/>`_ for any digital resources associated with the experiment.
   
   .. warning::
      DOIs for publications should not be provided here; instead, they should be included in the publication identifiers section.

**Contributors**
   A list of the people who contributed to the experiment.
   Each contributor should be identified by their ORCID iD.

**Publication identifiers**
   A list of identifiers for publications associated with the experiment. These may be DOIs, PubMed IDs, bioRxiv IDs, or
   medRxiv IDs. If you are providing multiple identifiers, you may select one identifier as the primary identifier for the experiment.
   This publication should be the main publication describing the experiment.

**Raw read identifiers**
   A list of accession numbers for the raw sequencing data generated from the experiment.
   These should link to entries in public repositories such as the `Sequence Read Archive (SRA) <https://www.ncbi.nlm.nih.gov/sra>`__
   or `Array Express <https://www.ebi.ac.uk/biostudies/arrayexpress>`__.
   If multiple sequencing runs were performed as part of the experiment, all relevant accession numbers should be provided.

**Extra metadata**
   A JSON object containing any additional metadata relevant to the experiment that does not fit into the standard fields.
   This may include information such as experimental conditions, protocols, or other details specific to the experiment.

**Controlled Keywords**
   A list of keywords relevant to the experiment.
   These keywords will be used to improve searchability of the experiment within MaveDB. For additional guidance on selecting controlled keywords,
   see the :ref:`Controlled Keywords<mave controlled vocabulary>` section.

.. _end-experiment-metadata: