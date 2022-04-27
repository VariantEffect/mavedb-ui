import {createStore} from 'vuex'
import layoutModule from './modules/layout'
// import config from '@/config'

let store = createStore({
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    layout: layoutModule,
  }
})

export default store

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
