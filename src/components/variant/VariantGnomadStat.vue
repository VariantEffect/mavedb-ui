<template>
  <div class="stat">
    <span v-key-term="'population'" class="mave-label w-fit">gnomAD</span>
    <!-- The subject allele's own frequency: the canonical statistic. -->
    <MvGnomadCell v-if="headlineState === 'direct'" :gnomad="assayGnomad" />
    <!-- No frequency on the subject itself, but its encoding variants carry frequencies (protein level assay):
         headline the clinically strongest encoding's own record, attributed to it, with every encoding in the popover. -->
    <template v-else-if="headlineState === 'enumerated' && strongestGnomad">
      <span class="stat-value font-mono font-semibold">{{
        formatFrequency(strongestGnomad.gnomad.alleleFrequency)
      }}</span>
      <span v-if="strongestGnomad.gnomad.faf95Max != null" class="text-xs text-text-muted"
        >FAF95 <span class="font-mono">{{ formatFrequency(strongestGnomad.gnomad.faf95Max) }}</span></span
      >
    </template>
    <!-- Nucleotide subject with no frequency of its own but related variants carry frequencies: be explicit
         rather than borrow related variants' frequencies. Related frequencies, if any, show below as context. -->
    <span v-else-if="headlineState === 'absent'" class="stat-value text-sm italic text-text-muted">
      No gnomAD record for this allele
    </span>
    <span v-else class="stat-value">—</span>

    <!-- Related-allele records. For an enumerated headline this control doubles as a caveat: the headline is an
         encoding variant's record, not a direct assertion on this variant, and it opens every encoding's record.
         Otherwise it's pure context (records that didn't drive the cell). -->
    <template v-if="underlyingGnomad.length">
      <button
        class="text-xs text-link"
        :class="
          headlineState === 'enumerated'
            ? 'mt-auto flex items-center gap-1 italic underline-offset-2'
            : 'mt-auto text-left hover:underline'
        "
        type="button"
        @click="toggleGnomadPopover"
      >
        <template v-if="headlineState === 'enumerated'">
          <i class="pi pi-info-circle shrink-0 !text-xs not-italic" />
          <span class="whitespace-nowrap underline decoration-dotted">{{
            underlyingGnomad.length === 1
              ? 'taken from 1 variant'
              : `taken from 1 of ${underlyingGnomad.length} variants`
          }}</span>
        </template>
        <template v-else
          ><span class="underline decoration-dotted"
            >{{ underlyingGnomad.length }} {{ underlyingLabel }}</span
          ></template
        >
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
            <MvGnomadCell :gnomad="item.gnomad" />
          </div>
        </div>
      </Popover>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Popover from 'primevue/popover'

import MvGnomadCell from '@/components/variant/MvGnomadCell.vue'
import {type SubjectDigest, toSubjectDigestSet} from '@/lib/annotation-subject'
import {
  formatFrequency,
  type GnomadHeadline,
  resolveGnomadHeadline,
  type UnderlyingGnomad,
  underlyingGnomadNote
} from '@/lib/gnomad'
import type {components} from '@/schema/openapi'

type GnomadAnnotation = components['schemas']['GnomadAnnotation']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

/**
 * The gnomAD stat cell for the score-set variant panel. Placement rules (own record, strongest encoding at protein level,
 * explicit absence at nucleotide level) come from {@link resolveGnomadHeadline}; this component adds the panel
 * layout and the related-frequency popover.
 */
export default defineComponent({
  name: 'VariantGnomadStat',

  components: {MvGnomadCell, Popover},

  props: {
    // The subject allele's own gnomAD annotation, or null (e.g. a protein-level assay).
    assayGnomad: {type: Object as PropType<GnomadAnnotation | null>, default: null},
    // Digest-keyed annotations for the whole record. Source for the encoding-variant enumeration.
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    // Digest-keyed allele identities. Supplies each underlying frequency's HGVS label.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})},
    // The subject allele's digest(s) — excluded (with its projection) from the related-frequency enumeration,
    // so the subject's own frequency never reappears as "related".
    assayLevelDigest: {type: [String, Array] as PropType<SubjectDigest>, default: null},
    // The subject allele's sequence level. Gates the enumeration: at nucleotide level a missing frequency
    // stays explicit ('absent') rather than borrowing related variants'. `null` → enumerate (unknown).
    assayLevel: {type: String as PropType<SequenceLevel | null>, default: null}
  },

  computed: {
    headline(): GnomadHeadline {
      return resolveGnomadHeadline(
        this.assayGnomad,
        this.annotations,
        this.alleles,
        toSubjectDigestSet(this.assayLevelDigest),
        this.assayLevel
      )
    },
    headlineState(): GnomadHeadline['state'] {
      return this.headline.state
    },
    underlyingGnomad(): UnderlyingGnomad[] {
      return this.headline.underlying
    },
    strongestGnomad(): UnderlyingGnomad | null {
      return this.headline.strongest
    },
    // Only the non-enumerated (context) trigger uses this — the enumerated trigger writes its own caveat copy.
    underlyingLabel(): string {
      return `related ${this.underlyingGnomad.length === 1 ? 'frequency' : 'frequencies'}`
    },
    underlyingGnomadNote(): string {
      return underlyingGnomadNote(this.headlineState, this.underlyingGnomad.length)
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

.stat-value {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}
</style>
