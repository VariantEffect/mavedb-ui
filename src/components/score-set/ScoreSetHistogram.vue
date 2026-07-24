<template>
  <div class="mavedb-histogram-controls">
    <Tabs v-if="hasTabBar" v-model:value="activeViz">
      <TabList>
        <Tab v-for="(option, index) of vizOptions" :key="index" :value="index">
          {{ option.label }}
        </Tab>
      </TabList>
    </Tabs>
    <div v-if="showCalibrations" class="mavedb-histogram-thresholds-control">
      <button class="mavedb-threshold-trigger" type="button" @click="toggleThresholdsPopover">
        <span class="mavedb-threshold-trigger-label">Active calibration</span>
        <span class="mavedb-threshold-trigger-value">{{ activeCalibration.label }}</span>
        <i class="pi pi-chevron-down mavedb-threshold-trigger-icon" />
      </button>
      <Popover ref="thresholdsPopoverRef" class="mavedb-thresholds-popover">
        <div class="mavedb-thresholds-list" role="listbox">
          <button
            v-for="option of activeCalibrationOptions"
            :key="option.value?.urn ?? 'none'"
            :aria-selected="activeCalibration.value?.urn === option.value?.urn"
            class="mavedb-thresholds-option"
            :class="{'mavedb-thresholds-option--active': activeCalibration.value?.urn === option.value?.urn}"
            role="option"
            type="button"
            @click="selectCalibration(option)"
          >
            <span class="mavedb-thresholds-option-label">{{ option.value?.title ?? 'None' }}</span>
            <span
              v-if="option.value?.researchUseOnly"
              class="mavedb-thresholds-badge mavedb-thresholds-badge--research"
            >
              Research Use Only
            </span>
            <span v-if="option.value?.primary" class="mavedb-thresholds-badge mavedb-thresholds-badge--primary">
              Primary
            </span>
            <i
              v-if="activeCalibration.value?.urn === option.value?.urn"
              class="pi pi-check mavedb-thresholds-option-check"
            />
          </button>
        </div>
      </Popover>
    </div>
  </div>
  <div v-if="showControls" class="mavedb-histogram-custom-controls">
    <fieldset class="mavedb-histogram-controls-panel">
      <legend>Clinical Series Options</legend>
      <div v-if="clinical.showOptions" class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-db-select"
          >Clinical control database:
        </label>
        <PSelect
          v-model="clinical.controlDb"
          :disabled="!clinical.refreshed"
          input-id="mavedb-histogram-db-select"
          option-label="dbName"
          :options="clinical.options"
          style="align-items: center; height: 1.5rem"
        />
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-version-select"
          >Clinical control version:
        </label>
        <PSelect
          v-model="clinical.controlVersion"
          :disabled="!clinical.refreshed"
          input-id="mavedb-histogram-version-select"
          :options="clinical.controlDb?.availableVersions"
          style="align-items: center; height: 1.5rem"
        />
      </div>
      <div class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-star-select">
          Minimum ClinVar review status 'gold stars':
        </label>
        <Rating
          v-model="customMinStarRating"
          :disabled="!clinical.refreshed"
          input-id="mavedb-histogram-star-select"
          :stars="4"
          style="display: inline"
        />
      </div>
      <div v-if="proteinEffectOptionsAvailable" class="mavedb-histogram-control">
        <span class="mavedb-histogram-control-label">Limit to variants with protein effect: </span>
        <div class="flex flex-wrap gap-3">
          <div v-for="typeOption of variantTypeOptions" :key="typeOption.name" class="flex gap-1 align-items-center">
            <Checkbox
              v-model="customSelectedControlVariantTypeFilters"
              :disabled="!clinical.refreshed"
              :name="scopedId('variant-type-inputs')"
              :value="typeOption.name"
            />
            <label :for="scopedId('variant-type-inputs')">{{ typeOption.shortDescription }}</label>
          </div>
        </div>
      </div>
      <div class="mavedb-histogram-control">
        <div class="flex gap-1 align-items-center">
          <Checkbox
            v-model="customSoftConflictsEnabled"
            binary
            :disabled="!clinical.refreshed"
            input-id="mavedb-histogram-soft-conflicts"
          />
          <label class="mavedb-histogram-control-label" for="mavedb-histogram-soft-conflicts">
            Fold soft conflicts into their directional call
          </label>
        </div>
        <span class="block text-xs italic text-text-muted">
          A directional call with a related uncertain or conflicting record is shown in its directional series. Turn off
          to view uncertain and conflicting records as their own series.
        </span>
      </div>
      <div class="mavedb-histogram-control">
        <span class="mavedb-histogram-control-label">Include variants with classification: </span>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="classification of clinicalSignificanceClassificationOptions"
            :key="classification.name"
            class="flex gap-1 align-items-center"
          >
            <Checkbox
              v-model="customSelectedClinicalSignificanceClassifications"
              :disabled="
                !clinical.refreshed || (customSoftConflictsEnabled && isUncertainSignificance(classification.name))
              "
              :name="scopedId('clinical-significance-inputs')"
              :value="classification.name"
            />
            <label :for="scopedId('clinical-significance-inputs')">{{ classification.shortDescription }}</label>
          </div>
        </div>
      </div>
    </fieldset>
    <fieldset v-if="proteinEffectOptionsAvailable" class="mavedb-histogram-controls-panel">
      <legend>Protein Effect Series Options</legend>
      <div class="mavedb-histogram-control">
        <span class="mavedb-histogram-control-label">Variants by protein effect: </span>
        <div class="flex flex-wrap gap-3">
          <div v-for="typeOption of variantTypeOptions" :key="typeOption.name" class="flex gap-1 align-items-center">
            <Checkbox
              v-model="customSelectedVariantTypeFilters"
              :disabled="!clinical.refreshed"
              :name="scopedId('variant-type-inputs')"
              :value="typeOption.name"
            />
            <label :for="scopedId('variant-type-inputs')">{{ typeOption.shortDescription }}</label>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
  <div v-if="clinvarControlsEnabled && (!clinical.refreshed || !clinical.associated)" style="font-size: small">
    <ProgressSpinner style="height: 24px; width: 24px" />
    Loading clinvar control options in the background. Additional histogram views will be available once loaded.
  </div>
  <div v-if="isCalibrationClassViewActive && isLoadingActiveCalibrationVariants" style="font-size: small">
    <ProgressSpinner style="height: 24px; width: 24px" />
    Loading calibration class variants.
  </div>
  <div ref="histogramContainer" class="mavedb-histogram-container" />
  <span
    v-if="vizOptions[activeViz]?.clinvarControlLegendNoteEnabled && clinical.refreshed"
    class="mt-1 block text-center text-xs italic leading-tight"
  >
    Note: The ClinVar annotations shown above are matched to variants in this score set and may not correspond to the
    control variants used to derive the displayed calibration. For details on which variants were used, refer to the
    sources associated with each calibration.
  </span>
  <span v-if="selectedCalibrationIsClassBased" class="mavedb-class-based-calibration-note">
    *Class-based calibrations may not be visualized as thresholds. To view the distribution of variants within each
    class, select the
    <a
      href="#"
      @click.prevent="
        () => {
          let idx = vizOptions.findIndex((opt: VizOption) => opt.view === 'calibration-classes')
          idx >= 0 ? (activeViz = idx) : null
        }
      "
    >
      'Calibration Class View'
    </a>
    tab.
  </span>
