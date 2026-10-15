<template>
  <div class="flex h-full flex-col gap-0.5 leading-snug">
    <slot name="label" />
    <template v-if="gnomad">
      <span class="font-mono text-sm font-semibold text-text-primary">{{
        formatFrequency(gnomad.alleleFrequency)
      }}</span>
      <span
        class="text-xs text-text-muted"
        :title="`${gnomad.alleleCount.toLocaleString()} / ${gnomad.alleleNumber.toLocaleString()} alleles`"
      >
        <template v-if="gnomad.faf95Max != null"
          >FAF95 <span class="font-mono">{{ formatFrequency(gnomad.faf95Max) }}</span> · </template
        >{{ formatAlleleCount(gnomad.alleleCount) }} / {{ formatAlleleCount(gnomad.alleleNumber) }}
      </span>
      <span class="mt-auto text-[10px] text-text-muted">
        <template v-if="showRelease">As of gnomAD {{ gnomad.dbVersion }} · </template>
        <a class="text-link hover:underline" :href="gnomadVariantUrl(gnomad)" rel="noopener noreferrer" target="_blank"
          >view in gnomAD</a
        >
      </span>
    </template>
    <span v-else class="text-sm italic text-text-muted">No gnomAD record</span>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {formatAlleleCount, formatFrequency, gnomadVariantUrl} from '@/lib/gnomad'
import type {components} from '@/schema/openapi'

type GnomadAnnotation = components['schemas']['GnomadAnnotation']

/**
 * Compact gnomAD cell for the variant page's clinical table: AF headline, then FAF95 and allele counts muted.
 * Rows there are nucleotide-level, so the cell shows the allele's own record or states its absence; it never pools.
 */
export default defineComponent({
  name: 'MvGnomadCell',

  props: {
    gnomad: {type: Object as PropType<GnomadAnnotation | null>, default: null},
    // False when the table states the gnomAD release once in its column header; the link-out stays.
    showRelease: {type: Boolean, default: true}
  },

  methods: {
    formatAlleleCount,
    formatFrequency,
    gnomadVariantUrl
  }
})
</script>
