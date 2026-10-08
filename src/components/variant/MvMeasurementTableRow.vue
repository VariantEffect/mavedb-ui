<template>
  <!-- The whole row selects on click; the title button is its keyboard and screen-reader control. A row-wide button
       would nest the Key tags' own controls inside it. -->
  <div
    class="measurement-grid relative block w-full cursor-pointer border-b border-border-light px-4 py-3 text-left @xl:grid @xl:px-5"
    :class="selected ? 'bg-sage-light/60 shadow-[inset_3px_0_0_var(--color-sage)]' : 'bg-surface hover:bg-mint-light'"
    @click="$emit('select', measurement.variantUrn)"
  >
    <div class="min-w-0">
      <div class="flex items-start gap-1.5">
        <button
          :aria-pressed="selected"
          class="measurement-row-select line-clamp-2 cursor-pointer text-left text-xs-plus font-semibold leading-[1.3] text-text-primary"
          type="button"
        >
          {{ measurement.scoreSetTitle || 'Untitled score set' }}
        </button>
        <i v-if="loading" aria-label="Loading variant details" class="pi pi-spin pi-spinner mt-0.5 text-xs text-sage" />
      </div>
      <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
        <!-- The citation Assay facts heads the score set with. The URN stands in until the score set loads, and
             stays when another row shares this title. -->
        <span v-if="citation" class="text-xs-minus text-text-muted">{{ citation }}</span>
        <span v-if="!citation || showUrn" class="font-mono text-[10px] text-text-muted">{{
          measurement.scoreSetUrn
        }}</span>
        <span v-if="showLevel" v-key-term="'assay-level'" class="mave-tag" :class="level.class">{{ level.label }}</span>
      </div>
      <p v-if="providedFacts.length > 0" class="mt-0.5 truncate text-xs-minus text-text-secondary">
        {{ providedFacts.map((fact) => fact.value).join(' · ') }}
      </p>
      <p v-else-if="factsLoading" class="mt-1.5 h-2.5 w-2/3 animate-pulse rounded-sm bg-border-light" />
      <p v-else-if="noFactsProvided" class="mt-1 text-xs-minus italic text-text-muted">No assay details provided</p>
    </div>
    <!-- Narrow tables: the strip spans the row, with the tags on one line below. Wide tables: a grid cell, with the
         tags no wider than the strip above them. -->
    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 @xl:contents">
      <div class="contents @xl:flex @xl:flex-col @xl:gap-1 @xl:self-center">
        <div v-if="measurement.score != null && (distribution || factsLoading)" class="basis-full @xl:basis-auto">
          <MvScoreStrip
            v-if="distribution"
            :calibration="calibration"
            :distribution="distribution"
            :score="measurement.score"
          />
          <!-- Holds the strip's space while the score set loads, so rows don't shift when it arrives. -->
          <span v-else class="block h-[22px] animate-pulse rounded-sm bg-border-light" />
        </div>
        <span class="flex items-center gap-1">
          <MvClassificationTag v-if="showClassificationTag" :classification="classification!" />
          <MvEvidenceTag v-if="evidenceCode" :code="evidenceCode" />
          <span
            v-else-if="!classification && call"
            v-key-term="'functional-impact'"
            class="mave-tag"
            :class="MEASUREMENT_CALLS[call].class"
            >{{ MEASUREMENT_CALLS[call].label }}</span
          >
          <span v-else-if="!classification" class="hidden text-xs-minus text-text-muted @xl:inline">—</span>
          <span v-if="displayed?.researchUseOnly" v-key-term="'calibration'" class="mave-tag mave-tag-ruo"
            >Research use only</span
          >
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvScoreStrip from '@/components/variant/MvScoreStrip.vue'
import type {ScoreCalibration} from '@/lib/calibrations'
import {
  assayLevelDisplay,
  displayedClassification,
  eligibleCalibrations,
  evidenceCode,
  MEASUREMENT_CALLS,
  type MeasurementCall,
  measurementCall
} from '@/lib/measurement-types'
import {stripCalibration, type ScoreDistribution} from '@/lib/score-strip'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type ScoreSet = components['schemas']['ScoreSet']

export interface AssayFact {
  key: string
  value: string | null
}

/**
 * One selectable measurement row in {@link MvMeasurementTable}; lays out on the table's shared grid.
 *
 * Raw scores are on each assay's own scale, so the row shows none: the score strip places the score within its own
 * score set's distribution and calibration, and the call is what compares across rows. With the strip drawn, an
 * evidence code stands in for the classification tag, since the strip's shading already shows the direction.
 */
export default defineComponent({
  name: 'MvMeasurementTableRow',

  components: {MvClassificationTag, MvEvidenceTag, MvScoreStrip},

  props: {
    measurement: {type: Object as PropType<AlleleMeasurement>, required: true},
    citation: {type: String as PropType<string | null>, default: null},
    showUrn: {type: Boolean, default: false},
    facts: {type: Array as PropType<AssayFact[]>, required: true},
    // The score set behind `facts` hasn't loaded yet, so empty facts are unknown rather than absent.
    factsLoading: {type: Boolean, default: false},
    // Null until loaded; supplies the score distribution and the calibrations the strip shades by.
    scoreSet: {type: Object as PropType<ScoreSet | null>, default: null},
    // Whether research-use-only calibrations count, as set in the page's View options.
    includeResearchUseOnly: {type: Boolean, default: false},
    selected: {type: Boolean, default: false},
    loading: {type: Boolean, default: false},
    // The level badge only distinguishes rows when their group mixes assay levels.
    showLevel: {type: Boolean, default: false}
  },

  emits: ['select'],

  setup() {
    return {MEASUREMENT_CALLS}
  },

  computed: {
    level(): {label: string; class: string} {
      return assayLevelDisplay(this.measurement.assayLevel)
    },
    // A bare "Not applicable" only restates that a fact doesn't apply, so the row omits it; qualified values
    // such as "Not applicable (trained predictor)" carry information and stay.
    providedFacts(): AssayFact[] {
      return this.facts.filter((fact) => fact.value != null && fact.value !== 'Not applicable')
    },
    noFactsProvided(): boolean {
      return this.facts.every((fact) => fact.value == null)
    },
    displayed(): ReturnType<typeof displayedClassification> {
      return displayedClassification(this.measurement)
    },
    classification(): string | null {
      return this.displayed?.classification.functionalClassification ?? null
    },
    evidenceCode(): string | null {
      return evidenceCode(this.displayed?.classification)
    },
    calibrations(): ScoreCalibration[] {
      return eligibleCalibrations(this.scoreSet?.scoreCalibrations, this.includeResearchUseOnly)
    },
    distribution(): ScoreDistribution | null {
      return this.scoreSet?.scoreDistribution ?? null
    },
    calibration(): ScoreCalibration | null {
      return stripCalibration(this.displayed?.classification.id, this.calibrations)
    },
    call(): MeasurementCall | null {
      return measurementCall(this.measurement, this.calibrations, this.scoreSet != null)
    },
    showClassificationTag(): boolean {
      return this.classification != null && !(this.evidenceCode && this.distribution && this.measurement.score != null)
    }
  }
})
</script>

<style scoped>
.measurement-row-select:focus-visible {
  outline: 2px solid var(--color-sage);
  outline-offset: 2px;
}
</style>
