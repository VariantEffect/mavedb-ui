// @ts-expect-error It's troublesome to get types for useStore; see below for more details.
import {createStore} from 'vuex'

import authModule from '@/store/modules/auth'
import toastModule from '@/store/modules/toast'

// Unfortunately, typed Vuex stores are painful to use, especially with multiple modules. We'll continue using any for
// now. Now that we do not use a Vuex module for authentication, we can migrate to Pinia.

const store = createStore({
  state: {
    routeProps: {
      galaxyUrl: localStorage.getItem('galaxyUrl'),
      toolId: localStorage.getItem('toolId'), 
      requestFromGalaxy: localStorage.getItem('requestFromGalaxy'), 
    },
  },
  mutations: {
    setRouteProps(state: any, props: any) {
      state.routeProps = props;
      localStorage.setItem('galaxyUrl', props.galaxyUrl);
      localStorage.setItem('toolId', props.toolId);
      localStorage.setItem('requestFromGalaxy', props.requestFromGalaxy);
    },
  },
  actions: {
  },
  modules: {
    auth: authModule,
    toast: toastModule
  }
})

export default store
