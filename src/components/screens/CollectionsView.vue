<template>
  <DefaultLayout>
    <div>
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">My saved collections</div>
        </div>
        <div v-if="collectionsStatus == 'Loaded' && collections.length > 0">
          <DataTable
            class="mave-collections-table"
            data-key="urn"
            :multi-sort-meta="[{field: 'role', order: 1}, {field: 'name', order: 1}]"
            sort-mode="multiple"
            :value="collections"
          >
            <Column field="name" header="Collection name" :sortable="true">
              <template #body="{data}"><router-link :to="{name: 'collection', params: {urn: data.urn}}">{{data.name}}</router-link></template>
            </Column>
            <Column class="mave-collection-description" field="description" header="Description" :sortable="true" />
            <Column field="role" header="Permissions" :sortable="true" />
            <Column field="creationDate" header="Created" :sortable="true">
              <template #body="{data}">{{ formatDate(data.creationDate) }}</template>
            </Column>
          </DataTable>
          <Button label="Add an empty collection" @click="creatorVisible = true" />
        </div>
        <div v-else-if="collectionsStatus == 'Loaded'">
          <p>You have not saved any data sets to a collection.</p>
          <Button label="Create an empty collection" @click="creatorVisible = true" />
        </div>
        <PageLoading v-else-if="['NotLoaded', 'Loading'].includes(collectionsStatus)" />
        <div v-else>
          Sorry, an error occurred, and collection data could not be loaded. Please refresh the page to try again.
        </div>
      </div>
    </div>
  </DefaultLayout>
  <Dialog
    v-model:visible="creatorVisible"
    :close-on-escape="true"
    header="Create a new collection"
    modal
    :style="{width: '25rem'}"
  >
    <CollectionCreator
      @canceled="creatorVisible = false"
      @created-collection="childComponentCreatedCollection"
    />
  </Dialog>
</template>

<script>
import axios from 'axios'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'

import CollectionCreator from '@/components/CollectionCreator'
import PageLoading from '@/components/common/PageLoading'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useFormatters from '@/composition/formatters'
import config from '@/config'

export default {
  name: 'CollectionsView',

  components: {Button, CollectionCreator, Column, DataTable, DefaultLayout, Dialog, PageLoading},

  setup: useFormatters,

  data: () => ({
    collections: [],
    collectionsStatus: 'NotLoaded',
    creatorVisible: false
  }),

  mounted: async function() {
    await this.fetchData()
  },

  methods: {
    childComponentCreatedCollection: function() {
      this.creatorVisible = false
      this.fetchData()
    },

    fetchData: async function() {
      this.collectionsStatus = 'Loading'
      this.collections = []

      let response = null
      try {
        response = await axios.get(`${config.apiBaseUrl}/users/me/collections`)
      } catch (error) {
        response = error.response || {status: 500}
        console.log('Error while loading collections: ', error)
      }

      if (response.status == 200) {
        this.collections = [
          ...response.data['admin'].map((c) => ({...c, role: 'Admin'})),
          ...response.data['editor'].map((c) => ({...c, role: 'Edit'})),
          ...response.data['viewer'].map((c) => ({...c, role: 'View'}))
        ]
        this.collectionsStatus = 'Loaded'
      } else {
        this.collections = []
        this.collectionsStatus = 'LoadingFailed'
      }
    }
  }
}
</script>

<style scoped>
.mave-collections-table {
  margin: 1em 0;
}

.mave-collections-table:deep(td) {
  vertical-align: top;
}

.mave-collections-table:deep(.mave-collection-description) {
  white-space: pre-line;
}
</style>
