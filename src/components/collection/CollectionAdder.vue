<template>
  <template v-if="dialogVisible">
    <MvEmailPrompt :is-first-login-prompt="false" />
  </template>
  <div v-if="userIsAuthenticated" class="mave-collection-adder">
    <PButton
      class="mave-save-to-collection-button"
      icon="pi pi-bookmark"
      label="Save to a collection"
      size="small"
      @click="dialogVisible = true"
    />

    <PDialog
      v-model:visible="dialogVisible"
      :close-on-escape="true"
      header="Add to collection"
      modal
      :style="{width: '25rem'}"
    >
      <div class="flex align-items-center gap-3 mb-3">
        <PSelect
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
        </PSelect>
      </div>
      <div class="mave-save-to-collection-actions">
        <PButton label="Create new collection" @click="creatorVisible = true" />
        <div class="mave-save-cancel-actions">
          <PButton label="Cancel" severity="secondary" @click="dialogVisible = false" />
          <PButton label="Save" @click="saveToCollection" />
        </div>
      </div>
    </PDialog>

    <PDialog
      v-model:visible="creatorVisible"
      :close-on-escape="false"
      header="Create collection"
      modal
      :style="{maxWidth: '90%', width: '50rem'}"
    >
      <CollectionCreator @canceled="creatorVisible = false" @created-collection="childComponentCreatedCollection" />
    </PDialog>
  </div>
</template>

<script lang="ts">
import pluralize from 'pluralize'
import PButton from 'primevue/button'
import PDialog from 'primevue/dialog'
import PSelect from 'primevue/select'

import {getMyCollections, addCollectionScoreSet, addCollectionExperiment} from '@/api/mavedb'
import CollectionCreator from '@/components/collection/CollectionCreator.vue'
import useAuth from '@/composition/auth'
import MvEmailPrompt from '@/components/common/MvEmailPrompt.vue'
import {components} from '@/schema/openapi'

type Collection = components['schemas']['Collection']

export default {
  name: 'CollectionAdder',
  components: {PButton, CollectionCreator, PDialog, PSelect, MvEmailPrompt},

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

  emits: ['collections-updated'],

  setup: () => {
    const {userIsAuthenticated, userOrcidId} = useAuth()
    return {userIsAuthenticated, userOrcidId}
  },

  data: () => ({
    myCollections: {
      admin: [] as Collection[],
      editor: [] as Collection[],
      viewer: [] as Collection[]
    },
    selectedCollectionUrn: null as string | null,
    dialogVisible: false,
    creatorVisible: false
  }),

  computed: {
    editableCollections: function () {
      const adminCollections = this.myCollections['admin']
      const editorCollections = this.myCollections['editor']
      return adminCollections.concat(editorCollections)
    }
  },

  watch: {
    userOrcidId: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.fetchMyCollections()
        }
      }
    }
  },

  mounted: async function () {
    this.fetchMyCollections()
  },

  methods: {
    childComponentCreatedCollection: function (collection: Collection) {
      this.creatorVisible = false
      this.myCollections.admin.push(collection)
      this.selectedCollectionUrn = collection.urn
    },

    collectionSharingInfo: function (collection: Collection) {
      const numUsers =
        (collection.admins || []).length + (collection.editors || []).length + (collection.viewers || []).length
      if (numUsers > 1) {
        return `Shared with ${numUsers - 1} other ${pluralize('user', numUsers - 1)}`
      }
      return null
    },

    async fetchMyCollections() {
      this.myCollections = {admin: [], editor: [], viewer: []}
      if (!this.userIsAuthenticated) return
      try {
        this.myCollections = await getMyCollections()
      } catch {
        this.$toast.add({
          severity: 'error',
          summary: 'Sorry, we were not able to fetch your collections. Please try again later.',
          life: 3000
        })
      }
    },

    async saveToCollection() {
      if (!this.selectedCollectionUrn) return
      try {
        if (this.dataSetType === 'scoreSet') {
          await addCollectionScoreSet(this.selectedCollectionUrn, this.dataSetUrn)
          this.$toast.add({severity: 'success', summary: 'Score set saved to collection.', life: 3000})
        } else if (this.dataSetType === 'experiment') {
          await addCollectionExperiment(this.selectedCollectionUrn, this.dataSetUrn)
          this.$toast.add({severity: 'success', summary: 'Experiment saved to collection.', life: 3000})
        }
      } catch {
        this.$toast.add({
          severity: 'error',
          summary: 'Sorry, saving to the collection failed. Please try again later.',
          life: 3000
        })
      }
      this.dialogVisible = false
      await this.fetchMyCollections()
      this.$emit('collections-updated')
    }
  }
}
</script>

<style scoped>
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

/* Hide button label on small screens and ensure button is square */
@media (max-width: 55.99rem) {
  .mave-save-to-collection-button :deep(.p-button-label) {
    display: none;
  }

  .mave-save-to-collection-button {
    padding: 0.5rem;
    aspect-ratio: 1;
  }
}
</style>
