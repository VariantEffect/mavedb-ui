import {createRouter, createWebHashHistory} from 'vue-router'

import DashboardView from '@/components/screens/DashboardView'
import DocumentationView from '@/components/screens/DocumentationView'
import ExperimentEditor from '@/components/screens/ExperimentEditor'
import ExperimentView from '@/components/screens/ExperimentView'
import ExperimentSetView from '@/components/screens/ExperimentSetView'
import HomeScreen from '@/components/screens/HomeScreen'
import ScoreSetEditor from '@/components/screens/ScoreSetEditor'
import PublicationIdentifierView from '@/components/screens/PublicationIdentifierView'
import ScoreSetView from '@/components/screens/ScoreSetView'
import SearchView from '@/components/screens/SearchView'
import SettingsScreen from '@/components/screens/SettingsScreen'
import UsersView from '@/components/screens/UsersView'
import {oidc} from '@/lib/auth'
import store from '@/store';

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
  },
}, {
  path: '/search',
  name: 'search',
  component: SearchView,
  meta: {
    title: import.meta.env.VITE_SITE_TITLE + ' | Search'
  }
}, {
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
  component: DashboardView,
  meta: {
    authName: oidc.authName
  }
}, {
  path: '/users',
  component: UsersView
}, {
  path: '/experiments/:urn',
  name: 'experiment',
  component: ExperimentView,
  props: (route) => ({itemId: route.params.urn})
}, {
  name: 'createExperiment',
  path: '/create-experiment',
  component: ExperimentEditor,
  meta: {
    authName: oidc.authName
  }
}, {
  path: '/experiments/:urn/edit',
  name: '/editExperiment',
  component: ExperimentEditor,
  meta: {
    authName: oidc.authName
  },
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/create-score-set',
  name: 'createScoreSet',
  component: ScoreSetEditor,
  meta: {
    authName: oidc.authName
  }
}, {
  path: '/experiment-sets/:urn',
  name: 'experimentSet',
  component: ExperimentSetView,
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/experiment-sets/:urn/create-experiment',
  name: 'createExperimentInExperimentSet',
  component: ExperimentEditor,
  meta: {
    authName: oidc.authName
  },
  props: (route) => ({experimentSetUrn: route.params.urn})
}, {
  path: '/score-sets/:urn/edit',
  name: 'editScoreSet',
  component: ScoreSetEditor,
  meta: {
    authName: oidc.authName
  },
  props: (route) => ({itemId: route.params.urn})
}, {
  path: '/score-sets/:urn',
  name: 'scoreSet',
  component: ScoreSetView,
  props: (route) => ({
    itemId: route.params.urn,
  }),

}, {
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

oidc.useRouter(router)

export default router