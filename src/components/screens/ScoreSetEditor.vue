<template>
  <DefaultLayout>
    <div class="mave-score-set-editor">
      <div class="grid">
        <div class="col-12">
          <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit score set {{this.item.urn}}</div>
            <div v-if="item" class="mave-screen-title-controls">
              <Button @click="saveEditContent">Save changes</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="viewItem" class="p-button-warning">Cancel</Button>
            </div>
          </div>
          <div v-else class="mave-screen-title-bar">
            <div class="mave-screen-title">Create a new score set</div>
            <div class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="backDashboard" class="p-button-warning">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #title>Parent experiment and context</template>
            <template #content>
              <div v-if="itemStatus != 'NotLoaded' && item.experiment">
                Experiment:
                <router-link :to="{name: 'experiment', params: {urn: item.experiment.urn}}">{{item.experiment.title}}</router-link>
              </div>
              <div v-else>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                      v-model="experiment"
                      :id="$scopedId('input-experiment')"
                      :options="editableExperiments"
                      optionLabel="title"
                      v-on:change="populateExperimentMetadata"
                    />
                    <label :for="$scopedId('input-experiment')">Experiment</label>
                  </span>
                  <span v-if="validationErrors.experiment" class="mave-field-error">{{validationErrors.experiment}}</span>
                </div>
              </div>
              <div v-if="itemStatus != 'NotLoaded' && supersedesScoreSet">
                Supersedes:
                <router-link :to="{name: 'scoreSet', params: {urn: supersedesScoreSet.urn}}">{{supersedesScoreSet.title}}</router-link>
              </div>
              <div v-if="itemStatus == 'NotLoaded'" class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="supersededScoreSetInput"
                      v-model="supersededScoreSet"
                      :id="$scopedId('input-supersededScoreSet')"
                      field="title"
                      :forceSelection="true"
                      :suggestions="supersededScoreSetSuggestionsList"
                      @complete="searchSupersededScoreSets"
                  >
                    <template #item="slotProps">
                      {{slotProps.item.urn}}: {{slotProps.item.title}}
                    </template>
                  </AutoComplete>
                  <label :for="$scopedId('input-supersededScoreSet')">Supersedes</label>
                </span>
                <span v-if="validationErrors.supersededScoreSetUrn" class="mave-field-error">{{validationErrors.supersededScoreSetUrn}}</span>
              </div>
              <div v-if="itemStatus != 'NotLoaded' && metaAnalysisSourceScoreSets.length > 0">
                Meta-analysis for:<br />
                <div v-for="metaAnalysisSourceScoreSet of metaAnalysisSourceScoreSets" :key="metaAnalysisSourceScoreSet">
                  <router-link :to="{name: 'scoreSet', params: {urn: metaAnalysisSourceScoreSet.urn}}">{{metaAnalysisSourceScoreSet.title}}</router-link>
                </div>
              </div>
              <div v-if="itemStatus == 'NotLoaded'" class="field">
                <span class="p-float-label">
                  <AutoComplete
                      ref="metaAnalysisSourceScoreSetsInput"
                      v-model="metaAnalysisSourceScoreSets"
                      :id="$scopedId('input-metaAnalysisSourceScoreSets')"
                      field="title"
                      :forceSelection="true"
                      :multiple="true"
                      :suggestions="metaAnalysisSourceScoreSetSuggestionsList"
                      @complete="searchMetaAnalysisSourceScoreSets"
                  >
                    <template #item="slotProps">
                      {{slotProps.item.urn}}: {{slotProps.item.title}}
                    </template>
                  </AutoComplete>
                  <label :for="$scopedId('input-metaAnalysisSourceScoreSets')">Meta-analysis for</label>
                </span>
                <span v-if="validationErrors.metaAnalysisSourceScoreSetUrns" class="mave-field-error">{{validationErrors.metaAnalysisSourceScoreSetUrns}}</span>
              </div>
            </template>
          </Card>
          <Card>
            <template #title>Score set information</template>
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
                    <Dropdown
                        v-model="licenseId"
                        :id="$scopedId('input-targetLicenseId')"
                        :options="licenses"
                        optionLabel="longName"
                        optionValue="id"
                    />
                    <label :for="$scopedId('input-targetLicenseId')">License</label>
                  </span>
                  <span v-if="validationErrors['targetGene.taxonomy']" class="mave-field-error">{{validationErrors['targetGene.taxonomy']}}</span>
                </div>
                <Message v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName != 'CC0'" severity="warn">
                    Choosing a license with these restrictions may cause your dataset to be excluded from data federation and aggregation by MaveDB collaborators.
                </Message>
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
                        ref="publicationIdentifiersInput"
                        v-model="publicationIdentifiers"
                        :id="$scopedId('input-publicationIdentifiers')"
                        field="identifier"
                        :multiple="true"
                        :suggestions="publicationIdentifierSuggestionsList"
                        @complete="searchPublicationIdentifiers"
                        @keyup.enter="acceptNewPublicationIdentifier"
                        @keyup.escape="clearPublicationIdentifierSearch"
                    />
                    <label :for="$scopedId('input-publicationIdentifiers')">PubMed IDs</label>
                  </span>
                  <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{validationErrors.publicationIdentifiers}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label" style="display:block">
                  <Multiselect
                    ref="primaryPublicationInput"
                    v-model="primaryPublicationIdentifiers"
                    :id="$scopedId('input-primaryPublicationIdentifiers')"
                    :options="publicationIdentifiers"
                    optionLabel="identifier"
                    placeholder="Select a primary publication (Where the dataset is described)"
                    :selectionLimit="1"
                  />
                  <!-- label overlaps with placeholder when none are selected without this v-if -->
                  <label v-if="this.primaryPublicationIdentifiers.length > 0" :for="$scopedId('input-primaryPublicationIdentifiers')">Primary publication</label>
                </span>
                <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{validationErrors.primaryPublicationIdentifiers}}</span>
              </div>
              <Message v-if="experiment" severity="info">
                  Some fields were autopopulated based on the selected experiment and should be inspected to ensure they are still relevant to this score set.
              </Message>
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
          <div v-if="itemStatus == 'NotLoaded' || this.item.private">
            <Card>
              <template #title>Target gene</template>
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
                <div v-for="dbName of externalGeneDatabases" class="field field-columns" :key="dbName">
                  <div class="field-column">
                    <span class="p-float-label">
                      <AutoComplete
                          :ref="`${dbName.toLowerCase()}IdentifierInput`"
                          v-model="targetGene.externalIdentifiers[dbName].identifier"
                          :id="$scopedId(`input-${dbName.toLowerCase()}Identifier`)"
                          field="identifier"
                          :suggestions="targetGeneIdentifierSuggestionsList[dbName]"
                          @blur="acceptNewTargetGeneIdentifier(dbName)"
                          @complete="searchTargetGeneIdentifiers(dbName, $event)"
                          @keyup.enter="acceptNewTargetGeneIdentifier(dbName)"
                          @keyup.escape="clearTargetGeneIdentifierSearch(dbName)"
                      />
                      <label :for="$scopedId(`input-${dbName.toLowerCase()}Identifier`)">{{dbName}} identifier</label>
                    </span>
                    <span v-if="validationErrors[`targetGene.externalIdentifiers.${dbName}.identifier.identifier`]" class="mave-field-error">{{validationErrors[`targetGene.externalIdentifiers.${dbName}.identifier.identifier`]}}</span>
                  </div>
                  <div class="field-column">
                    <span class="p-float-label">
                      <InputNumber
                          v-model="targetGene.externalIdentifiers[dbName].offset"
                          :id="$scopedId(`input-${dbName.toLowerCase()}Offset`)"
                          buttonLayout="stacked"
                          min="0"
                          showButtons
                          suffix=" bp"
                      />
                      <label :for="$scopedId(`input-${dbName.toLowerCase()}Offset`)">Offset</label>
                    </span>
                    <span v-if="validationErrors[`targetGene.externalIdentifiers.${dbName}.offset`]" class="mave-field-error">{{validationErrors[`targetGene.externalIdentifiers.${dbName}.offset`]}}</span>
                  </div>
                </div>
                <!--
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown 
                        v-model="taxonomy"
                        :id="$scopedId('input-targetGeneTaxonomy')"
                        :options="taxonomies"
                        panelClass="mave-taxonomy-dropdown-panel"
                        filter optionLabel="organismName"
                        placeholder="Select a Taxonomy"
                    >
                      <template #value="slotProps">
                        <div v-if="slotProps.value" class="mave-taxonomy-value">
                          <div class="mave-taxonomy-common-name">{{slotProps.value.taxId}}</div>
                          <div class="mave-taxonomy-organism-name">{{slotProps.value.organismName}}</div>
                        </div>
                        <div v-else class="mave-taxonomy-none">&nbsp;</div>
                      </template>
                      <template #option="slotProps">
                        <div class="mave-taxonomy-common-name">{{slotProps.option.taxId}}</div>
                        <div class="mave-taxonomy-organism-name">{{slotProps.option.organismName}}</div>
                      </template>
                    </Dropdown>
                    <label :for="$scopedId('input-targetGeneTaxonomy')">Taxonomy</label>
                  </span>
                  <span v-if="validationErrors['targetGene.taxonomy']" class="mave-field-error">{{validationErrors['targetGene.taxonomy']}}</span>
                </div>
                :options="taxonomies"
                -->
                
                <div class="field">
                  <span class="p-float-label">
                    <AutoComplete
                    ref="taxonomyInput" 
                    v-model="taxonomy" 
                    :dropdown="true"
                    :id="$scopedId('input-targetGeneTaxonomy')"
                    :suggestions="taxonomySuggestionsList" 
                    field="taxonomyFieldName"
                    :multiple="false"
                    :forceSelection="true"
                    :options="taxonomies"
                    @complete="searchTaxonomies"
                    @blur="acceptNewTaxonomy"
                    @keyup.enter="acceptNewTaxonomy"
                    @keyup.escape="clearTaxonomySearch">
                      <template #item="slotProps">
                        {{slotProps.item.taxId}} - {{slotProps.item.organismName}} <template v-if="slotProps.item.commonName!='NULL'">/{{slotProps.item.commonName}}</template>
                      </template>
                    </AutoComplete>
                    <label :for="$scopedId('input-targetGeneTaxonomy')">Taxonomy</label>
                  </span>
                  <span v-if="validationErrors['targetGene.taxonomy']" class="mave-field-error">{{validationErrors['targetGene.taxonomy']}}</span>
                </div>

                <!--<AutoComplete
                        ref="taxonomyInput"
                        v-model="taxonomies"
                        :id="$scopedId('input-targetGeneTaxonomy')"
                        dropdown
                        :suggestions="taxonomySuggestionsList"
                        :multiple="false"
                        field="organismName"
                        @complete="searchTaxonomies"
                        @blur="acceptNewTaxonomy"
                        @keyup.enter="acceptNewTaxonomy"
                        @keyup.escape="clearTaxonomySearch"
                    />-->
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
              <template #title>Variant scores</template>
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
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import {useForm} from 'vee-validate'
import {ref} from 'vue'

