<template>
  <MvLayout>
    <template v-if="itemStatus === 'Loaded' && item" #header>
      <MvPageHeader eyebrow="Score Set" max-width="1000px" :title="item.title || 'Untitled score set'">
        <template v-if="item.supersedingScoreSet || !item.publishedDate" #alerts>
          <div class="flex flex-col gap-3">
            <MvStatusMessage v-if="item.supersedingScoreSet" severity="warn">
              A newer version of this score set is available:
              <MvEntityLink
                class="font-semibold underline"
                display="urn"
                entity-type="scoreSet"
                :urn="item.supersedingScoreSet.urn"
                :use-cache="true"
              />. The data below may be outdated.
            </MvStatusMessage>
            <ScoreSetProcessingStatus :score-set="item" />
          </div>
        </template>
        <template #subtitle>
          <div class="-mt-3 text-sm text-text-muted">{{ item.urn }}</div>
          <div v-if="item.shortDescription" class="mt-2 text-sm leading-relaxed text-text-secondary">
            {{ item.shortDescription }}
          </div>
        </template>
        <template #actions>
          <div class="hidden items-center gap-2 tablet:flex">
            <PButton
              v-if="permissions.publish && !item.publishedDate"
              label="Publish"
              severity="warn"
              size="small"
              @click="publishItem"
            />
            <PButton v-if="permissions.update" label="Edit" severity="secondary" size="small" @click="editItem" />
          </div>
          <MvRowActionMenu :actions="headerActions" />
        </template>
        <template #metadata>
          <MvMetadataLine
            class="mt-3"
            :created-by="item.createdBy"
            :creation-date="item.creationDate"
            jump-to-id="detailed-metadata"
            :modification-date="item.modificationDate"
            :modified-by="item.modifiedBy"
            :published-date="item.publishedDate"
          />
        </template>
      </MvPageHeader>
    </template>

    <!-- Loading -->
    <MvPageLoading v-if="itemStatus === 'Loading' || itemStatus === 'NotLoaded'" text="Loading score set..." />

    <!-- Not found -->
    <MvItemNotFound v-else-if="itemStatus === 'Failed'" :item-id="itemId" model="score set" />

    <!-- Loaded -->
    <template v-else-if="itemStatus === 'Loaded' && item">
      <MvCollectionStrip
        data-set-type="scoreSet"
        :data-set-urn="item.urn"
        :official-collections="item.officialCollections"
      />

      <div class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1000px">
        <!-- Variant search + selected-variant detail — one unit -->
        <div
          v-if="variants?.length"
          class="mave-gradient-bar relative mb-4 overflow-hidden rounded-lg border border-border bg-surface"
        >
          <div class="flex flex-col gap-3 px-4 py-3 tablet:flex-row tablet:items-center">
            <ScoreSetVariantSearch
              v-model="selectedVariant"
              class="mt-2"
              :clinical="clinvarControls"
              :frame="frame"
              :variants="variants ?? []"
            />
            <div class="flex items-center gap-2 text-sm text-text-secondary tablet:ml-auto">
              <span
                :class="[
                  clinicalMode ? 'text-text-muted' : 'font-semibold text-sage',
                  {'opacity-50': coordinateSwitching}
                ]"
                >Submitted variants</span
              >
              <!-- Wrapper so the tooltip fires even when the switch is disabled (a disabled control has
                 pointer-events: none and won't trigger a tooltip on itself). Only shown when mapped
                 mode is unavailable — clinicalModeHelpText returns the "no mapped variants" reason then. -->
              <span
                v-tooltip.top="mappedModeAvailable ? undefined : clinicalModeHelpText"
                class="inline-flex"
                :class="{'cursor-not-allowed': !mappedModeAvailable}"
              >
                <ToggleSwitch
                  :aria-label="`Click to change to ${clinicalMode ? 'submitted data' : 'clinical view'}.`"
                  :disabled="coordinateSwitching || !mappedModeAvailable"
                  :model-value="clinicalMode"
                  @update:model-value="toggleClinicalMode"
                />
              </span>
              <span
                :class="[
                  clinicalMode ? 'font-semibold text-sage' : 'text-text-muted',
                  {'opacity-50': coordinateSwitching}
                ]"
                >Reference variants</span
              >
              <i v-if="coordinateSwitching" class="pi pi-spinner pi-spin text-xs text-sage" />
              <span
                v-tooltip.top="clinicalModeHelpText"
                class="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-sage text-[10px] font-bold text-white"
                >?</span
              >
            </div>
          </div>

          <!-- Selected-variant detail (assayed variant envelope: GET /variants/{urn}), flush within the card -->
          <VariantDetailPanel
            v-if="variantToVisualize?.variantUrn"
            :key="variantToVisualize.variantUrn"
            :clinvar-version="clinvarControls.controlVersion"
            :coordinate="variantOptionLabel(variantToVisualize)"
            :flush="true"
            :identify="false"
            :selected-calibration-id="selectedCalibrationObjects[0]?.id ?? null"
            :underlying-coordinate="variantUnderlyingLabel(variantToVisualize) ?? ''"
            :urn="variantToVisualize.variantUrn"
          />
        </div>

        <!-- Variants loading spinner -->
        <div v-if="variants == null && variantsDataStatus !== 'Loaded'" class="flex items-center justify-center py-6">
          <MvLoader text="Loading variants..." />
        </div>

        <!-- Visualizations -->
        <template v-if="variants?.length">
          <!-- Score Distribution -->
          <div class="mb-4 overflow-hidden rounded-lg border border-border bg-surface">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-4 py-3.5 tablet:px-5"
            >
              <h3 class="mave-section-title">Score Distribution</h3>
              <div v-if="distHistogramExportFn" class="inline-flex items-center gap-1">
                <SplitButton
                  :disabled="distHistogramInProgress"
                  icon="pi pi-download"
                  label="Export SVG"
                  :model="[{label: 'Export PNG', icon: 'pi pi-image', command: exportDistHistogramPng}]"
                  severity="secondary"
                  size="small"
                  @click="exportDistHistogramSvg"
                />
                <i v-if="distHistogramInProgress" class="pi pi-spin pi-spinner text-sm text-muted" />
              </div>
            </div>
            <div class="p-3 tablet:p-5">
              <ScoreSetHistogram
                ref="distHistogram"
                :clinical="clinvarControls"
                :coordinates="frame"
                :default-histogram="'distribution'"
                :external-selection="variantToVisualize"
                :hide-start-and-stop-loss-by-default="hideStartAndStopLoss"
                :lock-selection="variantToVisualize != null"
                :score-set="item"
                :selected-calibration="selectedCalibrations[0]"
                :variants="variants"
                @calibration-changed="(cal) => childComponentSelectedCalibration(cal, 0)"
                @export-chart="setDistHistogramExport"
                @selection-changed="
                  (payload) => onHistogramSelectionChanged(payload, {syncTarget: 'clinicalHistogram'})
                "
              />
            </div>
            <div
              v-if="selectedCalibrationObjects[0] && !sameCalibrationSelected"
              class="border-t border-border-light p-5"
            >
              <CalibrationTable :score-calibration="selectedCalibrationObjects[0]" />
            </div>
            <div
              v-if="hasCalibrations"
              class="flex items-center gap-2 border-t border-border-light px-5 py-3 text-xs text-text-muted"
            >
              <template v-if="selectedCalibrationObjects[0] && sameCalibrationSelected">
                <i class="pi pi-info-circle" />
                Calibration details shown on Clinical Score Distribution below.
              </template>
              <router-link
                class="ml-auto font-semibold text-link no-underline"
                :to="{path: `/score-sets/${item.urn}/calibrations`}"
              >
                View all calibrations &rarr;
              </router-link>
            </div>
          </div>

          <!-- Clinical Score Distribution -->
          <div v-if="hasClinicalVariants" class="mb-4 overflow-hidden rounded-lg border border-border bg-surface">
            <div
              class="flex flex-wrap items-center justify-between gap-3 border-b border-border-light px-4 py-3.5 tablet:px-5"
            >
              <h3 class="mave-section-title">Clinical Score Distribution</h3>
              <div v-if="clinicalHistogramExportFn" class="inline-flex items-center gap-1">
                <SplitButton
                  :disabled="clinicalHistogramInProgress"
                  icon="pi pi-download"
                  label="Export SVG"
                  :model="[{label: 'Export PNG', icon: 'pi pi-image', command: exportClinicalHistogramPng}]"
                  severity="secondary"
                  size="small"
                  @click="exportClinicalHistogramSvg"
                />
                <i v-if="clinicalHistogramInProgress" class="pi pi-spin pi-spinner text-sm text-muted" />
              </div>
            </div>
            <div class="p-3 tablet:p-5">
              <ScoreSetHistogram
                ref="clinicalHistogram"
                :clinical="clinvarControls"
                :coordinates="frame"
                :default-histogram="'clinical'"
                :external-selection="variantToVisualize"
                :hide-start-and-stop-loss-by-default="hideStartAndStopLoss"
                :lock-selection="variantToVisualize != null"
                :score-set="item"
                :selected-calibration="selectedCalibrations[1]"
                :variants="variants"
                @calibration-changed="(cal) => childComponentSelectedCalibration(cal, 1)"
                @export-chart="setClinicalHistogramExport"
                @selection-changed="(payload) => onHistogramSelectionChanged(payload, {syncTarget: 'distHistogram'})"
              />
            </div>
            <div v-if="selectedCalibrationObjects[1]" class="border-t border-border-light p-5">
              <CalibrationTable :score-calibration="selectedCalibrationObjects[1]" />
            </div>
            <div v-if="hasCalibrations" class="flex items-center justify-end border-t border-border-light px-5 py-3">
              <router-link
                class="text-xs font-semibold text-link no-underline"
                :to="{path: `/score-sets/${item.urn}/calibrations`}"
              >
                View all calibrations &rarr;
              </router-link>
            </div>
          </div>

          <!-- Variant Effect Heatmap -->
          <div
            v-if="showHeatmap && !isScoreSetVisualizerVisible"
            class="mb-4 overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div
              class="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border-light bg-surface px-4 py-3.5 tablet:px-5"
            >
              <h3 class="mave-section-title">Variant Effect Heatmap</h3>
              <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
                <Select
                  v-if="heatmapSequenceTypeOptions.length > 1"
                  :model-value="heatmapSequenceType"
                  option-label="title"
                  option-value="value"
                  :options="heatmapSequenceTypeOptions"
                  size="small"
                  @update:model-value="heatmapSequenceType = $event"
                >
                  <template #value="{value}">
                    Sequence: {{ heatmapSequenceTypeOptions.find((o) => o.value === value)?.title ?? value }}
                  </template>
                </Select>
                <Select
                  :model-value="heatmapLayout"
                  option-label="title"
                  option-value="value"
                  :options="heatmapLayoutOptions"
                  size="small"
                  @update:model-value="heatmapLayout = $event"
                >
                  <template #value="{value}">
                    Layout: {{ heatmapLayoutOptions.find((o) => o.value === value)?.title ?? value }}
                  </template>
                </Select>
                <PButton
                  v-if="uniprotId != null"
                  icon="pi pi-box"
                  label="Protein Structure"
                  severity="secondary"
                  size="small"
                  @click="showProteinStructureModal"
                />
                <div v-if="heatmapExportFn" class="inline-flex items-center gap-1">
                  <SplitButton
                    :disabled="heatmapInProgress"
                    icon="pi pi-download"
                    label="Export SVG"
                    :model="[{label: 'Export PNG', icon: 'pi pi-image', command: exportHeatmapPng}]"
                    severity="secondary"
                    size="small"
                    @click="exportHeatmapSvg"
                  />
                  <i v-if="heatmapInProgress" class="pi pi-spin pi-spinner text-sm text-muted" />
                </div>
              </div>
            </div>
            <div class="p-3 tablet:p-5">
              <ScoreSetHeatmap
                ref="heatmap"
                :coordinates="frame"
                :external-selection="variantToVisualize"
                :hide-start-and-stop-loss="hideStartAndStopLoss"
                :layout="heatmapLayout"
                :score-set="item"
                :sequence-type="heatmapSequenceType"
                :show-protein-structure-button="false"
                :variants="variants"
                @export-chart="setHeatmapExport"
                @heatmap-visible="heatmapVisibilityUpdated"
                @update:sequence-type="heatmapSequenceType = $event"
                @variant-selected="childComponentSelectedVariant"
              />
            </div>
          </div>
        </template>

        <!-- No visualizations available -->
        <MvEmptyState
          v-else-if="item.processingState === 'failed'"
          class="mb-4"
          description="Variant data could not be processed. Visualizations are unavailable until processing errors are resolved."
          title="Visualizations unavailable"
        />

        <!-- Downloads -->
        <div class="mb-6">
          <ScoreSetDownloads
            :has-counts="hasCounts"
            :has-functional-impact-calibrations="hasFunctionalImpactCalibrations"
            :has-pathogenicity-calibrations="hasPathogenicityCalibrations"
            :is-meta-data-empty="isMetaDataEmpty"
            :score-set="item"
          />
        </div>

        <!-- Details section -->
        <div id="detailed-metadata" class="scroll-mt-4">
          <h2 class="mb-4 text-base font-bold text-text-dark">Details and Metadata</h2>
          <hr class="mb-4 border-border" />
        </div>

        <!-- Assay Facts -->
        <div class="mb-4 mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white p-5">
          <MvAssayFactsCard :assay-level="assayLevel" :link-title="false" :score-set="item" />
        </div>

        <!-- Attribution -->
        <div class="mb-4">
          <MvAttributionCard
            :contributors="contributors"
            :created-by="item.createdBy"
            :creation-date="item.creationDate"
            :data-usage-policy="item.dataUsagePolicy"
            :external-links="item.externalLinks || item.experiment?.externalLinks"
            :license="item.license"
            :meta-analyzes-urns="item.metaAnalyzesScoreSetUrns"
            :modification-date="item.modificationDate"
            :modified-by="item.modifiedBy"
            parent-label="Parent experiment"
            parent-route-name="experiment"
            :parent-urn="item.experiment?.urn"
            :published-date="item.publishedDate"
            :superseded-urn="item.supersededScoreSet?.urn"
            :superseding-urn="item.supersedingScoreSet?.urn"
            title="Attribution"
          />
        </div>

        <!-- Metadata card -->
        <div class="mb-4">
          <ScoreSetMetadataCard :item="item" />
        </div>

        <!-- Targets -->
        <div class="mb-4">
          <MvTargetsAccordion :target-genes="item.targetGenes" />
          <div
            v-if="item.targetGenes?.[0]?.targetAccession?.isBaseEditor"
            class="mt-2 text-sm font-bold text-text-secondary"
          >
            *This score set represents base editor data.
          </div>
        </div>

        <!-- External Identifiers -->
        <div class="mb-4">
          <MvExternalIdentifiersCard
            :doi-identifiers="item.doiIdentifiers"
            :raw-read-identifiers="item.experiment?.rawReadIdentifiers"
          />
        </div>

        <!-- Variants section -->
        <div id="variants" class="mb-4">
          <MvVariantPreview :score-set="item" />
        </div>
      </div>
    </template>
  </MvLayout>

  <!-- Protein structure drawer -->
  <div v-if="itemStatus === 'Loaded'" class="card flex justify-center">
    <Drawer
      v-model:visible="isScoreSetVisualizerVisible"
      class="scoreset-viz-sidebar"
      :header="item?.title"
      position="full"
    >
      <ScoreSetVisualizer
        :external-selection="variantToVisualize"
        :heatmap-variants="variants"
        :score-set="item"
        :scores="variants"
        :uniprot-id="uniprotId"
      />
    </Drawer>
  </div>

  <!-- Email prompt for calibration creation -->
  <MvEmailPrompt
    v-if="editorVisible"
    dialog="You must add an email address to your account to create calibrations. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />

  <!-- Calibration editor dialog -->
  <PrimeDialog
    v-model:visible="editorVisible"
    :base-z-index="2003"
    :close-on-escape="false"
    :header="editorDialogHeader"
    modal
    :style="{maxWidth: '90%', width: '75rem'}"
    @hide="closeCalibrationEditor"
  >
    <CalibrationEditor
      ref="calibrationEditorRef"
      :score-set-urn="editingScoreSetUrn"
      @canceled="closeCalibrationEditor"
      @saved="onCalibrationSaved"
    />
    <template #footer>
      <PButton icon="pi pi-times" label="Close" severity="secondary" @click="closeCalibrationEditor" />
      <PButton icon="pi pi-save" label="Save Changes" severity="success" @click="saveCreatedCalibration" />
    </template>
  </PrimeDialog>
