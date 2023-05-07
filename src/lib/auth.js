import axios from 'axios'
import _ from 'lodash'
import oidcClient from 'oidc-client'
import {createOidcAuth, SignInType} from 'vue-oidc-client/vue3'

import config from '@/config'
import store from '@/store/index'

// Notice the final '/'.
const appUrl = `${window.location.origin}/`

function monkeyPatchOidcClient() {
  const Log = oidcClient.Log
  oidcClient.UserManager.prototype._signinStart = function(args, navigator, navigatorParams = {}) {
    return navigator.prepare(navigatorParams).then(handle => {
        Log.debug("UserManager._signinStart: got navigator window handle");

        return this.createSigninRequest(args).then(signinRequest => {
            Log.debug("UserManager._signinStart: got signin request");

            navigatorParams.url = signinRequest.url;
            navigatorParams.id = signinRequest.state.id;

            // This is our patch:
            navigatorParams.url = navigatorParams.url.replace('id_token', 'token')

            return handle.navigate(navigatorParams);
        }).catch(err => {
            if (handle.close) {
                Log.debug("UserManager._signinStart: Error after preparing navigator, closing navigator window");
                handle.close()
            }
            throw err
        })
    })
  }
}

monkeyPatchOidcClient()

// SignInType can be Window or Popup
export const oidc = createOidcAuth('mavedb', SignInType.Popup, appUrl , {
  authority: 'https://orcid.org/',
  client_id: 'APP-GXFVWWJT8H0F50WD',
  response_type: 'id_token', // Can be 'token id_token' in other contexts.
  scope: 'openid', // Formerly worked as 'openid profile'. Can be 'openid profile email api' in other contexts..
  automaticSilentRenew: true,
  popup_redirect_uri: `${appUrl}signed-in.html`,
  post_logout_redirect_uri: `${appUrl}signed-out.html`
})

// This can be used to include authorization headers in HTTP requests that are not made using Axios.
export function authHeader() {
  const token = _.get(oidc, 'user.id_token')
  if (token) {
    return {Authorization: `Bearer ${token}`}
  } else {
    return {}
  }
}

export function installAxiosAuthHeaderInterceptor() {
  axios.interceptors.request.use((config) => {
    const token = _.get(oidc, 'user.id_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
}

oidc.events.addUserLoaded(async function(user) {
  const response = await axios.get(`${config.apiBaseUrl}/users/me`)
  if (response?.data) {
    store.dispatch('auth/loggedIn', {orcidProfile: user.profile, roles: response?.data?.roles || []})
  } else {
    store.dispatch('auth/loggedOut')
  }
})

oidc.events.addUserSignedOut(function() {
  store.dispatch(`auth/loggedOut`)
})

/*
import jwt from 'jwt'

const ORCID_JWT_PUBLIC_KEY = 'jxTIntA7YvdfnYkLSN4wk__E2zf_wbb0SV_HLHFvh6a9ENVRD1_rHK0EijlBzikb-1rgDQihJETcgBLsMoZVQqGj8fDUUuxnVHsuGav_bf41PA7E_58HXKPrB2C0cON41f7K3o9TStKpVJOSXBrRWURmNQ64qnSSryn1nCxMzXpaw7VUo409ohybbvN6ngxVy4QR2NCC7Fr0QVdtapxD7zdlwx6lEwGemuqs_oG5oDtrRuRgeOHmRps2R6gG5oc-JqVMrVRv6F9h4ja3UgxCDBQjOVT1BFPWmMHnHCsVYLqbbXkZUfvP2sO1dJiYd_zrQhi-FtNth9qrLLv3gkgtwQ'
const key = Buffer.from(ORCID_JWT_PUBLIC_KEY, 'base64')

function validateJwt() {
  return jwt.verify(oidc.user.id_token, ORCID_JWT_PUBLIC_KEY, {
    algorithms: ['RS256']
  })
}

function decodeIdToken() {
  return jwt.decode(oidc.user.id_token)
}
*/
