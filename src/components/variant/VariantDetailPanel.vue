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
    <div v-else-if="status === 'error'" class="px-5 py-4 text-sm text-red-600">Could not load variant detail.</div>

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
          <span class="stat-label">Consequence</span>
          <span class="stat-value font-semibold">{{ consequence ? formatToken(consequence) : '—' }}</span>
        </div>

        <div class="stat">
          <span class="stat-label">Classification</span>
          <span v-if="selectedClassification" class="flex flex-wrap items-center gap-1.5">
            <span class="rounded px-1.5 py-0.5 text-xs-plus" :class="classificationClass">
              {{ formatToken(selectedClassification.classification.functionalClassification) }}
            </span>
            <MvEvidenceTag v-if="acmgCode" :code="acmgCode" />
          </span>
          <span v-else class="stat-value font-semibold">—</span>
          <span v-if="oddspathsRatio != null" class="mt-0.5 text-xs"> OddsPath {{ oddspathsRatio }} </span>
        </div>

        <div class="stat">
          <span class="stat-label">gnomAD</span>
          <a
            v-if="gnomad"
            class="stat-value font-semibold hover:underline"
            :href="`https://gnomad.broadinstitute.org/variant/${gnomad.dbIdentifier}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            AF {{ formatFrequency(gnomad.alleleFrequency) }}
          </a>
          <span v-else class="stat-value">—</span>
          <span v-if="gnomad?.faf95Max != null" class="text-xs text-text-muted">
            FAF95 {{ formatFrequency(gnomad.faf95Max) }}
          </span>
        </div>

        <div class="stat">
          <span class="stat-label">ClinVar</span>
          <a
            v-if="latestClinvar?.clinvarVariationId"
            class="stat-value font-semibold hover:underline"
            :style="{color: clinvarColor}"
            :href="`https://www.ncbi.nlm.nih.gov/clinvar/?term=${latestClinvar.clinvarAlleleId}[alleleId]`"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ latestClinvar.clinicalSignificance }}
          </a>
          <span v-else-if="latestClinvar" class="stat-value font-semibold" :style="{color: clinvarColor}">
            {{ latestClinvar.clinicalSignificance }}
          </span>
          <span v-else class="stat-value">—</span>
          <span
            v-if="clinvarStars != null"
            v-tooltip.top="latestClinvar?.clinicalReviewStatus"
            class="flex items-center gap-0.5 text-amber-400"
            aria-label="ClinVar review stars"
          >
            <i
              v-for="n in 4"
              :key="n"
              :class="n <= clinvarStars ? 'pi pi-star-fill' : 'pi pi-star'"
              class="text-[9px]"
            />
          </span>
          <span v-if="latestClinvar" class="text-xs text-text-muted"
            >As of {{ formatClinvarVersion(latestClinvar.dbVersion) }}</span
          >
        </div>
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
          Superseded
        </span>
        <router-link
          v-if="detail.clingenAlleleId"
          class="ml-auto shrink-0 text-xs font-semibold text-link hover:underline"
          :to="{name: 'variant', params: {clingenAlleleId: detail.clingenAlleleId}}"
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
import {getVariantDetail} from '@/api/mavedb/variants'
import {formatClinvarVersion} from '@/lib/formats'
import {CLINVAR_REVIEW_STATUS_STARS} from '@/lib/clinical-controls'
import type {components} from '@/schema/openapi'

type VariantDetail = components['schemas']['VariantDetail']
type VariantClassification = components['schemas']['VariantClassification']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']

/**
 * Compact selected-variant summary for the score-set page, consuming `GET /variants/{urn}`.
 *
 * Deliberately lean: the assay-level facts only (identity, consequence, the selected calibration's
 * classification, the assay allele's key annotations) as distinct, color-coded stats, plus a link out
 * to the full variant page. Coordinates follow the page's current frame; the classification follows the
 * page's selected calibration. The deep per-allele annotation breakdown and the Cat-VRS structure
 * belong on the dedicated variant page — VRS digests are join keys, never surfaced here.
 */
export default defineComponent({
  name: 'VariantDetailPanel',

  components: {MvEvidenceTag, MvLoader},

  props: {
    urn: {type: String, required: true},
    // The display label for the variant in the page's current frame — the SAME string the search box
    // and heatmap use (`labelForVariant`, protein-preferred). Passed in so the panel's identity never
    // disagrees with the rest of the page (e.g. panel showing coding while the heatmap shows protein).
    coordinate: {type: String, default: ''},
    // The underlying nucleotide HGVS in the current frame. Shown muted beside the (protein-preferred)
    // primary label to disambiguate distinct coding variants that collapse to the same protein change,
    // and as provenance for the actually-measured coordinate. Empty when it equals the primary label.
    underlyingCoordinate: {type: String, default: ''},
    // The calibration selected on the page (its numeric id); its classification is the one shown.
    selectedCalibrationId: {type: Number as PropType<number | null>, default: null},
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
    consequence(): string | null {
      return this.assayAnnotations?.vep?.consequence ?? null
    },
    gnomad(): AlleleAnnotations['gnomad'] | null {
      return this.assayAnnotations?.gnomad ?? null
    },
    latestClinvar(): NonNullable<AlleleAnnotations['clinvar']>[number] | null {
      const clinvar = this.assayAnnotations?.clinvar
      if (!clinvar?.length) return null
      return clinvar.reduce((best, c) => (c.dbVersion > best.dbVersion ? c : best))
    },
    clinvarStars(): number | null {
      const status = this.latestClinvar?.clinicalReviewStatus?.toLowerCase()
      if (!status) return null
      const stars = CLINVAR_REVIEW_STATUS_STARS[status] ?? null
      return stars != null ? stars : null
    },
    clinvarColor(): string | undefined {
      const s = this.latestClinvar?.clinicalSignificance?.toLowerCase() ?? ''
      if (s.includes('conflicting')) return undefined
      if (s.includes('pathogenic')) return 'var(--color-badge-pathogenic)'
      if (s.includes('benign')) return 'var(--color-badge-benign)'
      return undefined
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
      return this.detail?.supersededByScoreSet
        ? `Superseded by score set ${this.detail.supersededByScoreSet}`
        : 'This measurement has been superseded by a newer version.'
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
    },
    formatFrequency(value: number | null | undefined): string {
      if (value == null) return '—'
      return value < 0.0001 ? value.toExponential(2) : value.toPrecision(3)
    },
    formatClinvarVersion
  }
})
</script>

<style scoped>
/* Each fact is its own cell on a shared light background; the 1px grid gap draws the dividers. */
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
