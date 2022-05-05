<template>
  <DefaultLayout>
    <div v-if="item" class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.title || 'Untitled experiment'}}</div>
          <div v-if="!item.publishedDate" class="mave-screen-title-controls">
            <Button class="p-button-sm" @click="editItem">Edit</Button>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mave-scoreset-description">{{item.shortDescription}}</div>
        <div v-if="item.urn" class="mave-scoreset-urn">{{item.urn}}</div>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}}<span v-if="item.createdBy"> <a :href="`https://orcid.org/${item.createdBy}`" class="pi pi-external-link"></a></span></div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}}<span v-if="item.modifiedBy"> <a :href="`https://orcid.org/${item.modifiedBy}`" class="pi pi-external-link"></a></span></div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publishedDate)}}</div>
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
            <a v-for="(keyword, i) of item.keywords" :key="i" :href="`https://www.mavedb.org/search/?keywords=${keyword.text}`"><Chip :label="keyword.text" /></a>
          </div>
        </div>
        <div v-if="item.target">
          <div class="mave-scoreset-section-title">Target</div>
          <div v-if="item.target.name">Name: {{item.target.name}}</div>
          <div v-if="item.target.type">Type: {{item.target.type}}</div>
          <div v-if="get(item, 'target.referenceMaps.genome.organismName')">Organism: {{item.target.referenceMaps.genome.organismName}}</div>
          <div v-if="get(item, 'target.referenceMaps.genome.shortName')">Reference genome: {{item.target.referenceMaps.genome.shortName}}</div>
          <div v-if="get(item, 'target.referenceMaps.genome.assemblyIdentifier.identifier')">Reference assembly: {{item.target.referenceMaps.genome.assemblyIdentifier.identifier}}</div>
          <div v-if="get(item, 'target.referenceSequence.sequence')">Reference sequence: {{item.target.referenceSequence.sequence}}</div>
          <div v-if="get(item, 'target.uniprot.identifier')">UniProt: {{item.target.uniprot.identifier}}</div>
          <div v-if="get(item, 'target.refseq.identifier')">RefSeq: {{item.target.refseq.identifier}}<span v-if="get(item, 'target.refseq.offset')"> with offset {{item.target.refseq.offset}}</span></div>
          <div v-if="get(item, 'target.ensembl.identifier')">Ensembl: {{item.target.ensembl.identifier}}</div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script>

import _ from 'lodash'
import marked from 'marked'
import Chip from 'primevue/chip'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ExperimentView',
  components: {Chip, DefaultLayout},

  setup: () => {
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'})
    }
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  data: () => ({}),

  watch: {
    itemId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {
    editItem: function() {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}/edit`})
      }
    },
    markdownToHtml: function(markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    }
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

</style>