<template>
  <div>
    <div class="mb-4 space-y-2.5">
      <MvFilterChips :filters="filters" :model-value="collectionFilter" @update:model-value="$emit('update:collectionFilter', $event)" />
      <FloatLabel variant="on">
        <InputText
          id="collection-search"
          :model-value="collectionSearch"
          style="width: 100%"
          type="text"
          @update:model-value="$emit('update:collectionSearch', $event)"
        />
        <label for="collection-search">Search collections</label>
      </FloatLabel>
    </div>

    <MvLoader v-if="loading.collections" text="Loading collections…" />

    <MvErrorState
      v-else-if="error.collections"
      description="We couldn't load your collections. Check your connection and try again."
      title="Failed to load collections"
      @retry="$emit('retry')"
    />

    <MvEmptyState
      v-else-if="!hasData"
      action-label="+ Create your first collection"
      description="Collections help you organise score sets and experiments for clinical interpretation workflows or personal reference."
      title="No collections yet"
      @action="$emit('createCollection')"
    />

    <MvEmptyState
      v-else-if="filteredCollections.length === 0"
      description="No collections match your current filters. Try adjusting or clearing your filters."
      title="No matching collections"
    >
      <PButton class="mt-2" label="Clear filters" severity="warn" size="small" @click="$emit('update:collectionFilter', ['all']); $emit('update:collectionSearch', '')" />
    </MvEmptyState>

    <div v-else class="overflow-hidden rounded-lg border border-border bg-white">
      <!-- Desktop table (md+) -->
      <table class="hidden w-full table-fixed border-collapse text-sm tablet:table">
        <thead>
          <tr class="border-b border-border bg-bg">
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted" style="width: 38%">Collection</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Score Sets</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Experiments</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Role</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Visibility</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Updated</th>
            <th class="w-20 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="col in filteredCollections"
            :key="col.urn"
            class="group border-b border-border-light transition-colors last:border-b-0 hover:bg-bg"
          >
            <td class="px-4 py-2.5 [overflow-wrap:anywhere]">
              <router-link class="line-clamp-1 text-sm font-semibold leading-snug text-sage hover:underline" :to="{name: 'collection', params: {urn: col.urn}}">
                {{ col.name }}
              </router-link>
              <div v-if="col.description" class="line-clamp-2 text-xs leading-tight text-text-muted">
                {{ col.description }}
              </div>
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              {{ col.scoreSetUrns?.length || 0 }}
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              {{ col.experimentUrns?.length || 0 }}
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="col.role" />
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="col.private ? 'private' : 'public'" />
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              {{ formatDate(col.modificationDate) }}
            </td>
            <td class="px-4 py-2.5 text-right">
              <MvRowActionMenu :actions="getCollectionActions(col)" />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list (<md) -->
      <div class="divide-y divide-border-light tablet:hidden">
        <div v-for="col in filteredCollections" :key="col.urn" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <router-link
              class="line-clamp-2 text-sm font-semibold leading-snug text-sage hover:underline [overflow-wrap:anywhere]"
              :to="{name: 'collection', params: {urn: col.urn}}"
            >
              {{ col.name }}
            </router-link>
            <MvRowActionMenu :actions="getCollectionActions(col)" />
          </div>
          <div v-if="col.description" class="mt-1 line-clamp-2 text-xs leading-tight text-text-muted">
            {{ col.description }}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <MvBadge :value="col.role" />
            <MvBadge :value="col.private ? 'private' : 'public'" />
            <span class="text-xs text-text-muted">
              {{ col.scoreSetUrns?.length || 0 }} score {{ (col.scoreSetUrns?.length || 0) === 1 ? 'set' : 'sets' }}
              · {{ col.experimentUrns?.length || 0 }} {{ (col.experimentUrns?.length || 0) === 1 ? 'experiment' : 'experiments' }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-border bg-bg px-4 py-3">
        <PButton label="+ New Collection" severity="warn" size="small" @click="$emit('createCollection')" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import PButton from 'primevue/button'
import MvFilterChips from '@/components/common/MvFilterChips.vue'
import MvBadge from '@/components/common/MvBadge.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvErrorState from '@/components/common/MvErrorState.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import MvRowActionMenu from '@/components/common/MvRowActionMenu.vue'
import type {RowAction} from '@/components/common/MvRowActionMenu.vue'
import type {CollectionWithRole} from '@/composables/use-dashboard'
import {formatDate} from '@/lib/formats'

export default defineComponent({
  name: 'MvDashboardCollections',

  components: {FloatLabel, InputText, PButton, MvFilterChips, MvBadge, MvEmptyState, MvErrorState, MvLoader, MvRowActionMenu},

  props: {
    filteredCollections: {type: Array as PropType<CollectionWithRole[]>, required: true},
    loading: {type: Object as PropType<{collections: boolean}>, required: true},
    error: {type: Object as PropType<{collections: boolean}>, required: true},
    collectionFilter: {type: Array as PropType<string[]>, required: true},
    collectionSearch: {type: String, required: true},
    hasData: {type: Boolean, required: true}
  },

  emits: ['update:collectionFilter', 'update:collectionSearch', 'createCollection', 'deleteCollection', 'retry'],

  computed: {
    filters() {
      return [
        {value: 'all', label: 'All', group: 'default'},
        {value: 'public', label: 'Public', group: 'visibility'},
        {value: 'private', label: 'Private', group: 'visibility'},
        {value: 'admin', label: 'Admin', group: 'role'},
        {value: 'editor', label: 'Editor', group: 'role'},
        {value: 'viewer', label: 'Viewer', group: 'role'}
      ]
    }
  },

  methods: {
    formatDate,
    getCollectionActions(col: CollectionWithRole): RowAction[] {
      const actions: RowAction[] = [
        {label: 'View', description: 'Open collection details', to: {name: 'collection', params: {urn: col.urn}}}
      ]
      if (col.role === 'admin') {
        actions.push(
          {separator: true},
          {label: 'Delete', description: 'Permanently delete this collection', danger: true, handler: () => this.confirmDeleteCollection(col)}
        )
      }
      return actions
    },
    confirmDeleteCollection(col: CollectionWithRole) {
      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message: `Are you sure you want to delete "${col.name}"? This action cannot be undone.`,
        header: 'Delete collection',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger'},
        rejectProps: {label: 'Cancel', severity: 'secondary'},
        accept: () => this.$emit('deleteCollection', col.urn)
      })
    }
  }
})
</script>
