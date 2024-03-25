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
