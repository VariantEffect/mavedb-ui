<template>
  <MvLayout>
    <!-- Header (only rendered when item is loaded) -->
    <template v-if="item" #header>
      <header class="border-b border-border bg-white px-6 pb-9 pt-10">
        <div class="mx-auto" style="max-width: 1200px">
          <div
            class="mb-1 text-sm font-semibold uppercase tracking-wider"
            :class="item.badgeName ? 'cursor-help text-sage-dark' : 'text-text-muted'"
          >
            <span
              v-if="item.badgeName"
              v-tooltip.right="'Official collections are curated and maintained by the MaveDB team.'"
            >
              Official Collection
            </span>
            <span v-else>Collection</span>
          </div>

          <div class="flex items-start justify-between gap-5">
            <div class="min-w-0 flex-1">
              <!-- Edit mode -->
              <template v-if="editing">
                <div class="mb-3">
                  <MvFloatField label="Name">
                    <template #default="{id}">
                      <InputText :id="id" v-model="editName" autofocus class="w-full" @keyup.enter="saveEdits" />
                    </template>
                  </MvFloatField>
                </div>
                <div class="mb-3">
                  <MvFloatField label="Description">
                    <template #default="{id}">
                      <PTextarea :id="id" v-model="editDescription" class="w-full" rows="3" />
                    </template>
                  </MvFloatField>
                </div>
                <div class="mb-3">
                  <div class="text-xs font-semibold text-text-muted mb-1">Visibility</div>
                  <MvVisibilityToggle
                    v-model="editPrivate"
                    :description="item.badgeName ? 'Official collections cannot be made private.' : undefined"
                    :disabled="!!item.badgeName"
                  />
                </div>
                <div class="flex gap-2">
                  <PButton label="Save" severity="success" size="small" @click="saveEdits" />
                  <PButton label="Cancel" severity="secondary" size="small" @click="cancelEditing" />
                </div>
              </template>

              <!-- Display mode -->
              <template v-else>
                <h1 class="mb-2 font-display text-3xl font-bold text-text-dark">{{ item.name }}</h1>

                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <MvVisibilityToggle
                    :interactive="userIsAuthorized.update"
                    :model-value="item.private"
                    @click="privacyDialogVisible = true"
                  />
                </div>

                <!-- eslint-disable vue/no-v-html -->
                <div
                  v-if="item.description"
                  class="whitespace-pre-line text-sm leading-relaxed text-text-secondary"
                  v-html="linkifyTextHtml(item.description)"
                />
                <!-- eslint-enable vue/no-v-html -->

                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span v-if="item.creationDate">
                    Created {{ formatDate(item.creationDate) }}
                    <template v-if="item.createdBy">
                      by
                      <MvOrcidLink
                        :first-name="item.createdBy.firstName"
                        :last-name="item.createdBy.lastName"
                        :orcid-id="item.createdBy.orcidId"
                        size="sm"
                      />
                    </template>
                  </span>
                  <span v-if="item.modificationDate">
                    Modified {{ formatDate(item.modificationDate) }}
                    <template v-if="item.modifiedBy">
                      by
                      <MvOrcidLink
                        :first-name="item.modifiedBy.firstName"
                        :last-name="item.modifiedBy.lastName"
                        :orcid-id="item.modifiedBy.orcidId"
                        size="sm"
                      />
                    </template>
                  </span>
                </div>
              </template>
            </div>

            <div v-if="hasActions && !editing" class="flex shrink-0 gap-2">
              <MvRowActionMenu :actions="collectionActions" />
            </div>
          </div>
        </div>
      </header>
    </template>

    <!-- Default slot: loading, error, or content -->
    <div
      v-if="itemStatus === 'Loading' || itemStatus === 'NotLoaded'"
      class="mx-auto w-full px-4 py-16 tablet:px-6"
      style="max-width: 1200px"
    >
      <MvLoader text="Loading collection…" />
    </div>

    <div v-else-if="itemStatus !== 'Loaded'" class="mx-auto w-full px-4 py-6 tablet:px-6" style="max-width: 1200px">
      <MvItemNotFound :item-id="itemId" model="collection" />
    </div>

    <div v-else-if="item" class="mx-auto w-full space-y-6 px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1200px">
      <template v-for="section in entitySections" :key="section.type">
        <div class="overflow-hidden rounded-lg border border-border bg-white">
          <div class="flex items-center justify-between border-b border-border-light px-5 py-4">
            <span class="text-[15px] font-bold text-text-dark">{{ section.title }} ({{ section.items.length }})</span>
            <PButton
              v-if="userIsAuthorized.add_score_set && section.items.length > 0"
              :aria-label="`Add ${section.title.toLowerCase()}`"
              icon="pi pi-plus"
              :label="`Add ${section.title.toLowerCase()}`"
              severity="success"
              size="small"
              @click="openEditor(section.editorRef)"
            />
          </div>
          <div class="px-5 py-4">
            <CollectionItemsTable
              :can-add="userIsAuthorized.add_score_set"
              :can-update="userIsAuthorized.update"
              :entity-type="section.type"
              :items="section.items"
              @add="openEditor(section.editorRef)"
              @remove="section.remove"
              @reorder="section.reorder"
            />
          </div>
        </div>

        <div v-if="userIsAuthorized.add_score_set" class="hidden">
          <CollectionDataSetEditor
            :ref="section.editorRef"
            :collection-urn="item.urn"
            :data-set-type="section.type"
            :show-trigger="false"
            @saved="childComponentEditedCollection"
          />
        </div>
      </template>

      <!-- User Permissions -->
      <div class="relative overflow-hidden rounded-lg border border-border bg-white">
        <div class="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sage via-mint to-orange-cta" />
        <div class="flex items-center justify-between border-b border-border-light px-5 py-4 pt-[19px]">
          <span class="text-[15px] font-bold text-text-dark">User Permissions</span>
          <div v-if="userIsAuthorized.add_role">
            <CollectionPermissionsEditor :collection-urn="item.urn" @saved="childComponentEditedCollection" />
          </div>
        </div>
        <div class="divide-y divide-border-light px-5">
          <template v-for="group in roleGroups" :key="group.role">
            <div v-if="group.visible" class="py-4">
              <div class="mb-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                {{ group.title }} ({{ group.users.length }})
              </div>
              <div v-if="group.users.length > 0" class="flex flex-col gap-2">
                <MvOrcidLink
                  v-for="user in group.users"
                  :key="user.orcidId"
                  :first-name="user.firstName"
                  :last-name="user.lastName"
                  :orcid-id="user.orcidId"
                />
              </div>
              <p v-else class="text-sm text-text-muted">No {{ group.title.toLowerCase() }}</p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Privacy dialog -->
    <PDialog
      v-if="item && userIsAuthorized.update"
      v-model:visible="privacyDialogVisible"
      :close-on-escape="true"
      header="Change Visibility"
      modal
      :style="{width: '28rem', maxWidth: 'calc(100% - 2rem)'}"
    >
      <p v-if="item.private" class="mb-4 text-sm leading-relaxed text-text-secondary">
        This collection is currently <strong>private</strong>. Only designated admins, editors, and viewers can access
        it. Making it public will allow anyone with the URL to view it.
      </p>
      <p v-else-if="item.badgeName" class="mb-4 text-sm leading-relaxed text-text-secondary">
        This collection is currently <strong>public</strong> and is an official collection of MaveDB. Its visibility
        cannot be changed.
      </p>
      <p v-else class="mb-4 text-sm leading-relaxed text-text-secondary">
        This collection is currently <strong>public</strong>. Any user with the URL can access it. Making it private
        will restrict access to designated users only.
      </p>
      <div class="flex justify-end gap-2">
        <PButton label="Cancel" severity="secondary" size="small" @click="privacyDialogVisible = false" />
        <PButton
          v-if="item.private"
          icon="pi pi-lock-open"
          label="Make Public"
          severity="warn"
          size="small"
          @click="updatePrivacy(false)"
        />
        <PButton
          v-else-if="!item.badgeName"
          icon="pi pi-lock"
          label="Make Private"
          severity="danger"
          size="small"
          @click="updatePrivacy(true)"
        />
      </div>
    </PDialog>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent, toRef} from 'vue'
