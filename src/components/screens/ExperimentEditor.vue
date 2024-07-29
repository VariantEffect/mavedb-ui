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
                          <div>DOI: {{ slotProps.item.doi }}</div>
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
                              <div>DOI: {{ slotProps.option.doi }}</div>
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
        </div>
        <div class="col-12 md:col-6">
          <Card class="keyword-editor">
            <template #content>
              <div class="field">
                <label style="font-weight: bold; margin-right: 3px;">Keywords</label>
              </div>
              <div v-for="keyword in keywordData" :key="keyword.key">
                <div v-if="keywordVisibility[keyword.key]">
                  <div class="field">
                    <span class="p-float-label">
                      <Dropdown
                        v-model="keywordKeys[keyword.key]"
                        :id="$scopedId(`keyword-input-${keyword.key}`)"
                        :options="getKeywordOptions(keyword.option)" 
                        optionLabel="value"
                        optionValue="value"
                        class="keyword-dropdown"
                      />
                      <label :for="$scopedId(`keyword-input-${keyword.key}`)">{{ keyword.key }}</label>
                    </span>
                    <Button
                      class="keyword-description-button"
                      rounded
                      :disabled="keywordKeys[keyword.key] == 'Other' ? true : null"
                      :icon="(keywordTextVisible[keyword.key] || keywordKeys[keyword.key] === 'Other') ? 'pi pi-minus' : 'pi pi-file-edit'"
                      @click="keywordToggleInput(keyword.key)"
                      aria-label="Filter"
                    />
                    &nbsp;<i class="pi pi-info-circle" style="color: green; cursor: pointer;" @click="showDialog(keyword.key)"/>
                    <Dialog
                      v-model:visible="dialogVisible[keyword.key]"
                      modal
                      :header="keyword.key"
                      :style="{ width: '50vw' }"
                      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
                    >
                      <p class="m-0">
                        {{ getKeywordOptions(keyword.option)[0].description }}
                      </p>
                    </Dialog>
                    <span v-if="validationErrors.keywords?.[keyword.key]" class="mave-field-error">{{ validationErrors.keywords?.[keyword.key] }}</span>
                  </div>
                  <div class="field" v-if="keywordTextVisible[keyword.key] || keywordKeys[keyword.key] === 'Other'">
                    <span class="p-float-label keyword-description-input">
                      <Textarea
                        v-model="keywordDescriptions[keyword.key]"
                        :id="$scopedId('input-title')"
                        rows="4"
                      />
                      <label :for="$scopedId('input-title')">{{ keyword.descriptionLabel }} {{ keywordKeys[keyword.key] === 'Other' ? '(Required)' : '(Optional)' }}</label>
                    </span>
                    <span v-if="validationErrors.keywordDescriptions?.[keyword.descriptionLabel]" class="mave-field-error"> {{ validationErrors.keywordDescriptions?.[keyword.descriptionLabel] }}</span>
                  </div>
                </div>
              </div>
              <div class="field">
                <Button class="p-button-help" @click="resetKeywords">Clear Keywords</Button>
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
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
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

const KEYWORDS = [
  {
    key: 'Variant Library Creation Method',
    descriptionLabel: 'Variant Library Creation Method Description',
    option: 'variantLibraryKeywordOptions',
  },
  {
    key: 'Endogenous Locus Library Method System',
    descriptionLabel: 'Endogenous Locus Library Method System Description',
    option: 'endogenousSystemKeywordOptions',
  },
  {
    key: 'Endogenous Locus Library Method Mechanism',
    descriptionLabel: 'Endogenous Locus Library Method Mechanism Description',
    option: 'endogenousMechanismKeywordOptions',
  },
  {
    key: 'In Vitro Construct Library Method System',
    descriptionLabel: 'In Vitro Construct Library Method System Description',
    option: 'inVitroSystemKeywordOptions',
  },
  {
    key: 'In Vitro Construct Library Method Mechanism',
    descriptionLabel: 'In Vitro Construct Library Method Mechanism Description',
    option: 'inVitroMechanismKeywordOptions',
  },
  {
    key: 'Delivery method',
    descriptionLabel: 'Delivery method Description',
    option: 'deliveryMethodKeywordOptions',
  },
  {
    key: 'Phenotypic Assay Dimensionality',
    descriptionLabel: 'Phenotypic Assay Dimensionality Description',
    option: 'phenotypicDimensionalityKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Method',
    descriptionLabel: 'Phenotypic Assay Method Description',
    option: 'phenotypicMethodKeywordOptions',
  },
  {
    key: 'Phenotypic Assay Model System',
    descriptionLabel: 'Phenotypic Assay Model System Description',
    option: 'phenotypicModelSystemKeywordOptions',
  },
  {
    key: 'Phenotypic Assay Profiling Strategy',
    descriptionLabel: 'Phenotypic Assay Profiling Strategy Description',
    option: 'phenotypicProfilingStrategyKeywordOptions',
  },
  {
    key: 'Phenotypic Assay Sequencing Read Type',
    descriptionLabel: 'Phenotypic Assay Sequencing Read Type Description',
    option: 'phenotypicSequencingTypeKeywordOptions',
  }
]

