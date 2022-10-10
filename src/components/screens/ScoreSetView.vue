<template>
  <DefaultLayout>
    <div v-if="item" class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.title || 'Untitled score set'}}</div>
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
        <div v-if="item.shortDescription" class="mave-scoreset-description">{{item.shortDescription}}</div>
        <div v-if="item.urn" class="mave-scoreset-urn">{{item.urn}}</div>
      </div>
      <div v-if="scores" class="mave-scoreset-heatmap-pane">
        <ScoreSetHeatmap :scoreSet="item" :scores="scores" />
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}} <span v-if="item.createdBy">
          <a :href="`https://orcid.org/${item.createdBy.orcid_id}`"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.createdBy.firstName}} {{item.createdBy.lastName}}</a></span>
        </div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}} <span v-if="item.modifiedBy"> 
          <a :href="`https://orcid.org/${item.modifiedBy.orcid_id}`"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.modifiedBy.firstName}} {{item.modifiedBy.lastName}}</a></span>
        </div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publisedhDate)}}</div>
        <div v-if="item.experiment">Member of <router-link :to="{name: 'experiment', params: {urn: item.experiment.urn}}">{{item.experiment.urn}}</router-link></div>
        <div v-if="item.currentVersion">Current version {{item.currentVersion}}</div>
        <div v-if="item.metaAnalysisSourceScoresets.length!=0">Meta-analyzes 
          <template v-for="(scoreset,index) in sortedMetaAnalysis" :key="scoreset">
            <router-link :to="{name: 'scoreset', params: {urn: scoreset.urn}}">{{scoreset.urn}}</router-link>
            <template v-if="index !== item.metaAnalysisSourceScoresets.length-1"> · </template>
          </template>
        </div>
        <div>Download files <Button class="p-button-outlined p-button-sm" @click="downloadFile('scores')">Scores</Button>&nbsp;
        <Button class="p-button-outlined p-button-sm" @click="downloadFile('counts')">Counts</Button>&nbsp;
        <Button class="p-button-outlined p-button-sm" @click="downloadMetadata">Metadata</Button>
        </div>
        <div v-if="item.abstractText">
          <div class="mave-scoreset-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-scoreset-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="uniqueReferences">
          <div class="mave-scoreset-section-title">References</div>
            <ul style="list-style-type:square">
              <div v-for="reference in uniqueReferences" :key="reference">
                <li v-html="markdownToHtml(reference)" ></li>
              </div>
            </ul>
        </div>
        <div class="mave-scoreset-section-title">Data Usage Policy</div>
          <div v-if="item.dataUsagePolicy">
            <div v-html="markdownToHtml(item.dataUsagePolicy)" class="mave-scoreset-abstract"></div>
          </div>
          <div v-else>Not specified</div>
        
        <div v-if="item.keywords && item.keywords.length > 0">
          <div class="mave-scoreset-section-title">Keywords</div>
          <div class="mave-scoreset-keywords">
            <a v-for="(keyword, i) of item.keywords" :key="i" :href="`https://www.mavedb.org/search/?keywords=${keyword}`"><Chip :label="keyword" /></a>
          </div>
        </div>
        <div v-if="item.targetGene">
          <div class="mave-scoreset-section-title">Target</div>
          <div v-if="item.targetGene.name">Name: {{item.targetGene.name}}</div>
          <div v-if="item.targetGene.category">Type: {{item.targetGene.category}}</div>
          <div v-if="item.targetGene.referenceMaps?.[0]?.genome?.organismName">Organism: {{item.targetGene.referenceMaps[0].genome.organismName}}</div>
          <div v-if="item.targetGene.referenceMaps?.[0]?.genome?.shortName">Reference genome: {{item.targetGene.referenceMaps[0].genome.shortName}}</div>
          <div v-if="item.targetGene.referenceMaps?.[0]?.genomeId">Genome ID: {{item.targetGene.referenceMaps[0].genomeId}}</div>
          <div v-if="item.targetGene.referenceMaps?.[0]?.targetId">Target ID: {{item.targetGene.referenceMaps[0].targetId}}</div>
          <div v-if="item.targetGene.wtSequence?.sequence" style="word-break: break-word">Reference sequence: {{item.targetGene.wtSequence.sequence}}</div>
          <div v-if="item.targetGene.uniprot?.identifier">UniProt: {{item.targetGene.uniprot.identifier}}</div>
          <div v-if="item.targetGene.refseq?.identifier">RefSeq: {{item.targetGene.refseq.identifier}}<span v-if="item.targetGene.refseq?.offset"> with offset {{item.targetGene.refseq.offset}}</span></div>
          <div v-if="item.targetGene.ensembl?.identifier">Ensembl: {{item.targetGene.ensembl.identifier}}</div>
        </div>

        <div class="mave-scoreset-section-title">DOI</div>
          <div v-if="item.doiIdentifiers.length!=0">
            <div v-html="markdownToHtml(item.doiIdentifiers[0].identifier)" class="mave-scoreset-abstract"></div>
          </div>
          <div v-else>No associated DOIs</div>
        <div class="mave-scoreset-section-title">PubMed</div>
          <div v-if="item.pubmedIdentifiers.length!=0">
            <div v-html="markdownToHtml(item.pubmedIdentifiers[0].identifier)" class="mave-scoreset-abstract"></div>
          </div>
          <div v-else>No associated PubMed</div>
        
        <div class="mave-scoreset-section-title">Variants</div>
        <div v-if="item.numVariants > 10">Below is a sample of the first 10 variants. 
            Please download the file on the top page if you want to read the whole variants list.</div>
        <br/>
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
              <DataTable :value="scoresTable" showGridlines="true" stripedRows="true">
                <Column v-for="column of scoreColumns.slice(0,3)" :field="column" :header="column" :key="column" 
                style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold" ><!--:frozen="columnIsAllNa(scoresTable, column)"-->
                <template #body="scoresTable" >{{scoresTable.data[column]}}</template>
              </Column>
              <Column v-for="column of scoreColumns.slice(3,-1)" :field="column" :header="column" :key="column" 
                style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                <template #body="scoresTable">{{convertToThreeDecimal(scoresTable.data[column])}}</template>
              </Column>
              </DataTable>
            </div>
          </TabPanel>
          <TabPanel header="Counts">
            <div style="overflow-y: scroll; overflow-x: scroll; height:600px;">
              <DataTable :value="countsTable" showGridlines="true" stripedRows="true">
                <Column v-for="column of countColumns.slice(0,3)" :field="column" :header="column" :key="column" 
                style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold"> <!--:frozen="columnIsAllNa(countsTable, column)" bodyStyle="text-align:left"-->
                  <template #body="countsTable">{{countsTable.data[column]}}</template> <!--:style="{overflow: 'hidden'}"-->
                </Column>
                <Column v-for="column of countColumns.slice(3,-1)" :field="column" :header="column" :key="column" 
                style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                  <template #body="countsTable">{{convertToThreeDecimal(countsTable.data[column])}}</template> 
                </Column>
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
  </DefaultLayout>
