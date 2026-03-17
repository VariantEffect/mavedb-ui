<template>
  <template v-if="dialogVisible">
    <EmailPrompt :is-first-login-prompt="false" />
  </template>
  <div>
    <PButton
      aria-label="Edit user permissions"
      icon="pi pi-pencil"
      label="Edit"
      severity="success"
      size="small"
      @click="dialogVisible = true"
    />
    <PDialog
      v-model:visible="dialogVisible"
      :close-on-escape="false"
      header="Edit collection permissions"
      modal
      :style="{width: '45rem', maxWidth: 'calc(100% - 2rem)'}"
      @hide="resetContributorEditor"
    >
      <div class="flex flex-col gap-3 mt-2">
        <div class="flex items-center gap-3">
          <MvFloatField class="flex-auto" label="ORCID IDs">
            <template #default="{id}">
              <InputText
                :id="id"
                ref="userSearchInput"
                v-model="orcidIdsToAddStr"
                class="w-full"
                fluid
                @keyup.enter="addUsers"
                @keyup.escape="clearUserSearch"
              />
            </template>
          </MvFloatField>
          <PSelect v-model="roleToAdd" class="w-34" option-label="title" option-value="value" :options="roleOptions" />
          <PButton class="flex-none" label="Add user" @click="addUsers" />
        </div>
        <DataTable
          data-key="orcidId"
          :multi-sort-meta="[
            {field: 'user.lastName', order: 1},
            {field: 'user.firstName', order: 1},
            {field: 'user.orcidId', order: 1}
          ]"
          :row-style="rowStyle"
          sort-mode="multiple"
          :value="userRoles"
        >
          <Column field="user.orcidId" header="ORCID ID" />
          <Column
            :field="(userRole: DisplayUserRole) => `${userRole.user.firstName} ${userRole.user.lastName}`"
            header="Name"
          />
          <Column field="role" header="Role">
            <template #body="{data}: {data: DisplayUserRole}">
              <div class="flex items-center gap-1 whitespace-nowrap">
                <span v-if="orcidIdsToRemove.includes(data.user.orcidId)">{{ data.role }} &rightarrow; None</span>
                <span v-if="data.oldRole">{{ data.oldRole }} &rightarrow;</span>
                <span v-if="data.user.orcidId == userOrcidId">{{ data.role }}</span>
                <PSelect
                  v-if="!orcidIdsToRemove.includes(data.user.orcidId) && data.user.orcidId != userOrcidId"
                  class="w-34"
                  :model-value="data.role"
                  option-label="title"
                  option-value="value"
                  :options="roleOptions"
                  @change="changeRole(data.user.orcidId, $event.value)"
                />
              </div>
            </template>
          </Column>
          <Column>
            <template #body="{data}: {data: DisplayUserRole}">
              <PButton
                v-if="data.user.orcidId != userOrcidId && !orcidIdsToRemove.includes(data.user.orcidId)"
                aria-label="Remove user"
                icon="pi pi-trash"
                rounded
                severity="danger"
                size="small"
                text
                @click="removeUserRole(data.user.orcidId)"
              />
              <PButton
                v-if="orcidIdsToRemove.includes(data.user.orcidId)"
                label="Restore"
                severity="secondary"
                size="small"
                @click="restoreUserRole(data.user.orcidId)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <PButton label="Cancel" severity="secondary" @click="dialogVisible = false" />
        <PButton :disabled="!dirty" label="Save" severity="success" @click="saveChanges" />
      </div>
    </PDialog>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import _ from 'lodash'
import PButton from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import PDialog from 'primevue/dialog'
import PSelect from 'primevue/select'
import InputText from 'primevue/inputtext'

import useAuth from '@/composition/auth'
import useItem from '@/composition/item.ts'
import {addCollectionRole, removeCollectionRole} from '@/api/mavedb/collections'
import {lookupUser} from '@/api/mavedb/users'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import {type CollectionRole, collectionRoleOptions} from '@/lib/roles'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import {components} from '@/schema/openapi'

type User = components['schemas']['User']
type Collection = components['schemas']['Collection']

interface UserRole {
  user: User
  role: CollectionRole
  oldRole?: CollectionRole
}

interface DisplayUserRole extends UserRole {
  state: 'pending' | 'saved'
}

