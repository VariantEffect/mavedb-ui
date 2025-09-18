import {createPinia} from 'pinia'
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip';
import {initRestClient} from 'rest-client-vue'
import {createApp} from 'vue'

import App from '@/App.vue'
import config from '@/config'
import {installAxiosAuthHeaderInterceptor, installAxiosUnauthorizedResponseInterceptor} from '@/lib/auth'
import {initializeAuthentication as initializeOrcidAuthentication} from '@/lib/orcid'
import router from '@/router'
import store from '@/store'

import 'primevue/resources/themes/mdc-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

/* add fontawesome core */
/* import all the icons in Free Solid, Free Regular, and Brands styles */
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

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
    .use(createPinia())
    .use(PrimeVue)
    .use(ConfirmationService)
    .use(ToastService)
    .directive('tooltip', Tooltip)
    .mount('#app')

// Add the FontAwesome icons to the library so that they can be used in components.
library.add(fas, far, fab)

initRestClient({apiBaseUrl: config.apiBaseUrl})

// Monkey-patch Axios so that all requests will have the user's credentials.
installAxiosAuthHeaderInterceptor()
installAxiosUnauthorizedResponseInterceptor()
