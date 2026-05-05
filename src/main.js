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

// ── PrimeVue Theme Palettes ─────────────────────────────────────
// These palette() calls generate full shade ramps (50–950) from a
// single base color. The base colors MUST match the corresponding
// CSS custom properties in app.css. See the sync table there.
//
//   palette source      CSS token             Role
//   '#78b793'           --color-sage          primary / success
//   '#f8971d'           --color-orange-cta    warn / CTA
//   '#D05353'           --color-danger        danger / destructive
//   '#4A80C4'           --color-info          info / informational
//   '#7E5DAF'           --color-help          help / calibration
const sagePalette = palette('#78b793')
const orangePalette = palette('#f8971d')
const dangerPalette = palette('#D05353')
const infoPalette = palette('#4A80C4')
const helpPalette = palette('#7E5DAF')

const MaveDbTheme = definePreset(Aura, {
    semantic: {
        primary: {
            50: sagePalette[50],
            100: sagePalette[100],
            200: sagePalette[200],
            300: sagePalette[300],
            400: sagePalette[400],
            500: sagePalette[500],
            600: sagePalette[600],
            700: sagePalette[700],
            800: sagePalette[800],
            900: sagePalette[900],
            950: sagePalette[950],
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#ffffff',
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#eeeeee',
                    300: '#e0e0e0',
                    400: '#bdbdbd',
                    500: '#9e9e9e',
                    600: '#757575',
                    700: '#616161',
                    800: '#424242',
                    900: '#212121',
                    950: '#121212',
                },
            },
        },
    },
    components: {
        togglebutton: {
          colorScheme: {
            light: {
              root: {
                background: '{surface.100}',
                checkedBackground: sagePalette[500],
                checkedBorderColor: sagePalette[500],
                checkedColor: '#ffffff',
                hoverBackground: '{surface.200}',
                hoverColor: '{surface.800}',
                borderColor: '{surface.100}',
                color: '{surface.600}',
              },
              content: {
                checkedBackground: sagePalette[500],
                checkedShadow: 'none',
              },
              icon: {
                checkedColor: '#ffffff',
              },
            }
          }
        },
        button: {
          colorScheme: {
            light: {
              root: {
                // Warn — amber/orange for CTA and cancel actions
                warn: {
                  background: orangePalette[400],
                  borderColor: orangePalette[400],
                  color: '#222',
                  hoverColor: '#222',
                  hoverBackground: orangePalette[500],
                  hoverBorderColor: orangePalette[500],
                  activeColor: '#222',
                  activeBackground: orangePalette[600],
                  activeBorderColor: orangePalette[600],
                },
                // Danger — softer red for destructive actions
                danger: {
                  background: dangerPalette[400],
                  borderColor: dangerPalette[400],
                  color: '#fff',
                  hoverColor: '#fff',
                  hoverBackground: dangerPalette[500],
                  hoverBorderColor: dangerPalette[500],
                  activeColor: '#fff',
                  activeBackground: dangerPalette[600],
                  activeBorderColor: dangerPalette[600],
                },
                // Success — sage green for positive/save actions
                success: {
                  background: sagePalette[400],
                  borderColor: sagePalette[400],
                  color: '#fff',
                  hoverColor: '#fff',
                  hoverBackground: sagePalette[500],
                  hoverBorderColor: sagePalette[500],
                  activeColor: '#fff',
                  activeBackground: sagePalette[600],
                  activeBorderColor: sagePalette[600],
                },
                // Info — dusty blue for informational actions
                info: {
                  background: infoPalette[400],
                  borderColor: infoPalette[400],
                  color: '#fff',
                  hoverColor: '#fff',
                  hoverBackground: infoPalette[500],
                  hoverBorderColor: infoPalette[500],
                  activeColor: '#fff',
                  activeBackground: infoPalette[600],
                  activeBorderColor: infoPalette[600],
                },
                // Help — soft purple for calibration/contextual help
                help: {
                  background: helpPalette[400],
                  borderColor: helpPalette[400],
                  color: '#fff',
                  hoverColor: '#fff',
                  hoverBackground: helpPalette[500],
                  hoverBorderColor: helpPalette[500],
                  activeColor: '#fff',
                  activeBackground: helpPalette[600],
                  activeBorderColor: helpPalette[600],
                },
                // Secondary — neutral surface tones
                secondary: {
                  background: '{surface.100}',
                  borderColor: '{surface.300}',
                  color: '{surface.700}',
                  hoverColor: '{surface.800}',
                  hoverBackground: '{surface.200}',
                  hoverBorderColor: '{surface.400}',
                  activeColor: '{surface.800}',
                  activeBackground: '{surface.300}',
                  activeBorderColor: '{surface.400}',
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
