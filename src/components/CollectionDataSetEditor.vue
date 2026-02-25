<template>
  <template v-if="visible">
    <EmailPrompt />
  </template>
  <div class="collection-data-set-editor">
    <Button v-if="showTrigger" class="mavedb-collection-data-set-editor-button" label="Add items" @click="openEditor" />
    <Dialog
      v-model:visible="visible"
      :close-on-escape="false"
      :header="`Add ${dataSetTypeDisplay[dataSetType]}s to collection`"
      modal
      :style="{width: '45rem'}"
      @hide="resetDataSetEditor"
    >
      <div class="flex flex-column gap-2">
        <div class="flex gap-2">
          <AutoComplete
            ref="urnAutoComplete"
            v-model="unvalidatedUrnsToAdd"
            class="flex-auto p-fluid"
            :multiple="true"
            :placeholder="unvalidatedUrnsToAdd.length ? '' : 'Type or paste comma-separated URNs'"
            :pt="{overlay: (options) => ({class: ['invisible']})}"
            @keyup.,="newUnvalidatedUrnToAdd"
            @keyup.enter.prevent="fetchDataSetsToAdd"
            @keyup.escape="clearAutoCompleteInput"
            @keyup.space="newUnvalidatedUrnToAdd"
          />
          <Button
            class="flex-none mavedb-collection-add-data-set-button"
            icon="pi pi-plus"
            label="Add"
            @click="fetchDataSetsToAdd"
          />
        </div>
        <DataTable v-if="dataSetsToAdd.length > 0" data-key="urn" table-style="min-width: 50rem" :value="dataSetsToAdd">
          <Column field="urn" header="URN"></Column>
          <Column field="title" header="Title"></Column>
          <Column>
            <template #body="{data}">
              <Button icon="pi pi-times" severity="danger" size="small" text @click="removeDataSetToAdd(data.urn)" />
            </template>
          </Column>
        </DataTable>
        <Message v-if="validationErrors.length > 0" class="mavedb-validation-errors-message" severity="error">
          There were validation errors
          <div v-if="validationErrors.length > 0" class="mavedb-validation-errors">
            <div v-for="errorMessage in validationErrors" :key="errorMessage" class="mavedb-validation-error">
              {{ errorMessage }}
            </div>
          </div>
        </Message>
        <Message v-if="errors.length > 0" severity="error"> Sorry, some changes could not be saved. </Message>
      </div>
      <div class="mavedb-collection-editor-action-buttons">
        <Button label="Cancel" severity="secondary" @click="visible = false" />
        <Button :disabled="dataSetsToAdd.length === 0" label="Save" @click="saveChanges" />
      </div>
    </Dialog>
    <Dialog v-model:visible="unpreparedChangesDialogVisible" :close-on-escape="true" header="Warning" modal>
      Please add your new data sets or clear the URNs box before saving changes.
    </Dialog>
  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'

import useItem from '@/composition/item'
import config from '@/config'
import EmailPrompt from '@/components/common/EmailPrompt.vue'

const INVALID_URN_MESSAGES_DISPLAY_LIMIT = 3

