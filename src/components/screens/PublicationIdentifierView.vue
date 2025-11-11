<template>
  <DefaultLayout>
    <div v-if="itemStatus == 'Loaded'" class="mave-publication mavedb-scroll-vertical">
      <div class="mavedb-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{ item.dbName }} {{ item.identifier }}: {{ item.title }}</div>
        </div>
      </div>
      <div class="mavedb-1000px-col">
        <div v-if="item.creationDate">
          Created {{ formatDate(item.creationDate) }}, updated {{ formatDate(item.modificationDate) }}
        </div>
        <div v-if="item.publicationJournal">Published {{ item.publicationYear }} in {{ item.publicationJournal }}</div>
        <div v-if="item.doi">
          DOI:
          <span>
            <a :href="`${item.url}`" target="blank">{{ item.doi }}</a>
          </span>
        </div>

        <div v-if="item.abstract">
          <div class="mave-publication-section-title">Abstract</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mave-publication-abstract" v-html="markdownToHtml(item.abstract)"></div>
        </div>

        <div class="mave-publication-section-title">Linked score sets</div>
        <div class="mavedb-score-set-table-container">
          <ScoreSetTable :data="publishedScoresets" :language="language" :scroll-x="true" :scroll-y="true" />
        </div>
      </div>
    </div>
    <div v-else-if="itemStatus == 'Loading' || itemStatus == 'NotLoaded'">
      <PageLoading />
    </div>
    <div v-else>
      <ItemNotFound :item-id="itemId" model="publication" />
    </div>
  </DefaultLayout>
</template>

<script>
import _ from 'lodash'
import {marked} from 'marked'
import {useHead} from '@unhead/vue'

import DefaultLayout from '@/components/layout/DefaultLayout'
import ScoreSetTable from '@/components/ScoreSetTable'
import PageLoading from '@/components/common/PageLoading'
import ItemNotFound from '@/components/common/ItemNotFound'
import useItem from '@/composition/item'
import config from '@/config'
import useFormatters from '@/composition/formatters'
import axios from 'axios'

export default {
  name: 'PublicationIdentifierView',
  components: {DefaultLayout, ScoreSetTable, PageLoading, ItemNotFound},

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

  setup: (props) => {
    useHead({title: 'Publication details'})

    return {
      ...useFormatters(),
      ...useItem({itemTypeName: props.name})
    }
  },

  data() {
    return {
      publication: null,
      publishedScoresets: [],
      language: {
        emptyTable: 'No score sets have been linked to this publication.'
      }
    }
  },

  watch: {
    itemId: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  mounted: async function () {
    await this.search()
  },

  methods: {
    markdownToHtml: function (markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    search: async function () {
      await this.fetchSearchResults()
    },
    fetchSearchResults: async function () {
      try {
        const response = await axios.post(
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
        // TODO (#130) catch errors in response
        this.scoreSets = response.data?.scoreSets || []

        // reset published score sets search results when using search bar
        this.publishedScoresets = []
        // Separate the response.data into published scoreset and unpublished scoreset.
        for (let i = 0, len = this.scoreSets.length; i < len; i++) {
          if (this.scoreSets[i].publishedDate != null) {
            //if (this.scoreSets[i].private)
            this.publishedScoresets.push(this.scoreSets[i])
          }
        }
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    }
  }
}
</script>

<style scoped>
/* Table */

.mavedb-score-set-table-container {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
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

.mave-publication-abstract:deep(code) {
  color: #987cb8;
  font-size: 87.5%;
  word-wrap: break-word;
}
</style>
