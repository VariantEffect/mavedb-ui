<template>
  <DefaultLayout>
    <div v-if="item" class="mave-score-set">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{ item.title || 'Untitled score set' }}</div>
          <div v-if="oidc.isAuthenticated">
            <div v-if="!item.publishedDate" class="mave-screen-title-controls">
              <Button class="p-button-sm" @click="editItem">Edit</Button>
              <Button class="p-button-sm" @click="publishItem">Publish</Button>
              <Button class="p-button-sm p-button-danger" @click="deleteItem">Delete</Button>
            </div>
            <div v-if="item.publishedDate" class="mave-screen-title-controls">
              <Button class="p-button-sm" @click="editItem">Edit</Button>
            </div>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mave-score-set-description">{{ item.shortDescription }}</div>
        <div v-if="item.urn" class="mave-score-set-urn">
          <h3>{{ item.urn }}</h3>
        </div>
      </div>
      <div v-if="showHeatmap && scores" class="mave-score-set-heatmap-pane">
        <ScoreSetHeatmap :scoreSet="item" :scores="scores" />
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{ formatDate(item.creationDate) }} <span v-if="item.createdBy">
            <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                alt="ORCIDiD">{{ item.createdBy.firstName }} {{ item.createdBy.lastName }}</a></span>
        </div>
        <div v-if="item.modificationDate">Last updated {{ formatDate(item.modificationDate) }} <span v-if="item.modifiedBy">
            <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                alt="ORCIDiD">{{ item.modifiedBy.firstName }} {{ item.modifiedBy.lastName }}</a></span>
        </div>
        <div v-if="item.publishedDate">Published {{ formatDate(item.publishedDate) }}</div>
        <div v-if="item.license">
          License:
          <a v-if="item.license.link" :href="item.license.link">{{ item.license.longName || item.license.shortName }}</a>
          <span v-else>{{ item.license.longName || item.license.shortName }}</span>
        </div>
        <div v-if="item.dataUsagePolicy">Data usage policy: {{ item.dataUsagePolicy }}</div>
        <div v-if="item.experiment">Member of <router-link
            :to="{ name: 'experiment', params: { urn: item.experiment.urn } }">{{ item.experiment.urn }}</router-link></div>
        <div v-if="item.supersedingScoreSet">Current version <router-link
            :to="{ name: 'scoreSet', params: { urn: item.supersedingScoreSet.urn } }">{{ item.supersedingScoreSet.urn }}</router-link>
        </div>
        <div v-else>Current version <router-link
            :to="{ name: 'scoreSet', params: { urn: item.urn } }">{{ item.urn }}</router-link></div>
        <div v-if="sortedMetaAnalyzesScoreSetUrns.length > 0">
          Meta-analyzes
          <template v-for="(urn, index) of sortedMetaAnalyzesScoreSetUrns" :key="urn">
            <template v-if="index > 0"> · </template>
            <EntityLink entityType="scoreSet" :urn="urn" />
          </template>
        </div>
        <div>Download files <Button class="p-button-outlined p-button-sm"
            @click="downloadFile('scores')">Scores</Button>&nbsp;
          <template v-if="countColumns.length != 0">
            <Button class="p-button-outlined p-button-sm" @click="downloadFile('counts')">Counts</Button>&nbsp;
          </template>
          <template v-if="isMetaDataEmpty != true">
            <Button class="p-button-outlined p-button-sm" @click="downloadMetadata">Metadata</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="downloadMappedVariants()">Mapped Variants</Button>
        </div>
        <div v-if="item.abstractText">
          <div class="mave-score-set-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-score-set-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-score-set-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-score-set-abstract"></div>
        </div>
        <div class="mave-score-set-section-title">Primary References</div>
        <div v-if="item.primaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.primaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type:square;">
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication: <a
                  :href="`https://www.mavedb.org/#/publication-identifiers/${publication.dbName}/${publication.identifier}`">{{
                    publication.identifier }}</a>
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated primary publications.</div>
        <div class="mave-score-set-section-title">Secondary References</div>
        <div v-if="item.secondaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.secondaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type:square;">
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication: <a
                  :href="`https://www.mavedb.org/#/publication-identifiers/${publication.dbName}/${publication.identifier}`">{{
                    publication.identifier }}</a>
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated secondary publications.</div>
        <div class="mave-score-set-section-title">Data Usage Policy</div>
        <div v-if="item.dataUsagePolicy">
          <div v-html="markdownToHtml(item.dataUsagePolicy)" class="mave-score-set-abstract"></div>
        </div>
        <div v-else>Not specified</div>

        <div v-if="item.keywords && item.keywords.length > 0">
          <div class="mave-score-set-section-title">Keywords</div>
          <div class="mave-score-set-keywords">
            <a v-for="(keyword, i) in item.keywords" :key="i"
              :href="`https://www.mavedb.org/search/?keywords=${keyword}`">
              <Chip :label="keyword" />
            </a>
          </div>
        </div>
        <div v-if="item.targetGene">
          <div class="mave-score-set-section-title">Targets</div>
          <div v-for="targetGene of item.targetGene" :key="targetGene">
            <div v-if="targetGene.name"><strong>Name:</strong> {{ targetGene.name }}</div>
            <div v-if="targetGene.category"><strong>Type:</strong> {{ targetGene.category }}</div>

            <div v-if="targetGene.targetAccession?.accession" style="word-break: break-word">
              <div v-if="targetGene.targetAccession?.assembly"><strong>Assembly:</strong>
                {{ targetGene.targetAccession.assembly }}</div>
              <div v-if="targetGene.targetAccession?.gene"><strong>HGNC:</strong> {{ targetGene.targetAccession.gene }}
              </div>
              <strong>Accession Number: </strong>
              {{ targetGene.targetAccession.accession }}
            </div>

            <div v-if="targetGene.targetSequence?.sequence" style="word-break: break-word">
              <div v-if="targetGene.targetSequence.reference?.organismName"><strong>Organism:</strong>
                {{ targetGene.targetSequence.reference.organismName }}</div>
              <div v-if="targetGene.targetSequence.reference?.shortName"><strong>Reference genome:</strong>
                {{ targetGene.targetSequence.reference.shortName }}</div>
              <div v-if="targetGene.targetSequence.reference?.id"><strong>Genome ID:</strong>
                {{ targetGene.targetSequence.reference.id }}</div>
              <div v-if="targetGene.id"><strong>Target ID:</strong> {{ targetGene.id }}</div>
              <strong>Reference sequence: </strong>
              <template v-if="targetGene.targetSequence.sequence.length >= 500">
                <template v-if="readMore == true">{{ targetGene.targetSequence.sequence.substring(0, 500) + "...." }}
                </template>
                <template v-if="readMore == false">{{ targetGene.targetSequence.sequence }}</template>
                <Button @click="showMore" v-if="readMore == true" class="p-button-text p-button-sm p-button-info">Show
                  more</Button>
                <Button @click="showLess" v-if="readMore == false" class="p-button-text p-button-sm p-button-info">Show
                  less</Button>
              </template><template v-else>{{ targetGene.targetSequence.sequence }}</template>
            </div>
            <!--One for loop can't handle the order so separating them into three parts.-->
            <div v-if="targetGene.externalIdentifiers?.[0]?.identifier">
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'UniProt'"><strong>UniProt:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'RefSeq'"><strong>RefSeq:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'Ensembl'"><strong>Ensembl:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
            </div>
            <br>
          </div>
        </div>

        <div class="mave-score-set-section-title">External identifier</div>
        <strong>DOI: </strong>
        <div v-if="item.doiIdentifiers.length != 0">
          <ul style="list-style-type:square">
            <li v-for="(doi, i) of item.doiIdentifiers" :key="i"><a :href="`${doi.url}`"
                target="blank">{{ doi.identifier }}</a></li>
          </ul>
        </div><template v-else>No associated DOIs<br /></template>

        <div class="mave-score-set-section-title">Variants</div>
        <div v-if="item.numVariants > 10">Below is a sample of the first 10 variants.
          Please download the file on the top page if you want to read the whole variants list.</div>
        <br />
        <TabView style="height:585px">
          <TabPanel header="Scores">
            <!--Default table-layout is fixed meaning the cell widths do not depend on their content.
            If you require cells to scale based on their contents set autoLayout property to true.
            Note that Scrollable and/or Resizable tables do not support auto layout due to technical limitations.
            Scrollable, column can be frozen but columns and rows don't match so that add width;
            Autolayout, column can't be frozen but columns and rows can match
            We can keep the frozen codes first. Maybe we can figure the bug in the future-->
            <!---->
            <div style="overflow-y: scroll; overflow-x: scroll; height:600px;">
              <DataTable :value="scoresTable" :showGridlines="true" :stripedRows="true">
                <Column v-for="column of scoreColumns.slice(0, 3)" :field="column" :header="column" :key="column"
                  style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                  <!--:frozen="columnIsAllNa(scoresTable, column)"-->
                  <template #body="scoresTable">{{ scoresTable.data[column] }}</template>
                </Column>
                <Column v-for="column of scoreColumns.slice(3, scoreColumns.length)" :field="column" :header="column"
                  :key="column" style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                  <template #body="scoresTable">{{ convertToThreeDecimal(scoresTable.data[column]) }}</template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
          <TabPanel header="Counts">
            <div style="overflow-y: scroll; overflow-x: scroll; height:600px;">
              <DataTable :value="countsTable" :showGridlines="true" :stripedRows="true">
                <template v-if="countColumns.length == 0">No count data available.</template>
                <template v-else>
                  <Column v-for="column of countColumns.slice(0, 3)" :field="column" :header="column" :key="column"
                    style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                    <!--:frozen="columnIsAllNa(countsTable, column)" bodyStyle="text-align:left"-->
                    <template #body="countsTable">{{ countsTable.data[column] }}</template>
                    <!--:style="{overflow: 'hidden'}"-->
                  </Column>
                  <Column v-for="column of countColumns.slice(3, countColumns.length)" :field="column" :header="column"
                    :key="column" style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                    <template #body="countsTable">{{ convertToThreeDecimal(countsTable.data[column]) }}</template>
                  </Column>
                </template>
              </DataTable>
            </div>
            <!--<table>
              <tr>
                <th v-for="column in countColumns" :key="column">{{column}}</th>
              </tr>
              <tr v-for="row in countsTable" :key="row">
                <td v-for="column in countColumns" :key="column">{{row[column]}}</td>
              </tr>
            </table>-->
          </TabPanel>
        </TabView>
      </div>
    </div>
    <div v-else>
      <h1>Page Not Found</h1>
      The requested score set does not exist.
    </div>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import marked from 'marked'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'

