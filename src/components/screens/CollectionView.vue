<template>
  <DefaultLayout>
    <div v-if="itemStatus=='Loaded'" class="mave-collection">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <!-- TODO see if this if-else structure can be simplified -->
          <div v-if="userIsAuthenticated">
            <div v-if="userIsAuthorized.update">
               <!-- TODO make input text box wider
               add spacing between input text box and buttons, and between buttons -->
              <Inplace
                :active="displayCollectionNameEdit"
                class="mave-screen-collection-title"
                @open="displayCollectionNameEdit = true; editName = item.name"
              >
                <template #display>
                  {{ item.name }}
                </template>
                <template #content>
                  <InputText
                    v-model="editName"
                    autofocus
                    @keyup.enter="saveCollectionName"
                    @keyup.escape="displayCollectionNameEdit = false"
                  />
                  <Button icon="pi pi-check" @click="saveCollectionName" />
                  <Button icon="pi pi-times" severity="danger" @click="displayCollectionNameEdit = false" />
                </template>
              </Inplace>
            </div>
            <div v-else>
              <div class="mave-screen-title">{{ item.name }}</div>
            </div>
          </div>
          <div v-else>
            <div class="mave-screen-title">{{ item.name }}</div>
          </div>
          <!-- TODO add badge if there is one associated -->
        </div>
        <div v-if="userIsAuthenticated">
          <div v-if="userIsAuthorized.update">
            <Inplace
              :active="displayCollectionDescriptionEdit"
              class="mave-collection-description"
              @open="displayCollectionDescriptionEdit = true; editDescription = item.description"
            >
              <template #display>
                {{ item.description || "(Click here to add description)" }}
              </template>
              <template #content>
                <!-- TODO change to textarea and make full width. consider where to put buttons -->
                <InputText
                  v-model="editDescription"
                  autofocus
                  @keyup.enter="saveCollectionDescription"
                  @keyup.escape="displayCollectionDescriptionEdit = false"
                />
                <Button icon="pi pi-check" @click="saveCollectionDescription" />
                <Button icon="pi pi-times" severity="danger" @click="displayCollectionDescriptionEdit = false" />
              </template>
            </Inplace>
          </div>
          <div v-else>
            <div v-if="item.description" class="mave-collection-description">{{ item.description }}</div>
          </div>
        </div>
        <div v-else>
          <div v-if="item.description" class="mave-collection-description">{{ item.description }}</div>
        </div>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{ formatDate(item.creationDate) }} <span v-if="item.createdBy">
          <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
            alt="ORCIDiD">{{ item.createdBy.firstName }} {{ item.createdBy.lastName }}</a></span></div>
        <div v-if="item.modificationDate">
          Last updated {{ formatDate(item.modificationDate) }}
          <span v-if="item.modifiedBy">
            <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="blank">
              <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD" />
              {{ item.modifiedBy.firstName }} {{ item.modifiedBy.lastName }}
            </a>
          </span>
        </div>
        <div class="mave-collection-section-title">
          Score Sets
          <div v-if="userIsAuthenticated && userIsAuthorized.add_score_set">
            <CollectionDataSetEditor
              :collection-urn="item.urn"
              data-set-type="scoreSet"
              @saved="childComponentEditedCollection"
            />
          </div>
        </div>
        <div v-if="item.scoreSetUrns.length != 0">
          <ul>
            <!-- TODO show more info about score sets and experiments -->
            <li v-for="scoreSetUrn in item.scoreSetUrns" :key="scoreSetUrn">
              <router-link :to="{name: 'scoreSet', params: {urn: scoreSetUrn}}">{{ scoreSetUrn }}</router-link>
            </li>
          </ul>
        </div>
        <div v-else>No associated score sets yet</div>
        <div class="mave-collection-section-title">
          Experiments
          <!-- NOTE: permissions are the same for add score set and add experiment -->
          <div v-if="userIsAuthenticated && userIsAuthorized.add_score_set">
            <CollectionDataSetEditor
              :collection-urn="item.urn"
              data-set-type="experiment"
              @saved="childComponentEditedCollection"
            />
          </div>
        </div>
        <div v-if="item.experimentUrns.length != 0">
          <ul>
            <li v-for="experimentUrn in item.experimentUrns" :key="experimentUrn">
              <router-link :to="{name: 'experiment', params: {urn: experimentUrn}}">{{ experimentUrn }}</router-link>
            </li>
          </ul>
        </div>
        <div v-else>No associated experiments yet</div>
        <div class="mave-collection-section-title">
          User Permissions
          <div v-if="userIsAuthenticated && userIsAuthorized.add_role">
            <CollectionContributorEditor
              :collection-urn="item.urn"
              @saved="childComponentEditedCollection"
            />
          </div>
        </div>
        <!-- TODO think about what to show if there are no admins (shouldn't happen), editors, or viewers.
        Keep in mind that we shouldn't show the editors or viewers sections to non-collection-admins at all.
        But we might want to show if those sections are blank to collection admins. -->
        <div v-if="item.admins.length != 0" class="mave-collection-contributors-subsection">
          <div class="mave-collection-contributors-subsection-title">Admins</div>
          <ul>
            <div v-for="admin in item.admins" :key="admin">
              <a :href="`https://orcid.org/${admin.orcidId}`" target="blank">
                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD" />
                {{ admin.firstName }} {{ admin.lastName }}
              </a>
            </div>
          </ul>
        </div>
        <div v-if="item.editors.length != 0" class="mave-collection-contributors-subsection">
          <div class="mave-collection-contributors-subsection-title">Editors</div>
          <ul>
            <div v-for="editor in item.editors" :key="editor">
              <a :href="`https://orcid.org/${editor.orcidId}`" target="blank">
                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD" />
                {{ editor.firstName }} {{ editor.lastName }}
              </a>
            </div>
          </ul>
        </div>
        <div v-if="item.viewers.length != 0" class="mave-collection-contributors-subsection">
          <div class="mave-collection-contributors-subsection-title">Viewers</div>
          <ul>
            <div v-for="viewer in item.viewers" :key="viewer">
              <a :href="`https://orcid.org/${viewer.orcidId}`" target="blank">
                <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD" />
                {{ viewer.firstName }} {{ viewer.lastName }}
              </a>
            </div>
          </ul>
        </div>
      </div>
    </div>
    <div v-else-if="itemStatus=='Loading' || itemStatus=='NotLoaded'">
      <PageLoading/>
    </div>
    <div v-else>
      <ItemNotFound model="collection" :item-id="itemId"/>
    </div>
  </DefaultLayout>
</template>

<script>
import axios from 'axios'
import Button from 'primevue/button'
import Inplace from 'primevue/inplace'
import InputText from 'primevue/inputtext'

import CollectionContributorEditor from '@/components/CollectionContributorEditor'
import CollectionDataSetEditor from '@/components/CollectionDataSetEditor'
import DefaultLayout from '@/components/layout/DefaultLayout'
import ItemNotFound from '@/components/common/ItemNotFound'
import PageLoading from '@/components/common/PageLoading'
import config from '@/config'
import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'

export default {
  name: 'CollectionView',

  components: { Button, CollectionContributorEditor, CollectionDataSetEditor, DefaultLayout, Inplace, InputText, ItemNotFound, PageLoading },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  data: () => ({
    userIsAuthorized: {
      delete: false,
      publish: false,
      update: false,
      add_score_set: false, // permissions are the same for add score set, remove score set, add experiment, and remove experiment
      add_role: false, // permissions are the same for add user to role and remove user from role
    },
    editName: null,
    displayCollectionNameEdit: false,
    editDescription: null,
    displayCollectionDescriptionEdit: false,
  }),

  setup: () => {
    const {userIsAuthenticated} = useAuth()
    return {
      config: config,
      userIsAuthenticated,

      ...useFormatters(),
      ...useItem({ itemTypeName: 'collection' }),
    }
  },

  mounted: async function() {
    await this.checkUserAuthorization()
  },

  watch: {
    itemId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {
    checkUserAuthorization: async function() {
      await this.checkAuthorization()
    },

    checkAuthorization: async function() {
      // Response should be true to get authorization
      const actions = ['delete', 'publish', 'update', 'add_score_set', 'add_role']
      try {
        for (const action of actions) {
          let response = await axios.get(`${config.apiBaseUrl}/permissions/user-is-permitted/collection/${this.itemId}/${action}`)
          this.userIsAuthorized[action] = response.data
        }
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },

    saveCollectionName: async function() {
      if (this.editName) {
        // TODO check that new name is not same as old name
        const collectionPatch = {
          "name": this.editName
        }
        let response = null
        try {
          response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, collectionPatch)
        } catch (e) {
          response = e.response || { status: 500 }
          this.$toast.add({ severity: 'error', summary: 'Error saving name to collection', life: 3000 })
        }
        if (response.status == 200) {
          this.reloadItem(this.itemId)
          this.displayCollectionNameEdit = false
          this.$toast.add({ severity: 'success', summary: 'Saved new name to collection.', life: 3000 })
        } else {
          console.log(response)
        }
      } else {
        this.$toast.add({ severity: 'error', summary: 'Cannot save blank name to collection', life: 3000 })
      }
    },

    saveCollectionDescription: async function() {
      if (this.editDescription === "") {
        // if user enters a blank string, update the description to be null
        this.editDescription = null
      }
      // TODO check that new description is not same as old description
      const collectionPatch = {
        "description": this.editDescription
      }
      let response = null
      try {
        response = await axios.patch(`${config.apiBaseUrl}/collections/${this.item.urn}`, collectionPatch)
      } catch (e) {
        response = e.response || { status: 500 }
        this.$toast.add({ severity: 'error', summary: 'Error saving description to collection', life: 3000 })
      }
      if (response.status == 200) {
        this.reloadItem(this.itemId)
        this.displayCollectionDescriptionEdit = false
        this.$toast.add({ severity: 'success', summary: 'Saved description to collection.', life: 3000 })
      } else {
        console.log(response)
      }
    },

    childComponentEditedCollection: function() {
      this.reloadItem(this.itemId)
    }
  }
}
</script>

<style scoped>
.mave-collection {
  padding: 20px;
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

.mave-screen-collection-title:deep(.p-inplace-display) {
  flex: 0 0 auto;
  font-size: 28px;
  padding: 0;
}
</style>
