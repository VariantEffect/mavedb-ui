<template>
  <TabMenu class="mave-histogram-viz-select" v-if="hasTabBar" v-model:activeIndex="activeViz" :model="vizOptions" />
  <div v-if="hasTabBar && showShaders" class="mave-histogram-controls">
    <div class="flex flex-wrap gap-3">
      Shader Options:
      <div class="flex align-items-center gap-1">
          <RadioButton v-model="activeShader" inputId="unsetShader" name="shader" value="null" />
          <label for="unsetShader">No Shader</label>
      </div>
      <div class="flex items-center gap-2" v-if="scoreSet.scoreRanges">
          <RadioButton v-model="activeShader" inputId="rangeShader" name="shader" value="range" />
          <label for="rangeShader">Score Ranges</label>
      </div>
      <div class="flex items-center gap-2" v-if="scoreSet.scoreCalibrations">
          <RadioButton v-model="activeShader" inputId="calibrationShader" name="shader" value="threshold" />
          <label for="calibrationShader">Calibration Thresholds</label>
      </div>
    </div>
  </div>
  <div v-if="showControls" class="mave-histogram-controls">
    <div class="mave-histogram-control">
      <label for="mave-histogram-star-select" class="mave-histogram-control-label">Minimum ClinVar review status 'gold stars': </label>
      <Rating v-model="customMinStarRating" :stars="4" style="display: inline" inputId="mave-histogram-star-select" />
    </div>
    <div class="mave-histogram-control">
      <span class="mave-histogram-control-label">Include variants with classification: </span>
      <div class="flex flex-wrap gap-3">
        <div v-for="classification of clinicalSignificanceClassificationOptions" :key="classification.name" class="flex gap-1 align-items-center">
          <Checkbox v-model="customSelectedClinicalSignificanceClassifications" :name="$scopedId('clinical-significance-inputs')" :value="classification.name" />
          <label :for="$scopedId('clinical-significance-inputs')">{{ classification.shortDescription }}</label>
        </div>
      </div>
    </div>
  </div>
  <div class="mave-histogram-container" ref="histogramContainer" />
  <div v-if="activeShader == 'range'">
    <OddsPathTable :score-set="scoreSet" />
  </div>
  <div v-if="activeShader == 'threshold'">
    <CalibrationTable :calibrations="scoreSet.scoreCalibrations" @calibration-selected="childComponentSelectedCalibrations" />
  </div>
</template>

<script lang="ts">
import { saveChartAsFile } from '@/lib/chart-export'
import _ from 'lodash'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import RadioButton from 'primevue/radiobutton'
import Rating from 'primevue/rating'
import TabMenu from 'primevue/tabmenu'
import {defineComponent} from 'vue'
import config from '@/config'

import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar'
import makeHistogram, {DEFAULT_SERIES_COLOR, Histogram, HistogramSerieOptions, HistogramDatum} from '@/lib/histogram'
import CalibrationTable from '@/components/CalibrationTable.vue'
import { prepareThresholdsForHistogram } from '@/lib/calibrations'
import { prepareRangesForHistogram } from '@/lib/ranges'
import OddsPathTable from './OddsPathTable.vue'

const CLNSIG_FIELD = 'mavedb_clnsig'
const CLNREVSTAT_FIELD = 'mavedb_clnrevstat'

const DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS = [
  'Likely_pathogenic',
  'Pathogenic',
  'Pathogenic/Likely_pathogenic',
  'Likely_benign',
  'Benign',
  'Benign/Likely_benign'
]
const DEFAULT_MIN_STAR_RATING = 1

