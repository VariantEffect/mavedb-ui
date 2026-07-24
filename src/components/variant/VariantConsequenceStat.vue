<template>
  <div :class="plain ? 'flex h-full flex-col gap-0.5' : 'stat'">
    <!-- Label defaults to the score-set stat label; callers (e.g. MvAlleleLedger) may inject their own,
         mirroring VariantGnomadStat/VariantClinvarStat. -->
    <slot name="label"><span v-key-term="'consequence'" class="stat-label">Molecular consequence</span></slot>
    <template v-if="consequence">
      <span class="stat-value font-semibold">{{ formatConsequence(consequence) }}</span>
      <span v-if="sourceVersion" class="mt-auto text-[10px] text-text-muted"
        >As of VEP version {{ sourceVersion }}</span
      >
    </template>
    <span v-else class="stat-value">—</span>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {formatConsequence} from '@/lib/formats'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']

/**
 * The molecular-consequence stat cell — the VEP consequence and the Ensembl/VEP release it resolved under.
 * Shares the facts-grid `.stat` chrome with {@link VariantGnomadStat}/{@link VariantClinvarStat}; `plain`
 * drops it so the ledger can supply its own wrapper + `#label` slot.
 */
export default defineComponent({
  name: 'VariantConsequenceStat',

  props: {
    // Drop the score-set `.stat` chrome (bg/padding) so the cell can embed on its own (e.g. the allele
    // ledger), where the caller supplies the wrapper and a `#label` slot.
    plain: {type: Boolean, default: false},
    // The subject's coalesced VEP annotation (consequence + sourceVersion), or null when absent.
    vep: {type: Object as PropType<AlleleAnnotations['vep'] | null>, default: null}
  },

  computed: {
    consequence(): string | null {
      return this.vep?.consequence ?? null
    },
    sourceVersion(): string | null {
      return this.vep?.sourceVersion ?? null
    }
  },

  methods: {formatConsequence}
})
</script>

<style scoped>
/* Matches the panel's facts grid (see VariantDetailPanel), mirroring VariantGnomadStat/VariantClinvarStat. */
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
