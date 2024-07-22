<template>
  <DefaultLayout>
    <div class="grid" style="margin: 10px 0;">
      <div v-if="item" class="col-12">
        <Card>
          <template #title>Variant: NM_007294.4(BRCA1):c.5237A>C (p.His1746Pro)</template>
          <template #content>
            <div class="variant-clinical-classifier variant-clinical-classifier-functionally-abnormal">
              Functionally Abnormal
            </div>
            <table class="variant-info-table">
              <tr>
                <td>ClinVar allele ID:</td>
                <td>
                  <a href="https://www.ncbi.nlm.nih.gov/clinvar/variation/232790/?oq=%22NM_007294.4(BRCA1):c.5237A%3EC%20(p.His1746Pro)%22%5Bvarname%5D&m=NM_007294.4(BRCA1):c.5237A%3EC%20(p.His1746Pro)"
                  target="_blank">235927</a>
                </td>
                <td colspan="3">&nbsp;</td>
              </tr>
              <tr>
                <td>Variant type:</td>
                <td>Single nucleotide variant</td>
                <td style="width: 150px;">&nbsp;</td>
                <td>Functional consequence:</td>
                <td>Functionally Abnormal</td>
              </tr>
              <tr>
                <td>Genomic location:</td>
                <td>17:43057092 (GRCh38)<br />17:41209109 (GRCh37)</td>
                <td style="width: 150px;">&nbsp;</td>
                <td>Functional score:</td>
                <td>2.57</td>
              </tr>
            </table>
          </template>
        </Card>
      </div>
      <div v-if="item" class="col-12">
        <Card>
          <!-- TODO: allow for multiple target genes? and maybe need more v-ifs in here -->
          <template #title>BRCA1 Locus</template>
          <template #content>
            <div>Score set: <router-link :to="{name: 'scoreSet', params: {urn: scoreSetUrn}}">{{ item.title }}</router-link></div>
            <div v-if="item && scores" class="mave-score-set-histogram-pane">
              <ScoreSetHistogram :external-selection="variant" :score-set="item" :variants="scores" />
            </div>
            <table v-if="evidenceStrengths" class="mave-odds-path-table">
              <tr>
                <th>Odds Path Abnormal<sup>*</sup></th>
                <th>Odds Path Normal<sup>*</sup></th>
              </tr>
              <tr v-if="evidenceStrengths.oddsOfPathogenicity">
                <td>{{ evidenceStrengths.oddsOfPathogenicity.abnormal }}</td>
                <td>{{ evidenceStrengths.oddsOfPathogenicity.normal }}</td>
              </tr>
              <tr>
                <td :class="`mave-evidence-code-${evidenceStrengths.evidenceCodes.abnormal}`">{{ evidenceStrengths.evidenceCodes.abnormal }}</td>
                <td :class="`mave-evidence-code-${evidenceStrengths.evidenceCodes.normal}`">{{ evidenceStrengths.evidenceCodes.normal }}</td>
              </tr>
            </table>
            <div v-if="evidenceStrengths" style="font-style: italic; text-align: center; margin-bottom: 2em;"><sup>*</sup> Source: <a :href="evidenceStrengths.source" target="_blank">{{ evidenceStrengths.source }}</a></div>
          </template>
        </Card>
      </div>
    </div>
  </DefaultLayout>
</template>

<script>

import Card from 'primevue/card'

import DefaultLayout from '@/components/layout/DefaultLayout'
import ScoreSetHistogram from '@/components/ScoreSetHistogram'
import useItem from '@/composition/item'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import { parseScoresOrCounts } from '@/lib/scores'

export default {
  name: 'VariantScreen',
  components: {Card, DefaultLayout, ScoreSetHistogram},
  setup: () => {
    const scoresRemoteData = useRemoteData()

    return {
      config: config,

      //...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      scoresData: scoresRemoteData.data,
      scoresDataStatus: scoresRemoteData.dataStatus,
      setScoresDataUrl: scoresRemoteData.setDataUrl,
      ensureScoresDataLoaded: scoresRemoteData.ensureDataLoaded,
    }
  },
  props: {
    variantUrn: {
      type: String,
      default: 'urn:mavedb:00000097-0-1#1697'
    }
  },
  data: () => ({
    scores: null
  }),
  computed: {
    evidenceStrengths: function() {
      return {
        'urn:mavedb:00000050-a-1': {
          oddsOfPathogenicity: {
            abnormal: 24.9,
            normal: 0.043
          },
          evidenceCodes: {
            abnormal: 'PS3_Strong',
            normal: 'BS3_Strong'
          },
          source: 'https://pubmed.ncbi.nlm.nih.gov/36550560/'
        },
        'urn:mavedb:00000097-0-1': {
          oddsOfPathogenicity: {
            abnormal: 52.4,
            normal: 0.02
          },
          evidenceCodes: {
            abnormal: 'PS3_Strong',
            normal: 'BS3_Strong'
          },
          source: 'https://pubmed.ncbi.nlm.nih.gov/34793697/'
        }
      }[this.item.urn] || null
    },
    scoreSetUrn: function() {
      return this.variantUrn?.split('#')?.[0] || null
    },
    variant: function() {
      return this.scores.find((s) => s.accession == 'urn:mavedb:00000097-0-1#1697')
    }
  },
  watch: {
    scoreSetUrn: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)

          let scoresUrl = null
          if (this.itemType && this.itemType.restCollectionName && newValue) {
            scoresUrl = `${config.apiBaseUrl}/${this.itemType.restCollectionName}/${newValue}/scores`
          }
          this.setScoresDataUrl(scoresUrl)
          this.ensureScoresDataLoaded()
        }
      },
      immediate: true
    },
    scoresData: {
      handler: function(newValue) {
        this.scores = newValue ? Object.freeze(parseScoresOrCounts(newValue)) : null
      }
    }
  }
}

</script>

<style scoped>

.variant-clinical-classifier {
  color: white;
  font-weight: bold;
  font-size: 30px;
  margin: 0 auto 10px auto;
  padding: 0.1em 0.5em;
  display: inline-block;
}

.variant-clinical-classifier-functionally-abnormal {
  background-color: #b02418;
}

table.variant-into-table {
  border-collapse: collapse;
}

table.variant-info-table td {
  padding: 0.2em 0.5em 0.2em 50px;
  vertical-align: top;
}

table.variant-info-table td:first-child {
  padding-left: 0;
}


/* Evidence strength */

table.mave-odds-path-table {
   border-collapse: collapse;
   margin: 1em auto 0.5em auto;
}

table.mave-odds-path-table td,
table.mave-odds-path-table th {
   border: 1px solid gray;
   padding: 0.5em 1em;
   text-align: center;
}

table.mave-odds-path-table td.mave-evidence-code-PS3_Strong { 
   background-color: #b02418; 
   color: white;
   font-weight: bold;
}
table.mave-odds-path-table td.mave-evidence-code-BS3_Strong { 
   background-color: #385492; 
   color: white;
   font-weight: bold;
}

</style>
