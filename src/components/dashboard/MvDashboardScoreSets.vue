<template>
  <div>
    <div class="mb-4 space-y-2.5">
      <MvFilterChips
        :dirty="!!crossTabFilter"
        :filters="filters"
        :model-value="scoreSetFilter"
        @clear="($emit('clearCrossTabFilter'), $emit('update:scoreSetSearch', ''))"
        @update:model-value="$emit('update:scoreSetFilter', $event)"
      >
        <span
          v-if="crossTabFilter"
          class="inline-flex items-center gap-1.5 rounded-[14px] border-[1.5px] border-sage bg-sage px-3 py-1 text-xs font-semibold text-text-dark"
        >
          {{ crossTabFilter.type === 'experiment' ? crossTabFilter.experimentTitle : null }}
          <span
            class="cursor-pointer text-sm leading-none opacity-70 hover:opacity-100"
            @click="$emit('clearCrossTabFilter')"
          >
            &times;
          </span>
        </span>
      </MvFilterChips>
      <FloatLabel variant="on">
        <InputText
          id="score-set-search"
          :model-value="scoreSetSearch"
          style="width: 100%"
          type="text"
          @update:model-value="$emit('update:scoreSetSearch', $event)"
        />
        <label for="score-set-search">Search score sets</label>
      </FloatLabel>
    </div>

    <MvLoader v-if="loading.scoreSets" text="Loading score sets…" />

    <MvErrorState
      v-else-if="error.scoreSets"
      description="We couldn't load your score sets. Check your connection and try again."
      title="Failed to load score sets"
      @retry="$emit('retry')"
    />

    <MvEmptyState
      v-else-if="!hasData"
      action-label="+ Create your first score set"
      description="Score sets contain variant effect data from functional assays."
      title="No score sets yet"
      :to="{name: 'createScoreSet'}"
    />

    <MvEmptyState
      v-else-if="filteredScoreSets.length === 0"
      description="No score sets match your current filters. Try adjusting or clearing your filters."
      title="No matching score sets"
    >
      <PButton class="mt-2" label="Clear filters" severity="warn" size="small" @click="clearFilters()" />
    </MvEmptyState>

    <div v-else class="overflow-hidden rounded-lg border border-border bg-white">
      <!-- Desktop table (md+) -->
      <table class="hidden w-full table-fixed border-collapse text-sm tablet:table">
        <thead>
          <tr class="border-b border-border bg-bg">
            <th
              class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
              style="width: 46%"
            >
              Score Set
            </th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Role</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Published</th>
            <th class="w-20 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ss in filteredScoreSets"
            :key="ss.urn"
            class="group border-b border-border-light transition-colors last:border-b-0 hover:bg-bg"
          >
            <td class="px-4 py-2.5 [overflow-wrap:anywhere]">
              <router-link
                class="line-clamp-1 text-sm font-semibold leading-snug text-sage hover:underline"
                :to="{name: 'scoreSet', params: {urn: ss.urn}}"
              >
                {{ ss.title }}
              </router-link>
              <div v-if="ss.shortDescription" class="line-clamp-2 text-xs leading-tight text-text-muted">
                {{ ss.shortDescription }}
              </div>
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="ss.role" />
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="ss.status" />
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              <template v-if="ss.publishedDate">{{ formatDate(ss.publishedDate) }}</template>
              <span v-else class="text-xs italic text-text-muted">Updated {{ formatDate(ss.modificationDate) }}</span>
            </td>
            <td class="px-4 py-2.5 text-right">
              <MvRowActionMenu :actions="getScoreSetActions(ss)" />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list (<md) -->
      <div class="divide-y divide-border-light tablet:hidden">
        <div v-for="ss in filteredScoreSets" :key="ss.urn" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <router-link
              class="line-clamp-2 text-sm font-semibold leading-snug text-sage hover:underline [overflow-wrap:anywhere]"
              :to="{name: 'scoreSet', params: {urn: ss.urn}}"
            >
              {{ ss.title }}
            </router-link>
            <MvRowActionMenu :actions="getScoreSetActions(ss)" />
          </div>
          <div v-if="ss.shortDescription" class="mt-1 line-clamp-2 text-xs leading-tight text-text-muted">
            {{ ss.shortDescription }}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <MvBadge :value="ss.role" />
            <MvBadge :value="ss.status" />
            <span v-if="ss.publishedDate" class="text-xs text-text-muted">{{ formatDate(ss.publishedDate) }}</span>
            <span v-else class="text-xs italic text-text-muted">Updated {{ formatDate(ss.modificationDate) }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-border bg-bg px-4 py-3">
        <PButton label="+ Add Score Set" severity="warn" size="small" @click="$router.push({name: 'createScoreSet'})" />
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
import type {CrossTabFilter, ScoreSetWithMeta} from '@/composables/use-dashboard'
import {formatDate} from '@/lib/formats'

export default defineComponent({
  name: 'MvDashboardScoreSets',

  components: {
    FloatLabel,
    InputText,
    PButton,
    MvFilterChips,
    MvBadge,
    MvEmptyState,
    MvErrorState,
    MvLoader,
    MvRowActionMenu
  },

  props: {
    filteredScoreSets: {type: Array as PropType<ScoreSetWithMeta[]>, required: true},
    loading: {type: Object as PropType<{scoreSets: boolean}>, required: true},
    error: {type: Object as PropType<{scoreSets: boolean}>, required: true},
    scoreSetFilter: {type: Array as PropType<string[]>, required: true},
    hasData: {type: Boolean, required: true},
    scoreSetSearch: {type: String, required: true},
    crossTabFilter: {type: Object as PropType<CrossTabFilter | null>, default: null}
  },

  emits: [
    'update:scoreSetFilter',
    'update:scoreSetSearch',
    'deleteScoreSet',
    'clearCrossTabFilter',
    'retry',
    'viewCalibrations'
  ],

  computed: {
    filters() {
      return [
        {value: 'all', label: 'All', group: 'default'},
        {value: 'published', label: 'Published', group: 'status'},
        {value: 'unpublished', label: 'Unpublished', group: 'status'},
        // TODO: Add meta-analysis and superseded filters once ShortScoreSet includes those fields.
        {value: 'owned', label: 'Owned', group: 'role'},
        {value: 'contributed', label: 'Contributed', group: 'role'}
      ]
    }
  },

  methods: {
    formatDate,
    clearFilters() {
      this.$emit('update:scoreSetFilter', ['all'])
      this.$emit('update:scoreSetSearch', '')
      this.$emit('clearCrossTabFilter')
    },
    getScoreSetActions(ss: ScoreSetWithMeta): RowAction[] {
      const actions: RowAction[] = [
        {label: 'View', description: 'Open score set details', to: {name: 'scoreSet', params: {urn: ss.urn}}}
      ]
      // Score sets can only be edited (mostly) and deleted before publication.
      // TODO: Use the permissions API (GET /permissions/user-is-permitted/{model}/{urn}/{action})
      // for precise authorization checks instead of client-side heuristics.
      if (!ss.publishedDate) {
        actions.push(
          {label: 'Edit', description: 'Edit score set', to: {name: 'editScoreSet', params: {urn: ss.urn}}},
          {separator: true},
          {
            label: 'Delete',
            description: 'Permanently delete this score set',
            danger: true,
            handler: () => this.confirmDeleteScoreSet(ss)
          }
        )
      }
      return actions
    },
    confirmDeleteScoreSet(ss: ScoreSetWithMeta) {
      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message: `Are you sure you want to delete "${ss.title}"? This action cannot be undone.`,
        header: 'Delete score set',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger'},
        rejectProps: {label: 'Cancel', severity: 'secondary'},
        accept: () => this.$emit('deleteScoreSet', ss.urn)
      })
    }
  }
})
</script>
