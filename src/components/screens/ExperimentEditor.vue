<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <DefaultLayout :require-auth="true">
    {{ experimentSetUrn }}
    <div class="mave-experiment-editor">
      <div class="grid">
        <div class="col-12">
          <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit experiment {{ item.urn }}</div>
            <div v-if="item" class="mavedb-screen-title-controls">
              <Button @click="validateAndSave">Save changes</Button>
              <Button severity="help" @click="resetForm">Clear</Button>
              <Button severity="warn" @click="viewItem">Cancel</Button>
            </div>
          </div>
          <div v-else class="mave-screen-title-bar">
            <div class="mave-screen-title">Create a new experiment</div>
            <div class="mavedb-screen-title-controls">
              <Button @click="validateAndSave">Save experiment</Button>
              <Button severity="help" @click="resetForm">Clear</Button>
              <Button severity="warn" @click="backDashboard">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
              <div v-if="experimentSetUrn" class="field">
                <label :for="scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px"
                  >Experiment set:</label
                >
                <span :id="scopedId('field-value-experiment-set')">{{ experimentSetUrn }}</span>
                <span v-if="validationErrors.experimentSetUrn" class="mave-field-error">{{
                  validationErrors.experimentSetUrn
                }}</span>
                <div v-if="!item" class="mave-field-help">
                  To add an experiment to a different set, please navigate to the experiment set first and click "Add
                  experiment."
                </div>
              </div>
              <div v-else class="field">
                <label :for="scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px"
                  >Experiment set:</label
                >
                <span :id="scopedId('field-value-experiment-set')">(New experiment set)</span>
                <div class="mave-field-help">
                  To add an experiment to an existing set, please navigate to the experiment set first and click "Add
                  experiment."
                </div>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <InputText :id="scopedId('input-title')" v-model="title" />
                  <label :for="scopedId('input-title')">Title</label>
                </FloatLabel>
                <span v-if="validationErrors.title" class="mave-field-error">{{ validationErrors.title }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <Textarea :id="scopedId('input-shortDescription')" v-model="shortDescription" rows="4" />
                  <label :for="scopedId('input-shortDescription')">Short description</label>
                </FloatLabel>
                <span v-if="validationErrors.shortDescription" class="mave-field-error">{{
                  validationErrors.shortDescription
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                 <AutoComplete
                    :id="scopedId('input-doiIdentifiers')"
                    ref="doiIdentifiersInput"
                    v-model="doiIdentifiers"
                    :multiple="true"
                    option-label="identifier"
                    :typeahead="false"
                    @blur="updateDoiIdentifiers"
                    @keyup.escape="clearAutoCompleteInput"
                    @keyup.space="updateDoiIdentifiers"
                    @update:model-value="newDoiIdentifiersAdded"
                  />
                  <label :for="scopedId('input-doiIdentifiers')">DOIs</label>
                </FloatLabel>
                <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{
                  validationErrors.doiIdentifiers
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <AutoComplete
                    :id="scopedId('input-publicationIdentifiers')"
                    v-model="publicationIdentifiers"
                    :multiple="true"
                    :option-label="(x) => `${x.identifier}: ${truncatePublicationTitle(x.title)}`"
                    :suggestions="publicationIdentifierSuggestionsList"
                    @blur="clearAutoCompleteInput"
                    @complete="searchPublicationIdentifiers"
                    @keyup.escape="clearAutoCompleteInput"
                    @option-select="acceptNewPublicationIdentifier"
                  >
                    <template #option="slotProps">
                      <div>
                        <div>Title: {{ slotProps.option.title }}</div>
                        <div>DOI: {{ slotProps.option.doi }}</div>
                        <div>Identifier: {{ slotProps.option.identifier }}</div>
                        <div>Database: {{ slotProps.option.dbName }}</div>
                      </div>
                    </template>
                  </AutoComplete>
                  <label :for="scopedId('input-publicationIdentifiers')">Publication identifiers</label>
                </FloatLabel>
                <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{
                  validationErrors.publicationIdentifiers
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <Multiselect
                    :id="scopedId('input-primaryPublicationIdentifiers')"
                    v-model="primaryPublicationIdentifiers"
                    class="p-inputwrapper-filled"
                    option-label="identifier"
                    :options="publicationIdentifiers"
                    placeholder="Select a primary publication (Where the dataset is described)"
                    :selection-limit="1"
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
                  <label :for="scopedId('input-primaryPublicationIdentifiers')">Primary publication</label>
                </FloatLabel>
                <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{
                  validationErrors.primaryPublicationIdentifiers
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <AutoComplete
                    :id="scopedId('input-rawReadIdentifiers')"
                    ref="rawReadIdentifiersInput"
                    v-model="rawReadIdentifiers"
                    :multiple="true"
                    option-label="identifier"
                    :typeahead="false"
                    @blur="updateRawReadIdentifiers"
                    @keyup.escape="clearAutoCompleteInput"
                    @keyup.space="updateRawReadIdentifiers"
                    @update:model-value="newRawReadIdentifiersAdded"
                  />
                  <label :for="scopedId('input-rawReadIdentifiers')">Raw Read</label>
                </FloatLabel>
                <span v-if="validationErrors.rawReadIdentifiers" class="mave-field-error">{{
                  validationErrors.rawReadIdentifiers
                }}</span>
              </div>
              <div class="field">
                <Tabs value="0">
                  <TabList>
                    <Tab value="0">Edit</Tab>
                    <Tab value="1">Preview</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel header="Edit" value="0">
                      <FloatLabel variant="on">
                        <Textarea :id="scopedId('input-abstractText')" v-model="abstractText" rows="4" />
                        <label :for="scopedId('input-abstractText')">Abstract</label>
                      </FloatLabel>
                    </TabPanel>
                    <TabPanel header="Preview" value="1">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div v-html="markdownToHtml(abstractText)"></div>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
                <span v-if="validationErrors.abstractText" class="mave-field-error">{{
                  validationErrors.abstractText
                }}</span>
              </div>
              <div class="field">
                <Tabs value="0">
                  <TabList>
                    <Tab value="0">Edit</Tab>
                    <Tab value="1">Preview</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel header="Edit" value="0">
                      <FloatLabel variant="on">
                        <Textarea :id="scopedId('input-methodText')" v-model="methodText" rows="4" />
                        <label :for="scopedId('input-methodText')">Methods</label>
                      </FloatLabel>
                    </TabPanel>
                    <TabPanel header="Preview" value="1">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div v-html="markdownToHtml(methodText)"></div>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
                <span v-if="validationErrors.methodText" class="mave-field-error">{{
                  validationErrors.methodText
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <AutoComplete
                    :id="scopedId('input-contributors')"
                    v-model="contributors"
                    fluid
                    multiple
                    :option-label="(x) => x.givenName || x.familyName ? `${x.givenName} ${x.familyName} (${x.orcidId})` : x.orcidId"
                    :typeahead="false"
                    @blur="updateContributors"
                    @keyup.escape="clearAutoCompleteInput"
                    @keyup.space="updateContributors"
                    @update:model-value="newContributorsAdded"
                  />
                  <label :for="scopedId('input-contributors')">Contributors</label>
                </FloatLabel>
                <span v-if="validationErrors.contributors" class="mave-field-error">{{
                  validationErrors.contributors
                }}</span>
              </div>
              <div class="field">
                <FloatLabel variant="on">
                  <div v-if="extraMetadata">
                    <span class="mr-2">Extra metadata</span>
                    <i class="pi pi-check mr-3"></i>
                    <Button
                      v-tooltip="{value: 'View extra metadata'}"
                      class="mr-2"
                      icon="pi pi-eye"
                      severity="info"
                      @click="jsonToDisplay = JSON.stringify(extraMetadata, null, 2)"
                    ></Button>
                    <Button
                      v-tooltip="{value: 'Delete extra metadata'}"
                      class="mr-2"
                      icon="pi pi-times"
                      severity="danger"
                      @click="fileCleared('extraMetadataFile')"
                    ></Button>
                  </div>
                  <FileUpload
                    v-else
                    :id="scopedId('input-extraMetadataFile')"
                    accept="application/json"
                    :auto="false"
                    choose-label="Extra metadata"
                    :class="inputClasses.extraMetadataFile"
                    :custom-upload="true"
                    :file-limit="1"
                    :show-cancel-button="false"
                    :show-upload-button="false"
                    @remove="fileCleared('extraMetadataFile')"
                    @select="fileSelected('extraMetadataFile', $event)"
                  >
                    <template #empty>
                      <p>Drop a JSON file here.</p>
                    </template>
                  </FileUpload>
                </FloatLabel>
                <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{
                  validationErrors.extraMetadata
                }}</span>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 md:col-6">
          <Card class="keyword-editor">
            <template #content>
              <div class="field">
                <label style="font-weight: bold; margin-right: 3px">Keywords</label>
              </div>
              <div v-for="keyword in keywordData" :key="keyword.key">
                <div v-if="keywordVisibility[keyword.key]">
                  <div class="field">
                    <FloatLabel variant="on">
                      <Select
                        :id="scopedId(`keyword-input-${keyword.key}`)"
                        v-model="keywordKeys[keyword.key]"
                        class="keyword-dropdown"
                        :option-label="(option) => formatKeywordOptionLabel(option)"
                        option-value="label"
                        :options="getKeywordOptions(keyword.option)"
                      />
                      <label :for="scopedId(`keyword-input-${keyword.key}`)">{{ keyword.key }}</label>
                    </FloatLabel>
                    <Button
                      aria-label="Filter"
                      class="keyword-description-button"
                      :disabled="!keywordKeys[keyword.key] || keywordKeys[keyword.key] == 'Other' ? true : null"
                      :icon="
                        keywordTextVisible[keyword.key] || keywordKeys[keyword.key] === 'Other'
                          ? 'pi pi-minus'
                          : 'pi pi-file-edit'
                      "
                      rounded
                      @click="keywordToggleInput(keyword.key)"
                    />
                    <Button
                      aria-label="Delete"
                      class="keyword-description-button"
                      :disabled="!keywordKeys[keyword.key]"
                      icon="pi pi-times"
                      rounded
                      severity="danger"
                      @click="deleteKeyword(keyword.key)"
                    />
                    &nbsp;<i
                      class="pi pi-info-circle"
                      style="color: green; cursor: pointer"
                      @click="showDialog(keyword.key)"
                    />
                    <Dialog
                      v-model:visible="dialogVisible[keyword.key]"
                      :breakpoints="{'1199px': '75vw', '575px': '90vw'}"
                      :header="keyword.key"
                      modal
                      :style="{width: '50vw'}"
                    >
                      <p class="m-0">
                        {{ getKeywordOptions(keyword.option)[0].description }}
                      </p>
                    </Dialog>
                    <span v-if="validationErrors[`keywords.${keyword.key}`]" class="mave-field-error">{{
                      validationErrors[`keywords.${keyword.key}`]
                    }}</span>
                  </div>
                  <div v-if="keywordTextVisible[keyword.key] || keywordKeys[keyword.key] === 'Other'" class="field">
                    <FloatLabel variant="on" class="keyword-description-input">
                      <Textarea :id="scopedId('input-title')" v-model="keywordDescriptions[keyword.key]" rows="4" />
                      <label :for="scopedId('input-title')"
                        >{{ keyword.descriptionLabel }}
                        {{ keywordKeys[keyword.key] === 'Other' ? '(Required)' : '(Optional)' }}</label
                      >
                    </FloatLabel>
                    <span v-if="validationErrors[`keywordDescriptions.${keyword.key}`]" class="mave-field-error">
                      {{ validationErrors[`keywordDescriptions.${keyword.key}`] }}</span
                    >
                  </div>
                </div>
              </div>
              <div class="field space-x-2">
                <Button severity="help" @click="resetKeywords">Reset Keywords</Button>
                <Button severity="warn" @click="clearKeywords">Clear Keywords</Button>
              </div>
            </template>
          </Card>
          <Card v-if="item?.scoreSetUrns">
            <template #content>
              <div>{{ item.scoreSetUrns?.length }} score sets loaded</div>
            </template>
          </Card>
        </div>
      </div>
    </div>
    <ProgressSpinner v-if="progressVisible" class="mave-progress" />
    <Dialog
      v-model:visible="jsonToDisplay"
      :close-on-escape="true"
      modal
      :style="{maxWidth: '90%', width: '50rem'}"
      @close="jsonToDisplay = null"
    >
      <span style="white-space: pre-wrap; font-family: monospace">
        {{ jsonToDisplay }}
      </span>
    </Dialog>
  </DefaultLayout>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import {marked} from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import FloatLabel from 'primevue/floatlabel'
import Select from 'primevue/select'
import Multiselect from 'primevue/multiselect'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import TabPanels from 'primevue/tabpanels'
import Tab from 'primevue/tab'
import TabPanel from 'primevue/tabpanel'
import Textarea from 'primevue/textarea'
import {useHead} from '@unhead/vue'

import DefaultLayout from '@/components/layout/DefaultLayout'
import EmailPrompt from '@/components/common/EmailPrompt'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizeRawRead, validateDoi, validateRawRead} from '@/lib/identifiers'
import {ORCID_ID_REGEX} from '@/lib/orcid'

const KEYWORDS = [
  {
    key: 'Variant Library Creation Method',
    descriptionLabel: 'Variant Library Creation Method Description',
    option: 'variantLibraryKeywordOptions'
  },
  {
    key: 'Endogenous Locus Library Method System',
    descriptionLabel: 'Endogenous Locus Library Method System Description',
    option: 'endogenousSystemKeywordOptions'
  },
  {
    key: 'Endogenous Locus Library Method Mechanism',
    descriptionLabel: 'Endogenous Locus Library Method Mechanism Description',
    option: 'endogenousMechanismKeywordOptions'
  },
  {
    key: 'In Vitro Construct Library Method System',
    descriptionLabel: 'In Vitro Construct Library Method System Description',
    option: 'inVitroSystemKeywordOptions'
  },
  {
    key: 'In Vitro Construct Library Method Mechanism',
    descriptionLabel: 'In Vitro Construct Library Method Mechanism Description',
    option: 'inVitroMechanismKeywordOptions'
  },
  {
    key: 'Delivery Method',
    descriptionLabel: 'Delivery Method Description',
    option: 'deliveryMethodKeywordOptions'
  },
  {
    key: 'Molecular Mechanism Assessed',
    descriptionLabel: 'Molecular Mechanism Assessed Description',
    option: 'molecularMechanismAssessedKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Dimensionality',
    descriptionLabel: 'Phenotypic Assay Dimensionality Description',
    option: 'phenotypicDimensionalityKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Method',
    descriptionLabel: 'Phenotypic Assay Method Description',
    option: 'phenotypicMethodKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Mechanism',
    descriptionLabel: 'Phenotypic Assay Mechanism Description',
    option: 'phenotypicMechanismKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Model System',
    descriptionLabel: 'Phenotypic Assay Model System Description',
    option: 'phenotypicModelSystemKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Profiling Strategy',
    descriptionLabel: 'Phenotypic Assay Profiling Strategy Description',
    option: 'phenotypicProfilingStrategyKeywordOptions'
  },
  {
    key: 'Phenotypic Assay Sequencing Read Type',
    descriptionLabel: 'Phenotypic Assay Sequencing Read Type Description',
    option: 'phenotypicSequencingTypeKeywordOptions'
  }
]

// Used for save function
const KEYWORD_GROUPS = {
  'Endogenous locus library method': [
    'Variant Library Creation Method',
    'Endogenous Locus Library Method System',
    'Endogenous Locus Library Method Mechanism'
  ],
  'In vitro construct library method': [
    'Variant Library Creation Method',
    'In Vitro Construct Library Method System',
    'In Vitro Construct Library Method Mechanism'
  ],
  Other: ['Variant Library Creation Method']
}

export default {
  name: 'ExperimentEditor',

  components: {
    AutoComplete,
    Button,
    Card,
    Dialog,
    FloatLabel,
    Select,
    Multiselect,
    DefaultLayout,
    EmailPrompt,
    FileUpload,
    InputText,
    ProgressSpinner,
    TabPanel,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    Textarea
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

  setup: () => {
    useHead({title: 'Edit experiment'})

    const {userProfile} = useAuth()

    const variantLibraryKeywordOptions = useItems({itemTypeName: `controlled-keywords-variant-search`})
    const endogenousSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-system-search`})
    const endogenousMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-mechanism-search`})
    const inVitroSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-system-search`})
    const inVitroMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-mechanism-search`})
    const deliveryMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-delivery-search`})
    const molecularMechanismAssessedKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-molecular-mechanism-assessed-search`
    })
    const phenotypicDimensionalityKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-phenotypic-dimensionality-search`
    })
    const phenotypicMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-method-search`})
    const phenotypicMechanismKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-phenotypic-mechanism-search`
    })
    const phenotypicModelSystemKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-phenotypic-modle-system-search`
    })
    const phenotypicProfilingStrategyKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-phenotypic-profiling-strategy-search`
    })
    const phenotypicSequencingTypeKeywordOptions = useItems({
      itemTypeName: `controlled-keywords-phenotypic-sequencing-type-search`
    })

    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})
    return {
      userProfile,
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'}),
      ...useScopedId(),
      variantLibraryKeywordOptions: variantLibraryKeywordOptions.items,
      endogenousSystemKeywordOptions: endogenousSystemKeywordOptions.items,
      endogenousMechanismKeywordOptions: endogenousMechanismKeywordOptions.items,
      inVitroSystemKeywordOptions: inVitroSystemKeywordOptions.items,
      inVitroMechanismKeywordOptions: inVitroMechanismKeywordOptions.items,
      deliveryMethodKeywordOptions: deliveryMethodKeywordOptions.items,
      molecularMechanismAssessedKeywordOptions: molecularMechanismAssessedKeywordOptions.items,
      phenotypicDimensionalityKeywordOptions: phenotypicDimensionalityKeywordOptions.items,
      phenotypicMethodKeywordOptions: phenotypicMethodKeywordOptions.items,
      phenotypicMechanismKeywordOptions: phenotypicMechanismKeywordOptions.items,
      phenotypicModelSystemKeywordOptions: phenotypicModelSystemKeywordOptions.items,
      phenotypicProfilingStrategyKeywordOptions: phenotypicProfilingStrategyKeywordOptions.items,
      phenotypicSequencingTypeKeywordOptions: phenotypicSequencingTypeKeywordOptions.items,
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({text}),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text) => externalPublicationIdentifierSuggestions.setRequestBody({text})
    }
  },

  data: () => ({
    // Form fields
    title: null,
    shortDescription: null,
    abstractText: null,
    dialogVisible: [],
    methodText: null,
    contributors: [],
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
      extraMetadataFile: null
    },
    validationErrors: {
      keywords: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null])),
      keywordDescriptions: _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
    },
    jsonToDisplay: null
  }),

  computed: {
    publicationIdentifierSuggestionsList: function () {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      const publicationIdentifierSuggestions = _.unionBy(
        this.publicationIdentifierSuggestions,
        this.externalPublicationIdentifierSuggestions,
        'identifier'
      )
      if (!Array.isArray(publicationIdentifierSuggestions) || !publicationIdentifierSuggestions.length) {
        // array does not exist, is not an array, or is empty
        return [{}]
      } else {
        return publicationIdentifierSuggestions
      }
    },
    keywordVisibility: function () {
      return {
        ..._.fromPairs(KEYWORDS.map((keyword) => [keyword.key, true])),
        'Endogenous Locus Library Method System':
          this.keywordKeys['Variant Library Creation Method'] == 'Endogenous locus library method',
        'Endogenous Locus Library Method Mechanism':
          this.keywordKeys['Variant Library Creation Method'] == 'Endogenous locus library method',
        'In Vitro Construct Library Method System':
          this.keywordKeys['Variant Library Creation Method'] == 'In vitro construct library method',
        'In Vitro Construct Library Method Mechanism':
          this.keywordKeys['Variant Library Creation Method'] == 'In vitro construct library method'
      }
    },
    keywordData() {
      return KEYWORDS
    },
    keywordGroups() {
      return KEYWORD_GROUPS
    }
  },

  watch: {
    item: {
      handler: function () {
        this.resetForm()
      }
    },
    itemId: {
      handler: function () {
        this.setItemId(this.itemId)
      },
      immediate: true
    },
    'keywordKeys.Variant Library Creation Method': function (newValue) {
      if (newValue !== 'Endogenous locus library method') {
        this.keywordKeys['Endogenous Locus Library Method System'] = null
        this.keywordKeys['Endogenous Locus Library Method Mechanism'] = null
      }
      if (newValue !== 'In vitro construct library method') {
        this.keywordKeys['In Vitro Construct Library Method System'] = null
        this.keywordKeys['In Vitro Construct Library Method Mechanism'] = null
      }
    },
    publicationIdentifiers: function () {
      // If the primary publication is no longer in the list of publications, clear it.
      if (
        this.primaryPublicationIdentifiers.length > 0 &&
        !this.publicationIdentifiers
          .map((pi) => pi.identifier)
          .includes(this.primaryPublicationIdentifiers[0].identifier)
      ) {
        this.primaryPublicationIdentifiers = []
      }
    }
  },

  mounted: function () {
    this.resetForm()
  },

  methods: {
    clearAutoCompleteInput: function(event) {
      if (event.target) {
        event.target.value = ''
      }
    },

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Contributors
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    lookupOrcidUser: async function (orcidId) {
      let orcidUser = null
      try {
        orcidUser = (await axios.get(`${config.apiBaseUrl}/orcid/users/${orcidId}`)).data
      } catch {
        // Assume that the error was 404 Not Found.
      }
      return orcidUser
    },

    updateContributors: function (event) {
      const currentValue = event.target?.value
      if (currentValue && currentValue.trim() != '') {
        this.contributors.push(currentValue.trim())
        this.newContributorsAdded()

        // clear the input field
        event.target.value = ''
      }
    },

    newContributorsAdded: async function () {
      // new contributor values are those that are strings rather than objects
      const newContributors = this.contributors.filter(_.isString)

      // Convert any strings to ORCID users without names. Remove whitespace from new entries.
      this.contributors = this.contributors.map((c) => (_.isString(c) ? {orcidId: c.trim()} : c))

      // Validate and look up each new contributor.
      for (const newContributor of newContributors) {
        if (_.isString(newContributor)) {
          const orcidId = newContributor.trim()
          if (orcidId && this.contributors.filter((c) => c.orcidId == orcidId).length > 1) {
            const firstIndex = _.findIndex(this.contributors, (c) => c.orcidId == orcidId)
            _.remove(this.contributors, (c, i) => i > firstIndex && c.orcidId == orcidId)
          } else if (orcidId && ORCID_ID_REGEX.test(orcidId)) {
            // Look up the ORCID ID.
            const orcidUser = await this.lookupOrcidUser(orcidId)

            if (orcidUser) {
              // If found, update matching contributors. (There should only be one.)
              for (const contributor of this.contributors) {
                if (contributor.orcidId == orcidUser.orcidId) {
                  _.merge(contributor, orcidUser)
                }
              }
            } else {
              // Otherwise remove the contributor.
              _.remove(this.contributors, (c) => c.orcidId == orcidId)
              this.$toast.add({
                life: 3000,
                severity: 'warn',
                summary: `No ORCID user was found with ORCID ID ${orcidId}.`
              })
            }
          } else {
            _.remove(this.contributors, (c) => c.orcidId == orcidId)
            this.$toast.add({
              life: 3000,
              severity: 'warn',
              summary: `${orcidId} is not a valid ORCID ID`
            })
          }
        }
      }
    },

    suggestionsForAutocomplete: function (suggestions) {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      if (!suggestions || suggestions.length == 0) {
        return [{}]
      }
      return suggestions
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    updateDoiIdentifiers: function (event) {
      const currentValue = event.target?.value
      if (currentValue && currentValue.trim() != '') {
        this.doiIdentifiers.push(currentValue.trim())
        this.newDoiIdentifiersAdded()

        // clear the input field
        event.target.value = ''
      }
    },

    newDoiIdentifiersAdded: function () {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.doiIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.doiIdentifiers[idx]
      const newDoi = normalizeDoi(searchText)
      if (this.doiIdentifiers.find((item) => item.identifier == newDoi)) {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({
          severity: 'warn',
          summary: `DOI "${newDoi}" is already associated with this experiment`,
          life: 3000
        })
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, {identifier: newDoi})
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity: 'warn', summary: `"${searchText}" is not a valid DOI`, life: 3000})
      }
    },

    updatePublicationIdentifiers: function (event) {
      const currentValue = event.target?.value
      if (currentValue && currentValue.trim() != '') {
        this.publicationIdentifiers.push(currentValue.trim())
        this.acceptNewPublicationIdentifier()
        // clear the input field
        event.target.value = ''
      }
    },

    acceptNewPublicationIdentifier: function () {
      // We assume the newest value is the right-most one here. That seems to always be true in this version of Primevue,
      // but that may change in the future.
      const newIdx = this.publicationIdentifiers.length - 1

      // Remove new value if it is a duplicate.
      const newIdentifier = this.publicationIdentifiers[newIdx].identifier
      if (this.publicationIdentifiers.findIndex((pub) => pub.identifier == newIdentifier) < newIdx) {
        this.publicationIdentifiers.splice(newIdx, 1)
        this.$toast.add({
          severity: 'warn',
          summary: `Identifier "${newIdentifier}" is already associated with this experiment`,
          life: 3000
        })
      }
    },

    removeContributor: function (contributor) {
      const index = this.contributors.findIndex(c => c.orcidId === contributor.orcidId)
      if (index !== -1) {
        this.contributors.splice(index, 1)
      }
    },
    removeRawReadIdentifier: function (rawReadIdentifier) {
      const index = this.rawReadIdentifiers.findIndex(r => r.identifier === rawReadIdentifier.identifier)
      if (index !== -1) {
        this.rawReadIdentifiers.splice(index, 1)
      }
    },
    removeDoiIdentifier: function (doiIdentifier) {
      const index = this.doiIdentifiers.findIndex(d => d.identifier === doiIdentifier.identifier)
      if (index !== -1) {
        this.doiIdentifiers.splice(index, 1)
      }
    },

    truncatePublicationTitle: function (title) {
      return title.length > 50 ? title.slice(0, 50) + '...' : title
    },

    searchPublicationIdentifiers: function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    updateRawReadIdentifiers: function (event) {
      const currentValue = event.target?.value
      if (currentValue && currentValue.trim() != '') {
        this.rawReadIdentifiers.push(currentValue.trim())
        this.addNewRawReadIdentifier()

        // clear the input field
        event.target.value = ''
      }
    },

    addNewRawReadIdentifier: function () {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.rawReadIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.rawReadIdentifiers[idx]
      const newRawRead = normalizeRawRead(searchText)
      if (this.rawReadIdentifiers.find((item) => item.identifier == newRawRead)) {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({
          severity: 'warn',
          summary: `Raw Read identifier "${newRawRead}" is already associated with this experiment`,
          life: 3000
        })
      } else if (validateRawRead(searchText)) {
        this.rawReadIdentifiers.splice(idx, 1, {identifier: newRawRead})
      } else {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({severity: 'warn', summary: `"${searchText}" is not a valid Raw Read identifier`, life: 3000})
      }
    },

    fileCleared: function (inputName) {
      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    fileSelected: async function (inputName, event) {
      const file = event.files[0]
      if (file) {
        switch (inputName) {
          case 'extraMetadataFile':
            {
              const text = await file.text()
              try {
                this.extraMetadata = JSON.parse(text)
                if (!_.isObject(this.extraMetadata) || _.isArray(this.extraMetadata)) {
                  this.clientSideValidationErrors.extraMetadata =
                    'Extra metadata must be a JSON object (not an array or simple value).'
                } else {
                  delete this.clientSideValidationErrors.extraMetadata
                }
              } catch {
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

    mergeValidationErrors: function () {
      this.validationErrors = _.merge({}, this.serverSideValidationErrors, this.clientSideValidationErrors)
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Converting between view model and form model
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetForm: function () {
      if (this.item) {
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.contributors = _.sortBy(this.item.contributors, ['familyName', 'givenName', 'orcidId'])
        this.doiIdentifiers = this.item.doiIdentifiers
        // So that the multiselect can populate correctly, build the primary publication identifiers
        // indirectly by filtering publication identifiers list for those publications we know to be
        // primary.
        this.publicationIdentifiers = _.concat(
          this.item.primaryPublicationIdentifiers,
          this.item.secondaryPublicationIdentifiers
        )
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
        this.contributors = [
          {
            orcidId: this.userProfile?.sub,
            givenName: this.userProfile?.given_name,
            familyName: this.userProfile?.family_name
          }
        ]
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
        this.rawReadIdentifiers = []
        this.extraMetadata = {}
      }
      this.resetKeywords()
    },

    resetKeywords: function () {
      if (this.item && this.item.keywords.length !== 0) {
        // Keywords could be an empty list now. Will modify it back to compulsory when we get final list.
        const setKeyword = (key) => {
          const keywordObj = this.item.keywords.find((keyword) => keyword.keyword.key === key)
          this.keywordKeys[key] = keywordObj ? keywordObj.keyword.label : null
          this.keywordDescriptions[key] = keywordObj ? keywordObj.description : null
        }
        for (const k of KEYWORDS) {
          setKeyword(k.key)
        }
      } else {
        this.clearKeywords()
      }
    },

    clearKeywords: function () {
      this.keywords = []
      this.keywordKeys = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
      this.keywordDescriptions = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Saving changes
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO It would be nice to let the items state module handle saving.
    // Currently there is some special handling here, though, so we will leave that for a later refactoring.

    save: async function () {
      // Remove primary identifier from publications to construct secondary identifiers
      const primaryPublicationIdentifiers = this.primaryPublicationIdentifiers.map((identifier) =>
        _.pick(identifier, ['identifier', 'dbName'])
      )
      const secondaryPublicationIdentifiers = this.publicationIdentifiers
        .map((identifier) => _.pick(identifier, ['identifier', 'dbName']))
        .filter(
          (secondary) =>
            !primaryPublicationIdentifiers.some(
              (primary) => primary.identifier == secondary.identifier && primary.dbName == secondary.dbName
            )
        )
      // Keywods section
      const combinedKeywords = []
      const methodKey = this.keywordKeys['Variant Library Creation Method']
      if (this.keywordGroups[methodKey]) {
        this.keywordGroups[methodKey].forEach((key) => {
          combinedKeywords.push({
            keyword: {key: key, label: this.keywordKeys[key]},
            description: this.keywordDescriptions[key]
          })
        })
      }
      const phenotypicKeywords = KEYWORDS.slice(5).map((keyword) => ({
        keyword: {key: keyword.key, label: this.keywordKeys[keyword.key]},
        description: this.keywordDescriptions[keyword.key]
      }))
      combinedKeywords.push(...phenotypicKeywords)
      // Push all of the keyworeds to this.keywords directly will raise a bug if users choose Other option without typing anything.
      this.keywords = combinedKeywords
      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        contributors: this.contributors,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: primaryPublicationIdentifiers,
        secondaryPublicationIdentifiers: secondaryPublicationIdentifiers,
        rawReadIdentifiers: this.rawReadIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        extraMetadata: this.extraMetadata
      }
      // empty item arrays so that deleted items aren't merged back into editedItem object
      if (this.item) {
        this.item.contributors = []
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
          this.$toast.add({severity: 'success', summary: 'Your changes were saved.', life: 3000})
        } else {
          console.log('Created item')
          this.$router.replace({path: `/experiments/${savedItem.urn}`})
          this.$toast.add({severity: 'success', summary: 'The new experiment was saved.', life: 3000})
        }
      } else if (response.data && response.data.detail) {
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({
            severity: 'error',
            summary: `Encountered an error saving experiment: ${response.data.detail}`
          })
        } else {
          const formValidationErrors = {}
          for (const error of response.data.detail) {
            let path = error.loc
            if (error?.ctx?.error?.custom_loc) {
              path = error.ctx.error.custom_loc
            }

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

    validateAndSave: async function () {
      this.serverSideValidationErrors = {}
      this.mergeValidationErrors()

      if (_.isEmpty(this.validationErrors)) {
        await this.save()
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem: function () {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}`})
      }
    },

    //Back to Dashboard
    backDashboard: function () {
      this.$router.replace({path: `/dashboard`})
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Rendering utilities
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    markdownToHtml: function (markdown) {
      return marked(markdown || '')
    },

    get(...args) {
      return _.get(...args)
    },

    formatKeywordOptionLabel(option) {
      return option.code ? `${option.code} - ${option.label}` : option.label
    },

    getKeywordOptions(optionsName) {
      return this[optionsName]
    },

    keywordToggleInput: function (field) {
      this.keywordTextVisible[field] = !this.keywordTextVisible[field]
    },

    deleteKeyword: function (field) {
      this.keywordKeys[field] = null
      this.keywordDescriptions[field] = null
      this.keywordTextVisible[field] = false
    },

    showDialog: function (index) {
      this.dialogVisible[index] = true
    }
  }
}
</script>

<style src="../../assets/forms.css"></style>

<style scoped>
/* Cards */

.mave-experiment-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0, 0, 0, 0.05);
}

.mave-experiment-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51b5;
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
  width: 450px !important;
  height: 45px;
}

.keyword-editor .field {
  display: flex;
  align-items: center;
}

.keyword-description-button {
  margin-left: 8px;
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  padding: 0 !important;
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

.p-inputwrapper, .p-textarea, .p-inputtext {
  width: 100%;
}
</style>
