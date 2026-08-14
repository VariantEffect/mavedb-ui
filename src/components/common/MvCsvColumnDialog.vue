<template>
  <PDialog
    :base-z-index="901"
    :header="header"
    modal
    :style="{width: '30rem'}"
    :visible="visible"
    @show="load()"
    @update:visible="$emit('update:visible', $event)">
    <MvLoader v-if="loading" />
    <MvErrorState
      v-else-if="error"
      description="The list of available columns could not be loaded."
      title="Could not load download options"
      @retry="load()" />
    <div v-else class="flex flex-col gap-4 py-2">
      <div class="flex items-center justify-between border-b border-border-light pb-2">
        <span class="text-sm text-text-muted">{{ selectionSummary }}</span>
        <button
          class="cursor-pointer border-none bg-transparent text-xs-plus font-semibold text-sage hover:underline"
          type="button"
          @click="toggleAll()">
          {{ allSelected ? 'Select none' : 'Select all' }}
        </button>
      </div>

      <div v-for="section in sections" :key="section.group" class="flex flex-col gap-2">
        <span class="text-xs font-bold uppercase tracking-wide text-text-muted">{{ section.title }}</span>
        <template v-for="subsection in section.subsections" :key="subsection.label ?? '_'">
          <!-- Only present when the section spans more than one score set, e.g. a variant measured in
               several assays, each with its own calibrations. -->
          <span v-if="subsection.label" class="text-xs text-text-muted" :title="subsection.urn ?? undefined">{{
            subsection.label
          }}</span>
          <label
            v-for="entry in subsection.namespaces"
            :key="entry.namespace"
            class="flex cursor-pointer items-center gap-2 text-sm"
            :class="{'pl-3': subsection.label}">
            <Checkbox v-model="selected" :value="entry.namespace" />
            {{ entry.label }}
          </label>
        </template>
      </div>

      <div v-if="formattingExtraOptions.length > 0" class="flex flex-col gap-2 border-t border-border-light pt-3">
        <span class="text-xs font-bold uppercase tracking-wide text-text-muted">Options</span>
        <label
          v-for="option in formattingExtraOptions"
          :key="option.value"
          class="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox v-model="selectedExtras" :value="option.value" />
          {{ option.label }}
        </label>
      </div>
    </div>

    <template #footer>
      <PButton label="Cancel" severity="secondary" size="small" @click="$emit('update:visible', false)" />
      <PButton
        :disabled="loading || !!error || selectedColumnGroups === 0"
        icon="pi pi-download"
        label="Download"
        size="small"
        @click="confirm" />
    </template>
  </PDialog>
</template>

<script lang="ts">
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import PDialog from 'primevue/dialog'
import {computed, defineComponent, type PropType} from 'vue'

import MvErrorState from '@/components/common/MvErrorState.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import {useCsvNamespaces, type CsvExtraOption} from '@/composables/use-csv-namespaces'

/**
 * Column picker for the CSV exports, shared by the score set and variant pages.
 *
 * Namespace checkboxes come from the API, so neither page maintains its own list or labels. Non-namespace
 * query flags are passed in as `extraOptions` and returned separately as `extras`.
 *
 * Download stays disabled until a namespace is checked, so the emitted selection always names its
 * columns — there is no "empty means all" rule for callers to know.
 */
export default defineComponent({
  name: 'MvCsvColumnDialog',

  components: {Checkbox, MvErrorState, MvLoader, PButton: Button, PDialog},

  props: {
    visible: {type: Boolean, required: true},
    /** The score set or variant whose columns to offer. */
    urn: {type: String as PropType<string | null>, default: null},
    kind: {type: String as PropType<'scoreSet' | 'variant'>, required: true},
    header: {type: String, default: 'Choose columns'},
    /** Formatting flags, e.g. omitting unused HGVS columns. Returned as `extras` on confirm. */
    extraOptions: {type: Array as PropType<CsvExtraOption[]>, default: () => []}
  },

  emits: ['update:visible', 'confirm'],

  setup(props) {
    // The whole selection model lives in the composable, where it is unit-testable without a DOM —
    // including the extras, so the count and "Select all" cover every checkbox on screen. Spread so the
    // template reads the refs directly rather than reaching through a wrapper object.
    return {
      ...useCsvNamespaces({
        urn: computed(() => props.urn),
        kind: props.kind,
        extraOptions: computed(() => props.extraOptions)
      })
    }
  },

  methods: {
    confirm() {
      this.$emit('confirm', {
        namespaces: [...this.selected],
        extras: [...this.selectedExtras]
      })
      this.$emit('update:visible', false)
    }
  }
})
</script>
