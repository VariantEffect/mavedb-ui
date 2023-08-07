import _ from 'lodash'
import pluralize from 'pluralize'
import {v4 as uuidv4} from 'uuid'
import {computed, ref, watch} from 'vue'
import {useStore} from 'vuex'
import config from '@/config'
import itemTypes from '@/lib/item-types'
import makeItemModule from '@/store/modules/item'

// const DEFAULT_OPTIONS = {}

export default ({
  itemTypeName: initialItemTypeName = null,
  stateNamespace: initialStateNamespace = null,
  options: initialOptions = {}
} = {}) => {
  const store = useStore()

  const itemStoreReady = ref(false)

  const configItemTypeName = ref(initialItemTypeName)
  const configStateNamespace = ref(initialStateNamespace)
  const configOptions = ref(initialOptions)

  const resetItem = ({
    itemTypeName = null,
    stateNamespace = null,
    options = null
  } = {}) => {
    configItemTypeName.value = itemTypeName
    configStateNamespace.value = stateNamespace
    if (options != null) {
      configOptions.value = options
    }
  }

  const itemType = computed(
    () => (configItemTypeName.value && itemTypes[configItemTypeName.value]) || null
  )

  const stateNamespace = computed(() => {
    if (configStateNamespace.value) {
      return configStateNamespace
    }
    const base = (itemType.value && itemType.value.name) || 'item'
    return `${pluralize(base)}/one/${uuidv4()}`
  })

  const ensureItemStore = () => {
    let switchedStore = false
    if (itemType.value && stateNamespace.value) {
      const httpOptions = _.get(itemType.value, 'httpOptions.list', {})
      if (store.hasModule(stateNamespace.value)) {
        switchedStore = true
        itemStoreReady.value = true
      } else {
        const restCollectionUrl = httpOptions.url ? `${httpOptions.url}/` : `${config.apiBaseUrl}/${itemType.value.restCollectionName}/`
        store.registerModule(
          stateNamespace.value,
          makeItemModule(restCollectionUrl, {
            ...itemType.value.primaryKey ? {primaryKey: itemType.value.primaryKey} : null
          }) // _.merge({}, DEFAULT_OPTIONS, configOptions.value)
        )
        switchedStore = true
        itemStoreReady.value = true
      }
    }
    return switchedStore
  }

  watch(
    // TODO Changing the options won't cause the items store to be re-created, but we'd like this to happen.
    () => [itemType.value, itemStoreReady.value, stateNamespace.value, configOptions.value],
    () => {
      ensureItemStore()
      if (itemStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureItemLoaded`)
      }
    },
    {immediate: true}
  )

  return {
    // Data
    // entityTypeName,
    itemType,
    itemStoreReady,
    stateNamespace,
    item: computed(() => {
      if (itemStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureItemLoaded`)
        return _.get(store.state, `${stateNamespace.value}.item`)
      } else {
        return null
      }
    }),
    itemStatus: computed(() => itemStoreReady.value ? _.get(store.state, `${stateNamespace.value}.itemStatus`) : 'NotLoaded'),

    // Methods
    resetItem,
    ensureItemStore,
    ensureItemLoaded: (payload) => itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/ensureItemLoaded`, payload) : null,
    loadItem: (payload) => itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/loadItem`, payload) : null,
    reloadItem: (payload) => itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/reloadItem`, payload) : null,
    saveItem: (payload) => itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/saveItem`, payload) : null,
    setItemId: (payload) => itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/setItemId`, payload) : null
  }
}
