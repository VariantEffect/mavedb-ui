<template>
  <MvLayout>
    <template #header>
      <MvPageHeader eyebrow="Variant" max-width="1000px" :title="pageTitle">
        <template v-if="lookup.variants.value.length > 0" #actions>
          <div class="hidden tablet:block">
            <SplitButton
              :model="annotatedVariantDownloadOptions"
              severity="secondary"
              size="small"
              @click="annotatedVariantDownloadOptions[0]?.command"
            >
              <template #default>
                <i class="pi pi-download mr-1.5 text-xs" />
                Download annotations
              </template>
            </SplitButton>
          </div>
          <MvRowActionMenu :actions="downloadActions" class="tablet:hidden" />
        </template>
        <template v-if="lookup.variants.value.length > 0" #subtitle>
          <p class="mt-2 text-sm text-text-muted">
            <template v-if="lookup.geneName.value">{{ lookup.geneName.value }} &middot; </template>
            <template v-if="lookup.clingenAllele.genomicLocationText.value"
              >{{ lookup.clingenAllele.genomicLocationText.value }} &middot;
            </template>
            {{ lookup.variants.value.length }}
            {{ lookup.variants.value.length === 1 ? 'measurement' : 'measurements' }}
            <template v-if="lookup.uniqueAssayCount.value > 1">
              across {{ lookup.uniqueAssayCount.value }} assays</template
            >
          </p>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto w-full px-4 tablet:px-6 py-6 tablet:py-8" style="max-width: 1000px">
      <!-- Error state -->
      <MvErrorState v-if="lookup.variantsStatus.value === 'Error'" @retry="lookup.fetchVariants" />

      <!-- Loading state -->
      <MvPageLoading v-else-if="lookup.variantsStatus.value === 'Loading'" text="Loading variant measurements..." />

      <!-- Empty state -->
      <MvEmptyState
        v-else-if="lookup.variants.value.length === 0"
        description="No variants were found for this allele."
        title="No variants found"
      />

      <template v-else>
        <!-- ── MEASUREMENTS SECTION ───────────────────────────── -->
        <div class="rounded-lg border border-border bg-surface">
          <div class="flex flex-wrap items-center gap-2.5 border-b border-border-light px-4 tablet:px-5 py-3.5">
            <span class="text-sm font-bold text-text-primary"
              >{{ lookup.variants.value.length }}
              {{ lookup.variants.value.length === 1 ? 'Measurement' : 'Measurements' }}</span
            >
            <div class="ml-auto flex gap-1.5">
              <MvBadgeToggle
                v-if="lookup.nucleotideCount.value > 0"
                v-model="lookup.showNucleotide.value"
                active-background="var(--color-nucleotide-light)"
                active-border="var(--color-nucleotide-border)"
                color="var(--color-nucleotide)"
                :count="lookup.nucleotideCount.value"
                label="Nucleotide level"
              />
              <MvBadgeToggle
                v-if="lookup.proteinCount.value > 0"
                v-model="lookup.showProtein.value"
                active-background="var(--color-protein-light)"
                active-border="var(--color-protein-border)"
                color="var(--color-protein)"
                :count="lookup.proteinCount.value"
                label="Protein level"
              />
            </div>
          </div>
          <!-- Desktop: horizontal scroll strip -->
          <div class="measurement-switcher hidden tablet:flex gap-3 overflow-x-auto px-5 py-4">
            <MvMeasurementCard
              v-for="variant in lookup.filteredVariants.value"
              :key="'desktop-' + (variant.content.urn ?? variant.content.id)"
              :abnormal-odds-path="lookup.getAbnormalOddsPath(variant.content.urn)"
              :active="lookup.selectedVariantUrn.value === variant.content.urn"
              :assay-type="lookup.getKeyword(variant.content, 'Phenotypic Assay Method')"
              :classification="lookup.getVariantClassification(variant.content.urn)"
              :evidence-code="lookup.getVariantEvidenceCode(variant.content.urn)"
              :mechanism="lookup.getKeyword(variant.content, 'Molecular Mechanism Assessed')"
              :model-system="lookup.getKeyword(variant.content, 'Phenotypic Assay Model System')"
              :normal-odds-path="lookup.getNormalOddsPath(variant.content.urn)"
              :study-title="variant.content.scoreSet?.title || 'Untitled score set'"
              :type="variant.type"
              @select="lookup.selectVariant(variant.content.urn)"
            />
          </div>
          <!-- Mobile: dropdown selector -->
          <div class="tablet:hidden px-4 py-3">
            <PSelect
              class="w-full"
              :model-value="lookup.selectedVariantUrn.value"
              option-label="label"
              option-value="urn"
              :options="measurementOptions"
              @update:model-value="lookup.selectVariant($event)"
            />
          </div>
        </div>

        <!-- ── VARIANT & ASSAY DETAILS ──────────────────────── -->
        <template v-if="lookup.selectedVariantDetail.value">
          <!-- Desktop: single card with two columns -->
          <div
            class="mave-gradient-bar relative mt-6 hidden tablet:block rounded-lg border border-border bg-surface px-[18px] py-3.5"
          >
            <div class="grid grid-cols-2">
              <div class="border-r border-border-light pr-[18px]">
                <VariantInfoSection
                  :allele-name="lookup.clingenAllele.alleleName.value"
                  :classification="lookup.calibrationResolution.classification.value"
                  :clingen-allele-id="lookup.selectedClingenAlleleId.value"
                  :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
                  :genomic-locations="lookup.clingenAllele.genomicLocations.value"
                />
              </div>
              <div class="pl-[18px]">
                <MvAssayFactsCard
                  :score-set="lookup.selectedScoreSet.value ?? undefined"
                  :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined"
                />
              </div>
            </div>
          </div>

          <!-- Mobile: separate cards -->
          <div
            class="mt-6 tablet:hidden mave-gradient-bar relative rounded-lg border border-border bg-surface px-4 py-3.5"
          >
            <VariantInfoSection
              :allele-name="lookup.clingenAllele.alleleName.value"
              :classification="lookup.calibrationResolution.classification.value"
              :clingen-allele-id="lookup.selectedClingenAlleleId.value"
              :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
              :genomic-locations="lookup.clingenAllele.genomicLocations.value"
            />
          </div>
          <div
            class="mt-4 tablet:hidden mave-gradient-bar relative rounded-lg border border-border bg-surface px-4 py-3.5"
          >
            <MvAssayFactsCard
              :score-set="lookup.selectedScoreSet.value ?? undefined"
              :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined"
            />
          </div>
        </template>

        <!-- ── ANNOTATIONS CARD ──────────────────────────────── -->
        <div
          v-if="lookup.selectedVariantDetail.value && lookup.selectedVariantScore.value != null"
          class="mave-gradient-bar relative mt-6 rounded-lg border border-border bg-surface px-[18px] py-3.5"
        >
          <div class="annotations-columns grid grid-cols-1 tablet:grid-cols-3">
            <!-- Classification -->
            <div class="tablet:pr-[18px]">
              <div class="mb-1.5 text-xs-minus font-bold uppercase tracking-[0.5px] text-black">Classification</div>
              <MvDetailRow
                label="Functional score"
                :value="
                  lookup.selectedVariantScore.value !== 'NA'
                    ? Number(lookup.selectedVariantScore.value).toPrecision(4)
                    : undefined
                "
              />
              <MvDetailRow label="ACMG code">
                <MvEvidenceTag
                  v-if="lookup.calibrationResolution.formattedEvidenceCode.value"
                  :code="lookup.calibrationResolution.formattedEvidenceCode.value"
                />
              </MvDetailRow>
              <MvDetailRow
                label="OddsPath ratio"
                :value="lookup.calibrationResolution.scoreRange.value?.oddspathsRatio ?? undefined"
              />
            </div>
            <!-- Placeholder columns for future data -->
            <div
              class="border-t border-border-light pt-4 tablet:border-t-0 tablet:pt-0 tablet:border-l tablet:border-border-light tablet:px-[18px]"
            >
              <div class="mb-1.5 text-xs-minus font-bold uppercase tracking-[0.5px] text-black">
                Population Frequency
              </div>
              <p class="text-xs-plus italic text-text-muted">Data coming soon</p>
            </div>
            <div
              class="border-t border-border-light pt-4 tablet:border-t-0 tablet:pt-0 tablet:border-l tablet:border-border-light tablet:pl-[18px]"
            >
              <div class="mb-1.5 text-xs-minus font-bold uppercase tracking-[0.5px] text-black">
                Splicing Predictions
              </div>
              <p class="text-xs-plus italic text-text-muted">Data coming soon</p>
            </div>
          </div>
        </div>

        <!-- ── SCORE DISTRIBUTION CHART ──────────────────────── -->
        <div v-if="lookup.selectedScoreSet.value" class="mt-6 rounded-lg border border-border bg-surface">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-4 tablet:px-5 py-3.5"
          >
            <div class="min-w-0">
              <router-link
                class="text-base tablet:text-lg font-bold text-link"
                :to="{
                  name: 'scoreSet',
                  params: {urn: lookup.selectedScoreSet.value.urn},
                  query: {variant: lookup.selectedVariantDetail.value?.urn}
                }"
              >
                {{ lookup.selectedScoreSet.value.title }}
              </router-link>
            </div>
          </div>
          <div class="p-3 tablet:p-5">
            <div v-if="lookup.scores.value && lookup.scores.value.length > 0" class="min-h-[200px]">
              <ScoreSetHistogram
                :key="lookup.selectedScoreSetUrn.value || ''"
                ref="histogram"
                :external-selection="lookup.variantScoreRow.value"
                :lock-selection="true"
                :score-set="lookup.selectedScoreSet.value"
                :selected-calibration="lookup.selectedCalibration.value || undefined"
                :variants="lookup.scores.value as any"
                @calibration-changed="lookup.selectedCalibration.value = $event"
                @selection-changed="() => {}"
              />
            </div>
            <div v-else class="flex min-h-[200px] items-center justify-center">
              <MvLoader text="Loading variant information..." />
            </div>
          </div>
          <div v-if="lookup.selectedCalibrationObject.value" class="border-t border-border-light p-5">
            <CalibrationTable
              :highlighted-range-label="lookup.calibrationResolution.scoreRange.value?.label || null"
              :score-calibration="lookup.selectedCalibrationObject.value"
            />
          </div>
        </div>
      </template>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import Select from 'primevue/select'
