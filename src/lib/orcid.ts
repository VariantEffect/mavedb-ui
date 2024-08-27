/**
 * Module that handles ORCID authentication via OAuth2.
 *
 * "Three-legged OAuth" is used here. We originally tried using third-party libaries -- primarily vuex-oidc, which in
 * turn uses oidc-client or oidc-client-ts for the actual OAuth2/OIDC authentication process. We ran into issues with
 * all OAuth2 and OIDC authentication flows:
 *
 * - With OIDC's implicit flow, the client does not need to manage a client secret; this is good for single-page
 *   applications whose source code is visible. This flow is supported by vuex-oidc v3 via oidc-client, though it is no
 *   no longer supported by the supported branches of these projects. However, the access token has a limited lifespan,
 *   and ORCID does not seem to support token renewal. (It does not return a renewal token, and its renew endpoint has
 *   an X-Frame-Options header that prohibits use in an iframe, so in any case we cannot renew silently.) So the user is
 *   logged out after 10 minutes.
 * - The preferred option would be OIDC's authorization code flow with PKCE, which is more secure than the implicit flow
 *   and still does not require a client secret. However, ORCID does not support PKCE. Plans to support it seem to have
 *   stalled. (See https://github.com/ORCID/ORCID-Source/issues/5977.)
 * - So we have opted to use three-legged authentication, which requires participation of the MaveDB API. In this flow,
 *   the browser client first obtains a code when the user signs into ORCID and grants permissions. It sends this code
 *   to the MaveDB API, which makes a second request to ORCID, this time exchanging the code and MaveDB's client secret
 *   for an access token and, in addition, the ID token (JWT) that we will subsequently use for authorization. These
 *   have a very long lifespan (which ORCID's OAuth2 service returns in the expires_in parameter, measured in seconds).
 *   Three-leggged authentication is not supported by oidc-client or oidc-client-ts, so the present module implements
 *   it.
 *
 * We could combine this module with the auth module that keeps track of user roles, but keeping the two distinct allows
 * us to provide authentication methods other than ORCID.
 *
 * This module is not normally accessed directly by Vue components; instead, they should use lib/auth.ts.
 */

import axios from 'axios'
import {v4 as uuidv4} from 'uuid'
import {computed, ref, Ref} from 'vue'

import config from '../config'

export interface OidcUserProfileBase {
  auth_time: number
  family_name: string
  given_name: string
  id: string
  jti: string
  sub: string
}

export const ORCID_ID_REGEX = /^\d{4}-\d{4}-\d{4}-(\d{4}|\d{3}X)$/

// Notice the final '/'.
const appUrl = `${window.location.origin}/`

interface AuthState {
  /** A JWT identifying the current user. User details can be obtained by decoding it. */
  idToken: string | null
}

function getAuthState(): AuthState {
  return {
    idToken: window.localStorage.getItem('orcidAuthState.idToken')
  }
}

/** Decode a JWT payload, without verifying the JWT. */
function getJwtPayload(jwt: string) {
  try {
    return JSON.parse(atob(jwt.split('.')[1]))
  } catch {
    return null
  }
}

export const idToken: Ref<string | null> = ref(null)
export const isAuthenticated = computed(() => idToken.value != null)
export const userProfile = computed((): OidcUserProfileBase => idToken.value ? getJwtPayload(idToken.value) : null)

/** Initialize the authentication mechanism by checking whether the user is already authenticated. */
export function initializeAuthentication() {
  const authState = getAuthState()
  idToken.value = authState.idToken
}

/** Clear any ID token that has been set, thereby performing a soft (client-side-only) logout. */
function clearIdToken() {
  window.localStorage.removeItem('orcidAuthState.idToken')
  idToken.value = null
}

function setIdToken(newIdToken: string) {
  window.localStorage.setItem('orcidAuthState.idToken', newIdToken)
  idToken.value = newIdToken
}

/**
 * Begin the sign-in process by sending the user to ORCID's sign-in page.
 *
 * We send the following parameters to ORCID:
 * - client_id: MaveDB's OAuth2/OIDC client ID for ORCID, which is not a secret
 * - redirect_uri: The URI to which the user should be redirected after sign-in
 * - scope=openid: A valie indicating that we want an OpenID ID token
 * - state: A random string like a nonce that can be used for CSRF prevention
 * - prompt=login: A value indicating that we want the user to be presented with a login screen even if she is
 *   already logged into ORCID. We do this because we cannot fully log the user out of ORCID after the session is
 *   ended, but we want to allow a different user to sign in on the same browser.
 * - response_mode=query
 */
export function beginAuthentication() {
  const oauthBaseUrl = 'https://orcid.org/oauth'
  const oauthProviderUrl = new URL(`${oauthBaseUrl}/authorize`);

  const oauthState = uuidv4() // Can be used to prevent CSRF attacks.
  oauthProviderUrl.searchParams.append('client_id', config.orcidClientId)
  oauthProviderUrl.searchParams.append('redirect_uri', `${appUrl}oidc-callback`)
  oauthProviderUrl.searchParams.append('response_type', 'code')
  oauthProviderUrl.searchParams.append('scope', 'openid')
  oauthProviderUrl.searchParams.append('state', oauthState)
  oauthProviderUrl.searchParams.append('prompt', 'login')
  oauthProviderUrl.searchParams.append('response_mode', 'query')

  window.location.href = oauthProviderUrl.href
}

/**
 * On the callback page, continue the sign-in process. Call the MaveDB API to exchange the code for an access token and
 * ID token.
 */
export async function continueAuthenticationFromRedirect() {
  const code = new URLSearchParams(window.location.search).get('code')
  const apiEndpointUrl = `${config.apiBaseUrl}/orcid/token`
  let response = null
  try {
    response = await axios.post(apiEndpointUrl, {
      code,
      redirectUri: `${appUrl}oidc-callback`
    })
  } catch (e: any) {
    response = e.response || { status: 500 }
  }
  if (response.status == 200) {
    const newIdToken = response.data?.idToken
    setIdToken(newIdToken)
    return '/'
  } else {
    throw 'Authentication error'
  }
}

/**
 * Sign out by removing user credentials from the client.
 *
 * ORCID does not support full sign-out, so the user will remain logged into ORCID for any other applications that
 * may try to authenticate (or may already be authenticated). For MaveDB, we require ORCID to present the login
 */
export function signOut() {
  clearIdToken()
}
