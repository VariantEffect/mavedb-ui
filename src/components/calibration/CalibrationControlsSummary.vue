<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
    <span
      v-tooltip.top="{
        value:
          'Variants with a known clinical classification that the author used as ground truth when setting this calibration’s thresholds. Each is placed in the range its score falls in, above.',
        autoHide: false
      }"
      class="cursor-help border-b border-dashed border-border text-xs font-bold uppercase tracking-wide text-text-muted"
      >Calibration controls</span
    >
    <span class="text-text-secondary">
      <span class="font-bold text-text-primary">{{ total }}</span> {{ total === 1 ? 'control' : 'controls' }}
    </span>
    <span class="h-[14px] w-px bg-border"></span>
    <span
      ><span class="font-semibold text-text-primary">{{ placements.pathogenicTotal }}</span> pathogenic</span
    >
    <span class="text-border-light">&middot;</span>
    <span
      ><span class="font-semibold text-text-primary">{{ placements.benignTotal }}</span> benign</span
    >

    <!-- Concordance, once controls have actually landed somewhere. -->
    <template v-if="placements.placedTotal > 0">
      <span class="h-[14px] w-px bg-border"></span>
      <span class="font-semibold text-sage-dark">{{ placements.concordant }} concordant</span>
      <span class="text-border-light">&middot;</span>
      <span :class="placements.discordant ? 'font-semibold text-orange-cta-dark' : ''"
        >{{ placements.discordant }} discordant</span
      >
      <template v-for="leftover in leftovers" :key="leftover">
        <span class="text-border-light">&middot;</span>
        <span>{{ leftover }}</span>
      </template>
    </template>

    <!-- Otherwise say why nothing was placed, rather than leaving the rows silently absent. -->
    <template v-else-if="explanation">
      <span class="h-[14px] w-px bg-border"></span>
      <span class="italic text-text-muted/60">{{ explanation }}</span>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue'

import type {ControlPlacements} from '@/lib/calibrations'

export default defineComponent({
  name: 'CalibrationControlsSummary',

  props: {
    placements: {
      type: Object as PropType<ControlPlacements>,
      required: true
    },
    /** How many ranges the calibration defines; distinguishes "no ranges" from "landed in no range". */
    rangeCount: {
      type: Number,
      required: true
    }
  },

  computed: {
    /** Controls restricted to the two ACMG poles, so the two totals account for every control. */
    total(): number {
      return this.placements.pathogenicTotal + this.placements.benignTotal
    },

    /** Placed controls that concordance can't speak to, plus those never placed at all. */
    leftovers(): string[] {
      const {unclassified, unplaced} = this.placements
      const parts: string[] = []
      if (unclassified > 0) parts.push(`${unclassified} in an unclassified range`)
      if (unplaced > 0) parts.push(`${unplaced} in no range`)
      return parts
    },

    /** Why no control landed in a range, when the calibration actually defines some. */
    explanation(): string | null {
      if (this.rangeCount === 0) return null // The card already says the calibration defines no ranges.
      return 'This calibration files none of its controls under a range.'
    }
  }
})
</script>
