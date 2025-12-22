MAVE controlled vocabulary
===================================

.. _controlled-vocabulary-intro:

Experiments may be tagged with a controlled set of terms. These keywords offer a structured vocabulary 
for describing key aspects of the experiment, such as the type of assay performed, the biological system used, 
or the specific techniques employed.

Although such information may also be included in the free-text methods or abstract fields,
using controlled keywords ensures consistency across experiments and facilitates more effective searches
and visualizations for end users.

For the information you submit to MaveDB to be maximally useful to others,
we strongly encourage you to provide controlled keywords in the following four categories that describe key aspects of the assay:

(1) The method and characteristics of genetic perturbation
(2) Details of the phenotypic assay used to assess variant effects
(3) Information about the cellular and environmental contexts of the assays 
(4) The sequencing strategy for associating variants with effects.

.. seealso::
    For more information on how these controlled keywords are used in MaveDB, see the :ref:`Assay facts` section.
    
.. _end-controlled-vocabulary-intro:

Available controlled vocabulary terms
***************************************

.. _controlled-vocabulary-terms:

Variant library creation methods
#######################################

.. _variant-library-creation-methods:

This category describes the method used to generate the variant library for the MAVE experiment. 

* Endogenous locus library method
* In vitro construct library method
* N/A (for meta-analyses or other experiments without a variant library)
* Other (include a brief description)

After selecting a method, you should also include both the method system and mechanism used to create the variant library.

.. _end-variant-library-creation-methods:

Delivery method
#######################################

.. _delivery-method:

The delivery method describes how the variant induction machinery and/or the construct was delivered
to the model system. Possible options include:

* Electroporation
* Nucleofection
* Chemical-based transfection
* Adeno-associated virus transduction
* Lentivirus transduction
* Chemical or heat shock transformation
* Other (include a brief description)

.. _end-delivery-method:
    
Phenotypic assay dimensionality
#######################################

.. _phenotypic-assay-dimensionality:

This category describes the dimensionality of the functional readouts of the assay.

Possible types:

* Single-dimensional data (e.g., single fluorescence measurement)
* High-dimensional data (e.g., ML/AI-enabled imaging/classification)
* Combined functional data (multiple assays combined)
* Other (include a brief description)

.. _end-phenotypic-assay-dimensionality:

Phenotypic assay method
#######################################

.. _phenotypic-assay-method:

Assay method defining the molecular properties interrogated. Terms are aligned to OBI (root OBI_0000070: “assay”).

Possible types:

* Promoter activity detection by reporter gene assay
* Bulk RNA-sequencing
* Single-cell RNA sequencing assay
* Fluorescence in-situ hybridization (FISH) assay
* Flow cytometry assay
* Imaging mass cytometry assay
* Systematic evolution of ligands by exponential enrichment assay
* Single cell imaging
* Multiplexed fluorescent antibody imaging
* Binding assay
* Cell proliferation assay
* Survival assessment assay
* Other (include a brief description)

.. _end-phenotypic-assay-method:

Phenotypic assay mechanism
#######################################

.. _phenotypic-assay-mechanism:

The biological mechanism by which the assay detects variant effects. Terms are aligned to `gene ontology <https://geneontology.org/>`_ biological process terms.

Possible types:

* Dominant-negative effect
* Gain of function
* Loss of function
* Gain or loss of function
* Loss of function or dominant-negative effect
* Other (include a brief description)

.. _end-phenotypic-assay-mechanism:

Phenotypic assay model system
#######################################

.. _phenotypic-assay-model-system:

Context influencing phenotype expression.

Possible types:

* Immortalized human cells
* Murine primary cells
* Induced pluripotent stem cells from human male
* Induced pluripotent stem cells from human female
* Patient derived primary cells
* Yeast
* Bacteria
* Bacteriophage
* Molecular display
* Other (include a brief description)

Optionally provide codings for specific cell lines (e.g., Cell Line Ontology) and taxonomy identifiers where applicable.

.. _end-phenotypic-assay-model-system:

Phenotypic assay profiling strategy
#######################################

.. _phenotypic-assay-profiling-strategy:

Variant profiling strategy used to capture variant frequency vs. assay outcome. Required.

Possible types:

* Direct sequencing
* Shotgun sequencing
* Barcode sequencing

.. _end-phenotypic-assay-profiling-strategy:

Phenotypic assay sequencing read type
#######################################

.. _phenotypic-assay-sequencing-read-type:

Sequencing read type used in the assay. Required.

Possible types:

* Single-segment (short read)
* Single-segment (long read)
* Multi-segment

.. _end-phenotypic-assay-sequencing-read-type:

Molecular mechanism assessed
#######################################

.. _molecular-mechanism-assessed:

Molecular mechanism by which the assay measures variant effects.

Possible types:

* Catalytic and Cysteine synthase activity
* Catalytic and Hydroxymethylbilane synthase activity
* Catalytic and Lipid phosphatase activity
* Catalytic and Thiamine diphosphokinase activity
* Cellular response to cisplatin, DNA repair and Double-strand break repair via homologous recombination
* DNA damage response, signal transduction by p53 class mediator and MDM2/MDM4 family protein binding
* DNA repair and Double-strand break repair via homologous recombination
* Double-strand break repair, damage response, signal transduction by p53 class mediator and Response to etoposide
* Molecular function
* Monoatomic ion transport and Potassium channel activity
* Sodium channel activity
* Calcium-mediated signaling
* Catalytic and Gluconokinase activity
* Catalytic activity and Ornithine carbamoyltransferase activity
* Core promoter sequence-specific DNA binding
* DNA damage checkpoint signaling
* DNA and Mismatch repair
* Molecular condensate scaffold activity
* Monoatomic ion transport and Sodium ion transport
* Oxidative phosphorylation
* Protein carboxylation
* Protein glycosylation
* Protein localization to plasma membrane
* Regulation of protein stability
* Response to misfolded protein

.. _end-molecular-mechanism-assessed:
.. _end-controlled-vocabulary-terms: