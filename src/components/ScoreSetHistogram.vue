<template>
  <div class="mavedb-histogram-controls">
    <TabMenu v-if="hasTabBar" v-model:active-index="activeViz" class="mave-histogram-viz-select" :model="vizOptions" />
    <div v-if="showCalibrations" class="mavedb-histogram-thresholds-control">
      <div class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-viz-select">Thresholds: </label>
        <Dropdown
          v-model="activeCalibration"
          :disabled="!showCalibrations"
          input-id="mavedb-histogram-viz-select"
          option-label="label"
          :options="activeCalibrationOptions"
          style="align-items: center; height: 1.5rem"
        />
      </div>
    </div>
  </div>
  <div
    v-if="clinicalControlsEnabled && (!refreshedClinicalControls || !associatedClinicalControls)"
    style="font-size: small"
  >
    <ProgressSpinner style="height: 24px; width: 24px" />
    Loading clinical control options in the background. Additional histogram views will be available once loaded.
  </div>
  <div v-if="showControls" class="mavedb-histogram-custom-controls">
    <fieldset class="mavedb-histogram-controls-panel">
      <legend>Clinical Series Options</legend>
      <div v-if="showClinicalControlOptions" class="mavedb-histogram-control">
        <label class="mavedb-histogram-control-label" for="mavedb-histogram-db-select"
          >Clinical control database:
        </label>
        <Dropdown
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
        <Dropdown
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
  <div ref="histogramContainer" class="mavedb-histogram-container" />
  <!-- The child component will attempt to immediately emit the range which is active when it is created. Since Vue lifecycle events bubble up from child to parent, this causes this component to attempt
   to create the histogram before the component is mounted when it doesn't have access to `this.$refs`. As a workaround, only render this child component once the histogram is ready. -->
  <div v-if="showCalibrations && activeCalibration && activeCalibration.value" class="mave-range-table-container">
    <Accordion :active-index="0" collapse-icon="pi pi-minus" expand-icon="pi pi-plus">
      <AccordionTab class="mave-range-table-tab" header="Score Ranges and Clinical Evidence Strength">
        <CalibrationTable
          :score-calibration="activeCalibration.value"
          :score-calibration-name="activeCalibration.label"
        />
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script lang="ts">
import axios from 'axios'
import _ from 'lodash'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import ProgressSpinner from 'primevue/progressspinner'
import Rating from 'primevue/rating'
import TabMenu from 'primevue/tabmenu'
import {defineComponent, PropType} from 'vue'

import CalibrationTable from '@/components/CalibrationTable.vue'
import useScopedId from '@/composables/scoped-id'
import config from '@/config'
import {saveChartAsFile} from '@/lib/chart-export'
import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  CONFLICTING_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  DEFAULT_CLINICAL_CONTROL_DB,
  DEFAULT_CLINICAL_CONTROL_VERSION,
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
  HistogramShader
} from '@/lib/histogram'
import {prepareCalibrationsForHistogram, shaderOverlapsBin, PersistedScoreCalibration} from '@/lib/calibrations'
import {variantNotNullOrNA} from '@/lib/mave-hgvs'
import {
  DEFAULT_VARIANT_EFFECT_TYPES,
  isStartOrStopLoss,
  variantIsMissense,
  variantIsNonsense,
  variantIsOther,
  variantIsSynonymous,
  VARIANT_EFFECT_TYPE_OPTIONS,
  Variant,
  allCodingVariantsHaveProteinConsequence
} from '@/lib/variants'

function naToUndefined(x: string | null | undefined) {
  if (variantNotNullOrNA(x)) {
    return x
  }
  return undefined
}

interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export default defineComponent({
  name: 'ScoreSetHistogram',

  components: {Accordion, AccordionTab, Checkbox, Dropdown, Rating, TabMenu, CalibrationTable, ProgressSpinner},

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
      type: Object,
      default: null,
      required: false
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
      type: Array as PropType<Variant[]>,
      required: true
    },
    hideStartAndStopLossByDefault: {
      type: Boolean,
      default: false
    },
    selectedCalibration: {
      type: String,
      default: null,
      required: false
    }
  },

  emits: ['exportChart', 'calibrationChanged'],

  setup: () => {
    return {
      ...useScopedId()
    }
  },

  data: function () {
    const scoreSetHasCalibrations =
      config.CLINICAL_FEATURES_ENABLED &&
      this.scoreSet.scoreCalibrations != null &&
      this.scoreSet.scoreCalibrations.length > 0

    return {
      config: config,

      activeViz: 0,
      showCalibrations: scoreSetHasCalibrations,
      activeCalibration: {label: 'None', value: null} as {
        label: string
        value: PersistedScoreCalibration | null
      },
      defaultVizApplied: false,

      clinicalControls: [] as ClinicalControl[],
      clinicalControlOptions: [] as ClinicalControlOption[],
      clinicalControlCache: {} as Record<string, Record<string, ClinicalControl[]>>,
      someVariantsHaveClinicalSignificance: false,
      clinicalControlsEnabled: config.CLINICAL_FEATURES_ENABLED,
      refreshedClinicalControls: false,
      associatedClinicalControls: false,

      controlDb: null as ClinicalControlOption | null,
      controlVersion: null as string | null,

      clinicalSignificanceClassificationOptions: clinvarClinicalSignificanceClassifications(
        DEFAULT_CLINICAL_CONTROL_VERSION
      ),
      variantTypeOptions: VARIANT_EFFECT_TYPE_OPTIONS,
      customMinStarRating: DEFAULT_MIN_STAR_RATING,
      customSelectedClinicalSignificanceClassifications: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
      customSelectedVariantTypeFilters: [] as string[],
      customSelectedControlVariantTypeFilters: DEFAULT_VARIANT_EFFECT_TYPES.concat(
        this.hideStartAndStopLossByDefault ? [] : ['Start/Stop Loss']
      ),
      histogram: null as Histogram | null
    }
  },

  computed: {
    proteinEffectOptionsAvailable: function () {
      return allCodingVariantsHaveProteinConsequence(this.variants)
    },
    series: function () {
      if (!this.refreshedClinicalControls) {
        return null
      }

      switch (this.vizOptions[this.activeViz].view) {
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

        case 'effect':
          return [
            {
              classifier: (d: HistogramDatum) => variantIsMissense(d),
              options: {
                color: '#ffcd3a',
                title: 'Missense'
              }
            },
            {
              classifier: (d: HistogramDatum) => variantIsSynonymous(d),
              options: {
                color: '#6aa84f',
                title: 'Synonymous'
              }
            },
            {
              classifier: (d: HistogramDatum) => variantIsNonsense(d),
              options: {
                color: '#681a1a',
                title: 'Nonsense'
              }
            },
            ...(this.hideStartAndStopLossByDefault
              ? []
              : [
                  {
                    classifier: (d: HistogramDatum) => isStartOrStopLoss(d),
                    options: {
                      color: '#cd3aff',
                      title: 'Start/Stop Loss'
                    }
                  }
                ]),
            {
              classifier: (d: HistogramDatum) => variantIsOther(d),
              options: {
                color: '#3affcd',
                title: 'Other'
              }
            }
          ]

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
              classifier: (d: Variant) =>
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
                title: conflictingClinicalSignificanceSeriesLabelForVersion(
                  this.controlVersion ? this.controlVersion : DEFAULT_CLINICAL_CONTROL_VERSION
                )
              }
            })
          }

          if (this.proteinEffectOptionsAvailable && this.selectedVariantTypeFilters.includes('Missense')) {
            series.push({
              classifier: (d: HistogramDatum) => variantIsMissense(d),
              options: {
                color: '#ffcd3a',
                title: 'Missense'
              }
            })
          }

          if (this.proteinEffectOptionsAvailable && this.selectedVariantTypeFilters.includes('Synonymous')) {
            series.push({
              classifier: (d: HistogramDatum) => variantIsSynonymous(d),
              options: {
                color: '#6aa84f',
                title: 'Synonymous'
              }
            })
          }

          if (this.proteinEffectOptionsAvailable && this.selectedVariantTypeFilters.includes('Nonsense')) {
            series.push({
              classifier: (d: HistogramDatum) => variantIsNonsense(d),
              options: {
                color: '#681a1a',
                title: 'Nonsense'
              }
            })
          }

          if (this.proteinEffectOptionsAvailable && this.selectedVariantTypeFilters.includes('Start/Stop Loss')) {
            series.push({
              classifier: (d: HistogramDatum) => isStartOrStopLoss(d),
              options: {
                color: '#cd3aff',
                title: 'Start/Stop Loss'
              }
            })
          }

          if (this.proteinEffectOptionsAvailable && this.selectedVariantTypeFilters.includes('Other')) {
            series.push({
              classifier: (d: HistogramDatum) => variantIsOther(d),
              options: {
                color: '#3affcd',
                title: 'Other'
              }
            })
          }

          return series
        }

        default: // Overall score distribution
          return null
      }
    },

    vizOptions: function () {
      const options = [{label: 'Overall Distribution', view: 'distribution', clinicalControlLegendNoteEnabled: false}]

      if (this.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Clinical View', view: 'clinical', clinicalControlLegendNoteEnabled: true})
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
      return this.config.CLINICAL_FEATURES_ENABLED && this.vizOptions.length > 1
    },

    showControls: function () {
      return this.activeViz == this.vizOptions.findIndex((item) => item.view === 'custom')
    },

    scoreCalibrations: function (): {[key: string]: PersistedScoreCalibration} | null {
      const calibrationObjects: Record<string, PersistedScoreCalibration> = {}
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
        const label = value.researchUseOnly ? `Research Use Only: ${value.title}` : value.title
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
      const shaders: Record<string, any> = {null: null} // No shader

      if (!this.scoreCalibrations) return shaders

      for (const [key, value] of Object.entries(this.scoreCalibrations)) {
        shaders[key] = prepareCalibrationsForHistogram(value as PersistedScoreCalibration)
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
        variant: Variant | null, // HistogramDatum | null,
        bin: HistogramBin | null,
        seriesContainingVariant: HistogramSerieOptions[],
        allSeries: HistogramSerieOptions[]
      ) => {
        const parts = []

        if (variant) {
          // Line 1: Variant identifier
          const mappedDnaHgvs = naToUndefined(variant.post_mapped_hgvs_c)
          const mappedProteinHgvs =
            naToUndefined(variant.post_mapped_hgvs_p) ?? naToUndefined(variant.translated_hgvs_p)
          const unmappedDnaHgvs = naToUndefined(variant.hgvs_nt)
          const unmappedProteinHgvs = naToUndefined(variant.hgvs_pro)
          const unmappedSpliceHgvs = naToUndefined(variant.hgvs_splice)
          // const variantLabel = variant.mavedb_label || (
          //   proteinHgvs ?
          //     (dnaHgvs ? `${proteinHgvs} (${dnaHgvs})` : proteinHgvs)
          //     : spliceHgvs ?
          //       (dnaHgvs ? `${spliceHgvs} (${dnaHgvs})` : spliceHgvs)
          //       : dnaHgvs
          // )
          const mappedVariantLabel = mappedProteinHgvs
            ? mappedDnaHgvs
              ? `${mappedProteinHgvs} (${mappedDnaHgvs})`
              : mappedProteinHgvs
            : mappedDnaHgvs
          const unmappedVariantLabel = unmappedProteinHgvs
            ? unmappedDnaHgvs
              ? `${unmappedProteinHgvs} (${unmappedDnaHgvs})`
              : unmappedProteinHgvs
            : unmappedSpliceHgvs
              ? unmappedDnaHgvs
                ? `${unmappedSpliceHgvs} (${unmappedDnaHgvs})`
                : unmappedSpliceHgvs
              : unmappedDnaHgvs

          const variantLabel =
            this.coordinates == 'mapped'
              ? (mappedVariantLabel ?? variant.mavedb_label ?? unmappedVariantLabel)
              : (variant.mavedb_label ?? unmappedVariantLabel)
          if (variantLabel) {
            parts.push(variantLabel)
          }

          // Line 2: Variant description
          const variantDescriptionParts = []
          if (seriesContainingVariant.length == 0) {
            variantDescriptionParts.push('(not shown in currently visible series)')
          } else {
            for (const series of seriesContainingVariant) {
              if (series.title) {
                variantDescriptionParts.push(
                  '<span class="mavedb-histogram-tooltip-variant-color"' +
                    ` style="background-color: ${series.color || DEFAULT_SERIES_COLOR}"></span>`
                )
              }
            }
          }

          const variantHasClinicalSignificance =
            variant.control && variant.control[DEFAULT_CLNSIG_FIELD] && variant.control[DEFAULT_CLNSIG_FIELD] != 'NA'
          const variantHasReviewStatus =
            variant.control &&
            variant.control[DEFAULT_CLNREVSTAT_FIELD] &&
            variant.control[DEFAULT_CLNREVSTAT_FIELD] != 'NA'
          if (variantHasClinicalSignificance) {
            const classification = clinvarClinicalSignificanceClassifications(
              this.controlVersion ? this.controlVersion : DEFAULT_CLINICAL_CONTROL_VERSION
            ).find((c) => c.name == variant.control?.[DEFAULT_CLNSIG_FIELD])
            if (classification) {
              variantDescriptionParts.push(classification.description)
            }
          }
          if (variantHasReviewStatus) {
            const numStars = CLINVAR_REVIEW_STATUS_STARS[variant.control?.[DEFAULT_CLNREVSTAT_FIELD]]
            if (numStars != null) {
              // Create an array of 4 stars to hold clinical review status a la ClinVar.
              const stars = new Array(4)
                .fill(
                  '<span class="mavedb-histogram-tooltip-variant-star mavedb-histogram-tooltip-variant-star-filled">★</span>'
                )
                .fill('<span class="mavedb-histogram-tooltip-variant-star">☆</span>', numStars)
              variantDescriptionParts.push(`(${stars.join('')})`)
            }
          }
          if (variantDescriptionParts.length > 0) {
            parts.push(variantDescriptionParts.join(' '))
          }
          if (variantHasClinicalSignificance && variantHasReviewStatus) {
            const clinVarLinkOut = `<a href="http://www.ncbi.nlm.nih.gov/clinvar/?term=${variant.control.dbIdentifier}[alleleid]" target="_blank">View in ClinVar</a>`
            parts.push(clinVarLinkOut)
          }

          // Line 3: Score and classification
          if (variant.score) {
            let binClassificationLabel = ''
            if (bin && this.activeCalibration.value?.urn) {
              // TODO#491: Refactor this calculation into the creation of variant objects so we may just access the property of the variant which tells us its classification.
              const binClassification = this.histogramShaders[this.activeCalibration.value.urn]?.find(
                (calibration: HistogramShader) => shaderOverlapsBin(calibration, bin)
              )

              binClassificationLabel = `<span class="mavedb-range-classification-badge" style="margin-left: 6px; background-color:${binClassification.color}; color:white;">${binClassification.title}</span>`
            }

            parts.push(`Score: ${variant.score.toPrecision(4)} ${binClassificationLabel}`)
          }

          // Line 4: Blank line
          parts.push('')
        }

        if (bin) {
          // Line 5: Bin range
          parts.push(`Bin range: ${bin.x0} to ${bin.x1}`)

          //Line 6: Bin Classification
          if (this.activeCalibration.value?.urn) {
            // TODO#491: Refactor this calculation into the creation of histogram bins so we don't need to repeat it every time we construct a tooltip.
            const binClassifications =
              this.histogramShaders[this.activeCalibration.value.urn]
                ?.filter((calibration: HistogramShader) => shaderOverlapsBin(calibration, bin))
                .sort(
                  (a: HistogramShader, b: HistogramShader) => (a.min ? a.min : -Infinity) - (b.min ? b.min : -Infinity)
                ) || []

            if (binClassifications.length > 0) {
              const binClassificationLabels = binClassifications.map((binClassification: HistogramShader) => {
                const calibrationMin = binClassification.min ?? -Infinity
                const calibrationMax = binClassification.max ?? Infinity

                const spanStart = Math.max(bin.x0, calibrationMin).toPrecision(3)
                const spanEnd = Math.min(bin.x1, calibrationMax).toPrecision(3)

                const binSpansMultipleShaders = bin.x0 < calibrationMin || bin.x1 > calibrationMax
                const multipleShaderRangeText = spanStart != spanEnd ? ` (${spanStart}-${spanEnd})` : `(${spanStart})`

                return `<span class="mavedb-range-classification-badge" style="background-color:${binClassification.color}; color:white;">${binClassification.title} ${binSpansMultipleShaders ? `${multipleShaderRangeText}` : ''}</span>`
              })

              // If the bin spans many classifications, show the first two and then the rest on a new line.
              if (binClassificationLabels.length <= 2) {
                parts.push(`Bin classification(s): ${binClassificationLabels.join(', ')}`)
              } else {
                parts.push(`Bin classification(s): ${binClassificationLabels.slice(0, 2).join(', ')},`)
                parts.push(binClassificationLabels.slice(2).join(', '))
              }
            }
          } else {
            parts.push('Bin classification(s): N/A')
          }

          // Line 7: Bin series counts
          bin.seriesBins.forEach((serieBin, i) => {
            const label = allSeries[i].title ? allSeries[i].title : allSeries.length > 1 ? `Series ${i + 1}` : null
            parts.push((label ? `${label}: ` : '') + `${serieBin.length} variants in bin`)
          })
        }

        return parts.length > 0 ? parts.join('<br />') : null
      }
    }
  },

  watch: {
    scoreSet: {
      handler: async function () {
        if (this.config.CLINICAL_FEATURES_ENABLED) {
          await this.loadClinicalControlOptions()
        }
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
      handler: function () {
        this.renderOrRefreshHistogram()
        this.$emit('calibrationChanged', this.activeCalibration.value?.urn ?? null)
      }
    },
    showCalibrations: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    externalSelection: {
      handler: function (newValue) {
        if (this.histogram) {
          if (newValue) {
            this.histogram.selectDatum(newValue)
          } else {
            this.histogram.clearSelection()
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
              return clinvarConflictingSignificanceClassificationForVersion(
                this.controlVersion ? this.controlVersion : DEFAULT_CLINICAL_CONTROL_VERSION
              ).name
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
          const defaultControlVersion = this.controlDb?.availableVersions.find(
            (version) => version == DEFAULT_CLINICAL_CONTROL_VERSION
          )
          this.controlVersion = defaultControlVersion ? defaultControlVersion : this.controlDb?.availableVersions[0]
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
        if (this.config.CLINICAL_FEATURES_ENABLED) {
          this.clinicalSignificanceClassificationOptions = clinvarClinicalSignificanceClassifications(
            this.controlVersion ? this.controlVersion : DEFAULT_CLINICAL_CONTROL_VERSION
          )
          this.loadClinicalControls()
        }
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
      handler(newOptions) {
        if (this.defaultVizApplied) return
        const idx = newOptions.findIndex((opt) => opt.view === this.defaultHistogram)
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
    this.$emit('exportChart', this.exportChart)
    this.activeCalibration = this.chooseDefaultCalibration()
  },

  beforeUnmount: function () {
    if (this.histogram) {
      this.histogram.destroy()
      this.histogram = null
    }
  },

  methods: {
    filterControlVariantByEffect(variant: Variant) {
      // Do not filter control variants unless we have protein consequences for all coding variants.
      if (!this.proteinEffectOptionsAvailable) {
        return true
      }
      return (
        (this.selectedControlVariantTypeFilters.includes('Missense') && variantIsMissense(variant)) ||
        (this.selectedControlVariantTypeFilters.includes('Synonymous') && variantIsSynonymous(variant)) ||
        (this.selectedControlVariantTypeFilters.includes('Nonsense') && variantIsNonsense(variant)) ||
        (this.selectedControlVariantTypeFilters.includes('Start/Stop Loss') && isStartOrStopLoss(variant)) ||
        (this.selectedControlVariantTypeFilters.includes('Other') &&
          !variantIsMissense(variant) &&
          !variantIsSynonymous(variant) &&
          !variantIsNonsense(variant) &&
          !isStartOrStopLoss(variant))
      )
    },
    exportChart() {
      saveChartAsFile(
        this.$refs.histogramContainer,
        `${this.scoreSet.urn}-scores-histogram`,
        'mavedb-histogram-container'
      )
    },

    renderOrRefreshHistogram: function () {
      if (!this.histogram) {
        this.histogram = makeHistogram()
          .render(this.$refs.histogramContainer)
          .bottomAxisLabel('Functional Score')
          .leftAxisLabel('Number of Variants')
          .numBins(30)
          .valueField((variant: Variant) => variant.score)
          .accessorField((variant: Variant) => variant.accession)
          .tooltipHtml(this.tooltipHtmlGetter)
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

      // Only render clinical specific viz options if such features are enabled.
      if (this.config.CLINICAL_FEATURES_ENABLED && this.showCalibrations) {
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
          const variant = this.variants.find((variant) => variant.accession === mappedVariant.variantUrn)
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
        (option) => option.value?.functionalRanges && option.value.functionalRanges.length > 0
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
}

.mavedb-histogram-thresholds-control {
  margin-left: auto;
}

.mavedb-histogram-thresholds-control:first-child {
  margin-left: 0;
}

.mavedb-histogram-controls {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.mavedb-histogram-custom-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mavedb-histogram-control {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.mavedb-histogram-viz-select {
  padding-bottom: 16px;
}

.mavedb-histogram-viz-select:deep(.p-tabmenu-nav),
.mavedb-histogram-viz-select:deep(.p-menuitem-link) {
  background: transparent;
}
</style>

<style>
.histogram-tooltip {
  position: absolute;
}

.mavedb-histogram-tooltip-variant-color {
  display: inline-block;
  height: 12px;
  width: 12px;
  margin-right: 4px;
  border-radius: 100%;
}

.mavedb-histogram-container {
  height: 350px;
}

.mavedb-histogram-tooltip-variant-star {
  margin: 0 1.5px;
}
.mavedb-histogram-tooltip-variant-star-filled {
  color: #fdb81e;
}

.mavedb-range-classification-badge {
  padding: 2px 2px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}
</style>
