<template>
  <div :class="plain ? 'flex h-full flex-col gap-0.5' : 'stat'">
    <!-- Label defaults to the score-set stat label; callers (e.g. the variant screen) inject their own. -->
    <slot name="label"><span v-key-term="'population'" class="stat-label">gnomAD</span></slot>
    <!-- The subject allele's own frequency: the canonical statistic. -->
    <MvGnomadSummary v-if="headlineState === 'direct'" :gnomad="assayGnomad!" />
    <!-- No frequency on the subject itself, but its encoding variants carry frequencies (protein level assay):
         enumerate them as a max-AF headline + a popover of full allele-level frequencies. -->
    <span v-else-if="headlineState === 'enumerated'" class="stat-value font-semibold"
      >Up to AF {{ formatFrequency(underlyingGnomadMaxAf) }}</span
    >
    <!-- Nucleotide subject with no frequency of its own but related variants carry frequencies: be explicit 
     rather than borrow related variants' frequencies. Related frequencies, if any, show below as context. -->
    <span v-else-if="headlineState === 'absent'" class="stat-value text-sm italic text-text-muted">
      No gnomAD record for this variant
    </span>
    <span v-else class="stat-value">—</span>

    <!-- Related-allele frequencies as context: the encoding variants behind an enumerated headline, or
         other same-consequence variants' frequencies beside a direct/absent headline. -->
    <template v-if="underlyingGnomad.length">
      <button class="mt-auto text-left text-xs text-link hover:underline" type="button" @click="toggleGnomadPopover">
        {{ underlyingGnomad.length }}
        {{ underlyingLabel }}
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
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Popover from 'primevue/popover'

import MvGnomadSummary from '@/components/variant/MvGnomadSummary.vue'
import {type SubjectDigest, toSubjectDigestSet} from '@/lib/annotation-subject'
import {collectGnomadFrequencies, formatFrequency, type UnderlyingGnomad} from '@/lib/gnomad'
import type {components} from '@/schema/openapi'

type GnomadAnnotation = components['schemas']['GnomadAnnotation']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

/**
 * The gnomAD stat cell. Placement rules mirror {@link VariantClinvarStat}:
 *  - the subject allele's own frequency wins as the headline, with its link;
 *  - at *protein* level, a subject with no frequency of its own enumerates its encoding variants' distinct
 *    frequencies (max-AF headline + popover), noting it isn't established which underlies the measurement;
 *  - at *nucleotide* level, a subject with no frequency stays explicit ('No gnomAD record for this variant') —
 *    we don't borrow a related variant's frequency — and any related frequencies show below as context.
 * The subject is the measured allele on the score-set panel, or the page's own allele on the variant page.
 */
export default defineComponent({
  name: 'VariantGnomadStat',

  components: {Popover, MvGnomadSummary},

  props: {
    // Drop the score-set `.stat` chrome (bg/padding) so the cell can be embedded on its own (e.g. the
    // variant screen's evidence panel), where the caller supplies the wrapper and a `#label` slot.
    plain: {type: Boolean, default: false},
    // The subject allele's own gnomAD annotation, or null (e.g. a protein-level assay).
    assayGnomad: {type: Object as PropType<GnomadAnnotation | null>, default: null},
    // Digest-keyed annotations for the whole record. Source for the encoding-variant enumeration.
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    // Digest-keyed allele identities. Supplies each underlying frequency's HGVS label.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})},
    // The subject allele's digest(s) — excluded (with its c↔g twin) from the related-frequency enumeration,
    // so the subject's own frequency never reappears as "related".
    assayLevelDigest: {type: [String, Array] as PropType<SubjectDigest>, default: null},
    // The subject allele's sequence level. Gates the enumeration: at nucleotide level a missing frequency
    // stays explicit ('absent') rather than borrowing related variants'. `null` → enumerate (unknown).
    assayLevel: {type: String as PropType<SequenceLevel | null>, default: null}
  },

  computed: {
    underlyingGnomad(): UnderlyingGnomad[] {
      return collectGnomadFrequencies(this.annotations, this.alleles, toSubjectDigestSet(this.assayLevelDigest))
    },
    // Only enumerate related frequencies as a headline at protein level (or unknown); at nucleotide level a
    // missing direct frequency is final — mirrors the ClinVar projection gate.
    canEnumerate(): boolean {
      return this.assayLevel !== 'cdna' && this.assayLevel !== 'genomic'
    },
    // The headline: the subject's own frequency, an enumerated max-AF (protein), an explicit absence
    // (nucleotide), or nothing.
    headlineState(): 'direct' | 'enumerated' | 'absent' | 'none' {
      if (this.assayGnomad) return 'direct'
      if (this.canEnumerate && this.underlyingGnomad.length) return 'enumerated'
      if (this.underlyingGnomad.length) return 'absent'
      return 'none'
    },
    // Sorted highest-first, so the leading entry is the max — the enumerated headline stat.
    underlyingGnomadMaxAf(): number | null {
      return this.underlyingGnomad[0]?.gnomad.alleleFrequency ?? null
    },
    underlyingLabel(): string {
      const kind = this.headlineState === 'enumerated' ? 'underlying' : 'related'
      return `${kind} ${this.underlyingGnomad.length === 1 ? 'frequency' : 'frequencies'}`
    },
    underlyingGnomadNote(): string {
      if (this.headlineState === 'enumerated') {
        return this.underlyingGnomad.length === 1
          ? 'The frequency of any variants in gnomAD which can encode this protein change. This assay does not establish which one underlies the measurement.'
          : 'Frequencies of any variants in gnomAD which can encode this protein change. This assay does not establish which of them underlie the measurement.'
      }
      return 'Other variants with the same protein consequence that also have gnomAD frequencies.'
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
