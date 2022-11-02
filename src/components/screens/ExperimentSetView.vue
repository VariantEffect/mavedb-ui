<template>
  <DefaultLayout>
    <div v-if="item" class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">{{item.urn}}</div>
        </div>
        <div class="mave-screen-title">{{item.title || 'Untitled experimentset'}}</div>
        <div v-if="item.shortDescription" class="mave-scoreset-description">{{item.shortDescription}}</div>
      </div>
      <div class="mave-1000px-col">
        <div v-if="item.creationDate">Created {{formatDate(item.creationDate)}} </div>
        <div v-if="item.modificationDate">Last updated {{formatDate(item.modificationDate)}} </div>
        <div v-if="item.publishedDate">Published {{formatDate(item.publishedDate)}}</div>

        <div v-if="item.abstractText">
          <div class="mave-scoreset-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-scoreset-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-scoreset-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-scoreset-abstract"></div>
        </div>

        <div class="mave-scoreset-section-title">Experiments</div>
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
  </DefaultLayout>
</template>

<script>

import _ from 'lodash'
import marked from 'marked'

import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useFormatters from '@/composition/formatters'
import {oidc} from '@/lib/auth'

export default {
  name: 'ExperimentSetView',
  components: {DefaultLayout},

  computed: {
    oidc: function() {
      return oidc
      },
    
  },
  setup: () => {
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experimentSet'})
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
      associatedExperiments: []
    }
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
    
    markdownToHtml: function(markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
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