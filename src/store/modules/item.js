import axios from 'axios'
import _ from 'lodash'

function getPrimaryKeyValue(item, primaryKey) {
  if (item == null) {
    return null
  }
  if (_.isFunction(primaryKey)) {
    return primaryKey(item)
  }
  return item[primaryKey]
}

export default (collectionUrl, {primaryKey = '_id'} = {}) => {
  return {
    namespaced: true,

    state: () => ({
      itemId: null,
      item: null,
      itemStatus: 'NotLoaded'
    }),

    mutations: {

      loadedItem(state, {item}) {
        if (state.itemId != getPrimaryKeyValue(item, primaryKey)) {
          state.itemId = getPrimaryKeyValue(item, primaryKey)
        }
        if (state.item !== item) {
          state.item = item
        }
        if (state.itemStatus != 'Loaded') {
          state.itemStatus = 'Loaded'
        }
      },

      loadingItem(state, {itemId}) {
        if (state.itemId != itemId) {
          state.itemId = itemId
        }
        if (state.item !== null) {
          state.item = null
        }
        if (state.itemStatus != 'Loading') {
          state.itemStatus = 'Loading'
        }
      },

      loadingFailed(state) {
        _.merge(state, {
          item: null,
          itemStatus: 'Failed'
        })
      },

      setItemId(state, {itemId}) {
        state.itemId = itemId
        if (state.item && getPrimaryKeyValue(state.item, primaryKey) != itemId) {
          state.item = null
          state.itemsStatus = 'NotLoaded'
        }
      }

    },

    actions: {

      async reloadItem({dispatch, state}) {
        if (state.itemId) {
          await dispatch('loadItem', {itemId: state.itemId})
        }
      },

      reset() {
        // TODO
      },

      async loadItem({commit}, {itemId}) {
        if (itemId) {
          commit('loadingItem', {itemId})
          const url = `${collectionUrl}${itemId}` // ended in / before
          try {
            let response = await axios.get(
              url,
              {
                headers: {
                  accept: 'application/json'
                }
              }
            )
            // TODO (#130) catch errors in response
            commit('loadedItem', {item: response.data || null})
          } catch (err) {
            console.log(`Error while loading item (URL="${url}")`, err)
            commit('loadingFailed')
          }
        }
      },

      async ensureItemLoaded({dispatch, state}) {
        if (!['Loaded', 'Loading', 'Failed'].includes(state.itemStatus)) {
          await dispatch('loadItem', {itemId: state.itemId})
        }
      },

      async saveItem({commit}, {item}) {
        const id = getPrimaryKeyValue(item, primaryKey)
        console.log(id)
        let response = await axios({
          method: id ? 'put' : 'post',
          url: collectionUrl + (id ? id : ''),
          data: item
        })
        // TODO handle error responses
        if (response.status == 200) {
          let newItem = response.data
          if (id) {
            commit('updatedItem', {item: newItem})
          } else {
            //commit('insertedItem', {item: newItem})
          }
          return newItem
        }
        return null
      },

      async setItemId({commit, dispatch, state}, itemId) {
        if (!_.isEqual(itemId, state.itemId) && (state.itemStatus != 'NotLoaded')) {
          await dispatch('loadItem', {itemId})
        } else {
          commit('setItemId', {itemId})
        }
      }

    }
  }
}
