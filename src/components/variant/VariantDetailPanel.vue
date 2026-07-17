<template>
  <div
    :class="
      flush
        ? 'border-t border-border-light bg-surface'
        : 'mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-surface'
    "
  >
    <!-- Loading / error -->
    <div v-if="status === 'loading'" class="flex items-center justify-center px-5 py-4">
      <MvLoader text="Loading variant..." />
    </div>
    <div v-else-if="status === 'error'" class="flex items-center justify-center gap-2 px-5 py-4 text-sm text-red-600">
      <span class="flex items-center">Could not load variant detail.</span>
      <button type="button" class="font-semibold text-link hover:underline" @click="fetchDetail(urn)">Retry</button>
    </div>

    <template v-else-if="detail">
      <!-- Identity -->
      <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pb-3 pt-3.5 tablet:px-5">
        <span class="font-mono text-base font-bold leading-none text-text-primary">{{ coordinate || detail.urn }}</span>
        <span
          v-if="underlyingCoordinate && underlyingCoordinate !== coordinate"
          v-tooltip.top="'Underlying nucleotide coordinate'"
          class="font-mono text-xs text-text-muted"
        >
          {{ underlyingCoordinate }}
        </span>
      </div>

      <!-- Facts -->
      <div class="grid grid-cols-2 gap-px border-t border-border-light bg-border-light tablet:grid-cols-4">
        <div class="stat">
          <span v-key-term="'consequence'" class="stat-label">Molecular consequence</span>
          <span class="stat-value font-semibold">{{
            consequence?.consequence ? formatToken(consequence.consequence) : '—'
          }}</span>
          <span class="mt-auto text-[10px] text-text-muted">
            As of VEP version {{ consequence?.sourceVersion ?? '—' }}</span
          >
        </div>

        <div class="stat">
          <span v-key-term="'functional-impact'" class="stat-label">Classification</span>
          <span v-if="selectedClassification" class="flex flex-wrap items-center gap-1.5">
            <span class="rounded px-1.5 py-0.5 text-xs-plus" :class="classificationClass">
              {{ formatToken(selectedClassification.classification.functionalClassification) }}
            </span>
            <MvEvidenceTag v-if="acmgCode" :code="acmgCode" />
          </span>
          <span v-else class="stat-value font-semibold">—</span>
          <template v-if="oddspathsRatio != null">
            <span class="stat-value font-semibold flex flex-wrap items-center mt-0.5 gap-x-1.5 gap-y-0.5">
              <span class="text-text-muted">OddsPath</span>
              <span class="text-text-muted">{{ oddspathsRatio }}</span>
            </span>
          </template>
        </div>

        <VariantGnomadStat :alleles="detail.alleles" :annotations="detail.annotations" :assay-gnomad="gnomad" />
        <VariantClinvarStat
          :alleles="detail.alleles"
          :annotations="detail.annotations"
          :assay-level-digest="detail.assayLevelDigest"
          :clinvar-version="clinvarVersion"
        />
      </div>

      <!-- Status and Links -->
      <div
        class="border-t border-border-light bg-surface flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pb-3 pt-3.5 tablet:px-5"
      >
        <span
          v-if="!detail.isCurrent"
          v-tooltip.top="supersededTooltip"
          class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
        >
          <i class="pi pi-exclamation-triangle text-[10px]" />
          <span v-key-term="'superseded'">Superseded</span>
        </span>
        <router-link
          v-if="detail.clingenAlleleId"
          class="ml-auto shrink-0 text-xs font-semibold text-link hover:underline"
          :to="{name: 'variant', params: {clingenAlleleId: detail.clingenAlleleId}, query: {variant: detail.urn}}"
        >
          View full details <i class="pi pi-arrow-right text-[10px]" />
        </router-link>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import VariantGnomadStat from '@/components/variant/VariantGnomadStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import {getVariantDetail} from '@/api/mavedb/variants'
import type {components} from '@/schema/openapi'

type VariantDetail = components['schemas']['VariantDetail']
type VariantClassification = components['schemas']['VariantClassification']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']

/**
 * Compact selected-variant summary for the score-set page, consuming `GET /variants/{urn}`.
 *
 * Deliberately lean: assay-level facts (identity, consequence, the selected calibration's classification)
 * plus two annotation cells that reach past the assayed allele — {@link VariantGnomadStat} and
 * {@link VariantClinvarStat}. These each own their own presentation and their fold/enumeration wiring to sibling
 * alleles.
 *
 * Coordinates follow the page's current frame; the classification follows the page's selected calibration. A
 * parent supplies `clinvarVersion` so the ClinVar cell reduces over the same release as any parent components.
 */
export default defineComponent({
  name: 'VariantDetailPanel',

  components: {MvEvidenceTag, MvLoader, VariantGnomadStat, VariantClinvarStat},

  props: {
    urn: {type: String, required: true},
    // The display label for the variant in the page's current frame.
    coordinate: {type: String as PropType<string | null>, default: null},
    // The underlying nucleotide HGVS in the current frame. Shown muted beside the (protein-preferred)
    // primary label to disambiguate distinct coding variants that collapse to the same protein change.
    // Empty when there is no underlying nucleotide coordinate.
    underlyingCoordinate: {type: String as PropType<string | null>, default: null},
    // The calibration selected on the page (its numeric id); its classification is the one shown.
    selectedCalibrationId: {type: Number as PropType<number | null>, default: null},
    // The ClinVar release the page's clinical-controls store has selected (raw `MM_YYYY`), passed through to
    // the ClinVar cell so it reduces over the same release as parent components. Null → fall back to latest.
    clinvarVersion: {type: String as PropType<string | null>, default: null},
    // When embedded inside another card (e.g. under the search box), drop the panel's own card chrome
    // and separate from the row above with just a top divider, so the two read as one unit.
    flush: {type: Boolean, default: false}
  },

  data() {
    return {
      detail: null as VariantDetail | null,
      status: 'idle' as 'idle' | 'loading' | 'loaded' | 'error'
    }
  },

  computed: {
    // The assay-level allele's annotation block — the one relevant to this measurement.
    assayAnnotations(): AlleleAnnotations | null {
      const digest = this.detail?.assayLevelDigest
      if (!this.detail?.annotations || !digest) return null
      return this.detail.annotations[digest] ?? null
    },
    consequence(): AlleleAnnotations['vep'] | null {
      return this.assayAnnotations?.vep ?? null
    },
    gnomad(): AlleleAnnotations['gnomad'] | null {
      return this.assayAnnotations?.gnomad ?? null
    },
    // The classification for the page's selected calibration; falls back to primary, then first.
    selectedClassification(): VariantClassification | null {
      const classifications = this.detail?.classifications ?? []
      if (this.selectedCalibrationId != null) {
        const match = classifications.find((c) => c.calibrationId === this.selectedCalibrationId)
        if (match) return match
      }
      return classifications.find((c) => c.primary) ?? classifications[0] ?? null
    },
    oddspathsRatio(): number | null {
      return this.selectedClassification?.classification.oddspathsRatio ?? null
    },
    classificationClass(): string {
      return `mave-classification-${this.selectedClassification?.classification.functionalClassification ?? 'not_specified'}`
    },
    acmgCode(): string | null {
      const acmg = this.selectedClassification?.classification.acmgClassification
      if (!acmg?.evidenceStrength) return null
      return `${acmg.criterion}_${acmg.evidenceStrength.toUpperCase()}`
    },
    supersededTooltip(): string {
      // Supersession is anchored on the score set, not the variant: the newer version may not contain a
      // corresponding variant, so we never imply a navigable superseding measurement.
      return this.detail?.supersededByScoreSet
        ? `Superseded by score set ${this.detail.supersededByScoreSet}. That version may not contain a corresponding variant.`
        : 'This measurement is from a superseded version of its score set. The newer version may not contain a corresponding variant.'
    }
  },

  watch: {
    urn: {immediate: true, handler: 'fetchDetail'}
  },

  methods: {
    async fetchDetail(urn: string) {
      if (!urn) return
      this.status = 'loading'
      this.detail = null
      try {
        const detail = await getVariantDetail(urn)
        if (this.urn !== urn) return // selection changed mid-flight
        this.detail = detail
        this.status = 'loaded'
      } catch (error) {
        if (this.urn !== urn) return
        console.error(`Error fetching variant detail for "${urn}"`, error)
        this.status = 'error'
      }
    },
    formatToken(value: string | null | undefined): string {
      if (!value) return '—'
      return value.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
    }
  }
})
</script>

<style scoped>
/* Each fact is its own cell on a shared light background; the 1px grid gap draws the dividers. The two
   annotation cells ({@link VariantGnomadStat}/{@link VariantClinvarStat}) mirror this .stat styling. */
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
