<template>
  <DefaultLayout>
    <div v-if="itemStatus == 'Loaded'" class="mave-collection">
      <div class="mavedb-1000px-col">
        <div class="mave-screen-title-bar">
          <Button
            v-if="userIsAuthorized.update && item.private"
            aria-label="Private collection"
            class="flex-i"
            icon="pi pi-lock"
            text
            title="Private collection"
            @click="privacyDialogVisible = true"
          />
          <Button
            v-else-if="userIsAuthorized.update && !item.private"
            aria-label="Publicly visible"
            class="flex-i"
            icon="pi pi-lock-open"
            text
            title="Publicly visible"
            @click="privacyDialogVisible = true"
          />
          <i v-else-if="item.private" class="flex-i pi pi-lock" />
          <div v-if="userIsAuthorized.update" class="flex-auto">
            <Inplace
              :active="displayCollectionNameEdit"
              class="mave-screen-collection-title"
              @open="editCollectionName"
            >
              <template #display>
                {{ item.name }}
              </template>
              <template #content>
                <div class="flex mave-collection-name-editor">
                  <InputText
                    v-model="editName"
                    autofocus
                    class="flex-auto"
                    @keyup.enter="saveCollectionName"
                    @keyup.escape="displayCollectionNameEdit = false"
                  />
                  <Button class="flex-none" icon="pi pi-check" @click="saveCollectionName" />
                  <Button
                    class="flex-none"
                    icon="pi pi-times"
                    severity="danger"
                    @click="displayCollectionNameEdit = false"
                  />
                </div>
              </template>
            </Inplace>
          </div>
          <div v-else>
            <div class="mave-screen-title">
              {{ item.name }}
            </div>
          </div>
          <div>
            <CollectionBadge v-if="item.badgeName" :collection="item" />
          </div>
          <div v-if="userIsAuthorized.delete" class="mavedb-screen-title-controls">
            <Button label="Delete" severity="danger" size="small" @click="deleteCollectionWithConfirmation" />
          </div>
        </div>
        <div v-if="userIsAuthorized.update">
          <Inplace
            :active="displayCollectionDescriptionEdit"
            class="mave-collection-description"
            @open="editCollectionDescription"
          >
            <template #display>
              {{ item.description || '(Click here to add description)' }}
            </template>
            <template #content>
              <div class="flex mave-collection-description-editor">
                <Textarea
                  v-model="editDescription"
                  autofocus
                  class="flex-auto"
                  @keyup.escape="displayCollectionDescriptionEdit = false"
                />
                <Button icon="pi pi-check" @click="saveCollectionDescription" />
                <Button icon="pi pi-times" severity="danger" @click="displayCollectionDescriptionEdit = false" />
              </div>
            </template>
          </Inplace>
        </div>
        <div v-else>
          <div v-if="item.description" class="mave-collection-description">{{ item.description }}</div>
        </div>
      </div>
      <div class="mavedb-1000px-col">
        <div v-if="item.creationDate">
          Created {{ formatDate(item.creationDate) }}
          <span v-if="item.createdBy">
            <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="_blank"
              ><img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />{{ item.createdBy.firstName }}
              {{ item.createdBy.lastName }}</a
            ></span
          >
        </div>
        <div v-if="item.modificationDate">
          Last updated {{ formatDate(item.modificationDate) }}
          <span v-if="item.modifiedBy">
            <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="_blank">
              <img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />
              {{ item.modifiedBy.firstName }} {{ item.modifiedBy.lastName }}
            </a>
          </span>
        </div>
        <div class="mave-collection-section-title">
          Score Sets
          <div v-if="userIsAuthorized.add_score_set">
            <CollectionDataSetEditor
              :collection-urn="item.urn"
              data-set-type="scoreSet"
              @saved="childComponentEditedCollection"
            />
          </div>
        </div>
        <ul v-if="item.scoreSetUrns.length != 0">
          <li v-for="scoreSetUrn in item.scoreSetUrns" :key="scoreSetUrn">
            <EntityLink display="title" entity-type="scoreSet" :urn="scoreSetUrn" />
          </li>
        </ul>
        <div v-else>No associated score sets yet</div>
        <div class="mave-collection-section-title">
          Experiments
          <!-- NOTE: permissions are the same for add score set and add experiment -->
          <div v-if="userIsAuthorized.add_score_set">
            <CollectionDataSetEditor
              :collection-urn="item.urn"
              data-set-type="experiment"
              @saved="childComponentEditedCollection"
            />
          </div>
        </div>
        <ul v-if="item.experimentUrns.length != 0">
          <li v-for="experimentUrn in item.experimentUrns" :key="experimentUrn">
            <EntityLink display="title" entity-type="experiment" :urn="experimentUrn" />
          </li>
        </ul>
        <div v-else>No associated experiments yet</div>
        <div class="mave-collection-section-title">
          User Permissions
          <div v-if="userIsAuthorized.add_role">
            <CollectionPermissionsEditor :collection-urn="item.urn" @saved="childComponentEditedCollection" />
          </div>
        </div>
        <div
          v-if="item.admins.length != 0 || userIsAuthorized.add_role"
          class="mave-collection-contributors-subsection"
        >
          <div class="mave-collection-contributors-subsection-title">Admins</div>
          <ul v-if="item.admins.length > 0">
            <div v-for="admin in item.admins" :key="admin">
              <a :href="`https://orcid.org/${admin.orcidId}`" target="_blank">
                <img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />
                {{ admin.firstName }} {{ admin.lastName }}
              </a>
            </div>
          </ul>
          <p v-else>No admins</p>
        </div>
        <div v-if="userIsAuthorized.add_role" class="mave-collection-contributors-subsection">
          <div class="mave-collection-contributors-subsection-title">Editors</div>
          <ul v-if="item.editors.length > 0">
            <div v-for="editor in item.editors" :key="editor">
              <a :href="`https://orcid.org/${editor.orcidId}`" target="_blank">
                <img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />
                {{ editor.firstName }} {{ editor.lastName }}
              </a>
            </div>
          </ul>
          <p v-else>No editors</p>
        </div>
        <div v-if="userIsAuthorized.add_role" class="mave-collection-contributors-subsection">
          <div class="mave-collection-contributors-subsection-title">Viewers</div>
          <ul v-if="item.viewers.length > 0">
            <div v-for="viewer in item.viewers" :key="viewer">
              <a :href="`https://orcid.org/${viewer.orcidId}`" target="_blank">
                <img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />
                {{ viewer.firstName }} {{ viewer.lastName }}
              </a>
            </div>
          </ul>
          <p v-else>No viewers</p>
        </div>
      </div>
    </div>
    <div v-else-if="itemStatus == 'Loading' || itemStatus == 'NotLoaded'">
      <PageLoading />
    </div>
    <div v-else>
      <ItemNotFound :item-id="itemId" model="collection" />
    </div>
  </DefaultLayout>
  <Dialog
    v-if="userIsAuthorized.update"
    v-model:visible="privacyDialogVisible"
    :close-on-escape="true"
    header="Privacy"
    modal
    :style="{width: '25rem'}"
  >
    <p v-if="item.private">
      This collection is currently private. Only you and other users listed as admins, editors, or viewers can access
      it.
    </p>
    <p v-else-if="item.badgeName">This collection is currently public and is an official collection of MaveDB.</p>
    <p v-else>This collection is currently public. Any user who has the URL can access it.</p>

    <Button
      v-if="item.private"
      icon="pi pi-lock-open"
      label="Make it public"
      severity="danger"
      @click="updatePrivacyWithConfirmation(false)"
    />
    <Button
      v-else-if="!item.badgeName"
      icon="pi pi-lock"
      label="Make it private"
      severity="danger"
      @click="updatePrivacyWithConfirmation(true)"
    />
  </Dialog>
