User account management
==================================

.. _user-accounts-intro:

User account authentication in MaveDB is handled through `ORCID iD <https://orcid.org/>`_.
If you do not have an `ORCID iD <https://orcid.org/>`_, you can register a new one for free using their service.

Your MaveDB account will be created once you log in for the first time.

You must have logged in at least once to MaveDB using your ORCID iD in order to be added as a :ref:`contributor<data-set-contributors>` to a dataset.

.. _end-user-accounts-intro:

Setting an email address
###################################

.. _setting-email-address:

MaveDB can only view public email addresses associated with your `ORCID iD <https://orcid.org/>`_.
If you do not have one of these set and would like to receive emails from MaveDB,
you can provide an email address using the `Profile settings page <https://www.mavedb.org/#/settings/>`_
(requires login). To upload datasets, you must provide an email address.

.. _end-setting-email-address:

API access tokens
###################################

.. _api-access-tokens:

Users may generate an API access token to authenticate with the `MaveDB API <https://api.mavedb.org/docs>`_. This token
will allow you to perform actions such as uploading and modifying datasets programmatically, fetching :ref:`private data sets<temporary-accession-numbers>`, 
or managing your account. You can generate and revoke API access tokens using the 
`Profile settings page <https://www.mavedb.org/#/settings/>`_ (requires login). 

Only one API access token can be active for a given account.
Generating a new token will invalidate the old one.

.. _end-api-access-tokens: