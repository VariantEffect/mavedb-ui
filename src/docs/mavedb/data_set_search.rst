Data Set Search
===================================

.. _data-set-search-intro:

MaveDB provides a search interface to help users find relevant data sets.
You can access the search page by clicking on the "Search" link in the top navigation bar.

.. _end-data-set-search-intro:

Search interface
-----------------------------------

.. _data-set-search-interface:

The search interface allows users to filter data sets based on various criteria.

In the target tab, users can filter data sets based on the following fields pulled from user-submitted target metadata:

* **Target name**: The name of the target associated with the data set (usually a gene or protein).
* **Target type**: The type of target (e.g., protein-coding gene, non-coding RNA, regulatory element).
* **Organism**: The organism from which the target is derived.
* **Target accession**: The accession number or identifier for the target (e.g. Ensembl ID, RefSeq ID, etc.).

In the publication tab, users can filter data sets based on the following publication-related fields:

* **Author**: The author of any publication associated with a data set.
* **Database**: The database of any publication associated with a dataset (e.g., PubMed, CrossRef, etc.).
* **Journal**: The journal in which any publication associated with a data set was published.

Users may also enter keywords into the search bar to perform a full-text search across all data set metadata fields, including target metadata, publication metadata, assay facts, and score set metadata.
Note that search filters are additive; data sets must meet all specified criteria to be included in the search results.

Results are grouped by experiment, with all matching score sets listed under each experiment.

.. note::
    Search results are updated in real-time as users modify their search criteria but limited to the first 100 results for performance reasons.
    If your search returns more than 100 results, consider refining your search criteria further.

.. _end-data-set-search-interface: