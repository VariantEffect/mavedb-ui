import axios from 'axios'
import _ from 'lodash'
import {createOidcAuth, SignInType} from 'vue-oidc-client/vue3'

// Notice the final '/'.
// const appUrl = 'https://localhost:8082/'
const appUrl = `${window.location.origin}/`

// SignInType can be Window or Popup
export const oidc = createOidcAuth('mavedb', SignInType.Popup, appUrl , {
  authority: 'https://orcid.org/',
  client_id: 'APP-GXFVWWJT8H0F50WD',
  response_type: 'id_token', // token id_token
  scope: 'openid profile', // 'openid profile email api'
  automaticSilentRenew: true
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

oidc.events.addUserLoaded(function(user) {
  console.log('access token:')
  console.log(oidc.accessToken)
  console.log('user loaded', user)
  console.log(user.id_token)
  console.log(user.profile.jti) // ???
  console.log(user.profile.family_name)
  console.log(user.profile.given_name)
  console.log(user.profile.sub) // ORCID iD
  // oidc.startSilentRenew()
  // you can interact with your Vuex store if you want to save some details
})

oidc.events.addUserSignedOut(function() {
  console.log('user signed out');
})
