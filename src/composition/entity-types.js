import {ref} from 'vue'
import itemTypes from '@/lib/item-types'

/**
 * This provides the same functionality as the following code that uses the Vue options API:
 *   {
 *     computed: {
 *       getEntityType: function(entityTypeName) {
 *         return this.entityTypes ? this.entityTypes.find(et => et.name == entityTypeName) : null
 *       },
 *       ...mapState('entity-types', {
 *         entityTypes: (state) => _.get(state, 'items')
 *       })
 *     },
 *     methods: {
 *       ...mapActions('entity-types', { ensureEntityTypesLoaded: 'ensureItemsLoaded' })
 *     }
 *   }
 */

/*
export default () => {
  const store = useStore()

  const stateNamespace = 'entity-types'

  const entityTypesStoreReady = ref(false)

  const ensureEntityTypesStore = () => {
    let switchedStore = false
    if (!store.hasModule(stateNamespace)) {
      store.registerModule(stateNamespace, makeItemsModule(`${config.apiBaseUrl}/entity-types`))
      switchedStore = true
      entityTypesStoreReady.value = true
    }
    return switchedStore
  }

  const entityTypes = computed(() => _.get(store.state, `${stateNamespace}.items`))

  const ensureEntityTypesLoaded = (payload) => store.dispatch(`${stateNamespace}/ensureItemsLoaded`, payload)
  const getEntityType = (entityTypeName) => entityTypes.value ?
      entityTypes.value.find((et) => et.name == entityTypeName)
      : null

  ensureEntityTypesStore()
  ensureEntityTypesLoaded()

  return {
    // Data
    entityTypes,
    entityTypesStoreReady,

    // Methods
    ensureEntityTypesLoaded,
    ensureEntityTypesStore,
    getEntityType
  }
}
*/

export default () => {
  const entityTypes = ref(itemTypes)
  const entityTypesStoreReady = ref(true)

  const ensureEntityTypesStore = () => {}
  const ensureEntityTypesLoaded = () => {}
  const getEntityType = (entityTypeName) => entityTypes.value ?
      entityTypes.value.find((et) => et.name == entityTypeName)
      : null

  return {
    // Data
    entityTypes,
    entityTypesStoreReady,

    // Methods
    ensureEntityTypesLoaded,
    ensureEntityTypesStore,
    getEntityType
  }
}
