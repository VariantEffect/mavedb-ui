import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip';
import {createApp} from 'vue'

import App from '@/App.vue'
import {installAxiosAuthHeaderInterceptor} from '@/lib/auth'
import {initializeAuthentication as initializeOrcidAuthentication} from '@/lib/orcid'
import router from '@/router'
import store from '@/store'
import vueComponentId from '@/vueComponentId'

import 'primevue/resources/themes/mdc-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

// Check localStorage in case the user is already logged in.
initializeOrcidAuthentication()

// Provide a smooth migration path from vue-router's hash navigation mode to its history navigation mode. If the user
// arrived via an old bookmark that uses the URL fragment (hash) for routing, redirect to the corresponding current URL.
router.beforeEach((to) => {
  const redirectPathAndQuery = to.hash.split('#')[1]
  if (redirectPathAndQuery) {
    const [redirectPath, redirectQueryStr] = redirectPathAndQuery.split('?', 2)
    const redirectQuery = redirectQueryStr ? Object.fromEntries(new URLSearchParams(redirectQueryStr)) : undefined

    // Attempt to resolve the path using vue-router. If the router finds a matching named route, then the path
    // represents a valid screen, and we should redirect the user to that screen's current URL.
    if (router.resolve({path: redirectPath})?.name) {
      return {path: redirectPath, query: redirectQuery}
    }
  }
})

createApp(App)
    .use(router)
    .use(store)
    .use(PrimeVue)
    .use(ConfirmationService)
    .use(ToastService)
    .use(vueComponentId)
    .directive('tooltip', Tooltip)
    .mount('#app')

// Monkey-patch Axios so that all requests will have the user's credentials.
installAxiosAuthHeaderInterceptor()
