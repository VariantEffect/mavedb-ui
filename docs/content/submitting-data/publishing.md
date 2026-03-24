# Making your data public

When first created, records are given a [temporary accession number](../reference/accession-numbers.md) beginning with `tmp:` instead of `urn:mavedb:`.

Temporary records are only visible to the uploader and to any [contributors](metadata-guide.md#contributors) that have been added to the record. If you want to access these datasets via the [API](../programmatic-access/api-quickstart.md), you can create an API key on your [user profile page](../getting-started/accounts.md#api-access-tokens) to enable authentication.

When the record is ready to be made public, click on the padlock icon to **publish** the record.

!!! warning
    Once a record is published, it cannot be unpublished. If you need to fix errors in a dataset after publication, see [Deprecating score sets](#deprecating-score-sets) below.

Once the data is published, several fields (including the [target](targets.md), [scores, and counts](data-formats.md)) will become un-editable. However, most [free-text metadata](metadata-guide.md#free-text-metadata) can still be revised after the dataset becomes public, and changes to these fields are tracked.

!!! note
    Score sets are the only record type that can be published. The experiment and experiment set records containing a score set are automatically made public when any score set within them is published. You cannot publish an experiment or experiment set without publishing at least one score set within it.

## Data licensing

Score sets are published under a [Creative Commons license](metadata-guide.md#licenses) selected during upload. The default is CC0 (public domain). The license can be changed after publication, but previously downloaded copies retain the license they were downloaded under.

For full details on available licenses and data usage policies, see the [Licenses](metadata-guide.md#licenses) section of the Metadata Guide.

## Deprecating score sets

If you need to fix an error after a dataset becomes public and is no longer editable, MaveDB supports the deprecation of score sets. When [creating a new score set](upload-guide.md#uploading-a-score-set), the user can specify an existing score set to replace.

!!! warning
    The deprecation mechanism is intended solely for correcting errors in published data, not for making routine edits or updates. If you have new analyses or improved scores for the same data, upload them as a separate score set rather than deprecating the original.

## See also

- [Upload Guide](upload-guide.md) -- Step-by-step instructions for creating experiments and score sets.
- [Metadata Guide](metadata-guide.md) -- Details on all metadata fields, including editable free-text fields.
- [Accession Numbers](../reference/accession-numbers.md) -- How temporary and permanent URNs are assigned to records.
- [Downloading Data](../finding-data/downloading.md) -- How published data can be accessed and downloaded by other users.
- [Searching Datasets](../finding-data/searching.md) -- How users discover published datasets in MaveDB.
