Data set metadata and properties
-----------------------------------

.. _data-set-metadata-intro:

MaveDB experiment and score set records include required and optional metadata fields
to describe the data being deposited.
These metadata fields are described in detail below, along with formatting guidelines and a checklist of required information.

.. _end-data-set-metadata-intro:
.. _shared-metadata:

Free text metadata
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _free-text-metadata:

Experiments and score sets both have descriptive free text fields.
These are the title, short description, abstract, and methods. 

.. note::
    These four fields are required when uploading an experiment or score set.

While the title and short description are plain text, the abstract and methods support
`Markdown <https://daringfireball.net/projects/markdown/>`_ formatting with embedded equations using
`MathML <https://www.w3.org/Math/>`_, converted using `Pandoc <https://pandoc.org/>`_.

Title
    The title of the experiment or score set, to be displayed at the top of the record page.
Short description
    The short description is displayed in the search results table. It should summarize the entry at a high level in one
    or two sentences.
Abstract
    The abstract should describe the motivation and approach for the dataset.
    Some MaveDB abstracts include a summary of the results of the related publications but many do not.
    The entry describes the MAVE data rather than a full study so the submitter should use their judgement when deciding
    what details are most relevant.

    .. note::
        It is common that experiments and score sets share the same abstract text if they are from the same study.

Methods
    The methods section should describe the approach in a condensed form,
    suitable for a specialist audience of MAVE researchers. The methods section for experiments and score sets
    have different recommended content, as described below.

    For an experiment, the methods section should include:

    * Variant library construction methods
    * Description of the functional assay, including model system and selection type
    * Sequencing strategy and sequencing technology
    * Structure of biological or technical replicates (if applicable)

    For a score set, the methods section should include:

    * Sequence read filtering approach
    * Description of the statistical model for converting counts to scores, including normalization
    * Description of additional data columns included in the score or count tables, including column naming conventions
    * Details of how replicates were combined (if applicable)

    For a meta-analysis score set, the methods section should include:

    * Description of the statistical model for converting the linked scores or counts into the scores presented
    * Description of additional data columns included in the score or count tables, including column naming conventions

.. _end-free-text-metadata:

Digital Object Identifiers (DOIs)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _digital-object-identifiers:

You may include a list of `DOIs <https://www.doi.org/>`_ for any digital resources associated with the experiment or score set.
You might use this field to link to datasets stored in other repositories, code repositories containing analysis pipelines, etc.
    
.. warning::
    DOIs for publications should not be provided here; instead, they should be included in the publication identifiers section.

.. _end-digital-object-identifiers:

Publication details
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _publication-details:

Publications can be included by entering their `PubMed ID <https://pubmed.ncbi.nlm.nih.gov/>`_, `bioRxiv ID <https://www.biorxiv.org/>`_,
`medRxiv ID <https://www.medrxiv.org/>`_, or `DOI <https://www.doi.org/>`_ and they will appear as formatted references.

You will also have the option to indicate a primary publication for the experiment or score set. This publication will be more prominently displayed
and should describe the research contribution to which this experiment or score set is most closely related.

.. note::
    Publications included in an experiment will be automatically linked to score sets associated with that experiment.

.. _end-publication-details:

Contributors
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _data-set-contributors:

When a record in MaveDB is created and assigned a temporary accession number,
it is only accessible to the "owner" user.

The owner can add additional users to the record by editing the record and
specifying that user's `ORCID iD <https://orcid.org/>`_ in the Contributors field.
The prospective contributor must have logged into MaveDB at least once.

.. note::
    Contributors added to a dataset will not automatically be added as contributors to associated records.
    You will need to add them separately in each record form.

    For instance, contributors added to an experiment will not automatically be added as contributors to associated score sets, nor will
    contributors added to a score set be added to the associated experiment. You will need to add them separately in each record form.

Contributors have the same permissions on the dataset as the owner, with the exception that 
users added to a record as contributors will not be able to delete the record. This permission is reserved
for the record owner and MaveDB administrators only.

.. _end-data-set-contributors:

Optional structured metadata
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _optional-structured-metadata:

Data sets also support the inclusion of optional `JSON <https://www.json.org/>`_-formatted metadata.
This can be used to describe features like genomic coordinates for a target sequence or score cutoff ranges that the
uploader would like to be more easily machine-readable than if this information was included in free text.

If optional metadata is included, the uploader should describe it in the score set methods.

.. _end-optional-structured-metadata:
.. _end-shared-metadata:

Experiment specific metadata
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _experiment-specific-metadata:

In addition to the shared metadata fields described above, experiments also support the following specific metadata fields:

Raw data accessions
##################################

.. _raw-data-accessions:

Experimenters are encouraged to deposit their raw sequence data in a public repository and link it to the relevant
experiment record(s).

MaveDB currently supports accession numbers for:

