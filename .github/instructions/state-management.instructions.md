# State Management

## Overview

The project is in the process of migrating from **Vuex 4** to **Pinia**. Both are installed and initialized in `src/main.js`. New state management code should prefer Pinia when possible.

## Vuex (Legacy)

### Store structure (`src/store/`)

```
store/
├── index.ts          # Root store with routeProps state and module registration
└── modules/
    ├── auth.ts       # User roles and authorization
    ├── toast.js      # Toast notification queue
    ├── item.ts       # Dynamic single-item loading (registered per-component)
    ├── items.js      # Dynamic collection loading (registered per-component)
    ├── layout.js     # UI layout state
    └── remote-data.js # Generic remote data fetching
```

### Root state

The root store holds `routeProps` (Galaxy integration parameters) and registers `auth` and `toast` as static modules.

### Dynamic module pattern

The `item.ts` and `items.js` modules are **not** statically registered. Instead, the `useItem()` and `useItems()` composables in `src/composition/` dynamically register Vuex modules with UUID-based namespaces at the component level:

```ts
// src/composition/item.ts.ts (simplified)
export default function useItem({itemTypeName}) {
  const store = useStore()
  const namespace = uuid()
  store.registerModule(namespace, itemModule)
  // Returns reactive properties bound to this namespace
  return {item, setItemId, ...}
}
```

This means each component instance that calls `useItem()` gets its own isolated state namespace. The module is unregistered when the component unmounts.

**Note:** `useItems()` is mostly superseded by `useAutocomplete()` (see below) for autocomplete/search patterns in form pages. `useItems()` is still used in `SettingsScreen.vue` for loading access keys. `useItem()` remains in active use for single-entity loading in editor pages.

**Note:** For API mutations (create, update, delete), prefer the typed functions in `src/api/mavedb/` modules over inline Axios calls. See `api-and-data.instructions.md` for details.

## useAutocomplete (Preferred for autocomplete/search)

The `useAutocomplete()` composable in `src/composables/use-autocomplete.ts` is a lightweight replacement for `useItems()` when fetching autocomplete suggestions or search results. It makes direct Axios calls with `AbortController` support instead of dynamically registering Vuex modules:

```ts
import {useAutocomplete} from '@/composables/use-autocomplete'

// In setup():
const pubSearch = useAutocomplete('/publication-identifiers/search', {method: 'POST'})
// Returns: { items: Ref<any[]>, loading: Ref<boolean>, search: (query) => void }

// In a method or template:
pubSearch.search(query) // triggers fetch
pubSearch.items // reactive suggestions list
```

Used across all form pages (ExperimentCreator, ExperimentEditor, ScoreSetCreator, ScoreSetEditor, CalibrationEditor) for: publication search, taxonomy search, target gene search, gene name/assembly lookups, license lists, keyword options, and score set search.

## Entity Cache (`src/composables/entity-cache.ts`)

A shared reactive cache for entity lookups (score sets, experiments, experiment sets) with a 5-minute TTL. Deduplicates concurrent requests for the same URN — if a fetch is already in-flight, subsequent callers wait for it rather than starting a duplicate request.

### Accessing Vuex from components

```ts
import {useStore} from 'vuex'

// In setup()
const store = useStore()
store.dispatch('auth/userChanged', userProfile)
store.state.auth.roles
store.commit('setRouteProps', props)
```

Note: Vuex types use `@ts-expect-error` on the `useStore` import due to the difficulty of typing multi-module Vuex stores in TypeScript.

## Pinia (Preferred for New Code)

Pinia is initialized in `src/main.js` via `createPinia()`. When creating new stores, use Pinia's composition API style:

```ts
import {defineStore} from 'pinia'
import {ref, computed} from 'vue'

export const useMyStore = defineStore('myStore', () => {
  const items = ref([])
  const count = computed(() => items.value.length)
  function addItem(item) {
    items.value.push(item)
  }
  return {items, count, addItem}
})
```

## Auth State

Authentication state flows through multiple layers:

1. **`lib/orcid.ts`** — Manages OAuth2 tokens in `localStorage`, exposes reactive refs (`isAuthenticated`, `idToken`, `userProfile`).
2. **`store/modules/auth.ts`** — Vuex module that fetches user roles from the API after login.
3. **`composition/auth.ts`** — Composable that combines both layers into a unified API for components (`useAuth()`).

Components should use `useAuth()` rather than accessing the store or ORCID module directly.

## Toast Notifications

Toast state is managed via the `store/modules/toast.js` Vuex module. Components dispatch toast actions to show notifications, which are rendered by PrimeVue's `Toast` component in the app shell.
