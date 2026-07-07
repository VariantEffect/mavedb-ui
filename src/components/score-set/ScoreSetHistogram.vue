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
      <div v-if="showClinicalControlOptions" class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-db-select"
          >Clinical control database:
        </label>
        <PSelect
          v-model="controlDb"
          :disabled="!refreshedClinicalControls"
          input-id="mavedb-histogram-db-select"
          option-label="dbName"
          :options="clinicalControlOptions"
          style="align-items: center; height: 1.5rem"
        />
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-version-select"
          >Clinical control version:
        </label>
        <PSelect
          v-model="controlVersion"
          :disabled="!refreshedClinicalControls"
          input-id="mavedb-histogram-version-select"
          :options="controlDb?.availableVersions"
          style="align-items: center; height: 1.5rem"
        />
      </div>
      <div class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-star-select">
          Minimum ClinVar review status 'gold stars':
        </label>
        <Rating
          v-model="customMinStarRating"
          :disabled="!refreshedClinicalControls"
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
              :disabled="!refreshedClinicalControls"
              :name="scopedId('variant-type-inputs')"
              :value="typeOption.name"
            />
            <label :for="scopedId('variant-type-inputs')">{{ typeOption.shortDescription }}</label>
          </div>
        </div>
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
              :disabled="!refreshedClinicalControls"
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
              :disabled="!refreshedClinicalControls"
              :name="scopedId('variant-type-inputs')"
              :value="typeOption.name"
            />
            <label :for="scopedId('variant-type-inputs')">{{ typeOption.shortDescription }}</label>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
  <div
    v-if="clinicalControlsEnabled && (!refreshedClinicalControls || !associatedClinicalControls)"
    style="font-size: small"
  >
    <ProgressSpinner style="height: 24px; width: 24px" />
    Loading clinical control options in the background. Additional histogram views will be available once loaded.
  </div>
  <div v-if="isCalibrationClassViewActive && isLoadingActiveCalibrationVariants" style="font-size: small">
    <ProgressSpinner style="height: 24px; width: 24px" />
    Loading calibration class variants.
  </div>
  <div ref="histogramContainer" class="mavedb-histogram-container" />
  <span
    v-if="vizOptions[activeViz]?.clinicalControlLegendNoteEnabled && refreshedClinicalControls"
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
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  DEFAULT_CLINICAL_CONTROL_DB,
  DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_MIN_STAR_RATING,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  clinvarClinicalSignificanceClassifications,
  clinvarConflictingSignificanceClassificationForVersion,
  conflictingClinicalSignificanceSeriesLabelForVersion
} from '@/lib/clinical-controls'
import type {ClinicalControl, ClinicalControlOption} from '@/lib/clinical-controls'
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
  prepareCalibrationsForHistogram,
  shaderOverlapsBin,
  functionalClassificationContainsVariant,
  getClassificationColor
} from '@/lib/calibrations'
import type {FunctionalClassificationVariant} from '@/lib/calibrations'
import {
  tooltipBadgeBlock,
  tooltipCountRow,
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
  clinicalControlLegendNoteEnabled: boolean
}

