const module = {
  namespaced: true,

  state: {
    panesVisible: {
      'draft-batches': false
    }
  },

  mutations: {
    setPaneVisibility(state, {paneName, visible}) {
      if (state.panesVisible[paneName] != visible) {
        state.panesVisible[paneName] = visible
      }
    }
  },

  actions: {

    reset() {
      // TODO
    },

    resetLayout({commit, state}) {
      for (let paneName in state.panesVisible) {
        commit('setPaneVisibility', {paneName, visible: false})
      }
    },

    setPaneVisibility({commit}, {paneName, visible}) {
      commit('setPaneVisibility', {paneName, visible: visible})
    },

    togglePaneVisibility({commit, state}, paneName) {
      commit('setPaneVisibility', {paneName, visible: !state[paneName].visible})
    }

  }
}

export default module
