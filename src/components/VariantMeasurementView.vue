<template>
  <div class="grid" style="margin: 10px 0">
    <div v-if="variant" class="col-12">
      <Card>
        <template #title>
          <div class="variant-title-container">
            <div class="variant-title-name">Variant: {{ variantName }}</div>
            <div v-if="classification" :class="['variant-clinical-classifier', ...classifierCssClasses]">
              {{ startCase(classification) }}
            </div>
          </div>
        </template>
        <template #content>
          <table class="variant-info-table">
            <tbody>
              <tr v-if="clingenAlleleName">
                <td v-if="clingenAlleleName" colspan="5">
                  ClinGen community standard allele name: {{ clingenAlleleName }}
                </td>
              </tr>
              <tr>
                <td v-if="clingenAlleleId">
                  <span v-if="clingenAlleleId">ClinGen allele ID:</span>
                  <span v-else>&nbsp;</span>
                </td>
                <td>
                  <a
                    v-if="clingenAlleleId"
                    :href="`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${clingenAlleleId}`"
                    target="_blank"
                  >
                    {{ clingenAlleleId }}
                  </a>
                  <span v-else>&nbsp;</span>
                </td>
                <td style="width: 150px">&nbsp;</td>
                <td v-if="clinvarAlleleIds.length > 0">
                  <span v-if="clingenAlleleId">ClinVar allele {{ clinvarAlleleIds.length == 1 ? 'ID' : 'IDs' }}:</span>
                  <span v-else>&nbsp;</span>
                </td>
                <td>
                  <div v-if="clinvarAlleleIds.length > 0">
                    <div v-for="clinvarAlleleId in clinvarAlleleIds" :key="clinvarAlleleId">
                      <a :href="`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarAlleleId}`" target="_blank">
                        {{ clinvarAlleleId }}
                      </a>
                    </div>
                  </div>
                  <span v-else>&nbsp;</span>
                </td>
                <td v-if="clinvarAlleleIds.length == 0" colspan="2">&nbsp;</td>
              </tr>
              <tr>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <!--
                <td>Variant type:</td>
                <td style="background: yellow;">Single nucleotide variant</td>
                <td style="width: 150px;">&nbsp;</td>
                -->
                <td>&nbsp;</td>
                <td v-if="classification">
                  <span v-if="classification">Functional consequence:</span>
                  <span v-else>&nbsp;</span>
                </td>
                <td>
                  <span v-if="classification">{{ startCase(classification) }}</span>
                  <span v-else>&nbsp;</span>
                </td>
              </tr>
              <tr>
                <td rowspan="2">
                  <span v-if="(clingenAllele?.genomicAlleles || []).length > 0">Genomic location:</span>
                  <span v-else>&nbsp;</span>
                </td>
                <td rowspan="2">
                  <div v-if="(clingenAllele?.genomicAlleles || []).length > 0">
                    <div v-for="genomicAllele in clingenAllele?.genomicAlleles || []" :key="genomicAllele">
                      <template
                        v-if="
                          genomicAllele.chromosome &&
                          genomicAllele.coordinates?.[0]?.start &&
                          genomicAllele.referenceGenome
                        "
                      >
                        chr{{ genomicAllele.chromosome }}:{{ genomicAllele.coordinates?.[0]?.start }} ({{
                          genomicAllele.referenceGenome
                        }})
                      </template>
                    </div>
                  </div>
                  <span v-else>&nbsp;</span>
                </td>
                <td>&nbsp;</td>
                <td>Functional score:</td>
                <td>
                  <span v-if="variantScores?.score">{{ variantScores?.score?.toPrecision(4) }}</span>
                  <span v-else>&nbsp;</span>
                </td>
              </tr>
              <tr>
                <td>&nbsp;</td>
                <td>
                  <span v-if="variantScoreRange?.oddsPath">OddsPath:</span>
                  <span v-else>&nbsp;</span>
                </td>
                <td>
                  <span v-if="variantScoreRange?.oddsPath?.ratio">{{ variantScoreRange.oddsPath.ratio.toPrecision(5) }}</span>
                  <span v-if="variantScoreRange?.oddsPath?.evidence" :class="['mavedb-classification-badge', classificationBadgeColorClass, 'strong']">
                    {{ variantScoreRange.oddsPath.evidence }}
                  </span>
                  <span v-else>&nbsp;</span>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </Card>
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

import ScoreSetHistogram from '@/components/ScoreSetHistogram.vue'
import useFormatters from '@/composition/formatters'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import {parseScoresOrCounts, ScoresOrCountsRow} from '@/lib/scores'
import ProgressSpinner from 'primevue/progressspinner'

type Classification = 'Functionally normal' | 'Functionally abnormal' | 'Not specified'

export default defineComponent({
  name: 'VariantMeasurementView',
  components: {Card, ScoreSetHistogram, ProgressSpinner},

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

          return scoreRange.range &&
            scoreRange.range.length == 2 &&
            (scoreRange.range[0] === null || operatorTable[lowerOperator](scoreRange.range[0], score)) &&
            (scoreRange.range[1] === null || operatorTable[upperOperator](scoreRange.range[1], score))
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
  font-size: 30px;
  padding: 0.1em 0.5em;
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
  background-color: #1e40af /* #182fb0; */
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
</style>
