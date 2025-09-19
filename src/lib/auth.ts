/** Authentication/authorization utilities */

import axios from 'axios'

import config from '@/config'
import {idToken as orcidIdToken, isAuthenticated as orcidIsAuthenticated, signOut as orcidSignOut} from '@/lib/orcid'
import store from '@/store/index'
import authStore from '@/store/modules/auth'

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
          // @ts-ignore: We need to pass a custom property in the request configuration.
          await axios.get(`${config.apiBaseUrl}/users/me`, {isSessionCheck: true})
        } catch (error: any) {
          if (error.response?.status == 401 || error.response?.status == 403) {
            // The user's session has expired. This may happen after several requests issued around the same time, so
            // only take action if the user has not yet been signed out.
            if (orcidIsAuthenticated.value) {
              orcidSignOut()
              store.dispatch('toast/enqueueToast', {
                severity: 'info',
                summary: 'Your ORCID session has ended. Please log in again.',
                life: 5000
              })
            }
          }
        }
      }
      return Promise.reject(error)
    }
  )
}