export default defineComponent({
  name: 'CollectionPermissionsEditor',

  components: {PButton, Column, DataTable, PDialog, PSelect, EmailPrompt, InputText, MvFloatField},

  props: {
    collectionUrn: {
      type: String,
      required: true
    }
  },

  emits: ['saved'],

  setup: () => {
    const {userOrcidId} = useAuth()
    return {
      userOrcidId,
      ...useItem<Collection>({itemTypeName: 'collection'})
    }
  },

  data: () => ({
    dialogVisible: false,

    pendingUserRoles: [] as UserRole[],
    existingUserRoles: [] as UserRole[],
    orcidIdsToRemove: [] as string[],

    orcidIdsToAddStr: '',
    roleToAdd: 'viewer' as CollectionRole,

    roleOptions: collectionRoleOptions,

    errors: [] as string[]
  }),

  computed: {
    dirty(): boolean {
      return (
        this.pendingUserRoles.length > 0 ||
        this.orcidIdsToRemove.length > 0 ||
        this.existingUserRoles.some((ur) => ur.oldRole)
      )
    },

    userRoles(): DisplayUserRole[] {
      return [
        ...this.pendingUserRoles.map((ur) => ({...ur, state: 'pending' as const})),
        ...this.existingUserRoles.map((ur) => ({...ur, state: 'saved' as const}))
      ]
    }
  },

  watch: {
    collectionUrn: {
      handler(newValue: string, oldValue: string) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    },

    item: {
      handler(newValue: Collection | null, oldValue: Collection | null) {
        if (!_.isEqual(newValue, oldValue)) {
          this.existingUserRoles = [
            ...(newValue?.admins?.map((user) => ({user, role: 'admin' as const})) || []),
            ...(newValue?.editors?.map((user) => ({user, role: 'editor' as const})) || []),
            ...(newValue?.viewers?.map((user) => ({user, role: 'viewer' as const})) || [])
          ]
        }
      }
    }
  },

  methods: {
    async addUsers(): Promise<void> {
      const orcidIdsToAdd = _.without(this.orcidIdsToAddStr.split(/[ ,]+/g), '')

      const invalidOrcidIds: string[] = []
      for (const orcidId of orcidIdsToAdd) {
        const existingUserRole = this.existingUserRoles.find((ur) => ur.user.orcidId == orcidId)
        const pendingUserRole = this.pendingUserRoles.find((ur) => ur.user.orcidId == orcidId)

        if (orcidId == this.userOrcidId) {
          this.$toast.add({
            life: 3000,
            severity: 'warn',
            summary: `Your own admin permissions cannot be changed.`
          })
        } else if (existingUserRole) {
          this.changeRole(orcidId, this.roleToAdd)
        } else if (pendingUserRole) {
          pendingUserRole.role = this.roleToAdd
        } else if (!ORCID_ID_REGEX.test(orcidId)) {
          invalidOrcidIds.push(orcidId)
          this.$toast.add({
            life: 3000,
            severity: 'warn',
            summary: `${orcidId} is not a valid ORCID ID`
          })
        } else {
          const user = await lookupUser(orcidId)
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

    changeRole(orcidId: string, newRole: CollectionRole): void {
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
          const existingUserRoleIndex = this.existingUserRoles.findIndex(
            (ur) => ur.user.orcidId == userRole.user.orcidId
          )
          this.existingUserRoles.splice(existingUserRoleIndex, 1, userRole)
        } else if (userRole.state == 'pending') {
          userRole.role = newRole
          const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          this.pendingUserRoles.splice(pendingUserRoleIndex, 1, userRole)
        }
      }
    },

    clearUserSearch(): void {
      this.orcidIdsToAddStr = ''
    },

    resetContributorEditor(): void {
      this.pendingUserRoles = []
      this.orcidIdsToRemove = []
      this.orcidIdsToAddStr = ''
      this.errors = []
      // Re-derive existing roles from the current item state
      for (const ur of this.existingUserRoles) {
        ur.oldRole = undefined
      }
    },

    removeUserRole(orcidId: string): void {
      const userRole = this.userRoles.find((ur) => ur.user.orcidId == orcidId)
      if (userRole) {
        if (userRole.state == 'saved') {
          this.orcidIdsToRemove.push(userRole.user.orcidId)
          if (userRole.oldRole) {
            userRole.role = userRole.oldRole
            userRole.oldRole = undefined
          }
          const existingUserRoleIndex = this.existingUserRoles.findIndex(
            (ur) => ur.user.orcidId == userRole.user.orcidId
          )
          this.existingUserRoles.splice(existingUserRoleIndex, 1, userRole)
        } else if (userRole.state == 'pending') {
          const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == userRole.user.orcidId)
          if (pendingUserRoleIndex >= 0) {
            this.pendingUserRoles.splice(pendingUserRoleIndex, 1)
          }
        }
      }
    },

    restoreUserRole(orcidId: string): void {
      this.orcidIdsToRemove = _.without(this.orcidIdsToRemove, orcidId)
    },

    rowStyle(userRole: DisplayUserRole): Record<string, string> | undefined {
      if (userRole.state == 'pending') {
        return {backgroundColor: '#f0fdf4'} // green-50
      } else if (this.orcidIdsToRemove.includes(userRole.user.orcidId)) {
        return {backgroundColor: '#fef2f2'} // red-50
      } else if (userRole.oldRole) {
        return {backgroundColor: '#fefce8'} // yellow-50
      }
    },

    async saveChanges(): Promise<void> {
      this.errors = []

      const failedRemovalUserRoles: UserRole[] = []
      for (const orcidId of this.orcidIdsToRemove) {
        const userRole = this.existingUserRoles.find((ur) => ur.user.orcidId == orcidId)
        if (!userRole) continue
        try {
          await removeCollectionRole(this.collectionUrn, userRole.role, orcidId)
        } catch (e) {
          failedRemovalUserRoles.push(userRole)
          this.errors.push(`${orcidId}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      const failedAdditionUserRoles: UserRole[] = []
      for (const role of ['admin', 'editor', 'viewer'] as const) {
        const userRoles = this.pendingUserRoles.filter((ur) => ur.role == role)

        for (const userRole of userRoles) {
          try {
            await addCollectionRole(this.collectionUrn, role, userRole.user.orcidId)
          } catch (error) {
            failedAdditionUserRoles.push(userRole)
            this.errors.push(`${userRole.user.orcidId}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }

      const failedRoleChangeUserRoles: UserRole[] = []
      const userRoles = this.existingUserRoles.filter((ur) => ur.oldRole != null && ur.oldRole != ur.role)

      for (const userRole of userRoles) {
        try {
          await addCollectionRole(this.collectionUrn, userRole.role, userRole.user.orcidId)
        } catch (error) {
          failedRoleChangeUserRoles.push(userRole)
          this.errors.push(`${userRole.user.orcidId}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (
        failedRemovalUserRoles.length == 0 &&
        failedAdditionUserRoles.length == 0 &&
        failedRoleChangeUserRoles.length == 0
      ) {
        this.dialogVisible = false
        this.$emit('saved')
      }
    }
  }
})
</script>
