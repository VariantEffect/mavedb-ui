<template>
  <!-- The whole row selects on click; the title button is its keyboard and screen-reader control. A row-wide button
       would nest the Key tags' own controls inside it. -->
  <div
    class="measurement-grid relative block w-full cursor-pointer border-b border-border-light px-4 py-3 text-left tablet:grid tablet:px-5"
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
    <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 tablet:contents">
      <span class="flex flex-wrap items-center gap-1 self-center">
        <MvClassificationTag v-if="classification" :classification="classification" />
        <span v-else class="hidden text-xs-minus text-text-muted tablet:inline">—</span>
        <span v-if="displayed?.researchUseOnly" v-key-term="'calibration'" class="mave-tag mave-tag-ruo"
          >Research use only</span
        >
      </span>
      <span class="self-center">
        <MvEvidenceTag v-if="evidenceCode" :code="evidenceCode" />
        <span v-else class="text-xs-minus text-text-muted tablet:inline hidden">—</span>
      </span>
      <span class="self-center font-mono text-xs-minus text-text-muted tablet:text-right">
        <span class="tablet:hidden">score </span>{{ measurement.score != null ? formatScore(measurement.score) : '—' }}
      </span>
    </div>
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

export interface AssayFact {
  key: string
  value: string | null
}

/**
 * One selectable measurement row in {@link MvMeasurementTable}; lays out on the table's shared grid.
 *
 * The score is deliberately muted: it is the raw measurement, but scales differ between assays, so the
 * classification is what compares across rows.
 */
export default defineComponent({
  name: 'MvMeasurementTableRow',

  components: {MvClassificationTag, MvEvidenceTag},

  props: {
    measurement: {type: Object as PropType<AlleleMeasurement>, required: true},
    citation: {type: String as PropType<string | null>, default: null},
    showUrn: {type: Boolean, default: false},
    facts: {type: Array as PropType<AssayFact[]>, required: true},
    // The score set behind `facts` hasn't loaded yet, so empty facts are unknown rather than absent.
    factsLoading: {type: Boolean, default: false},
    selected: {type: Boolean, default: false},
    loading: {type: Boolean, default: false},
    // The level badge only distinguishes rows when their group mixes assay levels.
    showLevel: {type: Boolean, default: false}
  },

  emits: ['select'],

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
    }
  },

  methods: {formatScore}
})
</script>

<style scoped>
.measurement-row-select:focus-visible {
  outline: 2px solid var(--color-sage);
  outline-offset: 2px;
}
</style>
