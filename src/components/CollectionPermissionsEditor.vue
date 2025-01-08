<template>
  <div>
    <Button
      class="mave-collection-permissions-editor-button"
      label="Edit"
      @click="dialogVisible = true"
    />
    <Dialog
      v-model:visible="dialogVisible"
      :close-on-escape="false"
      header="Edit collection permissions"
      modal
      :style="{width: '45rem'}"
      @hide="resetContributorEditor"
    >
      <InputText
        ref="userSearchInput"
        v-model="orcidIdsToAddStr"
        class="mave-collection-add-users-search-input"
        placeholder="Type or paste ORCID IDs here."
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
        data-key="orcidId"
        :multi-sort-meta="[{field: 'user.lastName', order: 1}, {field: 'user.firstName', order: 1}, {field: 'user.orcidId', order: 1}]"
        sort-mode="multiple"
        :row-style="rowStyle"
        :value="userRoles"
      >
        <Column field="user.orcidId" header="ORCID ID" />
        <Column
          :field="(userRole) => `${userRole.user.firstName} ${userRole.user.lastName}`"
          header="Name"
        />
        <Column field="role" header="Role">
          <template #body="{data}">
            <span v-if="orcidIdsToRemove.includes(data.user.orcidId)">{{data.role }} &nbsp;&rightarrow; None</span>
            <span v-if="data.oldRole">{{ data.oldRole }} &rightarrow;&nbsp;</span>
            <span v-if="data.user.orcidId == userOrcidId">{{ data.role }}</span>
            <Dropdown
              v-if="!orcidIdsToRemove.includes(data.user.orcidId) && data.user.orcidId != userOrcidId"
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
            <Button v-if="data.user.orcidId != userOrcidId && !orcidIdsToRemove.includes(data.user.orcidId)" label="Remove" size="small" @click="removeUserRole(data.user.orcidId)" />
            <Button v-if="orcidIdsToRemove.includes(data.user.orcidId)" label="Restore" size="small" @click="restoreUserRole(data.user.orcidId)" />
          </template>
        </Column>
      </DataTable> 
      <div class="mave-collection-editor-action-buttons">
        <Button label="Cancel" severity="secondary" @click="dialogVisible = false" />
        <Button :disabled="!dirty" label="Save" @click="saveChanges" />
      </div>
    </Dialog>
  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'

import config from '@/config'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item'
import {ORCID_ID_REGEX} from '@/lib/orcid'

