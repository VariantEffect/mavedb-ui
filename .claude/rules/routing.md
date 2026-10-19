---
paths:
  - src/router/**
  - src/lib/auth.ts
  - src/lib/orcid.ts
  - src/composition/auth.ts
  - src/main.js
---

# Routing and auth

- Mark routes that need sign-in with `meta: {requiresAuth: true}`. The `beforeEach` guard in `src/router/index.ts` saves the path to `localStorage` and starts ORCID sign-in.
- A second `beforeEach` in `main.js` catches a variant URN in a score set path (`/score-sets/<urn>#<n>`, where the `#` would otherwise start a URL fragment) and redirects to the score set with `?variant=<full urn>`.
- Sign-in: `lib/orcid.ts` runs the OAuth flow and holds the token, `store/modules/auth.ts` fetches roles from `/users/me`, and `useAuth()` combines the two.
- The response interceptor in `lib/auth.ts` handles 401 and 403 by checking `/users/me`, so a failed request doesn't always mean the session expired.
