<template>
  <template v-if="visible">
    <EmailPrompt />
  </template>
  <div class="collection-data-set-editor">
    <Button
      class="mave-collection-data-set-editor-button"
      label="Edit"
      @click="visible = true"
    />
    <Dialog
      v-model:visible="visible"
      :close-on-escape="false"
      :header="`Add and remove ${dataSetTypeDisplay[dataSetType]}s from collection`"
      modal
      :style="{width: '45rem'}"
      @hide="resetDataSetEditor"
    >
      <div class="flex flex-column gap-2">
        <Button
          class="mave-collection-remove-data-set-button"
          :disabled="!selectedDataSets || !selectedDataSets.length"
          icon="pi pi-trash"
          label="Remove"
          severity="danger"
          @click="markDataSetsToRemove"
        />
        <DataTable
          v-model:selection="selectedDataSets"
          data-key="urn"
          :row-style="rowStyle"
          tableStyle="min-width: 50rem"
          :value="allDataSets"
        >
          <Column selectionMode="multiple"></Column>
          <Column field="urn" header="URN"></Column>
          <Column field="title" header="Title"></Column>
        </DataTable>
        <div class="flex gap-2">
          <Chips
            v-model="unvalidatedUrnsToAdd"
            :add-on-blur="true"
            :allow-duplicate="false"
            class="flex-auto p-fluid"
            placeholder="Type or paste comma-separated URNs"
            separator=" "
            @keyup.escape="unvalidatedUrnsToAdd = []"
          />
          <Button class="flex-none mave-collection-add-data-set-button" icon="pi pi-plus" label="Add" @click="fetchDataSetsToAdd" />
        </div>
        <Message class="mave-validation-errors-message" v-if="validationErrors.length > 0" severity="error">
          There were validation errors
          <div v-if="validationErrors.length > 0" class="mave-validation-errors">
            <div v-for="errorMessage in validationErrors" class="mave-validation-error" :key="errorMessage">{{ errorMessage }}</div>
          </div>
        </Message>
        <Message v-if="errors.length > 0" severity="error">
          Sorry, some changes could not be saved.
        </Message>
      </div>
      <div class="mave-collection-editor-action-buttons">
        <Button label="Cancel" severity="secondary" @click="visible = false" />
        <Button label="Save" @click="saveChanges" />
      </div>
    </Dialog>
    <Dialog
      v-model:visible="unpreparedChangesDialogVisible"
      :close-on-escape="true"
      header="Warning"
      modal
    >
      Please add your new data sets or clear the URNs box before saving changes.
    </Dialog>
  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'

import useItem from '@/composition/item'
import config from '@/config'
import EmailPrompt from '@/components/common/EmailPrompt.vue'

