<template>
  <!-- Phones: title, then a full-width strip, then tags, each on its own line. Wider: one line. -->
  <div class="border-b border-border-light py-2 sm:flex sm:items-center sm:gap-x-3">
    <div class="flex min-w-0 items-center gap-1.5 sm:flex-1">
      <span v-if="showLevel" v-key-term="'assay-level'" class="mave-tag" :class="level.class">{{ level.label }}</span>
      <router-link
        class="line-clamp-2 min-w-0 text-xs-plus text-link hover:underline sm:line-clamp-1"
        :title="measurement.scoreSetTitle"
        :to="{name: 'scoreSet', params: {urn: measurement.scoreSetUrn}, query: {variant: measurement.variantUrn}}"
        >{{ measurement.scoreSetTitle }}</router-link
      >
    </div>
    <div class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:shrink-0 sm:flex-nowrap">
      <MvClassificationTag v-if="showClassificationTag" :classification="classification!" />
      <MvEvidenceTag v-if="evidenceCode" :code="evidenceCode" />
      <span
        v-if="displayed?.researchUseOnly"
        v-key-term="'calibration'"
        aria-label="Research use only"
        class="mave-tag mave-tag-ruo"
        title="Research use only — opens the Key"
        >RUO</span
      >
      <span class="order-first basis-full sm:order-none sm:w-32 sm:basis-auto">
        <MvScoreStrip
          v-if="measurement.score != null && distribution"
          :calibration="calibration"
          :distribution="distribution"
          :score="measurement.score"
        />
        <!-- Holds the strip's space while the score set loads, so rows don't shift when it arrives. -->
        <span
          v-else-if="measurement.score != null && !scoreSet"
          class="block h-[22px] animate-pulse rounded-sm bg-border-light"
        />
        <span v-else class="block text-right text-xs-minus text-text-muted">—</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvScoreStrip from '@/components/variant/MvScoreStrip.vue'
import {useEntityCache} from '@/composables/entity-cache'
import type {ScoreCalibration} from '@/lib/calibrations'
import {assayLevelDisplay, displayedClassification, eligibleCalibrations, evidenceCode} from '@/lib/measurement-types'
import {stripCalibration, type ScoreDistribution} from '@/lib/score-strip'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type ScoreSet = components['schemas']['ScoreSet']

/**
 * One compact search-result line for a measurement: its score set, functional call and evidence, and a score strip
 * placing the score within its score set's distribution. Raw scores are on each assay's own scale, so the row shows
 * none. The group header above names the measured variant, so the row doesn't repeat it.
 */
export default defineComponent({
  name: 'MvMeasurementRow',
  components: {MvClassificationTag, MvEvidenceTag, MvScoreStrip},
  props: {
    measurement: {type: Object as PropType<AlleleMeasurement>, required: true},
    // The level tag only distinguishes rows when their group mixes assay levels.
    showLevel: {type: Boolean, default: false}
  },
  setup() {
    const {getEntity, cache} = useEntityCache()
    return {getEntity, cache}
  },
  computed: {
    // Read from the shared cache, which the MaveMD score set list has usually filled already.
    scoreSet(): ScoreSet | null {
      return (this.cache[this.measurement.scoreSetUrn]?.data as ScoreSet | null | undefined) ?? null
    },
    distribution(): ScoreDistribution | null {
      return this.scoreSet?.scoreDistribution ?? null
    },
    // Research-use-only calibrations count here, since the row's displayed classification may come from one.
    calibration(): ScoreCalibration | null {
      return stripCalibration(
        this.displayed?.classification.id,
        eligibleCalibrations(this.scoreSet?.scoreCalibrations, true)
      )
    },
    // With the strip drawn, its shading shows the direction, so the evidence code alone suffices.
    showClassificationTag(): boolean {
      return this.classification != null && !(this.evidenceCode && this.distribution && this.measurement.score != null)
    },
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
  watch: {
    'measurement.scoreSetUrn': {
      handler(urn: string) {
        // A failed load leaves the row without a strip; the score set link still works.
        this.getEntity('scoreSet', urn).catch(() => {})
      },
      immediate: true
    }
  }
})
</script>
