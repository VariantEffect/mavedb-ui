import _ from 'lodash'
import pluralize from 'pluralize'
import {v4 as uuidv4} from 'uuid'
import {computed, ref, watch} from 'vue'
import {useStore} from 'vuex'
import makeRemoteDataModule from '@/store/modules/remote-data'

// const DEFAULT_OPTIONS = {}

export default ({
  stateNamespace: initialStateNamespace = null,
  options: initialOptions = {}
} = {}) => {
  const store = useStore()

  const remoteDataStoreReady = ref(false)

  const configStateNamespace = ref(initialStateNamespace)
  const configOptions = ref(initialOptions)

  const resetData = ({
    stateNamespace = null,
    options = null
  } = {}) => {
    configStateNamespace.value = stateNamespace
    if (options != null) {
      configOptions.value = options
    }
  }

  const stateNamespace = computed(() => {
    if (configStateNamespace.value) {
      return configStateNamespace
    }
    const base = 'data'
    return `${pluralize(base)}/${uuidv4()}`
  })

  const ensureRemoteDataStore = () => {
    let switchedStore = false
    if (stateNamespace.value) {
      if (store.hasModule(stateNamespace.value)) {
        switchedStore = true
        remoteDataStoreReady.value = true
      } else {
        store.registerModule(
          stateNamespace.value,
          makeRemoteDataModule() // _.merge({}, DEFAULT_OPTIONS, configOptions.value)
        )
        switchedStore = true
        remoteDataStoreReady.value = true
      }
    }
    return switchedStore
  }

  watch(
    // TODO Changing the options won't cause the items store to be re-created, but we'd like this to happen.
    () => [remoteDataStoreReady.value, stateNamespace.value, configOptions.value],
    () => {
      ensureRemoteDataStore()
      if (remoteDataStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureDataLoaded`)
      }
    },
    {immediate: true}
  )

  return {
    // Data
    remoteDataStoreReady,
    stateNamespace,
    data: computed(() => {
      if (remoteDataStoreReady.value) {
        store.dispatch(`${stateNamespace.value}/ensureDataLoaded`)
        return _.get(store.state, `${stateNamespace.value}.data`)
      } else {
        return null
      }
    }),
    remoteDataStatus: computed(() => remoteDataStoreReady.value ? _.get(store.state, `${stateNamespace.value}.dataStatus`) : 'NotLoaded'),

    // Methods
    resetData,
    ensureRemoteDataStore,
    ensureDataLoaded: (payload) => remoteDataStoreReady.value ? store.dispatch(`${stateNamespace.value}/ensureDataLoaded`, payload) : null,
    loadData: (payload) => remoteDataStoreReady.value ? store.dispatch(`${stateNamespace.value}/loadData`, payload) : null,
    setDataUrl: (payload) => remoteDataStoreReady.value ? store.dispatch(`${stateNamespace.value}/setDataUrl`, payload) : null
  }
}
