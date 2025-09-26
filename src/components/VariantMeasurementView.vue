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
                <div :class="['variant-clinical-classifier', ...classifierCssClasses]">
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
            <div v-if="variantScores?.score" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">Functional score</div>
              <div class="mavedb-assay-facts-value">
                {{ variantScores?.score && variantScores?.score != 'NA' ? variantScores.score.toPrecision(4) : 'N/A' }}
              </div>
            </div>
            <div v-if="variantScoreRange?.oddsPath" class="mavedb-assay-facts-row">
              <div class="mavedb-assay-facts-label">OddsPath</div>
              <div class="mavedb-assay-facts-value">
                <span v-if="variantScoreRange?.oddsPath?.ratio">{{
                  variantScoreRange.oddsPath.ratio.toPrecision(5)
                }}</span>
                <span
                  v-if="variantScoreRange?.oddsPath?.evidence"
                  :class="['mavedb-classification-badge', classificationBadgeColorClass, 'strong']"
                >
                  {{ variantScoreRange.oddsPath.evidence }}
                </span>
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
              :score-set="variant.scoreSet"
              :variants="scores"
            />
          </div>
          <div v-else>
            <ProgressSpinner class="mave-histogram-loading" />
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

import AssayFactSheet from '@/components/AssayFactSheet.vue'
import ScoreSetHistogram from '@/components/ScoreSetHistogram.vue'
import useFormatters from '@/composition/formatters'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import {parseScoresOrCounts, ScoresOrCountsRow} from '@/lib/scores'
import ProgressSpinner from 'primevue/progressspinner'

type Classification = 'Functionally normal' | 'Functionally abnormal' | 'Not specified'

export default defineComponent({
  name: 'VariantMeasurementView',
  components: {AssayFactSheet, Card, ScoreSetHistogram, ProgressSpinner},

  props: {
    variantUrn: {
      type: String,
      required: true
    }
  },

  setup: (props) => {
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
    scores: null as readonly ScoresOrCountsRow[] | null
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
      const operatorTable = {
        '<': function (a: number, b: number) {
          return a < b
        },
        '<=': function (a: number, b: number) {
          return a <= b
        },
        '>': function (a: number, b: number) {
          return a > b
        },
        '>=': function (a: number, b: number) {
          return a >= b
        }
      }

      const score = this.variantScores?.score
      const scoreRanges = this.variant?.scoreSet?.scoreRanges?.investigatorProvided?.ranges
      if (scoreRanges && score != null) {
        return scoreRanges.find((scoreRange: any) => {
          const lowerOperator = scoreRange.inclusiveLowerBound ? '<=' : '<'
          const upperOperator = scoreRange.inclusiveUpperBound ? '>=' : '>'

          return (
            scoreRange.range &&
            scoreRange.range.length == 2 &&
            (scoreRange.range[0] === null || operatorTable[lowerOperator](scoreRange.range[0], score)) &&
            (scoreRange.range[1] === null || operatorTable[upperOperator](scoreRange.range[1], score))
          )
        })
      }
      return undefined
    },
    variantScores: function () {
      return (this.scores || []).find((s) => s.accession == this.variantUrn)
    },
    classificationBadgeColorClass: function () {
      if (this.variantScoreRange?.oddsPath?.evidence?.startsWith('BS3')) {
        return 'mavedb-blue'
      }
      if (this.variantScoreRange?.oddsPath?.evidence?.startsWith('PS3')) {
        return 'mavedb-red'
      }
      return null
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
        this.scores = newValue ? Object.freeze(parseScoresOrCounts(newValue)) : []
      }
    },
    scoreSetUrn: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          const scoresUrl = newValue ? `${config.apiBaseUrl}/score-sets/${newValue}/scores` : null
          this.setScoresDataUrl(scoresUrl)
          this.ensureScoresDataLoaded()
        }
      },
      immediate: true
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
    }
  }
})
</script>

<style scoped>
.variant-clinical-classifier {
  color: white;
  font-weight: bold;
  font-size: 120%;
  padding: 0.1em 0.1em;
  display: inline-block;
}

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
  margin-left: 1em;
}

.mavedb-classification-badge.mavedb-blue {
  background: #1e40af;
  color: white;
}

.mavedb-classification-badge.mavedb-red {
  background: #991b1b;
  color: white;
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
