<template>
  <DefaultLayout>
    <div v-if="itemStatus=='Loaded'" class="mave-full-height mave-score-set mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.urn}}</div>
          <div v-if="userIsAuthenticated & userIsAuthorized">
            <div class="mave-screen-title-controls">
              <Button class="p-button-sm" @click="addExperiment">Add an experiment</Button>
            </div>
          </div>
        </div>
        <div class="mave-screen-title">Experiment set</div>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}} </div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}} </div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publishedDate)}}</div>
        <div class="mave-score-set-section-title">Experiments</div>
          <div v-if="item.experiments.length!=0">
            <ul style="list-style-type:square">
              <li v-for="ex in item.experiments" :key="ex">
                <router-link :to="{name: 'experiment', params: {urn: ex.urn}}">{{ex.urn}}</router-link>
                <div><strong>{{ex.title}}</strong></div> {{ex.shortDescription}} <p/>
              </li>
            </ul>
          </div>
          <div v-else>No associated experiment</div>
      </div>
    </div>
    <div v-else-if="itemStatus=='Loading' || itemStatus=='NotLoaded'">
      <PageLoading/>
    </div>
    <div v-else>
      <ItemNotFound model="experiment set" :itemId="itemId"/>
    </div>
  </DefaultLayout>
</template>

<script>

import _ from 'lodash'
import axios from 'axios'
import {marked} from 'marked'
import Button from 'primevue/button'
import config from '@/config'

import DefaultLayout from '@/components/layout/DefaultLayout'
import PageLoading from '@/components/common/PageLoading'
import ItemNotFound from '@/components/common/ItemNotFound'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ExperimentSetView',
  components: {Button, DefaultLayout, PageLoading, ItemNotFound},

  setup: () => {
    const {userIsAuthenticated} = useAuth()

    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experimentSet'}),
      userIsAuthenticated
    }
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  data () {
    return {
      associatedExperiments: [],
      userIsAuthorized: false
    }
  },

  mounted: async function() {
    await this.checkUserAuthorization()
  },

  watch: {
    itemId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
          console.log(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {

    addExperiment: function() {
      this.$router.push({name: 'createExperimentInExperimentSet', params: {urn: this.item.urn}})
    },
    checkUserAuthorization: async function() {
      await this.checkAuthorization()
    },
    checkAuthorization: async function() {
      try {
        // this response should be true to get authorization
        let response = await axios.get(`${config.apiBaseUrl}/permissions/user-is-permitted/experiment-set/${this.itemId}/add_experiment`)
        this.userIsAuthorized = response.data
      } catch (err) {
        console.log(`Error to get authorization:`, err)
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
