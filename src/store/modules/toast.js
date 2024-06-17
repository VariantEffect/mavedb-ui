const module = {
  namespaced: true,

  state: {
    toasts: []
  },

  mutations: {
    enqueueToast(state, toast) {
      state.toasts.push(toast)
      console.log(state.toasts)
    },
    removeDequeuedToasts(state, numToasts) {
      state.toasts.splice(0, Math.min(numToasts, state.toasts.length))
    }
  },

  actions: {
    enqueueToast({commit}, toast) {
      console.log('here!!!')
      commit('enqueueToast', toast)
    },
    removeDequeuedToasts({commit}, numToasts) {
      console.log('dequeue')
      commit('removeDequeuedToasts', numToasts)
    }
  }
}

export default module