import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'
import EntityLink from '@/components/common/EntityLink'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import { oidc } from '@/lib/auth'
import { parseScores } from '@/lib/scores'

export default {
  name: 'ScoreSetView',
  components: { Button, Chip, DefaultLayout, EntityLink, ScoreSetHeatmap, TabView, TabPanel, DataTable, Column },
  computed: {
    isMetaDataEmpty: function () {
      //If extraMetadata is empty, return value will be true.
      return Object.keys(this.item.extraMetadata).length === 0
    },
    oidc: function () {
      return oidc
    },
    scoreColumns: function () {
      const fixedColumns = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']
      return [...fixedColumns, ...this.item?.datasetColumns?.scoreColumns || []]
    },
    countColumns: function () {
      const fixedColumns = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']
      const showCountColumns = !_.isEmpty(this.item?.datasetColumns?.countColumns)
      return showCountColumns ? [...fixedColumns, ...this.item?.datasetColumns?.countColumns || []] : []
    },
    sortedMetaAnalyzesScoreSetUrns: function () {
      return _.sortBy(this.item?.metaAnalyzesScoreSetUrns || [])
    }
  },
  setup: () => {
    const scoresRemoteData = useRemoteData()
    return {
      ...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      scoresData: scoresRemoteData.data,
      scoresDataStatus: scoresRemoteData.dataStatus,
      setScoresDataUrl: scoresRemoteData.setDataUrl,
      ensureScoresDataLoaded: scoresRemoteData.ensureDataLoaded
    }
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  data: () => ({
    scores: null,
    scoresTable: [],
    countsTable: [],
    readMore: true
  }),

  watch: {
    itemId: {
      handler: function (newValue, oldValue) {
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
    item: {
      handler: function () {
        this.loadTableScores()
        this.loadTableCounts()
      }
    },
    scoresData: {
      handler: function (newValue) {
        this.scores = newValue ? Object.freeze(parseScores(newValue)) : null
      }
    }
  },

  methods: {
    editItem: function () {
      if (this.item) {
        this.$router.replace({ path: `/score-sets/${this.item.urn}/edit` })
      }
    },
    deleteItem: async function () {
      let response = null
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (this.item) {
            try {
              response = await axios.delete(`${config.apiBaseUrl}/score-sets/${this.item.urn}`, this.item)
            } catch (e) {
              response = e.response || { status: 500 }
            }

            if (response.status == 200) {
              // display toast message here
              //const deletedItem = response.data
              console.log('Deleted item')
              this.$router.replace({ path: `/dashboard` })
              this.$toast.add({ severity: 'success', summary: 'Your score set was successfully deleted.', life: 3000 })
            } else if (response.data && response.data.detail) {
              const formValidationErrors = {}
              for (const error of response.data.detail) {
                let path = error.loc
                if (path[0] == 'body') {
                  path = path.slice(1)
                }
                path = path.join('.')
                formValidationErrors[path] = error.msg
              }
            }
          }
        },
        reject: () => {
          //callback to execute when user rejects the action
          //do nothing
        }
      });
    },
    markdownToHtml: function (markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    publishItem: async function () {
      let response = null
      try {
        if (this.item) {
          response = await axios.post(`${config.apiBaseUrl}/score-sets/${this.item.urn}/publish`, this.item)
          // make sure scroesets cannot be published twice API, but also remove the button on UI side
        }
      } catch (e) {
        response = e.response || { status: 500 }
      }

      if (response.status == 200) {
        // display toast message here
        const publishedItem = response.data
        if (this.item) {
          console.log('Published item')
          this.$router.replace({ path: `/score-sets/${publishedItem.urn}` })
          this.$toast.add({ severity: 'success', summary: 'Your score set was successfully published.', life: 3000 })
        }
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        for (const error of response.data.detail) {
          let path = error.loc
          if (path[0] == 'body') {
            path = path.slice(1)
          }
          path = path.join('.')
          formValidationErrors[path] = error.msg
        }
      }
    },
    //Download scores or counts
    downloadFile: async function (download_type) {
      let response = null
      try {
        if (this.item && download_type == "counts") {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/counts`)
        } else if (this.item && download_type == "scores") {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/scores`)
        }
      } catch (e) {
        response = e.response || { status: 500 }
      }
      if (response.status == 200) {
        const file = response.data
        const anchor = document.createElement('a');
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        if (download_type == "counts") {
          anchor.download = this.item.urn + '_counts.csv';
        } else if (download_type == "scores") {
          anchor.download = this.item.urn + '_scores.csv';
        }
        anchor.click();
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        for (const error of response.data.detail) {
          let path = error.loc
          if (path[0] == 'body') {
            path = path.slice(1)
          }
          path = path.join('.')
          formValidationErrors[path] = error.msg
        }
      }
    },
    downloadMappedVariants: async function () {
      let response = null
      try {
        if (this.item) {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/mapped-variants`)
        }
      }
      catch (e) {
        response = e.response || { status: 500 }
      }
      if (response.status == 200) {
        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        //file default name
        anchor.download = this.item.urn + '_mapped_variants.json';
        anchor.click();
      } else {
        this.$toast.add({ severity: 'error', summary: 'No downloadable mapped variants text file', life: 3000 })
      }
    },
    downloadMetadata: async function () {
      //convert object to Json. extraMetadata is an object.
      var metadata = JSON.stringify(this.item.extraMetadata)
      const anchor = document.createElement('a');
      anchor.href = 'data:text/txt;charset=utf-8,' + encodeURIComponent(metadata);
      anchor.target = '_blank';
      //file default name
      anchor.download = this.item.urn + '_metadata.txt';
      anchor.click();
    },
    loadTableScores: async function () {
      if (this.item) {
        const response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/scores`)
        if (response.data) {
          if (this.item.numVariants <= 10) {
            this.scoresTable = parseScores(response.data)
          } else {
            this.scoresTable = parseScores(response.data).slice(0, 10)
          }
        }
      }
    },
    loadTableCounts: async function () {
      if (this.item) {
        console.log(this.item.targetGene)
        const response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/counts`)
        if (response.data) {
          if (this.item.numVariants <= 10) {
            this.countsTable = parseScores(response.data)
          } else {
            this.countsTable = parseScores(response.data).slice(0, 10)
          }
        }
      }
    },
    convertToThreeDecimal: function (value) {
      let numStr = String(value)
      let decimalNumber = 0
      if (numStr.includes('.')) {
        decimalNumber = numStr.split('.')[1].length;
      }
      if (decimalNumber < 4) {
        return value
      } else {
        return parseFloat(value).toFixed(3)
      }
    },
    // Check whether all columns values are NA.
    columnIsAllNa: function (tableData, column) {
      let sliceData = tableData.slice(0, 10)
      let frozen = true
      let count = 0
      for (let i = 0; i < sliceData.length; i++) {
        //NA is a string
        if (sliceData[i][column] == "NA") {
          count += 1
        }
      }
      if (count == 10) {
        frozen = false
      }
      return frozen
    },
    showMore: function () {
      this.readMore = false
      return this.readMore
    },
    showLess: function () {
      this.readMore = true
      return this.readMore
    },
  },
}

</script>

<style scoped>
/* General layout */

.mave-full-height {
  height: 100%;
}

.mave-scroll-vertical {
  overflow-y: auto;
}

.mave-1000px-col {
  position: relative;
  width: 1000px;
  margin: 0 auto;
  text-align: left;
  overflow-x: hide;
}

/* Score set */

.mave-score-set {
  padding: 20px;
}

.mave-score-set-heatmap-pane {
  margin: 10px 0;
}

/* Score set details */

.mave-score-set-section-title {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
}

.mave-score-set-description {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 0 10px 0;
}

.mave-score-set-urn {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
}

.mave-score-set-keywords .p-chip {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 5px;
}

/* Formatting in Markdown blocks */

.mave-score-set-abstract {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 20px;
}

.mave-score-set-abstract::v-deep code {
  color: #987cb8;
  font-size: 87.5%;
  word-wrap: break-word;
}
</style>
