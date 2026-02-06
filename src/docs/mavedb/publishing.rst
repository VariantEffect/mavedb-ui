Making your data public
==================================

.. _publishing-data:

When first created, records are given a :ref:`temporary accession number<Temporary accession numbers>`
beginning with ``tmp:`` instead of ``urn:mavedb:``.

Temporary records are only visible to the uploader and to any :ref:`contributors<contributors>` that 
have been added to the record.
If you want to access these datasets via API, you can create an API key on your user profile page to enable authentication.

When the record is ready to be made public, you can click on the padlock icon to "publish" the record.

.. warning::
    Once a record is published, it cannot be unpublished. If you need to fix errors in a dataset after publication,
    see: :ref:`deprecating score sets`.

Once the data is published, several fields (including the :ref:`target<targets>`, scores, and counts)
will become un-editable. However, most free-text metadata can still be revised after the dataset becomes public,
and changes to these fields are tracked.

.. note::
    Score sets are the only record type that can be published. When the first score set associated with an experiment
    is published, the associated experiment and experiment set will also become public.

.. _end-publishing-data:

Data licensing
------------------------------------

.. include:: ./record_types/metadata_guide.rst
   :start-after: .. _data-licensing:
   :end-before: .. _end-data-licensing:

Deprecating score sets
------------------------------------

.. _deprecating-data:

If you need to fix an error after a dataset becomes public and is no longer editable,
MaveDB supports the deprecation of score sets.
When creating a new score set, the user can specify an existing score set to replace.

.. _end-deprecating-data: