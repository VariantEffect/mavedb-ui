<template>
  <DefaultLayout>
    <EmailPrompt
      dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
      :isFirstLoginPrompt="false"
    />
    {{ experimentSetUrn }}
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
              <div v-if="experimentSetUrn" class="field">
                <label :for="$scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px;">Experiment set:</label>
                <span :id="$scopedId('field-value-experiment-set')">{{ experimentSetUrn }}</span>
                <span v-if="validationErrors.experimentSetUrn" class="mave-field-error">{{validationErrors.experimentSetUrn}}</span>
                <div v-if="!item" class="mave-field-help">
                  To add an experiment to a different set, please navigate to the experiment set first and click "Add experiment."
                </div>
              </div>
              <div class="field" v-else>
                <label :for="$scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px;">Experiment set:</label>
                <span :id="$scopedId('field-value-experiment-set')">(New experiment set)</span>
                <div class="mave-field-help">
                  To add an experiment to an existing set, please navigate to the experiment set first and click "Add experiment."
                </div>
              </div>
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
                  <Chips
                      ref="doiIdentifiersInput"
                      v-model="doiIdentifiers"
                      :id="$scopedId('input-doiIdentifiers')"
                      :addOnBlur="true"
                      :allowDuplicate="false"
                      @add="acceptNewDoiIdentifier"
                      @keyup.escape="clearDoiIdentifierSearch"
                    >
                      <template #chip="slotProps">
                        <div>
                            <span>{{ slotProps.value.identifier }}</span>
                        </div>
                    </template>
                  </Chips>
                  <label :for="$scopedId('input-doiIdentifiers')">DOIs</label>
                </span>
                <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{validationErrors.doiIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="publicationIdentifiersInput"
                      v-model="publicationIdentifiers"
                      :id="$scopedId('input-publicationIdentifiers')"
                      :multiple="true"
                      :suggestions="publicationIdentifierSuggestionsList"
                      @complete="searchPublicationIdentifiers"
                      @item-select="acceptNewPublicationIdentifier"
                      @keyup.escape="clearPublicationIdentifierSearch"
                      option-label="identifier"
                  >
                    <template #chip="slotProps">
                      <div>
                        <div>{{ slotProps.value.identifier }}</div>
                      </div>
                    </template>
                    <template #item="slotProps">
                      <div>
                          <div>Title: {{ slotProps.item.title }}</div>
                          <div>DOI: {{ slotProps.item.publicationDoi || slotProps.item.preprintDoi }}</div>
                          <div>Identifier: {{ slotProps.item.identifier }}</div>
                          <div>Database: {{ slotProps.item.dbName }}</div>
                      </div>
                    </template>
                  </AutoComplete>
                  <label :for="$scopedId('input-publicationIdentifiers')">Publication identifiers</label>
                </span>
                <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{validationErrors.publicationIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label" style="display:block">
                  <Multiselect
                    ref="primaryPublicationIdentifiersInput"
                    v-model="primaryPublicationIdentifiers"
                    :id="$scopedId('input-primaryPublicationIdentifiers')"
                    :options="publicationIdentifiers"
                    optionLabel="identifier"
                    placeholder="Select a primary publication (Where the dataset is described)"
                    :selectionLimit="1"
                  >
                    <template #option="slotProps">
                          <div>
                              <div>Title: {{ slotProps.option.title }}</div>
                              <div>DOI: {{ slotProps.option.publicationDoi || slotProps.option.preprintDoi }}</div>
                              <div>Identifier: {{ slotProps.option.identifier }}</div>
                              <div>Database: {{ slotProps.option.dbName }}</div>
                          </div>
                    </template>
                  </Multiselect>
                  <label :for="$scopedId('input-primaryPublicationIdentifiers')">Primary publication</label>
                </span>
                <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{validationErrors.primaryPublicationIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Chips
                      ref="rawReadIdentifiersInput"
                      v-model="rawReadIdentifiers"
                      :id="$scopedId('input-rawReadIdentifiers')"
                      :addOnBlur="true"
                      :allowDuplicate="false"
                      @add="acceptNewRawReadIdentifier">
                      @keyup.escape="clearRawReadIdentifierSearch"
                      <template #chip="slotProps">
                        <div>
                            <span>{{ slotProps.value.identifier }}</span>
                        </div>
                    </template>
                  </Chips>
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
          <Card v-if="item?.scoreSetUrns">
            <template #content>
              <div>{{item.scoreSetUrns?.length}} score sets loaded</div>
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
import {marked} from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chips from 'primevue/chips'
import Multiselect from 'primevue/multiselect'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'

import DefaultLayout from '@/components/layout/DefaultLayout'
import EmailPrompt from '@/components/common/EmailPrompt'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizePubmedId, normalizeRawRead, validateDoi, validatePubmedId, validateRawRead} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ExperimentEditor',
  components: { AutoComplete, Button, Card, Chips, Multiselect, DefaultLayout, EmailPrompt, FileUpload, InputText, ProgressSpinner, TabPanel, TabView, Textarea },

  setup: () => {
    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'}),
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({text}),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text) => externalPublicationIdentifierSuggestions.setRequestBody({text}),
    }
  },

  props: {
    experimentSetUrn: {
      type: String,
      required: false
    },
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
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    rawReadIdentifiers: [],
    extraMetadata: {},

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null
    },
    validationErrors: {},
  }),

  computed: {
    publicationIdentifierSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      let publicationIdentifierSuggestions = _.unionBy(this.publicationIdentifierSuggestions, this.externalPublicationIdentifierSuggestions, 'identifier')
      if (!Array.isArray(publicationIdentifierSuggestions) || !publicationIdentifierSuggestions.length) {
        // array does not exist, is not an array, or is empty
        return [{}]
      } else {
        return publicationIdentifierSuggestions
      }
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

    acceptNewDoiIdentifier: function(event) {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.doiIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.doiIdentifiers[idx]
      const newDoi = normalizeDoi(searchText)
      if (this.doiIdentifiers.find((item) => item.identifier == newDoi)) {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `DOI "${newDoi}" is already associated with this experiment`, life: 3000})
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, { identifier: newDoi })
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `"${searchText}" is not a valid DOI`, life: 3000})
      }
    },

    clearDoiIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.doiIdentifiersInput
      input.$refs.input.value = ''
    },

    acceptNewPublicationIdentifier: function() {
      // We assume the newest value is the right-most one here. That seems to always be true in this version of Primevue,
      // but that may change in the future.
      const newIdx = this.publicationIdentifiers.length - 1

      // Remove new value if it is a duplicate.
      const newIdentifier = this.publicationIdentifiers[newIdx].identifier
      if (this.publicationIdentifiers.findIndex((pub) => pub.identifier == newIdentifier) < newIdx) {
        this.publicationIdentifiers.splice(newIdx, 1)
        this.$toast.add({severity:'warning', summary: `Identifier "${newIdentifier}" is already associated with this experiment`, life: 3000})
      }
    },

    clearPublicationIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.publicationIdentifiersInput
      input.$refs.focusInput.value = ''
    },

    searchPublicationIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    acceptNewRawReadIdentifier: function() {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.rawReadIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.rawReadIdentifiers[idx]
      const newRawRead = normalizeRawRead(searchText)
      if (this.rawReadIdentifiers.find((item) => item.identifier == newRawRead)) {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `Raw Read identifier "${newRawRead}" is already associated with this experiment`, life: 3000})
      } else if (validateRawRead(searchText)) {
        this.rawReadIdentifiers.splice(idx, 1, { identifier: newRawRead })
      } else {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `"${searchText}" is not a valid Raw Read identifier`, life: 3000})
      }
    },

    clearRawReadIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.rawReadIdentifiersInput
      input.$refs.input.value = ''
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
      this.validationErrors = _.merge({}, this.serverSideValidationErrors, this.clientSideValidationErrors)
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
        // So that the multiselect can populate correctly, build the primary publication identifiers
        // indirectly by filtering publication identifiers list for those publications we know to be
        // primary.
        this.publicationIdentifiers = _.concat(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
        this.primaryPublicationIdentifiers = this.item.primaryPublicationIdentifiers.filter((publication) => {
          return this.publicationIdentifiers.some((primary) => {
            return primary.identifier === publication.identifier
          })
        })
        this.secondaryPublicationIdentifiers = this.item.secondaryPublicationIdentifiers
        this.rawReadIdentifiers = this.item.rawReadIdentifiers
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.keywords = []
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
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
      // Remove primary identifier from publications to construct secondary identifiers
      const primaryPublicationIdentifiers = this.primaryPublicationIdentifiers.map((identifier) => _.pick(identifier, ['identifier', 'dbName']))
      const secondaryPublicationIdentifiers = this.publicationIdentifiers.map(
        (identifier) => _.pick(identifier, ['identifier', 'dbName'])
      ).filter(
          secondary => !primaryPublicationIdentifiers.some(primary => primary.identifier == secondary.identifier && primary.dbName == secondary.dbName)
      )

      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: primaryPublicationIdentifiers,
        secondaryPublicationIdentifiers: secondaryPublicationIdentifiers,
        rawReadIdentifiers: this.rawReadIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        extraMetadata: {}
      }
      // empty item arrays so that deleted items aren't merged back into editedItem object
      if(this.item) {
        this.item.keywords = []
        this.item.doiIdentifiers = []
        this.item.publicationIdentifiers = []
        this.item.primaryPublicationIdentifiers = []
        this.item.rawReadIdentifiers = []
      }

      const editedItem = _.merge({}, this.item || {}, editedFields)

      let response
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/experiments/${this.item.urn}`, editedItem)
        } else {
          if (this.experimentSetUrn) {
            editedItem.experimentSetUrn = this.experimentSetUrn
          }
          response = await axios.post(`${config.apiBaseUrl}/experiments/`, editedItem)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }

      if (response.status == 200) {
        const savedItem = response.data
        this.validationErrors = {}
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
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({ severity: 'error', summary: `Encountered an error saving experiment: ${response.data.detail}` })
        }
        else {
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
