/** Authentication/authorization utilities */

import axios from 'axios'

import {idToken as orcidIdToken} from '@/lib/orcid'
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
 * Add a bearer authorization token to all requests made using Axios.
 *
 * If you wish to supply MaveDB credentials with all Axios requests, call this function at application startup time (or
 * page load time, in a single-page application).
 */
export function installAxiosAuthHeaderInterceptor() {
  axios.interceptors.request.use((config) => {
    const token = orcidIdToken.value
    const activeRoles = authStore.state.activeRoles

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      config.headers['X-Active-Roles'] = activeRoles
    }
    return config
  })
}
