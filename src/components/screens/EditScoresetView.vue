<template>
  <DefaultLayout>
    <div class="mave-full-height mave-scoreset mave-scroll-vertical">
      <div class="mave-1000px-col">
        <div class="mave-scoreset-title">Create new score set</div>
      </div>
      <div class="mave-1000px-col">
        <div class="field">
          <span class="p-float-label">
            <Dropdown v-model="experimentUrn" :id="$scopedId('input-experiment')" :options="editableExperiments" optionLabel="urn" optionValue="urn" />
            <label :for="$scopedId('input-experiment')">Experiment</label>
          </span>
        </div>
        <div class="field">
          <span class="p-float-label">
            <InputText v-model="title" :id="$scopedId('input-title')" />
            <label :for="$scopedId('input-title')">Title</label>
          </span>
        </div>
        <div class="field">
          <span class="p-float-label">
            <Textarea v-model="shortDescription" :id="$scopedId('input-shortDescription')" rows="4" />
            <label :for="$scopedId('input-shortDescription')">Short description</label>
          </span>
        </div>
        <div class="field">
          <TabView>
            <TabPanel header="Edit">
              <span class="p-float-label">
                <Textarea v-model="abstractText" :id="$scopedId('input-abstractText')" rows="4" />
                <label :for="$scopedId('input-abstractText')">Abstract</label>
              </span>
            </TabPanel>
            <TabPanel header="Preview">
              <div v-html="markdownToHtml(abstractText)"></div>
            </TabPanel>
          </TabView>
        </div>
        <div class="field">
          <TabView>
            <TabPanel header="Edit">
              <span class="p-float-label">
                <Textarea v-model="methodText" :id="$scopedId('input-methodText')" rows="4" />
                <label :for="$scopedId('input-methodText')">Methods</label>
              </span>
            </TabPanel>
            <TabPanel header="Preview">
              <div v-html="markdownToHtml(abstractText)"></div>
            </TabPanel>
          </TabView>
        </div>
        <div class="field">
          <span class="p-float-label">
            <Chips v-model="keywords" :id="$scopedId('input-keywords')" :addOnBlur="true" :allowDuplicate="false" />
            <label :for="$scopedId('input-keywords')">Keywords</label>
          </span>
        </div>
        <div class="field">
          <span class="p-float-label">
            <FileUpload
                ref="scoresFileUpload"
                :id="$scopedId('input-scores')"
                :auto="false"
                chooseLabel="Choose a file, or drop one here"
                :customUpload="true"
                :showCancelButton="false"
                :showUploadButton="false"
            >
              <template #empty>
                <p>Drop a file here.</p>
              </template>
            </FileUpload>
            <label :for="$scopedId('input-scores')">Scores</label>
          </span>
        </div>
      </div>
      <Button @click="create">Create score set</Button>
    </div>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import marked from 'marked'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import DefaultLayout from '@/components/layout/DefaultLayout'
// import useItem from '@/composition/item'
import useItems from '@/composition/items'
// import useRemoteData from '@/composition/remote-data'
import config from '@/config'
// import {parseScores} from '@/lib/scores'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ScoreSetView',
  components: {Button, Chips, DefaultLayout, Dropdown, FileUpload, InputText, TabPanel, TabView, Textarea},

  setup: () => {
    // const scoresRemoteData = useRemoteData()
    const editableExperiments = useItems({
      itemTypeName: 'experiment',
      options: {
        filter: {
          query: {l: {path: 'something'}, r: {constant: 'value'}}
        }
      }
    })
    return {
      ...useFormatters(),
      editableExperiments: editableExperiments.items
      // ...useItem({itemTypeName: 'scoreset'}),
      /*
      scoresData: scoresRemoteData.data,
      scoresDataStatus: scoresRemoteData.dataStatus,
      setScoresDataUrl: scoresRemoteData.setDataUrl,
      ensureScoresDataLoaded: scoresRemoteData.ensureDataLoaded
      */
    }
  },

  data: () => ({
    experimentUrn: null,
    title: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    keywords: []
  }),

  methods: {
    markdownToHtml: function(markdown) {
      return marked(markdown || '')
    },
    get(...args) {
      return _.get(...args)
    },
    create: async function() {
      // this.$refs.scoresFileUpload.files.length
      const item = {
        experiment_urn: this.experimentUrn,
        title: this.title,
        short_description: this.shortDescription,
        abstract_text: this.abstractText,
        method_text: this.methodText,
        keywords: this.keywords,
        datasetColumns: {},
        extraMetadata: {}
      }
      console.log(item)
      const response = await axios.post(`${config.apiBaseUrl}/scoresets`, item)
      if (response.status == 200) {
        const newItem = response.data
        console.log('Created item')
        console.log(newItem)
        this.uploadData(newItem)
      }
    },
    uploadData: async function(scoreset) {
      const formData = new FormData()
      formData.append('scores_file', this.$refs.scoresFileUpload.files[0])
      const response = await axios.post(
        `${config.apiBaseUrl}/scoresets/${scoreset.urn}/variants/data`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      if (response.status == 200) {
        console.log('done')
      }
      /*
      		let response = await this.$ajax.post("./CreatePickPlateFromMatrixAjax", formData,
			{
				headers: {
      				'Content-Type': 'multipart/form-data'
				}
			})
*/
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

/* Forms */

.field {
  margin: 10px 0;
}

.field:deep(.p-chips) {
  width: 100%;
}

.field:deep(.p-inputtext) {
  width: 100%;
}

.field:deep(.p-tabview) {
  display: flex;
  flex-direction: row-reverse;
}

.field:deep(.p-tabview-nav-container) {
  /*float: right;*/
}

.field:deep(.p-tabview-nav-content) {
  overflow-x: hidden;
  overflow-y: auto;
}

.field:deep(.p-tabview .p-tabview-nav) {
  flex-direction: column;
  padding-left: 10px;
  border: 0 none;
}

.field:deep(.p-tabview .p-tabview-nav li .p-tabview-nav-link) {
  border-width: 0 0 0 1px;
  margin: 0 0 0 -1px;
}

.field:deep(.p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  border-left: 3px solid #3f51b5;
}

.field:deep(.p-tabview .p-tabview-ink-bar) {
  display: none;
}

.field:deep(.p-tabview .p-tabview-panels) {
  position: relative;
  flex: 1 0 auto;
  padding: 0;
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

.mave-scoreset-title {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 28px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 10px 0;
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
