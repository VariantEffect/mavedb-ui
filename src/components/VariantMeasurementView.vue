<template>
  <div class="grid" style="margin: 10px 0">
    <div v-if="variant" class="col-12">
      <div class="col-12 mavedb-variant-and-assay-fact-sheet-container">
        <div class="mavedb-assay-facts-card">
          <div class="mavedb-assay-facts-card-header">
            <span class="mavedb-assay-facts-author">Variant: {{ variantName }}</span>
          </div>
          <div class="mavedb-assay-facts-section mavedb-assay-facts-bottom-separator">
            <div v-if="clingenAlleleName" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">ClinGen community standard allele name</div>
              <div class="mavedb-assay-facts-value">{{ clingenAlleleName }}</div>
            </div>
          </div>
          <div class="mavedb-assay-facts-section">
            <div v-if="clingenAlleleId" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">ClinGen allele ID</div>
              <div class="mavedb-assay-facts-value">
                <div>
                  <a
                    :href="`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${clingenAlleleId}`"
                    target="_blank"
                  >
                    {{ clingenAlleleId }}
                  </a>
                </div>
              </div>
            </div>
            <div v-if="clinvarAlleleIds.length > 0" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">
                ClinVar allele {{ clinvarAlleleIds.length == 1 ? 'ID' : 'IDs' }}
              </div>
              <div class="mavedb-assay-facts-value">
                <div v-for="clinvarAlleleId in clinvarAlleleIds" :key="clinvarAlleleId">
                  <a :href="`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarAlleleId}`" target="_blank">
                    {{ clinvarAlleleId }}
                  </a>
                </div>
              </div>
            </div>
            <div v-if="classification" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">Functional consequence</div>
              <div class="mavedb-assay-facts-value">
                <div :class="['mavedb-classification-badge', ...classifierCssClasses]">
                  {{ startCase(classification) }}
                </div>
              </div>
            </div>
            <div v-if="(clingenAllele?.genomicAlleles || []).length > 0" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">Genomic location</div>
              <div class="mavedb-assay-facts-value">
                <div v-for="genomicAllele in clingenAllele?.genomicAlleles || []" :key="genomicAllele">
                  <template
                    v-if="
                      genomicAllele.chromosome && genomicAllele.coordinates?.[0]?.start && genomicAllele.referenceGenome
                    "
                  >
                    chr{{ genomicAllele.chromosome }}:{{ genomicAllele.coordinates?.[0]?.start }} ({{
                      genomicAllele.referenceGenome
                    }})
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div class="mavedb-assay-facts-section-title">Classification</div>
          <div class="mavedb-assay-facts-section">
            <div v-if="variantScores?.scores?.score" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">Functional score</div>
              <div class="mavedb-assay-facts-value">
                {{
                  variantScores?.scores?.score && variantScores.scores.score != 'NA'
                    ? variantScores.scores.score.toPrecision(4)
                    : 'N/A'
                }}
              </div>
            </div>
            <div v-if="formattedEvidenceCode" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">ACMG code</div>
              <div class="mavedb-assay-facts-value">
                <span :class="['mavedb-classification-badge', ...evidenceCodeCssClass]">
                  {{ formattedEvidenceCode }}
                </span>
              </div>
            </div>
            <div v-if="variantScoreRange?.oddspathsRatio" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">OddsPaths ratio</div>
              <div class="mavedb-assay-facts-value">
                {{ variantScoreRange.oddspathsRatio }}
              </div>
            </div>
          </div>
        </div>
        <AssayFactSheet v-if="variant?.scoreSet" :score-set="variant.scoreSet" />
      </div>
    </div>
    <div v-if="variant?.scoreSet" class="col-12">
      <Card>
        <template #title>
          Score set:
          <router-link :to="{name: 'scoreSet', params: {urn: variant.scoreSet.urn}, query: {variant: variant.urn}}">
            {{ variant.scoreSet.title }}
          </router-link>
        </template>
        <template #content>
          <div v-if="scores" class="mave-score-set-histogram-pane">
            <ScoreSetHistogram
              ref="histogram"
              :external-selection="variantScores"
              :lock-selection="true"
              :score-set="variant.scoreSet"
              :selected-calibration="selectedCalibration"
              :variants="scores"
              @calibration-changed="updateCalibration"
              @selection-changed="onHistogramSelectionChanged"
            />
          </div>
          <div v-else>
            <ProgressSpinner class="mave-histogram-loading" />
          </div>
          <div v-if="selectedCalibrationObject">
            <CalibrationTable :score-calibration="selectedCalibrationObject" />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script lang="ts">
import axios from 'axios'
import Card from 'primevue/card'
import {useRestResource} from 'rest-client-vue'
import {defineComponent, watch} from 'vue'
import {useHead} from '@unhead/vue'

import AssayFactSheet from '@/components/AssayFactSheet.vue'
import ScoreSetHistogram from '@/components/ScoreSetHistogram.vue'
import useFormatters from '@/composition/formatters'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import {parseScoresOrCounts, ScoresOrCountsRow} from '@/lib/scores'
import ProgressSpinner from 'primevue/progressspinner'
import {functionalClassificationContainsVariant} from '@/lib/calibrations'
import CalibrationTable from './CalibrationTable.vue'
import {components} from '@/schema/openapi'

type Classification = 'Functionally normal' | 'Functionally abnormal' | 'Not specified'

export default defineComponent({
  name: 'VariantMeasurementView',
  components: {AssayFactSheet, CalibrationTable, Card, ScoreSetHistogram, ProgressSpinner},

  props: {
    variantUrn: {
      type: String,
      required: true
    }
  },

  setup: (props) => {
    const head = useHead()
    const {data: scoresData, setDataUrl: setScoresDataUrl, ensureDataLoaded: ensureScoresDataLoaded} = useRemoteData()

    const {
      resource: variant,
      setEnabled: setVariantEnabled,
      setResourceId: setVariantId
    } = useRestResource({
      resourceType: {
        collectionName: 'variants',
        primaryKey: 'urn'
      },
      enabled: props.variantUrn != null,
      options: {
        resourceId: props.variantUrn ? encodeURIComponent(props.variantUrn) : undefined
      }
    })

    watch(
      () => props.variantUrn,
      (newValue, oldValue) => {
        if (newValue != oldValue) {
          setVariantId(encodeURIComponent(newValue))
          setVariantEnabled(newValue != null)
        }
      }
    )

    return {
      head,
      ...useFormatters(),

      config: config,
      variant,

      scoresData,
      setScoresDataUrl,
      ensureScoresDataLoaded
    }
  },

  data: () => ({
    clingenAllele: null as any,
    scores: null as readonly ScoresOrCountsRow[] | null,
    selectedCalibration: null as string | null
  }),

  computed: {
    classification: function (): Classification | undefined {
      const scoreRangeClassification = this.variantScoreRange?.classification
      switch (scoreRangeClassification) {
        case 'abnormal':
          return 'Functionally abnormal'
        case 'normal':
          return 'Functionally normal'
        case 'not_specified':
          return 'Not specified'
        default:
          return undefined
      }
    },
    classifierCssClasses: function () {
      switch (this.classification) {
        case 'Functionally abnormal':
          return ['variant-clinical-classifier-functionally-abnormal']
        case 'Functionally normal':
          return ['variant-clinical-classifier-functionally-normal']
        case 'Not specified':
          return ['variant-clinical-classifier-not-specified']
        default:
          return []
      }
    },
    formattedEvidenceCode() {
      if (!this.variantScoreRange?.acmgClassification?.evidenceStrength) {
        return ''
      }

      const criterion = this.variantScoreRange.acmgClassification.criterion
      const strength = this.variantScoreRange.acmgClassification.evidenceStrength.toUpperCase()
      return `${criterion}_${strength}`
    },
    evidenceCodeCssClass() {
      if (!this.variantScoreRange?.acmgClassification?.evidenceStrength) {
        return ''
      }

      const criterion = this.variantScoreRange.acmgClassification.criterion
      const strength = this.variantScoreRange.acmgClassification.evidenceStrength.toUpperCase()
      return [`mave-evidence-code-${criterion}_${strength}`]
    },
    clingenAlleleId: function () {
      return this.currentMappedVariant?.clingenAlleleId
    },
    clingenAlleleName: function () {
      return this.clingenAllele?.communityStandardTitle?.[0] || undefined
    },
    clinvarAlleleIds: function (): string[] {
      return (this.clingenAllele?.externalRecords?.ClinVarAlleles || []).map(
        (clinvarAllele: any) => clinvarAllele.alleleId
      )
    },
    currentMappedVariant: function () {
      return (this.variant?.mappedVariants || []).find((mappedVariant: any) => mappedVariant.current)
    },
    scoreSetUrn: function () {
      return this.variant?.scoreSet?.urn
    },
    variantName: function () {
      return (
        this.currentMappedVariant?.postMapped?.expressions?.[0]?.value ||
        this.variant?.hgvsNt ||
        this.variant?.hgvsPro ||
        this.variant?.hgvsSplice ||
        undefined
      )
    },
    variantScoreRange: function () {
      if (!this.selectedCalibrationObject?.functionalClassifications) {
        return null
      }

      const variantScore = this.variantScores?.scores?.score
      if (variantScore == null || variantScore === 'NA') {
        return null
      }

      const range = this.selectedCalibrationObject.functionalClassifications.find(
        (range: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
          functionalClassificationContainsVariant(range, variantScore)
      )

      return range
    },
    variantScores: function () {
      return (this.scores || []).find((s) => s.accession == this.variantUrn)
    },
    classificationBadgeColorClass: function () {
      if (this.variantScoreRange?.acmgClassification?.criterion?.startsWith('BS3')) {
        return 'mavedb-blue'
      }
      if (this.variantScoreRange?.acmgClassification?.criterion?.startsWith('PS3')) {
        return 'mavedb-red'
      }
      return null
    },
    selectedCalibrationObject: function (): components['schemas']['ScoreCalibration'] | null {
      if (!this.selectedCalibration || !this.variant?.scoreSet?.scoreCalibrations) {
        return null
      }

      return (
        this.variant.scoreSet.scoreCalibrations.find(
          (calibration: components['schemas']['ScoreCalibration']) => calibration.urn === this.selectedCalibration
        ) || null
      )
    }
  },

  watch: {
    clingenAlleleId: {
      handler: async function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.clingenAllele = await this.fetchClinGenAllele(newValue)
        }
      },
      immediate: true
    },
    scoresData: {
      handler: function (newValue) {
        this.scores = newValue ? Object.freeze(parseScoresOrCounts(newValue, true)) : []
      }
    },
    scoreSetUrn: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          const scoresUrl = newValue ? `${config.apiBaseUrl}/score-sets/${newValue}/variants/data` : null
          this.setScoresDataUrl(scoresUrl)
          this.ensureScoresDataLoaded()
        }
      },
      immediate: true
    },
    variantName: {
      handler: function (newValue) {
        this.head.patch({title: newValue ? `Variant ${newValue}` : 'Variant'})
      }
    }
  },

  methods: {
    fetchClinGenAllele: async function (clinGenAlleleId: string) {
      if (!clinGenAlleleId) {
        return undefined
      }
      try {
        const response = await axios.get(`https://reg.genome.network/allele/${clinGenAlleleId}`)
        return response.data
      } catch (error) {
        console.log(`Error while fetching ClinGen allele "${clinGenAlleleId}"`, error)
        return undefined
      }
    },
    updateCalibration: function (calibration: string | null) {
      this.selectedCalibration = calibration
    },
    onHistogramSelectionChanged: function (payload: any) {
      // Selection is locked; ignore changes to keep the variant focused.
      return
    }
  }
})
</script>

<style scoped>
.variant-title-name {
  font-weight: bold;
  font-size: 30px;
}

.variant-title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.variant-clinical-classifier-functionally-normal {
  background-color: #1e40af; /* #182fb0; */
}

.variant-clinical-classifier-functionally-abnormal {
  background-color: #991b1b; /* #b02418; */
}

.variant-clinical-classifier-not-specified {
  background-color: #919191;
}

table.variant-into-table {
  width: 100%;
  border-collapse: collapse;
}

table.variant-info-table td {
  padding: 0.2em 0.5em 0.2em 50px;
  vertical-align: top;
}

table.variant-info-table td:first-child {
  padding-left: 0;
}

.mave-histogram-loading {
  position: relative;
  top: 50%;
  left: 50%;
}

.mavedb-variant-and-assay-fact-sheet-container {
  display: flex;
  flex-direction: row;
}

/* Variant classification */

.mavedb-classification-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  font-weight: bold;
  padding: 0.25em 0.5em;
  font-size: 1.1em;
  display: inline-block;
}

.mavedb-classification-badge.mavedb-blue {
  background: #1e40af;
  color: white;
}

.mavedb-classification-badge.mavedb-red {
  background: #991b1b;
  color: white;
}

/* Evidence Strengths */

.mave-evidence-code-PS3_VERY_STRONG {
  background-color: #943744;
  font-weight: bold;
}

