<template>
  <div>
    <div class="mb-4 space-y-2.5">
      <MvFilterChips :filters="filters" :model-value="calibrationFilter" @update:model-value="$emit('update:calibrationFilter', $event)" />
      <FloatLabel variant="on">
        <InputText
          id="calibration-search"
          :model-value="calibrationSearch"
          style="width: 100%"
          type="text"
          @update:model-value="$emit('update:calibrationSearch', $event)"
        />
        <label for="calibration-search">Search calibrations</label>
      </FloatLabel>
    </div>

    <MvLoader v-if="loading.calibrations" text="Loading calibrations…" />

    <MvErrorState
      v-else-if="error.calibrations"
      description="We couldn't load your calibrations. Check your connection and try again."
      title="Failed to load calibrations"
      @retry="$emit('retry')"
    />

    <MvEmptyState
      v-else-if="!hasData"
      action-label="+ Create your first calibration"
      description="Score calibrations define functional classification ranges for clinical variant interpretation."
      title="No calibrations yet"
      @action="$emit('createCalibration')"
    />

    <MvEmptyState
      v-else-if="filteredCalibrations.length === 0"
      description="No calibrations match your current filters. Try adjusting or clearing your filters."
      title="No matching calibrations"
    >
      <PButton class="mt-2" label="Clear filters" severity="warn" size="small" @click="$emit('update:calibrationFilter', ['all']); $emit('update:calibrationSearch', '')" />
    </MvEmptyState>

    <div v-else class="overflow-hidden rounded-lg border border-border bg-white">
      <!-- Desktop table (md+) -->
      <table class="hidden w-full table-fixed border-collapse text-sm tablet:table">
        <thead>
          <tr class="border-b border-border bg-bg">
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted" style="width: 46%">Calibration</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
            <th class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Score Set</th>
            <th class="w-20 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cal in filteredCalibrations"
            :key="cal.urn"
            class="group border-b border-border-light transition-colors last:border-b-0 hover:bg-bg"
          >
            <td class="px-4 py-2.5 [overflow-wrap:anywhere]">
              <router-link
                class="line-clamp-1 text-sm font-semibold leading-snug text-sage hover:underline"
                :to="{name: 'scoreSetCalibrations', params: {urn: cal.scoreSetUrn}}"
              >
                {{ cal.title }}
              </router-link>
              <div class="mt-0.5 flex flex-wrap gap-1">
                <MvBadge v-if="cal.primary" value="primary" />
                <MvBadge v-if="cal.researchUseOnly" value="research" />
              </div>
            </td>
            <td class="px-4 py-2.5">
              <MvBadge :value="cal.private ? 'unpublished' : 'published'" />
            </td>
            <td class="px-4 py-2.5 text-sm text-text-muted">
              <router-link class="text-link hover:underline" :to="{name: 'scoreSet', params: {urn: cal.scoreSetUrn}}">
                {{ cal.scoreSetUrn }}
              </router-link>
            </td>
            <td class="px-4 py-2.5 text-right">
              <MvRowActionMenu :actions="getCalibrationActions(cal)" />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile card list (<md) -->
      <div class="divide-y divide-border-light tablet:hidden">
        <div v-for="cal in filteredCalibrations" :key="cal.urn" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <router-link
              class="line-clamp-2 text-sm font-semibold leading-snug text-sage hover:underline [overflow-wrap:anywhere]"
              :to="{name: 'scoreSetCalibrations', params: {urn: cal.scoreSetUrn}}"
            >
              {{ cal.title }}
            </router-link>
            <MvRowActionMenu :actions="getCalibrationActions(cal)" />
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <MvBadge :value="cal.private ? 'unpublished' : 'published'" />
            <MvBadge v-if="cal.primary" value="primary" />
            <MvBadge v-if="cal.researchUseOnly" value="research" />
          </div>
          <div class="mt-1 text-xs text-text-muted">
            <router-link class="text-link" :to="{name: 'scoreSet', params: {urn: cal.scoreSetUrn}}">
              {{ cal.scoreSetUrn }}
            </router-link>
          </div>
        </div>
      </div>

      <div class="flex justify-end border-t border-border bg-bg px-4 py-3">
        <PButton label="+ Add Calibration" severity="warn" size="small" @click="$emit('createCalibration')" />
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
import {components} from '@/schema/openapi'

type ScoreCalibration = components['schemas']['ScoreCalibrationWithScoreSetUrn']

export default defineComponent({
  name: 'MvDashboardCalibrations',

  components: {FloatLabel, InputText, PButton, MvFilterChips, MvBadge, MvEmptyState, MvErrorState, MvLoader, MvRowActionMenu},

  props: {
    filteredCalibrations: {type: Array as PropType<ScoreCalibration[]>, required: true},
    loading: {type: Object as PropType<{calibrations: boolean}>, required: true},
    error: {type: Object as PropType<{calibrations: boolean}>, required: true},
    calibrationFilter: {type: Array as PropType<string[]>, required: true},
    calibrationSearch: {type: String, required: true},
    hasData: {type: Boolean, required: true}
  },

  emits: ['update:calibrationFilter', 'update:calibrationSearch', 'createCalibration', 'editCalibration', 'deleteCalibration', 'retry'],

  computed: {
    filters() {
      return [
        {value: 'all', label: 'All', group: 'default'},
        {value: 'published', label: 'Published', group: 'status'},
        {value: 'unpublished', label: 'Unpublished', group: 'status'},
        {value: 'primary', label: 'Primary', group: 'use'},
        {value: 'general', label: 'General Use', group: 'use'},
        {value: 'research', label: 'Research Use', group: 'use'}
      ]
    }
  },

  methods: {
    getCalibrationActions(cal: ScoreCalibration): RowAction[] {
      const actions: RowAction[] = [
        {
          label: 'View',
          description: 'Open calibration details',
          to: {name: 'scoreSetCalibrations', params: {urn: cal.scoreSetUrn}}
        }
      ]
      if (cal.private) {
        actions.push(
          {label: 'Edit', description: 'Edit calibration', handler: () => this.$emit('editCalibration', cal.urn)},
          {separator: true},
          {
            label: 'Delete',
            description: 'Permanently delete this calibration',
            danger: true,
            handler: () => this.confirmDeleteCalibration(cal)
          }
        )
      }
      return actions
    },
    confirmDeleteCalibration(cal: ScoreCalibration) {
      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message: `Are you sure you want to delete "${cal.title}"? This action cannot be undone.`,
        header: 'Delete calibration',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger'},
        rejectProps: {label: 'Cancel', severity: 'secondary'},
        accept: () => this.$emit('deleteCalibration', cal.urn)
      })
    }
  }
})
</script>