export default {
  name: 'CollectionDataSetEditor',

  components: {AutoComplete, Button, Column, DataTable, Dialog, EmailPrompt, Message},

  props: {
    collectionUrn: {
      type: String,
      required: true
    },
    dataSetType: {
      type: String,
      required: true
    },
    showTrigger: {
      type: Boolean,
      default: true
    }
  },

  emits: ['saved'],

  setup: () => useItem({itemTypeName: 'collection'}),

  data: () => ({
    visible: false,

    unvalidatedUrnsToAdd: [],
    dataSetsToAdd: [],

    validationErrors: [],
    additionErrors: [],

    dataSetTypeDisplay: {
      scoreSet: 'score set',
      experiment: 'experiment'
    },
    unpreparedChangesDialogVisible: false
  }),

  computed: {
    errors: function () {
      return this.additionErrors
    },

    restCollectionParent: function () {
      if (this.dataSetType === 'experiment') {
        return 'experiments'
      } else {
        return 'score-sets'
      }
    }
  },

  watch: {
    collectionUrn: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {
    openEditor: function () {
      this.visible = true
    },

    clearAutoCompleteInput: function (event) {
      if (event.target) {
        event.target.value = ''
      }
    },

    newUnvalidatedUrnToAdd: function (event) {
      const val = (event.target?.value || '').replace(',', '').trim()
      if (val !== '') {
        if (!this.unvalidatedUrnsToAdd.includes(val)) {
          this.unvalidatedUrnsToAdd.push(val)
        }
      }
      event.target.value = ''
    },

    flushPendingUrnInput: function () {
      const input = this.$refs.urnAutoComplete?.$el?.querySelector('input')
      const pendingUrn = (input?.value || '').replace(',', '').trim()
      if (pendingUrn !== '' && !this.unvalidatedUrnsToAdd.includes(pendingUrn)) {
        this.unvalidatedUrnsToAdd.push(pendingUrn)
      }
      if (input) {
        input.value = ''
      }
    },

    saveChanges: async function () {
      if (this.unvalidatedUrnsToAdd.length > 0) {
        this.unpreparedChangesDialogVisible = true
        return
      }

      this.additionErrors = []

      const additionErrorUrns = []
      for (const dataSetToAdd of this.dataSetsToAdd) {
        try {
          if (this.dataSetType == 'experiment') {
            await axios.post(`${config.apiBaseUrl}/collections/${this.collectionUrn}/experiments`, {
              experiment_urn: dataSetToAdd.urn
            })
          } else if (this.dataSetType == 'scoreSet') {
            await axios.post(`${config.apiBaseUrl}/collections/${this.collectionUrn}/score-sets`, {
              score_set_urn: dataSetToAdd.urn
            })
          }
        } catch (error) {
          additionErrorUrns.push(dataSetToAdd.urn)
          this.additionErrors.push(`${dataSetToAdd.urn}: ${error.message || 'Could not be added to the collection'}`)
        }
      }
      _.remove(this.dataSetsToAdd, (dataSet) => !additionErrorUrns.includes(dataSet.urn))

      if (_.isEmpty(this.errors)) {
        this.visible = false
        this.$toast.add({
          severity: 'success',
          summary: `Successfully added ${this.dataSetTypeDisplay[this.dataSetType]}s.`,
          life: 3000
        })
      }

      // Always emit 'saved', because if any API calls succeed (even if others fail), we need to reload collection's data sets.
      this.$emit('saved')
    },

    removeDataSetToAdd: function (urn) {
      _.remove(this.dataSetsToAdd, (dataSet) => dataSet.urn === urn)
    },

    fetchDataSetsToAdd: async function () {
      this.validationErrors = []
      this.flushPendingUrnInput()

      if (!this.item) {
        this.validationErrors.push('Collection is still loading. Please try again in a moment.')
        return
      }

      if (this.unvalidatedUrnsToAdd.length === 0) {
        this.validationErrors.push('Please enter at least one URN.')
        return
      }

      const invalidUrns = []
      const invalidUrnMessages = []
      const alreadyInCollectionUrns = []
      const alreadyQueuedUrns = []
      for (let urn of this.unvalidatedUrnsToAdd) {
        urn = urn.trim()
        if (this.item[`${this.dataSetType}Urns`].includes(urn)) {
          alreadyInCollectionUrns.push(urn)
        } else if (this.dataSetsToAdd.some((dataSet) => dataSet.urn == urn)) {
          alreadyQueuedUrns.push(urn)
        } else {
          // Fetch the data set.
          let response = null
          try {
            response = await axios.get(`${config.apiBaseUrl}/${this.restCollectionParent}/${urn}`)
          } catch (e) {
            response = e.response || {status: 500}
            const errorDetail = e.response?.data?.detail || e.message || 'Invalid URN'
            const errorMessage = `${urn}: ${errorDetail}`
            this.validationErrors.push(errorMessage)
            invalidUrnMessages.push(errorMessage)
          }
          console.log(response)
          if (response.status == 200) {
            this.dataSetsToAdd.push(response.data)
          } else {
            invalidUrns.push(urn)
          }
        }
      }
      this.unvalidatedUrnsToAdd = []

      if (invalidUrnMessages.length > 0) {
        const detail =
          invalidUrnMessages.length > INVALID_URN_MESSAGES_DISPLAY_LIMIT
            ? `${invalidUrnMessages.slice(0, INVALID_URN_MESSAGES_DISPLAY_LIMIT).join(' • ')} • +${invalidUrnMessages.length - INVALID_URN_MESSAGES_DISPLAY_LIMIT} more`
            : invalidUrnMessages.join(' • ')
        this.$toast.add({
          severity: 'warn',
          summary: 'Some URNs could not be added',
          detail,
          life: 6000
        })
      }

      if (alreadyInCollectionUrns.length > 0 || alreadyQueuedUrns.length > 0) {
        const details = []
        if (alreadyInCollectionUrns.length > 0) {
          details.push(
            `Already in collection: ${alreadyInCollectionUrns.slice(0, INVALID_URN_MESSAGES_DISPLAY_LIMIT).join(', ')}${alreadyInCollectionUrns.length > INVALID_URN_MESSAGES_DISPLAY_LIMIT ? ` (+${alreadyInCollectionUrns.length - INVALID_URN_MESSAGES_DISPLAY_LIMIT} more)` : ''}`
          )
        }
        if (alreadyQueuedUrns.length > 0) {
          details.push(
            `Already queued: ${alreadyQueuedUrns.slice(0, INVALID_URN_MESSAGES_DISPLAY_LIMIT).join(', ')}${alreadyQueuedUrns.length > INVALID_URN_MESSAGES_DISPLAY_LIMIT ? ` (+${alreadyQueuedUrns.length - INVALID_URN_MESSAGES_DISPLAY_LIMIT} more)` : ''}`
          )
        }

        this.$toast.add({
          severity: 'info',
          summary: 'Some URNs were skipped',
          detail: details.join(' • '),
          life: 5000
        })
      }
    },

    resetDataSetEditor: function () {
      this.unvalidatedUrnsToAdd = []
      this.dataSetsToAdd = []

      this.validationErrors = []
      this.additionErrors = []
    }
  }
}
</script>
<style scoped>
.mavedb-collection-data-set-editor-button {
  width: fit-content;
}

.mavedb-collection-add-data-set-button {
  width: fit-content;
}

.mavedb-collection-editor-action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin: 20px 0 0 0;
}

.mavedb-collection-editor-action-buttons Button {
  margin: 0 0 0 3px;
}

.mavedb-validation-errors-message:deep(.p-message-text) {
  width: 100%;
}

.mavedb-validation-errors {
  max-height: 100px;
  overflow: auto;
  width: 100%;
}
</style>
