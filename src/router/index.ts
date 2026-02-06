import {createRouter, createWebHistory} from 'vue-router'
import type {RouteLocationNormalized, RouteRecordRaw} from 'vue-router'

import AboutView from '@/components/screens/AboutView.vue'
import CollectionView from '@/components/screens/CollectionView.vue'
import CollectionsView from '@/components/screens/CollectionsView.vue'
import DashboardView from '@/components/screens/DashboardView.vue'
import DocumentationView from '@/components/screens/DocumentationView.vue'
import ExperimentCreator from '@/components/screens/ExperimentCreator.vue'
import ExperimentEditor from '@/components/screens/ExperimentEditor.vue'
import ExperimentSetView from '@/components/screens/ExperimentSetView.vue'
import ExperimentView from '@/components/screens/ExperimentView.vue'
import HelpScreen from '@/components/screens/HelpScreen.vue'
import HomeScreen from '@/components/screens/HomeScreen.vue'
import OidcCallback from '@/components/screens/OidcCallback.vue'
import OidcCallbackError from '@/components/screens/OidcCallbackError.vue'
import PublicationIdentifierView from '@/components/screens/PublicationIdentifierView.vue'
import ScoreSetCalibrationsView from '@/components/screens/ScoreSetCalibrationsView.vue'
import ScoreSetCreator from '@/components/screens/ScoreSetCreator.vue'
import ScoreSetEditor from '@/components/screens/ScoreSetEditor.vue'
import ScoreSetView from '@/components/screens/ScoreSetView.vue'
import SearchVariantsScreen from '@/components/screens/SearchVariantsScreen.vue'
import SearchView from '@/components/screens/SearchView.vue'
import SettingsScreen from '@/components/screens/SettingsScreen.vue'
import StatisticsView from '@/components/screens/StatisticsView.vue'
import {beginAuthentication, isAuthenticated} from '@/lib/orcid'
import VariantMeasurementScreen from '@/components/screens/VariantMeasurementScreen.vue'
import VariantScreen from '@/components/screens/VariantScreen.vue'
import WizardCompletionView from '@/components/screens/WizardCompletionView.vue'
import config from '@/config'
import store from '@/store'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeScreen,
    props: (route) => {
      const {galaxyUrl, toolId, requestFromGalaxy} = route.query
      const props = {
        galaxyUrl,
        toolId,
        requestFromGalaxy
      }
      store.commit('setRouteProps', props)
      return props
    }
  },
  {
    path: '/search',
    name: 'search',
    component: SearchView
  },
  ...(config.CLINICAL_FEATURES_ENABLED
    ? [
        {
          path: '/mavemd',
          name: 'mavemd',
          component: SearchVariantsScreen
        }
      ]
    : []),
  {
    path: '/docs',
    component: DocumentationView
  },
  {
    path: '/about',
    component: AboutView
  },
  {
    path: '/help',
    component: HelpScreen
  },
  {
    path: '/settings',
    component: SettingsScreen,
    meta: {requiresAuth: true}
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {requiresAuth: true}
  },
  {
    path: '/statistics',
    name: 'statistics',
    component: StatisticsView
  },
  {
    path: '/experiments/:urn',
    name: 'experiment',
    component: ExperimentView,
    props: (route) => ({itemId: route.params.urn})
  },
  {
    name: 'createExperiment',
    path: '/create-experiment',
    component: ExperimentCreator,
    meta: {requiresAuth: true}
  },
  {
    path: '/experiments/:urn/edit',
    name: '/editExperiment',
    component: ExperimentEditor,
    props: (route) => ({itemId: route.params.urn}),
    meta: {requiresAuth: true}
  },
  {
    path: '/create-score-set',
    name: 'createScoreSet',
    component: ScoreSetCreator,
    meta: {requiresAuth: true}
  },
  {
    path: '/experiment/:urn/create-score-set',
    name: 'createScoreSetInExperiment',
    component: ScoreSetCreator,
    props: (route) => ({experimentUrn: route.params.urn}),
    meta: {requiresAuth: true}
  },
  {
    path: '/experiment-sets/:urn',
    name: 'experimentSet',
    component: ExperimentSetView,
    props: (route) => ({itemId: route.params.urn})
  },
  {
    path: '/experiment-sets/:urn/create-experiment',
    name: 'createExperimentInExperimentSet',
    component: ExperimentCreator,
    props: (route) => ({experimentSetUrn: route.params.urn}),
    meta: {requiresAuth: true}
  },
  {
    path: '/score-sets/:urn/edit',
    name: 'editScoreSet',
    component: ScoreSetEditor,
    props: (route) => ({itemId: route.params.urn}),
    meta: {requiresAuth: true}
  },
  {
    path: '/score-sets/:urn',
    name: 'scoreSet',
    component: ScoreSetView,
    props: (route) => ({
      itemId: route.params.urn
    })
  },
  {
    path: '/score-sets/:urn/calibrations',
    name: 'scoreSetCalibrations',
    component: ScoreSetCalibrationsView,
    props: (route) => ({
      itemId: route.params.urn
    })
  },
  {
    path: '/collections',
    name: 'collections',
    component: CollectionsView,
    meta: {requiresAuth: true}
  },
  {
    path: '/collections/:urn',
    name: 'collection',
    component: CollectionView,
    props: (route) => ({itemId: route.params.urn})
  },
  ...(config.CLINICAL_FEATURES_ENABLED
    ? [
        {
          path: '/variants/:clingenAlleleId',
          name: 'variant',
          component: VariantScreen,
          props: (route: RouteLocationNormalized) => ({
            clingenAlleleId: route.params.clingenAlleleId
          })
        }
      ]
    : []),
  ...(config.CLINICAL_FEATURES_ENABLED
    ? [
        {
          path: '/variant-measurements/:urn',
          name: 'variantMeasurement',
          component: VariantMeasurementScreen,
          props: (route: RouteLocationNormalized) => ({
            variantUrn: route.params.urn
          })
        }
      ]
    : []),
  {
    name: 'pubmedPublicationIdentifier',
    path: '/publication-identifiers/pubmed/:identifier',
    component: PublicationIdentifierView,
    props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'PubMed'})
  },
  {
    name: 'biorxivPublicationIdentifier',
    path: '/publication-identifiers/biorxiv/:identifier',
    component: PublicationIdentifierView,
    props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'bioRxiv'})
  },
  {
    name: 'medrxivPublicationIdentifier',
    path: '/publication-identifiers/medrxiv/:identifier',
    component: PublicationIdentifierView,
    props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'medRxiv'})
  },
  {
    name: 'crossrefPublicationIdentifier',
    path: '/publication-identifiers/crossref/:identifier',
    component: PublicationIdentifierView,
    props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'Crossref'})
  },
  {
    path: '/oidc-callback',
    name: 'oidcCallback',
    component: OidcCallback
  },
  {
    path: '/oidc-callback-error',
    name: 'oidcCallbackError',
    component: OidcCallbackError
  },
  {
    name: 'wizard-completion',
    path: '/score-sets/submit-completion/:urn',
    component: WizardCompletionView,
    props: (route) => ({itemId: route.params.urn})
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

// ---- authentication guard ----
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next) => {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    localStorage.setItem('redirectAfterLogin', to.fullPath)
    beginAuthentication()
  } else {
    next()
  }
})