</template>

<script lang="ts">
import axios from 'axios'
import _ from 'lodash'
import Checkbox from 'primevue/checkbox'
import PSelect from 'primevue/select'
import Popover from 'primevue/popover'
import ProgressSpinner from 'primevue/progressspinner'
import Rating from 'primevue/rating'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import {defineComponent, PropType} from 'vue'

import useScopedId from '@/composables/scoped-id'
import config from '@/config'
import {saveChartAsSvg, saveChartAsPng} from '@/lib/chart-export'
import {
  CLINVAR_REVIEW_STATUS_STARS,
  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_MIN_STAR_RATING,
  UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS,
  clinvarClinicalSignificanceClassifications,
  clinvarConflictingSignificanceClassificationForVersion,
  conflictingClinicalSignificanceSeriesLabelForVersion,
  isUncertainSignificance
} from '@/lib/clinvar-controls'
import {
  resolveControlSeries,
  type ClinvarControlSeriesKey,
  type ControlSeriesOptions
} from '@/lib/clinvar-control-series'
import type {ClinvarControlsStore} from '@/composables/use-clinvar-controls'
import makeHistogram, {
  DEFAULT_SERIES_COLOR,
  Histogram,
  HistogramSerieOptions,
  HistogramDatum,
  HistogramBin,
  HistogramShader,
  CATEGORICAL_SERIES_COLORS
} from '@/lib/histogram'
import {getScoreCalibrationVariants} from '@/api/mavedb'
import {
  chooseDefaultCalibration,
  prepareCalibrationsForHistogram,
  shaderOverlapsBin,
  functionalClassificationContainsVariant,
  getClassificationColor
} from '@/lib/calibrations'
import type {FunctionalClassificationVariant} from '@/lib/calibrations'
import {
  tooltipBadgeBlock,
  tooltipCountRow,
  tooltipEmptyLine,
  tooltipFootnote,
  tooltipKeyValue,
  tooltipLink,
  tooltipNote,
  tooltipReviewStars,
  tooltipRoot,
  tooltipSection,
  tooltipSectionLabel,
  tooltipText,
  tooltipTitle,
  tooltipVariantDetailsLink
} from '@/lib/tooltips'
import {DisplayVariant} from '@/lib/variants'
import {formatScore} from '@/lib/scores'
import {
  consequenceBucket,
  EFFECT_BUCKETS,
  EFFECT_TYPE_FILTER_OPTIONS,
  DEFAULT_EFFECT_TYPE_FILTERS,
  type EffectBucketName
} from '@/lib/consequences'
import {useVariantCoordinates} from '@/composables/use-variant-coordinates'
import {components} from '@/schema/openapi'

interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

interface VizOption {
  label: string
  view: 'distribution' | 'clinical' | 'effect' | 'custom' | 'calibration-classes'
  clinvarControlLegendNoteEnabled: boolean
}

