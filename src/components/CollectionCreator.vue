<template>
  <EmailPrompt />
  <div class="mave-collection-creator">
    <div class="flex flex-column gap-2">
      <label :for="$scopedId('name-input')">Collection name</label>
      <InputText :id="$scopedId('name-input')" v-model="collectionName" />
    </div>

    <div class="flex flex-column gap-2">
      <label :for="$scopedId('description-input')">Description</label>
      <Textarea :id="$scopedId('description-input')" v-model="collectionDescription" />
    </div>

    <div class="flex flex-column gap-2">
      <label :for="$scopedId('public-input')">Public</label>
      <InputSwitch v-model="collectionPublic" :aria-labelledby="$scopedId('public-help')" :input-id="$scopedId('public-input')" />
      <small :id="$scopedId('public-help')">Public collections are visible to others. Private collections are only visible to you and anyone to whom you grant permissions.</small>
    </div>

    <div class="mave-contributors-adder">
      <div class="mave-contributors-adder-title">
        User permissions
      </div>
      <InputText
        ref="userSearchInput"
        v-model="orcidIdsToAddStr"
        class="mave-collection-add-users-search-input"
        placeholder="Type or paste 1 or more ORCID IDs here."
        @keyup.enter="addUsers"
        @keyup.escape="clearUserSearch"
      />
      <div class="mave-collection-user-role-add-controls">
        <SelectButton
          v-model="roleToAdd"
          :allow-empty="false"
          class="mave-collection-role-to-add"
          option-label="title"
          option-value="value"
          :options="roleOptions"
        />
        <Button label="Add user" @click="addUsers" />
      </div>
      <DataTable
        v-if="pendingUserRoles.length > 0"
        data-key="orcidId"
        :multi-sort-meta="[{field: 'user.lastName', order: 1}, {field: 'user.firstName', order: 1}, {field: 'user.orcidId', order: 1}]"
        sort-mode="multiple"
        :value="pendingUserRoles"
      >
        <Column field="user.orcidId" header="ORCID ID" />
        <Column :field="(userRole) => `${userRole.user.firstName} ${userRole.user.lastName}`" header="Name" />
        <Column field="role" header="Role">
          <template #body="{data}">
            <Dropdown
              class="mave-collection-role-dropdown"
              option-label="title"
              option-value="value"
              :options="roleOptions"
              :model-value="data.role"
              @change="changeRole(data.user.orcidId, $event.value)"
            />
          </template>
        </Column>
        <Column>
          <template #body="{data}">
            <Button label="Remove" size="small" @click="removeUserRole(data.user.orcidId)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="mave-collection-editor-action-buttons">
      <Button label="Cancel" severity="secondary" @click="cancel" />
      <Button label="Save" @click="saveCollection" />
    </div>

  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dropdown from 'primevue/dropdown'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import config from '@/config'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import EmailPrompt from '@/components/common/EmailPrompt.vue'

