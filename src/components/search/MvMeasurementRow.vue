<template>
  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-gray-50 py-1.5 text-sm last:border-b-0">
    <span
      class="inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
      :class="levelClass"
      >{{ levelLabel }}</span
    >
    <span class="font-mono text-xs-plus font-semibold text-gray-700">{{ hgvs }}</span>
    <span v-if="measurement.score != null" class="text-xs-minus text-gray-500"
      >score <strong class="font-mono text-gray-700">{{ measurement.score.toPrecision(4) }}</strong></span
    >
    <MvClassificationTag v-if="classification" :classification="classification" />
    <router-link
      v-if="showScoreSet"
      class="ml-auto max-w-[45%] truncate text-xs-minus text-link hover:underline"
      :title="measurement.scoreSetTitle"
      :to="{name: 'scoreSet', params: {urn: measurement.scoreSetUrn}}"
      >{{ measurement.scoreSetTitle }}</router-link
    >
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import {assayLevelDisplay} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

/** One compact line for a single measurement: level badge, the specific change (HGVS), its score and
 * functional call, and (unless nested under a score-set heading) a link to the score set that produced it. */
export default defineComponent({
  name: 'MvMeasurementRow',
  components: {MvClassificationTag},
  props: {
    measurement: {type: Object as PropType<AlleleMeasurement>, required: true},
    // Hide the score-set link when the row is already nested under its score set's heading.
    showScoreSet: {type: Boolean, default: true}
  },
  computed: {
    hgvs(): string {
      return this.measurement.assayLevelHgvs || this.measurement.submittedHgvs || '—'
    },
    levelLabel(): string {
      return assayLevelDisplay(this.measurement.assayLevel).label
    },
    levelClass(): string {
      return assayLevelDisplay(this.measurement.assayLevel).class
    },
    classification(): string | null {
      return this.measurement.preferredClassification?.functionalClassification ?? null
    }
  }
})
</script>
