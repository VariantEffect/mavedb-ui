# MaveDB UI — General Codebase Instructions

## Project Overview

MaveDB UI is the frontend for [MaveDB](https://mavedb.org), a database for Multiplex Assays of Variant Effect (MAVE) data. It is a single-page application built with **Vue 3**, **TypeScript**, and **Vite**.

## Tech Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Framework          | Vue 3 (Composition API via `defineComponent` + `setup`) |
| Language           | TypeScript (strict mode) with some legacy `.js` files   |
| Build tool         | Vite 5                                                  |
| Package manager    | npm                                                     |
| Component library  | PrimeVue 4 (Aura theme)                                 |
| CSS                | Tailwind CSS 4                                          |
| State management   | Vuex 4 (legacy, migrating to Pinia)                     |
| Routing            | Vue Router 4 (history mode)                             |
| HTTP client        | Axios (via rest-client-vue wrapper)                     |
| Authentication     | ORCID OAuth2 (custom implementation)                    |
| Form validation    | vee-validate + yup                                      |
| Data visualization | D3, Chart.js, PDBe Molstar                              |
| API types          | Auto-generated from OpenAPI spec via openapi-typescript |

## Directory Structure

```
src/
├── assets/          # Global CSS and static images
├── components/
│   ├── common/      # Reusable, generic UI components
│   ├── layout/      # App shell: MvLayout, MvNavBar, MvFooter
│   └── screens/     # Top-level route/page components (*View, *Screen, *Creator, *Editor)
├── composables/     # Vue 3 composables (newer pattern)
├── composition/     # Composition functions (older pattern, similar purpose)
├── lib/             # Business logic, utilities, API helpers
├── router/          # Vue Router configuration
├── schema/          # Auto-generated OpenAPI TypeScript types
└── store/           # Vuex store and modules
    └── modules/     # auth, toast, item, items, layout, remote-data
```

## Key Conventions

- **Path alias**: Always use `@/` (maps to `src/`) instead of relative imports.
- **Component naming**: PascalCase `.vue` files. Screens suffixed with `View`, `Screen`, `Creator`, or `Editor`.
- **TypeScript**: Prefer `.ts` for new files. Strict mode is enabled (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- **No test framework**: There is currently no automated test suite in this project.
- **Node version**: 20.x is required.

## Build & Run

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on https://127.0.0.1:8081 (local API)
MODE=prodapi npm run dev       # Dev server using the live API
npm run build                  # Production build to dist/
```

## Environment Configuration

Environment variables are defined in `.env.*` files and accessed via `import.meta.env.VITE_*`. The `src/config.js` module re-exports them for convenient use:

- `VITE_API_URL` — Backend API base URL
- `VITE_APP_URL` — Application base URL
- `VITE_SITE_TITLE` — Page title template
- `VITE_PREVIEW_SITE` — Preview mode flag

## Domain Context

MaveDB stores and serves data about **variant effects** measured through multiplex assays. Key domain concepts:

- **Experiment Set** — A collection of related experiments
- **Experiment** — A single experimental setup
- **Score Set** — A set of variant effect scores from an experiment, the core data unit
- **Variant** — A specific genetic variant with measured effects
- **Calibration** — Statistical calibrations applied to score sets
- **URN** — Unique resource names used as primary identifiers (e.g., `urn:mavedb:00000001-a-1`)
- **HGVS** — Human Genome Variation Society notation for describing variants
- **Target Gene** — The gene being studied in an experiment

## Important Architectural Notes

1. **State management is in transition**: Vuex 4 modules exist for auth, toast, and dynamic item state. Pinia is installed but not widely used yet. New state management should prefer Pinia.
2. **Dynamic Vuex modules**: The `composition/item.ts.ts` composable creates per-component Vuex modules dynamically using `store.registerModule()` with UUID-based namespaces.
3. **HTTPS required for dev**: The Vite dev server uses `@vitejs/plugin-basic-ssl` because ORCID OAuth requires HTTPS callbacks. Port 8081 must be available (strictPort).

## Maintaining This File

This instruction file and the project documentation (`docs/`) are **living documents**. When you make changes to the codebase that affect the information described here — such as removing a feature flag, changing the tech stack, restructuring directories, or updating conventions — update this file and any affected documentation pages to reflect the new state. Do not leave stale or obsolete instructions in place.
