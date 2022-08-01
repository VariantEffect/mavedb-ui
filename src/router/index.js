import {createRouter, createWebHashHistory} from 'vue-router'
import ExperimentEditor from '@/components/screens/ExperimentEditor'
import ExperimentView from '@/components/screens/ExperimentView'
import HomeView from '@/components/screens/HomeView'
import ScoresetEditor from '@/components/screens/ScoresetEditor'
import ScoreSetView from '@/components/screens/ScoreSetView'
import SearchView from '@/components/screens/SearchView'
import SettingsScreen from '@/components/screens/SettingsScreen'
import {oidc} from '@/lib/auth'

const routes = [{
  path: '/',
  name: 'home',
  redirect: '/search'
}, {
  path: '/search',
  component: SearchView
}, {
  path: '/settings',
  component: SettingsScreen
}, {
  path: '/my-data',
  component: HomeView,
  meta: {
    authName: oidc.authName
  }
}, {
  name: 'experiment',
  path: '/experiments/:urn',
  component: ExperimentView,
  props: (route) => ({itemId: route.params.urn})
}, {
  name: 'create-experiment',
  path: '/create-experiment',
  component: ExperimentEditor,
  meta: {
    authName: oidc.authName
  }
}, {
  path: '/experiments/:urn/edit',
  name: '/edit-experiment',
  component: ExperimentEditor,
  meta: {
    authName: oidc.authName
  },
  props: (route) => ({itemId: route.params.urn})
}, {
  name: 'create-scoreset',
  path: '/create-scoreset',
  component: ScoresetEditor,
  meta: {
    authName: oidc.authName
  }
}, {
  path: '/scoresets/:urn/edit',
  name: '/edit-scoreset',
  component: ScoresetEditor,
  meta: {
    authName: oidc.authName
  },
  props: (route) => ({itemId: route.params.urn})
}, {
  name: 'scoreset',
  path: '/scoresets/:urn',
  component: ScoreSetView,
  props: (route) => ({itemId: route.params.urn})
}]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

oidc.useRouter(router)

export default router
