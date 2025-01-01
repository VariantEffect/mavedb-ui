<template>
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
        placeholder="Type or paste ORCID IDs here."
        @keyup.escape="clearUserSearch"
      />
      <div>
        <SelectButton
          v-model="roleToAdd"
          :allow-empty="false"
          class="mave-collection-role-to-add"
          option-label="title"
          option-value="value"
          :options="roleOptions"
        />
        <Button label="Add" @click="addUsers" />
      </div>
      <DataTable
        data-key="orcidId"
        :value="pendingUserRoles"
      >
        <Column field="user.orcidId" header="ORCID ID" />
        <Column :field="(userRole) => `${userRole.user.firstName} ${userRole.user.lastName}`" header="Name" />
        <Column field="role" header="Role" />
      </DataTable>
    </div>

    <div>
      <Button label="Cancel" severity="secondary" @click="cancel" />
      <Button label="Save" @click="saveCollection" />
    </div>

  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import config from '@/config'
import {ORCID_ID_REGEX} from '@/lib/orcid'

export default {
  name: 'CollectionCreator',
  components: {Button, Chips, Column, DataTable, InputSwitch, InputText, SelectButton, Textarea},
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
      const orcidIdsToAdd = this.orcidIdsToAddStr.split(/[ ,]+/g)

      // Validate and look up each new user.
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

    clearUserSearch: function() {
      this.$refs.userSearchinput.$refs.input.value = ''
    },

    lookupUser: async function(orcidId) {
      // Look up MaveDB user by ORCID ID.
      let user = null
      try {
        user = (await axios.get(`${config.apiBaseUrl}/users/${orcidId}`)).data
      } catch (err) {
        // Assume that the error was 404 Not Found.
      }

      return user
    },

    saveCollection: async function() {
      const collectionName = this.collectionName?.trim()
      let collectionDescription = this.collectionDescription?.trim()
      collectionDescription = _.isEmpty(collectionDescription) ? null : collectionDescription
      // check that collection name is not null or empty string
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
        // if there is an error, probably keep the dialog open. log errors to console?
        // then, if status is 200, throw toast success message and emit the saved collection
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
  vertical-align: middle;
}

.mave-collection-role-to-add * {
  vertical-align: middle;
}
</style>
