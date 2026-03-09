# Vue Component Patterns

## Component Definition

All components use Vue 3's `defineComponent` with the Composition API via the `setup` function. The project does **not** use `<script setup>` syntax.

```vue
<template>
  <!-- Template content -->
</template>

<script lang="ts">
import {defineComponent, computed, ref, watch} from 'vue'

export default defineComponent({
  name: 'MyComponent',
  components: {
    /* child components */
  },
  props: {
    itemId: {type: String, required: true}
  },
  setup(props) {
    // Composition API logic here
    return {
      /* exposed bindings */
    }
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
- The `setup` function is used alongside Options API properties (`data`, `computed`, `watch`, `methods`). Both patterns coexist — `setup` returns reactive bindings that merge with Options API properties.
- Props use Vue's runtime type declarations (`type: String`, `type: Object as PropType<T>`).

## Component Categories

### Screen Components (`src/components/screens/`)

Top-level route components. Named with suffixes: `*View`, `*Screen`, `*Creator`, `*Editor`.

- Wrap content in `<MvLayout>` for consistent page structure.
- Receive route params via `props` configuration in the router.
- May use `useItem()` or `useItems()` composition functions to load data.

### Common Components (`src/components/common/`)

Reusable UI primitives: `EntityLink`, `FlexDataTable`, `PageLoading`, `MvSelectList`, `MvCollapsible`, `MvLoader`, `MvScoreSetRow`, `MvSearchFilters`, etc.

### Layout Components (`src/components/layout/`)

App shell components: `MvLayout`, `MvNavBar`, `MvFooter`.

### Feature Components (`src/components/`)

Larger feature-specific components in the root components directory: `CalibrationEditor`, `ScoreSetHeatmap`, `ScoreSetHistogram`, `AssayFactSheet`, etc.

## Composables and Composition Functions

### Older pattern: `src/composition/`

Functions like `useItem()`, `useItems()`, `useAuth()`. These often interact with Vuex and return objects with reactive properties and methods. The `useItem()` composable dynamically registers a Vuex module to manage fetching and caching a single API resource.

```ts
// Usage in a component's setup function
setup: (props) => useItem({itemTypeName: props.entityType})
```

### Newer pattern: `src/composables/`

Standard Vue 3 composables. New composables should be placed here.

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

Always use the `@/` path alias:

```ts
import MvLayout from '@/components/layout/MvLayout.vue'
import EntityLink from '@/components/common/EntityLink.vue'
import useItem from '@/composition/item'
```
