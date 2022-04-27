import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip';
import {createApp} from 'vue'

import App from '@/App.vue'
import {installAxiosAuthHeaderInterceptor, oidc} from '@/lib/auth'
import router from '@/router'
import store from '@/store'
import vueComponentId from '@/vueComponentId'

import 'primevue/resources/themes/mdc-light-indigo/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

oidc.startup().then(ok => {
    console.log(ok)
  if (ok) {
    createApp(App)
        .use(router)
        .use(store)
        .use(PrimeVue)
        .use(ConfirmationService)
        .use(ToastService)
        .use(vueComponentId)
        .directive('tooltip', Tooltip)
        .mount('#app')

    installAxiosAuthHeaderInterceptor()
  }
})
