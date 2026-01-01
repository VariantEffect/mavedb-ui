<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  {{ experimentSetUrn }}
  <DefaultLayout :require-auth="true">
    <div class="mave-experiment-editor">
      <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
        <div class="mave-screen-title">Edit experiment {{ item.urn }}</div>
        <div v-if="item" class="mavedb-screen-title-controls">
          <Button @click="saveEditContent">Save changes</Button>
          <Button severity="help" @click="resetForm">Clear</Button>
          <Button severity="warn" @click="viewItem">Cancel</Button>
        </div>
      </div>
      <div v-else class="mave-screen-title-bar">
        <div class="mave-screen-title">Create a new experiment</div>
        <div class="mavedb-screen-title-controls">
          <Button @click="validateAndSave">Save</Button>
          <Button severity="help" @click="resetForm">Clear</Button>
          <Button severity="warn" @click="backDashboard">Cancel</Button>
        </div>
      </div>
      <div class="mavedb-wizard">
        <Stepper v-model:value="activeWizardStep">
          <StepList>
              <Step :value="1">Experiment information</Step>
              <Step :disabled="maxWizardStepEntered < activeWizardStep || maxWizardStepValidated < activeWizardStep - 1" :value="2">Keywords</Step>
          </StepList>
          <StepPanels>
            <StepPanel v-slot="{ value, activateCallback }" :value="1">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-content-pane">
                    <Message closable severity="info">
                      You are currently adding an experiment to a new experiment set. To add an experiment to an
                      existing experiment set, navigate to the existing experiment set and click the "Add experiment"
                      button.
                    </Message>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label
                      >A short title for the experiment, to be displayed at the top of the experiment's own page.</label
                    >
                    <div class="mavedb-help-small">
                      Examples: UBE2I yeast complementation, BRCA1 Y2H, PTEN VAMP-seq, Massively parallel functional
                      dissection of ECR11 enhancer
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <InputText :id="scopedId('input-title')" v-model="title" />
                      <label :for="scopedId('input-title')">Title</label>
                    </FloatLabel>
                    <span v-if="validationErrors.title" class="mave-field-error">{{ validationErrors.title }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>
                      A high-level description of the experiment in one or two sentences, to be displayed in search
                      results.
                    </label>
                    <div class="mavedb-help-small">
                      Example: A machine-learning imputed and refined Deep Mutational Scan of the human SUMO1 using
                      functional complementation in yeast..
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <Textarea :id="scopedId('input-shortDescription')" v-model="shortDescription" rows="4" />
                      <label :for="scopedId('input-shortDescription')">Short description</label>
                    </FloatLabel>
                    <span v-if="validationErrors.shortDescription" class="mave-field-error">{{
                      validationErrors.shortDescription
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label> The motivation for and approach of the experiment. </label>
                    <div class="mavedb-help-small">
                      May be formatted using
                      <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. The
                      focus should be on the MAVE data, rather than the full research contribution, so use your
                      judgement when deciding what details are relevant. It is common that experiments and score sets
                      share the same abstract text if they are from the same study.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <Tabs value="0">
                      <TabList>
                        <Tab value="0"> Edit </Tab>
                        <Tab value="1"> Preview </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel header="Edit" value="0">
                          <FloatLabel variant="on">
                            <Textarea :id="scopedId('input-abstractText')" v-model="abstractText" rows="10" />
                            <label :for="scopedId('input-abstractText')">Abstract</label>
                          </FloatLabel>
                        </TabPanel>
                        <TabPanel header="Preview" value="1">
                          <!-- eslint-disable-next-line vue/no-v-html -->
                          <div class="mavedb-wizard-rendered-markdown" v-html="markdownToHtml(abstractText)"></div>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                    <span v-if="validationErrors.abstractText" class="mave-field-error">{{
                      validationErrors.abstractText
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>
                      A condensed description of the data analysis, starting from raw sequence data, suitable for a
                      specialist audience of MAVE researchers.
                    </label>
                    <div class="mavedb-help-small">
                      May be formatted using
                      <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. Should
                      include:
                      <ul class="list-disc ml-5">
                        <li>variant library construction methods,</li>
                        <li>description of the functional assay, including model system and selection type,</li>
                        <li>sequencing strategy and sequencing technology, and</li>
                        <li>structure of biological or technical replicates (if applicable).</li>
                      </ul>
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <Tabs value="0">
                      <TabList>
                        <Tab value="0"> Edit </Tab>
                        <Tab value="1"> Preview </Tab>
                      </TabList>
                      <TabPanels>
                        <TabPanel header="Edit" value="0">
                          <FloatLabel variant="on">
                            <Textarea :id="scopedId('input-methodText')" v-model="methodText" rows="10" />
                            <label :for="scopedId('input-methodText')">Methods</label>
                          </FloatLabel>
                        </TabPanel>
                        <TabPanel header="Preview" value="1">
                          <!-- eslint-disable-next-line vue/no-v-html -->
                          <div class="mavedb-wizard-rendered-markdown" v-html="markdownToHtml(methodText)"></div>
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                    <span v-if="validationErrors.methodText" class="mave-field-error">{{
                      validationErrors.methodText
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-doiIdentifiers')">
                      The DOIs of any digital resources associated with the experiment.
                    </label>
                    <div class="mavedb-help-small">
                      Please note: If you would like to associate publications with this experiment via their DOI,
                      please do not do so here. Instead, use the publication identifiers field below.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <AutoComplete
                        :id="scopedId('input-doiIdentifiers')"
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
                </div>
                <div v-if="itemStatus == 'NotLoaded' || item.private == true">
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Contributors who may edit this experiment. Enter each contributor's
                        <a href="https://orcid.org" target="_blank">ORCID</a> ID and confirm their name.
                      </label>
                      <div class="mavedb-help-small">Examples: 1111-1111-1111-1111</div>
                    </div>
                    <div class="mavedb-wizard-content field">
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
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Any publications associated with the experiment. You can search for publications to add by DOI,
                        PubMed ID, bioRxiv ID, or medRxiv ID. Publications included in an experiment will also be
                        displayed on their associated score set pages.
                      </label>
                      <div class="mavedb-help-small">
                        Example searches: https://doi.org/10.1038/s41467-023-43041-4 (DOI as link),
                        10.1038/s41467-023-43041-4 (DOI), 38057330 (a Pubmed ID), 2022.06.10.22276179 (a bioRxiv or
                        medRxiv ID)
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
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
                  </div>
                  <div v-if="publicationIdentifiers.length > 1" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label> Of the above publications, the primary publication that describes the score set. </label>
                    </div>
                    <div class="mavedb-wizard-content field">
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
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Experimenters are encouraged to deposit their raw sequence data in a public repository and link
                        it to the relevant experiment record(s).
                      </label>
                      <div class="mavedb-help-small">
                        MaveDB currently supports accession numbers for:
                        <ul class="list-disc ml-5">
                          <li>
                            <a href="https://www.ebi.ac.uk/biostudies/arrayexpress" target="_blank">ArrayExpress</a>
                          </li>
                          <li><a href="https://www.ncbi.nlm.nih.gov/bioproject/" target="_blank">BioProject</a></li>
                          <li>
                            <a href="https://www.ncbi.nlm.nih.gov/geo/" target="_blank">Gene Expression Omnibus</a>
                          </li>
                          <li><a href="https://www.ncbi.nlm.nih.gov/sra" target="_blank">Sequence Read Archive</a></li>
                        </ul>
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
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
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label> Any additional metadata about the experiment, as a JSON file. </label>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <FloatLabel variant="on">
                        <FileUpload
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
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-end mavedb-wizard-step-controls pt-4">
                  <Button
                    :disabled="maxWizardStepValidated < activeWizardStep"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    label="Next"
                    @click="showNextWizardStepIfValid(activateCallback)"
                  />
                </div>
              </div>
            </StepPanel>
            <StepPanel v-if="itemStatus == 'NotLoaded' || item.private" v-slot="{ activateCallback }" :value="2">
              <Message closable>
                Experiments can be tagged with optional keywords. In a future release, the keyword vocabulary will
                become restricted and keyword selection will be mandatory.
              </Message>
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-for="keyword in keywordData" :key="keyword.key" class="mavedb-wizard-row">
                  <div v-if="keywordVisibility[keyword.key]">
                    <div class="mavedb-wizard-help">
                      <label>{{ keyword.key }}</label>
                      <div v-if="getKeywordOptions(keyword.option)" class="mavedb-help-small">
                        {{ getKeywordOptions(keyword.option)[0].description }}
                      </div>
                    </div>

                    <div class="mavedb-wizard-content keyword-editor">
                      <span class="field">
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
                          class="keyword-button"
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
                          aria-label="Remove"
                          class="keyword-button"
                          :disabled="!keywordKeys[keyword.key]"
                          icon="pi pi-times"
                          rounded
                          severity="danger"
                          @click="
                            () => {
                              keywordKeys[keyword.key] = null
                              keywordTextVisible[keyword.key] = null
                            }
                          "
                        />
                      </span>
                      <span v-if="validationErrors[`keywords.${keyword.key}`]" class="mave-field-error">{{
                        validationErrors[`keywords.${keyword.key}`]
                      }}</span>

                      <div v-if="keywordTextVisible[keyword.key] || keywordKeys[keyword.key] === 'Other'" class="field">
                        <FloatLabel class="keyword-description-input" variant="on">
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
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button icon="pi pi-arrow-left" label="Back" severity="secondary" @click="activateCallback(activeWizardStep - 1)" />
                  <Button
                    :disabled="maxWizardStepValidated == -2"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    label="Save"
                    @click="item ? saveEditContent() : validateAndSave()"
                  />
                </div>
              </div>
            </StepPanel>
          </StepPanels>
        </Stepper>
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
import Dialog from 'primevue/dialog'
import FloatLabel from 'primevue/floatlabel'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import Stepper from 'primevue/stepper'
import StepPanel from 'primevue/steppanel'
import StepPanels from 'primevue/steppanels'
import StepList from 'primevue/steplist'
import Step from 'primevue/step'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanels from 'primevue/tabpanels'
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
  name: 'ExperimentCreator',
  components: {
    AutoComplete,
    Button,
    DefaultLayout,
    Dialog,
    FloatLabel,
    Select,
    EmailPrompt,
    FileUpload,
    InputText,
    Message,
    Multiselect,
    ProgressSpinner,
    Stepper,
    StepPanel,
    StepPanels,
    StepList,
    Step,
    Tabs,
    Tab,
    TabList,
    TabPanels,
    TabPanel,
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
    useHead({title: 'New experiment'})

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

    /** The currently active step. */
    activeWizardStep: 1,

    /** The highest step that the user has entered. This can be used to prevent the user from jumping ahead. */
    maxWizardStepEntered: 1,

    stepFields: [
      [
        'title',
        'shortDescription',
        'methodText',
        'abstractText',
        'doiIdentifiers',
        'contributors',
        'publicationIdentifiers',
        'primaryPublicationIdentifiers',
        'rawReadIdentifiers',
        'extraMetadata'
      ],
      ['keywords']
    ]
  }),

  computed: {
    keywordData() {
      return KEYWORDS
    },
    keywordGroups() {
      return KEYWORD_GROUPS
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
    maxWizardStepValidated: function () {
      const numSteps = 2
      // This yields the index of the maximum step validated, -1 if step 0 is not valid, and -2 if all steps are valid.
      const maxStepValidated = _.findIndex(_.range(0, numSteps), (step) => !this.validateWizardStep(step)) - 1
      return maxStepValidated == -2 ? numSteps - 1 : maxStepValidated
    },
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
    publicationIdentifiers: {
      handler: function (newValue, oldValue) {
        if (newValue.length == 1) {
          this.primaryPublicationIdentifiers = newValue
        } else if (
          newValue.length == 0 ||
          (newValue.length > 1 && oldValue.length == 1) ||
          (this.primaryPublicationIdentifiers.length > 0 &&
          !newValue
            .map((pi) => pi.identifier)
            .includes(this.primaryPublicationIdentifiers[0].identifier))
        ) {
          // Clear primary publication if we have just added a second ID, or if we have deleted all IDs,
          // or if the primary publication is no longer in the list of publications.
          this.primaryPublicationIdentifiers = []
        }
      }
    },
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

    validateWizardStep: function (step) {
      // Later, this may depend on server-side validation.
      switch (step) {
        case 0: {
          return this.title && this.shortDescription && this.abstractText && this.methodText
        }
        default:
          return true
      }
    },

    minStepWithError: function () {
      const numSteps = this.stepFields.length
      for (let i = 1; i < numSteps + 1; i++) {
        if (this.wizardStepHasError(i)) {
          return i
        }
      }
      return numSteps
    },

    wizardStepHasError: function (step) {
      if (step >= this.stepFields.length) {
        return false
      }
      let ret = false
      this.stepFields[step].forEach((field) => {
        Object.keys(this.validationErrors).forEach((key) => {
          if (key.startsWith(field)) {
            ret = true
          }
        })
      })
      return ret
    },

    showNextWizardStepIfValid: function (navigate) {
      if (this.maxWizardStepValidated >= this.activeWizardStep) {
        this.maxWizardStepEntered = Math.max(this.maxWizardStepEntered, this.activeWizardStep + 1)
        navigate(this.activeWizardStep + 1)
      }
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

    searchPublicationIdentifiers: function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    truncatePublicationTitle: function (title) {
      return title.length > 50 ? title.slice(0, 50) + '...' : title
    },

    updateRawReadIdentifiers: function (event) {
      const currentValue = event.target?.value
      if (currentValue && currentValue.trim() != '') {
        this.rawReadIdentifiers.push(currentValue.trim())
        this.newRawReadIdentifiersAdded()

        // clear the input field
        event.target.value = ''
      }
    },

    newRawReadIdentifiersAdded: function () {
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
        console.log(this.extraMetadata)
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
        this.keywords = []
        this.keywordKeys = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
        this.keywordDescriptions = _.fromPairs(KEYWORDS.map((keyword) => [keyword.key, null]))
      }
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
      this.progressVisible = true
      let response = null
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
      this.progressVisible = false

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
        this.serverSideValidationErrors = {}
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
        }
        this.mergeValidationErrors()
        this.activeWizardStep = this.minStepWithError()
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

/* Keywords */

.keyword-dropdown {
  width: 450px;
  height: 45px;
}

.keyword-editor .field {
  display: flex;
  align-items: center;
}

.keyword-button {
  margin-left: 8px;
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  padding: 0 !important;
}

.keyword-button:deep(.p-button-icon) {
  font-size: 1.1rem;
  margin-top: 1px;
  margin-left: 1px;
}

.keyword-button:deep(.p-button-icon.pi-file-edit) {
  margin-left: 4px;
}

.mavedb-wizard:deep(.p-stepper) {
  min-width: 1180px; /* Design is not responsive past this point. */
}

/* Remove the stepper panel's background color. */
.mavedb-wizard:deep(.p-stepper .p-stepper-panels) {
  background-color: transparent;
}

/* One form within a wizard. Needed as the parent of .mavedb-sizard-content-background. */
.mavedb-wizard-form {
  position: relative;
  z-index: 0;
  background-color: #f7f7f7;
}

/* Give the right side of the wizard a white background, without gaps between rows. */
.mavedb-wizard-form-content-background {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 676px;
  background-color: #fff;
}

.mavedb-wizard-row {
  position: relative;
  z-index: 1;
}

/* Clear floats after each wizard form row. */
.mavedb-wizard-row:after {
  content: '';
  clear: both;
  display: table;
}

/* The help block for one wizard form row. */
.mavedb-wizard-help {
  float: left;
  width: 480px;
  padding: 22px 10px 10px 10px;
}

/* More detailed help text. */
.mavedb-help-small {
  font-size: smaller;
}

.mavedb-help-small ul {
  margin: 0;
}

/* Form content for one wizard form row. */
.mavedb-wizard-content {
  float: right;
  width: 676px;
  padding: 22px 10px 10px 10px;
  background-color: #fff;
}

.mavedb-wizard-content-pane {
  float: right;
  width: 676px;
  padding: 10px 10px;
  background-color: #fff;
}

/* Wizard step controls */
.mavedb-wizard-step-controls-row {
  position: relative;
}

.mavedb-wizard-step-controls-row:after {
  content: '';
  clear: both;
  display: table;
}

/* Ensure the step controls are never off-screen. */
.mavedb-wizard-step-controls {
  padding-left: 10px;
  max-width: 100vw;
  background-color: #f7f7f7;
}

.field:deep(.mavedb-wizard-rendered-markdown) {
  width: 550px;
}

.field:deep(.mavedb-wizard-rendered-markdown :first-child) {
  margin-top: 0;
}

/* Progress indicator */

.mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}

.p-inputwrapper, .p-textarea, .p-inputtext {
  width: 100%;
}
.keyword-description-input, .keyword-dropdown {
  width: 450px;
}
</style>
