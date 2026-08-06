<template>
  <MvLayout>
    <template #header>
      <MvPageHeader eyebrow="Variant" max-width="1000px" :title="pageTitle">
        <template v-if="lookup.variants.value.length > 0" #actions>
          <div class="hidden tablet:flex tablet:items-center tablet:gap-2">
            <SplitButton
              :disabled="downloadInProgress"
              :model="tableDownloadMenu"
              severity="secondary"
              size="small"
              @click="primaryTableDownload.command()">
              <template #default>
                <i class="pi pi-table mr-1.5 text-xs" />
                Download variant CSV
              </template>
            </SplitButton>
            <SplitButton
              v-if="annotationDownloadOptions.length > 0"
              :disabled="downloadInProgress"
              :model="annotationDownloadOptions"
              severity="secondary"
              size="small"
              @click="primaryAnnotationDownload?.command()">
              <template #default>
                <i class="pi pi-download mr-1.5 text-xs" />
                Download VA-Spec annotations
              </template>
            </SplitButton>
            <!-- Indeterminate: a gzipped download exposes no measurable total. -->
            <span
              v-if="downloadInProgress"
              aria-live="polite"
              class="flex items-center gap-1.5 text-xs text-text-muted">
              <i class="pi pi-spin pi-spinner text-xs" />
              Preparing {{ lookup.downloadInProgressLabel.value }}…
            </span>
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
        title="No variants found" />

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
                label="Nucleotide level" />
              <MvBadgeToggle
                v-if="lookup.proteinCount.value > 0"
                v-model="lookup.showProtein.value"
                active-background="var(--color-protein-light)"
                active-border="var(--color-protein-border)"
                color="var(--color-protein)"
                :count="lookup.proteinCount.value"
                label="Protein level" />
              <MvBadgeToggle
                v-if="lookup.associatedNucleotideCount.value > 0"
                v-model="lookup.showAssociatedNucleotide.value"
                active-background="var(--color-synonymous-nucleotide-light)"
                active-border="var(--color-synonymous-nucleotide-border)"
                color="var(--color-synonymous-nucleotide)"
                :count="lookup.associatedNucleotideCount.value"
                label="Synonymous nucleotide" />
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
              @select="lookup.selectVariant(variant.content.urn)" />
          </div>
          <!-- Mobile: dropdown selector -->
          <div class="tablet:hidden px-4 py-3">
            <PSelect
              class="w-full"
              :model-value="lookup.selectedVariantUrn.value"
              option-label="label"
              option-value="urn"
              :options="measurementOptions"
              @update:model-value="lookup.selectVariant($event)" />
          </div>
        </div>

        <!-- ── VARIANT & ASSAY DETAILS ──────────────────────── -->
        <template v-if="lookup.selectedVariantDetail.value">
          <!-- Desktop: single card with two columns -->
          <div
            class="mave-gradient-bar relative mt-6 hidden tablet:block rounded-lg border border-border bg-surface px-[18px] py-3.5">
            <div class="grid grid-cols-2">
              <div class="border-r border-border-light pr-[18px]">
                <VariantInfoSection
                  :allele-name="lookup.clingenAllele.alleleName.value"
                  :classification="lookup.calibrationResolution.classification.value"
                  :clingen-allele-id="lookup.selectedClingenAlleleId.value"
                  :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
                  :genomic-locations="lookup.clingenAllele.genomicLocations.value" />
              </div>
              <div class="pl-[18px]">
                <MvAssayFactsCard
                  :columns="1"
                  :score-set="lookup.selectedScoreSet.value ?? undefined"
                  :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined" />
              </div>
            </div>
          </div>

          <!-- Mobile: separate cards -->
          <div
            class="mt-6 tablet:hidden mave-gradient-bar relative rounded-lg border border-border bg-surface px-4 py-3.5">
            <VariantInfoSection
              :allele-name="lookup.clingenAllele.alleleName.value"
              :classification="lookup.calibrationResolution.classification.value"
              :clingen-allele-id="lookup.selectedClingenAlleleId.value"
              :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
              :genomic-locations="lookup.clingenAllele.genomicLocations.value" />
          </div>
          <div
            class="mt-4 tablet:hidden mave-gradient-bar relative rounded-lg border border-border bg-surface px-4 py-3.5">
            <MvAssayFactsCard
              :columns="1"
              :score-set="lookup.selectedScoreSet.value ?? undefined"
              :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined" />
          </div>
        </template>

        <!-- ── ANNOTATIONS CARD ──────────────────────────────── -->
        <div
          v-if="lookup.selectedVariantDetail.value && lookup.selectedVariantScore.value != null"
          class="mave-gradient-bar relative mt-6 rounded-lg border border-border bg-surface px-[18px] py-3.5">
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
                " />
              <MvDetailRow label="ACMG code">
                <MvEvidenceTag
                  v-if="lookup.calibrationResolution.formattedEvidenceCode.value"
                  :code="lookup.calibrationResolution.formattedEvidenceCode.value" />
              </MvDetailRow>
              <MvDetailRow
                label="OddsPath ratio"
                :value="lookup.calibrationResolution.scoreRange.value?.oddspathsRatio ?? undefined" />
            </div>
            <!-- Placeholder columns for future data -->
            <div
              class="border-t border-border-light pt-4 tablet:border-t-0 tablet:pt-0 tablet:border-l tablet:border-border-light tablet:px-[18px]">
              <div class="mb-1.5 text-xs-minus font-bold uppercase tracking-[0.5px] text-black">
                Population Frequency
              </div>
              <p class="text-xs-plus italic text-text-muted">Data coming soon</p>
            </div>
            <div
              class="border-t border-border-light pt-4 tablet:border-t-0 tablet:pt-0 tablet:border-l tablet:border-border-light tablet:pl-[18px]">
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
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-4 tablet:px-5 py-3.5">
            <div class="min-w-0">
              <router-link
                class="text-base tablet:text-lg font-bold text-link"
                :to="{
                  name: 'scoreSet',
                  params: {urn: lookup.selectedScoreSet.value.urn},
                  query: {variant: lookup.selectedVariantDetail.value?.urn}
                }">
                {{ lookup.selectedScoreSet.value.title }}
              </router-link>
            </div>
          </div>
          <div class="p-3 tablet:p-5">
            <div v-if="lookup.scores.value && lookup.scores.value.length > 0" class="min-h-[200px]">
              <ScoreSetHistogram
                :key="lookup.selectedScoreSetUrn.value || ''"
                ref="histogram"
                :coordinates="'mapped'"
                :external-selection="lookup.variantScoreRow.value"
                :lock-selection="true"
                :score-set="lookup.selectedScoreSet.value"
                :selected-calibration="lookup.selectedCalibration.value || undefined"
                :variants="lookup.scores.value"
                @calibration-changed="lookup.selectedCalibration.value = $event"
                @selection-changed="() => {}" />
            </div>
            <div v-else class="flex min-h-[200px] items-center justify-center">
              <MvLoader text="Loading variant information..." />
            </div>
          </div>
          <div v-if="lookup.selectedCalibrationObject.value" class="border-t border-border-light p-5">
            <CalibrationTable
              :highlighted-range-label="lookup.calibrationResolution.scoreRange.value?.label || null"
              :score-calibration="lookup.selectedCalibrationObject.value" />
          </div>
        </div>
      </template>
    </div>
    <MvCsvColumnDialog
      v-model:visible="csvDialogVisible"
      header="Download clinical table"
      kind="variant"
      :urn="lookup.selectedVariantUrn.value"
      @confirm="downloadSelectedCsv" />
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
import MvCsvColumnDialog from '@/components/common/MvCsvColumnDialog.vue'
import MvBadgeToggle from '@/components/common/MvBadgeToggle.vue'
import ScoreSetHistogram from '@/components/score-set/ScoreSetHistogram.vue'
import MvMeasurementCard from '@/components/variant/MvMeasurementCard.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import VariantInfoSection from '@/components/variant/VariantInfoSection.vue'
import {useVariantLookup} from '@/composables/use-variant-lookup'
import {MEASUREMENT_TYPE_LABELS} from '@/lib/measurement-types'
import {hasFunctionalCalibrations, hasPathogenicityCalibrations} from '@/lib/calibrations'

