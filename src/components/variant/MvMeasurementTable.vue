<template>
  <!-- The panel's border closes the table, so the last row drops its own rule. -->
  <div class="[&>section:last-child>*:last-child]:border-b-0">
    <!-- Column headers (tablet+). On mobile each row stacks, so the headers would label nothing. -->
    <div class="measurement-grid mave-label hidden tablet:grid border-b border-border-light px-5 py-2">
      <span>Score set</span>
      <span><span v-key-term="'functional-impact'">Functional impact</span></span>
      <span><span v-key-term="'acmg'">Evidence</span></span>
      <span class="text-right">Score</span>
    </div>
    <section v-for="group in groups" :key="group.relationship">
      <MvMeasurementGroupHeader :anchor-is-protein="anchorIsProtein" class="px-4 tablet:px-5" :group="group" />
      <MvMeasurementTableRow
        v-for="m in preview(group).visible"
        :key="m.variantUrn"
        :citation="getCitation(m.scoreSetUrn)"
        :facts="assayFacts(m)"
        :facts-loading="!isScoreSetLoaded(m.scoreSetUrn)"
        :loading="m.variantUrn === selectedUrn && loading"
        :measurement="m"
        :selected="m.variantUrn === selectedUrn"
        :show-level="hasMixedLevels(group)"
        :show-urn="duplicateTitles.has(m.scoreSetTitle)"
        @select="$emit('select', $event)"
      />
      <button
        v-if="preview(group).hiddenCount > 0"
        class="block w-full cursor-pointer border-b border-border-light bg-surface px-4 py-2 text-left text-xs font-semibold text-link hover:underline tablet:px-5"
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
import type {MeasurementRelationship} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleMeasurement = components['schemas']['AlleleMeasurement']

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
    isScoreSetLoaded: {
      type: Function as PropType<(scoreSetUrn: string) => boolean>,
      required: true
    },
    getCitation: {
      type: Function as PropType<(scoreSetUrn: string) => string | null>,
      required: true
    }
  },

  emits: ['select'],

  data() {
    return {expandedGroups: [] as MeasurementRelationship[]}
  },

  computed: {
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
/* Unscoped: shared with MvMeasurementTableRow so the column headers and rows line up. Tablet+ only; rows
   stack below that. */
.measurement-grid {
  grid-template-columns: minmax(0, 1fr) 10rem 8.5rem 6rem;
  column-gap: 1.25rem;
}
</style>
