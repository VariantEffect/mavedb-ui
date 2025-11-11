/** Authentication/authorization utilities */

import axios from 'axios'

import config from '@/config'
import {
  idToken as orcidIdToken,
  isAuthenticated as orcidIsAuthenticated,
  signOut as orcidSignOut,
  beginAuthentication as orcidBeginAuthentication
} from '@/lib/orcid'
import store from '@/store/index'
import authStore from '@/store/modules/auth'

const PUBLIC_PATHS = [
  '/',
  '/search',
  '/about',
  '/help',
  '/docs',
  '/oidc-callback',
  '/oidc-callback-error',
  '/statistics',
  '/mavemd',
  '/publication-identifiers',
  '/variants'
]

export interface AuthorizationHeader {
  /** The Authorization header value, typically a bearer token having the form "Bearer: <token>". */
  Authorization?: string
  /** The X-Active-Roles header value, which denotes the requested roles this client would like to assume.
   *  Is a comma separated list.
   */
  'X-Active-Roles'?: string[]
}

/**
 * Get authorization headers for inclusion in HTTP requests to the MaveDB API.
 *
 * Mosts MaveDB API requests are usually made using Axios, and authorization headers are automatically added to Axios
 * requests if {@link installAxiosAuthHeaderInterceptor} has been called. So this function is not typically used.
 *
 * @return An object containing one key-value pair that should be used as an authorization header, or an empty object if
 *   the user is not authenticated.
 */
export function authHeader(): AuthorizationHeader {
  const token = orcidIdToken.value
  const activeRoles = authStore.state.activeRoles

  if (token) {
    return {Authorization: `Bearer ${token}`, 'X-Active-Roles': activeRoles}
  } else {
    return {}
  }
}

/**
 * Determine whether a URL refers to a MaveDB API endpoint.
 */
function urlBelongsToApi(url: string) {
  return url.startsWith(config.apiBaseUrl)
}

/**
 * Determine whether a given path is publicly accessible without authentication.
 */
function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((publicPath) => {
    if (path === publicPath) return true
    if (path.startsWith(publicPath)) {
      const nextChar = path.charAt(publicPath.length)
      return nextChar === '/' || nextChar === '?' || nextChar === '#'
    }
    return false
  })
}

/**
 * Add a bearer authorization token to all requests to the MaveDB API made using Axios.
 *
 * Call this function at application startup time (or page load time, in a single-page application) to supply MaveDB
 * credentials with all Axios requests to MaveDB API endpoints.
 */
export function installAxiosAuthHeaderInterceptor() {
  axios.interceptors.request.use((config) => {
    // If the request URL belongs to the MaveDB API, add authorization headers.
    if (config.url && urlBelongsToApi(config.url)) {
      const token = orcidIdToken.value
      const activeRoles = authStore.state.activeRoles

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        config.headers['X-Active-Roles'] = activeRoles
      }
    }

    return config
  })
}

export function installAxiosUnauthorizedResponseInterceptor() {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (
        error &&
        !error.config?.isSessionCheck &&
        error.response?.status &&
        (error.response?.status == 401 || error.response?.status == 403)
      ) {
        try {
          // @ts-expect-error: We need to pass a custom property in the request configuration.
          await axios.get(`${config.apiBaseUrl}/users/me`, {isSessionCheck: true})
        } catch (sessionCheckError: unknown) {
          const checkError = sessionCheckError as {response?: {status?: number}}
          if (checkError.response?.status == 401 || checkError.response?.status == 403) {
            // The user's session has expired. This may happen after several requests issued around the same time, so
            // only take action if the user has not yet been signed out.
            if (orcidIsAuthenticated.value) {
              orcidSignOut()

              // Only auto-redirect if the user is NOT on a known public page
              // Since the API returns 404 for private content (security), we can't distinguish
              // between "doesn't exist" and "private", so we use route-based detection
              // TODO#558: Implement more accurate content visibility detection
              // - Add API endpoint for content metadata (exists, requiresAuth, contentType)
              // - Or use client-side heuristics (referrer, existing store data)
              // - This would eliminate false positives/negatives in edge cases
              const currentFullPath = window.location.pathname + window.location.search + window.location.hash

              if (!isPublicPath(currentFullPath)) {
                localStorage.setItem('redirectAfterLogin', currentFullPath)
                store.dispatch('toast/enqueueToast', {
                  severity: 'warn',
                  summary: 'Your ORCID session has ended. Redirecting to login...',
                  life: 1500
                })

                setTimeout(() => {
                  orcidBeginAuthentication()
                }, 1500)
              } else {
                // For public pages, just show a toast without auto-redirect
                store.dispatch('toast/enqueueToast', {
                  severity: 'warn',
                  summary: 'Your ORCID session has ended. Please log in again if needed.',
                  life: 5000
                })
              }
            }
          }
        }
      }
      return Promise.reject(error)
    }
  )
}
