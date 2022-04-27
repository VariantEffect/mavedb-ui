import axios from 'axios'
import _ from 'lodash'

export default () => {
  return {
    namespaced: true,

    state: () => ({
      dataUrl: null,
      data: null,
      dataStatus: 'NotLoaded'
    }),

    mutations: {

      loadedData(state, {dataUrl, data}) {
        if (state.dataUrl != dataUrl) {
          state.dataUrl = dataUrl
        }
        if (state.data !== data) {
          state.data = data
        }
        if (state.dataStatus != 'Loaded') {
          state.dataStatus = 'Loaded'
        }
      },

      loadingData(state, {dataUrl}) {
        if (state.dataUrl != dataUrl) {
          state.dataUrl = dataUrl
        }
        if (state.data !== null) {
          state.data = null
        }
        if (state.dataStatus != 'Loading') {
          state.dataStatus = 'Loading'
        }
      },

      loadingFailed(state) {
        _.merge(state, {
          data: null,
          dataStatus: 'Failed'
        })
      },

      setUrl(state, {dataUrl}) {
        state.dataUrl = dataUrl
        if (state.data && state.dataUrl != dataUrl) {
          state.data = null
          state.datasStatus = 'NotLoaded'
        }
      }

    },

    actions: {

      reset() {
        // TODO
      },

      async loadData({commit}, {dataUrl}) {
        if (dataUrl) {
          commit('loadingData', {dataUrl})
          try {
            let response = await axios.get(
              dataUrl,
              {
                /* headers: {
                  accept: 'application/json'
                } */
              }
            )
            // TODO catch errors in response
            commit('loadedData', {data: response.data || null})
          } catch (err) {
            console.log(`Error while loading data (URL="${dataUrl}")`, err)
          }
        }
      },

      async ensureDataLoaded({dispatch, state}) {
        if (!['Loaded', 'Loading', 'Failed'].includes(state.dataStatus)) {
          await dispatch('loadData', {dataUrl: state.dataUrl})
        }
      },

      async setDataUrl({commit, dispatch, state}, dataUrl) {
        if (!_.isEqual(dataUrl, state.dataUrl) && (state.dataStatus != 'NotLoaded')) {
          await dispatch('loadData', {dataUrl})
        } else {
          commit('setUrl', {dataUrl})
        }
      }

    }
  }
}
