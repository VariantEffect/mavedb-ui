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
              across {{ lookup.uniqueAssayCount.value }} score sets</template
            >
          </p>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto w-full px-4 tablet:px-6 py-6 tablet:py-8" style="max-width: 1000px">
      <!-- ── CONTROL ROW (query axes: content valid-time + superseded scope) — always rendered so the
           as_of / superseded controls stay reachable even when the query returns no measurements ── -->
      <div
        class="mave-gradient-bar relative overflow-hidden mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-x-5 tablet:gap-y-2 tablet:px-5 tablet:py-2.5"
      >
        <div class="flex flex-1 items-center gap-2 text-xs text-text-secondary">
          <span v-key-term="'as-of'" class="font-semibold uppercase tracking-[0.3px] text-[#aaa]">MaveDB as of</span>
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
              : 'border-border bg-surface text-text-secondary hover:border-sage hover:text-sage'
          "
          type="button"
          @click="lookup.includeSuperseded.value = !lookup.includeSuperseded.value"
        >
          <i class="pi text-[11px]" :class="lookup.includeSuperseded.value ? 'pi-check' : 'pi-plus'" />
          {{ lookup.includeSuperseded.value ? 'Hide superseded variants' : 'Show superseded variants' }}
        </button>
        <button
          class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors"
          :class="
            keyDrawer.isOpen.value
              ? 'border-sage bg-sage text-white'
              : 'border-border bg-surface text-text-secondary hover:border-sage hover:text-sage'
          "
          type="button"
          @click="keyDrawer.isOpen.value ? keyDrawer.close() : keyDrawer.open()"
        >
          <i class="pi pi-key text-[11px]" />
          Key
        </button>
      </div>

      <!-- Error state -->
      <MvErrorState v-if="lookup.variantsStatus.value === 'Error'" @retry="lookup.fetchVariants" />

      <!-- Loading state -->
      <MvPageLoading v-else-if="lookup.variantsStatus.value === 'Loading'" text="Loading variant measurements..." />

      <!-- Empty state -->
      <MvEmptyState
        v-else-if="lookup.variants.value.length === 0"
        :description="emptyStateDescription"
        title="No measurements found"
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
                label="Nucleotide"
              />
              <MvBadgeToggle
                v-if="lookup.proteinCount.value > 0"
                v-model="lookup.showProtein.value"
                active-background="var(--color-amino-acid-light)"
                active-border="var(--color-amino-acid-border)"
                color="var(--color-amino-acid)"
                :count="lookup.proteinCount.value"
                label="Amino acid"
              />
            </div>
          </div>
          <!-- Anchor heading: names the frame of reference so the per-card relationship badges
               ("Your variant" / "Its protein consequence" / "Encodes the protein consequence") read as
               self-explaining rather than needing a per-badge tooltip. -->
          <div class="px-4 tablet:px-5 pt-3.5 text-xs-minus text-text-muted">
            What each result assayed, relative to your variant:
          </div>
          <!-- Desktop: horizontal scroll strip -->
          <div class="measurement-switcher hidden tablet:flex gap-3 overflow-x-auto px-5 py-4">
            <MvMeasurementCard
              v-for="m in lookup.filteredVariants.value"
              :key="'desktop-' + m.variantUrn"
              :active="lookup.selectedVariantUrn.value === m.variantUrn"
              :loading="lookup.selectedVariantUrn.value === m.variantUrn && lookup.selectedLoading.value"
              :assay-level="m.assayLevel"
              :assay-type="lookup.getKeyword(m.scoreSetUrn, 'Phenotypic Assay Method')"
              :mechanism="lookup.getKeyword(m.scoreSetUrn, 'Molecular Mechanism Assessed')"
              :model-system="lookup.getKeyword(m.scoreSetUrn, 'Phenotypic Assay Model System')"
              :preferred-classification="m.preferredClassification ?? null"
              :relationship="m.relationship"
              :score="m.score ?? null"
              :score-set-title="m.scoreSetTitle || 'Untitled score set'"
              :score-set-urn="m.scoreSetUrn"
              @select="lookup.selectVariant(m.variantUrn)"
            />
          </div>
          <!-- Mobile: dropdown selector -->
          <div class="tablet:hidden flex items-center gap-2 px-4 py-3">
            <PSelect
              class="min-w-0 flex-1"
              :model-value="lookup.selectedVariantUrn.value"
              option-label="label"
              option-value="urn"
              :options="measurementOptions"
              @update:model-value="lookup.selectVariant($event)"
            />
            <i
              v-if="lookup.selectedLoading.value"
              aria-label="Loading variant details"
              class="pi pi-spin pi-spinner text-sage"
            />
          </div>
        </div>

        <!-- ── SUPERSESSION BANNER ───────────────────────────── -->
        <div
          v-if="lookup.selectedVariantDetail.value && !lookup.selectedVariantDetail.value.isCurrent"
          class="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <i class="pi pi-exclamation-triangle mt-0.5 text-xs" />
          <div>
            This measurement is from a superseded version of its score set and may not reflect the current data.
            <template v-if="lookup.selectedVariantDetail.value.supersededByScoreSet">
              A newer version of this score set is available at
              <router-link
                class="font-semibold underline"
                :to="{name: 'scoreSet', params: {urn: lookup.selectedVariantDetail.value.supersededByScoreSet}}"
              >
                {{ lookup.selectedVariantDetail.value.supersededByScoreSet }} </router-link
              >. It is not guaranteed that it will contain a corresponding variant.
            </template>
          </div>
        </div>

        <!-- ── FUNCTIONAL EVIDENCE (MaveDB) ───────────────────── First-class: the functional measurement is
             MaveDB's own contribution, so it leads the page. Descriptive annotations (VEP) sit in the identity 
             section below; external reference evidence sits in its own card below. -->
        <div
          v-if="lookup.selectedVariantDetail.value"
          class="relative mt-6 rounded-lg border bg-surface px-[18px] py-3.5"
        >
          <div class="mb-2.5 flex flex-wrap items-center gap-2">
            <h3 class="mave-section-title !mb-0">Functional evidence</h3>
            <span class="text-xs-minus text-text-muted">measured in this score set</span>
            <span
              v-if="primaryConfidenceBadge"
              v-key-term="'confidence'"
              class="ml-auto rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.3px]"
              :class="primaryConfidenceBadge.class"
              >{{ primaryConfidenceBadge.label }}</span
            >
          </div>
          <div v-if="lookup.selectedVariantScore.value != null" class="flex flex-wrap gap-x-10 gap-y-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]">Functional impact</span>
              <MvClassificationTag
                v-if="lookup.calibrationResolution.classification.value"
                v-key-term="'functional-impact'"
                :classification="lookup.calibrationResolution.classification.value"
              />
              <span v-else class="text-sm text-text-muted">—</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]">Functional score</span>
              <span class="text-sm font-semibold text-text-primary">{{
                lookup.selectedVariantScore.value?.toPrecision(4)
              }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]">ACMG code</span>
              <MvEvidenceTag
                v-if="lookup.calibrationResolution.formattedEvidenceCode.value"
                v-key-term="'acmg'"
                :code="lookup.calibrationResolution.formattedEvidenceCode.value"
              />
              <span v-else class="text-sm text-text-muted">—</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]">OddsPath ratio</span>
              <span class="text-sm font-semibold text-text-primary">{{
                lookup.calibrationResolution.scoreRange.value?.oddspathsRatio ?? '—'
              }}</span>
            </div>
          </div>
          <p v-else class="text-xs-plus italic text-text-muted">No score available</p>
        </div>

        <!-- ── VARIANT & ASSAY DETAILS ──────────────────────── -->
        <template v-if="lookup.selectedVariantDetail.value">
          <!-- Desktop: single card with two columns -->
          <div class="relative mt-6 hidden tablet:block rounded-lg border border-border bg-surface px-[18px] py-3.5">
            <div class="grid grid-cols-2">
              <div class="border-r border-border-light pr-[18px]">
                <VariantInfoSection
                  :allele-name="lookup.clingenAllele.alleleName.value"
                  :clingen-allele-id="lookup.selectedClingenAlleleId.value"
                  :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
                  :genomic-locations="lookup.clingenAllele.genomicLocations.value"
                  :molecular-consequence="primaryMolecularConsequence"
                />
              </div>
              <div class="pl-[18px]">
                <MvAssayFactsCard
                  :assay-level="lookup.selectedVariantDetail.value?.assayLevel ?? null"
                  :columns="1"
                  :score-set="lookup.selectedScoreSet.value ?? undefined"
                  show-urn
                  :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined"
                />
              </div>
            </div>
          </div>

          <!-- Mobile: separate cards -->
          <div class="mt-6 tablet:hidden relative rounded-lg border border-border bg-surface px-4 py-3.5">
            <VariantInfoSection
              :allele-name="lookup.clingenAllele.alleleName.value"
              :clingen-allele-id="lookup.selectedClingenAlleleId.value"
              :clinvar-allele-ids="lookup.clingenAllele.clinvarAlleleIds.value"
              :genomic-locations="lookup.clingenAllele.genomicLocations.value"
              :molecular-consequence="primaryMolecularConsequence"
            />
          </div>
          <div class="mt-4 tablet:hidden relative rounded-lg border border-border bg-surface px-4 py-3.5">
            <MvAssayFactsCard
              :assay-level="lookup.selectedVariantDetail.value?.assayLevel ?? null"
              :columns="1"
              :score-set="lookup.selectedScoreSet.value ?? undefined"
              show-urn
              :variant-urn="lookup.selectedVariantDetail.value?.urn ?? undefined"
            />
          </div>
        </template>

        <!-- ── EXTERNAL EVIDENCE ──────────────────────────────── Reference data pulled from other databases,
             for comparison against the functional evidence above. Rendered only when there is at least one 
             external annotation. -->
        <div
          v-if="lookup.selectedVariantDetail.value && hasExternalEvidence"
          class="relative mt-4 rounded-lg border border-border bg-surface px-[18px] py-3.5"
        >
          <div class="mb-2.5 flex flex-wrap items-center gap-2">
            <h3 class="mave-section-title !mb-0">External evidence</h3>
            <span class="text-xs-minus text-text-muted">from reference databases</span>
            <span
              v-if="primaryGroup && !primaryGroup.annotationsMatch"
              class="ml-auto text-[10px] font-semibold uppercase tracking-[0.3px] text-amber-600"
              >differ by level</span
            >
          </div>
          <!-- Same fold + underlying-annotations popovers as the score-set variant panel, so both surfaces
               apply identical placement rules and expose the precise underlying gnomAD/ClinVar records. -->
          <div class="grid grid-cols-1 gap-x-8 gap-y-4 tablet:grid-cols-2">
            <VariantGnomadStat
              :alleles="lookup.selectedVariantDetail.value.alleles"
              :annotations="lookup.selectedVariantDetail.value.annotations"
              :assay-gnomad="assayGnomad"
              plain
            >
              <template #label>
                <span
                  v-key-term="'population'"
                  class="w-fit text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]"
                  >Population frequency</span
                >
              </template>
            </VariantGnomadStat>
            <VariantClinvarStat
              :alleles="lookup.selectedVariantDetail.value.alleles"
              :annotations="lookup.selectedVariantDetail.value.annotations"
              :assay-level-digest="lookup.selectedVariantDetail.value.assayLevelDigest"
              :clinvar-version="clinvarControls.controlVersion"
              plain
            >
              <template #label>
                <span
                  v-key-term="'clinical'"
                  class="w-fit text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]"
                  >Clinical significance</span
                >
              </template>
            </VariantClinvarStat>
          </div>
        </div>

        <!-- ── RELATED ALLELES ───────────────────────────────── Sibling alleles used as context;
             subordinate to the evidence panel above (lighter, collapsed by default). -->
        <div
          v-if="lookup.selectedVariantDetail.value && siblingGroups.length > 0"
          class="relative mt-4 rounded-lg border border-border-light bg-surface px-[18px] py-3.5"
        >
          <MvRelatedAlleles :groups="siblingGroups" :variant-urn="lookup.selectedVariantDetail.value.urn" />
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
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import SplitButton from 'primevue/splitbutton'
import {defineComponent, toRef, type PropType} from 'vue'
import {useRoute} from 'vue-router'
import {useHead} from '@unhead/vue'
import {useToast} from 'primevue/usetoast'

