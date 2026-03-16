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
      <!-- When the API endpoint lands, calibration table rows will render here -->
      <div class="px-4 py-8 text-center text-sm text-text-muted">
        Calibration listing coming soon
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
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvErrorState from '@/components/common/MvErrorState.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import {components} from '@/schema/openapi'

type ScoreCalibration = components['schemas']['ScoreCalibration']

export default defineComponent({
  name: 'MvDashboardCalibrations',

  components: {FloatLabel, InputText, PButton, MvFilterChips, MvEmptyState, MvErrorState, MvLoader},

  props: {
    filteredCalibrations: {type: Array as PropType<ScoreCalibration[]>, required: true},
    loading: {type: Object as PropType<{calibrations: boolean}>, required: true},
    error: {type: Object as PropType<{calibrations: boolean}>, required: true},
    calibrationFilter: {type: Array as PropType<string[]>, required: true},
    calibrationSearch: {type: String, required: true},
    hasData: {type: Boolean, required: true}
  },

  emits: ['update:calibrationFilter', 'update:calibrationSearch', 'createCalibration', 'retry'],

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
  }
})
</script>
