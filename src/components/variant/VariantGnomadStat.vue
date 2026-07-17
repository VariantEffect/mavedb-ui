<template>
  <div :class="plain ? 'flex h-full flex-col gap-0.5' : 'stat'">
    <!-- Label defaults to the score-set stat label; callers (e.g. the variant screen) inject their own. -->
    <slot name="label"><span v-key-term="'population'" class="stat-label">gnomAD</span></slot>
    <!-- The measured allele's own frequency (a nucleotide-level assay): the canonical stat, straight up. -->
    <MvGnomadSummary v-if="assayGnomad" :gnomad="assayGnomad" />
    <!-- No gnomAD on the measured allele itself, but sibling variants carry frequencies (protein level assay). 
         Enumerate them: a max-AF headline + a popover of full allele-level frequencies. -->
    <template v-else-if="underlyingGnomad.length">
      <span class="stat-value font-semibold">Up to AF {{ formatFrequency(underlyingGnomadMaxAf) }}</span>
      <button class="mt-auto text-left text-xs text-link hover:underline" type="button" @click="toggleGnomadPopover">
        {{ underlyingGnomad.length }}
        {{ underlyingGnomad.length === 1 ? 'underlying frequency' : 'underlying frequencies' }}
      </button>
      <Popover ref="gnomadPopoverRef">
        <div class="flex max-w-xs flex-col gap-2">
          <span class="text-xs text-text-muted">{{ underlyingGnomadNote }}</span>
          <div
            v-for="item in underlyingGnomad"
            :key="item.gnomad.dbIdentifier"
            class="flex flex-col gap-1 border-t border-border-light pt-2 first:border-t-0 first:pt-0"
          >
            <span v-if="item.hgvs" class="font-mono text-xs font-semibold text-text-primary">{{ item.hgvs }}</span>
            <MvGnomadSummary :gnomad="item.gnomad" />
          </div>
        </div>
      </Popover>
    </template>
    <span v-else class="stat-value">—</span>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Popover from 'primevue/popover'

import MvGnomadSummary from '@/components/variant/MvGnomadSummary.vue'
import {collectGnomadFrequencies, formatFrequency, type UnderlyingGnomad} from '@/lib/gnomad'
import type {components} from '@/schema/openapi'

type GnomadAnnotation = components['schemas']['GnomadAnnotation']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']

/**
 * The score-set variant panel's gnomAD stat cell. Shows the measured allele's own frequency when it has one;
 * for a protein-level assay (where gnomAD annotates the *genomic* encoding variants, not the protein allele)
 * it enumerates the codon siblings' distinct frequencies behind a popover along with a note that it isn't
 * established which underlies the measurement.
 */
export default defineComponent({
  name: 'VariantGnomadStat',

  components: {Popover, MvGnomadSummary},

  props: {
    // Drop the score-set `.stat` chrome (bg/padding) so the cell can be embedded on its own (e.g. the
    // variant screen's evidence panel), where the caller supplies the wrapper and a `#label` slot.
    plain: {type: Boolean, default: false},
    // The measured allele's own gnomAD annotation, or null (e.g. a protein-level assay).
    assayGnomad: {type: Object as PropType<GnomadAnnotation | null>, default: null},
    // Digest-keyed annotations for the whole record. Source for the encoding-variant enumeration.
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    // Digest-keyed allele identities. Supplies each underlying frequency's HGVS label.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})}
  },

  computed: {
    underlyingGnomad(): UnderlyingGnomad[] {
      return collectGnomadFrequencies(this.annotations, this.alleles)
    },
    // Sorted highest-first, so the leading entry is the max. This becomes the headline stat in the cell,
    // with the rest enumerated in the popover.
    underlyingGnomadMaxAf(): number | null {
      return this.underlyingGnomad[0]?.gnomad.alleleFrequency ?? null
    },
    // Nucleotide variants that *could* encode the measured protein change; only those present in gnomAD
    // are shown, and it's not established which (if any) actually underly the measurement.
    underlyingGnomadNote(): string {
      return this.underlyingGnomad.length === 1
        ? 'The frequency of any variants in gnomAD which can encode this protein change. This assay does not establish which one underlies the measurement.'
        : 'Frequencies of any variants in gnomAD which can encode this protein change. This assay does not establish which of them underlie the measurement.'
    }
  },

  methods: {
    toggleGnomadPopover(event: Event) {
      ;(this.$refs.gnomadPopoverRef as InstanceType<typeof Popover>)?.toggle(event)
    },
    formatFrequency
  }
})
</script>

<style scoped>
/* Matches the panel's facts grid (see VariantDetailPanel). Each cell is a stacked stat on the shared surface. */
.stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--color-surface);
  padding: 10px 14px;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}
</style>