</template>

<script lang="ts">
import _ from 'lodash'
import {markdownToHtml} from '@/lib/form-helpers'
import PButton from 'primevue/button'
import SplitButton from 'primevue/splitbutton'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import PrimeDialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import {ref, toRef} from 'vue'
import {useHead} from '@unhead/vue'

import CalibrationEditor from '@/components/calibration/CalibrationEditor.vue'
import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
import MvEmailPrompt from '@/components/common/MvEmailPrompt.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvAssayFactsCard from '@/components/common/MvAssayFactsCard.vue'
import MvCollectionStrip from '@/components/common/MvCollectionStrip.vue'
import MvEntityLink from '@/components/common/MvEntityLink.vue'
import MvExternalIdentifiersCard from '@/components/common/MvExternalIdentifiersCard.vue'
import MvMetadataLine from '@/components/common/MvMetadataLine.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvAttributionCard from '@/components/common/MvAttributionCard.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import MvStatusMessage from '@/components/common/MvStatusMessage.vue'
import MvTargetsAccordion from '@/components/common/MvTargetsAccordion.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import ScoreSetDownloads from '@/components/score-set/ScoreSetDownloads.vue'
import ScoreSetMetadataCard from '@/components/score-set/ScoreSetMetadataCard.vue'
import ScoreSetHeatmap from '@/components/score-set/ScoreSetHeatmap.vue'
import ScoreSetHistogram from '@/components/score-set/ScoreSetHistogram.vue'
import ScoreSetVariantSearch from '@/components/score-set/ScoreSetVariantSearch.vue'
import MvVariantPreview from '@/components/common/MvVariantPreview.vue'
import VariantDetailPanel from '@/components/variant/VariantDetailPanel.vue'
import ScoreSetProcessingStatus from '@/components/score-set/ScoreSetProcessingStatus.vue'
import ScoreSetVisualizer from '@/components/score-set/ScoreSetVisualizer.vue'

