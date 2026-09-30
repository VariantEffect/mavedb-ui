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

### Download variant details (VRS format)

For datasets with human targets, the mapped [variant details](../reference/variant-mapping.md) are available in [GA4GH VRS](https://vrs.ga4gh.org/) format. The `/variant-details` endpoint is the bulk pair of `GET /variants/{urn}`: it streams [newline-delimited JSON](https://jsonlines.org/) (NDJSON), one `VariantDetail` per mapped variant, each carrying the flat `preMapped`/`postMapped` VRS pair, the full [GA4GH Cat-VRS](https://vrs.ga4gh.org/) categorical variant (its equivalence class of related alleles), and the VEP, gnomAD, and ClinVar annotations:

=== "Python"

    ```python
    import json
    import requests

    response = requests.get(
        "https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/variant-details"
    )

    # NDJSON: one VariantDetail object per line.
    variants = [json.loads(line) for line in response.text.splitlines() if line]
    ```

=== "R"

    ```r
    library(httr)

    response <- GET("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/variant-details")
    writeLines(content(response, as = "text"), "variant_details.ndjson")
    ```

=== "curl"

    ```bash
    curl -o variant_details.ndjson \
      https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1/variant-details
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

The API accepts up to 1,500 requests per IP address in any 5-minute window. Requests over the limit receive `429 Too Many Requests` with a `Retry-After` header giving the number of seconds to wait, and go through again once your request rate drops back under the limit. The limit applies per IP address, so requests from everyone behind a shared address, such as a campus network, count together.

Score set data downloads (`/scores`, `/counts`, `/variants/data` and `/mapped-variants`) have a lower limit of 100 requests per IP address in any 5-minute window, because each one reads a whole score set. Requests over it receive the same `429` response and `Retry-After` header. When paging through a score set with `start` and `limit`, each page counts as one request, so use large pages.

The API can also return `503 Service Unavailable` while it is busy, for example when other large score set downloads are being built. These responses usually include a `Retry-After` header; when one does not, wait a minute before retrying.

Scripts that make many requests should wait and retry when they receive a `429` or `503`:

=== "Python"

    ```python
    import time
    import requests

    def get_with_backoff(url, retries=5, **kwargs):
        for _ in range(retries):
            response = requests.get(url, **kwargs)
            if response.status_code not in (429, 503):
                break
            time.sleep(int(response.headers.get("Retry-After", 60)))
        return response

    response = get_with_backoff("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1")
    ```

=== "R"

    ```r
    library(httr)

    get_with_backoff <- function(url, retries = 5, ...) {
      for (i in seq_len(retries)) {
        response <- GET(url, ...)
        if (!(status_code(response) %in% c(429, 503))) break
        wait <- headers(response)[["retry-after"]]
        Sys.sleep(if (is.null(wait)) 60 else as.numeric(wait))
      }
      response
    }

    response <- get_with_backoff("https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1")
    ```

=== "curl"

    ```bash
    # --retry retries a 429 or 503 after its Retry-After delay; --fail keeps the error body out of the output.
    curl --fail --retry 5 https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000003-a-1
    ```

For downloading many datasets at once, use the [bulk download archive](../finding-data/downloading.md#bulk-downloads-via-zenodo) instead of looping over the API.

## Next Steps

- Browse the full [interactive API documentation](https://api.mavedb.org/docs)
- See [Python Usage](python-usage.md) for info on using the `mavedb` view models for local validation and submission
- Learn about [output formats](../finding-data/downloading.md) available for download
- Understand MaveDB [accession numbers](../reference/accession-numbers.md) used in API requests
- Explore [searching datasets](../finding-data/searching.md) through the web interface
- Check the [troubleshooting](../troubleshooting.md) page if you run into issues
