Score calibrations
===================================

.. _score-calibrations-intro:

Score calibrations in MaveDB provide a way to give additional context to variant effect scores by mapping them to known reference points. 
This helps users interpret the scores in a biologically meaningful way. A score calibration consists of four parts: a baseline score, 
a set of classifications, a set of evidence strength and a calibration metadata.

.. _end-score-calibrations-intro:

Baseline score
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-baseline-score:

The baseline score represents the expected score for a variant that has no effect on the phenotype being measured. This score serves as a reference point for interpreting other variant effect scores in the dataset. 
The baseline score is typically derived from known neutral variants or from the distribution of scores in the dataset, and may also be described as the "wild-type" or "reference" score.

The baseline score should be provided as a numeric value along with a description of how it was determined. For example, if the baseline score is derived from the average score of known synonymous variants, this should be noted in the description.
MaveDB will use the baseline score in the heatmap in order to set the color scale, and it will be displayed along with the calibration information in the score set details.

.. _end-score-calibrations-baseline-score:

Functional classifications
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-functional-classifications:

Functional classifications provide a way to categorize variants based on their effect scores. These classifications help users understand the biological significance of the scores and facilitate comparisons between different variants.
MaveDB supports a controlled vocabulary for functional classifications, which includes the following terms:

* **Normal**: Indicates that the variant has no significant effect on the phenotype.
* **Abnormal**: Indicates that the variant has a significant effect on the phenotype.
* **Not specified**: Indicates that the effect of the variant is unknown or has not been determined.

There are two ways to assign functional classifications to variants in MaveDB:

1. **Threshold-based classification**: Users can define score thresholds that determine the functional classification of variants. For example, variants with scores above a certain threshold may be classified as "Normal", while those below the threshold are classified as "Abnormal".
2. **Direct assignment**: Users can directly assign functional classifications to individual variants based on experimental evidence or prior knowledge. You can do this by uploading a file that includes the variant identifiers and their corresponding classifications.

.. _end-score-calibrations-functional-classifications:

Evidence strengths
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-evidence-strengths:

Evidence strengths provide a way of indicating the evidence level that may be used for variant interpretation. MaveDB supports a controlled vocabulary for evidence strengths, which includes the following terms based on ACMG/AMP guidelines:

* **Very Strong**
* **Strong**
* **Moderate**
* **Supporting**

You may assign a particular evidence strength to each each functional classification. Note that for "abnormal" classifications, you must provide a pathogenic evidence strength, while for "normal" classifications, you must provide a benign evidence strength.
For "not specified" classifications, evidence strengths may not be submitted.

You may also include odds of pathogenicity ("OddsPath") values for each classification. These values provide a quantitative measure of the strength of evidence associated with each classification, and may be used in variant interpretation. For more information
on how OddsPath values relate to evidence strengths and recommendations for their application, see the guidelines provided by `Brnich et al., 2019 <https://doi.org/10.1186/s13073-019-0690-2>`_.

.. _end-score-calibrations-evidence-strengths:

Calibration metadata
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-calibration-metadata:

Calibration metadata provides additional context about the score calibration, including information about how the calibration was performed and any relevant references or notes.
This metadata may include:

* A title for the calibration
* A description of the methods used to determine the baseline score and functional classifications.
* Any additional notes or comments that may be useful for users interpreting the calibration, especially with regard to the baseline score and functional classifications.
* Whether the calibration should be marked as **research use only**, indicating that it is not intended for clinical or diagnostic purposes.

In addition, users may provide three types of optional references to support the calibration:

* **Threshold sources**: A publication reference (e.g., a DOI, PubMed ID, or bioRxiv/medRxiv ID) that describes the method by which classification thresholds or classes were determined.
* **Classification methods**: A publication reference (e.g., a DOI, PubMed ID, or bioRxiv/medRxiv ID) that describes the method by which evidence strengths were determined.
* **Classification sources**: A publication reference (e.g., a DOI, PubMed ID, or bioRxiv/medRxiv ID) that describes where the evidence strengths determined by the 'classification methods' are described.

.. _end-score-calibrations-calibration-metadata:

Calibration privacy
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-calibration-privacy:

By default, score calibrations are not visible to all MaveDB users. However, you may choose to publish a calibration after it has been uploaded. Private calibrations are only visible to the user who uploaded them and any users marked as contributors on the associated score set.
Published calibrations are visible to all MaveDB users and may be used in visualizations and interpretations of the associated score set.

.. warning::
    Once a calibration has been published, it cannot be made private again nor may it be edited. Please ensure that you are comfortable with making the calibration public before publishing it.

Primary calibrations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-primary-calibrations:

A primary calibration is the main score calibration associated with a score set. Each score set in MaveDB may have at most one primary calibration. The primary calibration is used by default when displaying the score set in visualizations and when interpreting variant effect
scores.

After uploading a score calibration to MaveDB, you may choose to designate it as the primary calibration for the associated score set. If a score set already has a primary calibration, you must demote the existing primary calibration before designating a new one.
A calibration must be publicly visible to be marked as the primary calibration, and research use only calibrations may not be designated as primary calibrations.

.. note::
   MaveDB maintainers may review primary calibrations to ensure that they meet quality standards and are appropriate for use in visualizations and interpretations, and retain
   the right to remove primary calibration status from any calibration that does not meet these standards.

.. _end-score-calibrations-primary-calibrations:

Investigator provided calibrations
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _score-calibrations-investigator-provided-calibrations:

When there is no primary calibration associated with a score set, investigator provided calibrations are given priority viewing over other non-primary calibrations. Investigator provided calibrations
are any calibrations which have been uploaded by the samem user who uploaded the score set or a user marked as a contributor on the score set.