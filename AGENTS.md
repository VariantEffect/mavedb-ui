# AGENTS.md — MaveDB UI

Facts about this repo that you can't work out from the code. Keep this file short. Guidance for specific paths goes in `.claude/rules/`, which loads when you touch those paths. Rules shared with the other MaveDB repos are in the workspace `AGENTS.md` one folder up. Update all of them in the same change that makes any of it untrue.

The MaveDB web app: Vue 3, TypeScript and Vite, with PrimeVue 4 and Tailwind 4, over `VariantEffect/mavedb-api`. The user docs live here too, in `docs/` (MkDocs); `scripts/build-docs.sh` builds them into `public/docs/mavedb/`.

## Setup

- `npm ci`, on Node 20 (what CI uses).
- `npm run dev` serves https://127.0.0.1:8081 against a local api on port 8002; `MODE=prodapi npm run dev` uses the live api. Ports 8081 and 8082 are strict because ORCID only redirects to them, and the dev server uses a self-signed certificate because ORCID requires HTTPS.

## Commands

| Task                                               | Command                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| Types, lint, format check                          | `bin/check`                                         |
| Unit tests                                         | `bin/t` or `bin/t src/lib/calibrations.test.ts`     |
| Format                                             | `node_modules/.bin/prettier --write .`              |
| Shrink the lint baseline after fixing old findings | `node_modules/.bin/eslint src --prune-suppressions` |

- Run `bin/check` after every edit, and `bin/t` before handing work back. The whole suite takes a few seconds.
- There's no pre-commit hook, so `bin/check` is the only gate before CI.
- `eslint-suppressions.json` holds the findings that predate the lint gate. Fix new findings; never add to the file.
- Suppress a type error only with `@ts-expect-error` and a reason, never `@ts-ignore`. The heatmap's markers are tracked debt (#745).

## Rules

- Components use `defineComponent` with the Options API: data, computed, watch and methods, with `setup()` only for composable calls. No `<script setup>`.
- New `.vue` files use `<script lang="ts">`.
- Import through the `@/` alias, with the file extension. Some older files use relative imports; don't copy them.
- API calls go through the functions in `src/api/mavedb/`, not inline axios in components. The interceptors in `src/lib/auth.ts` already add the token and `X-Active-Roles`.
- `src/schema/openapi.d.ts` is generated (commands in the README). Never edit it by hand, and regenerate it in the same change as the api schema change it reflects.
- Vitest runs in a node environment and doesn't mount components, so logic that needs tests belongs in `src/lib/` or a composable.
