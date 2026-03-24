<template>
  <div>
    <div class="mb-4 space-y-2.5">
      <MvFilterChips :filters="filters" :model-value="experimentFilter" @update:model-value="$emit('update:experimentFilter', $event)" />
      <FloatLabel variant="on">
        <InputText
          id="experiment-search"
          :model-value="experimentSearch"
          style="width: 100%"
          type="text"
          @update:model-value="$emit('update:experimentSearch', $event)"
        />
        <label for="experiment-search">Search experiments</label>
      </FloatLabel>
    </div>

    <MvLoader v-if="loading.experiments" text="Loading experiments…" />

    <MvErrorState
      v-else-if="error.experiments"
      description="We couldn't load your experiments. Check your connection and try again."
      title="Failed to load experiments"
      @retry="$emit('retry')"
    />

    <MvEmptyState
      v-else-if="!hasData"
      action-label="+ Create your first experiment"
      description="Experiments group related score sets together under a shared context, such as a single study or assay."
      title="No experiments yet"
      :to="{name: 'createExperiment'}"
    />

    <MvEmptyState
      v-else-if="filteredExperiments.length === 0"
      description="No experiments match your current filters. Try adjusting or clearing your filters."
      title="No matching experiments"
    >
      <PButton class="mt-2" label="Clear filters" severity="warn" size="small" @click="$emit('update:experimentFilter', ['all']); $emit('update:experimentSearch', '')" />
    </MvEmptyState>

    <div v-else class="overflow-hidden rounded-lg border border-border bg-white">
      <!-- Desktop table (md+) -->
      <table class="hidden w-full table-fixed border-collapse text-sm tablet:table">
        <thead>
          <tr class="border-b border-border bg-bg">
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted" style="width: 40%">Experiment</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Score Sets</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Role</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Created</th>
            <th class="w-20 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="exp in filteredExperiments"
            :key="exp.urn"
            class="group border-b border-border-light transition-colors last:border-b-0 hover:bg-bg"
          >
            <td class="px-4 py-2.5 [overflow-wrap:anywhere]">
              <router-link class="line-clamp-1 text-sm font-semibold leading-snug text-sage hover:underline" :to="{name: 'experiment', params: {urn: exp.urn}}">
                {{ exp.title }}
              </router-link>
              <div v-if="exp.shortDescription" class="line-clamp-2 text-xs leading-tight text-text-muted">
                {{ exp.shortDescription }}
              </div>
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              {{ exp.scoreSetUrns?.length || 0 }} score {{ exp.scoreSetUrns?.length === 1 ? 'set' : 'sets' }}
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="exp.role" />
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="exp.status" />
            </td>
            <td class="whitespace-nowrap px-4 py-2.5 text-sm text-text-muted">
              {{ formatDate(exp.creationDate) }}
            </td>
            <td class="px-4 py-2.5 text-right">
              <MvRowActionMenu :actions="getExperimentActions(exp)" />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list (<md) -->
      <div class="divide-y divide-border-light tablet:hidden">
        <div v-for="exp in filteredExperiments" :key="exp.urn" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <router-link
              class="line-clamp-2 text-sm font-semibold leading-snug text-sage hover:underline [overflow-wrap:anywhere]"
              :to="{name: 'experiment', params: {urn: exp.urn}}"
            >
              {{ exp.title }}
            </router-link>
            <MvRowActionMenu :actions="getExperimentActions(exp)" />
          </div>
          <div v-if="exp.shortDescription" class="mt-1 line-clamp-2 text-xs leading-tight text-text-muted">
            {{ exp.shortDescription }}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <MvBadge :value="exp.role" />
            <MvBadge :value="exp.status" />
            <span class="text-xs text-text-muted">
              {{ exp.scoreSetUrns?.length || 0 }} score {{ exp.scoreSetUrns?.length === 1 ? 'set' : 'sets' }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-border bg-bg px-4 py-3">
        <PButton label="+ Add Experiment" severity="warn" size="small" @click="$router.push({name: 'createExperiment'})" />
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
import type {ExperimentWithMeta} from '@/composables/use-dashboard'
import {formatDate} from '@/lib/formats'

export default defineComponent({
  name: 'MvDashboardExperiments',

  components: {FloatLabel, InputText, PButton, MvFilterChips, MvBadge, MvEmptyState, MvErrorState, MvLoader, MvRowActionMenu},

  props: {
    filteredExperiments: {type: Array as PropType<ExperimentWithMeta[]>, required: true},
    loading: {type: Object as PropType<{experiments: boolean}>, required: true},
    error: {type: Object as PropType<{experiments: boolean}>, required: true},
    experimentFilter: {type: Array as PropType<string[]>, required: true},
    hasData: {type: Boolean, required: true},
    experimentSearch: {type: String, required: true}
  },

  emits: ['update:experimentFilter', 'update:experimentSearch', 'viewScoreSets', 'deleteExperiment', 'retry'],

  computed: {
    filters() {
      return [
        {value: 'all', label: 'All', group: 'default'},
        {value: 'published', label: 'Published', group: 'status'},
        {value: 'unpublished', label: 'Unpublished', group: 'status'},
        {value: 'owned', label: 'Owned', group: 'role'},
        {value: 'contributed', label: 'Contributed', group: 'role'}
      ]
    }
  },

  methods: {
    formatDate,
    viewScoreSets(exp: ExperimentWithMeta) {
      this.$emit('viewScoreSets', {experimentUrn: exp.urn, experimentTitle: exp.title})
    },
    getExperimentActions(exp: ExperimentWithMeta): RowAction[] {
      const actions: RowAction[] = [
        {label: 'View', description: 'Open experiment details', to: {name: 'experiment', params: {urn: exp.urn}}},
        {label: 'Score Sets', description: 'View associated score sets', handler: () => this.viewScoreSets(exp)}
      ]
      if (!exp.publishedDate) {
        actions.push(
          {label: 'Edit', description: 'Edit experiment', to: {name: 'editExperiment', params: {urn: exp.urn}}},
          {separator: true},
          {label: 'Delete', description: 'Permanently delete this experiment', danger: true, handler: () => this.confirmDeleteExperiment(exp)}
        )
      }
      return actions
    },
    confirmDeleteExperiment(exp: ExperimentWithMeta) {
      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message: `Are you sure you want to delete "${exp.title}"? This action cannot be undone.`,
        header: 'Delete experiment',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger'},
        rejectProps: {label: 'Cancel', severity: 'secondary'},
        accept: () => this.$emit('deleteExperiment', exp.urn)
      })
    }
  }
})
</script>
