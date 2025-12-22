Output formats
==================================

.. _output-formats-intro:

MaveDB supports multiple output formats for downloading variant effect score data. These formats are designed to accommodate different user needs and facilitate integration with various analysis tools and pipelines. The primary output formats available in MaveDB include:

* **Score and count data**: Downloadable as CSV or TSV files, these files contain the raw and processed variant effect scores along with associated count data.
* **Mapped variants**: Available in `GA4GH VRS <https://vrs.ga4gh.org/>`_ format, this output provides standardized representations of variants mapped to genomic coordinates.
* **Annotated variants**: Provided in `VA-Spec <https://va-spec.ga4gh.org/>`_ format, this output includes additional annotations for each variant, such as functional classifications and evidence strengths.

.. _end-output-formats-intro:

Score and count data
-----------------------------------

.. _score-data-output-formats:

MaveDB allows users to download variant effect score data along with associated count data in common tabular formats such as CSV (Comma-Separated Values) and TSV (Tab-Separated Values). This is the same data that users upload, but with an additional column for variant URNs that uniquely identify each variant in MaveDB. 
Users may also choose to include other MaveDB generated columns in this output, such as mapped variant HGVS strings and VRS identifiers, if available.

.. note::
    Score and count columns are non-prescriptive and may vary between datasets, see: :ref:`data table formats`. 
    
    Columns may mean different things between data sets, so users should refer to the dataset documentation for details on the specific columns included in each download.

.. _end-score-data-output-formats:


Mapped variants
-----------------------------------

.. _mapped-variants-output-formats:

MaveDB stores :ref:`mapped variants<variant mapping>` using the `GA4GH VRS <https://vrs.ga4gh.org/>`_ standard for representing genetic variants. Mapped variants may be downloaded in VRS JSON format, which provides a structured representation of each variant
including genomic coordinates, alleles, and reference sequences. For data sets which have been mapped, users may download this JSON file containing all mapped variants associated with the score set.

.. _end-mapped-variants-output-formats:


Annotated variants
-----------------------------------

.. _annotated-variants-output-formats:

MaveDB provides annotated variant data in the `VA-Spec <https://va-spec.ga4gh.org/>`_ format, which builds upon the VRS standard to include additional annotations relevant to variant interpretation. This output includes functional classifications, evidence strengths, and other metadata associated with each variant. There are three types of VA-Spec objects that MaveDB provides, which are described below.
Variants may not have all three types of VA-Spec objects associated with them; the availability of each object type depends on the data provided in the score set and its calibrations.

Functional Impact Study Result
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _annotated-variants-functional-impact-study-result:

This object represents the results of a functional impact study for a specific variant. It includes the variant identifier, its mapping result, the observed effect score, and metadata about the study itself. This object is useful for capturing the direct results of MAVE experiments, and 
is intended to be used as evidence in variant interpretation frameworks. It forms the basis for other exported VA-Spec objects in MaveDB.

.. _end-annotated-variants-functional-impact-study-result:

Functional Impact Statement
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _annotated-variants-functional-impact-statement:

This object summarizes the functional impact of a variant based on the results of a functional impact study. It builds on the Functional Impact Study Result to additionally provide an overall classification (e.g., "Normal", "Abnormal") of variant effect based on provided :ref:`score calibrations <score calibrations>`. 

.. _end-annotated-variants-output-formats:

Pathogenicity Evidence Line
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _annotated-variants-pathogenicity-evidence-line:

This object represents a line of evidence for variant pathogenicity based on functional impact data. It incorporates the Functional Impact Statement and includes evidence strengths (e.g., "Strong", "Moderate") that indicate the level of confidence in the functional classification. This object is designed to be integrated into broader variant interpretation frameworks, such as those used in clinical genomics.

.. _end-annotated-variants-pathogenicity-evidence-line: