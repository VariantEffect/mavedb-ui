import _ from 'lodash'
import pluralize from 'pluralize'
import {v4 as uuidv4} from 'uuid'
import {computed, ref, watch} from 'vue'
import {useStore} from 'vuex'
import config from '@/config'
import itemTypes from '@/lib/item-types'
import makeItemsModule from '@/store/modules/items'

const DEFAULT_OPTIONS = {
  detail: {
    allowMultiple: true,
    autoFromMultipleSelection: true,
    autoEdit: false
  },
  loading: {
    firstPageSize: 500
  },
  order: [
    [{path: 'history.creation.timestamp'}, 'desc'],
    [{path: 'history.creation.orderInBatch'}, 'desc']
  ]
}

export default ({
  draftBatchId: initialDraftBatchId = null,
  itemType: initialItemType = null,
  itemTypeName: initialItemTypeName = null,
  stateNamespace: initialStateNamespace = null,
  options: initialOptions = {}
} = {}) => {
  // const itemTypes = useItemTypes()
  const store = useStore()

  const itemsStoreReady = ref(true)

  const configDraftBatchId = ref(initialDraftBatchId)
  const configItemType = ref(initialItemType)
  const configItemTypeName = ref(initialItemTypeName)
  const configStateNamespace = ref(initialStateNamespace)
  const configOptions = ref(initialOptions)

  const resetItems = ({
    draftBatchId = null,
    itemType = null,
    itemTypeName = null,
    stateNamespace = null,
    options = null
  } = {}) => {
    configDraftBatchId.value = draftBatchId
    configItemType.value = itemType
    configItemTypeName.value = itemTypeName
    configStateNamespace.value = stateNamespace
    if (options != null) {
      configOptions.value = options
    }
  }

  const draftBatchId = computed(() => configDraftBatchId.value)

  const itemType = computed(
    () => configItemType.value || (configItemTypeName.value && itemTypes[configItemTypeName.value]) || null
  )

  const makeOptionsConcrete = function (options) {
    const filterQuery = _.get(options, 'filter.query')
    const referencePathsToExpand = _.get(options, 'referencePathsToExpand')

    const concreteFilterQuery = computed(() => (_.isFunction(filterQuery) ? filterQuery(itemType.value) : filterQuery))
    const concreteReferencePathsToExpand = computed(() => {
      return _.isFunction(referencePathsToExpand) ? referencePathsToExpand(itemType.value) : referencePathsToExpand
    })

    return _.merge(_.cloneDeep(options), {
      filter: {query: concreteFilterQuery},
      referencePathsToExpand: concreteReferencePathsToExpand
    })
  }

  const concreteOptions = computed(() => makeOptionsConcrete(configOptions.value))

  /*const itemTypeName = computed(
    () => configItemTypeName.value
        || (itemType.value && itemType.value.name)
        || null
  )*/

  const stateNamespace = computed(
    () =>
      configStateNamespace.value ||
      (itemType.value &&
        itemType.value.name &&
        (draftBatchId.value
          ? `draftBatches/${draftBatchId.value}/${pluralize(itemType.value.name)}/${uuidv4()}`
          : `${pluralize(itemType.value.name)}/${uuidv4()}`)) ||
      null
  )

  // TODO Should we support more complex requests, e.g. a POST request that returns a list of items? It might be
  // convenient not to have to write custom screens for such things, and to be able to use the existing REST-oriented
  // framework instead.
  const restCollectionUrl = computed(() => {
    if (concreteOptions.value.restCollectionUrl != null) {
      return concreteOptions.value.restCollectionUrl
    }
    if (!itemType.value || !itemType.value.restCollectionName) {
      return null
    }
    return draftBatchId.value
      ? `${config.apiBaseUrl}/draft-batches/${draftBatchId.value}/${itemType.value.restCollectionName}/`
      : `${config.apiBaseUrl}/${itemType.value.restCollectionName}/`
  })

  const httpOptions = computed(() => {
    return _.merge({}, concreteOptions.value.httpOptions, _.get(itemType, 'value.httpOptions'))
  })

  const ensureItemsStore = () => {
    let switchedStore = false
    if (itemType.value && stateNamespace.value) {
      if (store.hasModule(stateNamespace.value)) {
        switchedStore = true
        itemsStoreReady.value = true
      } else {
        const options = _.mergeWith(
          {},
          DEFAULT_OPTIONS,
          concreteOptions.value,
          {httpOptions},
          (currentValue, sourceValue) => {
            // Allow empty arrays to take precedence over defaults.
            if (
              _.isArray(sourceValue) &&
              sourceValue.length == 0 &&
              (currentValue == null || _.isArray(currentValue))
            ) {
              return sourceValue
            }
            return undefined
          }
        )
        if (itemType?.value?.primaryKey) {
          options.primaryKey = itemType.value.primaryKey
        }
        store.registerModule(stateNamespace.value, makeItemsModule(restCollectionUrl.value, options))
        switchedStore = true
        itemsStoreReady.value = true
      }
      // TODO Move to client class, in a watcher for itemsStoreReady
      //this.registerListNavigator({name: 'Items', listNavigator: this.$refs.itemsTable})
    }
    return switchedStore
  }

  watch(
    // TODO Changing the options won't cause the items store to be re-created, but we'd like this to happen.
    () => [itemType.value, stateNamespace.value, concreteOptions.value],
    () => ensureItemsStore(),
    {immediate: true}
  )

  const setQuery = (query) => {
    if (!itemsStoreReady.value || !itemType.value) {
      return null
    }
    if (_.isFunction(query)) {
      query = query(itemType.value)
    }
    store.dispatch(`${stateNamespace.value}/setQuery`, query)
  }

  return {
    // Data
    // itemTypeName,
    entityType: itemType,
    itemType,
    draftBatchId,
    itemsStoreReady,
    stateNamespace,
    detailItems: computed(() =>
      itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.detailItems`) : []
    ),
    editingDetailItems: computed(() =>
      itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.editingDetailItems`) : false
    ),
    invalidItems: computed(() =>
      itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.invalidItems`) : []
    ),
    // items: computed(() => itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.items`) : []),
    items: computed(() => {
      if (itemsStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureItemsLoaded`)
        return _.get(store.state, `${stateNamespace.value}.items`)
      } else {
        return []
      }
    }),
    itemsStatus: computed(() =>
      itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.itemsStatus`) : 'NotLoaded'
    ),
    selectedItems: computed(() =>
      itemsStoreReady.value ? _.get(store.state, `${stateNamespace.value}.selectedItems`) : []
    ),

    // Methods
    resetItems,
    ensureItemsStore,
    addItem: (payload) => (itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/addItem`, payload) : null),
    deregisterListNavigator: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/deregisterListNavigator`, payload) : null,
    ensureItemsLoaded: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/ensureItemsLoaded`, payload) : null,
    invalidateItems: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/invalidateItems`, payload) : null,
    loadItems: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/beginLoadingItems`, payload) : null, // TODO Change to loadItems
    registerListNavigator: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/registerListNavigator`, payload) : null,
    saveItem: (payload) => (itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/saveItem`, payload) : null),
    saveItems: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/saveItems`, payload) : null,
    selectItems: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/selectItems`, payload) : null,
    setBatchSaveAttempted: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/setBatchSaveAttempted`, payload) : null,
    setInvalidItemIds: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/setInvalidItemIds`, payload) : null,
    setItemIds: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/setItemIds`, payload) : null,
    setQuery: setQuery,
    setRequestBody: (payload) =>
      itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/setRequestBody`, payload) : null
    // setQuery: (payload) => itemsStoreReady.value ? store.dispatch(`${stateNamespace.value}/setQuery`, payload) : null
  }
}
