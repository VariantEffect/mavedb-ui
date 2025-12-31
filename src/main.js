import {createPinia} from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'
import {initRestClient} from 'rest-client-vue'
import {createApp} from 'vue'
import {createHead} from '@unhead/vue/client'
import {TemplateParamsPlugin} from 'unhead/plugins'
import Aura from '@primevue/themes/aura'
import { definePreset, palette } from '@primeuix/themes'

import App from '@/App.vue'
import config from '@/config'
import {installAxiosAuthHeaderInterceptor, installAxiosUnauthorizedResponseInterceptor} from '@/lib/auth'
import {initializeAuthentication as initializeOrcidAuthentication} from '@/lib/orcid'
import router from '@/router'
import store from '@/store'

import 'primeicons/primeicons.css'

/* add fontawesome core */
/* import all the icons in Free Solid, Free Regular, and Brands styles */
import {library} from '@fortawesome/fontawesome-svg-core'
import {fas} from '@fortawesome/free-solid-svg-icons'
import {far} from '@fortawesome/free-regular-svg-icons'
import {fab} from '@fortawesome/free-brands-svg-icons'

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

const head = createHead({
  plugins: [TemplateParamsPlugin],
  init: [
    {
      titleTemplate: '%siteName %separator %s',
      templateParams: {
        separator: '|',
        siteName: import.meta.env.VITE_SITE_TITLE
      }
    }
  ]
})

const darkBluePalette = palette('#3f51b5')

const MaveDbTheme = definePreset(Aura, {
    semantic: {
        primary: {
            50: darkBluePalette[50],
            100: darkBluePalette[100],
            200: darkBluePalette[200],
            300: darkBluePalette[300],
            400: darkBluePalette[400],
            500: darkBluePalette[500],
            600: darkBluePalette[600],
            700: darkBluePalette[700],
            800: darkBluePalette[800],
            900: darkBluePalette[900],
            950: darkBluePalette[950],
        }
    },
    components: {
        button: {
          colorScheme: {
            light: {
              root: {
                warn: {
                  background: '{yellow.400}',
                  borderColor: '{yellow.400}',
                  color: '{black.900}',
                  hoverColor: '{black.900}',
                  hoverBackground: '{yellow.500}',
                  hoverBorderColor: '{yellow.500}',
                  activeColor: '{black.900}',
                  activeBackground: '{yellow.600}',
                  activeBorderColor: '{yellow.600}',
                },
              }
            },
            dark: {
              root: {
                warn: {
                  background: '{yellow.400}',
                  borderColor: '{yellow.400}',
                  color: '{black.900}',
                  hoverColor: '{black.900}',
                  hoverBackground: '{yellow.500}',
                  hoverBorderColor: '{yellow.500}',
                  activeColor: '{black.900}',
                  activeBackground: '{yellow.600}',
                  activeBorderColor: '{yellow.600}',
                },
              }
            },
          },
        }
    },
})

createApp(App)
  .use(router)
  .use(store)
  .use(createPinia())
  .use(head)
  .use(PrimeVue, {
    theme: {
        preset: MaveDbTheme,
        options: {
            prefix: 'p',
            darkModeSelector: '.dark-mode',
            cssLayer: false,
        }
    }
  })
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