export default defineComponent({
  name: 'ScoreSetHistogram',

  components: {Checkbox, Popover, PSelect, Rating, Tabs, TabList, Tab, ProgressSpinner},

  props: {
    coordinates: {
      type: String as PropType<'submitted' | 'reference'>,
      default: 'submitted'
    },
    defaultHistogram: {
      type: String,
      default: 'distribution'
    },
    externalSelection: {
      type: Object as PropType<DisplayVariant | null>,
      default: null
    },
    // Margins must accommodate the X axis label and title.
    margins: {
      type: Object as PropType<Margins>,
      default: () => ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 20
      })
    },
    numBins: {
      type: Number,
      default: 30
    },
    scoreSet: {
      type: Object,
      required: true
    },
    variants: {
      type: Array as PropType<DisplayVariant[]>,
      required: true
    },
    hideStartAndStopLossByDefault: {
      type: Boolean,
      default: false
    },
    selectedCalibration: {
      type: String as PropType<string | null>,
      default: null
    },
    lockSelection: {
      type: Boolean,
      default: false
    },
    // Shared clinical-control state (fetch + db/version selection + variant.control associations), owned by
    // the parent via the `useClinvarControls`. Guarantees that the histogram and other components agree on
    // the same control version and variant associations.
    clinical: {
      type: Object as PropType<ClinvarControlsStore>,
      required: true
    }
  },

  emits: ['exportChart', 'calibrationChanged', 'selection-changed'],

  setup: () => {
    return {
      ...useScopedId(),
      ...useVariantCoordinates()
    }
  },

  data: function () {
    const scoreSetHasCalibrations =
      this.scoreSet.scoreCalibrations != null && this.scoreSet.scoreCalibrations.length > 0

    return {
      config: config,

      activeViz: 0,
      showCalibrations: scoreSetHasCalibrations,
      activeCalibration: {label: 'None', value: null} as {
        label: string
        value: components['schemas']['ScoreCalibration'] | null
      },
      defaultVizApplied: false,

      clinvarControlsEnabled: true,

      variantTypeOptions: EFFECT_TYPE_FILTER_OPTIONS,
      customMinStarRating: DEFAULT_MIN_STAR_RATING,

      customSoftConflictsEnabled: true,
      customSelectedClinicalSignificanceClassifications: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
      customSelectedVariantTypeFilters: [] as EffectBucketName[],
      customSelectedControlVariantTypeFilters: DEFAULT_EFFECT_TYPE_FILTERS.concat(
        this.hideStartAndStopLossByDefault ? [] : ['Start/Stop Loss']
      ) as EffectBucketName[],
      calibrationClassVariantsByUrn: {} as Record<string, Record<number, FunctionalClassificationVariant[]>>,
      calibrationClassVariantsLoadingByUrn: {} as Record<string, boolean>,
      histogram: null as Histogram | null
    }
  },

  computed: {
    // The ClinVar significance labels track the selected control version (the "Conflicting" wording
    // changed in 2025). Was previously a data field reassigned from the controlDbAndVersion watcher.
    clinicalSignificanceClassificationOptions() {
      return clinvarClinicalSignificanceClassifications(this.clinical.controlVersion)
    },
    // Worth offering as soon as some variant carries a VEP consequence (anything but 'No consequence').
    proteinEffectOptionsAvailable: function () {
      return this.variants.some((v) => consequenceBucket(v.consequence) !== 'No consequence')
    },
    selectedCalibrationIsClassBased: function () {
      return (
        this.activeCalibration.value != null &&
        this.activeCalibration.value.functionalClassifications?.every((fc) => fc.class != null)
      )
    },
    selectedCalibrationClassMap: function () {
      if (!this.selectedCalibrationIsClassBased) {
        return null
      }

      const calibrationUrn = this.activeCalibration.value?.urn
      if (!calibrationUrn) {
        return null
      }

      const variantsByClassificationId = this.calibrationClassVariantsByUrn[calibrationUrn]
      if (!variantsByClassificationId) {
        return null
      }

      const classMap: Record<string, string> = {}
      for (const fc of this.activeCalibration.value!.functionalClassifications!) {
        if (fc.class == null || fc.id == null) {
          continue
        }

        for (const v of variantsByClassificationId[fc.id] || []) {
          if (!v.urn) {
            continue
          }

          classMap[v.urn] = fc.class
        }
      }
      return classMap
    },
    isCalibrationClassViewActive: function () {
      return this.vizOptions[this.activeViz]?.view === 'calibration-classes'
    },
    isLoadingActiveCalibrationVariants: function () {
      const calibrationUrn = this.activeCalibration.value?.urn
      return calibrationUrn != null && this.calibrationClassVariantsLoadingByUrn[calibrationUrn] === true
    },
    series: function () {
      if (!this.clinical.refreshed) {
        return null
      }

      // NOTE: keep this getter pure — clamping `activeViz` (a side effect) lives in the `vizOptions` watcher.
      // An out-of-range index simply yields `undefined` here, which we treat as "no series".
      if (!this.vizOptions[this.activeViz]) {
        return null
      }

      switch (this.vizOptions[this.activeViz].view) {
        case 'calibration-classes': {
          if (!this.selectedCalibrationIsClassBased) {
            return null
          }

          const selectedCalibrationClassMap = this.selectedCalibrationClassMap
          if (!selectedCalibrationClassMap) {
            return null
          }

          return this.activeCalibration.value?.functionalClassifications?.map((fc, i) => ({
            classifier: (d: HistogramDatum) => {
              if (!d.variantUrn) return false
              return selectedCalibrationClassMap[d.variantUrn] === fc.class
            },
            options: {
              color: CATEGORICAL_SERIES_COLORS[i % CATEGORICAL_SERIES_COLORS.length],
              title: fc.label || 'Unlabeled'
            }
          }))
        }
        case 'clinical': {
          // The fixed clinical view: all directional classes, no star gate, soft conflicts folded into their
          // directional lean (there are no uncertain series in the default).
          const opts = {
            softConflictsEnabled: true,
            selectedSignificances: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
            minStars: Number.NEGATIVE_INFINITY
          }
          const isPathogenic = (d: HistogramDatum) => this.controlSeries(d, opts) === 'pathogenic'
          const isBenign = (d: HistogramDatum) => this.controlSeries(d, opts) === 'benign'
          return [
            {
              classifier: isPathogenic,
              options: {
                color: '#e41a1c',
                title: this.seriesTitle('Pathogenic/Likely Pathogenic', isPathogenic)
              }
            },
            {
              classifier: isBenign,
              options: {
                color: '#377eb8',
                title: this.seriesTitle('Benign/Likely Benign', isBenign)
              }
            }
          ]
        }

        case 'effect': {
          // The dedicated effect view shows every annotated bucket (Start/Stop Loss omitted for
          // synthetic targets); 'No consequence' is not a protein effect and is left out here.
          const buckets = EFFECT_BUCKETS.map((b) => b.name).filter(
            (name) => name !== 'No consequence' && !(name === 'Start/Stop Loss' && this.hideStartAndStopLossByDefault)
          )
          return this.proteinEffectSeries(buckets)
        }

        case 'custom': {
          const opts = {
            softConflictsEnabled: this.customSoftConflictsEnabled,
            selectedSignificances: this.customSelectedClinicalSignificanceClassifications,
            minStars: this.customMinStarRating
          }
          const isPathogenic = (d: HistogramDatum) =>
            this.controlSeries(d, opts) === 'pathogenic' && this.filterControlVariantByEffect(d)
          const isBenign = (d: HistogramDatum) =>
            this.controlSeries(d, opts) === 'benign' && this.filterControlVariantByEffect(d)
          const series = [
            {
              classifier: isPathogenic,
              options: {
                color: '#e41a1c',
                title: this.seriesTitle('Pathogenic/Likely Pathogenic', isPathogenic)
              }
            },
            {
              classifier: isBenign,
              options: {
                color: '#377eb8',
                title: this.seriesTitle('Benign/Likely Benign', isBenign)
              }
            }
          ]

          // Uncertain series exist only when the soft-conflict fold is off (the two modes are mutually
          // exclusive) — and then only for the uncertain classes the user has selected. controlSeries already
          // returns null for uncertain records while the fold is on, so this gate keeps the empty series hidden.
          if (!this.customSoftConflictsEnabled) {
            if (
              this.customSelectedClinicalSignificanceClassifications.some((c) =>
                UNCERTAIN_SIGNIFICANCE_CLASSIFICATIONS.includes(c)
              )
            ) {
              const isUncertain = (d: HistogramDatum) =>
                this.controlSeries(d, opts) === 'uncertain' && this.filterControlVariantByEffect(d)
              series.push({
                classifier: isUncertain,
                options: {
                  color: '#999999',
                  title: this.seriesTitle('Uncertain significance', isUncertain)
                }
              })
            }

            // Account for both possible conflicting classifications.
            if (
              this.customSelectedClinicalSignificanceClassifications.some((c) =>
                CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(c)
              )
            ) {
              const isConflicting = (d: HistogramDatum) =>
                this.controlSeries(d, opts) === 'conflicting' && this.filterControlVariantByEffect(d)
              series.push({
                classifier: isConflicting,
                options: {
                  color: '#984ea3',
                  title: this.seriesTitle(
                    conflictingClinicalSignificanceSeriesLabelForVersion(this.clinical.controlVersion),
                    isConflicting
                  )
                }
              })
            }
          }

          if (this.proteinEffectOptionsAvailable) {
            series.push(...this.proteinEffectSeries(this.selectedVariantTypeFilters))
          }

          return series
        }

        default: // Overall score distribution
          return null
      }
    },

    vizOptions: function () {
      const options: VizOption[] = [
        {label: 'Overall Distribution', view: 'distribution', clinvarControlLegendNoteEnabled: false}
      ]

      if (this.clinical.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Clinical View', view: 'clinical', clinvarControlLegendNoteEnabled: true})
      }

      if (this.selectedCalibrationIsClassBased) {
        options.push({
          label: 'Calibration Class View',
          view: 'calibration-classes',
          clinvarControlLegendNoteEnabled: false
        })
      }

      if (this.proteinEffectOptionsAvailable) {
        options.push({label: 'Protein Effect View', view: 'effect', clinvarControlLegendNoteEnabled: false})
      }

      // custom view should always come last
      if (this.clinical.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Custom', view: 'custom', clinvarControlLegendNoteEnabled: true})
      }
      return options
    },

    hasTabBar: function () {
      return this.vizOptions.length > 1
    },

    showControls: function () {
      return this.activeViz == this.vizOptions.findIndex((item) => item.view === 'custom')
    },

    scoreCalibrations: function (): {[key: string]: components['schemas']['ScoreCalibration']} | null {
      const calibrationObjects: Record<string, components['schemas']['ScoreCalibration']> = {}
      if (this.scoreSet.scoreCalibrations != null && this.scoreSet.scoreCalibrations.length > 0) {
        for (const calibration of this.scoreSet.scoreCalibrations) {
          calibrationObjects[calibration.urn] = calibration
        }
      }

      if (Object.keys(calibrationObjects).length === 0) {
        return null
      } else {
        return calibrationObjects
      }
    },

    activeCalibrationOptions: function () {
      if (!this.scoreCalibrations) return []

      const calibrationOptions = Object.entries(this.scoreCalibrations).map(([, value]) => {
        // Base label on title, prepend "Research Use Only" if classification is tagged as research use
        let label = value.researchUseOnly ? `Research Use Only: ${value.title}` : value.title
        // Append asterisk if class-based
        label = value.functionalClassifications?.every((fc) => fc.class != null) ? `${label}*` : label
        return {
          label,
          value
        }
      })

      // Sort options: research use only at the end, alphabetically otherwise
      calibrationOptions.sort((a, b) => {
        const aIsResearchOnly = a.value?.researchUseOnly || false
        const bIsResearchOnly = b.value?.researchUseOnly || false

        if (aIsResearchOnly && !bIsResearchOnly) return 1
        if (!aIsResearchOnly && bIsResearchOnly) return -1

        return a.label.localeCompare(b.label)
      })

      return [{label: 'None', value: null}, ...calibrationOptions]
    },

    histogramShaders: function () {
      const shaders: Record<string, HistogramShader[] | null> = {null: null} // No shader

      if (!this.scoreCalibrations) return shaders

      for (const [key, value] of Object.entries(this.scoreCalibrations)) {
        shaders[key] = prepareCalibrationsForHistogram(value as components['schemas']['ScoreCalibration'])
      }

      return shaders
    },

    allSources: function () {
      return (this.scoreSet.primaryPublicationIdentifiers || []).concat(
        this.scoreSet.secondaryPublicationIdentifiers || []
      )
    },

    minStarRating: function () {
      if (this.activeViz == 1) {
        return DEFAULT_MIN_STAR_RATING
      }
      return this.customMinStarRating
    },

    selectedClinicalSignificanceClassifications: function () {
      if (this.activeViz == 1) {
        return DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
      }
      return this.customSelectedClinicalSignificanceClassifications
    },

    selectedControlVariantTypeFilters: function () {
      if (this.activeViz == 1) {
        return ['Synonymous', 'Missense', 'Nonsense']
      }
      return this.customSelectedControlVariantTypeFilters
    },

    selectedVariantTypeFilters: function () {
      if (this.activeViz == 2) {
        return ['Synonymous', 'Missense', 'Nonsense']
      }
      return this.customSelectedVariantTypeFilters
    },

    tooltipHtmlGetter: function () {
      return (
        variant: DisplayVariant | null,
        bin: HistogramBin | null,
        seriesContainingVariant: HistogramSerieOptions[],
        allSeries: HistogramSerieOptions[]
      ) => {
        return tooltipRoot([
          variant ? this.tooltipVariantSections(variant) : null,
          bin ? this.tooltipBinSection(bin, allSeries, seriesContainingVariant, Boolean(variant)) : null
        ])
      }
    }
  },

  watch: {
    scoreSet: {
      handler: function () {
        this.calibrationClassVariantsByUrn = {}
        this.calibrationClassVariantsLoadingByUrn = {}
      },
      immediate: true
    },
    variants: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    series: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    activeCalibration: {
      handler: async function () {
        await this.conditionallyLoadCalibrationClassVariants()
        this.renderOrRefreshHistogram()
        this.$emit('calibrationChanged', this.activeCalibration.value?.urn ?? null)
      }
    },
    activeViz: {
      handler: async function () {
        await this.conditionallyLoadCalibrationClassVariants()
      }
    },
    calibrationClassVariantsByUrn: {
      handler: function (newValue, oldValue) {
        const activeUrn = this.activeCalibration?.value?.urn
        if (activeUrn) {
          const newVariants = newValue && newValue[activeUrn]
          const oldVariants = oldValue && oldValue[activeUrn]
          if (newVariants === oldVariants) {
            return
          }
        }
        this.renderOrRefreshHistogram()
      }
    },
    showCalibrations: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    // TODO#608: Address circularity between externalSelection parent updates and selection changed events from
    //           the child histogram.
    externalSelection: {
      handler: function (newValue) {
        if (this.histogram) {
          if (newValue) {
            this.histogram.selectDatum(newValue)
          } else {
            if (!this.lockSelection) {
              this.histogram.clearSelection()
            }
          }
        }
      }
    },
    minStarRating: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    hideStartAndStopLossByDefault: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    clinicalSignificanceClassificationOptions: {
      handler: function () {
        // Ensure the conflicting significance remains selected even when the version changes its name.
        this.customSelectedClinicalSignificanceClassifications =
          this.customSelectedClinicalSignificanceClassifications.map((classification) => {
            if (CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(classification)) {
              return clinvarConflictingSignificanceClassificationForVersion(this.clinical.controlVersion).name
            }
            return classification
          })
      }
    },
    selectedClinicalSignificanceClassifications: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    customSoftConflictsEnabled: {
      handler: function (enabled: boolean) {
        // The two modes are mutually exclusive: folding soft conflicts in hides the uncertain series, so drop
        // any uncertain significances from the selection.
        if (enabled) {
          this.customSelectedClinicalSignificanceClassifications =
            this.customSelectedClinicalSignificanceClassifications.filter((c) => !this.isUncertainSignificance(c))
        }
        this.renderOrRefreshHistogram()
      }
    },
    selectedVariantTypeFilters: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    selectedControlVariantTypeFilters: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    // The store re-associates `variant.control` off the main thread; re-render once it settles so the
    // clinical series pick up any new annotations.
    'clinical.associated': {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    selectedCalibration: {
      handler: function (newValue) {
        if (!newValue) {
          this.activeCalibration = {label: 'None', value: null}
          return
        }

        this.activeCalibration = this.activeCalibrationOptions.find((option) => option.value?.urn === newValue) || {
          label: 'None',
          value: null
        }
      }
    },
    vizOptions: {
      handler(newOptions: VizOption[]) {
        // Clamp first: if the available views shrank (e.g. the clinical view disappeared), keep `activeViz`
        // in range.
        if (this.activeViz >= newOptions.length) {
          this.activeViz = 0
        }
        if (this.defaultVizApplied) return
        const idx = newOptions.findIndex((opt: VizOption) => opt.view === this.defaultHistogram)
        if (idx >= 0) {
          this.activeViz = idx
          this.defaultVizApplied = true
        }
      },
      immediate: true
    }
  },

  mount: function () {
    this.renderOrRefreshHistogram()
  },

  mounted: async function () {
    this.renderOrRefreshHistogram()
    this.$emit('exportChart', this.buildExportFns())
    this.activeCalibration = this.chooseDefaultCalibration()
    await this.conditionallyLoadCalibrationClassVariants()
  },

  beforeUnmount: function () {
    if (this.histogram) {
      this.histogram.destroy()
      this.histogram = null
    }
  },

  methods: {
    // ---- Histogram tooltip construction ----

    /** Variant identity + ClinVar annotation, as one or two stacked tooltip sections. */
    tooltipVariantSections(variant: DisplayVariant): string {
      const identity = []

      const label = this.labelForVariant(variant, this.coordinates)
      if (label) {
        identity.push(tooltipTitle(label))
      }
      const underlyingNt = this.getHgvsNt(variant, this.coordinates)
      if (underlyingNt && underlyingNt !== label) {
        identity.push(tooltipNote(underlyingNt))
      }
      // In the reference frame an unmapped variant's label is its submitted (target-frame) HGVS; flag it
      // so the string isn't mistaken for a reference coordinate.
      if (this.coordinates == 'reference' && this.isUnmapped(variant)) {
        identity.push(tooltipNote('Could not be mapped'))
      }

      if (variant.score != null) {
        identity.push(tooltipText(`Score ${formatScore(variant.score)}`))
        const classification = this.matchVariantClassification(variant)
        if (classification) {
          identity.push(tooltipBadgeBlock(getClassificationColor(classification), classification.label))
        }
      }

      if (variant.clingenAlleleId) {
        identity.push(tooltipVariantDetailsLink(variant.clingenAlleleId, variant.variantUrn))
      }

      const sections = [tooltipSection(identity)]

      if (this.vizOptions[this.activeViz].view == 'clinical') {
        const clinvarSection = this.tooltipClinvarSection(variant)
        if (clinvarSection) {
          sections.push(clinvarSection)
        }
      }

      return sections.filter(Boolean).join('')
    },

    /** ClinVar significance, review stars, and link — or null when the variant has no ClinVar annotation. */
    tooltipClinvarSection(variant: DisplayVariant): string | null {
      const control = variant.control
      if (!control) {
        return null
      }
      // Hard discordance: the DNA variants encoding this change carry both pathogenic and benign
      // calls, so there is no single call to show and it is excluded from the controls. Say so, rather
      // than surfacing one side's call as if it were the answer.
      if (control.discordance === 'hard') {
        return tooltipSection([
          tooltipSectionLabel('ClinVar'),
          tooltipText('Conflicting classifications across DNA variants — excluded from controls')
        ])
      }
      const significance = control[DEFAULT_CLNSIG_FIELD]
      // Soft conflict: the representative directional call stands, but a related record is uncertain/Conflicting.
      // Flag it beneath the call so the fold isn't silent (differentiating a VUS from ClinVar's own verdict).
      const softConflictNote =
        control.discordance === 'soft'
          ? control.classifications.some((c) =>
              CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(c.significance)
            )
            ? tooltipFootnote(
                'A related variant with the same protein consequence is conflicting — the directional call is shown.'
              )
            : tooltipFootnote(
                'A related variant with the same protein consequence is of uncertain significance — the directional call is shown.'
              )
          : null
      const reviewStatus = control[DEFAULT_CLNREVSTAT_FIELD]
      const hasSignificance = Boolean(significance) && significance != 'NA'
      const hasReviewStatus = Boolean(reviewStatus) && reviewStatus != 'NA'
      if (!hasSignificance) {
        return null
      }

      const description =
        clinvarClinicalSignificanceClassifications(this.clinical.controlVersion).find((c) => c.name == significance)
          ?.description ?? significance
      const numStars = hasReviewStatus ? CLINVAR_REVIEW_STATUS_STARS[reviewStatus] : null
      const stars = numStars != null ? ` ${tooltipReviewStars(numStars)}` : ''

      // A projected placement: the measured allele has no ClinVar record, so this call
      // is about a related variant at a different level. Say so — otherwise the histogram appears to
      // contradict the assay-facts card, which shows this variant's own (empty) measured-level ClinVar.
      // "Inferred" is the app-wide word for this (matches VariantClinvarStat's "inferred from N related
      // variants"), rather than a bare asterisk that needs its own legend to decode.
      const projectedNote = control.projected
        ? tooltipFootnote(
            'This classification is inferred from a related variant with the same protein consequence. The measured variant has no ClinVar record of its own.'
          )
        : null

      return tooltipSection([
        tooltipSectionLabel('ClinVar'),
        tooltipText(`${description}${stars}`),
        hasReviewStatus
          ? tooltipLink(
              `http://www.ncbi.nlm.nih.gov/clinvar/?term=${control.dbIdentifier}[alleleid]`,
              'View in ClinVar'
            )
          : null,
        tooltipEmptyLine(),
        softConflictNote,
        projectedNote
      ])
    },

    /** The functional classification a variant falls into, matched by score range then class membership. */
    // TODO#491: Attach this to the variant object so the tooltip can read it directly.
    matchVariantClassification(variant: DisplayVariant) {
      const score = variant.score
      const calibration = this.activeCalibration.value
      if (score == null || !calibration?.urn || !calibration.functionalClassifications) {
        return null
      }
      const classifications = calibration.functionalClassifications

      const byScore = classifications.find((fc) => functionalClassificationContainsVariant(fc, score)) ?? null
      if (byScore) {
        return byScore
      }
      if (this.selectedCalibrationIsClassBased) {
        const variantsByClassificationId = this.calibrationClassVariantsByUrn[calibration.urn]
        if (variantsByClassificationId) {
          return (
            classifications.find((fc) =>
              variantsByClassificationId[fc.id]?.some((v) => v.urn === variant.variantUrn)
            ) ?? null
          )
        }
      }
      return null
    },

    /** Bin range, overlapping calibration classifications, and per-series counts (member series highlighted). */
    tooltipBinSection(
      bin: HistogramBin,
      allSeries: HistogramSerieOptions[],
      seriesContainingVariant: HistogramSerieOptions[],
      variantHovered: boolean
    ): string {
      const rows = [tooltipSectionLabel(`Bin details (${bin.x0} to ${bin.x1})`)]

      // Bin classifications are only useful on a bare bin hover; a hovered variant already shows its own
      // classification badge above.
      if (!variantHovered) {
        rows.push(this.tooltipBinClassifications(bin))
      }

      // When a variant is hovered, its series are bolded below. State the negative explicitly so an
      // absence of bold isn't left to interpretation.
      if (variantHovered && seriesContainingVariant.length == 0) {
        rows.push(tooltipNote('This variant is not within the displayed series'))
      }

      bin.seriesBins.forEach((serieBin, i) => {
        const series = allSeries[i]
        // The legend can wrap a series title across lines to stay narrow; this row has its own wrapping
        // (it's inside a tooltip, not fixed-width SVG text), so it always reads as one flat line.
        const title = Array.isArray(series?.title) ? series.title.join(' ') : series?.title
        rows.push(
          tooltipCountRow({
            color: series?.color || DEFAULT_SERIES_COLOR,
            label: title || (allSeries.length > 1 ? `Series ${i + 1}` : ''),
            count: serieBin.length,
            active: seriesContainingVariant.includes(series)
          })
        )
      })

      return tooltipSection(rows)
    },

    /** Compact "Classes: ..." line of calibration classifications overlapping a bin, or empty when none. */
    // TODO#491: Precompute per-bin classifications so the tooltip doesn't recompute them on every hover.
    tooltipBinClassifications(bin: HistogramBin): string {
      const urn = this.activeCalibration.value?.urn
      if (!urn) {
        return ''
      }
      const shaders = (this.histogramShaders[urn] || [])
        .filter((shader: HistogramShader) => shaderOverlapsBin(shader, bin))
        .sort((a: HistogramShader, b: HistogramShader) => (a.min ?? -Infinity) - (b.min ?? -Infinity))
      if (shaders.length == 0) {
        return ''
      }

      const names = shaders.map((shader: HistogramShader) => {
        const min = shader.min ?? -Infinity
        const max = shader.max ?? Infinity
        const spanStart = Math.max(bin.x0, min).toPrecision(3)
        const spanEnd = Math.min(bin.x1, max).toPrecision(3)
        // Note the covered sub-range only when a shader boundary cuts through the bin.
        const shaderSplitsBin = bin.x0 < min || bin.x1 > max
        const range = shaderSplitsBin
          ? spanStart != spanEnd
            ? ` (${spanStart} to ${spanEnd})`
            : ` (${spanStart})`
          : ''
        return `${shader.title ?? ''}${range}`
      })

      return tooltipKeyValue('Overlapped classes', names.join(', '))
    },

    toggleThresholdsPopover(event: Event) {
      ;(this.$refs.thresholdsPopoverRef as InstanceType<typeof Popover>)?.toggle(event)
    },
    selectCalibration(option: {label: string; value: components['schemas']['ScoreCalibration'] | null}) {
      this.activeCalibration = option
      ;(this.$refs.thresholdsPopoverRef as InstanceType<typeof Popover>)?.hide()
    },
    // A histogram series per named protein-effect bucket, classified by VEP consequence.
    proteinEffectSeries(bucketNames: string[]) {
      return EFFECT_BUCKETS.filter((bucket) => bucketNames.includes(bucket.name)).map((bucket) => ({
        classifier: (d: HistogramDatum) => consequenceBucket(d.consequence) === bucket.name,
        options: {color: bucket.color, title: bucket.name}
      }))
    },
    /**
     * The single clinical-control series a variant belongs to — a thin wrapper over the pure
     * {@link resolveControlSeries}, reading the placement off `variant.control`.
     */
    controlSeries(variant: DisplayVariant, opts: ControlSeriesOptions): ClinvarControlSeriesKey | null {
      return resolveControlSeries(variant.control, opts)
    },
    // A series's calls can be a mix of direct ClinVar records and ones inferred from a related allele at
    // the same protein consequence — flag it right on the series that actually has them, rather than a
    // single blanket note for the whole chart. Returned as two lines (the legend wraps a `string[]` title)
    // rather than one long line, which would widen the legend enough to cover plotted data.
    seriesTitle(baseTitle: string, classifier: (d: HistogramDatum) => boolean): string | string[] {
      const hasInferred = (this.variants as DisplayVariant[]).some((v) => classifier(v) && v.control?.projected)
      return hasInferred ? [baseTitle, '(includes inferred calls)'] : baseTitle
    },
    /** Whether a significance string is an uncertain call — used to gate the mutually-exclusive filters. */
    isUncertainSignificance,
    filterControlVariantByEffect(variant: DisplayVariant) {
      // Keep a control variant only when its effect bucket is among the selected filters.
      if (!this.proteinEffectOptionsAvailable) {
        return true
      }
      return this.selectedControlVariantTypeFilters.includes(consequenceBucket(variant.consequence))
    },
    buildExportFns() {
      return {
        svg: () =>
          saveChartAsSvg(
            this.$refs.histogramContainer as HTMLElement,
            `${this.scoreSet.urn}-scores-histogram`,
            'mavedb-histogram-container'
          ),
        png: () =>
          saveChartAsPng(
            this.$refs.histogramContainer as HTMLElement,
            `${this.scoreSet.urn}-scores-histogram`,
            'mavedb-histogram-container'
          )
      }
    },

    // Sync API: select a bin by its [x0, x1] range.
    // Useful for coordinating selection across multiple histograms.
    // Note that only bins with identical ranges will be selected.
    syncSelectBin(bin: HistogramBin | null) {
      if (!bin || !this.histogram) return
      const currentBins = this.histogram.bins()
      const idx = currentBins.findIndex((b) => (b.x0 ?? 0) === bin.x0 && (b.x1 ?? 0) === bin.x1)
      if (idx != null) {
        this.histogram.selectBin(idx)
      }
    },

    renderOrRefreshHistogram: function () {
      // Reactive triggers (now driven by a shared clinical-controls store) can fire before this instance is
      // mounted — e.g. the second histogram on a page is created after the store has already settled, so its
      // creation-time watchers run before `mounted()`. Building the chart with an absent container permanently
      // poisons it: the lib records `svg = null` and every later refresh() no-ops, leaving an empty container.
      // Short-circuit until the DOM exists; `mounted()` re-invokes this once the ref is available.
      const container = this.$refs.histogramContainer as HTMLElement | undefined
      if (!container) {
        return
      }

      if (!this.histogram) {
        this.histogram = makeHistogram()
          .render(container)
          .bottomAxisLabel('Functional Score')
          .leftAxisLabel('Number of Variants')
          .numBins(30)
          .valueField((variant: DisplayVariant) => variant?.score)
          .accessorField((variant: DisplayVariant) => variant?.variantUrn)
          .tooltipHtml(this.tooltipHtmlGetter)
          .selectionChanged(this.onHistogramSelectionChanged)
      }

      // benefits typing. The histogram will always be defined by now from the above.
      if (!this.histogram) {
        return
      }

      let seriesClassifier: ((d: HistogramDatum) => number[]) | null = null
      if (this.series) {
        const seriesIndices = _.range(0, this.series.length)
        seriesClassifier = (d: HistogramDatum) =>
          seriesIndices.filter((seriesIndex) => this.series[seriesIndex].classifier(d))
      }

      this.assureActiveVizIsAvailable()

      this.histogram
        .data(this.variants)
        .seriesOptions(this.series?.map((s) => s.options) || null)
        .seriesClassifier(seriesClassifier)
        .title('Distribution of Functional Scores')
        .legendNote(
          this.vizOptions[this.activeViz]?.clinvarControlLegendNoteEnabled && this.clinical.refreshed
            ? `${this.clinical.controlDb?.dbName} data from version ${this.clinical.controlVersion}`
            : null
        )
        .shaders(this.histogramShaders)

      if (this.showCalibrations) {
        this.histogram.renderShader(this.activeCalibration.value ? this.activeCalibration.value.urn : null)
      } else {
        this.histogram.renderShader(null)
      }

      this.histogram.refresh()

      if (this.externalSelection) {
        this.histogram.selectDatum(this.externalSelection)
      } else {
        this.histogram.clearSelection()
      }
    },

    onHistogramSelectionChanged(payload: {
      bin: HistogramBin | null
      datum: DisplayVariant | null
      source: 'histogram'
    }) {
      if (this.lockSelection) {
        const currentAccession = (this.externalSelection as any)?.variantUrn
        const nextAccession = (payload?.datum as any)?.variantUrn
        // Block clears and changes; immediately restore selection
        if (!nextAccession || (currentAccession && nextAccession !== currentAccession)) {
          if (this.histogram && this.externalSelection) {
            this.histogram.selectDatum(this.externalSelection as any)
          }
          return
        }
      }
      this.$emit('selection-changed', payload)
    },
    conditionallyLoadCalibrationClassVariants: async function () {
      if (!this.selectedCalibrationIsClassBased) {
        return
      }

      await this.loadCalibrationClassVariants(this.activeCalibration.value?.urn ?? null)
    },
    loadCalibrationClassVariants: async function (calibrationUrn: string | null) {
      if (!calibrationUrn) {
        return
      }

      if (
        this.calibrationClassVariantsByUrn[calibrationUrn] ||
        this.calibrationClassVariantsLoadingByUrn[calibrationUrn]
      ) {
        return
      }

      this.calibrationClassVariantsLoadingByUrn = {
        ...this.calibrationClassVariantsLoadingByUrn,
        [calibrationUrn]: true
      }

      try {
        // TODO#622calibration-classes-performance: If very large calibrations become slow, optimize by
        // precomputing and caching an accession->class map at fetch time and adding LRU-style cache
        // eviction for calibrationClassVariantsByUrn to cap memory usage across many calibrations.
        const response = await getScoreCalibrationVariants(calibrationUrn)
        const variantsByClassificationId: Record<number, FunctionalClassificationVariant[]> = {}

        for (const variantSet of response || []) {
          variantsByClassificationId[variantSet.functionalClassificationId] = variantSet.variants || []
        }

        this.calibrationClassVariantsByUrn = {
          ...this.calibrationClassVariantsByUrn,
          [calibrationUrn]: variantsByClassificationId
        }
      } catch (error) {
        const detail =
          axios.isAxiosError(error) && error.response?.status
            ? `Request failed with status ${error.response.status}.`
            : 'Unable to load class variants for this calibration.'

        this.$toast.add({
          severity: 'warn',
          summary: 'Could not load calibration class variants.',
          detail,
          life: 4000
        })

        // Remove any failed calibration from the variants by urn to avoid repeated failed load attempts on re-render or calibration switch.
        this.calibrationClassVariantsByUrn = Object.fromEntries(
          Object.entries(this.calibrationClassVariantsByUrn).filter(([urn]) => urn !== calibrationUrn)
        )
      } finally {
        this.calibrationClassVariantsLoadingByUrn = {
          ...this.calibrationClassVariantsLoadingByUrn,
          [calibrationUrn]: false
        }
      }
    },
    chooseDefaultCalibration: function () {
      if (this.activeCalibration.value) {
        return this.activeCalibration
      }

      if (!this.scoreCalibrations) {
        return {label: 'None', value: null}
      }

      // Honor an externally-selected calibration when it matches an available option (e.g. the
      // VariantScreen composable defaults one before this histogram mounts).
      if (this.selectedCalibration) {
        const matchingCalibration = this.activeCalibrationOptions.find(
          (option) => option.value?.urn === this.selectedCalibration
        )
        if (matchingCalibration) {
          return {...matchingCalibration}
        }
      }

      // Otherwise fall back to the shared default precedence, applied over the sorted options so ties break
      // the same way the dropdown orders them.
      const sortedCalibrations = this.activeCalibrationOptions
        .map((option) => option.value)
        .filter((value): value is NonNullable<typeof value> => value != null)
      const defaultUrn = chooseDefaultCalibration(sortedCalibrations)?.urn ?? null
      return (
        this.activeCalibrationOptions.find((option) => option.value?.urn === defaultUrn) || {
          label: 'None',
          value: null
        }
      )
    },

    titleCase(s: string) {
      return s
        .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase())
        .replace(/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
        .replace(/([a-z])([A-Z])/g, '$1 $2')
    },

    assureActiveVizIsAvailable() {
      if (this.activeViz >= this.vizOptions.length) {
        this.activeViz = 0
      }
    }
  }
})
</script>

