import {computed, watch} from 'vue'
import {useRoute} from 'vue-router'
import useEntityTypes from '@/composition/entity-types'
import useItems from '@/composition/items'

/**
 * This provides the same functionality as the following code that uses the Vue options API:
 *   {
 *     data: function() {
 *       return {
 *         draftBatchId: this.$route.params.draftBatchId
 *       }
 *     },
 *     computed: {
 *       ...mapState('draft-batches', {
 *         draftBatches: state => state.items
 *       })
 *     },
 *     watch: {
 *       $route: {
 *         handler: function() {
 *           this.draftBatchId = this.$route.params.draftBatchId
 *         }
 *       }
 *     },
 *     methods: {
 *       ...mapActions('draft-batches', {ensureDraftBatchesLoaded: 'ensureItemsLoaded'}),
 *     }
 *   }
 */

export default () => {
  const entityTypes = useEntityTypes()
  const route = useRoute()
  const draftBatchesModule = useItems({entityTypeName: 'draft-batch'})
  draftBatchesModule.ensureItemsStore()
  watch(draftBatchesModule.itemsStoreReady, () => draftBatchesModule.loadItems(), {immediate: true})

  const draftBatchId = computed(() => route.params.draftBatchId)

  const draftBatchEntityType = computed(() => entityTypes.getEntityType('draft-batch'))

  const draftBatch = computed(() => {
    if (!draftBatchId.value || !draftBatchesModule.itemsStoreReady) {
      return null
    }
    return (draftBatchesModule.items.value || []).find((draftBatch) => draftBatch._id == draftBatchId.value)
  })

  return {
    // Data
    draftBatchId,
    draftBatch,
    draftBatchEntityType
  }
}
