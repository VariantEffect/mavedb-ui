# Python Usage

The [`mavedb`](https://pypi.org/project/mavedb/) Python package provides validated data models for working with the [MaveDB API](api-quickstart.md). You can use it to construct experiments, score sets, and targets as Python objects, validate them locally, and then submit them to the API. The package requires Python 3.11 or later.

## Installation

```bash
pip install mavedb
```

This installs the core package without server dependencies. The view models, validators, and all client-side functionality are included in the base installation.

## Authentication

To perform write operations, you need an API key. Generate one from your [Profile settings page](https://www.mavedb.org/#/settings/) after logging in. See [User Accounts](../getting-started/accounts.md#api-access-tokens) for details.

!!! warning "Keep your API key secret"
    Your API key grants full access to your MaveDB account. Do not commit it to version control, share it publicly, or include it in client-side code. Use environment variables or a secrets manager to store it securely.

```python
import os
import requests

BASE_URL = "https://api.mavedb.org/api/v1"
HEADERS = {"x-api-key": os.environ["MAVEDB_API_KEY"]}
```

## View models

The `mavedb` package includes [Pydantic](https://docs.pydantic.dev/) view models that mirror the API's request and response schemas. Using these models gives you:

- **Local validation** -- Field types, required fields, and business rules (e.g., at least one target per score set) are checked before you make an API call.
- **Automatic case conversion** -- Python code uses `snake_case`; the models automatically convert to `camelCase` for the API when serialized with `by_alias=True`.
- **IDE support** -- Autocompletion, type checking, and inline documentation for all fields.

The `*Create` models are the ones you'll use most often. Each record type has one:

| Model | Import path | Purpose |
|---|---|---|
| `ExperimentCreate` | `mavedb.view_models.experiment` | Create a new experiment |
| `ScoreSetCreate` | `mavedb.view_models.score_set` | Create a new score set |
| `TargetGeneCreate` | `mavedb.view_models.target_gene` | Define a target for a score set |
| `TargetSequenceCreate` | `mavedb.view_models.target_sequence` | Provide a sequence-based target |
| `TargetAccessionCreate` | `mavedb.view_models.target_accession` | Provide an accession-based target |
| `ContributorCreate` | `mavedb.view_models.contributor` | Add a contributor by ORCID iD |
| `PublicationIdentifierCreate` | `mavedb.view_models.publication_identifier` | Add a publication reference |
| `TaxonomyCreate` | `mavedb.view_models.taxonomy` | Specify the target organism |

### Serializing models for the API

All view models can be serialized to a dictionary using Pydantic's `.model_dump()` method. Use `by_alias=True` to convert field names to camelCase (as expected by the API) and `exclude_none=True` to omit unset optional fields:

```python
data = model.model_dump(by_alias=True, exclude_none=True)
```

## Creating an experiment

```python
import requests
from mavedb.view_models.experiment import ExperimentCreate
from mavedb.view_models.contributor import ContributorCreate
from mavedb.view_models.publication_identifier import PublicationIdentifierCreate

experiment = ExperimentCreate(
    title="Deep mutational scan of BRCA1 RING domain",
    short_description="Yeast two-hybrid assay measuring BRCA1-BARD1 interaction",
    abstract_text="We performed a deep mutational scan of the BRCA1 RING domain...",
    method_text="A variant library was constructed using...",
    contributors=[
        ContributorCreate(orcid_id="0000-0001-2345-6789"),
    ],
    primary_publication_identifiers=[
        PublicationIdentifierCreate(identifier="30209399", db_name="PubMed"),
    ],
)

# Validate locally, then serialize and submit
data = experiment.model_dump(by_alias=True, exclude_none=True)

response = requests.post(
    f"{BASE_URL}/experiments/",
    json=data,
    headers=HEADERS,
)
created = response.json()
print(f"Created experiment: {created['urn']}")
```

## Creating a score set

Score sets require at least one [target](../submitting-data/targets.md) and a [license](../submitting-data/metadata-guide.md#licenses). The example below uses a sequence-based target; see [Accession-based targets](#accession-based-target-example) for the alternative.

```python
import requests
from mavedb.view_models.score_set import ScoreSetCreate
from mavedb.view_models.target_gene import TargetGeneCreate
from mavedb.view_models.target_sequence import TargetSequenceCreate
from mavedb.view_models.taxonomy import TaxonomyCreate

# Define the target
target = TargetGeneCreate(
    name="BRCA1",
    category="protein_coding",
    external_identifiers=[],
    target_sequence=TargetSequenceCreate(
        sequence_type="dna",
        sequence="ATGGATTTATCTGCTCTTCGCGTT...",  # Full target sequence
        taxonomy=TaxonomyCreate(code=9606),  # NCBI Taxonomy ID for Homo sapiens
    ),
)

# Create the score set (license_id: 1=CC0, 2=CC-BY-4.0, 3=CC-BY-SA-4.0)
score_set = ScoreSetCreate(
    title="BRCA1 RING domain functional scores",
    short_description="Variant effect scores from yeast two-hybrid assay",
    abstract_text="We measured the effect of BRCA1 RING domain variants...",
    method_text="Scores were calculated using Enrich2...",
    experiment_urn="tmp:abc123-def456",  # URN of the parent experiment
    license_id=1,
    target_genes=[target],
)

# Serialize and submit metadata
data = score_set.model_dump(by_alias=True, exclude_none=True)

response = requests.post(
    f"{BASE_URL}/score-sets/",
    json=data,
    headers=HEADERS,
)
created = response.json()
print(f"Created score set: {created['urn']}")
```

After creating the score set, upload your data files in a single multipart request to the variants endpoint. The `scores_file` is required; `counts_file`, `score_columns_metadata`, and `count_columns_metadata` are optional:

```python
score_set_urn = created["urn"]

files = {
    "scores_file": ("scores.csv", open("scores.csv", "rb"), "text/csv"),
    "counts_file": ("counts.csv", open("counts.csv", "rb"), "text/csv"),  # Optional
}

response = requests.post(
    f"{BASE_URL}/score-sets/{score_set_urn}/variants/data",
    files=files,
    headers=HEADERS,
)
```

### Accession-based target example

For experiments that use a known reference sequence (e.g., saturation genome editing), use `TargetAccessionCreate` instead of `TargetSequenceCreate`:

```python
from mavedb.view_models.target_gene import TargetGeneCreate
from mavedb.view_models.target_accession import TargetAccessionCreate

target = TargetGeneCreate(
    name="BRCA1",
    category="protein_coding",
    external_identifiers=[],
    target_accession=TargetAccessionCreate(
        accession="NM_007294.4",
        gene="BRCA1",
        is_base_editor=False,
    ),
)
```

## Validation

One of the main advantages of using the view models is that validation happens on object construction. If you provide invalid data, Pydantic raises a `ValidationError` immediately:

```python
from mavedb.view_models.score_set import ScoreSetCreate

try:
    score_set = ScoreSetCreate(
        title="",  # Will fail: empty strings are not allowed
        short_description="Test",
        abstract_text="Test",
        method_text="Test",
        experiment_urn="not-a-valid-urn",  # Will fail: invalid URN format
        license_id=1,
        target_genes=[],  # Will fail: at least one target required
    )
except Exception as e:
    print(e)  # Detailed validation errors
```

## mavetools

[mavetools](https://github.com/VariantEffect/mavetools) is an older Python client library that provides a higher-level interface wrapping the API. It is not under active development; we recommend using the `mavedb` view models as described above for new projects.

## Next Steps

- See the [API Quickstart](api-quickstart.md) for direct REST API usage with curl, Python, and R examples
- Read about [data formats](../submitting-data/data-formats.md) to prepare your score and count CSV files
- Review the [upload guide](../submitting-data/upload-guide.md) for the full submission workflow
- Learn about [targets](../submitting-data/targets.md) and how to define them for your score sets
- Browse the [mavedb-api source code](https://github.com/VariantEffect/mavedb-api/tree/main/src/mavedb/view_models) for the full list of available view models
- Check the [troubleshooting](../troubleshooting.md) page if you run into issues
