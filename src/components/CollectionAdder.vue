<template>
  <template v-if="dialogVisible">
    <EmailPrompt />
  </template>
  <div v-if="userIsAuthenticated" class="mave-collection-adder">
    <Button
      icon="pi pi-bookmark"
      class="mave-save-to-collection-button"
      label="Save to a collection"
      @click="dialogVisible = true"
    />
    <div v-if="collectionsContainingDataSet.length > 0" class="mave-collection-bookmarks">
      Member of:
      <router-link v-for="collection in collectionsContainingDataSet" class="mave-collection-bookmark" :key="collection" :to="{name: 'collection', params: {urn: collection.urn}}">
        <i class="pi pi-bookmark-fill" />
        {{ collection.name }}
      </router-link>
    </div>

    <Dialog
      v-model:visible="dialogVisible"
      :close-on-escape="true"
      header="Add to collection"
      modal
      :style="{width: '25rem'}"
    >
      <div class="flex align-items-center gap-3 mb-3">
        <Dropdown
          v-model="selectedCollectionUrn"
          class="w-full"
          option-label="name"
          option-value="urn"
          :options="editableCollections"
          placeholder="Select a collection"
        >
          <template #option="{option}">
            {{ option.name }}
            <i v-if="option.private" class="mave-collection-option-private pi pi-lock" title="Private collection" />
            <span class="mave-collection-option-sharing">{{ collectionSharingInfo(option) }}</span>
          </template>
        </Dropdown>
      </div>
      <div class="mave-save-to-collection-actions">
        <Button label="Create new collection" @click="creatorVisible = true" />
        <div class="mave-save-cancel-actions">
          <Button label="Cancel" severity="secondary" @click="dialogVisible = false" />
          <Button label="Save" @click="saveToCollection" />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="creatorVisible"
      :close-on-escape="false"
      header="Create collection"
      modal
      :style="{maxWidth: '90%', width: '50rem'}"
    >
      <CollectionCreator
        @canceled="creatorVisible = false"
        @created-collection="childComponentCreatedCollection"
      />
    </Dialog>
  </div>
</template>

<script>
import axios from 'axios'
import pluralize from 'pluralize'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

import config from '@/config'
import CollectionCreator from '@/components/CollectionCreator'
import useAuth from '@/composition/auth'
import EmailPrompt from '@/components/common/EmailPrompt.vue'

export default {
  name: 'CollectionAdder',
  components: {Button, CollectionCreator, Dialog, Dropdown, EmailPrompt},

  props: {
    dataSetUrn: {
      type: String,
      required: true
    },
    dataSetType: {
      type: String,
      required: true
    }
  },

  setup: () => {
    const {userIsAuthenticated, userOrcidId} = useAuth()
    return {userIsAuthenticated, userOrcidId}
  },

  data: () => ({
    myCollections: {
      admin: [],
      editor: [],
      viewer: []
    },
    selectedCollectionUrn: null,
    dialogVisible: false,
    creatorVisible: false
  }),

  computed: {
    collectionsContainingDataSet: function() {
      return [...this.myCollections.admin, ...this.myCollections.editor, ...this.myCollections.viewer].filter((collection) =>
        (collection[this.dataSetType == 'scoreSet' ? 'scoreSetUrns' : 'experimentUrns'] || []).includes(this.dataSetUrn)
      )
    },

    editableCollections: function() {
      const adminCollections = this.myCollections['admin']
      const editorCollections = this.myCollections['editor']
      return adminCollections.concat(editorCollections)
    }
  },

  mounted: async function() {
    this.fetchMyCollections()
  },

  watch: {
    userOrcidId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.fetchMyCollections()
        }
      }
    }
  },

  methods: {
    childComponentCreatedCollection: function(collection) {
      this.creatorVisible = false
      this.myCollections.admin.push(collection)
      this.selectedCollectionUrn = collection.urn
    },

    collectionSharingInfo: function(collection) {
      const numUsers = (collection.admins || []).length + (collection.editors || []).length
          + (collection.viewers || []).length
      if (numUsers > 1) {
        return `Shared with ${numUsers - 1} other ${pluralize('user', numUsers - 1)}`
      }
      return null
    },

    fetchMyCollections: async function() {
      this.myCollections = {
        admin: [],
        editor: [],
        viewer: []
      }

      let response = null
      try {
        response = await axios.get(`${config.apiBaseUrl}/users/me/collections`)
      } catch (error) {
        console.log(error)
        response = error.response || {status: 500}
      }

      if (response.status == 200) {
        this.myCollections = response.data
      }
    },

    saveToCollection: async function() {
      if (this.dataSetType === "scoreSet") {
        this.saveScoreSetToCollection(this.dataSetUrn)
      } else if (this.dataSetType === "experiment") {
        this.saveExperimentToCollection(this.dataSetUrn)
      }
      this.dialogVisible = false
      await this.fetchMyCollections()
    },

    saveScoreSetToCollection: async function(scoreSetUrn) {
      let response = null
      try {
        response = await axios.post(
          `${config.apiBaseUrl}/collections/${this.selectedCollectionUrn}/score-sets`,
          {scoreSetUrn}
        )
      } catch (error) {
        console.log(error)
        response = error.response || {status: 500}
      }

      if (response.status == 200) {
        this.$toast.add({severity: 'success', summary: 'Score set saved to collection.', life: 3000})
      } else {
        this.$toast.add({severity: 'warn', summary: response.data?.detail || 'Sorry, saving the score set to the collection failed.', life: 3000})
      }
    },

    saveExperimentToCollection: async function(experimentUrn) {
      let response = null
      try {
        response = await axios.post(
          `${config.apiBaseUrl}/collections/${this.selectedCollectionUrn}/experiments`,
          {experimentUrn}
        )
      } catch (error) {
        response = error.response || {status: 500}
      }

      if (response.status == 200) {
        this.$toast.add({ severity: 'success', summary: 'Experiment saved to collection.', life: 3000 })
      } else if (response.data && response.data.detail) {
        this.$toast.add({severity: 'warn', summary: response.data?.detail || 'Sorry, saving the experiment to the collection failed.', life: 3000})
      }
    }
  }
}
</script>

<style scoped>
.mave-save-to-collection-button {
  width: fit-content;
}

.mave-collection-bookmarks {
  margin: 1em 0;
}

.mave-collection-bookmark {
  /*background-color: #3f51b5;*/
  color: #3f51b5;
  padding: 5px;
  margin-right: 2em;
}

.mave-collection-bookmark .mave-collection-option-private {
  margin: 0;
}

.mave-save-to-collection-actions {
  justify-content: space-between;
  display: flex;
}

.mave-save-to-collection-actions .mave-save-cancel-actions {
  display: inline;
}

.mave-save-to-collection-actions .mave-save-cancel-actions Button {
  margin: 0 0 0 3px;
}

.mave-collection-option-private {
  margin: 0 0.5em;
}

.mave-collection-option-sharing {
  color: #999;
}

.mave-create-collection-button {
  display: inline;
}
</style>
