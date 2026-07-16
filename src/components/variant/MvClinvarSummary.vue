<template>
  <div class="flex h-full flex-col gap-0.5 leading-snug">
    <!-- A germline-less (`-`) record carries no call or review status — name the state; the link-out stays below. -->
    <span v-if="!classified" class="text-sm italic text-text-muted">{{
      formatClinicalSignificance(clinvar.clinicalSignificance)
    }}</span>
    <template v-else>
      <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span class="text-text-primary" :style="{color}">{{ clinvar.clinicalSignificance }}</span>
        <span
          :aria-label="`${stars} of 4 stars — ${clinvar.clinicalReviewStatus}`"
          class="inline-flex items-center gap-px"
          role="img"
        >
          <i
            v-for="n in 4"
            :key="n"
            class="pi text-[10px]"
            :class="n <= stars ? 'pi-star-fill text-amber-400' : 'pi-star text-border'"
          />
        </span>
      </div>
      <span class="flex text-[10px] text-text-muted">({{ clinvar.clinicalReviewStatus }})</span>
    </template>
    <template v-if="showProvenance">
      <span class="flex mt-auto text-[10px] text-text-muted">
        <span>As of ClinVar {{ formatClinvarVersion(clinvar.dbVersion) }} ·&nbsp</span>
        <a
          v-if="url"
          class="text-link font-semibold hover:underline"
          :href="url"
          rel="noopener noreferrer"
          target="_blank"
        >
          view in ClinVar
        </a>
      </span>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {
  CLINVAR_REVIEW_STATUS_STARS,
  clinicalSignificanceColor,
  clinvarVariantUrl,
  formatClinicalSignificance,
  formatClinvarVersion,
  isClassifiedSignificance
} from '@/lib/clinvar-controls'
import type {components} from '@/schema/openapi'

type ClinvarAnnotation = components['schemas']['ClinvarAnnotation']

/** Rich display of one ClinVar annotation: significance, gold-star review rating, and a deep link. */
export default defineComponent({
  name: 'MvClinvarSummary',

  props: {
    clinvar: {type: Object as PropType<ClinvarAnnotation>, required: true},
    showProvenance: {type: Boolean, default: true}
  },

  computed: {
    classified(): boolean {
      return isClassifiedSignificance(this.clinvar.clinicalSignificance)
    },
    stars(): number {
      return CLINVAR_REVIEW_STATUS_STARS[this.clinvar.clinicalReviewStatus] ?? 0
    },
    color(): string | undefined {
      return clinicalSignificanceColor(this.clinvar.clinicalSignificance)
    },
    url(): string | null {
      return clinvarVariantUrl(this.clinvar)
    }
  },

  methods: {
    formatClinvarVersion,
    formatClinicalSignificance
  }
})
</script>