import useScopedId from '@/composables/scoped-id'
import useItem from '@/composition/item.ts'
import useRemoteData from '@/composition/remote-data'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import {useCalibrationDialog} from '@/composables/use-calibration-dialog'
import {useClinvarControls} from '@/composables/use-clinvar-controls'
import {useChartExport, type ChartExportFns} from '@/composables/use-chart-export'
import {useVariantCoordinates, type CoordinateFrame, type SequenceLevel} from '@/composables/use-variant-coordinates'
import config from '@/config'
import {hasPathogenicityCalibrations} from '@/lib/acmg'
import {hasFunctionalCalibrations} from '@/lib/calibrations'
import {getScoreSetShortName} from '@/lib/score-sets'
import {dominantAssayLevel} from '@/lib/measurement-types'
import {type DisplayVariant} from '@/lib/variants'
import {deleteScoreSet, publishScoreSet, getScoreSetClinvarControlOptions, leanScoreSetVariantsUrl} from '@/api/mavedb'
import {components} from '@/schema/openapi'
import MvLoader from '@/components/common/MvLoader.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'

type ScoreSet = components['schemas']['ScoreSet']
const ACTIONS = ['delete', 'publish', 'update', 'add_calibration']

export default {
  name: 'ScoreSetView',

  components: {
    CalibrationEditor,
    CalibrationTable,
    Drawer,
    MvEmailPrompt,
    MvItemNotFound,
    MvAssayFactsCard,
    MvCollectionStrip,
    MvEntityLink,
    MvExternalIdentifiersCard,
    MvEmptyState,
    MvLayout,
    MvMetadataLine,
    MvPageHeader,
    MvPageLoading,
    MvAttributionCard,
    MvRowActionMenu,
    MvStatusMessage,
    MvTargetsAccordion,
    MvVariantPreview,
    PButton,
    PrimeDialog,
    SplitButton,
    MvLoader,
    ScoreSetDownloads,
    ScoreSetHeatmap,
    ScoreSetHistogram,
    ScoreSetVariantSearch,
    ScoreSetMetadataCard,
    ScoreSetProcessingStatus,
    ScoreSetVisualizer,
    Select,
    ToggleSwitch,
    VariantDetailPanel
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup(props) {
    const head = useHead()
    const variantsRemoteData = useRemoteData()
    const selectedCalibrations = ref<(string | null)[]>([null, null])
    const urnRef = ref(props.itemId)

    // The score set's variants. Held in setup (not data) so the shared clinical-controls store can watch
    // them and associate `variant.control` in one place for every consumer (both histograms + the search).
    const variants = ref<DisplayVariant[] | null>(null)
    const clinvarControls = useClinvarControls(toRef(props, 'itemId'), variants)

    const {permissions} = useDatasetPermissions('score-set', urnRef, ACTIONS)

    const distHistogramExportFn = ref<ChartExportFns | null>(null)
    const clinicalHistogramExportFn = ref<ChartExportFns | null>(null)
    const heatmapExportFn = ref<ChartExportFns | null>(null)
    const distHistogramChart = useChartExport(distHistogramExportFn)
    const clinicalHistogramChart = useChartExport(clinicalHistogramExportFn)
    const heatmapChart = useChartExport(heatmapExportFn)

    return {
      head,
      config,
      permissions,
      selectedCalibrations,
      variants,
      clinvarControls,

      ...useCalibrationDialog(),
      ...useItem<ScoreSet>({itemTypeName: 'scoreSet'}),
      ...useScopedId(),
      ...useVariantCoordinates(),
      variantsData: variantsRemoteData.data,
      variantsDataStatus: variantsRemoteData.remoteDataStatus,
      setVariantsDataUrl: variantsRemoteData.setDataUrl,
      ensureVariantsDataLoaded: variantsRemoteData.ensureDataLoaded,

      distHistogramExportFn,
      clinicalHistogramExportFn,
      heatmapExportFn,
      exportDistHistogramSvg: distHistogramChart.exportSvg,
      exportDistHistogramPng: distHistogramChart.exportPng,
      distHistogramInProgress: distHistogramChart.inProgress,
      exportClinicalHistogramSvg: clinicalHistogramChart.exportSvg,
      exportClinicalHistogramPng: clinicalHistogramChart.exportPng,
      clinicalHistogramInProgress: clinicalHistogramChart.inProgress,
      exportHeatmapSvg: heatmapChart.exportSvg,
      exportHeatmapPng: heatmapChart.exportPng,
      heatmapInProgress: heatmapChart.inProgress
    }
  },

  data: () => ({
    clinicalMode: true,
    coordinateSwitching: false,
    showHeatmap: true,
    isScoreSetVisualizerVisible: false,
    hasClinicalVariants: false,
    heatmapExists: false,
    selectedVariant: null as DisplayVariant | null,
    heatmapSequenceType: 'protein' as SequenceLevel,
    heatmapLayout: 'normal' as 'normal' | 'compact',
    syncingBinSelection: false
  }),

  computed: {
    clinicalModeHelpText() {
      if (!this.mappedModeAvailable) {
        return 'This score set has no mapped variants, so only submitted coordinates are available.'
      }
      if (this.item?.targetGenes?.[0]?.targetSequence) {
        return 'In clinical mode, reference coordinates are used when available, and start- and stop-loss codons are omitted because this score set was produced using a synthetic target sequence.'
      }
      return 'In clinical mode, reference coordinates are used when available. For experiments with endogenously-edited targets, submitted and reference data are usually identical.'
    },
    contributors() {
      const creatorId = this.item?.createdBy?.orcidId
      return (this.item?.contributors || [])
        .filter((c) => c.orcidId !== creatorId)
        .sort((a, b) => (a.familyName ?? '').localeCompare(b.familyName ?? ''))
    },
    // The coordinate frame the page is displaying in: clinical mode reads the reference numbering,
    // non-clinical the submitted (target) numbering.
    frame(): CoordinateFrame {
      return this.clinicalMode ? 'reference' : 'submitted'
    },
    // Whether the reference frame has anything to show — some variant carries a reference coordinate at
    // some level. When false the score set has no mapped data (unmapped or unmappable), so reference mode
    // is disabled and the page makes only the submitted frame available.
    mappedModeAvailable(): boolean {
      return !!this.variants?.length && this.sequenceTypeOptions(this.variants, 'reference').length > 0
    },
    heatmapSequenceTypeOptions(): Array<{title: string; value: string}> {
      if (!this.variants?.length) return []
      return this.sequenceTypeOptions(this.variants, this.frame)
    },
    heatmapLayoutOptions(): Array<{title: string; value: string}> {
      return [
        {title: 'Normal', value: 'normal'},
        {title: 'Compact', value: 'compact'}
      ]
    },
    // The level this score set's variants were assayed at (protein / cDNA / genomic), derived from the
    // loaded variants since it isn't carried on the score-set metadata itself.
    assayLevel(): SequenceLevel | null {
      return this.variants?.length ? dominantAssayLevel(this.variants.map((v) => v.assayLevel)) : null
    },
    hasCounts() {
      const allCountColumns = this.item?.datasetColumns?.countColumns ?? []
      return allCountColumns.filter((col) => col !== 'accession').length > 0
    },
    hasPathogenicityCalibrations() {
      return hasPathogenicityCalibrations(this.item)
    },
    hasFunctionalImpactCalibrations() {
      return hasFunctionalCalibrations(this.item)
    },
    hasCalibrations(): boolean {
      return !!(this.item?.scoreCalibrations && this.item.scoreCalibrations.length > 0)
    },
    hasPrimaryCalibration(): boolean {
      return this.hasCalibrations && !!this.item?.scoreCalibrations?.some((cal) => cal.primary)
    },
    headerActions(): RowAction[] {
      const actions: RowAction[] = []
      if (this.permissions.update) {
        actions.push({label: 'Edit', handler: () => this.editItem()})
      }
      if (this.permissions.add_calibration && this.item) {
        actions.push({
          label: 'Add Calibration',
          handler: () => this.openCalibrationEditor(this.item!.urn)
        })
      }
      if (this.item) {
        actions.push({
          label: 'View Calibrations',
          handler: () => this.$router.push({path: `/score-sets/${this.item!.urn}/calibrations`})
        })
      }
      if (this.permissions.delete && this.item && !this.item.publishedDate) {
        actions.push({separator: true})
        actions.push({label: 'Delete', danger: true, handler: () => this.deleteItem()})
      }
      return actions
    },
    hideStartAndStopLoss() {
      return this.clinicalMode && !!this.item?.targetGenes?.[0]?.targetSequence
    },
    isMetaDataEmpty() {
      return Object.keys(this.item?.extraMetadata || {}).length === 0
    },
    selectedCalibrationObjects() {
      if (this.item?.scoreCalibrations && this.selectedCalibrations) {
        return this.selectedCalibrations.map(
          (urn) => this.item!.scoreCalibrations?.find((cal) => cal.urn === urn) ?? null
        )
      }
      return this.selectedCalibrations.map(() => null)
    },
    sameCalibrationSelected() {
      const cal1 = this.selectedCalibrations[0]
      return this.selectedCalibrations.every((cal) => cal === cal1)
    },
    uniprotId(): string | null {
      return _.size(this.item?.targetGenes) === 1
        ? _.get(this.item?.targetGenes, [0, 'uniprotIdFromMappedMetadata'], null)
        : null
    },
    // The variant to drive the detail panel / histograms / heatmap with — the current selection. The
    // search picker only ever emits an actual variant or null, so this is just the selection itself.
    variantToVisualize(): DisplayVariant | null {
      return this.selectedVariant
    }
  },

  watch: {
    item(newValue) {
      this.head.patch({title: newValue ? getScoreSetShortName(newValue) : undefined})
      if (newValue) {
        this.checkClinicalVariants()
        // Metadata is in and the shell can render, so now kick off the heavy variants load. The visuals
        // area shows its own "variants loading" state while this resolves.
        let variantsUrl = null
        if (this.itemType?.restCollectionName && this.itemId) {
          variantsUrl = leanScoreSetVariantsUrl(this.itemId)
        }
        this.setVariantsDataUrl(variantsUrl)
        this.ensureVariantsDataLoaded()
      }
    },
    itemId: {
      handler(newValue, oldValue) {
        if (newValue !== oldValue) {
          // Fetch ONLY the score-set metadata here. The variants payload is large and, fired concurrently,
          // starves the fast metadata request on the server — which keeps the full-page "loading" state up
          // the whole time. Deferring variants to the `item` watcher lets the shell render as soon as
          // metadata lands (~60ms), then the variants load behind it.
          this.setItemId(newValue)
        }
      },
      immediate: true
    },
    variantsData(newValue: unknown) {
      const records = (newValue as DisplayVariant[] | null) ?? null
      this.variants = records ? (Object.freeze(records) as DisplayVariant[]) : null
      // Start in mapped mode only when the score set actually has mapped data; otherwise fall back to
      // the raw frame (where the toggle is also disabled). Re-decided per score set as its variants load.
      this.clinicalMode = this.mappedModeAvailable
      this.applyUrlState()
      this.reconcileHeatmapLevel()
    },
    selectedVariant: 'refreshUrlState',
    selectedCalibrations: {handler: 'refreshUrlState', deep: true}
  },

  async mounted() {
    await this.checkClinicalVariants()
  },

  methods: {
    refreshUrlState() {
      const query = {...this.$route.query}
      if (this.selectedVariant) {
        query.variant = this.selectedVariant.variantUrn
      } else {
        delete query.variant
      }
      if (this.selectedCalibrations?.length > 0 && this.sameCalibrationSelected) {
        query.calibration = this.selectedCalibrations[0]
      } else {
        delete query.calibration
      }
      this.$router.replace({path: this.$route.path, query})
    },

    showProteinStructureModal() {
      this.isScoreSetVisualizerVisible = true
    },

    toggleClinicalMode(value: boolean) {
      this.coordinateSwitching = true
      this.clinicalMode = value
      this.reconcileHeatmapLevel()
      requestAnimationFrame(() => {
        this.coordinateSwitching = false
      })
    },

    reconcileHeatmapLevel() {
      // The frame toggle can strand the current sequence level: a level that exists in one frame may
      // not exist in the other (e.g. a nucleotide accession-based set has mapped protein but no raw
      // protein). Fall back to an available level so we never leave the heatmap on an empty view.
      if (!this.variants?.length) {
        return
      }
      const resolved = this.resolveLevel(this.variants, this.heatmapSequenceType, this.frame)
      if (resolved && resolved !== this.heatmapSequenceType) {
        this.heatmapSequenceType = resolved
      }
    },

    async checkClinicalVariants() {
      if (!this.item) return
      try {
        await getScoreSetClinvarControlOptions(this.item.urn)
        this.hasClinicalVariants = true
      } catch {
        // No clinical variants available
      }
    },

    editItem() {
      if (this.item) this.$router.replace({path: `/score-sets/${this.item.urn}/edit`})
    },

    async deleteItem() {
      // @ts-expect-error PrimeVue ConfirmationService plugin
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (!this.item) return
          try {
            await deleteScoreSet(this.item.urn)
            this.$toast.add({severity: 'success', summary: 'Your score set was successfully deleted.', life: 3000})
            this.$router.replace({path: '/dashboard'})
          } catch {
            this.$toast.add({severity: 'error', summary: 'Failed to delete score set.', life: 5000})
          }
        }
      })
    },

    markdownToHtml,

    async publishItem() {
      // @ts-expect-error PrimeVue ConfirmationService plugin
      this.$confirm.require({
        message:
          'Are you sure you want to publish this score set? Once published, you will be unable to edit scores, counts, or targets. You will also be unable to delete this score set.',
        header: 'Confirm Score Set Publication',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Publish', severity: 'success', icon: 'pi pi-check'},
        rejectProps: {label: 'Cancel', severity: 'secondary', icon: 'pi pi-times'},
        accept: async () => {
          if (!this.item) return
          try {
            const published = await publishScoreSet(this.item.urn)
            this.$toast.add({severity: 'success', summary: 'Your score set was successfully published.', life: 3000})
            this.$router.replace({path: `/score-sets/${published.urn}`})
          } catch {
            this.$toast.add({severity: 'error', summary: 'Failed to publish score set.', life: 5000})
          }
        }
      })
    },

    setDistHistogramExport(fns: ChartExportFns | null) {
      this.distHistogramExportFn = fns
    },
    setClinicalHistogramExport(fns: ChartExportFns | null) {
      this.clinicalHistogramExportFn = fns
    },
    setHeatmapExport(fns: ChartExportFns | null) {
      this.heatmapExportFn = fns
    },

    // Label for the selected-variant detail panel. A function (not a materialized field) so it
    // re-resolves from the current frame — flipping the clinical toggle re-labels reactively. PrimeVue
    // may hand back the raw typed string before a selection is made, so tolerate that.
    variantOptionLabel(variant: DisplayVariant | string): string {
      return typeof variant === 'string' ? variant : this.labelForVariant(variant, this.frame)
    },

    // The underlying nucleotide coordinate in the current frame, when it differs from the (protein-
    // preferred) display label — surfaced to disambiguate distinct coding variants that share a protein
    // label, and as provenance. `getHgvsNt` is coding-preferred (NM_:c.), so a genomic-measured variant
    // surfaces its coding key — the natural pair of the protein change — rather than the g. coordinate.
    // Null when the label already is the nucleotide coordinate.
    variantUnderlyingLabel(variant: DisplayVariant | string): string | null {
      if (typeof variant === 'string') return null
      const nt = this.getHgvsNt(variant, this.frame)
      return nt && nt !== this.variantOptionLabel(variant) ? nt : null
    },

    childComponentSelectedVariant(variant: DisplayVariant | null) {
      if (variant == null) {
        this.selectedVariant = null
        return
      }
      if (!variant.variantUrn) return
      const selected = this.variants?.find((v) => v.variantUrn === variant.variantUrn)
      this.selectedVariant = selected ?? null
    },

    onHistogramSelectionChanged(
      payload: {datum?: {variantUrn?: string}; bin?: unknown},
      options: {syncTarget?: string}
    ) {
      const urn = payload?.datum?.variantUrn
      if (urn) {
        const selected = this.variants?.find((v) => v.variantUrn === urn)
        this.selectedVariant = selected ?? null
      } else {
        if (this.syncingBinSelection || !payload?.bin) return
        this.syncingBinSelection = true
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target = this.$refs[options?.syncTarget ?? ''] as any
          if (target) target.syncSelectBin(payload.bin)
        } finally {
          this.syncingBinSelection = false
        }
        this.selectedVariant = null
      }
    },

    childComponentSelectedCalibration(calibration: string | null, idx: number) {
      this.selectedCalibrations[idx] = calibration
    },

    applyUrlState() {
      if (this.$route.query.variant) {
        const selected = this.variants?.find((v) => v.variantUrn === this.$route.query.variant)
        if (selected) this.selectedVariant = selected
      }
      if (this.$route.query.calibration) {
        const cal = String(this.$route.query.calibration)
        this.selectedCalibrations = this.selectedCalibrations.map(() => cal)
      }
    },

    heatmapVisibilityUpdated(visible: boolean) {
      this.heatmapExists = visible
    },

    async saveCreatedCalibration() {
      const editor = this.$refs.calibrationEditorRef as InstanceType<typeof CalibrationEditor> | undefined
      if (!editor) return
      const result = await editor.saveCalibration()
      if (!result || result.success) return

      if (result.error === 'email_required') {
        this.$toast.add({
          severity: 'error',
          summary: 'Email Required',
          detail: 'You must add an email address to your account to create calibrations.',
          life: 6000
        })
      } else if (result.error === 'validation') {
        const count = Object.keys(result.validationErrors).length
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      } else if (result.error === 'generic') {
        this.$toast.add({severity: 'error', summary: `Error saving calibration: ${result.message}`, life: 4000})
      }
    },

    async onCalibrationSaved(calibrationData: {urn?: string}) {
      this.$toast.add({severity: 'success', summary: 'Your calibration was successfully created.', life: 3000})
      this.closeCalibrationEditor()
      await this.reloadItem()
      if (calibrationData?.urn) {
        this.selectedCalibrations = this.selectedCalibrations.map(() => calibrationData.urn ?? null)
      }
    }
  }
}
</script>

<style>
.scoreset-viz-sidebar .p-sidebar-header {
  padding: 0 5px 0;
  height: 2em;
}
</style>

<style scoped>
:deep(.p-selectbutton .p-togglebutton) {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}
</style>