.mave-evidence-code-PS3_STRONG {
  background-color: #b85c6b;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE_PLUS {
  background-color: #ca7682;
  font-weight: bold;
}

.mave-evidence-code-PS3_MODERATE {
  background-color: #d68f99;
  font-weight: bold;
}

.mave-evidence-code-PS3_SUPPORTING {
  background-color: #e6b1b8;
  font-weight: bold;
}

.mave-evidence-code-BS3_SUPPORTING {
  background-color: #e4f1f6;
  font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE {
  background-color: #d0e8f0;
  font-weight: bold;
}

.mave-evidence-code-BS3_MODERATE_PLUS {
  background-color: #99c8dc;
  font-weight: bold;
}

.mave-evidence-code-BS3_STRONG {
  background-color: #7ab5d1;
  font-weight: bold;
}

.mave-evidence-code-BS3_VERY_STRONG {
  background-color: #4b91a6;
  font-weight: bold;
}

.mave-evidence-code-INDETERMINATE {
  background-color: #e0e0e0;
  font-weight: bold;
}

.mavedb-assay-facts-card {
  width: 580px; /* fixed size */
  border: 1px solid #000;
  padding: 12px;
  font-family: sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

.mavedb-assay-facts-card-header {
  font-weight: bold;
  border-bottom: 3px solid #000;
  padding-bottom: 4px;
  margin-bottom: 8px;
}

.mavedb-assay-facts-section {
  margin-bottom: 12px;
}

.mavedb-assay-facts-section-title {
  font-weight: bold;
  margin: 6px 0;
  border-top: 1px solid #3e3d3dbb;
  padding-top: 4px;
  font-size: 16px;
  font-weight: bold;
}

.mavedb-assay-facts-row {
  display: flex;
  justify-content: space-between;
  margin: 2px 0;
}

.mavedb-assay-facts-bottom-separator {
  border-bottom: 1px solid #3e3d3dbb;
}

/* Assay facts data */

.mavedb-assay-facts-label {
  font-weight: bold;
  flex: 1;
}

.mavedb-assay-facts-value {
  position: relative;
  flex: 1;
  text-align: left;
}

.mavedb-assay-facts-value.yellow {
  background: #fef3c7;
  padding: 2px 4px;
  border-radius: 4px;
}

/* Specific fields */

.mavedb-assay-facts-author {
  font-size: 21px;
}
</style>