export default defineComponent({
  name: 'ScoreSetHistogram',

  components: {Checkbox, Popover, PSelect, Rating, Tabs, TabList, Tab, ProgressSpinner},

  props: {
    coordinates: {
      type: String as PropType<'raw' | 'mapped'>,
      default: 'raw'
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

      clinicalControls: [] as ClinicalControl[],
      clinicalControlOptions: [] as ClinicalControlOption[],
      clinicalControlCache: {} as Record<string, Record<string, ClinicalControl[]>>,
      someVariantsHaveClinicalSignificance: false,
      clinicalControlsEnabled: true,
      refreshedClinicalControls: false,
      associatedClinicalControls: false,

      controlDb: null as ClinicalControlOption | null,
      controlVersion: null as string | null,

      clinicalSignificanceClassificationOptions: clinvarClinicalSignificanceClassifications(null),
      variantTypeOptions: EFFECT_TYPE_FILTER_OPTIONS,
      customMinStarRating: DEFAULT_MIN_STAR_RATING,
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
    proteinEffectOptionsAvailable: function () {
      // Worth offering as soon as some variant carries a VEP consequence (anything but 'No consequence').
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
      if (!this.refreshedClinicalControls) {
        return null
      }

      this.assureActiveVizIsAvailable()

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
        case 'clinical':
          return [
            {
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]),
              options: {
                color: '#e41a1c',
                title: 'Pathogenic/Likely Pathogenic'
              }
            },
            {
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]),
              options: {
                color: '#377eb8',
                title: 'Benign/Likely Benign'
              }
            }
          ]

        case 'effect': {
          // The dedicated effect view shows every annotated bucket (Start/Stop Loss omitted for
          // synthetic targets); 'No consequence' is not a protein effect and is left out here.
          const buckets = EFFECT_BUCKETS.map((b) => b.name).filter(
            (name) => name !== 'No consequence' && !(name === 'Start/Stop Loss' && this.hideStartAndStopLossByDefault)
          )
          return this.proteinEffectSeries(buckets)
        }

        case 'custom': {
          const series = [
            {
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]) &&
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating &&
                this.filterControlVariantByEffect(d),
              options: {
                color: '#e41a1c',
                title: 'Pathogenic/Likely Pathogenic'
              }
            },
            {
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]) &&
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating &&
                this.filterControlVariantByEffect(d),
              options: {
                color: '#377eb8',
                title: 'Benign/Likely Benign'
              }
            }
          ]

          if (this.selectedClinicalSignificanceClassifications.includes('Uncertain significance')) {
            series.push({
              classifier: (d: DisplayVariant) =>
                d.control?.[DEFAULT_CLNSIG_FIELD] == 'Uncertain significance' &&
                (CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] ?? -1) >= this.minStarRating &&
                this.filterControlVariantByEffect(d),
              options: {
                color: '#999999',
                title: 'Uncertain significance'
              }
            })
          }

          // Account for both possible conflicting classifications.
          if (
            this.selectedClinicalSignificanceClassifications.includes('Conflicting classifications of pathogenicity') ||
            this.selectedClinicalSignificanceClassifications.includes('Conflicting interpretations of pathogenicity')
          ) {
            series.push({
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]) &&
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating &&
                this.filterControlVariantByEffect(d),
              options: {
                color: '#984ea3',
                title: conflictingClinicalSignificanceSeriesLabelForVersion(this.controlVersion)
              }
            })
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
        {label: 'Overall Distribution', view: 'distribution', clinicalControlLegendNoteEnabled: false}
      ]

      if (this.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Clinical View', view: 'clinical', clinicalControlLegendNoteEnabled: true})
      }

      if (this.selectedCalibrationIsClassBased) {
        options.push({
          label: 'Calibration Class View',
          view: 'calibration-classes',
          clinicalControlLegendNoteEnabled: false
        })
      }

      // crude to be based on clinical significance. may be a better option for viz control
      if (this.proteinEffectOptionsAvailable) {
        options.push({label: 'Protein Effect View', view: 'effect', clinicalControlLegendNoteEnabled: false})
      }

      // custom view should always come last
      if (this.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Custom', view: 'custom', clinicalControlLegendNoteEnabled: true})
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

    showClinicalControlOptions: function () {
      const hasMultipleDbs = this.clinicalControlOptions.length > 1
      const hasSingleDbWithMultipleVersions =
        this.clinicalControlOptions.length == 1 && this.clinicalControlOptions[0].availableVersions.length > 1

      return hasMultipleDbs || hasSingleDbWithMultipleVersions
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

    controlDbAndVersion() {
      return `${this.controlDb?.dbName}|${this.controlVersion}`
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
      handler: async function () {
        this.calibrationClassVariantsByUrn = {}
        this.calibrationClassVariantsLoadingByUrn = {}

        await this.loadClinicalControlOptions()
        // Changes to clinical control options will trigger loading of clinical controls.
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
              return clinvarConflictingSignificanceClassificationForVersion(this.controlVersion).name
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
    clinicalControlOptions: {
      handler: function () {
        if (!this.controlDb) {
          const defaultControlDb = this.clinicalControlOptions.find(
            (option) => option.dbName == DEFAULT_CLINICAL_CONTROL_DB
          )
          this.controlDb = defaultControlDb ? defaultControlDb : this.clinicalControlOptions[0]
        }
        if (!this.controlVersion) {
          this.controlVersion = this.controlDb?.availableVersions[0]
        }
        const cache: Record<string, Record<string, ClinicalControl[]>> = {}
        for (const dbOption of this.clinicalControlOptions) {
          cache[dbOption.dbName] = {}
          for (const version of dbOption.availableVersions) {
            cache[dbOption.dbName][version] = []
          }
        }
        this.clinicalControlCache = cache
      }
    },
    controlDbAndVersion: {
      handler: function () {
        this.clinicalSignificanceClassificationOptions = clinvarClinicalSignificanceClassifications(this.controlVersion)
        this.loadClinicalControls()
      }
    },
    clinicalControls: {
      handler: function () {
        this.disassociateClinicalControlsWithVariants()
        this.associateClinicalControlsWithVariants()
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
      // In the mapped frame an unmapped variant's label is its submitted (target-frame) HGVS; flag it so
      // the string isn't mistaken for a mapped coordinate.
      if (this.coordinates == 'mapped' && this.isUnmapped(variant)) {
        identity.push(tooltipNote('Could not be mapped'))
      }

      if (variant.score != null) {
        identity.push(tooltipText(`Score ${variant.score.toPrecision(4)}`))
        const classification = this.matchVariantClassification(variant)
        if (classification) {
          identity.push(tooltipBadgeBlock(getClassificationColor(classification), classification.label))
        }
      }

      if (variant.clingenAlleleId) {
        identity.push(tooltipVariantDetailsLink(variant.clingenAlleleId))
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
      const significance = control[DEFAULT_CLNSIG_FIELD]
      const reviewStatus = control[DEFAULT_CLNREVSTAT_FIELD]
      const hasSignificance = Boolean(significance) && significance != 'NA'
      const hasReviewStatus = Boolean(reviewStatus) && reviewStatus != 'NA'
      if (!hasSignificance) {
        return null
      }

      const description =
        clinvarClinicalSignificanceClassifications(this.controlVersion).find((c) => c.name == significance)
          ?.description ?? significance
      const numStars = hasReviewStatus ? CLINVAR_REVIEW_STATUS_STARS[reviewStatus] : null
      const stars = numStars != null ? ` ${tooltipReviewStars(numStars)}` : ''

      return tooltipSection([
        tooltipSectionLabel('ClinVar'),
        tooltipText(`${description}${stars}`),
        hasReviewStatus
          ? tooltipLink(
              `http://www.ncbi.nlm.nih.gov/clinvar/?term=${control.dbIdentifier}[alleleid]`,
              'View in ClinVar'
            )
          : null
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
        rows.push(
          tooltipCountRow({
            color: series?.color || DEFAULT_SERIES_COLOR,
            label: series?.title || (allSeries.length > 1 ? `Series ${i + 1}` : ''),
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
      if (!this.histogram) {
        this.histogram = makeHistogram()
          .render(this.$refs.histogramContainer)
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
          this.vizOptions[this.activeViz]?.clinicalControlLegendNoteEnabled && this.refreshedClinicalControls
            ? `${this.controlDb?.dbName} data from version ${this.controlVersion}`
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
    loadClinicalControls: async function () {
      if (
        this.controlDb &&
        this.controlVersion &&
        this.clinicalControlCache[this.controlDb.dbName]?.[this.controlVersion].length > 0
      ) {
        this.clinicalControls = this.clinicalControlCache[this.controlDb.dbName][this.controlVersion]
        this.refreshedClinicalControls = true
        return
      }

      this.refreshedClinicalControls = false
      let queryString = ''
      if (this.controlDb) {
        queryString += `?db=${encodeURIComponent(this.controlDb.dbName)}`
      }
      if (this.controlVersion) {
        queryString += queryString
          ? `&version=${encodeURIComponent(this.controlVersion)}`
          : `?version=${encodeURIComponent(this.controlVersion)}`
      }

      if (this.scoreSet) {
        try {
          const response = await axios.get(
            `${config.apiBaseUrl}/score-sets/${this.scoreSet.urn}/clinical-controls${queryString}`
          )
          if (response.data) {
            this.clinicalControls = response.data

            if (this.controlDb && this.controlVersion) {
              this.clinicalControlCache[this.controlDb.dbName][this.controlVersion] = response.data
            }
          }
        } catch {
          // this.$toast.add({
          //   severity: 'warn',
          //   summary:
          //     'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.',
          //   detail: error.detail,
          //   life: 3000
          // })
          this.associatedClinicalControls = true
        }
      }
      this.refreshedClinicalControls = true
    },

    loadClinicalControlOptions: async function () {
      if (this.scoreSet) {
        try {
          const response = await axios.get(
            `${config.apiBaseUrl}/score-sets/${this.scoreSet.urn}/clinical-controls/options`
          )
          if (response.status == 200) {
            this.clinicalControlOptions = response.data
          }
        } catch {
          // this.$toast.add({
          //   severity: 'warn',
          //   summary:
          //     'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.',
          //   detail: error.detail,
          //   life: 3000
          // })
          // We still want to set the refreshed flag to true so that the loading spinner goes away.
          this.refreshedClinicalControls = true
          this.associatedClinicalControls = true
        }
      }
    },

    disassociateClinicalControlsWithVariants: function () {
      this.associatedClinicalControls = false
      this.someVariantsHaveClinicalSignificance = false

      for (const variant of this.variants) {
        variant.control = null
      }
    },

    associateClinicalControlsWithVariants: function () {
      let associatedAnyControlsWithVariants = false

      for (const clinicalControl of this.clinicalControls) {
        clinicalControl.mappedVariants.forEach((mappedVariant) => {
          const variant = this.variants.find((variant) => variant.variantUrn === mappedVariant.variantUrn)
          if (variant) {
            associatedAnyControlsWithVariants = true
            variant.control = clinicalControl
          }
        })
      }

      this.associatedClinicalControls = true
      this.someVariantsHaveClinicalSignificance = associatedAnyControlsWithVariants

      //   if (!this.someVariantsHaveClinicalSignificance) {
      //     this.$toast.add({
      //       severity: 'warn',
      //       summary:
      //         'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.'
      //     })
      //   }
    },

    chooseDefaultCalibration: function () {
      if (this.activeCalibration.value) {
        return this.activeCalibration
      }

      if (!this.scoreCalibrations) {
        return {label: 'None', value: null}
      }

      if (this.selectedCalibration) {
        const matchingCalibration = this.activeCalibrationOptions.find(
          (option) => option.value?.urn === this.selectedCalibration
        )
        if (matchingCalibration) {
          return {
            ...matchingCalibration
          }
        }
      }

      // Always default to showing the primary calibration if none is selected and one exists.
      const primaryCalibration = this.activeCalibrationOptions.find((option) => option.value?.primary === true)
      if (primaryCalibration) {
        return primaryCalibration
      }

      // If no primary, prefer investigator provided calibrations
      const investigatorProvided = this.activeCalibrationOptions.find(
        (option) => option.value?.investigatorProvided === true
      )
      if (investigatorProvided) {
        return investigatorProvided
      }

      // Next, prefer any calibration that is not research use only
      const nonResearchUseOnly = this.activeCalibrationOptions.find(
        (option) => option.value != null && option.value.researchUseOnly !== true
      )
      if (nonResearchUseOnly) {
        return nonResearchUseOnly
      }

      // Next, prefer any calibration that has any functional ranges defined
      const anyWithRanges = this.activeCalibrationOptions.find(
        (option) => option.value?.functionalClassifications && option.value.functionalClassifications.length > 0
      )
      if (anyWithRanges) {
        return anyWithRanges
      }

      // Next, prefer any calibration at all
      const anyCalibration = this.activeCalibrationOptions.find((option) => option.value != null)
      if (anyCalibration) {
        return anyCalibration
      }

      return {label: 'None', value: null}
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
