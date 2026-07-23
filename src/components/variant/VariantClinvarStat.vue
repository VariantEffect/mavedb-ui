<template>
  <div :class="plain ? 'flex h-full flex-col gap-0.5' : 'stat'">
    <!-- Label defaults to the score-set stat label; callers (e.g. the variant screen) inject their own. -->
    <slot name="label"><span v-key-term="'clinical'" class="stat-label">ClinVar</span></slot>
    <!-- Hard discordance: related variants carry both pathogenic and benign calls — no single call to show. -->
    <span v-if="headline.kind === 'conflicting'" class="stat-value text-sm font-semibold">
      Conflicting classifications
    </span>
    <!-- The winning placement's canonical call, plus the lib's `note`: a soft conflict keeps its directional
         lean but flags a co-occurring uncertain record (differentiating a plain VUS from ClinVar's own
         Conflicting verdict); a concordant call gets a quiet aside. Show the lean rather than hide it. -->
    <template v-else-if="headline.kind === 'call'">
      <MvClinvarSummary :clinvar="headline.clinvar" :show-provenance="showHeadlineProvenance" />
      <span v-if="headline.note === 'soft-conflicting'" class="text-xs italic text-text-muted">
        ClinVar marks a record with the same protein consequence as conflicting.
      </span>
      <span v-else-if="headline.note === 'soft-vus'" class="text-xs italic text-text-muted">
        ClinVar marks a record with the same protein consequence as uncertain.
      </span>
      <span v-else-if="headline.note === 'concordant'" class="text-xs italic text-text-muted">
        Representative of concordant records with the same protein consequence.
      </span>
    </template>
    <!-- No usable call, but a ClinVar record exists on an allele (a `-`, e.g. a somatic/oncogenicity-only
         submission with no germline classification). MvClinvarSummary names the state; it links out inline
         only when this record is shown directly (no underlying records), else the link lives in the popover. -->
    <MvClinvarSummary
      v-else-if="headline.kind === 'presence'"
      :clinvar="headline.record.clinvar"
      :show-provenance="showHeadlineProvenance"
    />
    <!-- Nucleotide measurement with no ClinVar record of its own: be explicit rather than borrow a related
         allele's call. Related records (if any) are offered below as context, not promoted to a call. -->
    <span v-else-if="headline.kind === 'absent'" class="stat-value text-sm italic text-text-muted">
      No ClinVar record for this variant
    </span>
    <span v-else class="stat-value">—</span>

    <!-- Related-allele records offered as context: beside a direct call (records that did not drive it),
         beneath a projected call (the siblings it folded over), or under an `absent` headline. -->
    <template v-if="underlyingClinvar.length">
      <button class="mt-auto text-left text-xs text-link hover:underline" type="button" @click="toggleClinvarPopover">
        {{ underlyingClinvar.length }}
        {{ underlyingLabel }}
      </button>
      <Popover ref="clinvarPopoverRef">
        <div class="flex max-w-xs flex-col gap-2">
          <span class="text-xs text-text-muted">{{ underlyingClinvarNote }}</span>
          <!-- Lean rows: the headline call is shown above, so each context record shows only its
               allele (HGVS), release, and a link out to ClinVar for the full classification. -->
          <div
            v-for="item in underlyingClinvar"
            :key="clinvarRecordId(item.clinvar)"
            class="flex flex-col gap-0.5 border-t border-border-light pt-2 first:border-t-0 first:pt-0"
          >
            <span v-if="item.hgvs" class="font-mono text-xs font-semibold text-text-primary">{{ item.hgvs }}</span>
            <MvClinvarSummary :clinvar="item.clinvar" />
          </div>
        </div>
      </Popover>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Popover from 'primevue/popover'

import MvClinvarSummary from '@/components/variant/MvClinvarSummary.vue'
import {
  clinvarRecordId,
  enumerateUnderlyingClinvar,
  resolveClinvarRecords,
  type MeasurementClinvarRecord
} from '@/lib/clinvar-controls'
import type {SubjectDigest} from '@/lib/annotation-subject'
import {resolveClinvarHeadline, type ClinvarHeadline} from '@/lib/clinvar-control-placement'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

/**
 * The ClinVar stat cell shared by the score-set variant panel and the variant screen. Runs the same
 * level-gated placement fold as the histogram ({@link resolveClinvarHeadline}) so the two agree:
 *  - the measured allele's own call wins as the headline, with its link inline;
 *  - at *protein* level, an unannotated measured allele projects a representative from its encoding siblings
 *    (flagged for soft/hard discordance); the popover lists the siblings it folded over;
 *  - at *nucleotide* level, an unannotated measured allele stays explicit ('No ClinVar record for this
 *    variant') — we don't borrow a related allele's call — and any related records show as context;
 *  - a germline-less `-` record on the measured allele shows 'No germline classification' and links out.
 * The popover always carries the related-allele records as context (allele HGVS, release, link), minus the
 * measured allele's own record and its cross-frame duplicates.
 * `clinvarVersion` is passed by the parent so this cell resolves the same release as other histogram and stat cells.
 * `plain` / the `#label` slot let a caller drop the `.stat` chrome and supply its own label.
 */
export default defineComponent({
  name: 'VariantClinvarStat',

  components: {MvClinvarSummary, Popover},

  props: {
    // Drop the score-set `.stat` chrome (bg/padding) so the cell can be embedded on its own (e.g. the
    // variant screen's evidence panel), where the caller supplies the wrapper and a `#label` slot.
    plain: {type: Boolean, default: false},
    // Digest-keyed annotations for the whole record. Supply all ClinVar assertions so the placement can be reduced over the whole record.
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    // Digest-keyed allele identities. These supply a projected call's reference-frame HGVS.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})},
    // The subject allele's digest(s) — the measured allele on the score-set panel, or the page's own allele
    // (its c↔g pair) on the variant page. A ClinVar record on any of them is the subject's own.
    assayLevelDigest: {type: [String, Array] as PropType<SubjectDigest>, default: null},
    // The measured allele's sequence level. Gates projection: at nucleotide level a missing direct record
    // stays explicit ('absent') rather than borrowing a related allele's call. `null` → project (unknown).
    assayLevel: {type: String as PropType<SequenceLevel | null>, default: null},
    // The ClinVar release to reduce over (raw `MM_YYYY`), so this cell agrees with all parents.
    // `null` (store not ready / no controls) → fall back to the latest release per allele.
    clinvarVersion: {type: String as PropType<string | null>, default: null}
  },

  computed: {
    // The ClinVar records reaching this measurement at the selected release — walked once, projected below.
    records(): MeasurementClinvarRecord[] {
      return resolveClinvarRecords(this.annotations, this.alleles, this.assayLevelDigest, this.clinvarVersion)
    },
    // What the single headline shows: the fold's call, a `-` presence, an explicit `absent`, "conflicting", or nothing.
    headline(): ClinvarHeadline {
      return resolveClinvarHeadline(this.records, this.assayLevelDigest, this.assayLevel)
    },
    // The related-allele records shown as context — enumerateUnderlyingClinvar excludes the measured allele's
    // own record and its cross-frame duplicates.
    underlyingClinvar(): MeasurementClinvarRecord[] {
      return enumerateUnderlyingClinvar(this.records)
    },
    // True when the headline is a projected call — the representative is a related allele, and the context
    // records below are the siblings it folded over (protein level). Otherwise the context records are just
    // that: related records that did not drive a direct call (or an `absent` headline).
    isProjectedHeadline(): boolean {
      return this.headline.kind === 'call' && this.headline.placement.projected
    },
    // The headline record links inline only when it *is* the measured allele's own record — a direct call or
    // the measured allele's `-` presence. A projected call's links live in the context popover.
    showHeadlineProvenance(): boolean {
      const h = this.headline
      if (h.kind === 'call') return !h.placement.projected
      if (h.kind === 'presence') return h.record.onAssayed
      return false
    },
    underlyingLabel(): string {
      const noun = this.isProjectedHeadline ? 'underlying record' : 'related record'
      return this.underlyingClinvar.length === 1 ? noun : `${noun}s`
    },
    underlyingClinvarNote(): string {
      return this.isProjectedHeadline
        ? "ClinVar records for variants with this allele's protein consequence. Open each in ClinVar to view its full classification."
        : 'Other variants with the same protein consequence that also carry ClinVar records. Open each in ClinVar for its full classification.'
    }
  },

  methods: {
    clinvarRecordId,
    toggleClinvarPopover(event: Event) {
      ;(this.$refs.clinvarPopoverRef as InstanceType<typeof Popover>)?.toggle(event)
    }
  }
})
</script>

<style scoped>
/* Matches the panel's facts grid — each cell a stacked stat on the shared surface. */
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
