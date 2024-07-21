<template>
  <DefaultLayout>
    <div class="grid" style="margin: 10px 0;">
      <div class="col-12">
        <Card>
          <!-- TODO: allow for multiple target genes? and maybe need more v-ifs in here -->
          <template #title>{{ item.targetGenes[0].name }}</template>
          <template #content>
            <div>{{ item.urn }}</div>
            <div v-if="item && scores" class="mave-score-set-histogram-pane">
              <ScoreSetHistogram :scoreSet="item" :variants="scores" />
            </div>
            <table class="odds-path-table">
              <tr>
                <th>Odds Path Abnormal</th>
                <th>Odds Path Normal</th>
              </tr>
              <tr>
                <td>18.6</td>
                <td>0.0220</td>
              </tr>
              <tr>
                <td class="PS3_Strong">PS3_Strong</td>
                <td class="BS3_Strong">BS3_Strong</td>
              </tr>
            </table>
          </template>
        </Card>
      </div>
      <div class="col-12">
        <Card>
          <template #title>NM_007294.4(BRCA1):c.5237A>C (p.His1746Pro)</template>
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
              </tr>
              <tr>
                <td>Variant type:</td>
                <td>Single nucleotide variant</td>
              </tr>
              <tr>
                <td>Genomic location:</td>
                <td>17:43057092 (GRCh38)<br />17:41209109 (GRCh37)</td>
              </tr>
              <tr>
                <td>Functional consequence:</td>
                <td>Functionally Abnormal</td>
              </tr>
              <tr>
                <td>Functional score:</td>
                <td>2.57</td>
              </tr>
              <tr>
                <td>Variant error:</td>
                <td></td>
              </tr>
            </table>
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
    itemId: {
      type: String,
      default: 'urn:mavedb:00000097-0-1'
    }
  },
  data: () => ({
    scores: null
  }),
  watch: {
    itemId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)

          let scoresUrl = null
          if (this.itemType && this.itemType.restCollectionName && this.itemId) {
            scoresUrl = `${config.apiBaseUrl}/${this.itemType.restCollectionName}/${this.itemId}/scores`
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

.clinical-score-set-histogram-pane {
  margin: 10px 0;
}

/* .variant-name {
  font-family: Helvetica, Verdana, Arial, sans-serif;
} */

.variant-clinical-classifier-functionally-abnormal {
   background-color: red;
   color: white;
   font-weight: bold;
   font-size: 30px;
   margin: 0 auto 10px auto;
   padding: 0.5em;
   display: inline-block;
}

table.odds-path-table {
   border-collapse: collapse;
   margin: 10px auto 0 auto;
}
table.odds-path-table td, table.odds-path-table th {
   border: 1px solid gray;
   padding: 0.5em;
   text-align: center;
}
/* TODO: choose colors for other evidence levels */
table.odds-path-table td.PS3_Strong { 
   background-color: red; 
   color: white;
   font-weight: bold;
}
table.odds-path-table td.BS3_Strong { 
   background-color: blue; 
   color: white;
   font-weight: bold;
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

</style>
