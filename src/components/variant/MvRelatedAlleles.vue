<template>
  <div>
    <div class="mb-1 flex flex-wrap items-baseline gap-x-2">
      <span class="text-sm font-bold text-text-primary">Related alleles</span>
      <span class="text-xs-minus text-text-muted">other variation sharing this variant's protein consequence</span>
    </div>
    <!-- Collapsed by default: these are additional context, secondary to the measured/selected allele shown in parallel. -->
    <button
      class="cursor-pointer border-none bg-transparent text-xs font-semibold text-link hover:underline"
      type="button"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? 'Hide related alleles'
          : `Show ${groups.length} related ${groups.length === 1 ? 'allele' : 'alleles'}`
      }}
    </button>

    <div v-if="expanded" class="mt-2 flex flex-col gap-2">
      <div
        v-for="group in groups"
        :key="group.key"
        class="rounded-md border border-border-light bg-surface px-3 py-2.5"
      >
        <!-- Confidence badge (Resolved/Candidate; a stray measured sibling still reads "Measured"). -->
        <div class="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            v-if="confidenceBadge(group)"
            v-key-term="'confidence'"
            class="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.3px]"
            :class="confidenceBadge(group)!.class"
            >{{ confidenceBadge(group)!.label }}</span
          >
          <router-link
            v-for="caid in group.clingenLinks"
            :key="caid"
            class="ml-auto inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-link hover:underline"
            :to="{name: 'variant', params: {clingenAlleleId: caid}, query: variantUrn ? {variant: variantUrn} : {}}"
          >
            {{ caid }}<i class="pi pi-arrow-up-right text-xs" />
          </router-link>
        </div>

        <!-- Identity: one line per level (a projection pair shows both), never the digest. -->
        <div class="mb-1.5 flex flex-col gap-1">
          <div v-for="m in group.members" :key="m.digest" class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              v-key-term="'assay-level'"
              class="inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
              :class="levelClass(m.level)"
              >{{ levelLabel(m.level) }}</span
            >
            <span class="font-mono text-xs-plus font-semibold text-text-primary">{{ m.hgvs || '—' }}</span>
          </div>
        </div>

        <!-- Annotations: one deduplicated block when the pair agrees, else per-level so divergence shows. -->
        <div class="flex flex-col gap-1">
          <div
            v-if="!group.annotationsMatch"
            class="text-[10px] font-semibold uppercase tracking-[0.3px] text-amber-600"
          >
            Annotations differ by level
          </div>
          <div v-for="line in annotationLines(group)" :key="line.label ?? 'shared'">
            <div class="flex flex-col gap-0.5 text-xs-minus text-text-muted tablet:flex-row tablet:gap-5">
              <span v-if="line.label" class="font-semibold text-[#aaa]">{{ line.label }}</span>
              <span>
                <span class="font-semibold text-[#aaa]">VEP:</span>
                {{ line.annotations?.vep?.consequence ? formatConsequence(line.annotations.vep.consequence) : '—' }}
              </span>
              <span>
                <span class="font-semibold text-[#aaa]">gnomAD:</span>
                <template v-if="line.annotations?.gnomad">
                  AF {{ formatFrequency(line.annotations.gnomad.alleleFrequency) }}</template
                >
                <template v-else> —</template>
              </span>
              <span>
                <span class="font-semibold text-[#aaa]">ClinVar:</span>
                <template v-if="latestClinvar(line.annotations)"
                  >&nbsp;{{ formatClinicalSignificance(latestClinvar(line.annotations)!.clinicalSignificance) }}</template
                >
                <template v-else> —</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {type AlleleGroup, confidenceBadge} from '@/lib/allele-grouping'
import {formatClinicalSignificance, latestClinvar} from '@/lib/clinvar-controls'
import {formatConsequence} from '@/lib/formats'
import {formatFrequency} from '@/lib/gnomad'
import {ASSAY_LEVEL_LABELS, LEVEL_BUCKET_CLASSES, assayLevelBucket} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']

/**
 * Subordinate "Related alleles" panel: the sibling allele groups (everything that is not the page's
 * primary/selected allele — those are promoted into the evidence panel above). Collapsed by default and
 * visually lighter, so they read as context rather than co-equal evidence. Grouping is done by the
 * parent ({@link groupAlleles}); this component only renders the groups it is handed.
 */
export default defineComponent({
  name: 'MvRelatedAlleles',

  props: {
    // Sibling allele groups (pre-grouped and filtered by the parent).
    groups: {type: Array as PropType<AlleleGroup[]>, default: () => []},
    // The selected measurement's URN. Carried as the `?variant=` highlight on each group's link-out.
    variantUrn: {type: [String, null] as PropType<string | null>, default: null}
  },

  data() {
    return {expanded: false}
  },

  methods: {
    formatConsequence,
    formatFrequency,
    latestClinvar,
    formatClinicalSignificance,
    confidenceBadge,
    // The annotation blocks to render: one coalesced block (present-wins union across levels) when there
    // is no real divergence, else one per level so an actual present-vs-present disagreement shows.
    annotationLines(group: AlleleGroup): Array<{label: string | null; annotations: AlleleAnnotations | null}> {
      if (group.annotationsMatch) return [{label: null, annotations: group.coalescedAnnotations}]
      return group.members.map((m) => ({label: this.levelLabel(m.level), annotations: m.annotations}))
    },
    levelLabel(level: string | null | undefined): string {
      return ASSAY_LEVEL_LABELS[level as keyof typeof ASSAY_LEVEL_LABELS] ?? level ?? '—'
    },
    levelClass(level: string | null | undefined): string {
      return LEVEL_BUCKET_CLASSES[assayLevelBucket(level)]
    }
  }
})
</script>