export default {
  name: 'CollectionDataSetEditor',

  emits: ['saved'],

  components: {Button, Chips, Column, DataTable, Dialog, EmailPrompt, Message},

  props: {
    collectionUrn: {
      type: String,
      required: true
    },
    dataSetType: {
      type: String,
      required: true
    },
  },

  setup: () => {
    return {
      ...useItem({itemTypeName: 'collection'}),
    }
  },

  data: () => ({
    visible: false,

    unvalidatedUrnsToAdd: [],
    dataSetsToAdd: [],
    urnsToRemove: [],

    selectedDataSets: [],

    validationErrors: [],
    additionErrors: [],
    removalErrors: [],

    dataSetTypeDisplay: {
      scoreSet: 'score set',
      experiment: 'experiment'
    },
    unpreparedChangesDialogVisible: false
  }),

  computed: {
    allDataSets() {
      const savedDataSets = this.savedDataSets.map((dataSet) => ({...dataSet, saved: true}))
      const newDataSets = this.dataSetsToAdd.map((dataSet) =>({...dataSet, saved: false}))
      return savedDataSets.concat(newDataSets)
    },

    errors: function() {
      return [...this.additionErrors, ...this.removalErrors]
    },

    restCollectionParent: function() {
      if (this.dataSetType === 'experiment') {
        return 'experiments'
      } else {
        return 'score-sets'
      }
    },

    savedDataSetUrns: function() {
      return this.item?.[`${this.dataSetType}Urns`] || []
    }
  },

  watch: {
    collectionUrn: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    },

    savedDataSetUrns: {
      handler: async function(newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          await this.fetchSavedDataSets()
        }
      },
      immediate: true
    }
  },

  methods: {
    rowStyle: function(data) {
      if (this.urnsToRemove.includes(data.urn)) {
        return {backgroundColor: '#ffcccb'} // Light red
      } else if (data.saved === false) {
        return {backgroundColor: '#d1ffbd'} // Light green
      }
    },

    markDataSetsToRemove: function() {
      for (const dataSetToRemove of this.selectedDataSets) {
        if (dataSetToRemove.saved) {
          this.urnsToRemove.push(dataSetToRemove.urn)
        } else {
          _.remove(this.dataSetsToAdd, (dataSet) => dataSet.urn == dataSetToRemove.urn)
        }
      }
    },

    saveChanges: async function() {
      if (this.unvalidatedUrnsToAdd.length > 0) {
        this.unpreparedChangesDialogVisible = true
        return
      }

      this.additionErrors = []
      this.removalErrors = []

      const additionErrorUrns = []
      for (const dataSetToAdd of this.dataSetsToAdd) {
        try {
          if (this.dataSetType == 'experiment') {
            await axios.post(
              `${config.apiBaseUrl}/collections/${this.collectionUrn}/experiments`,
              {experiment_urn: dataSetToAdd.urn}
            )
          } else if (this.dataSetType == 'scoreSet') {
            await axios.post(
              `${config.apiBaseUrl}/collections/${this.collectionUrn}/score-sets`,
              {score_set_urn: dataSetToAdd.urn}
            )
          }
        } catch (error) {
          additionErrorUrns.push(dataSetToAdd.urn)
          this.additionErrors.push(`${dataSetToAdd.urn}: ${error.message || 'Could not be added to the collection'}`)
        }
      }
      _.remove(this.dataSetsToAdd, (dataSet) => !additionErrorUrns.includes(dataSet.urn))

      const removalErrorUrns = []
      for (const urn of this.urnsToRemove) {
        try {
          await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/${this.restCollectionParent}/${urn}`)
        } catch (error) {
          removalErrorUrns.push(urn)
          this.removalErrors.push(`${urn}: ${error.message || 'Could not be removed from the collection'}`)
        }
      }
      _.remove(this.urnsToRemove, (dataSet) => !removalErrorUrns.includes(dataSet.urn))

      if (_.isEmpty(this.errors)) {
        this.visible = false
        this.$toast.add({severity: 'success', summary: 'Successfully updated collection\'s experiments.', life: 3000})
      }

      // Always emit 'saved', because if any API calls succeed (even if others fail), we need to reload collection's data sets.
      this.$emit('saved')
    },

    fetchDataSetsToAdd: async function() {
      this.validationErrors = []
      const invalidUrns = []
      for (let urn of this.unvalidatedUrnsToAdd) {
        urn = urn.trim()
        if (this.item[`${this.dataSetType}Urns`].includes(urn) || this.dataSetsToAdd.some((dataSet) => dataSet.urn == urn)) {
          // Silently ignore the data sets in the collection or already prepared for adding in this session.
        } else {
          // Fetch the data set.
          let response = null
          try {
            response = await axios.get(`${config.apiBaseUrl}/${this.restCollectionParent}/${urn}`)
          } catch (e) {
            response = e.response || {status: 500}
            this.validationErrors.push(`${urn}: ${e.message}`)
          }
          if (response.status == 200) {
            this.dataSetsToAdd.push(response.data)
          } else {
            invalidUrns.push(urn)
          }
        }
      }
      this.unvalidatedUrnsToAdd = invalidUrns
    },

    fetchSavedDataSets: async function() {
      const savedDataSets = []
      for (const urn of this.savedDataSetUrns) {
        console.log(urn)
        let response = null
        try {
          response = await axios.get(`${config.apiBaseUrl}/${this.restCollectionParent}/${urn}`)
        } catch (e) {
          response = e.response || {status: 500}
        }
        if (response.status == 200) {
          savedDataSets.push(response.data)
        }
      }
      this.savedDataSets = savedDataSets
    },

    resetDataSetEditor: function() {
      this.unvalidatedUrnsToAdd = []
      this.dataSetsToAdd = []
      this.urnsToRemove = []

      this.validationErrors = []
      this.additionErrors = []
      this.removalErrors = []
    }
  }
}
</script>

<style scoped>
.mave-collection-data-set-editor-button {
  width: fit-content;
}

.mave-collection-add-data-set-button {
  width: fit-content;
}

.mave-collection-remove-data-set-button {
  width: fit-content;
}

.mave-collection-editor-action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin: 20px 0 0 0;
}

.mave-collection-editor-action-buttons Button {
  margin: 0 0 0 3px;
}

.mave-validation-errors-message:deep(.p-message-text) {
  width: 100%;
}

.mave-validation-errors {
  max-height: 100px;
  overflow: auto;
  width: 100%;
}
</style>
