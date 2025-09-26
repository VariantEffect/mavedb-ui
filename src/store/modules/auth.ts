/**
 * Vuex store module that manages authorization.
 *
 * Authentication is handled by lib/orcid.ts. when the user signs in, we observe the change and fetch the user's roles
 * from the MaveDB API; and on sign-out, we clear the roles.
 *
 * This store module is not normally accessed directly by Vue components; instead, they should use lib/auth.ts.
 */

import axios from 'axios'
import _ from 'lodash'

import config from '../../config'

const module = {
  namespaced: true,

  state: {
    userProfile: null,
    roles: [],
    activeRoles: ['ordinary user']
  },

  mutations: {
    setRoles(state: any, roles: string[]) {
      state.roles = roles
    },

    setActiveRoles(state: any, activeRoles: string[]) {
      state.activeRoles = activeRoles
    },

    setUserProfile(state: any, userProfile: any) {
      state.userProfile = userProfile
    }
  },

  actions: {
    async userChanged({commit, state}: {commit: any; dispatch: any; getters: any; state: any}, newUserProfile: any) {
      if (!_.isEqual(newUserProfile, state.userProfile)) {
        commit('setUserProfile', newUserProfile)
        if (!newUserProfile) {
          commit('setRoles', [])
        } else {
          const response = await axios.get(`${config.apiBaseUrl}/users/me`)
          if (response?.data) {
            commit('setRoles', response?.data?.roles || [])
          } else {
            commit('setRoles', [])
          }
        }
        commit('setActiveRoles', ['ordinary user'])
      }
    },

    async activeRolesChanged(
      {commit, state}: {commit: any; dispatch: any; getters: any; state: any},
      newActiveRoles: string[]
    ) {
      if (!_.isEqual(newActiveRoles, state.activeRoles)) {
        commit('setActiveRoles', newActiveRoles)
      }
    }
  }
}

export default module
