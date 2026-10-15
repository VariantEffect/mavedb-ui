<template>
  <h4 class="border-b border-border-light bg-bg py-2 text-xs-plus text-text-secondary">
    <span class="font-semibold text-text-primary">
      {{ group.measurements.length }} {{ group.measurements.length === 1 ? 'measurement' : 'measurements' }}
    </span>
    <span v-key-term="'relationship'">&#32;of {{ subject }}</span
    ><template v-if="group.hgvs"
      >,
      <span class="font-mono text-xs text-text-primary" :title="group.hgvs">{{ shortHgvs(group.hgvs) }}</span></template
    >
  </h4>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {groupSubject, type MeasurementGroup, shortHgvs} from '@/lib/measurement-groups'

/**
 * A measurement group's one-sentence header, "N measurements of …", shared by the variant page's measurement table
 * and the MaveMD search results so both name a relationship the same way. Callers set the horizontal padding.
 */
export default defineComponent({
  name: 'MvMeasurementGroupHeader',

  props: {
    group: {type: Object as PropType<MeasurementGroup>, required: true},
    // Whether the page's variant is a protein change (a `PA` anchor) rather than a nucleotide change.
    anchorIsProtein: {type: Boolean, default: false}
  },

  computed: {
    subject(): string {
      return groupSubject(this.group, this.anchorIsProtein)
    }
  },

  methods: {shortHgvs}
})
</script>
