<template>
  <EmailPrompt :is-first-login-prompt="false" />
  <div class="mb-4">
    <div class="flex flex-col gap-2">
      <div class="font-semibold">Collection details</div>
      <MvFloatField :error="validationErrors.name" label="Collection name">
        <template #default="{id, invalid}">
          <InputText :id="id" v-model="collectionName" class="w-full" fluid :invalid="invalid" />
        </template>
      </MvFloatField>

      <MvFloatField :error="validationErrors.description" label="Description">
        <template #default="{id, invalid}">
          <PTextarea :id="id" v-model="collectionDescription" class="w-full" fluid :invalid="invalid" />
        </template>
      </MvFloatField>
    </div>
  </div>

  <div class="mb-4">
    <div id="visibility-label" class="font-semibold mb-1.5">Visibility</div>
    <MvVisibilityToggle
      v-model="collectionPrivate"
      :description="
        collectionPrivate
          ? 'This collection will only be visible to you and users you grant permissions to. Click to make it public.'
          : 'This collection will be visible to anyone with the URL. Click to make it private.'
      "
    />
  </div>

  <div class="flex flex-col gap-3">
    <div class="font-semibold">User permissions</div>
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
      <PSelect
        v-model="roleToAdd"
        aria-label="Role to assign"
        class="w-34"
        option-label="title"
        option-value="value"
        :options="roleOptions"
      />
      <PButton class="flex-none" label="Add user" @click="addUsers" />
    </div>
    <DataTable
      v-if="pendingUserRoles.length > 0"
      data-key="orcidId"
      :multi-sort-meta="[
        {field: 'user.lastName', order: 1},
        {field: 'user.firstName', order: 1},
        {field: 'user.orcidId', order: 1}
      ]"
      sort-mode="multiple"
      :value="pendingUserRoles"
    >
      <Column field="user.orcidId" header="ORCID ID" />
      <Column :field="(userRole: any) => `${userRole.user.firstName} ${userRole.user.lastName}`" header="Name" />
      <Column field="role" header="Role">
        <template #body="{data}">
          <PSelect
            :aria-label="`Role for ${data.user.firstName} ${data.user.lastName}`"
            :model-value="data.role"
            option-label="title"
            option-value="value"
            :options="roleOptions"
            @change="changeRole(data.user.orcidId, $event.value)"
          />
        </template>
      </Column>
      <Column>
        <template #body="{data}">
          <PButton
            :aria-label="`Remove ${data.user.firstName} ${data.user.lastName}`"
            icon="pi pi-trash"
            rounded
            severity="danger"
            size="small"
            text
            @click="removeUserRole(data.user.orcidId)"
          />
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- TODO: Support adding score sets and experiments directly in the creator. -->
  <p class="mt-4 text-xs text-text-muted">
    <i class="pi pi-info-circle" style="font-size: 11px" />
    You can add score sets and experiments after the collection is created.
  </p>

  <div class="flex justify-end gap-2 mt-5">
    <PButton label="Cancel" severity="secondary" @click="cancel" />
    <PButton label="Save" severity="success" @click="saveCollection" />
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import {type AxiosError} from 'axios'
import PButton from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import PSelect from 'primevue/select'
import InputText from 'primevue/inputtext'
import PTextarea from 'primevue/textarea'

import {createCollection} from '@/api/mavedb/collections'
import {lookupUser} from '@/api/mavedb/users'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import {collectionRoleOptions} from '@/lib/roles'
import {useValidationErrors} from '@/composables/use-validation-errors'
import {parseApiValidationErrors} from '@/lib/form-validation'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import MvVisibilityToggle from '@/components/common/MvVisibilityToggle.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import {components} from '@/schema/openapi'

type User = components['schemas']['User']

interface UserRole {
  user: User
  role: string
}

export default {
  name: 'CollectionCreator',
  components: {
    PButton,
    Column,
    DataTable,
    PSelect,
    EmailPrompt,
    MvFloatField,
    MvVisibilityToggle,
    InputText,
    PTextarea
  },
  emits: ['createdCollection', 'canceled'],

  setup() {
    const validation = useValidationErrors()
    return {...validation}
  },

  data: () => ({
    collectionName: null as string | null,
    collectionDescription: null as string | null,
    collectionPrivate: true,
    pendingUserRoles: [] as UserRole[],

    orcidIdsToAddStr: '',
    roleToAdd: 'viewer',

    roleOptions: collectionRoleOptions
  }),

  methods: {
    addUsers: async function () {
      const orcidIdsToAdd = _.without(this.orcidIdsToAddStr.split(/[ ,]+/g), '')

      const invalidOrcidIds: string[] = []
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

    cancel: function () {
      this.$emit('canceled')
    },

    changeRole: function (orcidId: string, newRole: string) {
      const userRole = this.pendingUserRoles.find((ur) => ur.user.orcidId == orcidId)
      if (userRole) {
        userRole.role = newRole
      }
    },

    clearUserSearch: function () {
      this.orcidIdsToAddStr = ''
    },

    removeUserRole: function (orcidId: string) {
      const pendingUserRoleIndex = this.pendingUserRoles.findIndex((ur) => ur.user.orcidId == orcidId)
      if (pendingUserRoleIndex >= 0) {
        this.pendingUserRoles.splice(pendingUserRoleIndex, 1)
      }
    },

    saveCollection: async function () {
      this.clearValidationState()

      const collectionName = this.collectionName?.trim()
      const collectionDescription = this.collectionDescription?.trim() || undefined

      if (!collectionName) {
        this.setClientError('name', 'Collection name is required.')
        return
      }

      try {
        const savedCollection = await createCollection({
          name: collectionName,
          description: collectionDescription,
          private: this.collectionPrivate,
          viewers: this.pendingUserRoles.filter((ur) => ur.role == 'viewer').map((ur) => ({orcidId: ur.user.orcidId})),
          editors: this.pendingUserRoles.filter((ur) => ur.role == 'editor').map((ur) => ({orcidId: ur.user.orcidId})),
          admins: this.pendingUserRoles.filter((ur) => ur.role == 'admin').map((ur) => ({orcidId: ur.user.orcidId}))
        })
        this.$toast.add({severity: 'success', summary: 'Created new collection.', life: 3000})
        this.$emit('createdCollection', savedCollection)
      } catch (err) {
        const detail = (err as AxiosError<{detail: unknown}>)?.response?.data?.detail
        if (detail) {
          const fieldErrors = parseApiValidationErrors(detail)
          if (fieldErrors) {
            this.setServerErrors(fieldErrors)
            return
          }
        }
        this.$toast.add({severity: 'error', summary: 'Error creating collection.', life: 3000})
      }
    }
  }
}
</script>
