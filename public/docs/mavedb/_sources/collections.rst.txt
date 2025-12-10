Data set collections
============================================

.. _data-collections-intro:

To make it easier to share, organize, and find related data sets that might not be part of the same experiment or study, 
MaveDB supports the concept of "collections". A collection is a group of related :ref:`experiments<experiments>` 
and :ref:`score sets<score sets>` that can be browsed and shared together. Collections can be created for any 
purpose, such as grouping data sets from a specific publication, project, or research group.

Collections which you are an owner or member of will show up on data set pages when the data set is a member of the collection.

.. _end-data-collections-intro:

Creating Collections
--------------------------------------------

.. _creating-collections:

To create a new collection, click on the dropdown menu under your user profile in the top-right corner of the MaveDB interface and select "Collections".
From there, you can click the "Add an empty collection" button. You will be prompted to provide a name and description for your collection, 
set its privacy level, and add any users you wish to share it with.

Alternatively, when viewing an :ref:`experiment<experiments>` or :ref:`score set<score sets>`, you can add it to a new or existing collection by clicking the "Save to a collection" button
that appears under the assay facts sheet.

.. _end-creating-collections:

Collection Privacy
--------------------------------------------

.. _collection-privacy:

When creating a collection, you can choose to make it either public or private. Public collections can be viewed by anyone visiting MaveDB, while private collections can only be accessed by you 
and the users you explicitly share them with.

.. note::
    Even if a collection is private, the individual :ref:`experiments<experiments>` and :ref:`score sets<score sets>` within it will still be subject to their own privacy settings.
    For example, if a private collection contains a public score set, that score set will still be accessible to anyone with its accession number, even if they cannot view the collection itself.

.. _end-collection-privacy:

Collection Permissions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _collection-permissions:

When creating or managing a collection, you can specify which users have access to it. You can add other MaveDB users by their ORCiD. There are three levels of permissions you can assign to users for a collection:

* **Viewer**: Users can view the collection and its contents but cannot make any changes.
* **Editor**: Users can add or remove items from the collection and modify its metadata, but cannot change its permissions or privacy settings.
* **Admin**: Users have full control over the collection, including managing permissions for other users and updating its privacy settings.

.. note::
    As a collection owner, you will always have admin permissions and cannot be removed from the collection. As the owner of the record, you are
    also the only user who may delete the collection.

.. _end-collection-permissions:

Managing collections
--------------------------------------------

.. _managing-collections:

To edit or manage an existing collection, navigate to the collection page via the "Collections" link in the user profile dropdown menu.
From there, you can update the collection's name and description, change its privacy settings, manage user permissions, 
and add or remove experiments and score sets from the collection.

.. _end-managing-collections:

Adding and removing items from collections
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. _modifying-collections:
.. _add-to-collection:

To add an :ref:`experiment<experiments>` or :ref:`score set<score sets>` to a collection, navigate to the item's page and click the "Save to a collection" button located under the assay facts sheet.
You can then select an existing collection or create a new one to add the item to. Alternatively, you can add items directly from the collection page by clicking the "Add items" button and pasting 
the :ref:`accessions<mavedb accession numbers>` for the desired experiments or score sets. You must have the requisite permissions on the item to add it to a collection.

.. _end-add-to-collection:
.. _remove-from-collection:

To remove items from a collection, navigate to the collection page, click the edit icon next to the score set or experiment list, select the items you wish to remove, and click the "Remove" button.
Changes are not saved until you click the "Save" button at the bottom of the dialog box.

.. _end-remove-from-collection:
.. _sharing-collections:

If your collection is private, you can allow other MaveDB users to access it by :ref:`adding their users as viewers<collection-permissions>`. If your collection
is public, anyone can view it without needing to be added explicitly. Simply share the URL of the collection page with others to give them access.

.. _end-sharing-collections:
.. _end-modifying-collections:

Official Collections
--------------------------------------------

.. _official-collections:

Some collections in MaveDB are designated as "official" collections. These collections are curated by the MaveDB team and contain high-quality, well-annotated data sets that are of particular interest to the community.

You can identify official collections by a special badge on their collection page, and they are often highlighted in MaveDB communications and promotions. These collections are also linked
from any data set page that is included in the official collection.

.. _end-official-collections: