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
      <MvClinvarSummary :clinvar="headline.clinvar" :show-provenance="false" />
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
         submission with no germline classification). MvClinvarSummary names the state and links out. -->
    <MvClinvarSummary v-else-if="headline.kind === 'presence'" :clinvar="headline.record.clinvar" />
    <span v-else class="stat-value">—</span>

    <!-- The records on sibling alleles behind the headline — everything except the measured allele's own
         record (germline-less `-` included), so a lone assayed record gets no popover. Mirrors gnomAD's. -->
    <template v-if="underlyingClinvar.length">
      <button class="mt-auto text-left text-xs text-link hover:underline" type="button" @click="toggleClinvarPopover">
        {{ underlyingClinvar.length }}
        {{ underlyingClinvar.length === 1 ? 'underlying record' : 'underlying records' }}
      </button>
      <Popover ref="clinvarPopoverRef">
        <div class="flex max-w-xs flex-col gap-2">
          <span class="text-xs text-text-muted">{{ underlyingClinvarNote }}</span>
          <!-- Lean rows: the prioritized call is the headline above, so each underlying record shows only its
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
import {resolveClinvarHeadline, type ClinvarHeadline} from '@/lib/clinvar-control-placement'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']

/**
 * The ClinVar stat cell shared by the score-set variant panel and the variant screen. Runs the
 * concordant/discordant placement fold over the whole record so it agrees with the histogram:
 * Prefer the assayed allele's own call wins, then...
 * If the assayed allele is unannotated, a projected call from a sibling allele (same protein consequence) is used.
 * If it is unannotated it falls through to a related-level projection sibling.
 * If those siblings are discordant, note they are in conflict.
 * If no germline record exists but the variant has a somatic/oncogenicity-only submission, link but note 'No germline classification'.
 * Beneath the folded headline, a popover lists the sibling-allele records behind it (allele HGVS, release,
 * link) — every record except the measured allele's own; germline-less `-` included, only the fold drops those.
 * `clinvarVersion` is passed by the parent so this component resolves the same version as other histogram and stat cells.
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
    // The measured allele's digest.
    assayLevelDigest: {type: String as PropType<string | null>, default: null},
    // The ClinVar release to reduce over (raw `MM_YYYY`), so this cell agrees with all parents.
    // `null` (store not ready / no controls) → fall back to the latest release per allele.
    clinvarVersion: {type: String as PropType<string | null>, default: null}
  },

  computed: {
    // The ClinVar records reaching this measurement at the selected release — walked once, projected below.
    records(): MeasurementClinvarRecord[] {
      return resolveClinvarRecords(this.annotations, this.alleles, this.assayLevelDigest, this.clinvarVersion)
    },
    // What the single headline shows: the fold's call, a `-` presence fallback, "conflicting", or nothing.
    headline(): ClinvarHeadline {
      return resolveClinvarHeadline(this.records, this.assayLevelDigest)
    },
    // The records on sibling alleles behind the headline — enumerateUnderlyingClinvar excludes the measured
    // allele's own record (the primary), so a lone assayed record gets no popover.
    underlyingClinvar(): MeasurementClinvarRecord[] {
      return enumerateUnderlyingClinvar(this.records)
    },
    underlyingClinvarNote(): string {
      return "ClinVar records for variants with this allele's protein consequence. Open each in ClinVar to view its full classification."
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
