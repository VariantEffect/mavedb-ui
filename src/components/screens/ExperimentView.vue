<template>
  <DefaultLayout>
    <div v-if="item" class="mave-scoreset">
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
        <h3><div v-if="item.urn" class="mave-scoreset-urn">{{item.urn}}</div></h3>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}} <span v-if="item.createdBy">
          <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.createdBy.firstName}} {{item.createdBy.lastName}}</a></span></div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}} <span v-if="item.modifiedBy">
          <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">{{item.modifiedBy.firstName}} {{item.modifiedBy.lastName}}</a></span></div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publishedDate)}}</div>
        <div v-if="item.experimentSetUrn">Member of <router-link :to="{name: 'experimentset', params: {urn: item.experimentSetUrn}}">{{item.experimentSetUrn}}</router-link></div>
        <div v-if="item.currentVersion">Current version {{item.currentVersion}}</div>

        <div class="mave-scoreset-section-title">Score Sets</div>
          <div v-if="this.associatedScoresets.length!=0">
            <ul>
              <li v-for="scoreset in associatedScoresets" :key="scoreset.id">
                <router-link :to="{name: 'scoreset', params: {urn: scoreset.urn}}">{{scoreset.urn}}</router-link>
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
        <div class="mave-scoreset-section-title">Primary References</div>
          <div v-if="item.primaryPublicationIdentifiers.length > 0">
            <div v-for="publication in item.primaryPublicationIdentifiers" :key="publication">
                <ul style="list-style-type:square;">
                  <li v-html="markdownToHtml(publication.referenceHtml)" ></li>Publication: <a :href="`${publication.url}`" target="_blank">{{publication.identifier}}</a>
                </ul>
            </div>
          </div>
          <div v-else>No associated primary publications.</div>
          <div class="mave-scoreset-section-title">Secondary References</div>
          <div v-if="item.publicationIdentifiers.length > 0">
            <div v-for="publication in item.publicationIdentifiers" :key="publication">
                <ul style="list-style-type:square;">
                  <li v-html="markdownToHtml(publication.referenceHtml)" ></li>Publication: <a :href="`${publication.url}`" target="_blank">{{publication.identifier}}</a>
                </ul>
            </div>
          </div>
          <div v-else>No associated secondary publications.</div>
        <div v-if="item.keywords && item.keywords.length > 0">
          <div class="mave-scoreset-section-title">Keywords</div>
          <div class="mave-scoreset-keywords">
            <Chip :label="keyword"/>
            <!--<a v-for="(keyword, i) of item.keywords" :key="i" :href="`https://www.mavedb.org/search/?keywords=${keyword}`"><Chip :label="keyword"/></a>-->
          </div>
        </div>

        <div v-if="this.associatedScoresets.length!=0">
          <div v-for="scoreset in this.associatedScoresets.slice(0,1)" :key="scoreset">
            <div class="mave-scoreset-section-title">Target</div>
            <div v-if="scoreset.targetGene.name"><strong>Name:</strong> {{scoreset.targetGene.name}}</div>
            <div v-if="scoreset.targetGene.category"><strong>Type:</strong> {{scoreset.targetGene.category}}</div>
            <div v-if="scoreset.targetGene.referenceMaps?.[0]?.genome?.organismName"><strong>Organism:</strong> {{scoreset.targetGene.referenceMaps[0].genome.organismName}}</div>
            <div v-if="scoreset.targetGene.referenceMaps?.[0]?.genome?.shortName"><strong>Reference genome:</strong> {{scoreset.targetGene.referenceMaps[0].genome.shortName}}</div>
            <!--TODO: Miss TaxID part-->
            <div v-if="scoreset.targetGene.wtSequence?.sequence" style="word-break: break-word"><strong>Reference sequence: </strong>
              <template v-if="scoreset.targetGene.wtSequence.sequence.length >= 500">
                <template v-if="readMore == true">{{scoreset.targetGene.wtSequence.sequence.substring(0, 500) + "...."}} </template>
                <template v-if="readMore == false">{{scoreset.targetGene.wtSequence.sequence}}</template>
                <Button @click="showMore" v-if="readMore == true" class="p-button-text p-button-sm p-button-info">Show more</Button>
                <Button @click="showLess" v-if="readMore == false" class="p-button-text p-button-sm p-button-info">Show less</Button>
              </template><template v-else>{{scoreset.targetGene.wtSequence.sequence}}</template>
            </div>
          </div>
        </div>

        <div class="mave-scoreset-section-title">External identifier</div>
        <strong>DOI: </strong>
        <div v-if="item.doiIdentifiers.length!=0">
          <ul style="list-style-type:square">
            <li v-for="(doi, i) of item.doiIdentifiers" :key="i"><a :href="`${doi.url}`" target="blank">{{doi.identifier}}</a></li>
          </ul>
        </div><template v-else>No associated DOIs<br/></template>
        <strong>Raw reads: </strong>
        <div v-if="item.rawReadIdentifiers.length!=0">
          <ul style="list-style-type:square">
            <li v-for="(read, i) of item.rawReadIdentifiers" :key="i"><a :href="`${read.url}`" target="blank">{{read.identifier}}</a></li>
          </ul>
        </div><template v-else>No associated raw reads<br/></template>
      </div>
    </div>
    <div v-else>
      <h1>Page Not Found</h1>
      The requested experiment does not exist.
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

  data: () => ({
    associatedScoresets: [],
    readMore: true
  }),

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
              this.$router.replace({path: `/dashboard`})
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
      let response = await axios.get(`${config.apiBaseUrl}/experiments/${this.itemId}/scoresets`)
      this.associatedScoresets = response.data
    },
    showMore: function(){
      this.readMore = false
      return this.readMore
    },
    showLess: function(){
      this.readMore = true
      return this.readMore
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

</style>
