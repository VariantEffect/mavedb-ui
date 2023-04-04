<template>
  <DefaultLayout>
    <div class="mave-experiment-editor">
      <div class="grid">
        <div class="col-12">
          <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit experiment {{this.item.urn}}</div>
            <div v-if="item" class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save changes</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="viewItem" class="p-button-warning">Cancel</Button>
            </div>
          </div>
          <div v-else class="mave-screen-title-bar">
            <div class="mave-screen-title">Create a new experiment</div>
            <div class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save experiment</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="backDashboard" class="p-button-warning">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
              <div class="field">
                <span class="p-float-label">
                  <InputText v-model="title" :id="$scopedId('input-title')" />
                  <label :for="$scopedId('input-title')">Title</label>
                </span>
                <span v-if="validationErrors.title" class="mave-field-error">{{validationErrors.title}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Textarea v-model="shortDescription" :id="$scopedId('input-shortDescription')" rows="4" />
                  <label :for="$scopedId('input-shortDescription')">Short description</label>
                </span>
                <span v-if="validationErrors.shortDescription" class="mave-field-error">{{validationErrors.shortDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Chips v-model="keywords" :id="$scopedId('input-keywords')" :addOnBlur="true" :allowDuplicate="false" />
                  <label :for="$scopedId('input-keywords')">Keywords</label>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="doiIdentifiersInput"
                      v-model="doiIdentifiers"
                      :id="$scopedId('input-doiIdentifiers')"
                      field="identifier"
                      :multiple="true"
                      :suggestions="doiIdentifierSuggestionsList"
                      @complete="searchDoiIdentifiers"
                      @keyup.enter="acceptNewDoiIdentifier"
                      @keyup.escape="clearDoiIdentifierSearch"
                  />
                  <label :for="$scopedId('input-doiIdentifiers')">DOIs</label>
                </span>
                <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{validationErrors.doiIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="pubmedIdentifiersInput"
                      v-model="pubmedIdentifiers"
                      :id="$scopedId('input-pubmedIdentifiers')"
                      field="identifier"
                      :multiple="true"
                      :suggestions="pubmedIdentifierSuggestionsList"
                      @complete="searchPubmedIdentifiers"
                      @keyup.enter="acceptNewPubmedIdentifier"
                      @keyup.escape="clearPubmedIdentifierSearch"
                  />
                  <label :for="$scopedId('input-pubmedIdentifiers')">PubMed IDs</label>
                </span>
                <span v-if="validationErrors.pubmedIdentifiers" class="mave-field-error">{{validationErrors.pubmedIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="rawReadIdentifiersInput"
                      v-model="rawReadIdentifiers"
                      :id="$scopedId('input-rarReadIdentifiers')"
                      field="identifier"
                      :multiple="true"
                      :suggestions="rawReadIdentifierSuggestionsList"
                      @complete="searchRawReadIdentifiers"
                      @keyup.enter="acceptNewRawReadIdentifier"
                      @keyup.escape="clearRawReadIdentifierSearch"
                  />
                  <label :for="$scopedId('input-rawReadIdentifiers')">Raw Read</label>
                </span>
                <span v-if="validationErrors.rawReadIdentifiers" class="mave-field-error">{{validationErrors.rawReadIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <FileUpload
                      :id="$scopedId('input-extraMetadataFile')"
                      :auto="false"
                      chooseLabel="Extra metadata"
                      :class="inputClasses.extraMetadataFile"
                      :customUpload="true"
                      :fileLimit="1"
                      :showCancelButton="false"
                      :showUploadButton="false"
                      @remove="fileCleared('extraMetadataFile')"
                      @select="fileSelected('extraMetadataFile', $event)"
                  >
                    <template #empty>
                      <p>Drop a JSON file here.</p>
                    </template>
                  </FileUpload>
                </span>
                <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{validationErrors.extraMetadata}}</span>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
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
                <span v-if="validationErrors.abstractText" class="mave-field-error">{{validationErrors.abstractText}}</span>
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
                    <div v-html="markdownToHtml(methodText)"></div>
                  </TabPanel>
                </TabView>
                <span v-if="validationErrors.methodText" class="mave-field-error">{{validationErrors.methodText}}</span>
              </div>
            </template>
          </Card>
          <Card v-if="item">
            <template #content>
              <div>{{item.numScoresets}} scoresets loaded</div>
            </template>
          </Card>
        </div>
      </div>
    </div>
    <ProgressSpinner v-if="progressVisible" class="mave-progress" />
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import marked from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chips from 'primevue/chips'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import {useForm} from 'vee-validate'

import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizePubmedId, normalizeRawRead, validateDoi, validatePubmedId, validateRawRead} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ExperimentEditor',
  components: {AutoComplete, Button, Card, Chips, DefaultLayout, FileUpload, InputText, ProgressSpinner, TabPanel, TabView, Textarea},

  setup: () => {
    const doiIdentifierSuggestions = useItems({itemTypeName: 'doi-identifier-search'})
    const pubmedIdentifierSuggestions = useItems({itemTypeName: 'pubmed-identifier-search'})
    const rawReadIdentifierSuggestions = useItems({itemTypeName: 'raw-read-identifier-search'})
    const {errors: validationErrors, handleSubmit, setErrors: setValidationErrors} = useForm()
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'}),
      doiIdentifierSuggestions: doiIdentifierSuggestions.items,
      setDoiIdentifierSearch: (text) => doiIdentifierSuggestions.setRequestBody({text}),
      pubmedIdentifierSuggestions: pubmedIdentifierSuggestions.items,
      setPubmedIdentifierSearch: (text) => pubmedIdentifierSuggestions.setRequestBody({text}),
      rawReadIdentifierSuggestions: rawReadIdentifierSuggestions.items,
      setRawReadIdentifierSearch: (text) => rawReadIdentifierSuggestions.setRequestBody({text}),
      handleSubmit,
      setValidationErrors,
      validationErrors
    }
  },

  props: {
    itemId: {
      type: String,
      required: false
    }
  },

  data: () => ({
    // Form fields
    title: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    keywords: [],
    doiIdentifiers: [],
    pubmedIdentifiers: [],
    rawReadIdentifiers: [],
    extraMetadata: {},

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null
    }
  }),

  computed: {
    doiIdentifierSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      return this.doiIdentifierSuggestions || [{}]
    },
    pubmedIdentifierSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      return this.pubmedIdentifierSuggestions || [{}]
    },
    rawReadIdentifierSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      return this.rawReadIdentifierSuggestions || [{}]
    },
  },

  watch: {
    item: {
      handler: function() {
        this.resetForm()
      }
    },
    itemId: {
      handler: function() {
        this.setItemId(this.itemId)
      },
      immediate: true
    }
  },

  methods: {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    acceptNewDoiIdentifier: function() {
      const input = this.$refs.doiIdentifiersInput
      const searchText = (input.inputTextValue || '').trim()
      if (validateDoi(searchText)) {
        const doi = normalizeDoi(searchText)
        this.doiIdentifiers = _.uniqBy([...this.doiIdentifiers, {identifier: doi}])
        input.inputTextValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        input.$refs.input.value = ''
      }
    },

    clearDoiIdentifierSearch: function() {
      const input = this.$refs.doiIdentifiersInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    },

    searchDoiIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setDoiIdentifierSearch(event.query)
      }
    },

    acceptNewPubmedIdentifier: function() {
      const input = this.$refs.pubmedIdentifiersInput
      const searchText = (input.inputTextValue || '').trim()
      if (validatePubmedId(searchText)) {
        const pubmedId = normalizePubmedId(searchText)
        this.pubmedIdentifiers = _.uniqBy([...this.pubmedIdentifiers, {identifier: pubmedId}])
        input.inputTextValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        input.$refs.input.value = ''
      }
    },

    clearPubmedIdentifierSearch: function() {
      const input = this.$refs.pubmedIdentifiersInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    },

    searchPubmedIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPubmedIdentifierSearch(event.query)
      }
    },

    acceptNewRawReadIdentifier: function() {
      const input = this.$refs.rawReadIdentifiersInput
      const searchText = (input.inputTextValue || '').trim()
      if (validateRawRead(searchText)) {
        const rawReadId = normalizeRawRead(searchText)
        this.rawReadIdentifiers = _.uniqBy([...this.rawReadIdentifiers, {identifier: rawReadId}])
        input.inputTextValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        input.$refs.input.value = ''
      }
    },

    clearRawReadIdentifierSearch: function() {
      const input = this.$refs.rawReadIdentifiersInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    },

    searchRawReadIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setRawReadIdentifierSearch(event.query)
      }
    },

    fileCleared: function(inputName) {
      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    fileSelected: async function(inputName, event) {
      const file = event.files[0]
      if (file) {
        switch (inputName) {
          case 'extraMetadataFile':
            {
              const text = await file.text()
              try {
                this.extraMetadata = JSON.parse(text)
                if (!_.isObject(this.extraMetadata) || _.isArray(this.extraMetadata)) {
                  this.clientSideValidationErrors.extraMetadata = 'Extra metadata must be a JSON object (not an array or simple value).'
                } else {
                  this.clientSideValidationErrors.extraMetadata = null
                }
              } catch (e) {
                this.extraMetadata = null
                this.clientSideValidationErrors.extraMetadata = 'The file did not contain valid JSON text.'
                console.log('Extra metadata file did not contain valid JSON text.')
              }
            }
            break
        }
        this.inputClasses[inputName] = 'mave-file-input-full'
      }
      this.mergeValidationErrors()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Validation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    mergeValidationErrors: function() {
      this.setValidationErrors(_.merge({}, this.serverSideValidationErrors, this.clientSideValidationErrors))
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Converting between view model and form model
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetForm: function() {
      if (this.item) {
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.keywords = this.item.keywords
        this.doiIdentifiers = this.item.doiIdentifiers
        this.pubmedIdentifiers = this.item.pubmedIdentifiers
        this.rawReadIdentifiers = this.item.rawReadIdentifiers
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.keywords = []
        this.doiIdentifiers = []
        this.pubmedIdentifiers = []
        this.rawReadIdentifiers = []
        this.extraMetadata = {}
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Saving changes
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO It would be nice to let the items state module handle saving.
    // Currently there is some special handling here, though, so we will leave that for a later refactoring.

    save: async function() {
      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        pubmedIdentifiers: this.pubmedIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        rawReadIdentifiers: this.rawReadIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        extraMetadata: {}
      }
      const editedItem = _.merge({}, this.item || {}, editedFields)

      let response
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/experiments/${this.item.urn}`, editedItem)
        } else {
          response = await axios.post(`${config.apiBaseUrl}/experiments/`, editedItem)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }

      if (response.status == 200) {
        const savedItem = response.data
        this.setValidationErrors({})
        if (this.item) {
          console.log('Updated item')
          //this.reloadItem()
          this.$router.replace({path: `/experiments/${savedItem.urn}`})
          this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
        } else {
          console.log('Created item')
          this.$router.replace({path: `/experiments/${savedItem.urn}`})
          this.$toast.add({severity:'success', summary: 'The new experiment was saved.', life: 3000})
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
        this.serverSideValidationErrors = formValidationErrors
        this.mergeValidationErrors()
      }
    },

    validateAndSave: async function() {
      this.serverSideValidationErrors = {}
      this.mergeValidationErrors()

      if (_.isEmpty(this.validationErrors)) {
        await this.save()
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem: function() {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}`})
      }
    },

    //Back to Dashboard
    backDashboard: function() {
      this.$router.replace({path: `/dashboard`})
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Rendering utilities
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    markdownToHtml: function(markdown) {
      return marked(markdown || '')
    },

    get(...args) {
      return _.get(...args)
    }

  }
}

</script>

<style scoped src="../../assets/forms.css"></style>

<style scoped>

/* Cards */

.mave-experiment-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0,0,0,0.05);
}

.mave-experiment-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51B5;
  margin-bottom: 0;
}

/* Progress indicator */

.mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}

</style>
