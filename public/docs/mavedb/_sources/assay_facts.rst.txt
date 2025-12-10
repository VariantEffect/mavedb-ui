Assay facts
===================================

.. _assay-facts-intro:

MaveDB captures key facts about the experimental assay used to generate variant effect measurements
from controlled keywords based on a :ref:`controlled vocabulary<mave controlled vocabulary>`. This information is then used
to generate a concise summary of assay facts that is displayed on the score set page.

.. figure:: images/brca1_assay_facts_example.png
   :name: assay-facts-example
   :alt: Assay facts section from a MaveDB score set page
   :align: left

   Example of the assay facts section from a score set

   This figure shows the assay facts section from 
   `urn:mavedb:00000097-0-2 <https://mavedb.org/score-sets/urn:mavedb:00000097-0-2>`_,
   which describes saturation genome editing of *BRCA1*.

.. _end-assay-facts-intro:

Assay fact sheet properties
------------------------------------

.. _assay-fact-sheet-properties:

**Gene Symbol**
    The HGNC gene symbol for the target gene being assayed.

**Assay type**
   The type of functional assay used to measure variant effects. This corresponds to the :ref:`phenotypic assay method<phenotypic assay method>` controlled vocabulary term.

**Molecular mechanism**
   The molecular mechanism by which the assay measures variant effects. This corresponds to the :ref:`molecular mechanism<molecular mechanism assessed>` controlled vocabulary term.

**Variant consequences detected**
    The types of variant consequences that the assay is capable of detecting. This corresponds to the :ref:`phenotypic assay mechanism<phenotypic assay mechanism>` controlled vocabulary term.

**Model system**
    The biological system in which the assay was performed. This corresponds to the :ref:`model system<phenotypic assay model system>` controlled vocabulary term.

**Detects splicing variants**
   Whether the assay is capable of detecting splicing variants. Based on assay design, and inferred based on a combination of the :ref:`variant library creation method<variant library creation methods>` and
   other terms.

**Detects nonsense-mediated decay (NMD) variants**
   Whether the assay is capable of detecting NMD variants. Based on assay design, and inferred based on a combination of the :ref:`variant library creation method<variant library creation methods>` and
   other terms.

**OddsPaths**
    The Odds of Pathogenicity score calculated for abnormal and normal functional readouts, if applicable. These OddsPaths are based on the framework described in `Brnich et al., 2019 <https://doi.org/10.1186/s13073-019-0690-2>`_.

    .. note::
       OddsPath calculations are provided when available. 
       
       For some assays, MaveDB maintainers may have selected OddsPaths other than those submitted by the data contributor,
       based on updated calibrations or reanalyses of the data. In these cases, the source of the OddsPath scores will be indicated on the score set page.

.. _end-assay-fact-sheet-properties: