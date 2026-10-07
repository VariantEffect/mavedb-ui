<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-light py-2">
    <span v-if="showLevel" v-key-term="'assay-level'" class="mave-tag" :class="level.class">{{ level.label }}</span>
    <router-link
      class="min-w-0 flex-1 truncate text-xs-plus text-link hover:underline"
      :title="measurement.scoreSetTitle"
      :to="{name: 'scoreSet', params: {urn: measurement.scoreSetUrn}}"
      >{{ measurement.scoreSetTitle }}</router-link
    >
    <span class="flex shrink-0 flex-wrap items-center gap-1.5">
      <MvClassificationTag v-if="classification" :classification="classification" />
      <MvEvidenceTag v-if="evidenceCode" :code="evidenceCode" />
      <span v-if="displayed?.researchUseOnly" v-key-term="'calibration'" class="mave-tag mave-tag-ruo"
        >Research use only</span
      >
      <span class="w-16 text-right font-mono text-xs-minus text-text-muted">{{
        measurement.score != null ? formatScore(measurement.score) : '—'
      }}</span>
    </span>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import {assayLevelDisplay, displayedClassification, evidenceCode} from '@/lib/measurement-types'
import {formatScore} from '@/lib/scores'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

/**
 * One compact search-result line for a measurement: its score set, functional call and evidence, and score. The
 * group header above names the measured variant, so the row doesn't repeat it.
 */
export default defineComponent({
  name: 'MvMeasurementRow',
  components: {MvClassificationTag, MvEvidenceTag},
  props: {
    measurement: {type: Object as PropType<AlleleMeasurement>, required: true},
    // The level tag only distinguishes rows when their group mixes assay levels.
    showLevel: {type: Boolean, default: false}
  },
  computed: {
    level(): {label: string; class: string} {
      return assayLevelDisplay(this.measurement.assayLevel)
    },
    displayed(): ReturnType<typeof displayedClassification> {
      return displayedClassification(this.measurement)
    },
    classification(): string | null {
      return this.displayed?.classification.functionalClassification ?? null
    },
    evidenceCode(): string | null {
      return evidenceCode(this.displayed?.classification)
    }
  },
  methods: {formatScore}
})
</script>