* `ArrayExpress <https://www.ebi.ac.uk/arrayexpress/>`_
* `BioProject <https://www.ncbi.nlm.nih.gov/bioproject/>`_
* `Gene Expression Omnibus <https://www.ncbi.nlm.nih.gov/geo/>`_
* `Sequence Read Archive <https://www.ncbi.nlm.nih.gov/sra>`_

Raw data that is stored elsewhere may be included via the DOI field.

.. _end-raw-data-accessions:

Keywords
##################################

.. _controlled-keywords:

Experiments may be tagged with optional, :ref:`controlled keywords<MAVE controlled vocabulary>`.

These keywords improve searchability of the records within MaveDB and facilitate the generation of
:ref:`assay facts<assay facts>` summaries.

.. note::
    While keywords are optional, we strongly encourage you to include them when uploading an experiment or score set
    given the contextual benefits they provide.

    In a future release, providing a minimal set of controlled keywords may become a requirement for uploading new records.

.. _end-controlled-keywords:
.. _end-experiment-metadata:

Score set specific metadata
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _score-set-specific-metadata:

In addition to the shared metadata fields described above, score sets also support the following specific metadata fields:

Licenses
###################################

.. _data-licensing:

When uploading score set information to the database, the user can choose one of three licenses:

* `CC0 (Public domain) <https://creativecommons.org/publicdomain/zero/1.0/>`_
* `CC BY 4.0 (Attribution) license <https://creativecommons.org/licenses/by/4.0/>`_
* `CC BY-SA 4.0 (Attribution-ShareAlike) <https://creativecommons.org/licenses/by-sa/4.0/>`_

.. note::
    Only datasets licensed under CC0 will be included as part of the :ref:`bulk download archive<Bulk downloads>`.

By default, new score sets will have the CC0 license.
The license can be changed after publication, but previously downloaded copies of the dataset will retain the license
they were downloaded under.
The license is listed in the header of downloaded CSV files and also in the API.

Users also have the option of adding a free-text data usage policy to a score set, such as terms that dictate use of
pre-publication data.
For example, data producers may wish to assert their right to publish the results of certain analyses first.
The data usage policy will be added to the header of any downloaded data files if one is present.

.. _end-data-licensing:

Score set targets
###################################

.. include:: ../targets.rst
    :start-after: .. _targets-intro:
    :end-before: .. _end-targets-intro:


Calibrations
###################################

.. include:: ../score_calibrations.rst
    :start-after: .. _score-calibrations-intro:
    

Variant tables
###################################

You must upload at least one variant score CSV file when creating a new score set. 
Optionally, you may also upload a variant count CSV file.

.. include:: ../data_formats.rst
    :start-after: .. _variant-columns:
    :end-before: .. _end-variant-columns:

.. seealso::
    Base editor data follows a slightly different format; see the :ref:`base editor data<base editor data>` section for details.

Score table
~~~~~~~~~~~~~~~
.. include:: ../data_formats.rst
    :start-after: .. _score-table-columns:
    :end-before: .. _end-score-table-columns:

Counts table
~~~~~~~~~~~~~~~
.. include:: ../data_formats.rst
    :start-after: .. _count-table-columns:
    :end-before: .. _end-count-table-columns:

Metadata files
################################

.. include:: ../data_formats.rst
    :start-after: .. _metadata-files:
    :end-before: .. _end-metadata-files:

.. _end-score-set-metadata:

Metadata checklist
-------------------------------------

.. metadata-checklist:

.. _data-set-required-metadata:

For each experiment and score set, you are required to provide the following metadata:

* `Free text metadata`_, including a title, short description, abstract, and methods.

.. _end-data-set-required-metadata:
.. _data-set-optional-metadata:

You are not required to provide all optional metadata fields, but we strongly encourage you to do so
to maximize the usability of your data:

* `Digital Object Identifiers (DOIs)`_ for any digital resources associated with the data set.
* `Publication details`_ for the study reference(s) and any related publications.

.. _end-data-set-optional-metadata:
.. _experiment-optional-metadata:

For experiments, you are not required but strongly encouraged to provide:

* `Raw data accessions`_ for any raw sequencing data associated with the experiment.
* `Keywords`_ to improve searchability and facilitate generation of :ref:`assay facts<assay facts>` summaries.

.. _end-experiment-optional-metadata:
.. _score-set-required-metadata:

For score sets, you are additionally required to provide:

* :ref:`Targets<score set targets>` associated with the score set, including their sequences or accessions and any related metadata.
* `Licenses`_ and data usage guidelines (if needed) for the score set.
* `Score table`_ containing the variant scores.

.. _end-score-set-required-metadata:
.. _score-set-optional-metadata:

You are encouraged to also provide:

* `Calibrations`_ to provide additional context for interpreting the scores.
* `Counts table`_ containing the variant counts (if available).
* `Metadata files`_ containing additional information about the score set.

.. _end-score-set-optional-metadata:
.. _end-metadata-checklist: