<template>
  <!-- Sits flush inside the score-set page's variant card, which owns the frame. -->
  <div class="border-t border-border-light bg-surface">
    <!-- Loading / error -->
    <div v-if="status === 'loading'" class="flex items-center justify-center px-5 py-4">
      <MvLoader text="Loading variant..." />
    </div>
    <div v-else-if="status === 'error'" class="flex items-center justify-center gap-2 px-5 py-4 text-sm text-red-600">
      <span class="flex items-center">Could not load variant detail.</span>
      <button class="font-semibold text-link hover:underline" type="button" @click="fetchDetail(urn)">Retry</button>
    </div>

    <template v-else-if="detail">
      <!-- Identity + score headline: coordinate, its alternate nucleotide spelling when one disambiguates,
           and the score (or "Not scored") pushed right. Always shown — an unscored selection still needs
           to report its measurement here, since the histogram may have no bar to jump to. -->
      <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pb-3 pt-3.5 tablet:px-5">
        <span class="font-mono text-base font-bold leading-none text-text-primary">{{ coordinate || detail.urn }}</span>
        <span
          v-if="hasAlternateSpelling"
          v-tooltip.top="'Underlying nucleotide coordinate'"
          class="font-mono text-xs text-text-muted"
        >
          {{ underlyingCoordinate }}
        </span>
        <span class="ml-auto flex items-baseline gap-1.5 leading-none">
          <span class="mave-label">Score</span>
          <span v-if="score != null" class="font-mono text-base font-bold text-text-primary">{{
            formatScore(score)
          }}</span>
          <span v-else class="text-xs font-semibold italic text-text-muted">Not scored</span>
        </span>
      </div>

      <!-- Facts -->
      <div
        v-if="anyAnnotationsAvailable"
        class="grid grid-cols-2 gap-px border-t border-border-light bg-border-light tablet:grid-cols-4"
      >
        <VariantConsequenceStat :vep="consequence" />
        <div class="stat">
          <span v-key-term="'functional-impact'" class="mave-label w-fit">Functional impact</span>
          <span v-if="selectedClassification" class="flex flex-wrap items-center gap-1.5">
            <MvClassificationTag
              :classification="selectedClassification.classification.functionalClassification ?? 'not_specified'"
              compact
            />
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

        <VariantGnomadStat
          :alleles="detail.alleles"
          :annotations="detail.annotations"
          :assay-gnomad="gnomad"
          :assay-level="detail.assayLevel"
          :assay-level-digest="detail.assayLevelDigest"
        />
        <VariantClinvarStat
          :alleles="detail.alleles"
          :annotations="detail.annotations"
          :assay-level="detail.assayLevel"
          :assay-level-digest="detail.assayLevelDigest"
          :clinvar-version="clinvarVersion"
        />
      </div>

      <!-- No direct facts. A reverse-translation fan-out isn't "nothing": name candidate nucleotides
           even if the protein change itself has no direct annotations. -->
      <p v-else-if="candidateFanoutCount > 0" class="px-4 py-3 text-xs text-text-muted tablet:px-5">
        This amino-acid change reverse-translates to {{ candidateFanoutCount }} candidate nucleotide allele{{
          candidateFanoutCount === 1 ? '' : 's'
        }}; no population or clinical evidence was found for this allele or the candidate nucleotide alleles.
      </p>
      <p v-else class="px-4 py-3 text-xs text-text-muted tablet:px-5">
        No reference annotations were found for this allele.
      </p>

      <!-- Status and links — the superseded badge and full-details link, shown below either the facts
           grid or the empty state above. -->
      <div
        v-if="!detail.isCurrent || detail.clingenAlleleId || classificationCalibration"
        class="border-t border-border-light bg-surface flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pb-3 pt-3.5 tablet:px-5"
      >
        <span
          v-if="!detail.isCurrent"
          v-key-term="'superseded'"
          class="inline-flex items-center gap-1 rounded-full bg-superseded-light px-2 py-0.5 text-xs font-semibold text-superseded"
        >
          <i class="pi pi-exclamation-triangle text-[10px]" />
          <span>Superseded</span>
        </span>
        <!-- The calibration behind the call above, as the variant page's Functional evidence footer names it. -->
        <span
          v-if="classificationCalibration"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary"
        >
          <span v-key-term="'calibration'" class="mave-label">Calibration</span>
          <span>{{ classificationCalibration.title }}</span>
          <span v-if="classificationCalibration.primary" v-key-term="'calibration'" class="mave-tag mave-tag-primary"
            >Primary</span
          >
          <span
            v-if="classificationCalibration.researchUseOnly"
            v-key-term="'calibration'"
            class="mave-tag mave-tag-ruo"
            >Research use only</span
          >
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

import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import VariantConsequenceStat from '@/components/variant/VariantConsequenceStat.vue'
import VariantGnomadStat from '@/components/variant/VariantGnomadStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import {getVariantDetail} from '@/api/mavedb/variants'
import {groupAlleles} from '@/lib/allele-grouping'
import {collectGnomadFrequencies} from '@/lib/gnomad'
import {formatScore} from '@/lib/scores'
import {enumerateUnderlyingClinvar, resolveClinvarRecords} from '@/lib/clinvar-controls'
import {resolveClinvarHeadline} from '@/lib/clinvar-control-placement'
import type {components} from '@/schema/openapi'

type VariantDetail = components['schemas']['VariantDetail']
type VariantClassification = components['schemas']['VariantClassification']
type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type ScoreCalibration = components['schemas']['ScoreCalibration']

/**
 * Compact selected-variant summary for the score-set page, consuming `GET /variants/{urn}`.
 *
 * Deliberately lean: assay-level facts (identity, consequence {@link VariantConsequenceStat}, the selected calibration's classification)
 * plus two annotation cells that reach past the assayed allele — {@link VariantGnomadStat} and
 * {@link VariantClinvarStat}. These each own their own presentation and their fold/enumeration wiring to the encoding
 * alleles.
 *
 * Coordinates follow the page's current frame; the classification follows the page's selected calibration. A
 * parent supplies `clinvarVersion` so the ClinVar cell reduces over the same release as any parent components.
 */
export default defineComponent({
  name: 'VariantDetailPanel',

  components: {
    MvClassificationTag,
    MvEvidenceTag,
    MvLoader,
    VariantConsequenceStat,
    VariantGnomadStat,
    VariantClinvarStat
  },

  props: {
    urn: {type: String, required: true},
    // The display label for the variant in the page's current frame.
    coordinate: {type: String as PropType<string | null>, default: null},
    // The underlying nucleotide HGVS in the current frame. Shown muted beside the (protein-preferred)
    // primary label to disambiguate distinct coding variants that collapse to the same protein change.
    // Empty when there is no underlying nucleotide coordinate.
    underlyingCoordinate: {type: String as PropType<string | null>, default: null},
    // The variant's functional score, or null for an NA/absent score. Rendered in the headline so a
    // selection still reports its measurement even when the histogram has no bar to jump to.
    score: {type: Number as PropType<number | null>, default: null},
    // The calibration selected on the page (its numeric id); its classification is the one shown.
    selectedCalibrationId: {type: Number as PropType<number | null>, default: null},
    // The ClinVar release the page's clinical-controls store has selected (raw `MM_YYYY`), passed through to
    // the ClinVar cell so it reduces over the same release as parent components. Null → fall back to latest.
    clinvarVersion: {type: String as PropType<string | null>, default: null},
    // The score set's calibrations, to name the one behind the shown call; classifications carry only an id.
    calibrations: {type: Array as PropType<ScoreCalibration[]>, default: () => []}
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
    // The calibration that produced the shown call, from the score set's list (classifications carry only an id).
    classificationCalibration(): ScoreCalibration | null {
      const id = this.selectedClassification?.calibrationId
      return id != null ? (this.calibrations.find((c) => c.id === id) ?? null) : null
    },
    oddspathsRatio(): number | null {
      return this.selectedClassification?.classification.oddspathsRatio ?? null
    },
    acmgCode(): string | null {
      const acmg = this.selectedClassification?.classification.acmgClassification
      if (!acmg?.evidenceStrength) return null
      return `${acmg.criterion}_${acmg.evidenceStrength.toUpperCase()}`
    },
    hasGnomad(): boolean {
      if (this.gnomad) return true
      return collectGnomadFrequencies(this.detail?.annotations ?? {}, this.detail?.alleles ?? {}).length > 0
    },
    hasClinvar(): boolean {
      const records = resolveClinvarRecords(
        this.detail?.annotations ?? {},
        this.detail?.alleles ?? {},
        this.detail?.assayLevelDigest ?? null,
        this.clinvarVersion
      )
      const headline = resolveClinvarHeadline(
        records,
        this.detail?.assayLevelDigest ?? null,
        this.detail?.assayLevel ?? null
      )
      return headline.kind !== 'none' || enumerateUnderlyingClinvar(records).length > 0
    },
    // The facts grid only earns its place when a cell resolves; otherwise it's four dashes (clutter), and the
    // template falls back to an empty state instead.
    anyAnnotationsAvailable(): boolean {
      return !!this.consequence?.consequence || this.selectedClassification != null || this.hasGnomad || this.hasClinvar
    },
    // Count of `candidate`-derivation groups: a protein change reverse-translates to N candidate nucleotide
    // alleles (ambiguous codon choice). Grouped so a candidate's c↔g spellings count once. Lets the empty
    // state say "no direct evidence, but a fan-out exists" instead of asserting a blanket absence — the
    // candidates carry their own (VEP) consequence, reachable via full details, so "nothing found" is false.
    candidateFanoutCount(): number {
      if (!this.detail?.alleles) return 0
      return groupAlleles({
        alleles: this.detail.alleles,
        annotations: this.detail.annotations ?? {},
        pageClingenAlleleId: this.detail.clingenAlleleId ?? null
      }).filter((group) => group.derivation === 'candidate').length
    },
    // A distinct underlying nucleotide coordinate — an alternate spelling worth keeping the identity line for,
    // so it disambiguates coding variants that collapse to the same protein change.
    hasAlternateSpelling(): boolean {
      return !!this.underlyingCoordinate && this.underlyingCoordinate !== this.coordinate
    }
  },

  watch: {
    urn: {immediate: true, handler: 'fetchDetail'}
  },

  methods: {
    formatScore,

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

.stat-value {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}
</style>
