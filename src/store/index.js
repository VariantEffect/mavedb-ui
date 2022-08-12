import axios from 'axios'
import {createStore} from 'vuex'

import config from '@/config'
import {oidc} from '@/lib/auth'
import authModule from '@/store/modules/auth'
import layoutModule from '@/store/modules/layout'

let store = createStore({
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    auth: authModule,
    layout: layoutModule
  }
})

export default store

export async function initAuthStore() {
  if (oidc.isAuthenticated) {
    const response = await axios.get(`${config.apiBaseUrl}/users/me`)
    console.log(response)
    if (response?.data) {
      store.dispatch('auth/loggedIn', {orcidProfile: oidc.user.profile, roles: response?.data?.roles || []})
    }
  }
}

export function removeStoreModule(storeModuleNamespace) {
  store.unregisterModule(storeModuleNamespace)
}

export function removeModulesWithPrefix(prefix) {
  for (const namespace in store.state) {
    if (namespace.startsWith(prefix)) {
      removeStoreModule(namespace)
    } else if (namespace != 'auth') {
      store.dispatch(namespace + '/reset')
    }
  }
}

export function resetAllModules() {
  for (const namespace in store.state) {
    store.dispatch(namespace + '/reset')
  }
}
