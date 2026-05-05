<template>
  <div
    class="measurement-card relative flex tablet:min-w-[360px] tablet:flex-[1_0_360px] cursor-pointer flex-col rounded-lg border-2 border-border bg-surface px-3.5 tablet:px-[18px] py-4 transition-[border-color,box-shadow] duration-150 hover:border-mint"
    :class="active ? 'border-sage shadow-[0_0_0_1px_var(--color-sage)]' : ''"
    @click="$emit('select')"
  >
    <span
      class="mb-2.5 inline-block self-start rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
      :class="levelClass"
    >
      {{ levelLabel }}
    </span>
    <div class="mb-2 text-xs-plus font-semibold leading-[1.3] text-text-primary">{{ studyTitle }}</div>
    <div class="flex flex-col gap-[3px] text-xs-minus text-text-muted">
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Assay type</span>
        <span class="text-text-secondary">{{ assayType || 'Not specified' }}</span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Mechanism</span>
        <span class="text-text-secondary">{{ mechanism || 'Not specified' }}</span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Model system</span>
        <span class="text-text-secondary">{{ modelSystem || 'Not specified' }}</span>
      </div>
    </div>
    <div class="mt-auto border-t border-border-light pt-3">
      <div v-if="abnormalOddsPath || normalOddsPath" class="mb-2 flex items-center gap-2.5 text-xs-minus text-text-muted">
        <span class="text-[10px] font-bold uppercase tracking-[0.3px] text-[#aaa]">Assay OddsPath</span>
        <div>
          <span class="text-[#666] text-xs-minus">
            Abnormal: <strong class="font-mono font-bold text-text-secondary">{{ abnormalOddsPath ?? '\u2014' }}</strong>
          </span>
          <span class="text-[#666] text-xs-minus">
            Normal: <strong class="font-mono font-bold text-text-secondary">{{ normalOddsPath ?? '\u2014' }}</strong>
          </span>
        </div>
      </div>
      <div v-if="classification || evidenceCode" class="mt-1.5">
        <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.3px] text-[#aaa]">Classified as</span>
        <div class="flex items-center gap-1.5">
          <MvClassificationTag v-if="classification" :classification="classification" />
          <MvEvidenceTag v-if="evidenceCode" :code="evidenceCode" />
        </div>
      </div>
      <div v-if="!abnormalOddsPath && !normalOddsPath && !classification" class="flex items-center gap-1.5">
        <span class="text-xs italic text-text-muted">No calibration data</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import {MEASUREMENT_TYPE_CLASSES, MEASUREMENT_TYPE_LABELS, type MeasurementType} from '@/lib/measurement-types'

export default defineComponent({
  name: 'MvMeasurementCard',

  components: {
    MvClassificationTag,
    MvEvidenceTag
  },

  props: {
    active: {type: Boolean, default: false},
    type: {type: String as PropType<MeasurementType>, required: true},
    studyTitle: {type: String, default: ''},
    assayType: {type: [String, null] as PropType<string | null>, default: null},
    mechanism: {type: [String, null] as PropType<string | null>, default: null},
    modelSystem: {type: [String, null] as PropType<string | null>, default: null},
    abnormalOddsPath: {type: [String, null] as PropType<string | null>, default: null},
    normalOddsPath: {type: [String, null] as PropType<string | null>, default: null},
    classification: {type: [String, null] as PropType<string | null>, default: null},
    evidenceCode: {type: [String, null] as PropType<string | null>, default: null}
  },

  emits: ['select'],

  computed: {
    levelLabel(): string {
      return MEASUREMENT_TYPE_LABELS[this.type]?.full ?? this.type
    },
    levelClass(): string {
      return MEASUREMENT_TYPE_CLASSES[this.type] ?? ''
    },
  }
})
</script>

<style scoped>
/* Conditional pseudo-element — only shown when card is active */
.measurement-card.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-sage);
  border-radius: 6px 6px 0 0;
}

/* Pseudo-element to append colon to fact labels */
.fact-label::after {
  content: ':';
}
</style>