import SplitButton from 'primevue/splitbutton'
import {defineComponent, toRef} from 'vue'
import {useHead} from '@unhead/vue'
import {useToast} from 'primevue/usetoast'

import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
import MvDetailRow from '@/components/common/MvDetailRow.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvErrorState from '@/components/common/MvErrorState.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvAssayFactsCard from '@/components/common/MvAssayFactsCard.vue'
import MvBadgeToggle from '@/components/common/MvBadgeToggle.vue'
import ScoreSetHistogram from '@/components/score-set/ScoreSetHistogram.vue'
import MvMeasurementCard from '@/components/variant/MvMeasurementCard.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import VariantInfoSection from '@/components/variant/VariantInfoSection.vue'
import {useVariantLookup} from '@/composables/use-variant-lookup'
import {MEASUREMENT_TYPE_LABELS} from '@/lib/measurement-types'

export default defineComponent({
  name: 'VariantScreen',

  components: {
    CalibrationTable,
    MvAssayFactsCard,
    MvBadgeToggle,
    MvDetailRow,
    MvEmptyState,
    MvErrorState,
    MvEvidenceTag,
    MvLayout,
    MvLoader,
    MvMeasurementCard,
    MvPageHeader,
    MvRowActionMenu,
    MvPageLoading,
    PSelect: Select,
    ScoreSetHistogram,
    SplitButton,
    VariantInfoSection
  },

  props: {
    clingenAlleleId: {
      type: String,
      required: true
    }
  },

  setup(props) {
    return {
      head: useHead({title: 'Variant search results'}),
      lookup: useVariantLookup(toRef(props, 'clingenAlleleId'), {toast: useToast()})
    }
  },

  computed: {
    pageTitle(): string {
      return this.lookup.clingenAllele.alleleName.value || this.lookup.selectedVariantName.value || 'Variant'
    },
    measurementOptions(): {label: string; urn: string}[] {
      return this.lookup.filteredVariants.value
        .filter((variant): variant is typeof variant & {content: {urn: string}} => !!variant.content.urn)
        .map((variant) => ({
          label: `${variant.content.scoreSet?.title || 'Untitled score set'} (${MEASUREMENT_TYPE_LABELS[variant.type]?.short ?? variant.type})`,
          urn: variant.content.urn
        }))
    },
    downloadActions(): RowAction[] {
      return this.annotatedVariantDownloadOptions.map((opt) => ({
        label: opt.label,
        handler: opt.command
      }))
    },
    annotatedVariantDownloadOptions(): {label: string; command: () => void}[] {
      const options: {label: string; command: () => void}[] = []
      const activeVariant = this.lookup.selectedVariantDetail.value

      if (activeVariant?.scoreSet?.scoreCalibrations) {
        options.push({
          label: 'Pathogenicity evidence line',
          command: () => this.lookup.fetchVariantAnnotations('clinical-evidence')
        })
        options.push({
          label: 'Functional impact statement',
          command: () => this.lookup.fetchVariantAnnotations('functional-impact')
        })
      }

      options.push({
        label: 'Functional impact study result',
        command: () => this.lookup.fetchVariantAnnotations('study-result')
      })

      return options
    }
  },

  watch: {
    'lookup.clingenAllele.alleleName.value'(name: string | undefined) {
      this.head!.patch({title: name ? `Variant ${name}` : 'Variant'})
    }
  },

  methods: {}
})
</script>

<style scoped>
/* Thin scrollbar for horizontal measurement card scroller */
.measurement-switcher {
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.measurement-switcher::-webkit-scrollbar {
  height: 6px;
}

.measurement-switcher::-webkit-scrollbar-track {
  background: transparent;
}

.measurement-switcher::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
</style>
