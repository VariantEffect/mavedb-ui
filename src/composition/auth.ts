/**
 * A composable that provides authentication and authorization features to Vue components.
 *
 * This composable uses two pieces of code:
 * - The ORCID OAuth2 authentication module, lib/orcid.ts, which handles the OAuth2 authentication flow and stores
 *   credentials in localStorage; and
 * - The authorization store module, store/modules/auth.ts, which checks the user's roles after login.
 *
 * The user's authentication state, profile, roles, and active roles are exposed here, as are functions for logging in and out, so Vue
 * components should not need to interact with the store itself.
 */
import _ from 'lodash'
import {computed, watch} from 'vue'
// @ts-expect-error It's troublesome to get types for useStore; see store/index.ts for more details.
import {useStore} from 'vuex'
import {useRouter} from 'vue-router'

import {
  beginAuthentication as orcidBeginAuthentication,
  idToken as orcidIdToken,
  isAuthenticated as orcidIsAuthenticated,
  signOut as orcidSignOut,
  userProfile as orcidUserProfile
} from '@/lib/orcid'

export default () => {
  const store = useStore()

  const signIn = () => orcidBeginAuthentication()

  // Sign the user out. We do not perform a server-side OIDC logout, because ORCID does not support it by providing a
  // logout URL. We simply remove the authentication information from the client. The user's browser will remain logged
  // into ORCID for other applications, though we will ask ORCID to re-check credentials next time the user tries to
  // sign in.
  const signOut = () => orcidSignOut()

  function updateActiveRoles(newActiveRoles: string[]) {
    store.dispatch('auth/activeRolesChanged', newActiveRoles)
  }

  const userIdToken = computed(() => orcidIdToken)
  const userIsAuthenticated = computed(() => orcidIsAuthenticated.value)
  const userOrcidId = computed(() => orcidUserProfile.value?.sub)
  const userProfile = computed(() => orcidUserProfile.value)
  const roles = computed(() => store.state.auth.roles)
  const activeRoles = computed(() => store.state.auth.activeRoles)

  store.dispatch('auth/userChanged', userProfile.value)

  watch(userProfile, (newUserProfile) => {
    store.dispatch('auth/userChanged', newUserProfile)
  })

  return {
    activeRoles,
    roles,
    userIdToken,
    userIsAuthenticated,
    userOrcidId,
    userProfile,

    signIn,
    signOut,
    updateActiveRoles
  }
}
