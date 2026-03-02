# Routing and Authentication

## Vue Router Configuration

The router is defined in `src/router/index.ts` and uses **history mode** (`createWebHistory`).

### Route categories

| Category      | Example paths                                                        | Auth required |
| ------------- | -------------------------------------------------------------------- | ------------- |
| Public        | `/`, `/search`, `/about`, `/help`, `/docs`, `/statistics`            | No            |
| Protected     | `/dashboard`, `/settings`, `/create-experiment`, `/create-score-set` | Yes           |
| Entity views  | `/experiments/:urn`, `/score-sets/:urn`, `/experiment-sets/:urn`     | No            |
| Entity edit   | `/experiments/:urn/edit`, `/score-sets/:urn/edit`                    | Yes           |
| Conditional   | `/mavemd`, `/variants/:clingenAlleleId` (clinical features flag)     | No            |
| Auth callback | `/oidc-callback`, `/oidc-callback-error`                             | No            |

### Route props

Entity routes pass route params as component props via the router's `props` function:

```ts
{
  path: '/score-sets/:urn',
  component: ScoreSetView,
  props: (route) => ({itemId: route.params.urn})
}
```

### Authentication guard

A global `router.beforeEach` guard checks `meta.requiresAuth`. If the user is not authenticated, the current path is saved to `localStorage` and ORCID authentication begins:

```ts
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    localStorage.setItem('redirectAfterLogin', to.fullPath)
    beginAuthentication()
  } else {
    next()
  }
})
```

### Hash-to-history migration

A second `beforeEach` guard in `src/main.js` handles legacy hash-based URLs (from a previous Vue Router configuration) by redirecting them to the equivalent history-mode URL.

### Feature-flagged routes

Routes for clinical features (`/mavemd`, `/variants/:id`, `/variant-measurements/:urn`) are conditionally included based on `config.CLINICAL_FEATURES_ENABLED`:

```ts
...(config.CLINICAL_FEATURES_ENABLED ? [{ path: '/mavemd', component: SearchVariantsScreen }] : [])
```

## Authentication (ORCID OAuth2)

### Flow

1. User clicks "Sign In" which calls `beginAuthentication()` from `lib/orcid.ts`.
2. Browser redirects to ORCID's OAuth2 authorization endpoint.
3. ORCID redirects back to `/oidc-callback` with an authorization code.
4. The `OidcCallback` component exchanges the code for tokens via the MaveDB API.
5. The ID token (JWT) is stored in `localStorage` and decoded for user profile info.
6. The auth Vuex module fetches user roles from `/users/me`.

### Key files

- `src/lib/orcid.ts` — OAuth2 flow, token management, reactive auth state
- `src/lib/auth.ts` — Axios interceptors for `Authorization` and `X-Active-Roles` headers
- `src/store/modules/auth.ts` — Vuex module for roles management
- `src/composition/auth.ts` — `useAuth()` composable that unifies the above

### Reactive auth state

From `lib/orcid.ts`:

- `isAuthenticated` — `Ref<boolean>`
- `idToken` — Raw JWT string
- `userProfile` — Decoded JWT payload (ORCID ID, name, etc.)

### Authorization headers

`lib/auth.ts` installs two Axios interceptors:

1. **Request interceptor**: Adds `Authorization: Bearer <token>` and `X-Active-Roles` headers to all API requests.
2. **Response interceptor**: Handles 401 responses by prompting re-authentication.

### Using auth in components

Always use the `useAuth()` composable:

```ts
import useAuth from '@/composition/auth'

// In setup()
const {userIsAuthenticated, userProfile, roles, activeRoles, signIn, signOut} = useAuth()
```

### Dev server HTTPS requirement

ORCID requires HTTPS callback URLs. The Vite dev server uses `@vitejs/plugin-basic-ssl` to serve over HTTPS. Ports 8081 (dev) and 8082 (preview) are registered with ORCID as valid redirect URIs and must be available (`strictPort: true`).
