<template>
  <DefaultLayout>
    <div v-if="item" class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.title || 'Untitled score set'}}</div>
          <div v-if="!item.publishedDate" class="mave-screen-title-controls">
            <Button class="p-button-sm" @click="editItem">Edit</Button>
            <Button class="p-button-sm" @click="publishItem">Publish</Button>
            <Button class="p-delete-button" @click="deleteItem">Delete</Button>
          </div>
          <div v-else class="mave-screen-title-controls">
            <Button class="p-button-sm" @click="editItem">Edit</Button>
            <Button class="p-delete-button" @click="deleteItem">Delete</Button>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mave-scoreset-description">{{item.shortDescription}}</div>
        <div v-if="item.urn" class="mave-scoreset-urn">{{item.urn}}</div>
      </div>
      <div v-if="scores" class="mave-scoreset-heatmap-pane">
        <ScoreSetHeatmap :scoreSet="item" :scores="scores" />
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}}<span v-if="item.createdBy"> <a :href="`https://orcid.org/${item.createdBy}`" class="pi pi-external-link"></a></span></div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}}<span v-if="item.modifiedBy"> <a :href="`https://orcid.org/${item.modifiedBy}`" class="pi pi-external-link"></a></span></div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publisedhDate)}}</div>
        <div v-if="item.experiment">Member of <router-link :to="{name: 'experiment', params: {urn: item.experiment.urn}}">{{item.experiment.urn}}</router-link></div>
        <div v-if="item.currentVersion">Current version {{item.currentVersion}}</div>
        <div v-if="item.abstractText">
          <div class="mave-scoreset-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-scoreset-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="item.keywords && item.keywords.length > 0">
          <div class="mave-scoreset-section-title">Keywords</div>
          <div class="mave-scoreset-keywords">
            <a v-for="(keyword, i) of item.keywords" :key="i" :href="`https://www.mavedb.org/search/?keywords=${keyword}`"><Chip :label="keyword" /></a>
          </div>
        </div>
        <div v-if="item.targetGene">
          <div class="mave-scoreset-section-title">Target</div>
          <div v-if="item">Name: {{item}}</div>
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
import Vue from "vue";
import axios from 'axios'
export default {
  name: 'ScoreSetView',
  components: {Button, Chip, DefaultLayout, ScoreSetHeatmap},

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
    publishItem: async function() {
      if (this.item) {
        let response = await axios.post(`${config.apiBaseUrl}/scoresets/${this.item.urn}/publish`)
        if (response.status == 200) {
          console.log(this.item.urn)
          this.$toast.add({severity:'success', summary: 'The score set is published sucessfully.', life: 3000})

          //Something wrong here
          this.setItemId(this.item.urn)
          this.$router.replace({path: `/scoresets/${this.item.urn}`})
        }else{
          console.log("error")
          console.log(response.data)
        }
      }
    },
    deleteItem: function() {
      if (this.item) {
        Vue.delete(this.item);
        this.$router.replace({path: `/my-data`})
      }
    },
    markdownToHtml: function(markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    
  }
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

/* custom button */
.p-delete-button {
  font-size: 0.875rem;
  padding: 0.499625rem 0.65625rem;
  background-color: crimson;
}

.p-delete-button:enabled:hover {
  background-color: rgb(223, 73, 73);
}

</style>
