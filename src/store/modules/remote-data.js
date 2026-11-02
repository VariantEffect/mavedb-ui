import axios from 'axios'
import _ from 'lodash'

import {isServerBusy, withBusyRetry} from '@/lib/busy-retry.ts'

export default () => {
  // Aborts the previous load when a new one starts, so a load still waiting out a busy server can't overwrite the
  // data for a URL that replaced it.
  let loadController = null

  return {
    namespaced: true,

    state: () => ({
      dataUrl: null,
      data: null,
      dataStatus: 'NotLoaded',
      // The retry being waited on while the server is busy (see @/lib/busy-retry), or null.
      busyRetry: null,
      // Whether the last failed load was still being turned away by a busy server.
      failedServerBusy: false
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
        state.busyRetry = null
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
        state.busyRetry = null
        state.failedServerBusy = false
      },

      waitingForBusyServer(state, busyRetry) {
        state.busyRetry = busyRetry
      },

      loadingFailed(state, {serverBusy = false} = {}) {
        _.merge(state, {
          data: null,
          dataStatus: 'Failed',
          busyRetry: null,
          failedServerBusy: serverBusy
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
          loadController?.abort()
          const controller = new AbortController()
          loadController = controller
          commit('loadingData', {dataUrl})
          try {
            let response = await withBusyRetry(() => axios.get(dataUrl), {
              signal: controller.signal,
              onBusy: (busyRetry) => commit('waitingForBusyServer', busyRetry)
            })
            if (controller.signal.aborted) return
            // TODO (#130) catch errors in response
            commit('loadedData', {data: response.data || null})
          } catch (err) {
            if (controller.signal.aborted) return
            console.log(`Error while loading data (URL="${dataUrl}")`, err)
            commit('loadingFailed', {serverBusy: isServerBusy(err)})
          }
        }
      },

      async reloadData({dispatch, state}) {
        await dispatch('loadData', {dataUrl: state.dataUrl})
      },

      async ensureDataLoaded({dispatch, state}) {
        if (!['Loaded', 'Loading', 'Failed'].includes(state.dataStatus)) {
          await dispatch('loadData', {dataUrl: state.dataUrl})
        }
      },

      async setDataUrl({commit, dispatch, state}, dataUrl) {
        if (!_.isEqual(dataUrl, state.dataUrl) && state.dataStatus != 'NotLoaded') {
          await dispatch('loadData', {dataUrl})
        } else {
          commit('setUrl', {dataUrl})
        }
      }
    }
  }
}