</template>

<script>
import axios from 'axios'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Inplace from 'primevue/inplace'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import {useHead} from '@unhead/vue'

import EntityLink from '@/components/common/EntityLink'
import CollectionBadge from '@/components/CollectionBadge'
import CollectionDataSetEditor from '@/components/CollectionDataSetEditor'
import CollectionPermissionsEditor from '@/components/CollectionPermissionsEditor'
import DefaultLayout from '@/components/layout/DefaultLayout'
import ItemNotFound from '@/components/common/ItemNotFound'
import PageLoading from '@/components/common/PageLoading'
import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import config from '@/config'

export default {
  name: 'CollectionView',

  components: {
    Button,
    CollectionBadge,
    CollectionDataSetEditor,
    CollectionPermissionsEditor,
    DefaultLayout,
    Dialog,
    EntityLink,
    Inplace,
    InputText,
    ItemNotFound,
    PageLoading,
    Textarea
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    const head = useHead({title: 'Collection'})
    const {userIsAuthenticated} = useAuth()
    return {
      head,
      config: config,
      userIsAuthenticated,

      ...useFormatters(),
      ...useItem({itemTypeName: 'collection'})
    }
  },

  data: () => ({
    userIsAuthorized: {
      delete: false,
      publish: false,
      update: false,
      add_score_set: false, // permissions are the same for add score set, remove score set, add experiment, and remove experiment
      add_role: false // permissions are the same for add user to role and remove user from role
    },
    editName: null,
    displayCollectionNameEdit: false,
    editDescription: null,
    displayCollectionDescriptionEdit: false,
    privacyDialogVisible: false
  }),

  watch: {
    item: {
      handler: function (newValue) {
        this.head.patch({title: newValue?.name || 'Collection'})
      }
    },

    itemId: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  mounted: async function () {
    await this.checkAuthorization()
  },

  methods: {
    checkAuthorization: async function () {
      // Response should be true to get authorization
      const actions = ['delete', 'publish', 'update', 'add_score_set', 'add_role']
      try {
        for (const action of actions) {
          const response = await axios.get(
            `${config.apiBaseUrl}/permissions/user-is-permitted/collection/${this.itemId}/${action}`
          )
          this.userIsAuthorized[action] = response.data
        }
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },

    childComponentEditedCollection: function () {
      this.reloadItem(this.itemId)
    },

    deleteCollectionWithConfirmation: function () {
      const numOtherUsers =
        (this.item.admins || []).length + (this.item.editors || []).length + (this.item.viewers || []).length - 1

      const message =
        numOtherUsers > 0
          ? `Are you sure you want to delete the collection named "${this.item.name}"? ${numOtherUsers} users will also lose access.`
          : `Are you sure you want to delete the collection named "${this.item.name}"?`

      this.$confirm.require({
        message,
        header: `Delete ${this.item.name}`,
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (this.item) {
            let response = null
            try {
              response = await axios.delete(`${config.apiBaseUrl}/collections/${this.item.urn}`, this.item)
            } catch (e) {
              response = e.response || {status: 500}
            }

            if (response.status == 200) {
              this.$router.replace({name: `collections`})
              this.$toast.add({severity: 'success', summary: 'The collection was successfully deleted.', life: 3000})
            } else {
              this.$toast.add({
                severity: 'warn',
                summary: response.data?.detail || 'Sorry, deletion failed.',
                life: 3000
              })
            }
          }
        }
      })
    },

    editCollectionDescription: function () {
      this.displayCollectionDescriptionEdit = true
      this.editDescription = this.item.description
    },

    editCollectionName: function () {
      this.displayCollectionNameEdit = true
      this.editName = this.item.name
    },

    saveCollectionName: async function () {
      const editedName = this.editName?.trim()
      if (!editedName || editedName.length == 0 || editedName == this.item.name) {
        // Do nothing if the name is empty or has not changed.
        this.displayCollectionNameEdit = false
      } else {
        const collectionPatch = {
          name: editedName
        }
        let response = null
        try {
          response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, collectionPatch)
        } catch (e) {
          response = e.response || {status: 500}
          this.$toast.add({severity: 'error', summary: 'Error saving collection name', life: 3000})
        }
        if (response.status == 200) {
          this.reloadItem(this.itemId)
          this.displayCollectionNameEdit = false
          this.$toast.add({severity: 'success', summary: 'Saved new collection name.', life: 3000})
        } else {
          console.log(response)
        }
      }
    },

    saveCollectionDescription: async function () {
      let editedDescription = this.editDescription?.trim()
      editedDescription = editedDescription == '' ? null : editedDescription
      if (editedDescription == this.item.description) {
        // Do nothing if the description has not changed.
        this.displayCollectionNameEdit = false
      } else {
        const collectionPatch = {
          description: editedDescription == '' ? null : editedDescription
        }
        let response = null
        try {
          response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, collectionPatch)
        } catch (e) {
          response = e.response || {status: 500}
          this.$toast.add({severity: 'error', summary: 'Error saving description', life: 3000})
        }
        if (response.status == 200) {
          this.reloadItem(this.itemId)
          this.displayCollectionDescriptionEdit = false
          this.$toast.add({severity: 'success', summary: 'Saved description.', life: 3000})
        } else {
          console.log(response)
        }
      }
    },

    updatePrivacyWithConfirmation: function (newPrivate) {
      if (newPrivate != this.item.private) {
        if (newPrivate) {
          this.$confirm.require({
            message:
              'After making it private, only users you designated as admins, editors, or viewers will be able to see it.',
            header: `Are you sure you want to make this collection private?`,
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
              if (this.item) {
                let response = null
                try {
                  response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, {private: true})
                } catch (e) {
                  response = e.response || {status: 500}
                }

                if (response.status == 200) {
                  this.reloadItem(this.itemId)
                  this.$toast.add({severity: 'success', summary: 'The collection is now private.', life: 3000})
                  this.privacyDialogVisible = false
                } else {
                  this.$toast.add({
                    severity: 'warn',
                    summary: response.data?.detail || 'Sorry, the collection privacy setting could not be updated.',
                    life: 3000
                  })
                }
              }
            }
          })
        } else {
          this.$confirm.require({
            message:
              'After making it public, any user with the collection URL will be able to see it. Editing will still be limited to people you designated as admins or editors.',
            header: `Are you sure you want to make this collection public?`,
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
              if (this.item) {
                let response = null
                try {
                  response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, {private: false})
                } catch (e) {
                  response = e.response || {status: 500}
                }

                if (response.status == 200) {
                  this.reloadItem(this.itemId)
                  this.$toast.add({severity: 'success', summary: 'The collection is now public.', life: 3000})
                  this.privacyDialogVisible = false
                } else {
                  this.$toast.add({
                    severity: 'warn',
                    summary: response.data?.detail || 'Sorry, the collection privacy setting could not be updated.',
                    life: 3000
                  })
                }
              }
            }
          })
        }
      }
    }
  }
}
</script>

<style scoped>
.mave-collection {
  padding: 20px;
}

.mave-collection-description {
  white-space: pre-line;
}

.mave-collection-description:deep(.p-inplace-display) {
  margin: 0 0 10px 0;
  padding-left: 0;
}

.mave-collection-section-title {
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  gap: 20px;
}

.mave-collection-contributors-subsection-title {
  font-size: 18px;
  padding: 0 0 0 0;
  /* margin: 20px 0 10px 0; */
}

.mave-collection-contributors-subsection {
  padding: 0 0 5px 0;
  border-bottom: 1px dashed #ccc;
  margin: 20px 0 10px 0;
}

.mave-collection-description-editor,
.mave-collection-name-editor {
  position: relative;
  width: 100%;
}

.mave-collection-description-editor > *,
.mave-collection-name-editor > * {
  margin-left: 0.5em;
}

.mave-collection-description-editor > *:first-child,
.mave-collection-name-editor > *:first-child {
  margin-left: 0;
}

.mave-screen-collection-title:deep(.p-inplace-display) {
  flex: 0 0 auto;
  font-size: 28px;
  padding: 0;
}
</style>
