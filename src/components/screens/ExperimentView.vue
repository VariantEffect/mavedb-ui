<template>
  <DefaultLayout>
    <div v-if="item" class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.title || 'Untitled experiment'}}</div>
          <div v-if="oidc.isAuthenticated">
            <div v-if="!item.publishedDate" class="mave-screen-title-controls">
              <Button class="p-button-sm" @click="editItem">Edit</Button>
              <Button class="p-button-sm p-button-danger" @click="deleteItem">Delete</Button>
            </div>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mave-scoreset-description">{{item.shortDescription}}</div>
        <div v-if="item.urn" class="mave-scoreset-urn">{{item.urn}}</div>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}} <span v-if="item.createdBy">
          <a :href="`https://orcid.org/${item.createdBy.orcid_id}`"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.createdBy.firstName}} {{item.createdBy.lastName}}</a></span></div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}} <span v-if="item.modifiedBy"> 
          <a :href="`https://orcid.org/${item.modifiedBy.orcid_id}`"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.modifiedBy.firstName}} {{item.modifiedBy.lastName}}</a></span></div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publishedDate)}}</div>
        <div v-if="item.experiment">Member of <router-link :to="{name: 'experiment', params: {urn: item.experiment.urn}}">{{item.experiment.urn}}</router-link></div>
        <div v-if="item.currentVersion">Current version {{item.currentVersion}}</div>

        <div class="mave-scoreset-section-title">Score Sets</div>
          <div v-if="this.associatedScoresets.length!=0">
            <ul>
              <li v-for="scoreset in associatedScoresets" :key="scoreset.id">
                <a :href="`https://www.mavedb.org/scoreset/${scoreset.urn}`">{{scoreset.urn}}</a>
              </li>
            </ul>
          </div>
          <div v-else>No associated score set</div>

        <div v-if="item.abstractText">
          <div class="mave-scoreset-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-scoreset-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-scoreset-abstract"></div>
        </div>
        <!--Temporary codes to show references. Will change it in the future.-->
        <div class="mave-scoreset-section-title">References</div>
          <div v-if="item.pubmedIdentifiers.length > 0">
            <ul style="list-style-type:square">
              <div v-for="pubmed in item.pubmedIdentifiers" :key="pubmed">
                <li v-html="markdownToHtml(pubmed.referenceHtml)" ></li>PMID: <a :href="`${pubmed.url}`" target="_blank">{{pubmed.identifier}}</a>
              </div>
            </ul>
        </div>
        <div v-else>No associated publication.</div>
        <div v-if="item.keywords && item.keywords.length > 0">
          <div class="mave-scoreset-section-title">Keywords</div>
          <div class="mave-scoreset-keywords">
            <a v-for="(keyword, i) of item.keywords" :key="i" :href="`https://www.mavedb.org/search/?keywords=${keyword}`"><Chip :label="keyword"/></a>
          </div>
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
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useFormatters from '@/composition/formatters'
import config from '@/config'
import axios from 'axios'
import {oidc} from '@/lib/auth'

export default {
  name: 'ExperimentView',
  components: {Button, Chip, DefaultLayout},

  setup: () => {
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'})
    }
  },

  computed: {
    oidc: function() {
      return oidc
      }
    },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  //data: () => ({}),
  data () {
    return {
      associatedScoresets: []
    }
  },

  created(){
    this.getAssociatedScoresets();
  },

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
    deleteItem: async function() {
      let response = null
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (this.item) {
            try {
              response = await axios.delete(`${config.apiBaseUrl}/experiments/${this.item.urn}`, this.item)
            } catch (e) {
              response = e.response || {status: 500}
            }

            if (response.status == 200) {
              // display toast message here
              console.log('Deleted item')
              this.$router.replace({path: `/my-data`})
              this.$toast.add({severity:'success', summary: 'Your experiment was successfully deleted.', life: 3000})
              
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
    getAssociatedScoresets: async function(){
      let response = await axios.get(`${config.apiBaseUrl}/experiments/${this.itemId}/associated_scoresets`)
      this.associatedScoresets = response.data
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
