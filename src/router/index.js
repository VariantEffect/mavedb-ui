import {createRouter, createWebHistory} from 'vue-router'

import CollectionView from '@/components/screens/CollectionView'
import CollectionsView from '@/components/screens/CollectionsView'
import DashboardView from '@/components/screens/DashboardView'
import DocumentationView from '@/components/screens/DocumentationView'
import ExperimentCreator from '@/components/screens/ExperimentCreator'
import ExperimentEditor from '@/components/screens/ExperimentEditor'
import ExperimentView from '@/components/screens/ExperimentView'
import ExperimentSetView from '@/components/screens/ExperimentSetView'
import HomeScreen from '@/components/screens/HomeScreen'
import OidcCallback from '@/components/screens/OidcCallback'
import OidcCallbackError from '@/components/screens/OidcCallbackError'
import PublicationIdentifierView from '@/components/screens/PublicationIdentifierView'
import ScoreSetCreator from '@/components/screens/ScoreSetCreator'
import ScoreSetEditor from '@/components/screens/ScoreSetEditor'
import ScoreSetView from '@/components/screens/ScoreSetView'
import SearchVariantsScreen from '@/components/screens/SearchVariantsScreen'
import SearchView from '@/components/screens/SearchView'
import SettingsScreen from '@/components/screens/SettingsScreen'
import UsersView from '@/components/screens/UsersView'
import VariantMeasurementScreen from '@/components/screens/VariantMeasurementScreen'
import VariantScreen from '@/components/screens/VariantScreen'
import StatisticsView from '@/components/screens/StatisticsView'
import store from '@/store'

import config from '@/config'

