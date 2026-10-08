<template>
  <MvLayout>
    <template #header>
      <MvPageHeader eyebrow="Variant" max-width="1000px" :title="pageTitle">
        <template #actions>
          <div class="flex items-center gap-2">
            <!-- Indeterminate: a gzipped download exposes no measurable total. -->
            <span
              v-if="downloadInProgress"
              aria-live="polite"
              class="flex items-center gap-1.5 text-xs text-text-muted"
            >
              <i class="pi pi-spin pi-spinner text-xs" />
              Preparing {{ lookup.downloadInProgressLabel.value }}…
            </span>
            <button
              :aria-expanded="viewOptionsOpen"
              class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
              :class="
                viewOptionsOpen || viewOptionCount > 0
                  ? 'border-sage bg-sage text-white'
                  : 'border-border bg-surface text-text-secondary hover:border-sage hover:text-sage-strong'
              "
              type="button"
              @click="viewOptionsOpen = !viewOptionsOpen"
            >
              <i class="pi pi-sliders-h text-[11px]" />
              View options<template v-if="viewOptionCount > 0"> ({{ viewOptionCount }})</template>
            </button>
            <button
              class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
              :class="
                keyDrawer.isOpen.value
                  ? 'border-sage bg-sage text-white'
                  : 'border-border bg-surface text-text-secondary hover:border-sage hover:text-sage-strong'
              "
              type="button"
              @click="keyDrawer.isOpen.value ? keyDrawer.close() : keyDrawer.open()"
            >
              <i class="pi pi-question-circle text-[11px]" />
              Key
            </button>
            <MvRowActionMenu v-if="lookup.variants.value.length > 0" :actions="downloadActions" />
          </div>
        </template>

        <template #subtitle>
          <p v-if="subtitleFacts.length > 0" class="mt-2 text-sm text-text-muted">{{ subtitleFacts.join(' · ') }}</p>
          <p v-if="clingenAlleleId" class="mt-1 text-sm">
            <template v-if="proteinPage"
              ><router-link
                class="text-link hover:underline"
                :to="{name: 'variant', params: {clingenAlleleId: proteinPage.clingenAlleleId}}"
                >View protein change <span class="font-mono">{{ proteinPage.hgvs }}</span></router-link
              >
              &middot;&#32;</template
            ><a
              class="inline-flex items-center gap-0.5 text-link hover:underline"
              :href="clingenRegistryUrl"
              target="_blank"
              >View in ClinGen Allele Registry&nbsp;<i class="pi pi-external-link !text-[11px]"
            /></a>
          </p>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto w-full py-6 tablet:px-6 tablet:py-8" style="max-width: 1000px">
      <!-- ── VIEW OPTIONS (query axes) ── opened from the header; the button carries a count so a non-default
           view (past date, superseded included) is never invisible while the panel is closed. -->
      <div
        v-if="viewOptionsOpen"
        class="mave-card mb-4 flex flex-col gap-3 px-4 py-3 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-x-6 tablet:gap-y-2 tablet:px-5"
      >
        <div class="flex items-center gap-2 text-xs text-text-secondary">
          <span v-key-term="'as-of'" class="mave-label">MaveDB as of</span>
          <DatePicker
            v-model="asOfDate"
            class="min-w-0 flex-1 tablet:w-72 tablet:flex-none"
            date-format="yy-mm-dd"
            fluid
            icon-display="input"
            :max-date="today"
            placeholder="Current"
            show-button-bar
            show-icon
            size="small"
          />
          <button
            v-if="asOfDate"
            class="cursor-pointer border-none bg-transparent text-xs font-semibold text-link hover:underline"
            type="button"
            @click="asOfDate = null"
          >
            Clear
          </button>
        </div>
        <button
          class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors tablet:ml-auto"
          :class="
            lookup.includeSuperseded.value
              ? 'border-sage bg-sage text-white'
              : 'border-border bg-surface text-text-secondary hover:border-sage hover:text-sage-strong'
          "
          type="button"
          @click="lookup.includeSuperseded.value = !lookup.includeSuperseded.value"
        >
          <i class="pi text-[11px]" :class="lookup.includeSuperseded.value ? 'pi-check' : 'pi-plus'" />
          {{ lookup.includeSuperseded.value ? 'Hide superseded score sets' : 'Show superseded score sets' }}
        </button>
      </div>

      <!-- Error / loading / empty -->
      <MvErrorState v-if="lookup.variantsStatus.value === 'Error'" @retry="lookup.fetchVariants" />
      <MvPageLoading v-else-if="lookup.variantsStatus.value === 'Loading'" text="Loading variant measurements..." />
      <MvEmptyState
        v-else-if="lookup.variants.value.length === 0"
        :description="emptyStateDescription"
        title="No measurements found"
      />

      <template v-else>
        <!-- ── MEASUREMENTS — the body, following the measured variant (Y) ── -->
        <MvPanel :padded="false" title="Measurements">
          <template #meta>{{ lookup.variants.value.length }}</template>
          <template v-if="hasMixedLevels || showResearchUseOnlyToggle" #actions>
            <!-- A single assay level has nothing to filter, so the level toggles only render for mixed levels. -->
            <span v-if="hasMixedLevels" class="flex items-center gap-1.5">
              <span v-key-term="'assay-level'" class="mave-label mr-0.5 hidden whitespace-nowrap tablet:inline">Assay level</span>
              <MvBadgeToggle
                v-model="lookup.showNucleotide.value"
                active-background="var(--color-nucleotide-light)"
                active-border="var(--color-nucleotide-border)"
                color="var(--color-nucleotide)"
                :count="lookup.nucleotideCount.value"
                label="Nucleotide"
              />
              <MvBadgeToggle
                v-model="lookup.showProtein.value"
                active-background="var(--color-amino-acid-light)"
                active-border="var(--color-amino-acid-border)"
                color="var(--color-amino-acid)"
                :count="lookup.proteinCount.value"
                label="Amino acid"
              />
            </span>
            <!-- Research-use-only calls stand in only where a score set has no clinical calibration; they never
                 reorder the list. -->
            <!-- A setting, not a filter, so a switch rather than another chip, set apart from the level filters. -->
            <label
              v-if="showResearchUseOnlyToggle"
              class="flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap"
              :class="{'tablet:ml-1 tablet:border-l tablet:border-border-light tablet:pl-3': hasMixedLevels}"
            >
              <ToggleSwitch v-model="lookup.includeResearchUseOnly.value" class="scale-75" />
              <span :class="lookup.includeResearchUseOnly.value ? 'font-semibold text-text-primary' : 'text-text-muted'"
                >RUO evidence</span
              >
            </label>
          </template>
          <!-- The page's most important caveat when it applies: nothing listed measured the variant itself. -->
          <template v-if="!lookup.variants.value.some((m) => m.relationship === 'direct')" #notice>
            <span v-key-term="'relationship'" class="font-semibold text-text-primary">{{
              clingenAlleleId.startsWith('PA')
                ? 'This protein change has not been measured directly.'
                : 'Your variant has not been measured directly.'
            }}</span>
            Each measurement below assayed a related variant.
          </template>
          <MvMeasurementTable
            :anchor-is-protein="clingenAlleleId.startsWith('PA')"
            :get-citation="lookup.getCitation"
            :get-keyword="lookup.getKeyword"
            :get-score-set="lookup.getScoreSet"
            :include-research-use-only="lookup.includeResearchUseOnly.value"
            :loading="lookup.selectedLoading.value"
            :measurements="lookup.filteredVariants.value"
            :selected-urn="lookup.selectedVariantUrn.value"
            @select="selectMeasurement"
          />
        </MvPanel>

        <!-- ── FUNCTIONAL EVIDENCE ── MaveDB's own contribution, centered as the lead of the body. -->
        <!-- scroll-mt clears the sticky nav when a measurement row jumps here. -->
        <MvPanel
          v-if="lookup.selectedVariantDetail.value"
          ref="functionalEvidence"
          class="mt-4 scroll-mt-20"
          title="Functional evidence"
        >
          <template #meta>measured in this score set</template>
          <template #actions>
            <span
              v-if="!lookup.selectedVariantDetail.value.isCurrent"
              v-key-term="'superseded'"
              class="mave-tag bg-superseded-light text-superseded"
              >Superseded</span
            >
            <!-- Opens on this measurement and calibration, so the score set page arrives in the same state. -->
            <router-link
              v-if="lookup.selectedScoreSet.value"
              class="text-xs font-semibold whitespace-nowrap text-link hover:underline"
              :to="{
                name: 'scoreSet',
                params: {urn: lookup.selectedScoreSet.value.urn},
                query: {
                  variant: lookup.selectedVariantDetail.value.urn,
                  ...(lookup.selectedCalibration.value ? {calibration: lookup.selectedCalibration.value} : {})
                }
              }"
            >
              View score set &rarr;
            </router-link>
          </template>
          <!-- The one place the indirect relationship's caveat is spelled out; the table headers only name it. -->
          <template v-if="indirectNotice" #notice>
            <span v-key-term="'relationship'" class="font-semibold text-text-primary">{{ indirectNotice.lead }}</span>
            {{ indirectNotice.caveat }}
          </template>
          <!-- The calibration picker spans the panel; below it, the score stands apart from the three cells read off
               that calibration, and the cells share the full width evenly. -->
          <div v-if="lookup.selectedVariantScore.value != null" class="flex flex-col gap-4">
            <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
              <span v-key-term="'calibration'" class="mave-label shrink-0">Calibration</span>
              <!-- Shares one selection with the histogram below; switching re-derives the call and the shading. -->
              <MvCalibrationSelect
                v-if="hasCalibrations"
                :calibrations="lookup.selectedScoreSet.value?.scoreCalibrations ?? []"
                class="min-w-0 flex-1"
                :model-value="lookup.selectedCalibration.value"
                @update:model-value="lookup.selectedCalibration.value = $event"
              />
              <!-- Otherwise the empty call cells read as missing data rather than as nothing to calibrate against. -->
              <span v-else class="text-text-muted">
                None provided, so this score has no functional impact or evidence code.
              </span>
            </div>
            <div
              class="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border-light pt-4 tablet:auto-cols-fr tablet:grid-flow-col tablet:grid-cols-none"
            >
              <div class="flex flex-col gap-0.5 tablet:border-r tablet:border-border-light">
                <span class="mave-label">Functional score</span>
                <span class="text-sm font-semibold text-text-primary">{{
                  formatScore(lookup.selectedVariantScore.value)
                }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span v-key-term="'functional-impact'" class="mave-label w-fit">Functional impact</span>
                <span
                  v-if="lookup.calibrationResolution.classification.value"
                  class="flex flex-wrap items-center gap-1"
                >
                  <MvClassificationTag :classification="lookup.calibrationResolution.classification.value" />
                </span>
                <span v-else-if="unclassifiedLabel" class="text-xs font-semibold italic text-text-muted">{{
                  unclassifiedLabel
                }}</span>
                <span v-else class="text-sm text-text-muted">—</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span v-key-term="'acmg'" class="mave-label w-fit">ACMG code</span>
                <MvEvidenceTag
                  v-if="lookup.calibrationResolution.formattedEvidenceCode.value"
                  class="w-fit"
                  :code="lookup.calibrationResolution.formattedEvidenceCode.value"
                />
                <span v-else class="text-sm text-text-muted">—</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span v-key-term="'acmg'" class="mave-label w-fit">OddsPath ratio</span>
                <span class="text-sm font-semibold text-text-primary">{{
                  lookup.calibrationResolution.scoreRange.value?.oddspathsRatio ?? '—'
                }}</span>
              </div>
              <div v-if="lookup.selectedVariantControlStatus.value" class="flex flex-col gap-0.5">
                <span v-key-term="'calibration'" class="mave-label">Calibration control</span>
                <span class="flex flex-wrap items-center gap-x-1.5">
                  <MvBadge :value="lookup.selectedVariantControlStatus.value" />
                  <span class="text-xs text-text-muted">used to derive this calibration</span>
                </span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs-plus italic text-text-muted">No score available</p>
        </MvPanel>

        <!-- Assay facts (about the selected measurement) -->
        <MvPanel v-if="lookup.selectedVariantDetail.value" ref="assayFacts" class="mt-4" title="Assay facts">
          <MvAssayFactsCard
            :assay-level="lookup.selectedVariantDetail.value?.assayLevel ?? null"
            :columns="2"
            :score-set="lookup.selectedScoreSet.value ?? undefined"
            :show-title="false"
            show-urn
            :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined"
          />
          <!-- Supersession banner (about the score set of the selected measurement (Y) ) -->
          <div
            v-if="lookup.selectedVariantDetail.value && !lookup.selectedVariantDetail.value.isCurrent"
            class="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-superseded"
          >
            <i class="pi pi-exclamation-triangle mt-0.5 text-xs" />
            <div>
              This score set has been superseded and may not reflect current data.
              <template v-if="lookup.selectedVariantDetail.value.supersededByScoreSet">
                A newer version of this score set is available at
                <router-link
                  class="font-semibold underline"
                  :to="{name: 'scoreSet', params: {urn: lookup.selectedVariantDetail.value.supersededByScoreSet}}"
                >
                  {{ lookup.selectedVariantDetail.value.supersededByScoreSet }} </router-link
                >.
              </template>
            </div>
          </div>
        </MvPanel>

        <!-- ── CLINICAL & POPULATION DATA ── your variant (X) and the other nucleotide changes in its family, across all
             measurements; the highlight marks the form the selected measurement (Y) assayed. -->
        <MvPanel
          v-if="
            lookup.selectedVariantDetail.value &&
            pageAlleleGroups.some((g) => g.members.some((m) => m.level !== 'protein'))
          "
          ref="clinical"
          class="mt-4"
          :padded="false"
          title="Clinical & population data"
        >
          <template v-if="clingenAlleleId.startsWith('PA')" #meta
            >Nucleotide changes that encode this protein change</template
          >
          <MvAlleleLedger
            :alleles="pageAlleles.alleles"
            :anchor-is-protein="clingenAlleleId.startsWith('PA')"
            :annotations="pageAlleles.annotations"
            :clinvar-version="clinvarControls.controlVersion"
            :groups="pageAlleleGroups"
            :variant-urn="lookup.selectedVariantDetail.value.urn"
          />
        </MvPanel>

        <!-- ── SCORE DISTRIBUTION ── -->
        <MvPanel
          v-if="lookup.selectedScoreSet.value"
          ref="scoreDistribution"
          class="mt-4 scroll-mt-20"
          :padded="false"
          title="Score distribution"
        >
          <div class="px-4 py-3 tablet:px-5">
            <div v-if="lookup.scores.value && lookup.scores.value.length > 0" class="min-h-[200px]">
              <ScoreSetHistogram
                :key="lookup.selectedScoreSetUrn.value || ''"
                ref="histogram"
                :clinical="clinvarControls"
                :coordinates="'reference'"
                :external-selection="lookup.variantScoreRow.value"
                :lock-selection="true"
                :score-set="lookup.selectedScoreSet.value"
                :selected-calibration="lookup.selectedCalibration.value || undefined"
                :variants="lookup.scores.value"
                @calibration-changed="lookup.selectedCalibration.value = $event"
                @selection-changed="() => {}"
              />
            </div>
            <div v-else class="flex min-h-[200px] items-center justify-center">
              <MvLoader text="Loading variant information..." />
            </div>
          </div>
          <div v-if="lookup.selectedCalibrationObject.value" class="border-t border-border-light px-4 py-3 tablet:px-5">
            <CalibrationTable
              :highlighted-range-label="lookup.calibrationResolution.scoreRange.value?.label || null"
              :score-calibration="lookup.selectedCalibrationObject.value"
            />
          </div>
        </MvPanel>
      </template>
    </div>
    <MvCsvColumnDialog
      v-model:visible="csvDialogVisible"
      header="Download clinical table"
      kind="variant"
      :urn="lookup.selectedVariantUrn.value"
      @confirm="downloadSelectedCsv"
    />
  </MvLayout>
</template>

<script lang="ts">
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import {defineComponent, toRef, type PropType} from 'vue'
import {useRoute} from 'vue-router'
import {useHead} from '@unhead/vue'
import {useToast} from 'primevue/usetoast'

import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
import MvCalibrationSelect from '@/components/calibration/MvCalibrationSelect.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvErrorState from '@/components/common/MvErrorState.vue'
import MvPanel from '@/components/common/MvPanel.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import MvLoader from '@/components/common/MvLoader.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvAssayFactsCard from '@/components/common/MvAssayFactsCard.vue'
import MvCsvColumnDialog from '@/components/common/MvCsvColumnDialog.vue'
import MvBadge from '@/components/common/MvBadge.vue'
import MvBadgeToggle from '@/components/common/MvBadgeToggle.vue'
import ScoreSetHistogram from '@/components/score-set/ScoreSetHistogram.vue'
import {useClinvarControls} from '@/composables/use-clinvar-controls'
import {useKeyDrawer} from '@/composables/use-key-drawer'
import MvAlleleLedger from '@/components/variant/MvAlleleLedger.vue'
import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import MvMeasurementTable from '@/components/variant/MvMeasurementTable.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import {useVariantLookup} from '@/composables/use-variant-lookup'
import {formatScore} from '@/lib/scores'
import {hasFunctionalCalibrations, hasPathogenicityCalibrations, unclassifiedCallLabel} from '@/lib/calibrations'
import {groupAlleles, mergeDetailAlleles, titleMember, type AlleleGroup} from '@/lib/allele-grouping'
import {indirectMeasurementNotice, shortHgvs} from '@/lib/measurement-groups'
import {clingenAlleleUrlFromCanonicalId} from '@/lib/clingen'

/** One entry in a download control: a label and the download it triggers. */
interface DownloadOption {
  label: string
  command: () => void
}

/**
 * Variant detail page. Distinguishes the PAGE VARIANT (X, identified by clingenAlleleId) from the
 * SELECTED MEASURED VARIANT (Y, whichever measurement is chosen). Header and clinical/population data
 * anchor on X; the measurement body follows the selection (Y) and states its relationship back to X.
 * Sections must name their subject so this re-anchoring reads as intentional, not inconsistent.
 */
export default defineComponent({
  name: 'VariantScreen',

  components: {
    CalibrationTable,
    DatePicker,
    MvAlleleLedger,
    MvCalibrationSelect,
    MvClassificationTag,
    MvAssayFactsCard,
    MvBadge,
    MvBadgeToggle,
    MvEmptyState,
    MvErrorState,
    MvEvidenceTag,
    MvLayout,
    MvLoader,
    MvMeasurementTable,
    MvPageHeader,
    MvPanel,
    MvRowActionMenu,
    MvPageLoading,
    MvCsvColumnDialog,
    ScoreSetHistogram,
    ToggleSwitch
  },

  props: {
    clingenAlleleId: {
      type: String,
      required: true
    },
    // The `?variant=` highlight URN — pre-selects a measurement.
    highlightVariantUrn: {
      type: [String, null] as PropType<string | null>,
      default: null
    }
  },

  setup(props) {
    const route = useRoute()

    const lookup = useVariantLookup(toRef(props, 'clingenAlleleId'), {
      highlightUrn: toRef(props, 'highlightVariantUrn'),
      initialIncludeSuperseded: (route.query.include_superseded as string)?.toLowerCase() === 'true',
      // RUO evidence shows by default, so the URL records only turning it off.
      initialIncludeResearchUseOnly: (route.query.include_research_use_only as string)?.toLowerCase() !== 'false',
      initialAsOf: typeof route.query.as_of === 'string' ? route.query.as_of : null,
      toast: useToast()
    })

    const clinvarControls = useClinvarControls(lookup.selectedScoreSetUrn, lookup.scores)

    return {
      head: useHead({title: 'Variant'}),
      lookup,
      clinvarControls,
      keyDrawer: useKeyDrawer()
    }
  },

  data() {
    return {
      csvDialogVisible: false,
      viewOptionsOpen: false,
      // Set by a row click; cleared once the Functional evidence box has rendered and been scrolled to.
      scrollToEvidencePending: false,
      // The clinical table's highlighted row when a row click began, to tell whether the highlight moved.
      highlightedRowBeforeSelection: null as string | null
    }
  },

  computed: {
    // The clinical table row the selected measurement assayed; null for a protein-level measurement (no row).
    highlightedRowKey(): string | null {
      return this.pageAlleleGroups.find((g) => g.measured && g.members.some((m) => m.level !== 'protein'))?.key ?? null
    },
    // Display-only stand-in when the selected calibration leaves this variant unclassified; never a call.
    unclassifiedLabel(): string | null {
      const calibration = this.lookup.selectedCalibrationObject.value
      if (!calibration || !this.lookup.calibrationResolution.resolved.value) return null
      return this.lookup.calibrationResolution.scoreRange.value ? null : unclassifiedCallLabel(calibration)
    },
    hasCalibrations(): boolean {
      return (this.lookup.selectedScoreSet.value?.scoreCalibrations?.length ?? 0) > 0
    },
    calibrationChoice(): {scoreSet: string | null; calibration: string | null} {
      return {scoreSet: this.lookup.selectedScoreSetUrn.value, calibration: this.lookup.selectedCalibration.value}
    },
    queryAxisState(): {
      includeSuperseded: boolean
      includeResearchUseOnly: boolean
      asOf: string | null
      selectedVariantUrn: string | null
    } {
      return {
        includeSuperseded: this.lookup.includeSuperseded.value,
        includeResearchUseOnly: this.lookup.includeResearchUseOnly.value,
        asOf: this.lookup.asOf.value,
        selectedVariantUrn: this.lookup.selectedVariantUrn.value
      }
    },
    /** Any download in flight; the buttons stay disabled until it settles. */
    downloadInProgress(): boolean {
      return this.lookup.downloadInProgressLabel.value !== null
    },
    // Anchor to the page allele (X); never shift to the measured allele on selection.
    pageTitle(): string {
      return this.lookup.clingenAllele.alleleName.value || this.clingenAlleleId || 'Variant'
    },
    // Allele groups for the selected measurement (c↔g projection pairs collapsed, annotations coalesced).
    alleleGroups(): AlleleGroup[] {
      const detail = this.lookup.selectedVariantDetail.value
      if (!detail) return []
      return groupAlleles({
        alleles: detail.alleles ?? {},
        annotations: detail.annotations ?? {},
        pageClingenAlleleId: this.clingenAlleleId
      })
    },
    // Every allele across all loaded measurements, so the clinical table's rows don't change with the selection.
    pageAlleles(): ReturnType<typeof mergeDetailAlleles> {
      return mergeDetailAlleles(this.lookup.loadedVariantDetails.value, this.lookup.selectedVariantDetail.value)
    },
    pageAlleleGroups(): AlleleGroup[] {
      return groupAlleles({...this.pageAlleles, pageClingenAlleleId: this.clingenAlleleId})
    },
    // The protein change a nucleotide page's variant encodes. The clinical table has no protein row (protein alleles
    // carry no external records), so the header is the route to its page.
    proteinPage(): {clingenAlleleId: string; hgvs: string} | null {
      if (this.clingenAlleleId.startsWith('PA')) return null
      const protein = this.pageAlleleGroups
        .flatMap((g) => g.members)
        .find((m) => m.level === 'protein' && m.clingenAlleleId)
      if (!protein?.clingenAlleleId) return null
      return {clingenAlleleId: protein.clingenAlleleId, hgvs: shortHgvs(protein.hgvs ?? '')}
    },
    subtitleFacts(): string[] {
      return [
        this.lookup.geneName.value,
        this.lookup.clingenAllele.grch38LocationText.value,
        this.lookup.asOf.value ? `MaveDB as of ${this.lookup.asOf.value}` : null
      ].filter((fact): fact is string => fact != null)
    },
    // ClinGen Allele Registry deep link for the page variant.
    clingenRegistryUrl(): string {
      return clingenAlleleUrlFromCanonicalId(this.clingenAlleleId)
    },
    // The table headers only name an indirect relationship; this notice spells out its caveat.
    indirectNotice(): ReturnType<typeof indirectMeasurementNotice> {
      const measuredGroup = this.alleleGroups.find((g) => g.measured)
      return indirectMeasurementNotice(
        this.lookup.selectedVariant.value?.relationship,
        this.clingenAlleleId.startsWith('PA'),
        (measuredGroup && titleMember(measuredGroup)?.hgvs) || null
      )
    },
    hasMixedLevels(): boolean {
      return this.lookup.nucleotideCount.value > 0 && this.lookup.proteinCount.value > 0
    },
    // Only where some listed score set has a research-use-only calibration, plus whenever RUO evidence is off so it
    // can always be turned back on.
    showResearchUseOnlyToggle(): boolean {
      return (
        !this.lookup.includeResearchUseOnly.value ||
        this.lookup.variants.value.some((m) =>
          this.lookup.getScoreSet(m.scoreSetUrn)?.scoreCalibrations?.some((c) => c.researchUseOnly)
        )
      )
    },
    // Non-default view settings, surfaced on the closed View options button.
    viewOptionCount(): number {
      return (this.lookup.asOf.value ? 1 : 0) + (this.lookup.includeSuperseded.value ? 1 : 0)
    },
    today(): Date {
      return new Date()
    },
    emptyStateDescription(): string {
      if (this.lookup.asOf.value) {
        return this.lookup.includeSuperseded.value
          ? `No measurements found as of ${this.lookup.asOf.value}. Try a more recent date.`
          : `No measurements found as of ${this.lookup.asOf.value}. Try a more recent date, or include superseded score sets.`
      }
      if (!this.lookup.includeSuperseded.value) {
        return 'No current measurements were found for this variant. Try including superseded score sets.'
      }
      return 'No measurements were found for this variant.'
    },
    asOfDate: {
      get(): Date | null {
        return this.lookup.asOf.value ? new Date(`${this.lookup.asOf.value}T00:00:00`) : null
      },
      set(value: Date | null) {
        this.lookup.asOf.value = value ? this.toIsoDate(value) : null
      }
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

    /**
     * The VA-Spec downloads: nested, standards-compliant annotation objects.
     *
     * A different product from the table — machine-readable GA4GH structures rather than something to
     * open in a spreadsheet — so the menu sets them apart under a separator. Each requires progressively
     * more of the variant to exist, so the list is empty for an unmapped variant and the group is omitted.
     */
    annotationDownloadOptions(): DownloadOption[] {
      const options: DownloadOption[] = []
      const activeVariant = this.lookup.selectedVariantDetail.value
      if (!activeVariant) return options

      const hasMappingData = !!activeVariant.molecularRepresentation
      const scoreSet = this.lookup.selectedScoreSet.value
      const hasScore = this.lookup.selectedVariantScore.value !== null

      if (hasMappingData && hasScore && hasPathogenicityCalibrations(scoreSet)) {
        options.push({
          label: 'Pathogenicity Statement',
          command: () => this.lookup.fetchVariantAnnotations('pathogenicity-statement')
        })
      }
      if (hasMappingData && hasScore && hasFunctionalCalibrations(scoreSet)) {
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

    /** The header's single "…" menu: table downloads, then VA-Spec annotations, disabled while one is in flight. */
    downloadActions(): RowAction[] {
      const disabled = this.downloadInProgress
      const asAction = (option: DownloadOption, description?: string): RowAction => ({
        label: option.label,
        description,
        disabled,
        handler: option.command
      })
      const annotations = this.annotationDownloadOptions
      return [
        ...this.tableDownloadOptions.map((o) => asAction(o)),
        ...(annotations.length > 0
          ? [{separator: true} as RowAction, ...annotations.map((o) => asAction(o, 'VA-Spec annotation'))]
          : [])
      ]
    }
  },

  watch: {
    queryAxisState({
      includeSuperseded,
      includeResearchUseOnly,
      asOf,
      selectedVariantUrn
    }: {
      includeSuperseded: boolean
      includeResearchUseOnly: boolean
      asOf: string | null
      selectedVariantUrn: string | null
    }) {
      const query = {...this.$route.query}
      if (includeSuperseded) query.include_superseded = 'true'
      else delete query.include_superseded
      if (includeResearchUseOnly) delete query.include_research_use_only
      else query.include_research_use_only = 'false'
      if (asOf) query.as_of = asOf
      else delete query.as_of
      if (selectedVariantUrn) query.variant = selectedVariantUrn
      else delete query.variant
      if (JSON.stringify(query) !== JSON.stringify(this.$route.query)) this.$router.replace({query})
    },
    '$route.query'(query: Record<string, string | string[] | null | undefined>) {
      const includeSuperseded = (query.include_superseded as string)?.toLowerCase() === 'true'
      const asOf = typeof query.as_of === 'string' ? query.as_of : null
      if (this.lookup.includeSuperseded.value !== includeSuperseded)
        this.lookup.includeSuperseded.value = includeSuperseded
      const includeResearchUseOnly = (query.include_research_use_only as string)?.toLowerCase() !== 'false'
      if (this.lookup.includeResearchUseOnly.value !== includeResearchUseOnly)
        this.lookup.includeResearchUseOnly.value = includeResearchUseOnly
      if ((this.lookup.asOf.value ?? null) !== asOf) this.lookup.asOf.value = asOf
    },
    'lookup.selectedVariantDetail.value'() {
      if (this.scrollToEvidencePending) this.scrollToEvidence()
    },
    // A new calibration pick re-derives the Functional evidence call and the histogram's shading; ring both, since the
    // pick may come from either panel.
    // Defaults filled in on load or by a score-set switch aren't picks, so only a change within one score set counts.
    calibrationChoice(
      next: {scoreSet: string | null; calibration: string | null},
      previous: {scoreSet: string | null; calibration: string | null}
    ) {
      if (next.scoreSet === previous.scoreSet && previous.calibration && next.calibration !== previous.calibration) {
        this.$nextTick(() => this.flashPanels(['functionalEvidence', 'scoreDistribution']))
      }
    },
    'lookup.clingenAllele.alleleName.value'(name: string | undefined) {
      this.head!.patch({title: name ? `Variant ${name}` : 'Variant'})
    }
  },

  methods: {
    formatScore,

    // Choosing a measurement is a request to read its evidence, so jump there. A first-time selection may
    // still be loading, in which case the detail watcher finishes the scroll once the box renders.
    selectMeasurement(variantUrn: string) {
      this.highlightedRowBeforeSelection = this.highlightedRowKey
      this.lookup.selectVariant(variantUrn)
      this.scrollToEvidencePending = true
      this.scrollToEvidence()
    },

    scrollToEvidence() {
      this.$nextTick(() => {
        const box = (this.$refs.functionalEvidence as InstanceType<typeof MvPanel> | undefined)?.$el as
          | HTMLElement
          | undefined
        // Wait for the box to show the new selection; the previous one may still be rendered.
        const showsSelection = this.lookup.selectedVariantDetail.value?.urn === this.lookup.selectedVariantUrn.value
        if (!box || !showsSelection) return
        box.scrollIntoView({behavior: 'smooth', block: 'start'})
        // Ring every panel the new selection changed. The clinical table's rows never change, only its highlight,
        // so it counts only when the highlight moved.
        const changed = ['functionalEvidence', 'assayFacts', 'scoreDistribution']
        if (this.highlightedRowKey !== this.highlightedRowBeforeSelection) changed.push('clinical')
        this.flashPanels(changed)
        this.scrollToEvidencePending = false
      })
    },

    // Ring panels whose contents just changed, so it's clear what an action affected. Dropping the class and
    // forcing a reflow lets re-adding it replay an in-progress ring.
    flashPanels(refs: string[]) {
      for (const ref of refs) {
        const panel = (this.$refs[ref] as InstanceType<typeof MvPanel> | undefined)?.$el as HTMLElement | undefined
        if (!panel) continue
        panel.classList.remove('mave-flash-outline')
        void panel.offsetWidth
        panel.classList.add('mave-flash-outline')
        panel.addEventListener('animationend', () => panel.classList.remove('mave-flash-outline'), {once: true})
      }
    },

    downloadSelectedCsv({namespaces}: {namespaces: string[]}) {
      this.lookup.downloadVariantCsvFile(namespaces)
    },

    toIsoDate(date: Date): string {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
})
</script>
