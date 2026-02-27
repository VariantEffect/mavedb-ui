# API Quickstart

The MaveDB REST API provides programmatic access to all public data in MaveDB. You can use it to search for datasets, download scores, and retrieve [variant mappings](../reference/variant-mapping.md) without using the web interface.


!!! info "API documentation"
    The full interactive API documentation is available at [api.mavedb.org/docs](https://api.mavedb.org/docs) and includes detailed information on all endpoints, request/response formats, and example requests in multiple programming languages.

## Base URL

All API endpoints are available at:

```
https://api.mavedb.org/api/v1/
```

## Authentication

**Reading public data does not require authentication.** You can fetch any published dataset without an API key.

For write operations (creating experiments, uploading scores) or accessing your private datasets, you need an API key. Generate one from your [Profile settings page](https://www.mavedb.org/#/settings/) after logging in. See [User Accounts](../getting-started/accounts.md#api-access-tokens) for more details.

!!! warning "Keep your API key secret"
    Your API key grants full access to your MaveDB account. Do not commit it to version control, share it publicly, or include it in client-side code. Use environment variables or a secrets manager to store it securely.

Include your key in requests using the `x-api-key` header:

=== "Python"

    ```python
    import os
    import requests

    response = requests.get(
        "https://api.mavedb.org/api/v1/users/me",
        headers={"x-api-key": os.environ["MAVEDB_API_KEY"]}
    )
    ```

=== "R"

    ```r
    library(httr)

    response <- GET(
      "https://api.mavedb.org/api/v1/users/me",
      add_headers(`x-api-key` = Sys.getenv("MAVEDB_API_KEY"))
    )
    ```

=== "curl"

    ```bash
    curl -H "x-api-key: $MAVEDB_API_KEY" https://api.mavedb.org/api/v1/users/me
    ```

## Common Tasks

### Fetch a score set by URN {#fetch-score-set}

Each [score set](../getting-started/key-concepts.md) in MaveDB is identified by a unique [accession number (URN)](../reference/accession-numbers.md).

=== "Python"

    ```python
    import requests

    response = requests.get("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1")
    score_set = response.json()

    print(score_set["title"])
    print(f"Variants: {score_set['numVariants']}")
    ```

=== "R"

    ```r
    library(httr)
    library(jsonlite)

    response <- GET("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1")
    score_set <- content(response, as = "parsed")

    cat(score_set$title, "\n")
    cat("Variants:", score_set$numVariants, "\n")
    ```

=== "curl"

    ```bash
    curl https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1
    ```

### Download variant scores as CSV

=== "Python"

    ```python
    import requests

    response = requests.get("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/scores")

    with open("scores.csv", "w") as f:
        f.write(response.text)
    ```

=== "R"

    ```r
    library(httr)

    response <- GET("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/scores")
    writeLines(content(response, as = "text"), "scores.csv")
    ```

=== "curl"

    ```bash
    curl -o scores.csv https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/scores
    ```

### Search for score sets

The search endpoint uses POST with a JSON body:

=== "Python"

    ```python
    import requests

    response = requests.post(
        "https://api.mavedb.org/api/v1/score-sets/search",
        json={"text": "BRCA1"}
    )
    results = response.json()

    for score_set in results:
        print(f"{score_set['urn']}: {score_set['title']}")
    ```

=== "R"

    ```r
    library(httr)
    library(jsonlite)

    response <- POST(
      "https://api.mavedb.org/api/v1/score-sets/search",
      body = list(text = "BRCA1"),
      encode = "json"
    )
    results <- content(response, as = "parsed")

    for (score_set in results) {
      cat(score_set$urn, ": ", score_set$title, "\n")
    }
    ```

=== "curl"

    ```bash
    curl -X POST https://api.mavedb.org/api/v1/score-sets/search \
      -H "Content-Type: application/json" \
      -d '{"text": "BRCA1"}'
    ```

### Download mapped variants (VRS format)

For datasets with human targets, [mapped variants](../reference/variant-mapping.md) are available in [GA4GH VRS](https://vrs.ga4gh.org/) format:

=== "Python"

    ```python
    import requests

    response = requests.get(
        "https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/mapped-variants"
    )

    with open("mapped_variants.json", "w") as f:
        f.write(response.text)
    ```

=== "R"

    ```r
    library(httr)

    response <- GET("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/mapped-variants")
    writeLines(content(response, as = "text"), "mapped_variants.json")
    ```

=== "curl"

    ```bash
    curl -o mapped_variants.json \
      https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/mapped-variants
    ```

### List score sets in an experiment

=== "Python"

    ```python
    import requests

    response = requests.get("https://api.mavedb.org/api/v1/experiments/urn:mavedb:00000003-a/score-sets")
    score_sets = response.json()

    for ss in score_sets:
        print(f"{ss['urn']}: {ss['title']}")
    ```

=== "R"

    ```r
    library(httr)
    library(jsonlite)

    response <- GET("https://api.mavedb.org/api/v1/experiments/urn:mavedb:00000003-a/score-sets")
    score_sets <- content(response, as = "parsed")

    for (ss in score_sets) {
      cat(ss$urn, ": ", ss$title, "\n")
    }
    ```

=== "curl"

    ```bash
    curl https://api.mavedb.org/api/v1/experiments/urn:mavedb:00000003-a/score-sets
    ```

## Pagination

List and search endpoints support pagination using `limit` and `offset` query parameters:

=== "Python"

    ```python
    import requests

    response = requests.post(
        "https://api.mavedb.org/api/v1/score-sets/search",
        json={"text": "BRCA1", "limit": 10, "offset": 0}
    )
    ```

=== "R"

    ```r
    library(httr)

    response <- POST(
      "https://api.mavedb.org/api/v1/score-sets/search",
      body = list(text = "BRCA1", limit = 10, offset = 0),
      encode = "json"
    )
    ```

=== "curl"

    ```bash
    curl -X POST https://api.mavedb.org/api/v1/score-sets/search \
      -H "Content-Type: application/json" \
      -d '{"text": "BRCA1", "limit": 10, "offset": 0}'
    ```

## Rate Limits

<!-- TODO: Document rate limits here once they are implemented (see GitHub issue https://github.com/VariantEffect/mavedb-api/issues/669). -->

The MaveDB API does not currently enforce rate limits. However, please be considerate with API usage. For downloading many datasets at once, consider using the [bulk download archive](../finding-data/downloading.md#bulk-downloads-via-zenodo) instead.

## Next Steps

- Browse the full [interactive API documentation](https://api.mavedb.org/docs)
- See [Python Usage](python-usage.md) for info on using the `mavedb` view models for local validation and submission
- Learn about [output formats](../finding-data/downloading.md) available for download
- Understand MaveDB [accession numbers](../reference/accession-numbers.md) used in API requests
- Explore [searching datasets](../finding-data/searching.md) through the web interface
- Check the [troubleshooting](../troubleshooting.md) page if you run into issues
