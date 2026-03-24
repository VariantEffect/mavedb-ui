import _ from 'lodash'
import pluralize from 'pluralize'
import {v4 as uuidv4} from 'uuid'
import {computed, ref, watch, type ComputedRef, type Ref} from 'vue'
// @ts-expect-error vuex has no declaration file
import {useStore} from 'vuex'
import config from '@/config'
import itemTypes from '@/lib/item-types'
import makeItemModule from '@/store/modules/item'

interface UseItemParams {
  itemTypeName?: string | null
  stateNamespace?: string | null
  options?: Record<string, unknown>
}

interface UseItemReturn<T> {
  itemType: ComputedRef<Record<string, unknown> | null>
  itemStoreReady: Ref<boolean>
  stateNamespace: ComputedRef<string | Ref<string | null>>
  item: ComputedRef<T | null>
  itemStatus: ComputedRef<string>
  resetItem: (params?: {itemTypeName?: string | null; stateNamespace?: string | null; options?: Record<string, unknown> | null}) => void
  ensureItemStore: () => boolean
  ensureItemLoaded: (payload?: unknown) => Promise<unknown> | null
  loadItem: (payload?: unknown) => Promise<unknown> | null
  reloadItem: (payload?: unknown) => Promise<unknown> | null
  saveItem: (payload?: unknown) => Promise<unknown> | null
  setItemId: (payload?: unknown) => Promise<unknown> | null
}

export default <T = unknown>({
  itemTypeName: initialItemTypeName = null,
  stateNamespace: initialStateNamespace = null,
  options: initialOptions = {}
}: UseItemParams = {}): UseItemReturn<T> => {
  const store = useStore()

  const itemStoreReady = ref(false)

  const configItemTypeName = ref(initialItemTypeName)
  const configStateNamespace = ref(initialStateNamespace)
  const configOptions = ref(initialOptions)

  const resetItem = ({itemTypeName = null, stateNamespace = null, options = null}: {itemTypeName?: string | null; stateNamespace?: string | null; options?: Record<string, unknown> | null} = {}) => {
    configItemTypeName.value = itemTypeName
    configStateNamespace.value = stateNamespace
    if (options != null) {
      configOptions.value = options
    }
  }

  const itemType = computed(() => (configItemTypeName.value && (itemTypes as Record<string, Record<string, unknown>>)[configItemTypeName.value]) || null)

  const stateNamespace = computed(() => {
    if (configStateNamespace.value) {
      return configStateNamespace
    }
    const base = (itemType.value && (itemType.value as Record<string, unknown>).name as string) || 'item'
    return `${pluralize(base)}/one/${uuidv4()}`
  })

  const ensureItemStore = () => {
    let switchedStore = false
    if (itemType.value && stateNamespace.value) {
      const httpOptions = _.get(itemType.value, 'httpOptions.list', {}) as Record<string, unknown>
      if (store.hasModule(stateNamespace.value)) {
        switchedStore = true
        itemStoreReady.value = true
      } else {
        const restCollectionUrl = httpOptions.url
          ? `${httpOptions.url}/`
          : `${config.apiBaseUrl}/${(itemType.value as Record<string, unknown>).restCollectionName}/`
        store.registerModule(
          stateNamespace.value as string,
          makeItemModule(restCollectionUrl, (itemType.value as Record<string, unknown>).primaryKey
            ? {primaryKey: (itemType.value as Record<string, unknown>).primaryKey as string}
            : {})
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
    itemType,
    itemStoreReady,
    stateNamespace,
    item: computed(() => {
      if (itemStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureItemLoaded`)
        return _.get(store.state, `${stateNamespace.value}.item`) as T | null
      } else {
        return null
      }
    }),
    itemStatus: computed(() =>
      itemStoreReady.value ? _.get(store.state, `${stateNamespace.value}.itemStatus`) : 'NotLoaded'
    ),

    // Methods
    resetItem,
    ensureItemStore,
    ensureItemLoaded: (payload?: unknown) =>
      itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/ensureItemLoaded`, payload) : null,
    loadItem: (payload?: unknown) => (itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/loadItem`, payload) : null),
    reloadItem: (payload?: unknown) =>
      itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/reloadItem`, payload) : null,
    saveItem: (payload?: unknown) => (itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/saveItem`, payload) : null),
    setItemId: (payload?: unknown) => (itemStoreReady.value ? store.dispatch(`${stateNamespace.value}/setItemId`, payload) : null)
  }
}
