# Permissions

MaveDB uses a role-based permission model to control who can view, edit, publish, and delete resources. This page provides a consolidated reference for how permissions work across all resource types.

## Roles

MaveDB recognizes three user-level roles for datasets (experiment sets, experiments, and score sets):

- **Owner**: The user who created the resource. Each resource has exactly one owner.
- **Contributor**: A user added to the resource by the owner. Contributors are identified by [ORCID iD](../getting-started/accounts.md) and share most of the owner's permissions, with some exceptions noted below. See the [Contributors](../submitting-data/metadata-guide.md#contributors) section of the Metadata Guide for details on adding contributors.
- **Authenticated user**: Any user logged in to MaveDB who is not the owner or a contributor.
- **Anonymous user**: A visitor who is not logged in.

[Collections](collections.md) use a separate set of roles described in [Collection permissions](#collections) below.

## Datasets

Experiment sets, experiments, and score sets share the same permission model. The key distinction is between **private** (unpublished) and **public** (published) resources.

| Action | Owner | Contributor | Authenticated user | Anonymous |
| --- | --- | --- | --- | --- |
| **View** (public) | Yes | Yes | Yes | Yes |
| **View** (private) | Yes | Yes | No | No |
| **Edit** | Yes | Yes | No | No |
| **Delete** (private only) | Yes | No | No | No |
| **Publish** score set | Yes | No | No | No |
| **Upload variant data** | Yes | Yes | No | No |
| **Add score set** to published experiment | Yes | Yes | Yes | No |
| **Add calibration** to published score set | Yes | Yes | Yes | No |

Key points:

- **Published resources cannot be deleted** by anyone. If a published score set contains errors, it can be [superseded](../submitting-data/publishing.md) by a corrected replacement.
- **Only the owner can publish** a score set. Contributors cannot publish on the owner's behalf.
- **Only the owner can delete** a private resource. Contributors cannot delete resources they are added to.
- **Any authenticated user** can add a score set to a published experiment or add a [calibration](score-calibrations.md) to a published score set.
- Editing published resources is limited to free-text metadata (title, short description, abstract, methods). Target, score, and count data become un-editable after publication.

## Score calibrations

Score calibrations have a distinct permission model because they can be created by users who are not the score set owner. Permissions differ based on whether the calibration is [investigator-provided or community-provided](score-calibrations.md#investigator-and-community-calibrations).

| Action | Investigator calibration | Community calibration |
| --- | --- | --- |
| **View** (public) | Anyone | Anyone |
| **View** (private) | Calibration owner + score set contributors | Calibration owner only |
| **Edit** (private) | Calibration owner + score set contributors | Calibration owner only |
| **Delete** (private only) | Calibration owner only | Calibration owner only |
| **Publish** | Calibration owner only | Calibration owner only |
| **Change rank** (promote/demote primary) | Calibration owner + score set contributors | Score set contributors only |

Key points:

- **Published calibrations cannot be edited or deleted.**
- The main difference is visibility and editing scope: private investigator calibrations are visible to and editable by the entire score set team, while private community calibrations are only visible to their creator.
- **Community calibration owners cannot change rank** — only the score set team can promote a community calibration to primary status.

## Collections

Collections use a role-based model with three collection-specific roles, separate from the dataset contributor system:

- **Collection admin**: Can edit the collection, add/remove datasets, publish, and manage roles.
- **Collection editor**: Can edit the collection and add/remove datasets.
- **Collection viewer**: Can view a private collection but cannot modify it.

| Action | Owner | Collection admin | Collection editor | Collection viewer | Authenticated user | Anonymous |
| --- | --- | --- | --- | --- | --- | --- |
| **View** (public) | Yes | Yes | Yes | Yes | Yes | Yes |
| **View** (private) | Yes | Yes | Yes | Yes | No | No |
| **Edit** | Yes | Yes | Yes | No | No | No |
| **Add/remove datasets** | Yes | Yes | Yes | No | No | No |
| **Publish** | Yes | Yes | No | No | No | No |
| **Manage roles** | Yes | Yes | No | No | No | No |
| **Delete** (private only) | Yes | No | No | No | No | No |

Key points:

- **Only the owner can delete** a private collection. Collection admins, editors, and viewers cannot delete collections.
- **Official collections** (those with a badge) cannot be deleted by anyone except system administrators.

## See also

- [Contributors](../submitting-data/metadata-guide.md#contributors) -- How to add contributors to your datasets.
- [Publishing](../submitting-data/publishing.md) -- What happens when a resource is published.
- [Score Calibrations](score-calibrations.md#investigator-and-community-calibrations) -- Detailed permission differences for calibration types.
- [Collections](collections.md) -- How collections organize datasets in MaveDB.
