# Frequently Asked Questions

## Getting started

??? question "What is an ORCID iD and why do I need one?"
    [ORCID](https://orcid.org/) (Open Researcher and Contributor ID) is a free, unique, persistent identifier for researchers. MaveDB uses ORCID for authentication -- it is how you log in and how your contributions are attributed to you. You can [register for an ORCID iD](https://orcid.org/register) for free.

??? question "How do I create a MaveDB account?"
    MaveDB accounts are created automatically the first time you log in using your [ORCID iD](https://orcid.org/). Simply click the **Log in** button on the MaveDB website and authenticate through ORCID. See [User Accounts](getting-started/accounts.md) for more details.

??? question "Do I need an account to browse or download public data?"
    No. All published datasets in MaveDB are publicly accessible without an account. You only need to log in if you want to [submit data](submitting-data/index.md), access private (unpublished) datasets, or use the [API with authentication](programmatic-access/api-quickstart.md#authentication).

## Searching for data

??? question "How do I search for a specific gene?"
    Use the [search interface](finding-data/searching.md) and enter a gene name in the **Target name** filter on the Target tab. You can also use the general search bar to perform a full-text search across all metadata fields, including gene names, target names, and publication details.

??? question "What if I cannot find my variant in MaveDB?"
    Not all genes or variants have been studied using MAVE approaches. If you cannot find your variant, it may be that no MAVE experiment has been performed on that gene or region. You can also try searching by different identifiers (gene name, UniProt ID, or publication DOI). Check the [external integrations](finding-data/external-integrations.md) page for additional ways to look up variants via ClinVar or gnomAD. If you believe data should be present but you cannot find it, reach out on [MaveDB Zulip](https://mavedb.zulipchat.com/) for help.

## Submitting data

??? question "What file formats does MaveDB accept for variant data?"
    MaveDB accepts variant score and count data in **CSV format**. Score tables must contain a `score` column and at least one variant identifier column (`hgvs_nt`, `hgvs_splice`, or `hgvs_pro`). All variants must be described using [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) notation. See the [Data Formats](submitting-data/data-formats.md) page for detailed requirements and examples.

??? question "What metadata is required when uploading a dataset?"
    At a minimum, every experiment and score set requires a **title**, **short description**, **abstract**, and **methods** section. Score sets additionally require at least one **target** (sequence or accession), a **license** selection, and a **score CSV file**. See [What to have ready](submitting-data/submitting-a-dataset.md#what-to-have-ready) for the full list of required and recommended items.

??? question "Can I update my data after publishing?"
    After publication, most free-text metadata (title, short description, abstract, methods) can still be revised, and changes are tracked. However, certain fields -- including the target, scores, and counts -- become un-editable after publication. To correct the data itself, [supersede](submitting-data/publishing.md#superseding-a-score-set) the score set with a corrected replacement.

??? question "What is the difference between sequence-based and accession-based targets?"
    The choice depends on how your variants were introduced. If you mutagenized a construct, such as a cDNA library in a deep mutational scan, paste the sequence you mutagenized (**sequence-based**). Do this even if the sequence matches a RefSeq or Ensembl reference exactly; you can link that accession to the target ([why](submitting-data/targets.md#why-we-recommend-a-sequence-based-target-for-constructs)). If you edited variants into the genome at their native locus, such as in saturation genome editing, provide the RefSeq or Ensembl accession for that locus (**accession-based**). Both target types support [variant mapping](mapping/forward-mapping.md) to genomic coordinates. See the [Targets](submitting-data/targets.md) page for details on both approaches.

??? question "What is MAVE-HGVS?"
    [MAVE-HGVS](https://www.mavedb.org/docs/mavehgvs/index.html) is a subset of the HGVS nomenclature tailored for multiplex assay data. It supports the variant types commonly found in MAVE experiments while enforcing consistent formatting. All variant identifiers in MaveDB score and count files must use MAVE-HGVS notation. See the [MAVE-HGVS documentation](https://www.mavedb.org/docs/mavehgvs/index.html) for the full specification.

??? question "Can I keep my data private before publishing?"
    Yes. When you first create records, they are assigned [temporary accession numbers](reference/accession-numbers.md#temporary-accession-numbers) (beginning with `tmp:`) and are only visible to you and any contributors you add. You can continue editing and refining your submission until you are ready to publish.

## Score calibrations

??? question "Can anyone add a calibration to my score set?"
    Yes. Any authenticated MaveDB user can upload a [score calibration](reference/score-calibrations.md) to any published score set. Calibrations uploaded by the score set owner or contributors are classified as **investigator calibrations**, while those uploaded by other users are **community calibrations**. Community calibrations have more limited permissions — notably, community calibration owners cannot promote their own calibration to primary status. See [Investigator and community calibrations](reference/score-calibrations.md#investigator-and-community-calibrations) for the full permission breakdown.

## API and programmatic access

??? question "Is there an API for MaveDB?"
    Yes. MaveDB provides a RESTful API for programmatic access to all public datasets. The API documentation is available at [api.mavedb.org/docs](https://api.mavedb.org/docs). See the [API Quickstart](programmatic-access/api-quickstart.md) guide for an introduction.

??? question "Is there a Python package for MaveDB?"
    Yes. The `mavedb` Python package provides validated data models for constructing and submitting data to the MaveDB API. See the [Python Usage](programmatic-access/python-usage.md) page for installation instructions and usage examples.

## Licensing

??? question "What license is my data published under?"
    When uploading a score set, you can choose from three Creative Commons licenses: **CC0** (public domain, the default), **CC BY 4.0** (attribution), or **CC BY-SA 4.0** (attribution, share-alike). The license is listed in the header of downloaded CSV files and in the API response. See the [Metadata Guide](submitting-data/metadata-guide.md#licenses) for details.

??? question "Can I change the license after publishing?"
    Yes, the license can be changed after publication. However, previously downloaded copies of the dataset will retain the license they were downloaded under. Note that only CC0-licensed datasets are included in the [Zenodo bulk download archive](finding-data/downloading.md#bulk-downloads-via-zenodo).

## Data management

??? question "What happens when I publish a dataset?"
    The score set receives a permanent [accession number](reference/accession-numbers.md) (`urn:mavedb:` in place of `tmp:`) and becomes public, along with its experiment and experiment set. Publishing cannot be undone. See [Publishing](submitting-data/publishing.md) for what stays editable.

??? question "Can I delete a published dataset?"
    No. Published datasets cannot be deleted because other users or systems may have referenced them. If the data contains errors, [supersede](submitting-data/publishing.md#superseding-a-score-set) the score set with a corrected replacement.

??? question "What is variant mapping and when does it happen?"
    [Variant mapping](mapping/forward-mapping.md) is an automatic process that translates each variant from coordinates on the score set's target to the human reference genome (GRCh38), and represents it with [GA4GH VRS](reference/data-standards.md#vrs-variant-representation). It runs in the background after a score set with a human target is uploaded, for both sequence-based and [accession-based targets](submitting-data/targets.md#accession-based-targets). Reference variants can be looked up by genomic position and are used by [external integrations](finding-data/external-integrations.md) such as ClinGen and gnomAD.

## General

??? question "How do I cite MaveDB?"
    See the [Citing MaveDB](citation.md) page for the recommended citation and BibTeX entry.

??? question "Where can I get help?"
    Join the [MaveDB Zulip](https://mavedb.zulipchat.com/) community chat to ask questions, report issues, or discuss features with the MaveDB team and other users.

??? question "How do I report a bug or request a feature?"
    You can report bugs or request features on the [GitHub issue tracker](https://github.com/VariantEffect/mavedb-api/issues). Please include as much detail as possible, including steps to reproduce the issue if applicable.

??? question "What is MaveMD?"
    MaveMD is a suite of clinical interpretation tools built on top of MaveDB. It facilitates clinical interpretation of genetic variants using MAVE functional data. See the [MaveMD overview](mavemd/index.md) for more information.