import PButton from 'primevue/button'
import PDialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import PTextarea from 'primevue/textarea'
import {useHead} from '@unhead/vue'

import CollectionDataSetEditor from '@/components/collection/CollectionDataSetEditor.vue'
import CollectionItemsTable from '@/components/collection/CollectionItemsTable.vue'
import CollectionPermissionsEditor from '@/components/collection/CollectionPermissionsEditor.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import MvOrcidLink from '@/components/common/MvOrcidLink.vue'
import MvVisibilityToggle from '@/components/common/MvVisibilityToggle.vue'
import MvRowActionMenu from '@/components/common/MvRowActionMenu.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import {deleteCollection, removeCollectionEntity, updateCollection} from '@/api/mavedb/collections'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import type {RowAction} from '@/components/common/MvRowActionMenu.vue'
import {components} from '@/schema/openapi'
import {getErrorResponse} from '@/api/mavedb'

type Collection = components['schemas']['Collection']
type User = components['schemas']['User']

export default defineComponent({
  name: 'CollectionView',

  components: {
    CollectionDataSetEditor,
    CollectionItemsTable,
    CollectionPermissionsEditor,
    InputText,
    MvItemNotFound,
    MvFloatField,
    MvLayout,
    MvLoader,
    MvOrcidLink,
    MvRowActionMenu,
    MvVisibilityToggle,
    PButton,
    PDialog,
    PTextarea
  },

  props: {
    itemId: {type: String, required: true}
  },

  setup(props) {
    const head = useHead({title: 'Collection'})
    const {userIsAuthenticated, userOrcidId} = useAuth()
    const urnRef = toRef(props, 'itemId')
    const COLLECTION_ACTIONS = ['delete', 'publish', 'update', 'add_score_set', 'add_role'] as const
    const {permissions} = useDatasetPermissions('collection', urnRef, COLLECTION_ACTIONS)

    return {
      head,
      userIsAuthenticated,
      userOrcidId,
      userIsAuthorized: permissions,
      ...useFormatters(),
      ...useItem<Collection>({itemTypeName: 'collection'})
    }
  },

  data() {
    return {
      editing: false,
      editName: '' as string,
      editDescription: '' as string,
      editPrivate: false,
      privacyDialogVisible: false
    }
  },

  computed: {
    scoreSetsList() {
      return (this.item?.scoreSetUrns || []).map((urn: string) => ({urn}))
    },
    experimentsList() {
      return (this.item?.experimentUrns || []).map((urn: string) => ({urn}))
    },
    entitySections() {
      return [
        {
          type: 'scoreSet' as const,
          title: 'Score Sets',
          editorRef: 'scoreSetEditor',
          items: this.scoreSetsList,
          remove: (urn: string) => this.removeScoreSet(urn),
          reorder: (event: {value: {urn: string}[]}) => this.onScoreSetReorder(event)
        },
        {
          type: 'experiment' as const,
          title: 'Experiments',
          editorRef: 'experimentEditor',
          items: this.experimentsList,
          remove: (urn: string) => this.removeExperiment(urn),
          reorder: (event: {value: {urn: string}[]}) => this.onExperimentReorder(event)
        }
      ]
    },
    roleGroups() {
      if (!this.item) return []
      return [
        {
          role: 'admin',
          title: 'Admins',
          users: this.item.admins,
          visible: this.item.admins.length > 0 || this.userIsAuthorized.add_role
        },
        {role: 'editor', title: 'Editors', users: this.item.editors, visible: this.userIsAuthorized.add_role},
        {role: 'viewer', title: 'Viewers', users: this.item.viewers, visible: this.userIsAuthorized.add_role}
      ]
    },
    hasActions(): boolean {
      return this.userIsAuthorized.update || this.userIsAuthorized.delete
    },
    collectionActions(): RowAction[] {
      const actions: RowAction[] = []
      if (this.userIsAuthorized.update) {
        actions.push({
          label: 'Edit Details',
          description: 'Edit collection name and description',
          handler: () => this.beginEditing()
        })
      }
      actions.push({
        label: 'Copy Share Link',
        description: 'Copy a link to this collection',
        handler: () => this.copyShareLink()
      })
      const deleteAction = this.deleteCollectionAction
      if (deleteAction) {
        actions.push({separator: true}, deleteAction)
      }
      return actions
    },
    userIsAdmin(): boolean {
      if (!this.item || !this.userOrcidId) return false
      return this.item.admins.some((admin: User) => admin.orcidId === this.userOrcidId)
    },
    /**
     * Build the "Delete Collection" action for the row action menu.
     *
     * Only shown to collection admins. Deletion is enabled when all conditions are met:
     *   1. The user has the `delete` permission (API grants this for private, non-official collections).
     *   2. The collection is not official (official collections cannot be deleted).
     *   3. The collection is private (public collections must be made private first).
     *
     * When deletion is blocked, the action is shown disabled with an explanation
     * so admins know why and what to do. Returns null for non-admins.
     */
    deleteCollectionAction(): RowAction | null {
      if (!this.userIsAdmin) return null

      const isOfficial = !!this.item?.badgeName
      const isPublic = !this.item?.private
      const canDelete = this.userIsAuthorized.delete && !isPublic && !isOfficial

      let description = 'Permanently delete this collection'
      if (isOfficial) {
        description = 'Official collections cannot be deleted.'
      } else if (isPublic) {
        description = 'Public collections cannot be deleted. Make it private first.'
      }

      return {
        label: 'Delete Collection',
        description,
        danger: true,
        disabled: !canDelete,
        handler: () => this.deleteCollectionWithConfirmation()
      }
    }
  },

  watch: {
    item: {
      handler(newValue: {name?: string} | null) {
        this.head.patch({title: newValue?.name || 'Collection'})
      }
    },
    itemId: {
      handler(newValue: string, oldValue: string) {
        if (newValue !== oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {
    async copyShareLink() {
      const url = `${window.location.origin}/collections/${this.itemId}`
      try {
        await navigator.clipboard.writeText(url)
        this.$toast.add({severity: 'success', summary: 'Link copied to clipboard', life: 3000})
      } catch {
        this.$toast.add({severity: 'warn', summary: 'Failed to copy link', life: 3000})
      }
    },

    childComponentEditedCollection() {
      this.reloadItem(this.itemId)
    },

    beginEditing() {
      if (!this.item) return
      this.editName = this.item.name || ''
      this.editDescription = this.item.description || ''
      this.editPrivate = this.item.private
      this.editing = true
    },

    cancelEditing() {
      this.editing = false
    },

    async saveEdits() {
      if (!this.item) return
      const name = this.editName.trim()
      const description = this.editDescription.trim() || null

      if (!name) {
        this.$toast.add({severity: 'warn', summary: 'Collection name cannot be empty', life: 3000})
        return
      }

      const patch: Record<string, unknown> = {}
      if (name !== this.item.name) patch.name = name
      if (description !== this.item.description) patch.description = description
      if (this.editPrivate !== this.item.private) patch.private = this.editPrivate

      if (Object.keys(patch).length === 0) {
        this.editing = false
        return
      }

      try {
        await updateCollection(this.item.urn, patch)
        this.reloadItem(this.itemId)
        this.editing = false
        this.$toast.add({severity: 'success', summary: 'Collection updated.', life: 3000})
      } catch (error: unknown) {
        const errResponse = getErrorResponse(error)
        this.$toast.add({
          severity: 'error',
          summary: 'Error saving changes',
          detail: errResponse.data?.detail || 'Unknown error',
          life: 5000
        })
      }
    },

    openEditor(editorRef: string) {
      const ref = this.$refs[editorRef]
      // Refs inside v-for return an array; unwrap if needed.
      const editor = (Array.isArray(ref) ? ref[0] : ref) as {openEditor?: () => void} | undefined
      if (editor && typeof editor.openEditor === 'function') {
        editor.openEditor()
      }
    },

    async removeCollectionEntity(
      entityType: string,
      urn: string,
      {successSummary, failureSummary}: {successSummary: string; failureSummary: string}
    ) {
      if (!this.item) return
      try {
        await removeCollectionEntity(this.item.urn, entityType, urn)
        this.$toast.add({severity: 'success', summary: successSummary, life: 3000})
        this.reloadItem(this.itemId)
      } catch (error: unknown) {
        const errResponse = getErrorResponse(error)
        this.$toast.add({
          severity: 'error',
          summary: failureSummary,
          detail: errResponse.data?.detail || 'Unknown error',
          life: 5000
        })
      }
    },

    async removeScoreSet(urn: string) {
      return this.removeCollectionEntity('score-sets', urn, {
        successSummary: 'Score set removed',
        failureSummary: 'Failed to remove score set'
      })
    },

    async removeExperiment(urn: string) {
      return this.removeCollectionEntity('experiments', urn, {
        successSummary: 'Experiment removed',
        failureSummary: 'Failed to remove experiment'
      })
    },

    async reorderCollectionItems(
      event: {value: {urn: string}[]},
      urnFieldName: string,
      successSummary: string,
      failureSummary: string
    ) {
      if (!this.item) return
      const newOrder = event.value.map((row) => row.urn)
      try {
        await updateCollection(this.item.urn, {[urnFieldName]: newOrder})
        this.reloadItem(this.itemId)
        this.$toast.add({severity: 'success', summary: successSummary, life: 3000})
      } catch (error: unknown) {
        const errResponse = getErrorResponse(error)
        this.$toast.add({
          severity: 'error',
          summary: failureSummary,
          detail: errResponse.data?.detail || 'Unknown error',
          life: 5000
        })
        this.reloadItem(this.itemId)
      }
    },

    async onScoreSetReorder(event: {value: {urn: string}[]}) {
      await this.reorderCollectionItems(event, 'score_set_urns', 'Score sets reordered', 'Failed to reorder score sets')
    },

    async onExperimentReorder(event: {value: {urn: string}[]}) {
      await this.reorderCollectionItems(
        event,
        'experiment_urns',
        'Experiments reordered',
        'Failed to reorder experiments'
      )
    },

    deleteCollectionWithConfirmation() {
      if (!this.item) return

      const item = this.item
      const numOtherUsers = (item.admins || []).length + (item.editors || []).length + (item.viewers || []).length - 1

      const message =
        numOtherUsers > 0
          ? `Are you sure you want to delete "${item.name}"? ${numOtherUsers} other users will also lose access.`
          : `Are you sure you want to delete "${item.name}"?`

      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message,
        header: `Delete ${item.name}`,
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger'},
        rejectProps: {label: 'Cancel', severity: 'secondary'},
        accept: async () => {
          try {
            await deleteCollection(item.urn)
            this.$router.replace({name: 'dashboard', query: {tab: 'collections'}})
            this.$toast.add({severity: 'success', summary: 'Collection deleted successfully.', life: 3000})
          } catch (error: unknown) {
            const errResponse = getErrorResponse(error)
            this.$toast.add({
              severity: 'warn',
              summary: (errResponse.data?.detail as string) || 'Unknown error',
              life: 3000
            })
          }
        }
      })
    },

    async updatePrivacy(newPrivate: boolean) {
      if (!this.item) return
      if (newPrivate === this.item.private) return

      try {
        await updateCollection(this.item.urn, {private: newPrivate})
        this.reloadItem(this.itemId)
        this.privacyDialogVisible = false
        this.$toast.add({
          severity: 'success',
          summary: `Collection is now ${newPrivate ? 'private' : 'public'}.`,
          life: 3000
        })
      } catch (error: unknown) {
        const errResponse = getErrorResponse(error)
        this.$toast.add({
          severity: 'warn',
          summary: (errResponse.data?.detail as string) || 'Unknown error',
          life: 3000
        })
      }
    }
  }
})
</script>
