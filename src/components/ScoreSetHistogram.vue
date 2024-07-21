<template>
  <TabMenu class="mave-histogram-viz-select" v-if="hasTabBar" v-model:activeIndex="activeViz" :model="vizOptions" />
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
</template>

<script lang="ts">
import * as d3 from 'd3'
import _ from 'lodash'
import Checkbox from 'primevue/checkbox'
import Rating from 'primevue/rating'
import TabMenu from 'primevue/tabmenu'
import {defineComponent} from 'vue'

import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar'
import makeHistogram, {DEFAULT_SERIES_COLOR, Histogram, HistogramSerieOptions} from '@/lib/histogram'

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
  components: { Checkbox, Rating, TabMenu, },

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
  },

  beforeUnmount: function() {
    if (this.histogram) {
      this.histogram.destroy()
      this.histogram = null
    }
  },

  data: () => ({
    activeViz: 0,
    clinicalSignificanceClassificationOptions: CLINVAR_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
    customMinStarRating: DEFAULT_MIN_STAR_RATING,
    customSelectedClinicalSignificanceClassifications: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
    histogram: null as Histogram | null
  }),

  computed: {
    series: function() {
      switch (this.activeViz) {
        case 1: // Clinical view

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

        case 2: // Custom
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

        case 0: // Overall score distribution
        default:

          return null
      }
    },

    vizOptions: function() {
      const options = [{label: 'Overall Distribution'}]
      if (this.variants.some((v) => v[CLNSIG_FIELD] !== undefined)) {
        options.push({label: 'Clinical View'})
        options.push({label: 'Custom'})
      }
      return options
    },

    hasTabBar: function() {
      return this.vizOptions.length > 1
    },

    showControls: function() {
      return this.activeViz == 2
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
          parts.push(variant.mavedb_label)

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
        renderOrRefreshHistogram()
      }
    },
    series: {
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
    }
  },

  mount: function() {
    this.renderOrRefreshHistogram()
  },

  methods: {
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

      let ranges = []
      switch (this.scoreSet.urn) {
        case 'urn:mavedb:00000097-0-1':
          ranges = [{
            min: -0.748,
            max: 1.307,
            color: '#4444ff',
            title: 'Functionally normal'
          }, {
            min: -5.651,
            max: -1.328,
            color: '#ff4444',
            title: 'Functionally abnormal'
          }]
          break
        case 'urn:mavedb:00000050-a-1':
          ranges = [{
            min: -7.57,
            max: 0,
            color: '#4444ff',
            title: 'Functionally normal'
          }, {
            min: 0,
            max: 5.39,
            color: '#ff4444',
            title: 'Functionally abnormal'
          }]
          break
      }

      this.histogram.data(this.variants)
          .seriesOptions(this.series?.map((s) => s.options) || null)
          .seriesClassifier(seriesClassifier)
          .title(this.hasTabBar ? null : 'Distribution of Functional Scores')
          .legendNote(this.activeViz == 0 ? null : 'ClinVar data from time of publication')
          .ranges(ranges)
          .refresh()
    }
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