export default {
  name: 'CollectionCreator',
  components: {Button, Column, DataTable, Dropdown, EmailPrompt, InputSwitch, InputText, SelectButton, Textarea},
  emits: ['createdCollection', 'canceled'],

  data: () => ({
    collectionName: null,
    collectionDescription: null,
    collectionPublic: false,
    pendingUserRoles: [],

    orcidIdsToAddStr: '',
    roleToAdd: 'viewer',

    roleOptions: [
      {title: 'Admin', value: 'admin'},
      {title: 'Editor', value: 'editor'},
      {title: 'Viewer', value: 'viewer'}
    ]
  }),

  methods: {
    addUsers: async function() {
      const orcidIdsToAdd = _.without(this.orcidIdsToAddStr.split(/[ ,]+/g), '')

      const invalidOrcidIds = []
      for (const orcidId of orcidIdsToAdd) {
        const pendingUserRole = this.pendingUserRoles.find((ur) => ur.user.orcidId == orcidId)
        if (pendingUserRole) {
          pendingUserRole.role = this.roleToAdd
        } else if (!ORCID_ID_REGEX.test(orcidId)) {
          invalidOrcidIds.push(orcidId)
          this.$toast.add({
            life: 3000,
            severity: 'warn',
            summary: `${orcidId} is not a valid ORCID ID`
          })
        } else {
          const user = await this.lookupUser(orcidId)
          if (!user) {
            invalidOrcidIds.push(orcidId)
            this.$toast.add({
              life: 3000,
              severity: 'warn',
              summary: `No MaveDB user was found with ORCID ID ${orcidId}.`
            })
          } else {
            this.pendingUserRoles.push({user, role: this.roleToAdd})
          }
        }
      }
      this.orcidIdsToAddStr = invalidOrcidIds.join(' ')
    },

    cancel: function() {
      this.$emit('canceled')
    },

    changeRole: function(orcidId, newRole) {
      const userRole = this.pendingUserRoles.find((ur) => ur.user.orcidId == orcidId)
      if (userRole) {
        userRole.role = newRole
      }
    },

    clearUserSearch: function() {
      this.$refs.userSearchinput.$refs.input.value = ''
    },

    lookupUser: async function(orcidId) {
      let user = null
      try {
        user = (await axios.get(`${config.apiBaseUrl}/users/${orcidId}`)).data
      } catch (err) {
        // Assume that the error was 404 Not Found.
      }
      return user
    },

    removeUserRole: function(orcidId) {
      // If the user as been added in this session, remove the pending user role.
      const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == orcidId)
      if (pendingUserRoleIndex >= 0) {
        this.pendingUserRoles.splice(pendingUserRoleIndex, 1)
      }
    },

    saveCollection: async function() {
      const collectionName = this.collectionName?.trim()
      let collectionDescription = this.collectionDescription?.trim()
      collectionDescription = _.isEmpty(collectionDescription) ? null : collectionDescription
      if (_.isEmpty(collectionName)) {
        this.$toast.add({
          life: 3000,
          severity: 'warn',
          summary: 'Must provide collection name'
        })
      } else {
        const newCollection = {
          name: collectionName,
          description: collectionDescription,
          private: !this.collectionPublic,
          viewers: this.pendingUserRoles.filter((ur) => ur.role == 'viewer').map((ur) => ur.user),
          editors: this.pendingUserRoles.filter((ur) => ur.role == 'editor').map((ur) => ur.user),
          admins: this.pendingUserRoles.filter((ur) => ur.role == 'admin').map((ur) => ur.user)
        }
        let response = null
        try {
          response = await axios.post(`${config.apiBaseUrl}/collections`, newCollection)
        } catch (error) {
          console.log(error)
          response = error.response || {status: 500}
          this.$toast.add({severity: 'error', summary: 'Error', life: 3000})
        }
        if (response.status == 200) {
          const savedCollection = response.data
          this.$toast.add({severity: 'success', summary: 'Created new collection.', life: 3000})
          this.$emit('createdCollection', savedCollection)
        }
      }
    }
  }
}
</script>

<style scoped>
.mave-collection-add-users-search-input {
  width: 100%;
}

.mave-collection-add-users-search-input:deep(.p-inputtext) {
  width: 100%;
}

.mave-collection-role-to-add {
  display: inline;
}

.mave-collection-user-role-add-controls {
  margin: 1em 0;
}

.mave-collection-user-role-add-controls .p-selectbutton {
  margin-right: 1em;
}

.mave-collection-user-role-add-controls:deep(*) {
  vertical-align: middle;
}

.mave-collection-role-dropdown:deep(.p-inputtext) {
  padding: 0 0.3em;
}

.mave-collection-creator > * {
  margin-bottom: 1em;
}

.mave-collection-editor-action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin: 5px 0 0 0;
}

.mave-collection-editor-action-buttons Button {
  margin: 0 0 0 3px;
}
</style>
