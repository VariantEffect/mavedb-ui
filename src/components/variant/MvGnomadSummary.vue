<template>
  <div class="flex h-full flex-col gap-0.5 leading-snug">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span class="text-text-primary"
        >AF: <span class="font-mono">{{ formatFrequency(gnomad.alleleFrequency) }}</span></span
      >
      <span class="text-sm text-text-muted"
        >({{ gnomad.alleleCount.toLocaleString() }} / {{ gnomad.alleleNumber.toLocaleString() }})</span
      >
    </div>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span v-if="gnomad.faf95Max !== null" class="text-text-primary"
        >FAF95: <span class="font-mono text-text-muted">{{ formatFrequency(gnomad.faf95Max) }}</span>
      </span>
      <span v-else class="text-text-muted">FAF95 —</span>
    </div>
    <!-- Provenance sits at the bottom of the cell, so it lines up across the annotations card's columns
         however tall the frequencies above it run. -->
    <div class="mt-auto text-[10px] text-text-muted">
      As of gnomAD {{ gnomad.dbVersion }} ·
      <a
        class="inline-flex items-center text-link hover:underline"
        :href="url"
        rel="noopener noreferrer"
        target="_blank"
        >view in gnomAD</a
      >
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {gnomadVariantUrl, formatFrequency, type GnomadFrequency} from '@/lib/gnomad'

/** Rich display of one gnomAD record: allele frequency, the AC/AN behind it, FAF95, and a deep link. */
export default defineComponent({
  name: 'MvGnomadSummary',

  props: {
    gnomad: {type: Object as PropType<GnomadFrequency>, required: true}
  },

  computed: {
    url(): string {
      return gnomadVariantUrl(this.gnomad)
    }
  },

  methods: {
    formatFrequency
  }
})
</script>
