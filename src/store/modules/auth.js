const module = {
  namespaced: true,

  state: {
    authenticated: false,
    orcidProfile: null,
    roles: []
  },

  mutations: {
    loggedIn(state, {orcidProfile, roles}) {
      state.authenticated = true
      state.orcidProfile = orcidProfile
      state.roles = roles
      console.log(state)
    },
    loggedOut(state) {
      state.authenticated = false
      state.orcidProfile = null
      state.roles = []
      console.log(state)
    }
  },

  actions: {
    loggedIn({commit}, {orcidProfile, roles}) {
      commit('loggedIn', {orcidProfile, roles})
    },

    loggedOut({commit}) {
      commit('loggedOut')
    }
  }
}

export default module
