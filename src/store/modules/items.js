import axios from 'axios'
import _ from 'lodash'
import jsog from 'jsog'

function sortItems(items, state) {
  if (items && _.get(state, 'filter.itemIds') && !state.order) {
    return _.filter(state.filter.itemIds.map((id) => items.find((item) => item._id == id)), Boolean)
  }
  return items
}

// TODO Allow collectionUrl=false as a way of indicating that no data should be fetched.

export default (collectionUrl, options = {}) => {
  options = _.merge({
    httpOptions: {},
    requestBody: null,
    filter: null,
    order: null,
    limit: null,
    referencePathsToExpand: [],
    detail: {
      allowMultiple: false,
      autoEdit: false,
      autoFromSingleInsertion: true,
      autoFromSingleSelection: true,
      autoFromMultipleSelection: false,
      constrainToSelection: true
    },
    loading: {
      firstPageSize: null, //(options.order != null) ? 500 : null,
      pageSize: 5000
    }
  }, options)

  return {
    namespaced: true,

    state: () => ({
      httpOptions: options.httpOptions,
      itemIds: options.itemIds,
      requestBody: options.requestBody,
      filter: options.filter,
      order: options.order,
      referencePathsToExpand: options.referencePathsToExpand,
      items: null,
      itemsStatus: 'NotLoaded',
      selectedItems: [],
      detailItems: [],
      invalidItems: [],
      listNavigators: {},
      editingDetailItems: false,
      batchSaveAttempted: false,
      editors: []
    }),

    getters: {
      //sequencingPoolEntries: state => flowCells.sequencingPoolEntriesFromFlowCell(state.flowCell)
    },

    mutations: {

      reset(state) {
        _.merge(state, {
          items: null,
          itemsStatus: 'NotLoaded',
          selectedItems: [],
          detailItems: [],
          invalidItems: [],
          listNavigators: {},
          editingDetailItems: false,
          batchSaveAttempted: false,
          editors: []
        })
      },

      setEditingDetailItems(state, editingDetailItems) {
        state.editingDetailItems = editingDetailItems
      },

      deletedItem(state, {itemId}) {
        if (['Loaded', 'LoadingMore'].includes(state.itemsStatus)) {
          // Assume that each item ID only occurs once in the list.

          var index = state.items.findIndex(x => x._id == itemId)
          if (index >= 0) {
            state.items.splice(index, 1)
          }

          index = state.selectedItems.findIndex(x => x._id == itemId)
          if (index >= 0) {
            state.selectedItems.splice(index, 1)
          }

          index = state.detailItems.findIndex(x => x._id == itemId)
          if (index >= 0) {
            state.detailItems.splice(index, 1)
            if (state.detailItems.length == 0) {
              state.editingDetailItems = options.detail.autoEdit
            }
          }
        }
      },

      insertedItem(state, {item, insertAtBeginning = false}) {
        if (['Loaded', 'LoadingMore'].includes(state.itemsStatus)) {
          const frozenItem = Object.freeze(item)

          if (insertAtBeginning) {
            state.items.unshift(frozenItem)
            //state.items.splice(0, 0, frozenItem)
          } else {
            state.items.push(frozenItem)
          }

          if (options.detail.autoFromSingleInsertion && ((state.detailItems.length == 0) || ((state.detailItems.length == 1) && (state.detailItems[0]._id == null)))) {
            state.detailItems = [frozenItem]
            state.editingDetailItems = options.detail.autoEdit
          }
        }
      },

      // Identical to updatedItem, but we want to draw a semantic distinction. (And we can't call one mutation from another.)
      refreshedItem(state, {item}) {
        if (['Loaded', 'LoadingMore'].includes(state.itemsStatus)) {
          const frozenItem = Object.freeze(item)

          var index = state.items.findIndex(x => x._id == item._id)
          // Assume that each item ID only occurs once in the list.
          if (index >= 0) {
            state.items[index] = frozenItem
          }

          index = state.selectedItems.findIndex(x => x._id == item._id)
          if (index >= 0) {
            state.selectedItems[index] = frozenItem
          }

          index = state.detailItems.findIndex(x => x._id == item._id)
          if (index >= 0) {
            state.detailItems[index] = frozenItem
          }
        }
      },

      updatedItem(state, {item}) {
        if (['Loaded', 'LoadingMore'].includes(state.itemsStatus)) {
          const frozenItem = Object.freeze(item)

          var index = state.items.findIndex(x => x._id == item._id)
          // Assume that each item ID only occurs once in the list.
          if (index >= 0) {
            state.items[index] = frozenItem
          }

          index = state.selectedItems.findIndex(x => x._id == item._id)
          if (index >= 0) {
            state.selectedItems[index] = frozenItem
          }

          index = state.detailItems.findIndex(x => x._id == item._id)
          if (index >= 0) {
            state.detailItems[index] = frozenItem
          }
        }
      },

      loadedItems(state, {items, finished}) {
        state.items = sortItems(items.map(item => Object.freeze(item)), state)
        state.itemsStatus = finished ? 'Loaded' : 'LoadingMore'
      },

      loadedMoreItems(state, {items, finished}) {
        state.items.push(...items.map(item => Object.freeze(item)))
        state.itemsStatus = finished ? 'Loaded' : 'LoadingMore'
      },

      loadingFailed(state) {
        _.merge(state, {
          items: null, // TODO []?
          itemsStatus: 'Failed',
          selectedItems: [],
          detailItems: [],
          invalidItems: []
        })
      },

      unloadItems(state) {
        _.merge(state, {
          items: null, // TODO []?
          itemsStatus: 'NotLoaded',
          selectedItems: [],
          detailItems: [],
          invalidItems: []
        })
      },

      loadingItems(state) {
        state.items = null
        state.itemsStatus = 'Loading'
      },

      loadingMoreItems(state) {
        state.itemsStatus = 'LoadingMore'
      },

      editNewItem(state, itemDefaults = {}) {
        state.detailItems = [_.omit(_.merge({}, itemDefaults), '_id')]
        state.editingDetailItems = true
      },

      hideDetail(state) {
        if (state.detailItems.length > 0) {
          state.detailItems = []
          state.editingDetailItems = false
        }
      },

      setInvalidItemIds(state, invalidItemIds) {
        if (!_.isEqual(invalidItemIds, state.invalidItems.map(x => x._id))) {
          state.invalidItems = invalidItemIds.map(id => state.items.find(i => i._id == id))
        }
      },

      removeEditor(state, editor) {
        _.remove(state.editors, x => x == editor)
      },

      addEditor(state, editor) {
        if (!state.editors.includes(editor)) {
          state.editors.push(editor)
        }
      },

      clearListNavigator(state, {name, listNavigator}) {
        if ((listNavigator == null) || (state.listNavigators[name] == listNavigator)) {
          state.listNavigators[name] = undefined
        }
      },

      setListNavigator(state, {name, listNavigator}) {
        if (state.listNavigators[name] != listNavigator) {
          state.listNavigators[name] = listNavigator
        }
      },

      setSelection(state, {selectedItemIds, edit}) {
        if (!_.isEqual(selectedItemIds, state.selectedItems.map(x => x._id))) {
          // Check whether the transition is allowed. If an editor is open, we cannot change the detail view.
          let allowed = true
          if (state.editors.length > 0) {
            if (options.detail.autoFromSingleSelection && (state.selectedItems.length == 1)) {
              allowed = false
            } else if (options.detail.autoFromMultipleSelection && options.detail.allowMultiple && (state.selectedItems.length > 1)) {
              allowed = false
            } else if (options.detail.constrainToSelection) {
              const selectedItemIds = state.selectedItems.map(x => x._id)
              const detailItemIds = state.detailItems.map(x => x._id)
              const newDetailItemIds = detailItemIds.filter(id => selectedItemIds.includes(id))
              if (state.detailItems.filter(x => !newDetailItemIds.includes(x._id)).length > 0) {
                allowed = false
              }
            }
          }

          if (!allowed) {
            return
          }

          state.selectedItems = selectedItemIds.map(id => state.items.find(i => i._id == id))

          if (options.detail.autoFromSingleSelection && (state.selectedItems.length == 1)) {
            const selectedItem = state.selectedItems[0]
            if ((state.detailItems.length != 1) || (state.detailItems[0]._id != selectedItem._id)) {
              state.detailItems = [selectedItem]
            }
          } else if (options.detail.autoFromMultipleSelection && options.detail.allowMultiple && (state.selectedItems.length > 1)) {
            if (!_.isEqual(state.selectedItems.map(x => x._id), state.detailItems.map(x => x._id))) {
              state.detailItems = _.clone(state.selectedItems) // TODO Will this cause any problem involving the array's reactive proxy?
            }
          } else if (options.detail.constrainToSelection) {
            const selectedItemIds = state.selectedItems.map(x => x._id)
            const detailItemIds = state.detailItems.map(x => x._id)
            const newDetailItemIds = detailItemIds.filter(id => selectedItemIds.includes(id))
            if (!_.isEqual(newDetailItemIds, detailItemIds)) {
              state.detailItems = state.detailItems.filter(x => newDetailItemIds.includes(x._id))
            }
          }

          if (state.detailItems.length == 0) {
            state.editingDetailItems = false
          } else {
            state.editingDetailItems = (edit !== undefined) ? edit : (state.editingDetailItems || options.detail.autoEdit)
          }
        }
      },

      showSelectionAsDetail(state, {edit}) {
        if ((state.selectedItems.length <= 1) || options.detail.allowMultiple) {
          const selectedItemIds = state.selectedItems.map(x => x._id)
          const detailItemIds = state.detailItems.map(x => x._id)
          if (!_.isEqual(selectedItemIds, detailItemIds)) {
            state.detailItems = _.clone(state.selectedItems) // TODO Will this cause any problem involving the array's reactive proxy?
          }

          if (state.detailItems.length == 0) {
            state.editingDetailItems = false
          } else {
            state.editingDetailItems = (edit !== undefined) ? edit : (state.editingDetailItems || options.detail.autoEdit)
          }
        }
      },

      setBatchSaveAttempted(state, batchSaveAttempted) {
        if (batchSaveAttempted != state.batchSaveAttempted) {
          state.batchSaveAttempted = batchSaveAttempted
        }
      },

      setFilter(state, filter) {
        if (!_.isEqual(filter, state.filter)) {
          state.filter = filter
          state.itemsStatus = 'NotLoaded'
          state.items = null
          state.selectedItems = [] // TODO Is there a good way to preserve selections?
          state.detailItems = []
          state.invalidItems = []
          state.editingDetailItems = false
        }
      },

      setRequestBody(state, requestBody) {
        if (!_.isEqual(requestBody, state.requestBody)) {
          state.requestBody = requestBody
          state.itemsStatus = 'NotLoaded'
          state.items = null
          state.selectedItems = [] // TODO Is there a good way to preserve selections?
          state.detailItems = []
          state.invalidItems = []
          state.editingDetailItems = false
        }
      }

    },

    actions: {

      reset({commit}) {
        commit('reset')
      },

      setEditingDetailItems({commit}, editingDetailItems) {
        commit('setEditingDetailItems', editingDetailItems)
      },

      async beginDeletingItem({commit}, {itemId}) {
        let response = await axios.delete(collectionUrl + '/' + itemId)
        // TODO handle error responses
        if (response.status == 200) {
          commit('deletedItem', {itemId})
        }
      },

      async beginLoadingItems({commit, dispatch, state}, {firstPageSize, pageSize} = {}) {
        commit('loadingItems')

        const currentOptions = {
          namedFilter: _.get(state, 'filter.namedFilter'),
          itemIds: _.get(state, 'filter.itemIds'),
          requestBody: _.get(state, 'requestBody'),
          query: _.get(state, 'filter.query'),
          order: _.get(state, 'order'),
          referencePathsToExpand: _.get(state, 'referencePathsToExpand')
        }

        let queryParams = {}
        if (_.get(state, 'filter.namedFilter')) {
          queryParams.namedFilter = _.get(state, 'filter.namedFilter')
        }
        const filterQueryParts = []
        if (_.get(state, 'filter.itemIds')) {
          filterQueryParts.push({l: {path: '_id'}, r: {constant: state.filter.itemIds}, operator: 'in'})
        }
        if (_.get(state, 'filter.query') != null) {
          filterQueryParts.push(_.get(state, 'filter.query'))
        }
        if (filterQueryParts.length > 0) {
          const filterQuery = (filterQueryParts.length == 1) ? filterQueryParts[0] : {and: filterQueryParts}
          queryParams.q = JSON.stringify(filterQuery)
        }
        if (_.get(state, 'order')) {
          queryParams.o = JSON.stringify(_.get(state, 'order'))
        }
        if (_.get(state, 'referencePathsToExpand')) {
          queryParams.r = JSON.stringify(_.get(state, 'referencePathsToExpand'))
        }
        const currentPageSize =
          _.get(state, 'filter.itemIds') && !_.get(state, 'order') ?
              null
              : (firstPageSize || _.get(options, 'loading.firstPageSize'))
                  || (pageSize || _.get(options, 'loading.pageSize'))
                  || null
        const limit = (currentPageSize != null || options.limit != null) ?
            _.min(_.filter([currentPageSize, options.limit], (x) => x != null)) : null
        if (limit != null) {
          queryParams.offset = 0
          queryParams.limit = limit
        }
        const queryString = _.map(queryParams, (value, key) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
        const httpOptions = _.get(state, 'httpOptions.list', {})
        const collectionListUrl = httpOptions.url || collectionUrl
        const url = _.isEmpty(queryString) ? collectionListUrl : `${collectionListUrl}?${queryString}`
        try {
          let response = await axios({
            method: httpOptions.method || 'get',
            url,
            ...state.requestBody ? {data: state.requestBody} : {}
          })
          const newOptions = {
            namedFilter: _.get(state, 'filter.namedFilter'),
            itemIds: _.get(state, 'filter.itemIds'),
            requestBody: _.get(state, 'requestBody'),
            query: _.get(state, 'filter.query'),
            order: _.get(state, 'order'),
            referencePathsToExpand: _.get(state, 'referencePathsToExpand')
          }
          if (!_.isEqual(currentOptions, newOptions)) {
            console.log(`Discarding items fetched by obsolete query from ${collectionUrl}.`)
          } else {
            const items = response.data // jsog.decode(_.get(response, 'data.data', []))
            let finished = ((currentPageSize == null) || (items.length < limit)) || (options.limit && items.length >= options.limit)
            console.log(`Loaded ${items.length} items from ${collectionUrl}`)
            commit('loadedItems', {items, finished})
            if (!finished) {
              dispatch('loadMoreItems', {offset: items.length})
            }
          }
        } catch (err) {
          console.log(`Error while loading items (URL="${url}"):`, err)
          commit('loadingFailed')
        }
      },

      invalidateItems({commit}) {
        commit('unloadItems')
      },

      async loadMoreItems({commit, dispatch, state}, {offset, pageSize}) {
        commit('loadingMoreItems')

        const currentOptions = {
          namedFilter: _.get(state, 'filter.namedFilter'),
          itemIds: _.get(state, 'filter.itemIds'),
          requestBody: _.get(state, 'requestBody'),
          query: _.get(state, 'filter.query'),
          order: _.get(state, 'order'),
          referencePathsToExpand: _.get(state, 'referencePathsToExpand')
        }

        let queryParams = {}
        if (_.get(state, 'filter.namedFilter')) {
          queryParams.namedFilter = _.get(state, 'filter.namedFilter')
        }
        if (_.get(state, 'filter.query')) {
          queryParams.q = JSON.stringify(_.get(state, 'filter.query'))
        }
        if (_.get(state, 'order')) {
          queryParams.o = JSON.stringify(_.get(state, 'order'))
        }
        if (_.get(state, 'referencePathsToExpand')) {
          queryParams.r = JSON.stringify(_.get(state, 'referencePathsToExpand'))
        }
        queryParams.offset = offset
        const currentPageSize = pageSize || _.get(options, 'loading.pageSize') || null
        const limit = (currentPageSize != null || options.limit != null) ?
            _.min(_.filter([currentPageSize, options.limit == null ? null : options.limit - offset], (x) => x != null)) : null
        if (currentPageSize != null) {
          queryParams.limit = limit
        }
        const queryString = _.map(queryParams, (value, key) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
        const httpOptions = _.get(state, 'httpOptions.list', {})
        const collectionListUrl = httpOptions.url || collectionUrl
        const url = _.isEmpty(queryString) ? collectionListUrl : `${collectionListUrl}?${queryString}`
        try {
          let response = await axios({
            method: httpOptions.method || 'get',
            url,
            ...state.requestBody ? {data: state.requestBody} : {}
          })
          const newOptions = {
            namedFilter: _.get(state, 'filter.namedFilter'),
            itemIds: _.get(state, 'filter.itemIds'),
            requestBody: _.get(state, 'requestBody'),
            query: _.get(state, 'filter.query'),
            order: _.get(state, 'order'),
            referencePathsToExpand: _.get(state, 'referencePathsToExpand')
          }

          if (!_.isEqual(currentOptions, newOptions)) {
            console.log(`Discarding items fetched by obsolete query from ${collectionUrl}.`)
          } else {
            // const items = _.get(response, 'data.data', [])
            const items = jsog.decode(_.get(response, 'data.data', []))
            const totalLength = (state.items ? state.items.length : 0) + items.length
            let finished = ((currentPageSize == null) || (items.length < limit)) || (options.limit && totalLength >= options.limit)
            console.log(`Loaded ${items.length} more items from ${collectionUrl}`)
            commit('loadedMoreItems', {items, finished})
            if (!finished) {
              dispatch('loadMoreItems', {offset: offset + items.length})
            }
          }
        } catch (err) {
          console.log(`Error while loading more items (URL="${url}"):`, err)
          commit('unloadItems')
        }
      },

      async recordInsertion({commit}, {item, insertAtBeginning = false}) {
        commit('insertedItem', {item, insertAtBeginning})
      },

      async refreshItem({commit}, {itemId}) {
        if (itemId) {
          let response = await axios.get(`${collectionUrl}/${itemId}`)
          // TODO handle error responses
          if (response.status == 200) {
            let item = response.data
            if (item._id) {
              commit('refreshedItem', {item})
            }
          }
        }
      },

      async saveItem({commit}, {item}) {
        let response = await axios({
          method: item._id ? 'put' : 'post',
          url: collectionUrl + (item._id ? ('/' + item._id) : ''),
          data: item
        })
        // TODO handle error responses
        if (response.status == 200) {
          let newItem = response.data
          if (item._id) {
            commit('updatedItem', {item: newItem})
          } else {
            commit('insertedItem', {item: newItem})
          }
          return newItem
        }
        return null
      },

      async saveItems({commit}, {items}) {
        const createdItemIndices = _.range(0, items.length).filter((i) => items[i]._id == null)
        const updatedItemIndices = _.difference(_.range(0, items.length), createdItemIndices)
        let response = await axios({
          method: 'put',
          url: collectionUrl,
          data: items
        })
        // TODO handle error responses
        if (response.status == 200) {
          let newItems = response.data
          const createdItems = createdItemIndices.map(i => newItems[i]).filter((item) => item != null)
          const updatedItems = updatedItemIndices.map(i => newItems[i]).filter((item) => item != null)
          // We could have a combined mutator like this:
          /*
          commit('savedItems', {
            insertedItems: createdItems,
            updatedItems
          })
          */
          // But at the risk of triggering watchers more than once (which doesn't really happen as long as we do nothing
          // asynchronous here), it's simpler and more elegant to call the individual mutations:
          for (const item of createdItems) {
            commit('insertedItem', {item})
          }
          for (const item of updatedItems) {
            commit('updatedItem', {item})
          }
          return newItems
        }
        return null
      },

      async checkForDeletedItem({commit}, {itemId}) {
        var response = null
        try {
          response = await axios.get(collectionUrl + '/' + itemId)
        } catch (err) {
          // See https://github.com/axios/axios/blob/master/index.d.ts#L85 for AxiosError.
          response = err.response || {}
        }
        if (response && response.status == 404) {
          commit('deletedItem', {itemId})
          return true
        }
        return false
      },

      deselectItems({commit, state}, {itemIds}) {
        let newSelectedItemIds = state.selectedItems.map(x => x._id).filter(id => !itemIds.includes(id))
        commit('setSelection', {selectedItemIds: newSelectedItemIds})
      },

      async ensureItemsLoaded({dispatch, state}) {
        if (!['Loaded', 'Loading', 'LoadingMore', 'Failed'].includes(state.itemsStatus)) {
          await dispatch('beginLoadingItems')
          /*commit('loadingItems')
          let response = await axios.get(collectionUrl)
          // TODO catch errors in response
          commit('loadedItems', {items: response.data || []})*/
        }
      },

      deregisterEditor({commit}, editor) {
        commit('removeEditor', editor)
      },

      registerEditor({commit}, editor) {
        commit('addEditor', editor)
      },

      deregisterListNavigator({commit}, {name, listNavigator}) {
        commit('clearListNavigator', {name, listNavigator})
      },

      registerListNavigator({commit}, {name, listNavigator}) {
        commit('setListNavigator', {name, listNavigator})
      },

      selectItems({commit, state}, {itemIds, addToSelection, edit}) {
        const oldSelectedItemIds = state.selectedItems.map(x => x._id)
        let newSelectedItemIds = itemIds
        if (addToSelection) {
          let addedItemIds = _.difference(itemIds, oldSelectedItemIds)
          if (addedItemIds.length > 0) {
            newSelectedItemIds = oldSelectedItemIds.concat(addedItemIds)
          }
        }
        if (!_.isEqual(oldSelectedItemIds, newSelectedItemIds)) {
          commit('setSelection', {selectedItemIds: newSelectedItemIds, edit})
        }
      },

      showSelectionAsDetail({commit}, {edit} = {}) {
        commit('showSelectionAsDetail', {edit})
      },

      hideDetail({commit}) {
        commit('hideDetail')
      },

      addItem({commit}, itemDefaults = {}) {
        commit('editNewItem', itemDefaults)
      },

      setInvalidItemIds({commit}, invalidItemIds) {
        commit('setInvalidItemIds', invalidItemIds)
      },

      setBatchSaveAttempted({commit}, batchSaveAttempted) {
        commit('setBatchSaveAttempted', batchSaveAttempted)
      },

      async setQuery({commit, dispatch, state}, query) {
        // if (!_.isEqual(query, _.get(state.filter, 'query'))) {
          let newFilter = _.cloneDeep(state.filter) || {}
          if (query !== null) {
            newFilter.query = query
          } else {
            _.unset(newFilter, 'query')
          }

          const previousItemsStatus = state.itemsStatus
          commit('setFilter', newFilter)
          if (previousItemsStatus != 'NotLoaded') {
            await dispatch('beginLoadingItems')
          }
        // }
      },

      async setRequestBody({commit}, requestBody) {
        commit('setRequestBody', requestBody)
      },

      async setItemIds({commit, dispatch, state}, itemIds) {
        if (!_.isEqual(itemIds, _.get(state.filter, 'itemIds'))) {
          let newFilter = _.cloneDeep(state.filter) || {}
          if (itemIds != null) {
            newFilter.itemIds = itemIds
          } else {
            _.unset(newFilter, 'itemIds')
          }

          const previousItemsStatus = state.itemsStatus
          commit('setFilter', newFilter)
          if (previousItemsStatus != 'NotLoaded') {
            await dispatch('beginLoadingItems')
          }
        }
      }

    }
  }
}
