---
paths:
  - src/components/**
---

# Components

- Screens (`src/components/screens/`, named `*View`, `*Screen`, `*Creator` or `*Editor`) wrap their content in `MvLayout` and get route params as props from the router.
- Reach for a PrimeVue component before writing a custom one. Shared components in `common/` are prefixed `Mv`.
- Form sections in `src/components/forms/` serve both the creator wizard and the editor cards. Pass `wizardMode` for the wizard layout; leave it off in editors.
- Read auth state through `useAuth()` from `@/composition/auth`, not the store or `lib/orcid.ts`.
- New composables go in `src/composables/`. `src/composition/` is the older Vuex-backed set (`useItem`, `useItems`, `useAuth`).