export default defineComponent({
  name: 'ScoreSetHistogram',
  components: { Checkbox, Dropdown, RadioButton, Rating, TabMenu, CalibrationTable, OddsPathTable },

  emits: ['exportChart'],

  props: {
    // Margins must accommodate the X axis label and title.
    margins: {
      type: Object,
      default: () => ({
        top: 20,
        right: 20,
        bottom: 30,
        left: 20
      })
    },
    numBins: {
      type: Number,
      default: 30,
    },
    variants: {
      type: Array,
      required: true
    },
    scoreSet: {
      type: Object,
      required: true
    },
    externalSelection: {
      type: Object,
      default: null,
      required: false
    }
  },

  mounted: function() {
    this.renderOrRefreshHistogram()
    this.$emit('exportChart', this.exportChart)
  },

  beforeUnmount: function() {
    if (this.histogram) {
      this.histogram.destroy()
      this.histogram = null
    }
  },

  data: function() {
    const scoreSetHasRanges = config.CLINICAL_FEATURES_ENABLED && this.scoreSet.scoreRanges != null

    return {
      config: config,

      activeViz: 0,
      activeShader: scoreSetHasRanges ? 'range' : 'null',
      activeCalibrationKey: null,

      clinicalSignificanceClassificationOptions: CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
      customMinStarRating: DEFAULT_MIN_STAR_RATING,
      customSelectedClinicalSignificanceClassifications: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
      histogram: null as Histogram | null,
    }
  },

  computed: {
    series: function() {
      switch (this.vizOptions[this.activeViz].view) {
        case 'clinical':

          return [{
            classifier: (d) =>
              _.intersection(PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS, this.selectedClinicalSignificanceClassifications)
                  .includes(d[CLNSIG_FIELD]),
            options: {
              color: '#e41a1c',
              title: 'Pathogenic/Likely Pathogenic'
            }
          }, {
            classifier: (d) =>
              _.intersection(BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS, this.selectedClinicalSignificanceClassifications)
                  .includes(d[CLNSIG_FIELD]),
            options: {
              color: '#377eb8',
              title: 'Benign/Likely Benign'
            }
          }]

        case 'custom':
          {
            const series = [{
              classifier: (d) =>
                _.intersection(PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS, this.selectedClinicalSignificanceClassifications)
                    .includes(d[CLNSIG_FIELD])
                    && CLINVAR_REVIEW_STATUS_STARS[d[CLNREVSTAT_FIELD]] >= this.minStarRating,
              options: {
                color: '#e41a1c',
                title: 'Pathogenic/Likely Pathogenic'
              }
            }, {
              classifier: (d) =>
                _.intersection(BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS, this.selectedClinicalSignificanceClassifications)
                    .includes(d[CLNSIG_FIELD])
                    && CLINVAR_REVIEW_STATUS_STARS[d[CLNREVSTAT_FIELD]] >= this.minStarRating,
              options: {
                color: '#377eb8',
                title: 'Benign/Likely Benign'
              }
            }]

            if (this.selectedClinicalSignificanceClassifications.includes('Uncertain_significance')) {
              series.push({
                classifier: (d) =>
                  d[CLNSIG_FIELD] == 'Uncertain_significance'
                      && CLINVAR_REVIEW_STATUS_STARS[d[CLNREVSTAT_FIELD]] >= this.minStarRating,
                options: {
                  color: '#999999',
                  title: 'Uncertain significance'
                }
              })
            }

            if (this.selectedClinicalSignificanceClassifications.includes('Conflicting_interpretations_of_pathogenicity')) {
              series.push({
                classifier: (d) => d[CLNSIG_FIELD] == 'Conflicting_interpretations_of_pathogenicity'
                    && CLINVAR_REVIEW_STATUS_STARS[d[CLNREVSTAT_FIELD]] >= this.minStarRating,
                options: {
                  color: '#984ea3',
                  title: 'Conflicting interpretations'
                }
              })
            }

            return series
          }

        case 'calibrations':
          return null

        default: // Overall score distribution
          return null
      }
    },

    vizOptions: function() {
      const options = [{label: 'Overall Distribution', view: 'distribution'}]
      const someVariantsHaveClinicalSignificance = this.variants.some((v) => v[CLNSIG_FIELD] !== undefined)

      if (someVariantsHaveClinicalSignificance) {
        options.push({label: 'Clinical View', view: 'clinical'})
      }

      // custom view should always come last
      if (someVariantsHaveClinicalSignificance) {
        options.push({label: 'Custom', view: 'custom'})
      }
      return options
    },

    shaderOptions: function() {
      const options = [{label: 'Hide Shaders', view: 'null'}]

      if (this.scoreSet.scoreRanges) {
        options.push({label: 'Score Ranges', view: 'range'})
      }

      if (this.scoreSet.scoreCalibrations) {
        options.push({label: 'Calibration Thresholds', view: 'calibration'})
      }

      return options
    },

    hasTabBar: function() {
      return this.config.CLINICAL_FEATURES_ENABLED && this.vizOptions.length > 1
    },

    showControls: function() {
      return this.activeViz == this.vizOptions.findIndex(item => item.view === 'custom')
    },

    showShaders: function() {
      return this.shaderOptions.length > 1
    },

    activeCalibration: function() {
      return this.activeCalibrationKey ? this.scoreSet.scoreCalibrations[this.activeCalibrationKey] : null
    },

    minStarRating: function() {
      if (this.activeViz == 1) {
        return DEFAULT_MIN_STAR_RATING
      }
      return this.customMinStarRating
    },

    selectedClinicalSignificanceClassifications: function() {
      if (this.activeViz == 1) {
        return DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
      }
      return this.customSelectedClinicalSignificanceClassifications
    },

    tooltipHtmlGetter: function() {
      return (
        variant: HistogramDatum | null,
        bin: HistogramBin | null,
        seriesContainingVariant: HistogramSerieOptions[],
        allSeries: HistogramSerieOptions[]
      ) => {
        const parts = []

        if (variant) {
          // Line 1: Variant identifier
          const variantLabel = variant.mavedb_label || (
            variant.hgvs_pro ?
              (variant.hgvs_nt ? `${variant.hgvs_pro} (${variant.hgvs_nt})` : variant.hgvs_pro)
              : variant.hgvs_splice ?
                (variant.hgvs_nt ? `${variant.hgvs_splice} (${variant.hgvs_nt})` : variant.hgvs_splice)
                : variant.hgvs_nt
          )
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
                  '<span class="mave-histogram-tooltip-variant-color"'
                      + ` style="background-color: ${series.color || DEFAULT_SERIES_COLOR}"></span>`
                )
              }
            }
          }
          if (variant[CLNSIG_FIELD] && variant[CLNSIG_FIELD] != 'NA') {
            const classification = CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.find((c) => c.name == variant[CLNSIG_FIELD])
            if (classification) {
              variantDescriptionParts.push(classification.description)
            }
          }
          if (variant.mavedb_clnrevstat && variant.mavedb_clnrevstat != 'NA') {
            const numStars = CLINVAR_REVIEW_STATUS_STARS[variant.mavedb_clnrevstat]
            if (numStars != null) {
              // Create an array of 4 stars to hold clinical review status a la ClinVar.
              const stars = new Array(4).fill(
                '<span class="mave-histogram-tooltip-variant-star mave-histogram-tooltip-variant-star-filled">★</span>')
                    .fill('<span class="mave-histogram-tooltip-variant-star">☆</span>',
                numStars
              )
              variantDescriptionParts.push(`(${stars.join('')})`)
            }
          }
          if (variantDescriptionParts.length > 0) {
            parts.push(variantDescriptionParts.join(' '))
          }

          // Line 3: Score
          if (variant.score) {
              parts.push(`Score: ${variant.score.toPrecision(4)}`)
          }

          // Line 4: Blank line
          parts.push('')
      }

        // Line 5: Bin range
        if (bin) {
          parts.push(`Bin range: ${bin.x0} to ${bin.x1}`)
        }

        // Line 6:
        bin.seriesBins.forEach((serieBin, i) => {
          const label = allSeries[i].title ? allSeries[i].title : (allSeries.length > 1) ? `Series ${i + 1}` : null
          parts.push(
            (label ? `${label}: ` : '') + `${serieBin.length} variants in bin`)
        })

        return parts.length > 0 ? parts.join('<br />') : null
      }
    }
  },

  watch: {
    variants: {
      handler: function() {
        this.renderOrRefreshHistogram()
      }
    },
    series: {
      handler: function() {
        this.renderOrRefreshHistogram()
      }
    },
    activeCalibration: {
      handler: function() {
        this.renderOrRefreshHistogram()
      }
    },
    activeShader: {
      handler: function() {
          this.renderOrRefreshHistogram()
      }
    },
    externalSelection: {
      handler: function(newValue) {
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
      handler: function() {
        this.renderOrRefreshHistogram()
      }
    },
    selectedClinicalSignificanceClassifications: {
      handler: function() {
        this.renderOrRefreshHistogram()
      }
    },
  },

  mount: function() {
    this.renderOrRefreshHistogram()
  },

  methods: {
    exportChart() {
      saveChartAsFile(this.$refs.histogramContainer, `${this.scoreSet.urn}-scores-histogram`, 'mave-histogram-container')
    },

    renderOrRefreshHistogram: function() {
      if (!this.histogram) {
        this.histogram = makeHistogram()
            .render(this.$refs.histogramContainer)
            .bottomAxisLabel('Functional Score')
            .leftAxisLabel('Number of Variants')
            .numBins(30)
            .valueField((variant) => variant.score)
            .tooltipHtml(this.tooltipHtmlGetter)
      }

      let seriesClassifier: ((d: HistogramDatum) => number[]) | null = null
      if (this.series) {
        const seriesIndices = _.range(0, this.series.length)
        seriesClassifier = (d: HistogramDatum) =>
          seriesIndices.filter((seriesIndex) => this.series[seriesIndex].classifier(d))
      }

      const histogramShaders = {}
      if (this.scoreSet.scoreRanges) {
        histogramShaders["range"] = prepareRangesForHistogram(this.scoreSet.scoreRanges)
      }
      if (this.activeCalibration) {
        histogramShaders["threshold"] = prepareThresholdsForHistogram(this.activeCalibration)
      }

      this.histogram.data(this.variants)
          .seriesOptions(this.series?.map((s) => s.options) || null)
          .seriesClassifier(seriesClassifier)
          .title(this.hasTabBar ? null : 'Distribution of Functional Scores')
          .legendNote(this.activeViz == 0 ? null : 'ClinVar data from time of publication')
          .shaders(histogramShaders)

      if (this.externalSelection) {
        this.histogram.selectDatum(this.externalSelection)
      } else {
        this.histogram.clearSelection()
      }

      // Only render clinical specific viz options if such features are enabled.
      this.histogram.renderShader(null)
      if (this.config.CLINICAL_FEATURES_ENABLED) {
        this.histogram.renderShader(this.activeShader)
      }

      this.histogram.refresh()
    },

    childComponentSelectedCalibrations: function(calibrationKey: string) {
      this.activeCalibrationKey = calibrationKey
    },

    titleCase: (s) =>
            s.replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())       // Initial char (after -/_)
            .replace (/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase()) // First char after each -/_
  }
})
</script>

<style scoped>
.mave-histogram-control {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.mave-histogram-viz-select {
  padding-bottom: 16px;
}

.mave-histogram-viz-select:deep(.p-tabmenu-nav),
.mave-histogram-viz-select:deep(.p-menuitem-link) {
  background: transparent;
}
</style>

<style>
.histogram-tooltip {
  position: absolute;
}

.mave-histogram-tooltip-variant-color {
  display: inline-block;
  height: 12px;
  width: 12px;
  margin-right: 4px;
  border-radius: 100%;
}

.mave-histogram-container {
  height: 350px;
}

.mave-histogram-tooltip-variant-star {
  margin: 0 1.5px;
}
.mave-histogram-tooltip-variant-star-filled {
  color: #fdb81e
}
</style>