const routes = [{
  path: '/',
  name: 'home',
  component: HomeScreen,
  props: (route) => {
    const { galaxyUrl, toolId, requestFromGalaxy } = route.query;
    const props = {
      galaxyUrl,
      toolId,
      requestFromGalaxy,
    };
    store.commit('setRouteProps', props);
    return props;
  }
}, {  path: '/search',
  name: 'search',
  component: SearchView,
  meta: {
    title: import.meta.env.VITE_SITE_TITLE + ' | Search'
  }
}, ...config.CLINICAL_FEATURES_ENABLED ? [{
  path: '/search-variants',
  name: 'search-variants',
  component: SearchVariantsScreen,
  meta: {
    title: import.meta.env.VITE_SITE_TITLE + ' | Search Variants'
  }
}] : [], {
  path: '/docs',
  component: DocumentationView,
  meta: {
    title: import.meta.env.VITE_SITE_TITLE + ' | Documentation'
  }
}, {
  path: '/settings',
  component: SettingsScreen
}, {
  path: '/dashboard',
  component: DashboardView
}, {
  path: '/users',
  component: UsersView
}, {
  path: '/statistics', // Add the new route
  name: 'statistics',
  component: StatisticsView,
  meta: {
    title: import.meta.env.VITE_SITE_TITLE + ' | Statistics'
  }
}, {
  path: '/experiments/:urn',
  name: 'experiment',
  component: ExperimentView,
  props: (route) => ({itemId: route.params.urn})
}, {
  name: 'createExperiment',
  path: '/create-experiment',
  component: ExperimentCreator
}, {
  path: '/experiments/:urn/edit',
  name: '/editExperiment',
  component: ExperimentEditor,
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/create-score-set',
  name: 'createScoreSet',
  component: ScoreSetCreator
}, {
  path: '/experiment/:urn/create-score-set',
  name: 'createScoreSetInExperiment',
  component: ScoreSetCreator,
  props: (route) => ({experimentUrn: route.params.urn})
},{
  path: '/experiment-sets/:urn',
  name: 'experimentSet',
  component: ExperimentSetView,
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/experiment-sets/:urn/create-experiment',
  name: 'createExperimentInExperimentSet',
  component: ExperimentEditor,
  props: (route) => ({experimentSetUrn: route.params.urn})
}, {
  path: '/score-sets/:urn/edit',
  name: 'editScoreSet',
  component: ScoreSetEditor,
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/score-sets/:urn',
  name: 'scoreSet',
  component: ScoreSetView,
  props: (route) => ({
    itemId: route.params.urn,
  })
}, {
  path: '/collections',
  name: 'collections',
  component: CollectionsView
}, {
  path: '/collections/:urn',
  name: 'collection',
  component: CollectionView,
  props: (route) => ({itemId: route.params.urn})
}, ...config.CLINICAL_FEATURES_ENABLED ? [{
  path: '/variants/:clingenAlleleId',
  name: 'variant',
  component: VariantScreen,
  props: (route) => ({
    clingenAlleleId: route.params.clingenAlleleId,
  })
}] : [], ...config.CLINICAL_FEATURES_ENABLED ? [{
  path: '/variant-measurements/:urn',
  name: 'variantMeasurement',
  component: VariantMeasurementScreen,
  props: (route) => ({
    variantUrn: route.params.urn,
  })
}] : [], {
  name: 'pubmedPublicationIdentifier',
  path: '/publication-identifiers/pubmed/:identifier',
  component: PublicationIdentifierView,
  props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'PubMed'})
}, {
  name: 'biorxivPublicationIdentifier',
  path: '/publication-identifiers/biorxiv/:identifier',
  component: PublicationIdentifierView,
  props: (route) => ({itemId: route.params.identifier, name: route.name,  dbId: 'bioRxiv'})
}, {
  name: 'medrxivPublicationIdentifier',
  path: '/publication-identifiers/medrxiv/:identifier',
  component: PublicationIdentifierView,
  props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'medRxiv'})
}, {
  name: 'crossrefPublicationIdentifier',
  path: '/publication-identifiers/crossref/:identifier',
  component: PublicationIdentifierView,
  props: (route) => ({itemId: route.params.identifier, name: route.name, dbId: 'Crossref'})
}, {
  path: '/oidc-callback',
  name: 'oidcCallback',
  component: OidcCallback
}, {
  path: '/oidc-callback-error',
  name: 'oidcCallbackError',
  component: OidcCallbackError
}]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // This goes through the matched routes from last to first, finding the closest route with a title.
  // e.g., if we have `/some/deep/nested/route` and `/some`, `/deep`, and `/nested` have titles,
  // `/nested`'s will be chosen.
  const nearestWithTitle = to.matched.slice().reverse().find((r) => r.meta && r.meta.title)

  // Find the nearest route element with meta tags.
  const nearestWithMeta = to.matched.slice().reverse().find((r) => r.meta && r.meta.metaTags)

  const previousNearestWithMeta = from.matched.slice().reverse().find((r) => r.meta && r.meta.metaTags)

  // If a route with a title was found, set the document (page) title to that value.
  if (nearestWithTitle) {
    document.title = nearestWithTitle.meta.title
  } else if (previousNearestWithMeta) {
    document.title = previousNearestWithMeta.meta.title
  }

  // Remove any stale meta tags from the document using the key attribute we set below.
  Array.from(document.querySelectorAll('[data-vue-router-controlled]')).map((el) => el.parentNode.removeChild(el))

  // Skip rendering meta tags if there are none.
  if (!nearestWithMeta) {
    return next()
  }

  // Turn the meta tag definitions into actual elements in the head.
  nearestWithMeta.meta.metaTags.map((tagDef) => {
    const tag = document.createElement('meta')

    Object.keys(tagDef).forEach((key) => {
      tag.setAttribute(key, tagDef[key])
    });

    // We use this to track which meta tags we create so we don't interfere with other ones.
    tag.setAttribute('data-vue-router-controlled', '')

    return tag
  })
  // Add the meta tags to the document head.
      .forEach(tag => document.head.appendChild(tag));

  next()
})

export default router
