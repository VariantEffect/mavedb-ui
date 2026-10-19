---
paths:
  - src/api/**
  - src/composables/**
  - src/composition/**
  - src/lib/**
  - src/store/**
---

# Data and state

- Add API calls as typed functions in the matching `src/api/mavedb/` module (or a new one), typed from `src/schema/openapi.d.ts`.
- For autocomplete and search, use `useAutocomplete()`. It calls axios directly; `useItems()` is the older Vuex-backed version.
- `useItem()` and `useItems()` register a Vuex module per component under a UUID namespace, and unregister it on unmount.
- Vuex is legacy and Pinia has no stores yet. Put new shared state in a Pinia store, in the setup-function style.
- A maintenance interceptor in `use-maintenance.ts` handles 502/503/504 and network failures globally; callers don't need to.
- Convert FastAPI validation errors with `parseApiValidationErrors()` from `src/lib/form-validation.ts`.