/** One entry in a download control: a label and the download it triggers. */
interface DownloadOption {
  label: string
  command: () => void
}

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
    MvCsvColumnDialog,
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

  data() {
    return {
      csvDialogVisible: false
    }
  },

  computed: {
    /** Any download in flight; the buttons stay disabled until it settles. */
    downloadInProgress(): boolean {
      return this.lookup.downloadInProgressLabel.value !== null
    },
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
    /**
     * The flat table download: one CSV of this allele's measurements.
     *
     * Always offered. Unlike the VA-Spec objects it needs no mapping, score, or calibration — an
     * unmapped variant still has an identity, a score, and provenance worth exporting.
     */
    tableDownloadOptions(): DownloadOption[] {
      return [
        {label: 'Download variant CSV', command: () => this.lookup.downloadVariantCsvFile()},
        {
          label: 'Choose CSV columns…',
          command: () => {
            this.csvDialogVisible = true
          }
        }
      ]
    },

    /** What clicking the table button itself does: download with the default column set. */
    primaryTableDownload(): DownloadOption {
      return this.tableDownloadOptions[0]
    },

    /** What its caret offers: everything beyond the one-click default. */
    tableDownloadMenu(): DownloadOption[] {
      return this.tableDownloadOptions.slice(1)
    },

    /**
     * The VA-Spec downloads: nested, standards-compliant annotation objects.
     *
     * A different product from the table — machine-readable GA4GH structures rather than something to
     * open in a spreadsheet — so they get their own control rather than sharing a menu. Each requires
     * progressively more of the variant to exist, so the list is empty for an unmapped variant and the
     * button is hidden entirely.
     */
    annotationDownloadOptions(): DownloadOption[] {
      const options: DownloadOption[] = []
      const activeVariant = this.lookup.selectedVariantDetail.value
      if (!activeVariant) return options

      const currentMapped = activeVariant.mappedVariants.find((m) => m.current)
      const hasMappingData = !!currentMapped?.postMapped

      const score = this.lookup.selectedVariantScore.value
      const hasScore = score !== null && score !== 'NA'

      if (hasMappingData && hasScore && hasPathogenicityCalibrations(activeVariant.scoreSet)) {
        options.push({
          label: 'Pathogenicity Statement',
          command: () => this.lookup.fetchVariantAnnotations('pathogenicity-statement')
        })
      }
      if (hasMappingData && hasScore && hasFunctionalCalibrations(activeVariant.scoreSet)) {
        options.push({
          label: 'Functional Impact Statement',
          command: () => this.lookup.fetchVariantAnnotations('functional-statement')
        })
      }
      if (hasMappingData) {
        options.push({
          label: 'Functional Study Result',
          command: () => this.lookup.fetchVariantAnnotations('study-result')
        })
      }

      return options
    },

    /** What clicking the annotations button itself does: the highest-level statement available. */
    primaryAnnotationDownload(): DownloadOption | undefined {
      return this.annotationDownloadOptions[0]
    },

    /** The narrow-screen equivalent: both groups in one menu, separated so they stay distinguishable. */
    downloadActions(): RowAction[] {
      const asAction = (option: DownloadOption): RowAction => ({label: option.label, handler: option.command})
      const annotations = this.annotationDownloadOptions
      return [
        ...this.tableDownloadOptions.map(asAction),
        ...(annotations.length > 0 ? [{separator: true} as RowAction, ...annotations.map(asAction)] : [])
      ]
    }
  },

  watch: {
    'lookup.clingenAllele.alleleName.value'(name: string | undefined) {
      this.head!.patch({title: name ? `Variant ${name}` : 'Variant'})
    }
  },

  methods: {
    downloadSelectedCsv({namespaces}: {namespaces: string[]}) {
      this.lookup.downloadVariantCsvFile(namespaces)
    }
  }
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
