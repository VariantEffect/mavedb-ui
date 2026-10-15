<template>
  <!-- Horizontal positions are percentages so the strip fills whatever width its container gives it. -->
  <svg :aria-label="accessibleName" class="block w-full overflow-visible" :height="HEIGHT" role="img">
    <rect
      v-for="(range, index) in layout.ranges"
      :key="`range-${index}`"
      :fill="toneColor(range.tone)"
      fill-opacity="0.12"
      :height="HEIGHT"
      :width="pct(range.x1 - range.x0)"
      :x="pct(range.x0)"
      y="0"
    />
    <rect
      v-for="(bar, index) in visibleBars"
      :key="`bar-${index}`"
      :fill="toneColor(bar.tone)"
      :fill-opacity="bar.tone === 'neutral' ? 0.7 : 0.55"
      :height="barHeight(bar.height)"
      :width="pct((bar.x1 - bar.x0) * BAR_FILL)"
      :x="pct(bar.x0 + ((bar.x1 - bar.x0) * (1 - BAR_FILL)) / 2)"
      :y="BASELINE - barHeight(bar.height)"
    />
    <line class="stroke-border" stroke-width="1" x1="0" x2="100%" :y1="BASELINE + 0.5" :y2="BASELINE + 0.5" />
    <g v-if="layout.marker">
      <line
        class="stroke-text-primary"
        stroke-width="1.5"
        :x1="pct(layout.marker.x)"
        :x2="pct(layout.marker.x)"
        y1="4"
        :y2="HEIGHT"
      />
      <circle class="stroke-surface" :cx="pct(layout.marker.x)" cy="3.5" :fill="markerColor" r="3" stroke-width="1" />
      <!-- A chevron outside the edge says the score lies past the plotted range. -->
      <svg v-if="layout.marker.clamped" class="overflow-visible" :x="layout.marker.clamped === 'low' ? 0 : '100%'">
        <path
          class="fill-text-primary"
          :d="
            layout.marker.clamped === 'low' ? `M -3 ${BASELINE - 9} v 6 l -3 -3 z` : `M 3 ${BASELINE - 9} v 6 l 3 -3 z`
          "
        />
      </svg>
    </g>
  </svg>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import type {ScoreCalibration} from '@/lib/calibrations'
import {FUNCTIONAL_CLASSIFICATIONS} from '@/lib/functional-impact'
import {layoutScoreStrip, type ScoreDistribution, type ScoreStripLayout, type StripTone} from '@/lib/score-strip'
import {formatScore} from '@/lib/scores'

const HEIGHT = 22
const BASELINE = 20
/** Share of each bin's width a bar fills; the rest separates neighboring bars. */
const BAR_FILL = 0.8

/**
 * A small histogram of a score set's scores, shaded by one calibration's ranges, with a marker at a variant's
 * score. It shows where the score sits relative to the thresholds; the row's text states the call. Fills the
 * width of its container.
 */
export default defineComponent({
  name: 'MvScoreStrip',

  props: {
    distribution: {type: Object as PropType<ScoreDistribution>, required: true},
    calibration: {type: Object as PropType<ScoreCalibration | null>, default: null},
    score: {type: Number as PropType<number | null>, default: null}
  },

  setup() {
    return {HEIGHT, BASELINE, BAR_FILL}
  },

  computed: {
    layout(): ScoreStripLayout {
      return layoutScoreStrip(this.distribution, this.calibration, this.score)
    },
    // Empty bins draw nothing; skipping them keeps the DOM small.
    visibleBars(): ScoreStripLayout['bars'] {
      return this.layout.bars.filter((bar) => bar.height > 0)
    },
    markerColor(): string {
      return this.layout.marker ? this.toneColor(this.layout.marker.tone, 'var(--color-text-primary)') : ''
    },
    accessibleName(): string {
      const score = this.score != null ? `Score ${formatScore(this.score)}` : 'No score'
      const tone = this.layout.marker?.tone
      const placement = !this.calibration
        ? 'not calibrated'
        : tone && tone !== 'neutral'
          ? `in the ${FUNCTIONAL_CLASSIFICATIONS[tone].label.toLowerCase()} range of ${this.calibration.title}`
          : `outside the abnormal and normal ranges of ${this.calibration.title}`
      const spread = `Score set scores span ${formatScore(this.distribution.min)} to ${formatScore(this.distribution.max)}.`
      return `${score}, ${placement}. ${spread}`
    }
  },

  methods: {
    pct(fraction: number): string {
      return `${fraction * 100}%`
    },
    // Non-empty bins keep at least a sliver so a lone outlier stays visible beside a tall peak.
    barHeight(fraction: number): number {
      return Math.max(fraction * (BASELINE - 6), 1)
    },
    toneColor(tone: StripTone, neutral = 'var(--color-sage)'): string {
      return tone === 'neutral' ? neutral : FUNCTIONAL_CLASSIFICATIONS[tone].rangeColor
    }
  }
})
</script>