import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizeIdentifier, normalizePubmedId, validateDoi, validateIdentifier,validateTaxonomy, validatePubmedId} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'

const externalGeneDatabases = ['UniProt', 'Ensembl', 'RefSeq']

export default {
  name: 'ScoreSetEditor',
  components: { AutoComplete, Button, Card, Chips, DefaultLayout, Dropdown, FileUpload, InputNumber, InputText, Message, Multiselect, ProgressSpinner, SelectButton, TabPanel, TabView, Textarea},

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
    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({itemTypeName: `${dbName.toLowerCase()}-identifier-search`})
    }
    const licenses = useItems({itemTypeName: 'license'})
    const taxonomies = useItems({itemTypeName: 'taxonomy'})
    const taxonomySuggestions = useItems({itemTypeName: 'taxonomy-search'})
    const targetGeneSuggestions = useItems({itemTypeName: 'target-gene-search'})
    const {errors: validationErrors, handleSubmit, setErrors: setValidationErrors} = useForm()
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'scoreSet'}),
      editableExperiments: editableExperiments.items,
      licenses: licenses.items,
      doiIdentifierSuggestions: doiIdentifierSuggestions.items,
      setDoiIdentifierSearch: (text) => doiIdentifierSuggestions.setRequestBody({text}),
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({text}),
      targetGeneSuggestions: targetGeneSuggestions.items,
      setTargetGeneSearch: (text) => targetGeneSuggestions.setRequestBody({text}),
      targetGeneIdentifierSuggestions: ref({
        ..._.mapValues(targetGeneIdentifierSuggestions, (itemsModule) => itemsModule.items)
      }),
      setTargetGeneIdentifierSearch: _.mapValues(targetGeneIdentifierSuggestions, (itemsModule) =>
        (text) => {
          itemsModule.setRequestBody({text})
          itemsModule.ensureItemsLoaded()
        }
      ),
      taxonomies: taxonomies.items,
      taxonomySuggestions: taxonomySuggestions.items,
      setTaxonomySearch: (text) => taxonomySuggestions.setRequestBody({text}),
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
    experiment: null,
    licenseId: null,
    title: null,
    metaAnalysisSourceScoreSets: [],
    supersededScoreSet: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    keywords: [],
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    dataUsagePolicy: null,
    targetGene: {
      name: null,
      category: null,
      type: null,
      wtSequence: {
        sequenceType: null,
        sequence: null
      },
      externalIdentifiers: _.fromPairs(
        externalGeneDatabases.map((dbName) => [dbName, {identifier: null, offset: null}])
      )
    },
    taxonomy: null,
    extraMetadata: {},

    existingTargetGene: null,

    // Static sets of options:
    sequenceTypes: [
      'DNA',
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
    },
    externalGeneDatabases,
    metaAnalysisSourceScoreSetSuggestions: [],
    supersededScoreSetSuggestions: []
  }),

  computed: {
    targetGeneIdentifierSuggestionsList: function() {
      return _.fromPairs(
        externalGeneDatabases.map((dbName) => {
          const suggestions = this.targetGeneIdentifierSuggestions[dbName]
          return [dbName, this.suggestionsForAutocomplete(suggestions)]
        })
      )
    },
    doiIdentifierSuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.doiIdentifierSuggestions)
    },
    metaAnalysisSourceScoreSetSuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.metaAnalysisSourceScoreSetSuggestions)
    },
    publicationIdentifierSuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.publicationIdentifierSuggestions)
    },
    supersededScoreSetSuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.supersededScoreSetSuggestions)
    },
    targetGeneSuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.targetGeneSuggestions)
    },
    taxonomySuggestionsList: function() {
      console.log("hahah")
      console.log(this.suggestionsForAutocomplete(this.taxonomySuggestions))
      return this.suggestionsForAutocomplete(this.taxonomySuggestions)
    },
    defaultLicenseId: function() {
      return this.licenses ? this.licenses.find((license) => license.shortName == 'CC0')?.id : null
    }
  },

  watch: {
    'targetGene.externalIdentifiers': {
      deep: true,
      handler: function(newValue) {
        // If an identifier has been set, set the offset to 0 by default.
        for (const dbName of externalGeneDatabases) {
          if (newValue[dbName]?.identifier?.identifier != null && newValue[dbName]?.offset == null) {
            this.targetGene.externalIdentifiers[dbName].offset = 0
          }
        }
      }
    },
    existingTargetGene: function() {
      if (_.isObject(this.existingTargetGene)) {
        // _.cloneDeep is needed because the target gene has been frozen.
        // this.targetGene = _.cloneDeep(this.existingTargetGene)
        const targetGene = _.cloneDeep(this.existingTargetGene)
        this.targetGene = _.merge({
          name: null,
          category: null,
          type: null,
          wtSequence: {
            sequenceType: null,
            sequence: null
          }
        }, targetGene)
        this.targetGene.externalIdentifiers = {}
        for (const dbName of externalGeneDatabases) {
          this.targetGene.externalIdentifiers[dbName] = (targetGene.externalIdentifiers || [])
              .find(({identifier}) => identifier?.dbName == dbName) || {
                identifier: null,
                offset: null
              }
        }

        const taxonomyId = _.get(this.targetGene, 'taxonomy.taxId')
        this.taxonomy = this.taxonomies.find((ta) => ta.taxId == taxonomyId)
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
    },
    defaultLicenseId: {
      handler: function() {
        if (this.licenseId == null) {
          this.licenseId = this.defaultLicenseId
        }
      }
    }
  },

  methods: {

    suggestionsForAutocomplete: function(suggestions) {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      if (!suggestions || suggestions.length == 0) {
        return [{}]
      }
      return suggestions
    },

    searchMetaAnalysisSourceScoreSets: async function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.metaAnalysisSourceScoreSetSuggestions = await this.searchScoreSets(searchText)
      }
    },

    searchSupersededScoreSets: async function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.supersededScoreSetSuggestions = await this.searchScoreSets(searchText, true)
      }
    },

    searchScoreSets: async function(searchText, mine=false) {
      const url = mine ? `${config.apiBaseUrl}/me/score-sets/search` : `${config.apiBaseUrl}/score-sets/search`
      try {
        const response = await axios.post(
          url,
          {
            text: searchText || null
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
        return []
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    populateExperimentMetadata: function(event) {
      this.doiIdentifiers = event.value.doiIdentifiers
      this.keywords = event.value.keywords
      this.publicationIdentifiers = _.concat(event.value.primaryPublicationIdentifiers, event.value.secondaryPublicationIdentifiers)
      this.primaryPublicationIdentifiers = event.value.primaryPublicationIdentifiers.filter((primary) => {
          return this.publicationIdentifiers.some((publication) => {
            return primary.identifier === publication.identifier
          })
        })
    },

    acceptNewDoiIdentifier: function() {
      const input = this.$refs.doiIdentifiersInput
      const searchText = (input.inputTextValue || '').trim()
      if (validateDoi(searchText)) {
        const doi = normalizeDoi(searchText)
        this.doiIdentifiers = _.uniqBy([...this.doiIdentifiers, {identifier: doi}])
        input.inputTextValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        // input.$refs.input.value = ''
      }
    },

    clearDoiIdentifierSearch: function() {
      const input = this.$refs.doiIdentifiersInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      // input.$refs.input.value = ''
    },

    searchDoiIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setDoiIdentifierSearch(event.query)
      }
    },

    // TODO accept other publication identifiers besides pubmed
    acceptNewPublicationIdentifier: function() {
      const input = this.$refs.publicationIdentifiersInput
      const searchText = (input.inputTextValue || '').trim()
      if (validatePubmedId(searchText)) {
        const pubmedId = normalizePubmedId(searchText)
        this.publicationIdentifiers = _.uniqBy([...this.publicationIdentifiers, {identifier: pubmedId}])
        input.inputTextValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        input.$refs.input.value = ''
      }
    },

    clearPublicationIdentifierSearch: function() {
      const input = this.$refs.publicationIdentifiersInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    },

    searchPublicationIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
      }
    },

    acceptNewTargetGeneIdentifier: function(dbName) {
      const input = this.$refs[`${dbName.toLowerCase()}IdentifierInput`][0]
      const searchText = (input.inputTextValue || '').trim()

      // Only accept the current search text if we haven't set an identifier. When the user starts typing, the current
      // identifier is cleared.
      const currentIdentifier = this.targetGene.externalIdentifiers[dbName]?.identifier
      if (!currentIdentifier) {
        if (searchText == '') {
          this.targetGene.externalIdentifiers[dbName].identifier = null
        } else if (validateIdentifier(dbName, searchText)) {
          const identifier = normalizeIdentifier(dbName, searchText)
          this.targetGene.externalIdentifiers[dbName].identifier = {identifier}
          input.inputTextValue = null

          // Clear the text input.
          // TODO This depends on PrimeVue internals more than I'd like:
          input.$refs.input.value = ''
        }
      }
    },

    clearTargetGeneIdentifierSearch: function(dbName) {
      const input = this.$refs[`${dbName.toLowerCase()}IdentifierInput`][0]
      this.targetGene.externalIdentifiers[dbName].identifier = null
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    },

    searchTargetGeneIdentifiers: function(dbName, event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.targetGene.externalIdentifiers[dbName].identifier = null
        this.setTargetGeneIdentifierSearch[dbName](searchText)
      }
    },

    searchTargetGenes: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setTargetGeneSearch(event.query)
      }
    },


    acceptNewTaxonomy: async function() {
      const input = this.$refs.taxonomyInput
      const searchText = (input.inputTextValue || '').trim()
      const newTaxonomyResponse = await validateTaxonomy(searchText)
      console.log("222")
      console.log(newTaxonomyResponse)
    if (newTaxonomyResponse === false) {
      this.$toast.add({ severity: 'error', summary: 'Invalid Taxonomy.', life: 3500 })
    } else {
      this.taxonomy = newTaxonomyResponse
      console.log("223")
      //console.log(this.taxonomy)
      //console.log(newTaxonomyResponse.organism_name)
      input.inputTextValue = null
      // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
    }
  },

    clearTaxonomySearch: function() {
      const input = this.$refs.taxonomyInput
      input.inputTextValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      // input.$refs.input.value = ''
    },

    searchTaxonomies: function(event) {
      const searchText = (event.query || '').trim()
      //let taxonomyList = [{"taxId":1515,"organismName":"Acetivibrio thermocellus","commonName":"NULL","rank":"SPECIES","hasDescribedSpeciesName":true,"articleReference":"NCBI:txid1515","genomeId":null,"id":88,"url":"https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=info&id=1515"},{"taxId":203119,"organismName":"Acetivibrio thermocellus ATCC 27405","commonName":"NULL","rank":"STRAIN","hasDescribedSpeciesName":false,"articleReference":"NCBI:txid203119","genomeId":null,"id":41,"url":"https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=info&id=203119"}]
      if (searchText.length > 0) {
        this.setTaxonomySearch(event.query)
      }else{
        this.taxonomySuggestionsList.value = this.taxonomies
        console.log("111")
        console.log(this.taxonomySuggestionsList)
        console.log(this.taxonomySuggestionsList.value)
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
      if (this.item) {
        this.experiment = this.item.experiment
        this.licenseId = this.item.license.id
        this.metaAnalysisSourceScoreSets = this.item.metaAnalysisSourceScoreSets
        this.supersededScoreSet = this.item.supersededScoreSet
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.keywords = this.item.keywords
        this.doiIdentifiers = this.item.doiIdentifiers
        // So that the multiselect can populate correctly, build the primary publication identifiers
        // indirectly by filtering a merged list of secondary and primary publication identifiers
        this.publicationIdentifiers = _.concat(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
        this.primaryPublicationIdentifiers = this.item.primaryPublicationIdentifiers.filter((publication) => {
          return this.publicationIdentifiers.some((primary) => {
            return primary.identifier === publication.identifier
          })
        })
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
        this.targetGene.externalIdentifiers = {}
        for (const dbName of externalGeneDatabases) {
          this.targetGene.externalIdentifiers[dbName] =  (this.item.targetGene.externalIdentifiers || [])
              .find(({identifier}) => identifier?.dbName == dbName) || {
                identifier: null,
                offset: null
              }
        }
        this.taxonomy = this.item.taxonomy
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.experiment = null
        this.licenseId = this.defaultLicenseId
        this.metaAnalysisSourceScoreSets = []
        this.supersededScoreSet = null
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.keywords = []
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
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
        this.targetGene.externalIdentifiers = {}
        for (const dbName of externalGeneDatabases) {
          this.targetGene.externalIdentifiers[dbName] =  {
            identifier: null,
            offset: null
          }
        }
        this.taxonomy = null
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
        experimentUrn: this.experiment?.urn,
        licenseId: this.licenseId,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: this.primaryPublicationIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        publicationIdentifiers: this.publicationIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        dataUsagePolicy: this.dataUsagePolicy,
        extraMetadata: {},
        targetGene: {
          name: _.get(this.targetGene, 'name'),
          category: _.get(this.targetGene, 'category'),
          type: _.get(this.targetGene, 'type'),
          taxonomy: {
            //taxonomyId: _.get(this.taxonomy, 'id'),
            taxId: _.get(this.taxonomy, 'taxId'),
            organismName: _.get(this.taxonomy, 'organismName'),
            commonName: _.get(this.taxonomy, 'commonName'),
            rank: _.get(this.taxonomy, 'rank'),
            hasDescribedSpeciesName: _.get(this.taxonomy, 'hasDescribedSpeciesName'),
            articleReference: _.get(this.taxonomy, 'articleReference'),
          },
          wtSequence: {
            sequenceType: _.get(this.targetGene, 'wtSequence.sequenceType'),
            sequence: _.get(this.targetGene, 'wtSequence.sequence')
          },
          externalIdentifiers: _.keys(this.targetGene.externalIdentifiers).map((dbName) =>{
            const identifierOffset = this.targetGene.externalIdentifiers[dbName]
            if (identifierOffset.identifier != null || (identifierOffset != null && identifierOffset.offset > 0)) {
              return {
                offset: identifierOffset.offset,
                identifier: {
                  identifier: identifierOffset.identifier?.identifier,
                  dbName
                }
              }
            } else {
              return null
            }
          }).filter(Boolean)
        }
      }
      if (!this.item) {
        editedFields.supersededScoreSetUrn = this.supersededScoreSet ? this.supersededScoreSet.urn : null
        editedFields.metaAnalysisSourceScoreSetUrns = (this.metaAnalysisSourceScoreSets || []).map((s) => s.urn)
      }
      else {
        // empty item arrays so that deleted items aren't merged back into editedItem object
        this.item.keywords = []
        this.item.doiIdentifiers = []
        this.item.primaryPublicationIdentifiers = []
        this.item.publicationIdentifiers = []
        this.item.rawReadIdentifiers = []
      }

      const editedItem = _.merge({}, this.item || {}, editedFields)
      console.log("1212")
      console.log(editedItem)

      this.progressVisible = true
      let response = null
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/score-sets/${this.item.urn}`, editedItem)
        } else {
          response = await axios.post(`${config.apiBaseUrl}/score-sets/`, editedItem)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      this.progressVisible = false
      if (response.status == 200) {
        const savedItem = response.data
        this.setValidationErrors({})
        if (this.item) {
          if (this.$refs.scoresFileUpload?.files?.length == 1) {
            await this.uploadData(savedItem)
          } else {
            this.$router.replace({path: `/score-sets/${this.item.urn}`})
            this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
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

          // Map errors on indexed external gene identifiers to inputs named for the identifier's database.
          if (_.isEqual(_.slice(path, 0, 2), ['targetGene', 'externalIdentifiers'])) {
            const identifierIndex = path[2]
            const identifierOffset = editedFields.targetGene.externalIdentifiers[identifierIndex]
            if (identifierOffset?.identifier?.dbName) {
              path.splice(2, 1, identifierOffset.identifier.dbName)
            }
          }

          path = path.join('.')
          formValidationErrors[path] = error.msg
        }
        this.serverSideValidationErrors = formValidationErrors
        this.mergeValidationErrors()
      }
    },

    uploadData: async function(scoreSet) {
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
            `${config.apiBaseUrl}/score-sets/${scoreSet.urn}/variants/data`,
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
          console.log('Imported score set data.')
          if (this.item) {
            // this.reloadItem()
            this.$router.replace({path: `/score-sets/${scoreSet.urn}`})
            this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
          } else {
            this.$router.replace({path: `/score-sets/${scoreSet.urn}`})
            this.$toast.add({severity:'success', summary: 'The new score set was saved.', life: 3000})
          }
        } else {
          this.$toast.add({severity:'error', summary: 'The score and count files could not be imported.', life: 3000})

          // Delete the score set if just created.
          // Warn if the score set already exists.
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

    //Editing published score set doesn't have scoresFileUpload.
    saveEditContent: async function() {
      await this.save()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem: function() {
      if (this.item) {
        this.$router.replace({path: `/score-sets/${this.item.urn}`})
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

.field-columns {
  display: flex;
  flex-direction: row
}

.field-column {
  position: relative;
  flex: 1 1 auto;
  margin-left: 10px;
}

.field-column:first-child {
  margin-left: 0;
}

/* Form fields */

.mave-taxonomy-none {
  min-width: 300px;
}

.mave-taxonomy-common-name {
  float: left;
  padding: 10px;
  min-width: 120px;
  margin: 0 5px 0 0;
  background: #eee;
}

.mave-taxonomy-organism-name {
  padding: 10px;
  margin-left: 125px;
  background: #f9f9f9;
}

.p-dropdown-item:nth-child(even) .mave-taxonomy-common-name {
  background: #ddd;
}

.p-dropdown-item:nth-child(even) .mave-taxonomy-organism-name {
  background: #e9e9e9;
}

/* Cards */

.mave-score-set-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0,0,0,0.05);
}

.mave-score-set-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51B5;
  margin-bottom: 0;
}

.mave-score-set-editor:deep(.p-card-content) {
  padding: 0;
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

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item {
  padding: 0;
}

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
  background: #eef;
}

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-taxonomy-common-name,
.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-taxonomy-organism-name {
  background: #eef;
}

</style>
