<template>
  <div
    class="measurement-card relative flex tablet:min-w-[360px] tablet:flex-[1_0_360px] cursor-pointer flex-col rounded-lg border-2 border-border bg-surface px-3.5 tablet:px-[18px] py-4 transition-[border-color,box-shadow] duration-150 hover:border-mint"
    :class="active ? 'border-sage shadow-[0_0_0_1px_var(--color-sage)]' : ''"
    @click="$emit('select')"
  >
    <!-- Loading affordance for the active card while its detail/scores resolve — confirms the switch
         registered even though the card body itself renders from already-loaded measurement data. -->
    <i
      v-if="loading"
      aria-label="Loading variant details"
      class="pi pi-spin pi-spinner absolute right-2.5 top-2.5 text-xs text-sage"
    />
    <div class="mb-2.5 flex flex-wrap items-center gap-1.5">
      <span
        v-key-term="'assay-level'"
        class="inline-block rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
        :class="levelClass"
      >
        {{ levelLabel }}
      </span>
      <span
        v-key-term="'relationship'"
        class="inline-block rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
        :class="relationship === 'direct' ? 'bg-sage/15 text-sage' : 'bg-border-light text-text-muted'"
      >
        {{ relationshipLabel }}
      </span>
    </div>
    <div class="text-xs-plus font-semibold leading-[1.3] text-text-primary">{{ scoreSetTitle }}</div>
    <!-- The URN disambiguates correlated score sets whose title/assay facts are otherwise identical. -->
    <div v-if="scoreSetUrn" class="mb-2 mt-0.5 font-mono text-[10px] text-text-muted">{{ scoreSetUrn }}</div>
    <div v-else class="mb-2"></div>
    <!-- Assay facts -->
    <div class="flex flex-col gap-[3px] text-xs-minus text-text-muted">
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Assay type</span>
        <span class="text-text-secondary">{{ assayType || 'Not specified' }}</span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Mechanism</span>
        <span class="text-text-secondary">{{ mechanism || 'Not specified' }}</span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="fact-label min-w-[80px] shrink-0 font-semibold text-[#aaa]">Model system</span>
        <span class="text-text-secondary">{{ modelSystem || 'Not specified' }}</span>
      </div>
    </div>
    <!-- Variant facts -->
    <div class="mt-auto border-t border-border-light pt-3">
      <div v-if="score != null" class="mb-2 flex items-center gap-2.5 text-xs-minus text-text-muted">
        <span class="text-[10px] font-bold uppercase tracking-[0.3px] text-[#aaa]">Functional score</span>
        <strong class="font-mono font-bold text-text-secondary">{{ score.toPrecision(4) }}</strong>
      </div>
      <div v-if="classification || evidenceCode" class="mt-1.5">
        <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.3px] text-[#aaa]">Classified as</span>
        <div class="flex flex-wrap items-center gap-1.5">
          <MvClassificationTag v-if="classification" v-key-term="'consequence'" :classification="classification" />
          <MvEvidenceTag v-if="evidenceCode" v-key-term="'acmg'" :code="evidenceCode" />
          <span v-if="oddspathsRatio != null" v-key-term="'acmg'" class="text-xs text-text-muted"
            >(OddsPath {{ oddspathsRatio.toPrecision(3) }})</span
          >
        </div>
      </div>
      <div v-if="!classification && !evidenceCode" class="flex items-center gap-1.5">
        <span class="text-xs italic text-text-muted">No primary classification</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import {
  assayLevelBucket,
  LEVEL_BUCKET_CLASSES,
  LEVEL_BUCKET_LABELS,
  RELATIONSHIP_LABELS,
  type MeasurementRelationship
} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type SavedFunctionalClassification = components['schemas']['SavedFunctionalClassification']

export default defineComponent({
  name: 'MvMeasurementCard',

  components: {
    MvClassificationTag,
    MvEvidenceTag
  },

  props: {
    active: {type: Boolean, default: false},
    // Shown only on the active card, while the selected variant's detail/scores are still loading.
    loading: {type: Boolean, default: false},
    // The assayed level (AnnotationLayer: protein/cdna/genomic) — drives the level badge.
    assayLevel: {type: [String, null] as PropType<string | null>, default: null},
    // How the measurement relates to the queried ClinGen allele (direct / RT-related).
    relationship: {type: String as PropType<MeasurementRelationship>, required: true},
    // Score set attributes displayed on the card body.
    scoreSetTitle: {type: String, default: ''},
    scoreSetUrn: {type: [String, null] as PropType<string | null>, default: null},
    score: {type: [Number, null] as PropType<number | null>, default: null},
    assayType: {type: [String, null] as PropType<string | null>, default: null},
    mechanism: {type: [String, null] as PropType<string | null>, default: null},
    modelSystem: {type: [String, null] as PropType<string | null>, default: null},
    // The server-preferred functional classification, inline on the measurement (no scores fetch needed).
    preferredClassification: {
      type: [Object, null] as PropType<SavedFunctionalClassification | null>,
      default: null
    }
  },

  emits: ['select'],

  computed: {
    levelLabel(): string {
      return LEVEL_BUCKET_LABELS[assayLevelBucket(this.assayLevel)].full
    },
    levelClass(): string {
      return LEVEL_BUCKET_CLASSES[assayLevelBucket(this.assayLevel)]
    },
    relationshipLabel(): string {
      return RELATIONSHIP_LABELS[this.relationship] ?? this.relationship
    },
    classification(): string | null {
      return this.preferredClassification?.functionalClassification ?? null
    },
    evidenceCode(): string | null {
      const acmg = this.preferredClassification?.acmgClassification
      if (!acmg?.evidenceStrength) return null
      return `${acmg.criterion}_${acmg.evidenceStrength.toUpperCase()}`
    },
    oddspathsRatio(): number | null {
      return this.preferredClassification?.oddspathsRatio ?? null
    }
  }
})
</script>

<style scoped>
/* Conditional pseudo-element — only shown when card is active */
.measurement-card.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-sage);
  border-radius: 6px 6px 0 0;
}

/* Pseudo-element to append colon to fact labels */
.fact-label::after {
  content: ':';
}
</style>
