# Making your data public

When first created, records are given a [temporary accession number](../reference/accession-numbers.md) beginning with `tmp:` instead of `urn:mavedb:`.

Temporary records are only visible to the uploader and to any [contributors](metadata-guide.md#contributors) that have been added to the record. If you want to access these datasets via the [API](../programmatic-access/api-quickstart.md), you can create an API key on your [user profile page](../getting-started/accounts.md#api-access-tokens) to enable authentication.

When a score set is ready to be made public, click **Publish** on the score set page. Only the score set's owner can publish it.

!!! warning
    Once a record is published, it cannot be unpublished. If you need to fix errors in a dataset after publication, see [Superseding a score set](#superseding-a-score-set) below.

Once the data is published, several fields (including the [target](targets.md), [scores, and counts](data-formats.md)) will become un-editable. However, most [free-text metadata](metadata-guide.md#free-text-metadata) can still be revised after the dataset becomes public, and changes to these fields are tracked.

!!! note
    Score sets are the only record type that can be published. The experiment and experiment set records containing a score set are automatically made public when any score set within them is published. You cannot publish an experiment or experiment set without publishing at least one score set within it.

Published score sets carry the [license](metadata-guide.md#licenses) selected during upload.

## Superseding a score set

Published score sets cannot be deleted. To correct an error in a published score set's data, upload a corrected score set that supersedes it:

1. In the first step of the [score set form](upload-guide.md#uploading-a-score-set), answer yes to "Does this score set correct errors in and replace a score set previously published on MaveDB that you created?"
2. Enter the URN of the score set you are replacing and select it from the list.
3. Complete and publish the new score set as usual.

The original score set keeps its URN, so existing links and citations still resolve. Its page shows a notice linking to the newer version, and it is hidden from search results in favor of the replacement.

!!! warning
    Superseding is only for correcting errors in published data. If you have new analyses or improved scores for the same data, upload them as a separate score set instead.

## See also

- [Upload Guide](upload-guide.md) -- Step-by-step instructions for creating experiments and score sets.
- [Metadata Guide](metadata-guide.md) -- Details on all metadata fields, including editable free-text fields.
- [Accession Numbers](../reference/accession-numbers.md) -- How temporary and permanent URNs are assigned to records.
- [Downloading Data](../finding-data/downloading.md) -- How published data can be accessed and downloaded by other users.
- [Searching Datasets](../finding-data/searching.md) -- How users discover published datasets in MaveDB.