import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
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
import {useClinvarControls} from '@/composables/use-clinvar-controls'
import {useKeyDrawer} from '@/composables/use-key-drawer'
import MvRelatedAlleles from '@/components/variant/MvRelatedAlleles.vue'
import MvClassificationTag from '@/components/common/MvClassificationTag.vue'
import VariantGnomadStat from '@/components/variant/VariantGnomadStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import MvMeasurementCard from '@/components/variant/MvMeasurementCard.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import VariantInfoSection from '@/components/variant/VariantInfoSection.vue'
import {useVariantLookup} from '@/composables/use-variant-lookup'
import {assayLevelDisplay} from '@/lib/measurement-types'
import {hasFunctionalCalibrations, hasPathogenicityCalibrations} from '@/lib/calibrations'
import {confidenceBadge, groupAlleles, type AlleleGroup, type ConfidenceBadge} from '@/lib/allele-grouping'
import {formatConsequence} from '@/lib/formats'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type GnomadAnnotation = components['schemas']['GnomadAnnotation']

export default defineComponent({
  name: 'VariantScreen',

  components: {
    CalibrationTable,
    DatePicker,
    MvRelatedAlleles,
    MvClassificationTag,
    VariantGnomadStat,
    VariantClinvarStat,
    MvAssayFactsCard,
    MvBadgeToggle,
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
    },
    // The `?variant=` highlight URN — pre-selects a measurement card.
    highlightVariantUrn: {
      type: [String, null] as PropType<string | null>,
      default: null
    }
  },

  setup(props) {
    const route = useRoute()

    const lookup = useVariantLookup(toRef(props, 'clingenAlleleId'), {
      highlightUrn: toRef(props, 'highlightVariantUrn'),
      // Seed the query-axis controls from the URL so shared links load in a single fetch.
      initialIncludeSuperseded: (route.query.include_superseded as string)?.toLowerCase() === 'true',
      initialAsOf: typeof route.query.as_of === 'string' ? route.query.as_of : null,
      toast: useToast()
    })

    const clinvarControls = useClinvarControls(lookup.selectedScoreSetUrn, lookup.scores)

    return {
      head: useHead({title: 'Variant search results'}),
      lookup,
      clinvarControls,
      keyDrawer: useKeyDrawer()
    }
  },

  computed: {
    queryAxisState(): {includeSuperseded: boolean; asOf: string | null; selectedVariantUrn: string | null} {
      return {
        includeSuperseded: this.lookup.includeSuperseded.value,
        asOf: this.lookup.asOf.value,
        selectedVariantUrn: this.lookup.selectedVariantUrn.value
      }
    },
    pageTitle(): string {
      return this.lookup.clingenAllele.alleleName.value || this.lookup.selectedVariantName.value || 'Variant'
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
    // The subject of the page: the searched (page-root) allele, falling back to the measured allele. Its
    // annotations are promoted into the evidence panel; everything else is a "related allele" control.
    primaryGroup(): AlleleGroup | null {
      const groups = this.alleleGroups
      return groups.find((g) => g.pageRoot) ?? groups.find((g) => g.measured) ?? groups[0] ?? null
    },
    siblingGroups(): AlleleGroup[] {
      const primary = this.primaryGroup
      return this.alleleGroups.filter((g) => g !== primary)
    },
    primaryAnnotations(): AlleleAnnotations | null {
      return this.primaryGroup?.coalescedAnnotations ?? null
    },
    // VEP molecular consequence for the primary allele.
    primaryMolecularConsequence(): string | null {
      const consequence = this.primaryAnnotations?.vep?.consequence
      return consequence ? formatConsequence(consequence) : null
    },
    // The measured allele's own gnomAD annotation — the headline the gnomAD cell shows straight up (siblings
    // are enumerated by the cell itself when the measured allele has none, e.g. a protein-level assay).
    assayGnomad(): GnomadAnnotation | null {
      const detail = this.lookup.selectedVariantDetail.value
      const digest = detail?.assayLevelDigest
      return (digest ? detail?.annotations?.[digest]?.gnomad : null) ?? null
    },
    // Whether any allele on the record carries a gnomAD or ClinVar annotation — gates the evidence card.
    hasExternalEvidence(): boolean {
      const annotations = this.lookup.selectedVariantDetail.value?.annotations
      if (!annotations) return false
      return Object.values(annotations).some((a) => a.gnomad || (a.clinvar?.length ?? 0) > 0)
    },
    // Confidence/provenance badge for the primary allele (Measured / Resolved / Candidate).
    primaryConfidenceBadge(): ConfidenceBadge | null {
      return this.primaryGroup ? confidenceBadge(this.primaryGroup) : null
    },
    today(): Date {
      return new Date()
    },
    // Points the empty state back at the active query controls, since an as_of / superseded filter is a
    // common reason a valid allele returns nothing.
    emptyStateDescription(): string {
      if (this.lookup.asOf.value) {
        return this.lookup.includeSuperseded.value
          ? `No measurements found as of ${this.lookup.asOf.value}. Try a more recent date.`
          : `No measurements found as of ${this.lookup.asOf.value}. Try a more recent date, or include superseded versions.`
      }
      if (!this.lookup.includeSuperseded.value) {
        return 'No current measurements were found for this allele. Try including superseded versions.'
      }
      return 'No measurements were found for this allele.'
    },
    // Maps the DatePicker's Date|null ⇄ the composable's `as_of` date string (null = current). A date-only
    // string is valid ISO 8601; the API reconstructs the molecular/annotation layer at that instant.
    // Built from local Y/M/D to avoid a UTC off-by-one.
    asOfDate: {
      get(): Date | null {
        return this.lookup.asOf.value ? new Date(`${this.lookup.asOf.value}T00:00:00`) : null
      },
      set(value: Date | null) {
        this.lookup.asOf.value = value ? this.toIsoDate(value) : null
      }
    },
    measurementOptions(): {label: string; urn: string}[] {
      return this.lookup.filteredVariants.value.map((m) => ({
        label: `${m.scoreSetTitle || 'Untitled score set'} (${assayLevelDisplay(m.assayLevel).label})`,
        urn: m.variantUrn
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
      if (!activeVariant) return options

      // Mapping is present iff the envelope built a molecular representation (Cat-VRS) for the variant.
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
    }
  },

  watch: {
    // Reflect the query-axis controls + selected measurement in the URL (shareable/citation). Guarded
    // against redundant nav. Writing `variant` keeps the selection ↔ `?variant=` highlight in sync, so the
    // URL always points at the card the user is on.
    queryAxisState({includeSuperseded, asOf, selectedVariantUrn}: {includeSuperseded: boolean; asOf: string | null; selectedVariantUrn: string | null}) {
      const query = {...this.$route.query}
      if (includeSuperseded) query.include_superseded = 'true'
      else delete query.include_superseded
      if (asOf) query.as_of = asOf
      else delete query.as_of
      if (selectedVariantUrn) query.variant = selectedVariantUrn
      else delete query.variant
      if (JSON.stringify(query) !== JSON.stringify(this.$route.query)) this.$router.replace({query})
    },
    // Pull external URL changes (back/forward, edited link) back into the controls.
    '$route.query'(query: Record<string, string | string[] | null | undefined>) {
      const includeSuperseded = (query.include_superseded as string)?.toLowerCase() === 'true'
      const asOf = typeof query.as_of === 'string' ? query.as_of : null
      if (this.lookup.includeSuperseded.value !== includeSuperseded) this.lookup.includeSuperseded.value = includeSuperseded
      if ((this.lookup.asOf.value ?? null) !== asOf) this.lookup.asOf.value = asOf
    },
    'lookup.clingenAllele.alleleName.value'(name: string | undefined) {
      this.head!.patch({title: name ? `Variant ${name}` : 'Variant'})
    }
  },

  methods: {
    toIsoDate(date: Date): string {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
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
