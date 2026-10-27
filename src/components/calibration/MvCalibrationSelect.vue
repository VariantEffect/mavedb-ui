<template>
  <PSelect
    aria-label="Calibration"
    class="min-w-0"
    :model-value="modelValue"
    option-label="title"
    option-value="urn"
    :options="options"
    size="small"
    @update:model-value="$emit('update:modelValue', $event ?? null)"
  >
    <template #value>
      <span class="flex min-w-0 items-center gap-1.5 text-xs">
        <span class="truncate">{{ selected ? optionTitle(selected) : 'None' }}</span>
        <span v-if="selected && versionNumbers[selected.urn]" class="shrink-0 whitespace-nowrap text-text-muted"
          >v{{ versionNumbers[selected.urn] }}</span
        >
        <span v-if="selected?.primary" class="mave-tag mave-tag-primary shrink-0">Primary</span>
        <span v-if="selected?.private" class="mave-tag mave-tag-draft shrink-0">Draft</span>
        <span v-if="selected?.hasPublishedReplacement" class="mave-tag mave-tag-superseded shrink-0">Superseded</span>
        <span v-if="selected?.researchUseOnly" class="mave-tag mave-tag-ruo shrink-0">Research use only</span>
      </span>
    </template>
    <template #option="{option}">
      <!-- A thread's other versions sit under its head, as on the calibrations page. -->
      <span
        class="flex items-center gap-1.5 text-xs"
        :class="{'ml-1 border-l-2 border-border pl-2.5': isThreadedVersion(option.urn)}"
      >
        <span>{{ option.urn ? optionTitle(option) : 'None' }}</span>
        <span v-if="option.urn && versionNumbers[option.urn]" class="whitespace-nowrap text-text-muted"
          >v{{ versionNumbers[option.urn] }}</span
        >
        <span v-if="option.primary" class="mave-tag mave-tag-primary">Primary</span>
        <span v-if="option.private" class="mave-tag mave-tag-draft">Draft</span>
        <span v-if="option.hasPublishedReplacement" class="mave-tag mave-tag-superseded">Superseded</span>
        <span v-if="option.researchUseOnly" class="mave-tag mave-tag-ruo">Research use only</span>
      </span>
    </template>
  </PSelect>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import PSelect from 'primevue/select'

import {
  calibrationVersionNumbers,
  groupCalibrationVersions,
  isClassBasedCalibration,
  orderCalibrationOptions,
  type CalibrationThread,
  type ScoreCalibration
} from '@/lib/calibrations'

/**
 * The calibration picker used wherever a calibration drives what's shown. `v-model` is the selected calibration's
 * URN, or null for "None" (no calibration applied), which is always offered.
 */
export default defineComponent({
  name: 'MvCalibrationSelect',

  components: {PSelect},

  props: {
    calibrations: {type: Array as PropType<ScoreCalibration[]>, default: () => []},
    modelValue: {type: String as PropType<string | null>, default: null},
    /** Suffix class-based calibrations with "*", for surfaces that footnote that they can't render as thresholds. */
    markClassBased: {type: Boolean, default: false}
  },

  emits: ['update:modelValue'],

  computed: {
    options(): Array<Partial<Omit<ScoreCalibration, 'urn'>> & {urn: string | null}> {
      return [{urn: null, title: 'None'}, ...orderCalibrationOptions(this.calibrations)]
    },
    selected(): ScoreCalibration | null {
      return this.calibrations.find((c) => c.urn === this.modelValue) ?? null
    },
    threads(): CalibrationThread[] {
      return groupCalibrationVersions(this.calibrations)
    },
    versionNumbers(): Record<string, number> {
      return calibrationVersionNumbers(this.threads)
    }
  },

  methods: {
    /** Whether the calibration `urn` is listed under the head of its version thread. */
    isThreadedVersion(urn: string | null): boolean {
      return !!urn && !!this.versionNumbers[urn] && !this.threads.some((thread) => thread.head.urn === urn)
    },

    optionTitle(calibration: Partial<Omit<ScoreCalibration, 'urn'>>): string {
      return this.markClassBased && isClassBasedCalibration(calibration)
        ? `${calibration.title}*`
        : (calibration.title ?? '')
    }
  }
})
</script>
