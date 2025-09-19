<template>
  <TabMenu v-if="hasTabBar" v-model:active-index="activeViz" class="mave-histogram-viz-select" :model="vizOptions" />
  <div
    v-if="clinicalControlsEnabled && (!refreshedClinicalControls || !associatedClinicalControls)"
    style="font-size: x-small"
  >
    <ProgressSpinner style="height: 12px; width: 12px" />
    Loading clinical control options in the background. Additional histogram views will be available once loaded.
  </div>
  <div v-if="showControls" class="mave-histogram-controls">
    <div class="mave-histogram-control">
      <label for="mave-histogram-show-ranges-switch" class="mave-histogram-control-label">{{
        showRanges ? 'Hide Ranges:' : 'Show Ranges:'
      }}</label>
      <InputSwitch v-model="showRanges" class="ml-3" inputId="mave-histogram-show-ranges-switch" />
      <label for="mave-histogram-viz-select" class="mave-histogram-control-label"
        >Select a set of ranges to shade:
      </label>
      <Dropdown
        v-model="activeRangeKey"
        :disabled="!showRanges"
        :options="activeRangeOptions"
        option-label="label"
        input-id="mave-histogram-viz-select"
        style="align-items: center; height: 1.5rem"
      />
    </div>
    <div v-if="showClinicalControlOptions" class="mave-histogram-control">
      <label for="mave-histogram-db-select" class="mave-histogram-control-label">Clinical control database: </label>
      <Dropdown
        v-model="controlDb"
        :options="clinicalControlOptions"
        option-label="dbName"
        input-id="mave-histogram-db-select"
        style="align-items: center; height: 1.5rem"
        :disabled="!refreshedClinicalControls"
      />
      <label for="mave-histogram-version-select" class="mave-histogram-control-label">Clinical control version: </label>
      <Dropdown
        v-model="controlVersion"
        :options="controlDb?.availableVersions"
        input-id="mave-histogram-version-select"
        style="align-items: center; height: 1.5rem"
        :disabled="!refreshedClinicalControls"
      />
    </div>
    <div class="mave-histogram-control">
      <label for="mave-histogram-star-select" class="mave-histogram-control-label"
        >Minimum ClinVar review status 'gold stars':
      </label>
      <Rating
        v-model="customMinStarRating"
        :stars="4"
        style="display: inline"
        input-id="mave-histogram-star-select"
        :disabled="!refreshedClinicalControls"
      />
    </div>
    <div class="mave-histogram-control">
      <span class="mave-histogram-control-label">Include variants with classification: </span>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="classification of clinicalSignificanceClassificationOptions"
          :key="classification.name"
          class="flex gap-1 align-items-center"
        >
          <Checkbox
            v-model="customSelectedClinicalSignificanceClassifications"
            :name="scopedId('clinical-significance-inputs')"
            :value="classification.name"
            :disabled="!refreshedClinicalControls"
          />
          <label :for="scopedId('clinical-significance-inputs')">{{ classification.shortDescription }}</label>
        </div>
      </div>
    </div>
  </div>
  <div ref="histogramContainer" class="mave-histogram-container" />
  <!-- The child component will attempt to immediately emit the range which is active when it is created. Since Vue lifecycle events bubble up from child to parent, this causes this component to attempt
   to create the histogram before the component is mounted when it doesn't have access to `this.$refs`. As a workaround, only render this child component once the histogram is ready. -->
  <div v-if="showRanges && activeRange" class="mave-range-table-container">
    <Accordion collapse-icon="pi pi-minus" expand-icon="pi pi-plus">
      <AccordionTab header="Score Range Details" class="mave-range-table-tab">
        <RangeTable :score-ranges="activeRange" :score-ranges-name="activeRangeKey?.label" :sources="allSources" />
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import InputSwitch from 'primevue/inputswitch'
import ProgressSpinner from 'primevue/progressspinner'
import Rating from 'primevue/rating'
import TabMenu from 'primevue/tabmenu'
import {defineComponent, PropType} from 'vue'
import config from '@/config'
import axios from 'axios'

import RangeTable from '@/components/RangeTable.vue'
import useScopedId from '@/composables/scoped-id'
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
import type {
  ClinicalControl,
  ClinicalControlOption
} from '@/lib/clinical-controls'
import makeHistogram, {
  DEFAULT_SERIES_COLOR,
  Histogram,
  HistogramSerieOptions,
  HistogramDatum,
  HistogramBin
} from '@/lib/histogram'
import {prepareRangesForHistogram, ScoreRanges, ScoreSetRanges} from '@/lib/ranges'
import {variantNotNullOrNA} from '@/lib/mave-hgvs'

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

