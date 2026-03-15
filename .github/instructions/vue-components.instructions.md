# Vue Component Patterns

## Component Definition

All components use Vue 3's `defineComponent` with the Options API. The project does **not** use `<script setup>` syntax.

```vue
<template>
  <!-- Template content -->
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MyComponent',
  components: {
    /* child components */
  },
  props: {
    itemId: {type: String, required: true}
  },
  setup() {
    // ONLY for composable calls (useToast, useScopedId, useItem, etc.)
    // Return composable results so they are available to the rest of the component.
    return {toast: useToast()}
  },
  data() {
    return {
      /* reactive data */
    }
  },
  computed: {
    /* computed properties */
  },
  watch: {
    /* watchers */
  },
  methods: {
    /* methods */
  }
})
</script>
```

### Key points

- Always include `name` in `defineComponent`.
- Use `<script lang="ts">` for TypeScript support.
- **Use the Options API exclusively** — reactive data in `data()`, derived values in `computed`, handler functions in `methods`, and side-effect watchers in `watch`. Do not define these in `setup()`.
- **`setup()` is reserved for composable calls only** (e.g. `useToast()`, `useScopedId()`, `useItem()`). If a component has no composable calls, omit `setup()` entirely.
- Props use Vue's runtime type declarations (`type: String`, `type: Object as PropType<T>`).

## Component Categories

### Screen Components (`src/components/screens/`)

Top-level route components. Named with suffixes: `*View`, `*Screen`, `*Creator`, `*Editor`.

- Wrap content in `<MvLayout>` for consistent page structure.
- Receive route params via `props` configuration in the router.
- May use `useItem()` for loading a single entity, or `useAutocomplete()` for search/autocomplete fields.

### Common Components (`src/components/common/`)

Reusable UI primitives: `EntityLink`, `FlexDataTable`, `PageLoading`, `MvSelectList`, `MvCollapsible`, `MvLoader`, `MvScoreSetRow`, `MvSearchFilters`, etc.

### Layout Components (`src/components/layout/`)

App shell components: `MvLayout`, `MvNavBar`, `MvFooter`.

### Form Section Components (`src/components/forms/`)

Reusable form sections shared between creator (wizard) and editor (card) pages. Each supports a `wizardMode` prop:

- **Wizard mode** (`wizardMode=true`): renders fields inside `.wizard-row` layout with `.wizard-help` (left) and `.wizard-field` (right) columns.
- **Flat mode** (default): renders fields directly for use inside editor cards.

Key section components:

- `ExperimentFields` — title, description, abstract, methods, DOIs, publications, contributors, raw reads, extra metadata
- `KeywordFields` — keyword selection with optional descriptions
- `ScoreSetFields` — score set metadata (title, license, publications, etc.)
- `ScoreSetContextFields` — parent experiment, supersedes/meta-analysis context
- `TargetFields` — per-target configuration (sequence/accession, taxonomy, identifiers)
- `VariantScoreFields` — score/count file uploads with column metadata

Low-level field components:

- `MvFloatField` — FloatLabel wrapper with scoped slot providing `id`, `errorId`, and `invalid` to the caller's input component
- `MvMarkdownField` — Edit/Preview tabs for markdown textarea
- `MvTagField` — Multi-value chip AutoComplete
- `MvUploadField` — File upload drop zone

### Feature Components (`src/components/`)

Larger feature-specific components in the root components directory: `CalibrationEditor`, `ScoreSetHeatmap`, `ScoreSetHistogram`, `AssayFactSheet`, etc.

## Composables and Composition Functions

### Older pattern: `src/composition/`

Functions like `useItem()`, `useAuth()`. These interact with Vuex and return objects with reactive properties and methods. The `useItem()` composable dynamically registers a Vuex module to manage fetching and caching a single API resource.

```ts
// Usage in a component's setup function
setup: (props) => useItem({itemTypeName: props.entityType})
```

### Newer pattern: `src/composables/`

Standard Vue 3 composables. New composables should be placed here. Each composable follows a consistent contract: return reactive state + methods, no lifecycle coupling.

Key composables:

- `use-autocomplete.ts` — lightweight search/autocomplete (replaces `useItems()` for form fields)
- `use-publication-identifiers.ts` — publication identifier state, autocomplete search, primary/secondary selection, and payload building
- `use-validation-errors.ts` — unified client/server validation error map with auto-scroll to first error
- `use-experiment-keywords.ts` — keyword state management for experiment creator/editor forms
- `use-keyword-options.ts` — wraps `useAutocomplete` for all 13 keyword types
- `use-calibration-editor.ts` — draft calibration state, dirty tracking, validation, and save logic
- `use-calibration-dialog.ts` — calibration editor dialog open/close state
- `use-json-file-field.ts` — JSON file upload field with parsing and validation
- `entity-cache.ts` — shared reactive cache for entity lookups (score sets, experiments) with TTL and deduplication
- `scoped-id.ts` — generates unique IDs for form accessibility

## PrimeVue Components

The project uses PrimeVue 4 extensively. Common PrimeVue components in use:

- Layout: `Card`, `Panel`, `Accordion`, `TabView`, `Dialog`
- Forms: `InputText`, `Textarea`, `Dropdown`, `Checkbox`, `Calendar`
- Data: `DataTable`, `Column`
- Feedback: `Toast`, `ConfirmDialog`, `Message`
- Navigation: `Button`, `Menu`, `Toolbar`
- Overlay: `Tooltip` (registered as a global directive)

When adding UI elements, prefer PrimeVue components over custom implementations.

## Template Conventions

- Use PrimeVue components for UI elements.
- Use Tailwind utility classes for layout, spacing, typography, and other styling.
- Vue template attributes must be in **alphabetical order** (enforced by ESLint rule `vue/attributes-order`).
- Use `v-if` / `v-else` for conditional rendering, `v-for` with `:key` for lists.

## Importing Components

Always use the `@/` path alias and always include the file extension (`.vue` for components, `.ts` for TypeScript modules):

```ts
import MvLayout from '@/components/layout/MvLayout.vue'
import EntityLink from '@/components/common/EntityLink.vue'
import useItem from '@/composition/item.ts'
```
