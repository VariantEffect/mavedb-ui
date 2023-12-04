Making your data public
==================================

When first created, records are given a :ref:`temporary accession number<Temporary accession numbers>`
beginning with ``tmp:`` instead of ``urn:mavedb:``.

Temporary records are only visible to the uploader.
If you want to access these datasets via API, you can create an API key on your user profile page.

When the record is ready to be made public, you can click on the padlock icon to "publish" the record.
Note that when the data is published, several fields (including the target sequence, scores, and counts)
will become un-editable.
Most free-text metadata can still be revised after the dataset becomes public,
and changes to these fields are tracked.

Deprecating score sets
###################################

If you need to fix an error after a dataset becomes public and is no longer editable,
MaveDB supports the deprecation of score sets.
When creating a new score set, the user can specify an existing score set to replace.
