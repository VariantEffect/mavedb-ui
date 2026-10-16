# Submitting Data

MaveDB accepts MAVE datasets from the research community. Published datasets get a permanent accession number and are available through the MaveDB website, the [API](../programmatic-access/api-quickstart.md), and [external integrations](../finding-data/external-integrations.md).

## Before you begin

1. **Sign in with ORCID.** MaveDB uses [ORCID](https://orcid.org/) for authentication. If you do not have an ORCID iD, you can [register for free](https://orcid.org/register). See [User Accounts](../getting-started/accounts.md).
2. **Set an email address** on the [Profile settings page](https://www.mavedb.org/#/settings/). MaveDB requires one before you can upload. See [User Accounts](../getting-started/accounts.md#setting-an-email-address).

!!! danger
    **Do not submit patient data or anything that could be used to identify individuals to MaveDB.**

## How submission works

```mermaid
graph LR
    A["Create<br/>experiment"] --> B["Create<br/>score set"]
    B --> C["Review &<br/>publish"]

    style A fill:#4a90d9,color:#fff
    style B fill:#4a90d9,color:#fff
    style C fill:#7ab648,color:#fff
```

1. **Create an experiment** describing the assay. MaveDB creates its experiment set automatically.
2. **Create one or more score sets** under that experiment, each with its target and score data.
3. **Publish** each score set when it is ready.

New records get a [temporary accession number](../reference/accession-numbers.md#temporary-accession-numbers) beginning with `tmp:` and are visible only to you and any [contributors](metadata-guide.md#contributors) you add. You can keep editing until you [publish](publishing.md), which assigns a permanent `urn:mavedb:` accession number and makes the record public.

## Where to start

- **Planning how to split a study into records?** Read [Organizing Your Study](organizing-your-study.md).
- **Ready to fill in the forms?** Follow [Submitting a Dataset](submitting-a-dataset.md), which lists what to have ready and walks through each form step.
- **Need details on a specific field or file?** See the [Metadata Guide](metadata-guide.md), [Targets](targets.md), and [Data Formats](data-formats.md).
- **Ready to make it public, or need to correct a published score set?** See [Publishing](publishing.md).
