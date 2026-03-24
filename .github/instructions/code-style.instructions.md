# Code Style and Formatting

## Formatting (Prettier)

The project uses Prettier for code formatting, configured in `.prettierrc.ts`:

| Setting                 | Value    |
| ----------------------- | -------- |
| Print width             | 120      |
| Semicolons              | No       |
| Quotes                  | Single   |
| Tab width               | 2 spaces |
| Trailing commas         | None     |
| Arrow parens            | Always   |
| Bracket spacing         | No       |
| End of line             | LF       |
| Vue indent script/style | No       |

### Practical examples

```ts
// Correct
import {computed, ref, watch} from 'vue'
const result = someFunction(arg1, arg2)
const arrow = (x) => x + 1

// Wrong
import {computed, ref, watch} from 'vue'
const result = someFunction(arg1, arg2)
const arrow = (x) => x + 1
```

Note: no spaces inside braces, no semicolons, single quotes, always parenthesize arrow function parameters.

## Linting (ESLint)

Configured in `eslint.config.mjs` with:

- `eslint-plugin-vue` — Vue recommended rules
- `@vue/eslint-config-typescript` — TypeScript integration
- `@vue/eslint-config-prettier/skip-formatting` — Disables ESLint rules that conflict with Prettier

### Custom rules

- **`vue/attributes-order`**: Template attributes must be in **alphabetical order** (error level). This is strictly enforced.

```html
<!-- Correct -->
<button :disabled="loading" label="Save" severity="primary" @click="save" />

<!-- Wrong (not alphabetical) -->
<button label="Save" @click="save" :disabled="loading" severity="primary" />
```

## TypeScript

- **Strict mode** is enabled in `tsconfig.json`.
- `noUnusedLocals` and `noUnusedParameters` are enforced — do not leave unused variables or parameters.
- `noFallthroughCasesInSwitch` is enforced.
- Prefer `.ts` for new files. Some legacy files use `.js`.
- Use `@ts-expect-error` (not `@ts-ignore`) when type suppression is unavoidable, and include a comment explaining why.

## Naming Conventions

| Kind              | Convention         | Examples                                  |
| ----------------- | ------------------ | ----------------------------------------- |
| Vue components    | PascalCase         | `ScoreSetView.vue`, `EntityLink.vue`      |
| Functions         | camelCase          | `beginAuthentication`, `parseVariant`     |
| Variables/refs    | camelCase          | `userProfile`, `isAuthenticated`          |
| Constants         | UPPER_SNAKE_CASE   | `PUBLIC_PATHS`, `ORCID_ID_REGEX`          |
| Composables       | `use` prefix       | `useAuth`, `useItem`                      |
| Screen components | Descriptive suffix | `*View`, `*Screen`, `*Creator`, `*Editor` |

## Import Conventions

- Always use the `@/` path alias (maps to `src/`). Never use relative paths.
- Always include file extensions: `.vue` for components, `.ts` for TypeScript modules.
- Group imports: Vue/library imports first, then project imports.

```ts
// External libraries
import {computed, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import _ from 'lodash'
import axios from 'axios'

// Project imports
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import useAuth from '@/composition/auth'
import config from '@/config'
```

## File Organization

- **Components**: `.vue` single-file components, always with `<script lang="ts">`.
- **Libraries/utilities**: `.ts` files in `src/lib/`.
- **Composables**: `.ts` files in `src/composables/` (new) or `src/composition/` (legacy).
- **Store modules**: In `src/store/modules/`.
- **Types**: Auto-generated API types in `src/schema/openapi.d.ts`. Custom types co-located with their usage.

## General Guidelines

- Do not add semicolons.
- Do not add trailing commas.
- Do not add spaces inside curly braces for imports or object literals.
- Keep lines under 120 characters.
- Prefer `const` over `let`. Never use `var`.
- Use template literals for string interpolation.
- Use `async`/`await` over raw promises.
- Use lodash utilities (`_.get`, `_.isString`, `_.isEmpty`, etc.) for data manipulation — the library is already a dependency.
