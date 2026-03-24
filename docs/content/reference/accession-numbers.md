# MaveDB accession numbers

MaveDB accession numbers use the [URN (Uniform Resource Name) format](https://tools.ietf.org/html/rfc8141). The accession numbers have a hierarchical structure that reflects the relationship between [experiment sets, experiments, score sets](../getting-started/key-concepts.md), and individual variants in MaveDB. URNs are also used to uniquely identify other resources in MaveDB, such as [calibrations](score-calibrations.md) and [collections](collections.md).

URNs within the experiment set/experiment/score set/variant hierarchy start with the string `urn:mavedb:` followed by the experiment set number (eight digits, zero-padded). Experiments are indexed by letter within the experiment set. If necessary, `aa`, `ab`, etc. will follow `z`. Score sets are indexed by number within the experiment.

| Accession Number | Description |
| --- | --- |
| `urn:mavedb:00000055` | experiment set |
| `urn:mavedb:00000055-a` | experiment |
| `urn:mavedb:00000055-a-1` | score set |
| `urn:mavedb:00000055-0-1` | meta-analysis using only data from `urn:mavedb:00000055` |
| `tmp:446191af-c1f8-4891-9f67-de152e9d328b` | temporary accession number |

## Meta-analysis accession numbers

Meta-analysis score sets use the special `0` experiment instead of a letter.

Meta-analysis score sets that include data from a single experiment set will use that experiment set's number. For meta-analyses that use data from multiple experiment sets, a new experiment set number will be assigned for all meta-analyses that include data from the same experiment sets. These meta-analysis-only experiment sets will only contain the `0` experiment.

## Temporary accession numbers

When first uploaded, records are given a temporary accession number starting with `tmp:`. These temporary accessions are not structured according to the record type.

MaveDB URNs are created when the temporary records are made publicly viewable by [publishing a score set](../submitting-data/publishing.md).

!!! note
    [Calibrations](score-calibrations.md) and [collections](collections.md) are assigned their permanent URN at creation time — their accession numbers do not change when published.

## URNs for other resources

Other resources in MaveDB that exist outside of the dataset hierarchy, such as [calibrations](score-calibrations.md) and [collections](collections.md), also use URNs starting with `urn:mavedb:`. This is followed by a resource type identifier (e.g., `calibration`, `collection`) and a unique resource identifier. For example, the URN for a calibration resource might be `urn:mavedb:calibration-11111111-2222-3333-aaaa-bbbbccccdddd`.

## See also

- [Key Concepts](../getting-started/key-concepts.md) -- The MaveDB data model hierarchy that accession numbers reflect
- [Publishing](../submitting-data/publishing.md) -- How temporary accession numbers become permanent URNs
- [API Quickstart](../programmatic-access/api-quickstart.md) -- Using accession numbers to fetch data via the API
