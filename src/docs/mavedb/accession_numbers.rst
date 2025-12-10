MaveDB accession numbers
============================

.. _accession-numbers-intro:

MaveDB accession numbers use the `URN (Uniform Resource Name) format <https://tools.ietf.org/html/rfc8141>`_.
The accession numbers have a hierarchical structure that reflects the relationship between
experiment sets, experiments, score sets, and individual variants in MaveDB. URNs are also used to uniquely identify
other resources in MaveDB, such as calibrations and collections.

URNs within the experiment set/experiment/score set/variant hierarchy start with the string `urn:mavedb:` 
followed by the experiment set number (eight digits, zero-padded).
Experiments are indexed by letter within the experiment set.
If necessary, ``aa``, ``ab``, etc. will follow ``z``.
Score sets are indexed by number within the experiment.

.. list-table:: Example accession numbers
   :name: Table of example accession numbers
   :header-rows: 1

   * - Accession Number
     - Description
   * - ``urn:mavedb:00000055``
     - experiment set
   * - ``urn:mavedb:00000055-a``
     - experiment
   * - ``urn:mavedb:00000055-a-1``
     - score set
   * - ``urn:mavedb:00000055-0-1``
     - meta-analysis using only data from ``urn:mavedb:00000055``
   * - ``tmp:446191af-c1f8-4891-9f67-de152e9d328b``
     - temporary accession number

.. _end-accession-numbers-intro:

Meta-analysis accession numbers
####################################

.. _meta-analysis-accession-numbers:

Meta-analysis score sets use the special ``0`` experiment instead of a letter.

Meta-analysis score sets that include data from a single experiment set will use that experiment set's number.
For meta-analyses that use data from multiple experiment sets,
a new experiment set number will be assigned for all meta-analyses that include data from the same experiment sets.
These meta-analysis-only experiment sets will only contain the ``0`` experiment.

.. _end-meta-analysis-accession-numbers:

Temporary accession numbers
###################################

.. _temporary-accession-numbers:

When first uploaded, records are given a temporary accession number starting with ``tmp:``.
These temporary accessions are not structured according to the record type.

MaveDB URNs are created when the temporary records are made publicly viewable by publishing a score set.

.. _end-temporary-accession-numbers:

URNs for other resources
###################################

.. _other-resources-urns:

Other resources in MaveDB that exists outside of the data set hierarchy, such as calibrations and collections, also use URNs starting with ``urn:mavedb:``.
This is followed by a resource type identifier (e.g., ``calibration``, ``collection``) and a unique
resource identifier. For example, the URN for a calibration resource might be
``urn:mavedb:calibration-11111111-2222-3333-aaaa-bbbbccccdddd``.

.. _end-other-resources-urns: