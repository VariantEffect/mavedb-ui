<script>

import axios from 'axios'
import { mapActions } from 'vuex'
import config from '../config'

const collectionUrl = `${config.apiBaseUrl}/draft-batches`

export default {
  name: 'DraftBatchesManager',

  render: () => null,

  data: () => ({
    stateNamespace: 'myDraftBatches'
  }),

  methods: {

    commitDraftBatch: async function(draftBatchId) {
      let response = null
      try {
        response = await axios.get(`${collectionUrl}/${draftBatchId}/commit`)
      } catch (err) {
        if (err.response) {
          response = err.response
        }
      }
      // TODO Do we want separate handling for error codes?
      if (response.data) {
        if (response.data.success) {
          if (await this.checkForDeletedItem({ itemId: draftBatchId })) {
            return {success: true}
          }
        } else {
          // response.data should have a validationErrors property.
          return response.data
        }
      }
    },

    createDraftBatch: async function(options = {}) {
      const { draftType } = options
      const draftBatch = { draftType }
      const draftBatchId = (await this.saveItem({item: draftBatch}))._id
      return draftBatchId
    },

    deleteDraftBatch: async function(draftBatchId) {
      await this.beginDeletingDraftBatch({itemId: draftBatchId})
    },

    ...mapActions({
      beginDeletingDraftBatch(dispatch, payload) {
        return dispatch(this.stateNamespace + '/beginDeletingItem', payload)
      },
      saveItem(dispatch, payload) {
        return dispatch(this.stateNamespace + '/saveItem', payload)
      },
      checkForDeletedItem(dispatch, payload) {
        return dispatch(this.stateNamespace + '/checkForDeletedItem', payload)
      }
    })

  }
}

</script>