</template>

<script>

import _ from 'lodash'
import marked from 'marked'
import Button from 'primevue/button'
import Chip from 'primevue/chip'

import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import {parseScores} from '@/lib/scores'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'
import useFormatters from '@/composition/formatters'
import axios from 'axios'
//import Vue from "vue"
import {oidc} from '@/lib/auth'

import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

export default {
  name: 'ScoreSetView',
  components: {Button, Chip, DefaultLayout, ScoreSetHeatmap, TabView, TabPanel, DataTable, Column},
  computed: {
    oidc: function() {
      return oidc
      },
    scoreColumns: function() {
      const fixedColumns = ['hgvs_nt', 'hgvs_splice','hgvs_pro']
      return [...fixedColumns, ...this.item?.datasetColumns?.score_columns || []]
    },
    countColumns: function(){
      const fixedColumns = ['hgvs_nt', 'hgvs_splice','hgvs_pro']
      return [...fixedColumns, ...this.item?.datasetColumns?.count_columns || []]
    },
    sortedMetaAnalysis: function(){
      return _.orderBy(this.item.metaAnalysisSourceScoresets, 'urn')
    },
    uniqueReferences: function(){
      let references = []
      if(this.item.experiment.pubmedIdentifiers){
        for(let i of this.item.experiment.pubmedIdentifiers){
          references.push(i.referenceHtml)
        }
      }
      if(this.item.pubmedIdentifiers){
        for(let i of this.item.pubmedIdentifiers){
          references.push(i.referenceHtml)
        }
      }
      let uniqueReferences = [...new Set(references)]
      return uniqueReferences
    }
  },
  setup: () => {
    const scoresRemoteData = useRemoteData()
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'scoreset'}),
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
    countsTable: []
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
    item:{
      handler: function(){
        this.loadTableScores()
        this.loadTableCounts()
      }
    },
    scoresData: {
      handler: function(newValue) {
        this.scores = newValue ? Object.freeze(parseScores(newValue)) : null
      }
    }
  },

  methods: {
    editItem: function() {
      if (this.item) {
        this.$router.replace({path: `/scoresets/${this.item.urn}/edit`})
      }
    },
    deleteItem: async function() {
      let response = null
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (this.item) {
            try {
              response = await axios.delete(`${config.apiBaseUrl}/scoresets/${this.item.urn}`, this.item)
            } catch (e) {
              response = e.response || {status: 500}
            }

            if (response.status == 200) {
              // display toast message here
              //const deletedItem = response.data
              console.log('Deleted item')
              this.$router.replace({path: `/my-data`})
              this.$toast.add({severity:'success', summary: 'Your scoreset was successfully deleted.', life: 3000})
              
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
    markdownToHtml: function(markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    publishItem: async function() {
      let response = null 
      try {
        if (this.item) {
          response = await axios.post(`${config.apiBaseUrl}/scoresets/${this.item.urn}/publish`, this.item)
          // make sure scroesets cannot be published twice API, but also remove the button on UI side
        }
      } catch (e) {
        response = e.response || {status: 500}
      }

      if (response.status == 200) {
        // display toast message here
        const publishedItem = response.data
        if (this.item) {
          console.log('Published item')
          this.$router.replace({path: `/scoresets/${publishedItem.urn}`})
          this.$toast.add({severity:'success', summary: 'Your scoreset was successfully published.', life: 3000})
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
    downloadFile: async function(download_type){
      let response = null
      try{
        if (this.item && download_type=="counts"){
          response = await axios.get(`${config.apiBaseUrl}/scoresets/${this.item.urn}/counts`)
        }else if (this.item && download_type=="scores"){
          response = await axios.get(`${config.apiBaseUrl}/scoresets/${this.item.urn}/scores`)
        }
      }catch (e){
        response = e.response || {status: 500}
      }
      if (response.status == 200) {
        const file = response.data
        const anchor = document.createElement('a');
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        if (download_type=="counts"){
          anchor.download = this.item.urn + '_counts.csv';
        }else if(download_type=="scores"){
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
    downloadMetadata: async function(){
      //convert object to Json. extraMetadata is an object.
      var metadata = JSON.stringify(this.item.extraMetadata)
      const anchor = document.createElement('a');
      anchor.href = 'data:text/txt;charset=utf-8,' + encodeURIComponent(metadata);
      anchor.target = '_blank';
      //file default name
      anchor.download = this.item.urn + '_metadata.txt';
      anchor.click();
    },
    loadTableScores: async function(){
      if (this.item){
        const response = await axios.get(`${config.apiBaseUrl}/scoresets/${this.item.urn}/scores`)
        if (response.data) {
          if (this.item.numVariants <= 10){
            this.scoresTable = parseScores(response.data)
          }else{
            this.scoresTable = parseScores(response.data).slice(0, 10)
          }
        }
      }
    },
    loadTableCounts: async function(){
      if (this.item){
        const response = await axios.get(`${config.apiBaseUrl}/scoresets/${this.item.urn}/counts`)
        console.log(response)
        if (response.data) {
          if (this.item.numVariants <= 10){
            this.countsTable = parseScores(response.data)
          }else{
            this.countsTable = parseScores(response.data).slice(0, 10)
          }
        }
      }
    },
    convertToThreeDecimal: function(value){
      let numStr = String(value)
      let decimalNumber = 0
      if (numStr.includes('.')) {
        decimalNumber = numStr.split('.')[1].length;
      }
      if (decimalNumber < 4){
        return value
      }else{
        return parseFloat(value).toFixed(3)
      }
    },
    // Check whether all columns values are NA.
    columnIsAllNa: function(tableData, column){
      let sliceData = tableData.slice(0,10)
      let frozen = true
      let count = 0
      for(let i=0; i<sliceData.length; i++){
        //NA is a string
        if(sliceData[i][column]=="NA"){
          count+=1
        }
      }
      if(count==10){
        frozen = false
      }
      return frozen
    }
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

.mave-scoreset {
  padding: 20px;
}

.mave-scoreset-heatmap-pane {
  margin: 10px 0;
}

/* Score set details */

.mave-scoreset-section-title {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
}

.mave-scoreset-description {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 0 10px 0;
}

.mave-scoreset-urn {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
}

.mave-scoreset-keywords .p-chip {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 5px;
}

/* Formatting in Markdown blocks */

.mave-scoreset-abstract {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 20px;
}

.mave-scoreset-abstract::v-deep code {
  color: #987cb8;
  font-size: 87.5%;
  word-wrap: break-word;
}

</style>
