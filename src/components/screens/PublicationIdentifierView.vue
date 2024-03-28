<template>
    <DefaultLayout>
      <div v-if="itemStatus=='Loaded'" class="mave-publication mave-scroll-vertical">
        <div class="mave-1000px-col">
          <div class="mave-screen-title-bar">
            <div class="mave-screen-title">{{ item.dbName }} {{ item.identifier }}: {{item.title}}</div>
          </div>
        </div>
        <div class="mave-1000px-col">
          <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}}, updated {{ formatDate(item.modificationDate) }} </div>
          <div v-if="item.publicationJournal">Published {{item.publicationYear}} in {{item.publicationJournal}} </div>
          <div v-if="item.publicationDoi">DOI:
            <span>
              <a :href="`${item.url}`" target="blank">{{ item.publicationDoi }}</a>
            </span>
          </div>
          <div v-if="item.preprintDoi">DOI:
            <span>
              <a :href="`${item.url}`" target="blank">{{ item.preprintDoi }}</a>
            </span>
          </div>

          <div v-if="item.abstract">
            <div class="mave-publication-section-title">Abstract</div>
            <div v-html="markdownToHtml(item.abstract)" class="mave-publication-abstract"></div>
          </div>

          <div class="mave-publication-section-title">Linked score sets</div>
          <div class="mave-table-container">
            <ScoreSetTable
              :data="publishedScoresets"
              :language="language"
              :scrollX="true"
              :scrollY="true"
            />
          </div>

        </div>
      </div>
      <div v-else-if="itemStatus=='Loading' || itemStatus=='NotLoaded'">
          <ProgressSpinner class="mave-progress"/>
      </div>
      <div v-else>
        <h1>Page Not Found</h1>
        The requested publication does not exist.
      </div>
    </DefaultLayout>
  </template>

  <script>

  import _ from 'lodash'
  import {marked} from 'marked'
  import ProgressSpinner from 'primevue/progressspinner'

  import DefaultLayout from '@/components/layout/DefaultLayout'
  import ScoreSetTable from '@/components/ScoreSetTable'
  import useItem from '@/composition/item'
  import config from '@/config'
  import useFormatters from '@/composition/formatters'
  import {oidc} from '@/lib/auth'
  import axios from 'axios'

  export default {
    name: 'PublicationIdentifierView',
    components: {DefaultLayout, ScoreSetTable, ProgressSpinner},

    computed: {
      oidc: function() {
        return oidc
        },
    },
    setup: (props) => {
      console.log(props)
      return {
        ...useFormatters(),
        ...useItem({itemTypeName: props.name})
      }
    },

    props: {
      itemId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      dbId: {
        type: String,
        required: true
      }
    },

    data () {
      return {
        publication: null,
        publishedScoresets: [],
        language: {
            emptyTable: 'No score sets have been linked to this publication.'
        }
      }
    },

    mounted: async function() {
      await this.search()
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

      markdownToHtml: function(markdown) {
        return marked(markdown)
      },
      get(...args) {
        return _.get(...args)
      },
      search: async function() {
        await this.fetchSearchResults()
      },
      fetchSearchResults: async function() {
        try {
          let response = await axios.post(
              `${config.apiBaseUrl}/score-sets/search`,
            {
              publication_identifiers: [this.itemId],
              databases: [this.dbId]
            },
            {
              headers: {
                accept: 'application/json'
              }
            }
          )
          // TODO catch errors in response
          this.scoreSets = response.data || []

          // reset published score sets search results when using search bar
          this.publishedScoresets = []
          // Separate the response.data into published scoreset and unpublished scoreset.
          for (let i=0, len = this.scoreSets.length; i<len; i++){
            if (this.scoreSets[i].publishedDate != null){
            //if (this.scoreSets[i].private)
              this.publishedScoresets.push(this.scoreSets[i])
            }
          }
        } catch (err) {
          console.log(`Error while loading search results")`, err)
        }
      },
    },

  }

  </script>

  <style scoped>

  /* General layout */

.mave-table-container {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

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

  /* Publication */

  .mave-publication {
    padding: 20px;
  }

  /* Publication details */

  .mave-publication-section-title {
    /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
    font-size: 24px;
    padding: 0 0 5px 0;
    border-bottom: 1px solid #ccc;
    margin: 20px 0 10px 0;
  }

  .mave-publication-description {
    /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
    margin: 0 0 10px 0;
  }

  /* Formatting in Markdown blocks */

  .mave-publication-abstract {
    /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
    font-size: 20px;
  }

  .mave-publication-abstract::v-deep code {
    color: #987cb8;
    font-size: 87.5%;
    word-wrap: break-word;
  }

  .mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}
</style>