interface Variant {
  accession: string
  score?: number
  control?: ClinicalControlVariant
  hgvs_nt?: string
  hgvs_pro?: string
  hgvs_splice?: string
  post_mapped_hgvs_c?: string
  post_mapped_hgvs_p?: string
  hgvs_pro_inferred?: string
  mavedb_label?: string
}

interface ClinicalControlVariant {
  [DEFAULT_CLNSIG_FIELD]: string
  [DEFAULT_CLNREVSTAT_FIELD]: string
}

export default defineComponent({
  name: 'ScoreSetHistogram',

  components: {Accordion, AccordionTab, Checkbox, Dropdown, InputSwitch, Rating, TabMenu, RangeTable, ProgressSpinner},

  props: {
    coordinates: {
      type: String as PropType<'raw' | 'mapped'>,
      default: 'raw'
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
      type: Number as PropType<number>,
      default: 30
    },
    scoreSet: {
      type: Object,
      required: true
    },
    variants: {
      type: Array as PropType<Variant[]>,
      required: true
    }
  },

  emits: ['exportChart'],

  setup: useScopedId,

  data: function () {
    const scoreSetHasRanges = config.CLINICAL_FEATURES_ENABLED && this.scoreSet.scoreRanges != null

    return {
      config: config,

      activeViz: 0,
      showRanges: scoreSetHasRanges,
      activeRangeKey: null as {label: string; value: string} | null,

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
      customMinStarRating: DEFAULT_MIN_STAR_RATING,
      customSelectedClinicalSignificanceClassifications: DEFAULT_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
      histogram: null as Histogram | null
    }
  },

  computed: {
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

        case 'custom': {
          const series = [
            {
              classifier: (d: HistogramDatum) =>
                _.intersection(
                  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
                  this.selectedClinicalSignificanceClassifications
                ).includes(d.control?.[DEFAULT_CLNSIG_FIELD]) &&
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating,
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
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating,
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
                (CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] ?? -1) >= this.minStarRating,
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
                CLINVAR_REVIEW_STATUS_STARS[d.control?.[DEFAULT_CLNREVSTAT_FIELD]] >= this.minStarRating,
              options: {
                color: '#984ea3',
                title: conflictingClinicalSignificanceSeriesLabelForVersion(
                  this.controlVersion ? this.controlVersion : DEFAULT_CLINICAL_CONTROL_VERSION
                )
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
      const options = [{label: 'Overall Distribution', view: 'distribution'}]

      if (this.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Clinical View', view: 'clinical'})
      }

      // custom view should always come last
      if (this.someVariantsHaveClinicalSignificance) {
        options.push({label: 'Custom', view: 'custom'})
      }
      return options
    },

    rangesExist: function () {
      return this.scoreSet.scoreRanges != null && Object.keys(this.scoreSet.scoreRanges).length > 0
    },

    hasTabBar: function () {
      return this.config.CLINICAL_FEATURES_ENABLED && this.vizOptions.length > 1
    },

    showControls: function () {
      return this.activeViz == this.vizOptions.findIndex((item) => item.view === 'custom')
    },

    activeRanges: function (): ScoreSetRanges | null {
      const rangeObjects = Object.entries(this.scoreSet.scoreRanges || {})
        .filter(([k, v]) => typeof v === 'object' && !Array.isArray(v))
        .reduce((acc, [k, v]) => ({...acc, [k]: v}), {})

      if (Object.keys(rangeObjects).length === 0) {
        return null
      } else {
        return rangeObjects as ScoreSetRanges
      }
    },

    showClinicalControlOptions: function () {
      const hasMultipleDbs = this.clinicalControlOptions.length > 1
      const hasSingleDbWithMultipleVersions =
        this.clinicalControlOptions.length == 1 && this.clinicalControlOptions[0].availableVersions.length > 1

      return hasMultipleDbs || hasSingleDbWithMultipleVersions
    },

    activeRangeOptions: function () {
      if (!this.activeRanges) return []
      return Object.keys(this.activeRanges).map((key) => {
        const label = {
          investigatorProvided: 'Investigator-provided functional classes',
          pillarProject: 'Research Use Only: Zeiberg calibration'
        }[key] || `${this.titleCase(key)} ranges`
        return {
          label,
          value: key
        }
      })
    },

    activeRange: function () {
      if (!this.activeRangeKey?.value || !this.activeRanges) return null
      return this.activeRanges[this.activeRangeKey?.value]
    },

    histogramShaders: function () {
      const shaders: Record<string, any> = {null: null} // No shader

      if (!this.activeRanges) return shaders

      for (const [key, value] of Object.entries(this.activeRanges)) {
        shaders[key] = prepareRangesForHistogram(value as ScoreRanges)
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
            naToUndefined(variant.post_mapped_hgvs_p) ?? naToUndefined(variant.hgvs_pro_inferred)
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
                  '<span class="mave-histogram-tooltip-variant-color"' +
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
                  '<span class="mave-histogram-tooltip-variant-star mave-histogram-tooltip-variant-star-filled">★</span>'
                )
                .fill('<span class="mave-histogram-tooltip-variant-star">☆</span>', numStars)
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

          // Line 3: Score
          if (variant.score) {
            parts.push(`Score: ${variant.score.toPrecision(4)}`)
          }

          // Line 4: Blank line
          parts.push('')
        }

        if (bin) {
          // Line 5: Bin range
          parts.push(`Bin range: ${bin.x0} to ${bin.x1}`)

          // Line 6:
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
    activeRange: {
      handler: function () {
        this.renderOrRefreshHistogram()
      }
    },
    showRanges: {
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
    clinicalControlOptions: {
      handler: function () {
        if (!this.controlDb) {
          let defaultControlDb = this.clinicalControlOptions.find(
            (option) => option.dbName == DEFAULT_CLINICAL_CONTROL_DB
          )
          this.controlDb = defaultControlDb ? defaultControlDb : this.clinicalControlOptions[0]
        }
        if (!this.controlVersion) {
          let defaultControlVersion = this.controlDb?.availableVersions.find(
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
    }
  },

  mount: function () {
    this.renderOrRefreshHistogram()
  },

  mounted: async function () {
    this.renderOrRefreshHistogram()
    this.$emit('exportChart', this.exportChart)
    this.activeRangeKey = this.defaultRangeKey()
  },

  beforeUnmount: function () {
    if (this.histogram) {
      this.histogram.destroy()
      this.histogram = null
    }
  },

  methods: {
    exportChart() {
      saveChartAsFile(
        this.$refs.histogramContainer,
        `${this.scoreSet.urn}-scores-histogram`,
        'mave-histogram-container'
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
          this.activeViz == 0 || !this.refreshedClinicalControls
            ? null
            : `${this.controlDb?.dbName} data from version ${this.controlVersion}`
        )
        .shaders(this.histogramShaders)

      if (this.externalSelection) {
        this.histogram.selectDatum(this.externalSelection)
      } else {
        this.histogram.clearSelection()
      }

      // Only render clinical specific viz options if such features are enabled.
      if (this.config.CLINICAL_FEATURES_ENABLED && this.showRanges) {
        this.histogram.renderShader(this.activeRangeKey?.value)
      } else {
        this.histogram.renderShader(null)
      }

      this.histogram.refresh()
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
        } catch (error) {
          this.$toast.add({
            severity: 'warn',
            summary:
              'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.',
            detail: error.detail,
            life: 3000
          })
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
        } catch (error) {
          this.$toast.add({
            severity: 'warn',
            summary:
              'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.',
            detail: error.detail,
            life: 3000
          })
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

      if (!this.someVariantsHaveClinicalSignificance) {
        this.$toast.add({
          severity: 'warn',
          summary:
            'No clinical control variants are associated with variants belonging to this score set. Clinical features are disabled.'
        })
      }
    },

    defaultRangeKey: function () {
      if (this.activeRangeKey) {
        return this.activeRangeKey
      }

      const defaultInvestigatorProvidedIndex = this.activeRangeOptions.findIndex(
        (option) => option.value == 'investigatorProvided'
      )

      if (defaultInvestigatorProvidedIndex >= 0) {
        return this.activeRangeOptions[defaultInvestigatorProvidedIndex]
      } else if (this.activeRangeOptions.length > 0) {
        return this.activeRangeOptions[0]
      } else return null
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
.mave-histogram-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mave-histogram-control {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
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
  color: #fdb81e;
}
</style>