export default {
  name: 'ExperimentEditor',
  components: { AutoComplete, Button, Card, Chips, Dialog, Dropdown, Multiselect, DefaultLayout, EmailPrompt, FileUpload, InputText, ProgressSpinner, TabPanel, TabView, Textarea },

  setup: () => {
    const variantLibraryKeywordOptions = useItems({itemTypeName: `controlled-keywords-variant-search`})
    const endogenousSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-system-search`})
    const endogenousMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-mechanism-search`})
    const inVitroSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-system-search`})
    const inVitroMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-mechanism-search`})
    const deliveryMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-delivery-search`})
    const phenotypicDimensionalityKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-dimensionality-search`})
    const phenotypicMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-method-search`})
    const phenotypicModelSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-modle-system-search`})
    const phenotypicProfilingStrategyKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-profiling-strategy-search`})
    const phenotypicSequencingTypeKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-sequencing-type-search`})
    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'}),
      // keywordOptions: {
      //   'Variant Library Creation Method': variantLibraryKeywordOptions.items,
      //   'Endogenous Locus Library Method System': endogenousSystemKeywordOptions.items,
      //   'Endogenous Locus Library Method Mechanism': endogenousMechanismKeywordOptions.items,
      //   'In Vitro Construct Library Method System': inVitroSystemKeywordOptions.items,
      //   'In Vitro Construct Library Method Mechanism': inVitroMechanismKeywordOptions.items,
      //   'Delivery method': deliveryMethodKeywordOptions.items,
      //   'Phenotypic Assay Dimensionality': phenotypicDimensionalityKeywordOptions.items,
      //   'Phenotypic Assay Method': phenotypicMethodKeywordOptions.items,
      //   'Phenotypic Assay Model System': phenotypicModelSystemKeywordOptions.items,
      //   'Phenotypic Assay Profiling Strategy': phenotypicProfilingStrategyKeywordOptions.items,
      //   'Phenotypic Assay Sequencing Read Type': phenotypicSequencingTypeKeywordOptions.items,
      // },
      variantLibraryKeywordOptions: variantLibraryKeywordOptions.items,
      endogenousSystemKeywordOptions: endogenousSystemKeywordOptions.items,
      endogenousMechanismKeywordOptions: endogenousMechanismKeywordOptions.items,
      inVitroSystemKeywordOptions: inVitroSystemKeywordOptions.items,
      inVitroMechanismKeywordOptions: inVitroMechanismKeywordOptions.items,
      deliveryMethodKeywordOptions: deliveryMethodKeywordOptions.items,
      phenotypicDimensionalityKeywordOptions: phenotypicDimensionalityKeywordOptions.items,
      phenotypicMethodKeywordOptions: phenotypicMethodKeywordOptions.items,
      phenotypicModelSystemKeywordOptions: phenotypicModelSystemKeywordOptions.items,
      phenotypicProfilingStrategyKeywordOptions: phenotypicProfilingStrategyKeywordOptions.items,
      phenotypicSequencingTypeKeywordOptions: phenotypicSequencingTypeKeywordOptions.items,
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
    dialogVisible: [],
    methodText: null,
    keywords: [],
    keywordKeys: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null])),
    keywordDescriptions: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null])),
    keywordTextVisible: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, false])),
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
    validationErrors: {
      keywords: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null])),
      keywordDescriptions: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null])),
    }
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
    keywordVisibility: function() {
      return {
        ..._.fromPairs(KEYWORDS.map((keyword) => [keyword.key, true])),
        'Endogenous Locus Library Method System': this.keywordKeys['Variant Library Creation Method'] == 'Endogenous locus library method',
        'Endogenous Locus Library Method Mechanism': this.keywordKeys['Variant Library Creation Method'] == 'Endogenous locus library method',
        'In Vitro Construct Library Method System': this.keywordKeys['Variant Library Creation Method'] == 'In vitro construct library method',
        'In Vitro Construct Library Method Mechanism': this.keywordKeys['Variant Library Creation Method'] == 'In vitro construct library method',
      }
    },
    keywordData() {
      return KEYWORDS
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
    },
    'keywordKeys.Variant Library Creation Method': function(newValue) {
      if (newValue !== 'Endogenous locus library method') {
        this.keywordKeys['Endogenous Locus Library Method System'] = null
        this.keywordKeys['Endogenous Locus Library Method Mechanism'] = null
      }
      if (newValue !== 'In vitro construct library method') {
        this.keywordKeys['In Vitro Construct Library Method System'] = null
        this.keywordKeys['In Vitro Construct Library Method Mechanism'] = null
      }
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

    resetKeywords: function() {
      if (this.item && this.item.keywords.length !== 0) {
        // Keywords could be an empty list now. Will modify it back to compulsory when we get final list. 
        const setKeyword = (key) => {
          const keywordObj = this.item.keywords.find(keyword => keyword.keyword.key === key)
          this.keywordKeys[key] = keywordObj ? keywordObj.keyword.value : null
          this.keywordDescriptions[key] = keywordObj ? keywordObj.description : null
        }
        setKeyword("Variant Library Creation Method")
        setKeyword("Endogenous Locus Library Method System")
        setKeyword("Endogenous Locus Library Method Mechanism")
        setKeyword("In Vitro Construct Library Method System")
        setKeyword("In Vitro Construct Library Method Mechanism")
        setKeyword("Delivery method")
        setKeyword("Phenotypic Assay Dimensionality")
        setKeyword("Phenotypic Assay Method")
        setKeyword("Phenotypic Assay Model System")
        setKeyword("Phenotypic Assay Profiling Strategy")
        setKeyword("Phenotypic Assay Sequencing Read Type")
      } else {
        this.keywords = []
        this.keywordKeys = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
        this.keywordKeys = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
      }
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
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
        this.rawReadIdentifiers = []
        this.extraMetadata = {}
      }
      this.resetKeywords()
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
      const combinedKeywords = []
      let variantKeywords = []
      if(this.keywordKeys['Variant Library Creation Method'] === "Endogenous locus library method") {
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.keywordKeys['Variant Library Creation Method']},
            "description": this.keywordDescriptions['Variant Library Creation Method'],
          },
          {
            "keyword": {"key": "Endogenous Locus Library Method System", "value": this.keywordKeys['Endogenous Locus Library Method System']},
            "description": this.keywordDescriptions['Endogenous Locus Library Method System'],
          },
          {
            "keyword": {"key": "Endogenous Locus Library Method Mechanism", "value": this.keywordKeys['Endogenous Locus Library Method Mechanism']},
            "description": this.keywordDescriptions['Endogenous Locus Library Method Mechanism'],
          }
        ]
      }else if(this.keywordKeys['Variant Library Creation Method'] === "In vitro construct library method"){
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.keywordKeys['Variant Library Creation Method']},
            "description": this.keywordDescriptions['Variant Library Creation Method'],
          },
          {
            "keyword": {"key": "In Vitro Construct Library Method System", "value": this.keywordKeys['In Vitro Construct Library Method System']},
            "description": this.keywordDescriptions['In Vitro Construct Library Method System'],
          },
          {
            "keyword": {"key": "In Vitro Construct Library Method Mechanism", "value": this.keywordKeys['In Vitro Construct Library Method Mechanism']},
            "description": this.keywordDescriptions['In Vitro Construct Library Method Mechanism'],
          }
        ]
      }else if(this.keywordKeys['Variant Library Creation Method'] === "Other"){
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.keywordKeys['Variant Library Creation Method']},
            "description": this.keywordDescriptions['Variant Library Creation Method'],
          }
        ]
      }
      combinedKeywords.push(...variantKeywords)
      const phenotypicKeywords = [
        {
          "keyword": {"key": "Delivery method", "value": this.keywordKeys['Delivery method']},
          "description": this.keywordDescriptions['Delivery method'],
        },
        {
          "keyword": {"key": "Phenotypic Assay Dimensionality", "value": this.keywordKeys['Phenotypic Assay Dimensionality']},
          "description": this.keywordDescriptions['Phenotypic Assay Dimensionality'],
        },
        {
          "keyword": {"key": "Phenotypic Assay Method", "value": this.keywordKeys['Phenotypic Assay Method']},
          "description": this.keywordDescriptions['Phenotypic Assay Method'],
        },
        {
          "keyword": {"key": "Phenotypic Assay Model System", "value": this.keywordKeys['Phenotypic Assay Model System']},
          "description": this.keywordDescriptions['Phenotypic Assay Model System'],
        },
        {
          "keyword": {"key": "Phenotypic Assay Profiling Strategy", "value": this.keywordKeys['Phenotypic Assay Profiling Strategy']},
          "description": this.keywordDescriptions['Phenotypic Assay Profiling Strategy'],
        },
        {
          "keyword": {"key": "Phenotypic Assay Sequencing Read Type", "value": this.keywordKeys['Phenotypic Assay Sequencing Read Type']},
          "description": this.keywordDescriptions['Phenotypic Assay Sequencing Read Type'],
        }
      ]
      combinedKeywords.push(...phenotypicKeywords)
      this.keywords = combinedKeywords
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
      console.log(editedItem)
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
    },

    getKeywordOptions(optionsName) {
      return this[optionsName]
    },

    keywordToggleInput: function(field) {
      this.keywordTextVisible[field] = !this.keywordTextVisible[field]
    },

    showDialog: function (index) {
      this.dialogVisible[index] = true
    },
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

/* Keywords */

.keyword-dropdown {
  width: 450px;
  height: 45px;
}

.keyword-editor .field {
  display: flex;
  align-items: center;
}

.keyword-description-button {
  margin-left: 8px;
  height: 32px;
  width: 32px;
}

.keyword-description-button:deep(.p-button-icon) {
  font-size: 1.1rem;
  margin-top: 1px;
  margin-left: 1px;
}

.keyword-description-button:deep(.p-button-icon.pi-file-edit) {
  margin-left: 4px;
}

.keyword-description-input {
  width: 450px;
}

</style>