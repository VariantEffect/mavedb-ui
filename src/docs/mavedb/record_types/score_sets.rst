Score sets
============================================

.. _score-set-intro:

Score sets are records that describe the scores generated from the raw data described in their associated experiment
and the principal way that users will interact with the data deposited into MaveDB.
This includes all steps following the high-throughput sequencing step, including read filtering, read counting, and
score calculations (`example score set <https://www.mavedb.org/#/score-sets/urn:mavedb:00000003-a-1/>`_). All score sets
must be associated with an existing experiment.

Multiple score sets should be used when distinct methods were used to calculate scores for raw data described by the
experiment.
The most common use case for multiple score sets is when scores are calculated at nucleotide resolution and amino
acid resolution for deep mutational scanning data.

When uploading results based on imputation or complex normalization,
it's recommended to upload a more raw form of the scores (e.g. enrichment ratios) as a normal score set,
and then use :ref:`meta-analysis score sets<meta-analysis-score-sets>` to describe the imputed or normalized results.

.. _end-score-set-intro:

To assign a new score set to an existing experiment, use the dropdown at the top of the score set form.

Meta-analysis score sets
-----------------------------------

.. _meta-analysis-score-sets:

Meta-analysis score sets have all the same attributes as a regular score set,
but they are linked to existing score sets rather than an existing experiment
(`example meta-analysis score set <https://www.mavedb.org/#/score-sets/urn:mavedb:00000055-0-1/>`_).

.. _end-meta-analysis-score-sets:

Score set contributors
-----------------------------------

.. include:: ./metadata_guide.rst
   :start-after: .. _data-set-contributors:
   :end-before: .. _end-data-set-contributors:

Deprecating data
-----------------------------------
.. include:: ../publishing.rst
   :start-after: .. _deprecating-data:
   :end-before: .. _end-deprecating-data:

Score set metadata
-----------------------------------

.. _score-set-metadata:

**Title**
   The title of the score set, to be displayed at the top of the score set record page.

**Short description**
   A brief summary of the score set. This should be one or two sentences that summarize the score set and are displayed
   in search results to give users an overview of the score set.

**Abstract**
   A longer description of the score set, including the motivation for performing the analysis and a summary of the approach taken.
   The focus should be on describing the score set rather than the full study.
   This field supports `Markdown <https://daringfireball.net/projects/markdown/>`_ formatting.

    .. note::
        It is common for experiments and score sets from the same study to share the same abstract text.

**Methods**
    A detailed description of the data analysis methods used to generate the scores from the raw sequence data.
    This field should include information on:

    * Sequence read filtering approach
    * Description of the statistical model for converting counts to scores, including normalization
    * Description of additional data columns included in the score or count tables, including column naming conventions
    * Details of how replicates were combined (if applicable)

**License and Data usage guidelines**
    The license under which the score set data is made available and any additional data usage guidelines.

    .. seealso::
       See the :ref:`licenses section <data licensing>` for more information on available licenses.

**Contributors**
   A list of the people who contributed to the score set.
   Each contributor should be identified by their ORCID iD.

**DOIs**
   A list of `Digital Object Identifiers (DOIs) <https://www.doi.org/>`_ for any digital resources associated with the score set.
   
   .. warning::
      DOIs for publications should not be provided here; instead, they should be included in the publication identifiers section.

**Publication identifiers**
   A list of identifiers for publications associated with the score set. These may be DOIs, PubMed IDs, bioRxiv IDs, or medRxiv IDs.
   
   You will also have the option to indicate a primary publication for the score set. This publication will be more prominently displayed
   and should describe the research contribution to which this score set is most closely related.

**Extra metadata**
   An optional JSON object containing additional metadata about the score set. This may include information such as analysis parameters,
   software versions, or other details specific to the score set. If you are providing additional metadata,,
   it should be clearly described in the methods section.

**Targets**
   One or more :ref:`targets<targets>` associated with this score set.
   Each score set must be associated with at least one target.
   For experiments that describe variants relative to two or more distinct sequences,
   such as protein-protein interaction assays that measure the effects of variants in both interacting proteins,
   multiple targets may be associated with a single score set.

**Score calibrations**
   An optional list of score calibrations that provide additional context for interpreting the scores in this score set.
   For more information, see the :ref:`Score calibrations<score calibrations>` section.

**Variant scores and counts**
   The variant scores and optional counts data tables associated with this score set.
   For more information on the expected data formats, see the :ref:`Data table formats<data table formats>` section.

.. _end-score-set-metadata:
