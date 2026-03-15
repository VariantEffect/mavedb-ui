# API and Data Fetching

## HTTP Client

All API communication uses **Axios**, wrapped by the `rest-client-vue` library. The REST client is initialized in `src/main.js`:

```ts
import {initRestClient} from 'rest-client-vue'
initRestClient({apiBaseUrl: config.apiBaseUrl})
```

## API Base URL

Configured per environment via `VITE_API_URL` in `.env.*` files:

- Local dev: `https://127.0.0.1:8002/api/v1`
- Production: `https://api.mavedb.org/api/v1`

## Authorization Headers

Two Axios interceptors are installed at startup in `src/lib/auth.ts`:

1. **Request interceptor** — Automatically adds `Authorization: Bearer <token>` and `X-Active-Roles` headers to all requests targeting the MaveDB API.
2. **Response interceptor** — Catches 401/403 responses, verifies the session against `/users/me`, signs the user out if the session is expired, and optionally redirects to login.

This means components do not need to manually attach auth headers; they are injected globally.

## Item Types Configuration

`src/lib/item-types.js` defines a registry of REST resource types. Each entry maps a logical name to its REST collection endpoint and optional HTTP overrides:

```js
{
  'scoreSet': {
    name: 'scoreSet',
    restCollectionName: 'score-sets',
    // Optional HTTP overrides:
    httpOptions: {
      list: { method: 'get', url: `${config.apiBaseUrl}/some/custom/endpoint` }
    }
  }
}
```

Resource types include: experiment sets, experiments, score sets, collections, controlled keywords, users, access keys, and more.

## API Modules (`src/api/mavedb/`)

The preferred pattern for API calls is the `api/mavedb/` module layer. Each module exports typed async functions that wrap Axios calls for a specific resource:

```
api/mavedb/
├── index.ts          # Re-exports + shared helpers (lookupOrcidUser, etc.)
├── calibrations.ts   # Score calibration CRUD
├── experiments.ts    # Experiment create/update
├── orcid.ts          # ORCID user lookup
├── permissions.ts    # Permission checks
├── collections.ts    # Collection CRUD
├── variants.ts       # Variant data fetching
└── search.ts         # Score set search
```

Usage:

```ts
import {updateExperiment} from '@/api/mavedb'

const response = await updateExperiment(urn, editedItem)
```

New API interactions should be added as functions in the appropriate module (or a new module if the resource doesn't have one yet). Components should import from `@/api/mavedb` rather than making inline Axios calls.

## Data Fetching Patterns

### 1. API modules (preferred for mutations)

Use `src/api/mavedb/` modules for create/update/delete operations and targeted fetches. See above.

### 2. Composition-based (for single-entity loading)

The `useItem()` composable from `src/composition/item.ts` manages loading a single resource:

```ts
import useItem from '@/composition/item.ts'

// In a component's setup function:
setup: (props) => useItem({itemTypeName: 'scoreSet'})

// The composable returns reactive properties:
// - item: the loaded resource
// - setItemId(id): triggers fetching by ID/URN
```

Similarly, `useItems()` from `src/composition/items.js` manages loading collections (used in SettingsScreen for access keys).

Both composables dynamically register Vuex modules with UUID namespaces for isolated state.

### 3. useAutocomplete (preferred for search/autocomplete)

The `useAutocomplete()` composable in `src/composables/use-autocomplete.ts` is a lightweight alternative to `useItems()` for autocomplete and search patterns. It makes direct Axios calls without Vuex:

```ts
import {useAutocomplete} from '@/composables/use-autocomplete'

const pubSearch = useAutocomplete('/publication-identifiers/search', {method: 'POST'})
// pubSearch.search(query) — triggers fetch
// pubSearch.items — reactive results
// pubSearch.loading — loading state
```

This is the standard pattern for all form page autocomplete fields.

### 4. Direct Axios calls

For custom or one-off API interactions, components use Axios directly:

```ts
import axios from 'axios'
import config from '@/config'

const response = await axios.get(`${config.apiBaseUrl}/score-sets/${urn}`)
```

Auth headers are automatically included by the interceptor.

### 5. REST client (rest-client-vue)

The `rest-client-vue` wrapper provides reactive REST collection management with built-in caching and pagination. Used in some components for list/search scenarios.

## Form Helpers (`src/lib/`)

- `form-helpers.ts` — save-time normalization (DOIs, raw reads, contributors, publications), autocomplete utilities, keyword payload building, markdown rendering
- `form-validation.ts` — `parseApiValidationErrors()` for converting FastAPI validation error responses into field-keyed error maps

## Data Modules (`src/data/`)

Static data and content extracted from components:

- `keywords.ts` — keyword definitions and groupings for the controlled vocabulary system
- `field-descriptions.ts` — wizard help text and editor field hints (centralized copy)

## OpenAPI Type Generation

TypeScript types for API responses are auto-generated from the backend's OpenAPI spec:

```bash
npx openapi-typescript https://api.mavedb.org/openapi.json -o src/schema/openapi.d.ts
```

The generated types live in `src/schema/openapi.d.ts` and provide full type safety for API request/response shapes. Use these types when working with API data to ensure correctness.

## Key API Endpoints

| Resource            | Endpoint pattern                     |
| ------------------- | ------------------------------------ |
| Score sets          | `/api/v1/score-sets/{urn}`           |
| Experiments         | `/api/v1/experiments/{urn}`          |
| Experiment sets     | `/api/v1/experiment-sets/{urn}`      |
| Collections         | `/api/v1/collections/{urn}`          |
| Users               | `/api/v1/users/me`                   |
| Access keys         | `/api/v1/users/me/access-keys`       |
| Controlled keywords | `/api/v1/controlled-keywords/{type}` |
| Search              | `/api/v1/score-sets/search`          |
| Statistics          | `/api/v1/statistics`                 |

## Data Visualization

Several libraries are used for rendering scientific data:

- **D3** — Heatmaps (`src/lib/heatmap.ts`) and histograms (`src/lib/histogram.ts`)
- **Chart.js** — Statistical charts via `chart.js` and its Vue wrapper
- **PDBe Molstar** — 3D protein structure visualization (`pdbe-molstar`)

## CSV and File Handling

- **PapaParse** — CSV parsing for score/variant data uploads and downloads
- **JSZip** — ZIP file creation for multi-file downloads
- **pdfmake** — PDF generation for chart exports
- **dom-to-image** — DOM-to-image conversion for chart export
