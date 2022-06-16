<template>
  <DefaultLayout>
    <div class="mave-scoreset-editor mave-full-height mave-scroll-vertical">
      <div class="grid">
        <div class="col-12">
          <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit score set</div>
            <div v-if="item" class="mave-screen-title-controls">
              <Button @click="saveExisting">Save changes</Button>
              <Button @click="viewItem" class="p-button-warning">Cancel</Button>
            </div>
          </div>
          <div v-else class="mave-screen-title-bar">
            <div class="mave-screen-title">Create a new score set</div>
            <div class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save</Button>
              <Button @click="resetForm" class="p-button-warning">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
              <div v-if="itemStatus != 'NotLoaded'">
                <label>Experiment</label><br>
                {{experimentUrn}}
              </div>
              <div v-else>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                      v-model="experimentUrn"
                      :id="$scopedId('input-experiment')"
                      :options="editableExperiments"
                      optionLabel="title"
                      optionValue="urn"
                    />
                    <label :for="$scopedId('input-experiment')">Experiment</label>
                  </span>
                  <span v-if="validationErrors.experimentUrn" class="mave-field-error">{{validationErrors.experimentUrn}}</span>
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
              <div v-if="itemStatus == 'NotLoaded' || this.item.private==true">
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
                  <span class="p-float-label">
                    <Textarea v-model="dataUsagePolicy" :id="$scopedId('input-dataUsagePolicy')" rows="4" />
                    <label :for="$scopedId('input-dataUsagePolicy')">Data usage policy</label>
                  </span>
                  <span v-if="validationErrors.dataUsagePolicy" class="mave-field-error">{{validationErrors.dataUsagePolicy}}</span>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 md:col-6">
          <div v-if="itemStatus == 'NotLoaded' || this.item.private==true">
            <Card>
              <template #content>
                <div class="field">
                  <span class="p-float-label">
                    <AutoComplete
                        ref="existingTargetGeneInput"
                        v-model="existingTargetGene"
                        :id="$scopedId('input-existingTargetGene')"
                        field="name"
                        :forceSelection="true"
                        :suggestions="targetGeneSuggestionsList"
                        @complete="searchTargetGenes"
                    />
                    <label :for="$scopedId('input-existingTargetGene')">Copy from an existing target gene</label>
                  </span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <InputText v-model="targetGene.name" :id="$scopedId('input-targetGeneName')" />
                    <label :for="$scopedId('input-targetGene')">Target gene name</label>
                  </span>
                  <span v-if="validationErrors['targetGene.name']" class="mave-field-error">{{validationErrors['targetGene.name']}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <SelectButton
                        v-model="targetGene.category"
                        :id="$scopedId('input-targetGeneCategory')"
                        :options="targetGeneCategories"
                    />
                  </span>
                  <span v-if="validationErrors['targetGene.category']" class="mave-field-error">{{validationErrors['targetGene.category']}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                        v-model="referenceGenome"
                        :id="$scopedId('input-targetGeneReferenceGenome')"
                        :options="referenceGenomes"
                        panelClass="mave-reference-genome-dropdown-panel"
                    >
                      <template #value="slotProps">
                        <div v-if="slotProps.value" class="mave-reference-genome-value">
                          <div class="mave-reference-genome-name">{{slotProps.value.shortName}}</div>
                          <div class="mave-reference-genome-organism-name">{{slotProps.value.organismName}}</div>
                        </div>
                        <div v-else class="mave-reference-genome-none">&nbsp;</div>
                      </template>
                      <template #option="slotProps">
                        <div class="mave-reference-genome-name">{{slotProps.option.shortName}}</div>
                        <div class="mave-reference-genome-organism-name">{{slotProps.option.organismName}}</div>
                      </template>
                    </Dropdown>
                    <label :for="$scopedId('input-targetGeneReferenceGenome')">Reference genome</label>
                  </span>
                  <span v-if="validationErrors['targetGene.referenceGenome']" class="mave-field-error">{{validationErrors['targetGene.referenceGenome']}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload
                        :id="$scopedId('input-targetGeneWtSequenceSequenceFile')"
                        :auto="false"
                        chooseLabel="Reference sequence"
                        :class="inputClasses.targetGeneWtSequenceSequenceFile"
                        :customUpload="true"
                        :fileLimit="1"
                        :showCancelButton="false"
                        :showUploadButton="false"
                        @remove="fileCleared('targetGeneWtSequenceSequenceFile')"
                        @select="fileSelected('targetGeneWtSequenceSequenceFile', $event)"
                    >
                      <template #empty>
                        <p>Drop a FASTA file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors['targetGene.wtSequence.sequence']" class="mave-field-error">{{validationErrors['targetGene.wtSequence.sequence']}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <SelectButton
                        v-model="targetGene.wtSequence.sequenceType"
                        :id="$scopedId('input-targetGeneWtSequenceSequenceType')"
                        :options="sequenceTypes"
                    />
                  </span>
                  <span v-if="validationErrors['targetGene.wtSequence.sequenceType']" class="mave-field-error">{{validationErrors['targetGene.wtSequence.sequenceType']}}</span>
                </div>
              </template>
            </Card>
            <Card>
              <template #content>
                <div v-if="item">
                  <div>{{formatInt(item.numVariants)}} variants are included in this score set.</div>
                  <div>To replace the variants, choose a new scores file and optional counts file:</div>
                </div>
                <div v-else>
                  Load a scores file and an optional counts file:
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload
                        ref="scoresFileUpload"
                        :id="$scopedId('input-scoresFile')"
                        :auto="false"
                        chooseLabel="Scores file"
                        :class="inputClasses.scoresFile || ''"
                        :customUpload="true"
                        :fileLimit="1"
                        :showCancelButton="false"
                        :showUploadButton="false"
                    >
                      <template #empty>
                        <p>Drop a file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.scoresFile" class="mave-field-error">{{validationErrors.scoresFile}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload
                        ref="countsFileUpload"
                        :id="$scopedId('input-countsFile')"
                        :auto="false"
                        chooseLabel="Counts file"
                        :class="inputClasses.countsFile || ''"
                        :customUpload="true"
                        :fileLimit="1"
                        :showCancelButton="false"
                        :showUploadButton="false"
                    >
                      <template #empty>
                        <p>Drop a file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.countsFile" class="mave-field-error">{{validationErrors.countsFile}}</span>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </div>
    <ProgressSpinner v-if="progressVisible" class="mave-progress" />
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import fasta from 'fasta-js'
import _ from 'lodash'
import marked from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chips from 'primevue/chips'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import {useForm} from 'vee-validate'

import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizePubmedId, validateDoi, validatePubmedId} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'

export default {
  name: 'ScoresetEditor',
  components: {AutoComplete, Button, Card, Chips, DefaultLayout, Dropdown, FileUpload, InputText, ProgressSpinner, SelectButton, TabPanel, TabView, Textarea},

  setup: () => {
    const editableExperiments = useItems({
      itemTypeName: 'experiment',
      options: {
        filter: {
          query: {l: {path: 'something'}, r: {constant: 'value'}}
        }
      }
    })
    const doiIdentifierSuggestions = useItems({itemTypeName: 'doi-identifier-search'})
    const pubmedIdentifierSuggestions = useItems({itemTypeName: 'pubmed-identifier-search'})
    const referenceGenomes = useItems({itemTypeName: 'reference-genome'})
    const targetGeneSuggestions = useItems({itemTypeName: 'target-gene-search'})
    const {errors: validationErrors, handleSubmit, setErrors: setValidationErrors} = useForm()
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'scoreset'}),
      editableExperiments: editableExperiments.items,
      doiIdentifierSuggestions: doiIdentifierSuggestions.items,
      setDoiIdentifierSearch: (text) => doiIdentifierSuggestions.setRequestBody({text}),
      pubmedIdentifierSuggestions: pubmedIdentifierSuggestions.items,
      setPubmedIdentifierSearch: (text) => pubmedIdentifierSuggestions.setRequestBody({text}),
      targetGeneSuggestions: targetGeneSuggestions.items,
      setTargetGeneSearch: (text) => targetGeneSuggestions.setRequestBody({text}),
      referenceGenomes: referenceGenomes.items,
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
    experimentUrn: null,
    title: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    keywords: [],
    doiIdentifiers: [],
    pubmedIdentifiers: [],
    dataUsagePolicy: null,
    targetGene: {
      name: null,
      category: null,
      type: null,
      wtSequence: {
        sequenceType: null,
        sequence: null
      }
    },
    referenceGenome: null,
    extraMetadata: {},

    existingTargetGene: null,

    // Static sets of options:
    sequenceTypes: [
      'dna',
      'protein'
    ],
    targetGeneCategories: [
      'Protein coding',
      'Regulatory',
      'Other noncoding'
    ],

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
    targetGeneSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      return this.targetGeneSuggestions || [{}]
    }
  },

  watch: {
    existingTargetGene: function() {
      if (_.isObject(this.existingTargetGene)) {
        // _.cloneDeep is needed because the target gene has been frozen.
        this.targetGene = _.cloneDeep(this.existingTargetGene)
        const referenceGenomeId = _.get(this.targetGene, 'referenceMaps.0.genome.id')
        this.referenceGenome = this.referenceGenomes.find((rg) => rg.id == referenceGenomeId)
      }
    },
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

    searchTargetGenes: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setTargetGeneSearch(event.query)
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
          case 'targetGeneWtSequenceSequenceFile':
            {
              const text = await file.text()
              try {
                const fastaParser = new fasta()
                /*new Fasta({
                  'definition': 'gi|accession|description',
                  'delimiter': '|'
                })*/
                const fastaData = fastaParser.parse(text)
                console.log(fastaData)
                if (fastaData.length == 0) {
                  this.targetGene.wtSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.wtSequence.sequence'] = 'The FASTA file contains no sequences.'
                } else if (fastaData.length > 1) {
                  this.targetGene.wtSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.wtSequence.sequence'] = 'The FASTA file contains more than one sequence.'
                } else {
                  this.targetGene.wtSequence.sequence = fastaData[0].sequence
                  this.clientSideValidationErrors['targetGene.wtSequence.sequence'] = null
                }
              } catch (e) {
                this.targetGene.wtSequence.sequence = null
                this.clientSideValidationErrors['targetGene.wtSequence.sequence'] = 'The file was not a valid FASTA file.'
                console.log('Reference sequence file was not a valid FASTA file.')
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
      console.log(this.item)
      if (this.item) {
        this.experimentUrn = this.item.experiment.urn
        console.log(this.experimentUrn)
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.keywords = this.item.keywords
        this.doiIdentifiers = this.item.doiIdentifiers
        this.pubmedIdentifiers = this.item.pubmedIdentifiers
        this.dataUsagePolicy = this.item.dataUsagePolicy
        this.targetGene = _.merge({
          name: null,
          category: null,
          type: null,
          wtSequence: {
            sequenceType: null,
            sequence: null
          }
        }, this.item.targetGene)
        this.referenceGenome = this.item.referenceGenome
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.experimentUrn = null
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.keywords = []
        this.doiIdentifiers = []
        this.pubmedIdentifiers = []
        this.dataUsagePolicy = null
        this.targetGene = {
          name: null,
          category: null,
          type: null,
          wtSequence: {
            sequenceType: null,
            sequence: null
          }
        }
        this.referenceGenome = null
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
        experimentUrn: this.experimentUrn,  // TODO was _urn
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        pubmedIdentifiers: this.pubmedIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        dataUsagePolicy: this.dataUsagePolicy,
        datasetColumns: {},
        extraMetadata: {},
        targetGene: {
          name: _.get(this.targetGene, 'name'),
          category: _.get(this.targetGene, 'category'),
          type: _.get(this.targetGene, 'type'),
          referenceMaps: [{
            genomeId: _.get(this.referenceGenome, 'id')
          }],
          wtSequence: {
            sequenceType: _.get(this.targetGene, 'wtSequence.sequenceType'),
            sequence: _.get(this.targetGene, 'wtSequence.sequence')
          }
        }
      }
      const editedItem = _.merge({}, this.item || {}, editedFields)

      this.progressVisible = true
      let response = null
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/scoresets/${this.item.urn}`, editedItem)
        } else {
          response = await axios.post(`${config.apiBaseUrl}/scoresets/`, editedItem)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      this.progressVisible = false

      if (response.status == 200) {
        const savedItem = response.data
        this.setValidationErrors({})
        if (this.item) {
          console.log('Updated item')
          if (this.$refs.scoresFileUpload?.files?.length == 1) {
            await this.uploadData(savedItem)
          } else {
            this.reloadItem()
            this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
            //this.$router.replace({path: `/scoresets/${this.scoreset.urn}/edit`})
          }
        } else {
          console.log('Created item')
          await this.uploadData(savedItem)
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

    uploadData: async function(scoreset) {
      if (this.$refs.scoresFileUpload.files.length != 1) {
        this.setValidationErrors({scores: 'Required'})
      } else {
        const formData = new FormData()
        formData.append('scores_file', this.$refs.scoresFileUpload.files[0])
        if (this.$refs.countsFileUpload.files.length == 1) {
          formData.append('counts_file', this.$refs.countsFileUpload.files[0])
        }

        this.progressVisible = true
        let response
        try {
          response = await axios.post(
            `${config.apiBaseUrl}/scoresets/${scoreset.urn}/variants/data`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            }
          )
        } catch (e) {
          response = e.response || {status: 500}
        }
        this.progressVisible = false

        if (response.status == 200) {
          console.log('Imported scoreset data.')
          if (this.item) {
            this.reloadItem()
            this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
          } else {
            this.$router.replace({path: `/scoresets/${scoreset.urn}/edit`})
            this.$toast.add({severity:'success', summary: 'The new score set was saved.', life: 3000})
          }
        } else {
          this.$toast.add({severity:'error', summary: 'The score and count files could not be imported.', life: 3000})

          // Delete the scoreset if just created.
          // Warn if the scoreset already exists.
        }
      }
    },

    validateAndSave: async function() {
      this.clientSideValidationErrors = {}

      const hasScoresFile = this.$refs.scoresFileUpload.files.length == 1
      const hasCountsFile = this.$refs.countsFileUpload.files.length == 1
      if (hasCountsFile && !hasScoresFile) {
        this.clientSideValidationErrors.scoresFile = 'Required'
      }
      if (!this.item && !hasScoresFile) {
        this.clientSideValidationErrors.scoresFile = 'Required'
      }

      this.serverSideValidationErrors = {}
      this.mergeValidationErrors()

      if (_.isEmpty(this.validationErrors)) {
        await this.save()
      }
    },

    saveExisting: async function() {
      await this.save()
    },
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem: function() {
      if (this.item) {
        this.$router.replace({path: `/scoresets/${this.item.urn}`})
      }
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

/* Form fields */

.mave-reference-genome-none {
  min-width: 300px;
}

.mave-reference-genome-name {
  float: left;
  padding: 10px;
  min-width: 120px;
  margin: 0 5px 0 0;
  background: #eee;
}

.mave-reference-genome-organism-name {
  padding: 10px;
  margin-left: 125px;
  background: #f9f9f9;
}

.p-dropdown-item:nth-child(even) .mave-reference-genome-name {
  background: #ddd;
}

.p-dropdown-item:nth-child(even) .mave-reference-genome-organism-name {
  background: #e9e9e9;
}

/* Cards */

.mave-scoreset-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0,0,0,0.05);
}

.mave-scoreset-editor:deep(.p-card .p-card-title) {
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

<style>

.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item {
  padding: 0;
}

.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
  background: #eef;
}

.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-reference-genome-name,
.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-reference-genome-organism-name {
  background: #eef;
}

</style>