<style scoped>
.mavedb-histogram-controls-panel {
  border: 2px solid #d7d7d7;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-x: auto;
}

.mavedb-histogram-thresholds-control {
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  margin-bottom: 6px;
}

.mavedb-threshold-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--p-tabs-tablist-border-color, #dee2e6);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  transition: border-color 0.15s;
}

.mavedb-threshold-trigger:hover {
  border-color: #adb5bd;
}

.mavedb-threshold-trigger-label {
  color: #6c757d;
  font-weight: 500;
}

@media (max-width: 896px) {
  .mavedb-threshold-trigger-label {
    display: none;
  }
}

.mavedb-threshold-trigger-value {
  color: #212529;
  font-weight: 600;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 480px) {
  .mavedb-threshold-trigger-value {
    max-width: 100px;
  }
}

.mavedb-threshold-trigger-icon {
  font-size: 10px;
  color: #6c757d;
}

.mavedb-histogram-controls {
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.75rem;
  background: #fff;
  border-bottom: 2px solid var(--p-tabs-tablist-border-color, #dee2e6);
}

.mavedb-histogram-controls :deep(.p-tablist) {
  border-bottom: none;
}

.mavedb-histogram-controls :deep(.p-tabs) {
  min-width: 0;
  flex-shrink: 1;
}

.mavedb-histogram-custom-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mavedb-histogram-control {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
}
</style>

<style>
.mavedb-thresholds-popover.p-popover {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 0;
}

.mavedb-thresholds-popover .p-popover-content {
  padding: 4px 0;
}

.mavedb-thresholds-popover.p-popover::before,
.mavedb-thresholds-popover.p-popover::after {
  display: none;
}

.mavedb-thresholds-list {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 360px;
}

.mavedb-thresholds-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
  transition: background-color 0.1s;
}

.mavedb-thresholds-option:hover {
  background-color: #f8f9fa;
}

.mavedb-thresholds-option--active {
  background-color: #f0f7ff;
  font-weight: 600;
}

.mavedb-thresholds-option-label {
  flex: 1;
  min-width: 0;
}

.mavedb-thresholds-option-check {
  font-size: 12px;
  color: var(--p-primary-color, #3b82f6);
  flex-shrink: 0;
}

.mavedb-thresholds-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mavedb-thresholds-badge--research {
  background: #fff3cd;
  color: #856404;
}

.mavedb-thresholds-badge--primary {
  background: #d1ecf1;
  color: #0c5460;
}

.histogram-tooltip {
  position: absolute;
}

.mavedb-histogram-container {
  height: 350px;
}

.mavedb-class-based-calibration-note {
  margin-top: 0.25rem;
  font-size: 12px;
  line-height: 0.9rem;
  display: block;
  text-align: right;
}
</style>
