<template>
  <!-- The panel's border closes the table, so the last row drops its own rule. -->
  <div class="@container [&>section:last-child>*:last-child]:border-b-0">
    <div
      v-if="callSummary"
      class="flex flex-wrap items-center gap-1 border-b border-border-light px-4 py-2 @xl:gap-1.5 @xl:px-5"
    >
      <span class="mr-1 basis-full text-xs-minus text-text-secondary @md:basis-auto"
        >Calls across
        {{ callSummary.total === 1 ? 'this measurement' : `these ${callSummary.total} measurements` }}</span
      >
      <span
        v-for="entry in callSummary.counts"
        :key="entry.call"
        v-key-term="'functional-impact'"
        class="mave-tag"
        :class="MEASUREMENT_CALLS[entry.call].class"
        >{{ entry.count }} {{ MEASUREMENT_CALLS[entry.call].label }}</span
      >
      <span v-if="callSummary.researchUseOnlyCount > 0" v-key-term="'calibration'" class="mave-tag mave-tag-ruo"
        >{{ callSummary.researchUseOnlyCount }} Research use only</span
      >
    </div>
    <!-- Column headers for wide tables. Narrow tables stack each row, so the headers would label nothing. -->
    <div class="measurement-grid mave-label hidden @xl:grid border-b border-border-light px-5 py-2">
      <span>Score set</span>
      <span><span v-key-term="'functional-impact'">Impact</span> · <span v-key-term="'acmg'">Evidence</span></span>
    </div>
    <section v-for="group in groups" :key="group.relationship">
      <MvMeasurementGroupHeader :anchor-is-protein="anchorIsProtein" class="px-4 @xl:px-5" :group="group" />
      <MvMeasurementTableRow
        v-for="m in preview(group).visible"
        :key="m.variantUrn"
        :citation="getCitation(m.scoreSetUrn)"
        :facts="assayFacts(m)"
        :facts-loading="getScoreSet(m.scoreSetUrn) == null"
        :include-research-use-only="includeResearchUseOnly"
        :loading="m.variantUrn === selectedUrn && loading"
        :measurement="m"
        :score-set="getScoreSet(m.scoreSetUrn)"
        :selected="m.variantUrn === selectedUrn"
        :show-level="hasMixedLevels(group)"
        :show-urn="duplicateTitles.has(m.scoreSetTitle)"
        @select="$emit('select', $event)"
      />
      <button
        v-if="preview(group).hiddenCount > 0"
        class="block w-full cursor-pointer border-b border-border-light bg-surface px-4 py-2 text-left text-xs font-semibold text-link hover:underline @xl:px-5"
        type="button"
        @click="expandedGroups = [...expandedGroups, group.relationship]"
      >
        Show {{ preview(group).hiddenCount }} more
      </button>
    </section>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvMeasurementGroupHeader from '@/components/variant/MvMeasurementGroupHeader.vue'
import MvMeasurementTableRow, {type AssayFact} from '@/components/variant/MvMeasurementTableRow.vue'
import {buildMeasurementGroups, hasMixedLevels, type MeasurementGroup, tablePreview} from '@/lib/measurement-groups'
import {
  eligibleCalibrations,
  MEASUREMENT_CALLS,
  type MeasurementCallSummary,
  type MeasurementRelationship,
  measurementCall,
  summarizeMeasurementCalls
} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']
type ScoreSet = components['schemas']['ScoreSet']

/**
 * Comparison table for choosing which of a variant's measurements drives the rest of the page.
 *
 * Measurements are grouped under a one-sentence header stating what they assayed relative to the page's
 * variant, so the relationship is said once in words rather than tagged on every row. Large groups preview
 * their top-ranked rows behind "Show N more"; the selected measurement always stays visible.
 */
export default defineComponent({
  name: 'MvMeasurementTable',

  components: {MvMeasurementGroupHeader, MvMeasurementTableRow},

  props: {
    measurements: {type: Array as PropType<AlleleMeasurement[]>, required: true},
    // Whether the page's variant is a protein change (a `PA` anchor) rather than a nucleotide change.
    anchorIsProtein: {type: Boolean, default: false},
    selectedUrn: {type: String as PropType<string | null>, default: null},
    // Shown on the selected row while its detail/scores are still loading.
    loading: {type: Boolean, default: false},
    getKeyword: {
      type: Function as PropType<(scoreSetUrn: string, key: string) => string | null>,
      required: true
    },
    // Null until the score set loads, so a null keyword then means "not loaded" rather than "not provided".
    // Whether research-use-only calibrations count, as set in the page's View options.
    includeResearchUseOnly: {type: Boolean, default: false},
    getScoreSet: {
      type: Function as PropType<(scoreSetUrn: string) => ScoreSet | null>,
      required: true
    },
    getCitation: {
      type: Function as PropType<(scoreSetUrn: string) => string | null>,
      required: true
    }
  },

  emits: ['select'],

  setup() {
    return {MEASUREMENT_CALLS}
  },

  data() {
    return {expandedGroups: [] as MeasurementRelationship[]}
  },

  computed: {
    // Counts every listed measurement, including rows behind "Show N more".
    callSummary(): MeasurementCallSummary | null {
      return summarizeMeasurementCalls(this.measurements, (m) => {
        const scoreSet = this.getScoreSet(m.scoreSetUrn)
        return measurementCall(
          m,
          eligibleCalibrations(scoreSet?.scoreCalibrations, this.includeResearchUseOnly),
          scoreSet != null
        )
      })
    },
    groups(): MeasurementGroup[] {
      return buildMeasurementGroups(this.measurements)
    },
    // Titles shared by more than one listed score set (e.g. sibling score sets of one study); those rows keep
    // their URN so they can be told apart.
    duplicateTitles(): Set<string> {
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      for (const m of this.measurements) {
        if (seen.has(m.scoreSetTitle)) duplicates.add(m.scoreSetTitle)
        seen.add(m.scoreSetTitle)
      }
      return duplicates
    }
  },

  watch: {
    // A new measurement set (as-of date, superseded scope) is a new list; earlier expansions don't carry over.
    measurements() {
      this.expandedGroups = []
    }
  },

  methods: {
    hasMixedLevels,
    preview(group: MeasurementGroup): ReturnType<typeof tablePreview> {
      return tablePreview(group, {
        expanded: this.expandedGroups.includes(group.relationship),
        selectedUrn: this.selectedUrn
      })
    },
    // Only the facts that tell measurements apart; mechanism is long free text, left to Assay facts below.
    assayFacts(m: AlleleMeasurement): AssayFact[] {
      return [
        {key: 'assay', value: this.getKeyword(m.scoreSetUrn, 'Phenotypic Assay Method')},
        {key: 'model', value: this.getKeyword(m.scoreSetUrn, 'Phenotypic Assay Model System')}
      ]
    }
  }
})
</script>

<style>
/* Unscoped: shared with MvMeasurementTableRow so the column headers and rows line up. Wide tables only; rows
   stack below that. */
.measurement-grid {
  grid-template-columns: minmax(0, 1fr) 14rem;
  column-gap: 1.25rem;
}
</style>