export default {
  name: 'CollectionPermissionsEditor',
  components: {Button, Column, DataTable, Dialog, Dropdown, InputText, SelectButton},
  emits: ['saved'],

  props: {
    collectionUrn: {
      type: String,
      required: true
    },
  },

  setup: () => {
    const {userOrcidId} = useAuth()
    return {
      userOrcidId,
      ...useItem({itemTypeName: 'collection'}),
    }
  },

  data: () => ({
    dialogVisible: false,

    pendingUserRoles: [],
    existingUserRoles: [],
    orcidIdsToRemove: [],

    orcidIdsToAddStr: '',
    roleToAdd: 'viewer',

    roleOptions: [
      {title: 'Admin', value: 'admin'},
      {title: 'Editor', value: 'editor'},
      {title: 'Viewer', value: 'viewer'}
    ],

    errors: []
  }),

  computed: {
    dirty: function() {
      return this.pendingUserRoles.length > 0
          || this.orcidIdsToRemove.length > 0
          || this.existingUserRoles.some((ur) => ur.oldRole)
    },

    userRoles: function() {
      return [
        ...this.pendingUserRoles.map((ur) => ({...ur, state: 'pending'})),
        ...this.existingUserRoles.map((ur) => ({...ur, state: 'saved'}))
      ]
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

    item: {
      handler: function(newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          this.existingUserRoles = [
            ...newValue?.admins?.map((user) => ({user, role: 'admin'})) || [],
            ...newValue?.editors?.map((user) => ({user, role: 'editor'})) || [],
            ...newValue?.viewers?.map((user) => ({user, role: 'viewer'})) || []
          ]
        }
      }
    }
  },

  methods: {
    addUsers: async function() {
      const orcidIdsToAdd = _.without(this.orcidIdsToAddStr.split(/[ ,]+/g), )

      const invalidOrcidIds = []
      for (const orcidId of orcidIdsToAdd) {
        const existingUserRole = this.existingUserRoles.find((ur) => ur.user.orcidId == orcidId)
        const pendingUserRole = this.pendingUserRoles.find((ur) => ur.user.orcidId == orcidId)

        if (orcidId == this.userOrcidId) {
          // Do not allow ths user to add herself.
          this.$toast.add({
            life: 3000,
            severity: 'warn',
            summary: `Your own admin permissions cannot be changed.`
          })
        } else if (existingUserRole) {
          // If the the target user already has a different saved role for this collection, behave as though the user
          // had changed the role using the drop-down.
          this.changeRole(orcidId, this.roleToAdd)
        } else if (pendingUserRole) {
          // If the target user has a pending role added in this session, update the desired role.
          pendingUserRole.role = this.roleToAdd
        } else if (!ORCID_ID_REGEX.test(orcidId)) {
          // If the ORCID ID is invalid, issue a warning.
          invalidOrcidIds.push(orcidId)
          this.$toast.add({
            life: 3000,
            severity: 'warn',
            summary: `${orcidId} is not a valid ORCID ID`
          })
        } else {
          const user = await this.lookupUser(orcidId)
          if (!user) {
            // If the ORCID ID does not refer to a MaveDB user, issue a warning.
            invalidOrcidIds.push(orcidId)
            this.$toast.add({
              life: 3000,
              severity: 'warn',
              summary: `No MaveDB user was found with ORCID ID ${orcidId}.`
            })
          } else {
            // If the ORCID ID refers to a user who does not yet have a role for this collection, add the user role to
            // the list of pending roles.
            this.pendingUserRoles.push({user, role: this.roleToAdd})
          }
        }
      }
      this.orcidIdsToAddStr = invalidOrcidIds.join(' ')
    },

    changeRole: function(orcidId, newRole) {
      const userRole = this.userRoles.find((ur) => ur.user.orcidId == orcidId)
      if (userRole) {
        if (userRole.state == 'saved') {
          if (userRole.role != newRole) {
            if (userRole.oldRole == newRole) {
              userRole.role = newRole
              userRole.oldRole = undefined
            } else {
              if (!userRole.oldRole) {
                userRole.oldRole = userRole.role
              }
              userRole.role = newRole
            }
          }
          const existingUserRoleIndex = this.existingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          this.existingUserRoles.splice(existingUserRoleIndex, 1, userRole)
        } else if (userRole.state == 'pending') {
          userRole.role = newRole
          const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          this.pendingUserRoles.splice(pendingUserRoleIndex, 1, userRole)
        }
      }
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

    removeUserRole: function(orcidId) {
      const userRole = this.userRoles.find((ur) => ur.user.orcidId == orcidId)
      if (userRole) {
        if (userRole.state == 'saved') {
          // If the user already has a role, mark it for removal. Clear any pending role change.
          this.orcidIdsToRemove.push(userRole.user.orcidId)
          if (userRole.oldRole) {
            userRole.role = userRole.oldRole
            userRole.oldRole = undefined
          }
          const existingUserRoleIndex = this.existingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          this.existingUserRoles.splice(existingUserRoleIndex, 1, userRole)
        } else if (userRole.state == 'pending') {
          // If the user as been added in this session, remove the pending user role.
          const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          if (pendingUserRoleIndex >= 0) {
            this.pendingUserRoles.splice(pendingUserRoleIndex, 1)
          }
        }
      }
    },

    restoreUserRole: function(orcidId) {
      this.orcidIdsToRemove = _.without(this.orcidIdsToRemove, orcidId)
    },

    rowStyle: function(userRole) {
      if (userRole.state == 'pending') {
        return {backgroundColor: '#d1ffbd'} // Light green
      } else if (this.orcidIdsToRemove.includes(userRole.user.orcidId)) {
        return {backgroundColor: '#ffcccb'} // Light red
      } else if (userRole.oldRole) {
        return {backgroundColor: '#ccddff'} // Light red
      }
    },

    saveChanges: async function() {
      this.errors = []

      const failedRemovalUserRoles = []
      for (const orcidId of this.orcidIdsToRemove) {
        const userRole = this.existingUserRoles.find((ur) => ur.user.orcidId == orcidId)
        try {
          await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/${userRole.role}s/${orcidId}`)
        } catch (e) {
          failedRemovalUserRoles.push(userRole)
          this.errors.push(`${orcidId}: ${e.message}`)
        }
      }

      const failedAdditionUserRoles = []
      for (const role of ['admin', 'editor', 'viewer']) {
        const userRoles = this.pendingUserRoles.filter((ur) => ur.role == role)

        for (const userRole of userRoles) {
          try {
            await axios.post(
              `${config.apiBaseUrl}/collections/${this.collectionUrn}/${role}s`,
              {orcid_id: userRole.user.orcidId}
            )
          } catch (error) {
            console.log(error)
            failedAdditionUserRoles.push(userRole)
            this.errors.push(`${userRole.user.orcidId}: ${error.message}`)
          }
        }
      }

      if (failedRemovalUserRoles.length == 0 && failedAdditionUserRoles.length == 0) {
        this.dialogVisible = false
        this.$emit('saved')
      }
    }
  }
}
</script>

<style scoped>
.mave-collection-permissions-editor-button {
  width: fit-content;
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

.mave-collection-add-users-search-input {
  width: 100%;
}

.mave-collection-add-users-search-input:deep(.p-inputtext) {
  width: 100%;
}

.mave-collection-role-dropdown:deep(.p-inputtext) {
  padding: 0 0.3em;
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
</style>
