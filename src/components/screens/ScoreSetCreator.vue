<template>
  <MvEmailPrompt
    dialog="You must add an email address to your account to create or edit a score set. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader max-width="1280px" title="Create a new score set" variant="toolbar">
        <template #actions>
          <PButton severity="secondary" size="small" @click="resetForm">Clear</PButton>
          <PButton severity="warn" size="small" @click="backDashboard">Cancel</PButton>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto w-full max-w-screen-xl py-6">
      <Stepper v-model:value="activeWizardStep">
        <StepList>
          <Step :value="1">Experiment &amp; context</Step>
          <Step :disabled="maxWizardStepValidated < 1" :value="2">Score set details</Step>
          <Step :disabled="maxWizardStepValidated < 2" :value="3">Targets</Step>
          <Step
            v-for="(_, targetIdx) in numTargets"
            :key="targetIdx"
            :disabled="maxWizardStepValidated < targetIdx + 3"
            :value="targetIdx + 4"
          >
            Target {{ targetIdx + 1 }}
          </Step>
          <Step :disabled="maxWizardStepValidated < numTargets + 3" :value="numTargets + 4">Score calibration</Step>
          <Step :disabled="maxWizardStepValidated < numTargets + 4" :value="numTargets + 5">Variant scores</Step>
        </StepList>
        <StepPanels>
          <!-- Step 1: Parent experiment and context -->
          <StepPanel v-slot="{activateCallback}" :value="1">
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>
              <ScoreSetContextFields
                :editable-experiments="editableExperiments"
                :experiment="selectedExperiment"
                :fixed-experiment-title="experiment?.title"
                :fixed-experiment-urn="experimentUrn"
                :is-meta-analysis="isMetaAnalysis"
                :is-superseding="isSupersedingScoreSet"
                :meta-analyzes-loading="metaAnalyzesScoreSetSuggestionsLoading"
                :meta-analyzes-score-sets="metaAnalyzesScoreSets"
                :meta-analyzes-suggestions="metaAnalyzesScoreSetSuggestionsList"
                :superseded-loading="supersededScoreSetSuggestionsLoading"
                :superseded-score-set="supersededScoreSet"
                :superseded-suggestions="supersededScoreSetSuggestionsList"
                :validation-errors="validationErrors"
                wizard-mode
                @search-meta-analyzes="searchMetaAnalyzesScoreSets"
                @search-superseded="searchSupersededScoreSets"
                @superseded-selected="populateSupersededScoreSetMetadata($event)"
                @update:experiment="onExperimentSelected($event)"
                @update:is-meta-analysis="isMetaAnalysis = $event"
                @update:is-superseding="isSupersedingScoreSet = $event"
                @update:meta-analyzes-score-sets="metaAnalyzesScoreSets = $event"
                @update:superseded-score-set="supersededScoreSet = $event"
              />
            </div>
            <div class="flex justify-end bg-bg px-2.5 pt-4 pb-2">
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                @click="showNextWizardStepIfValid(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- Step 2: Score set information -->
          <StepPanel v-slot="{activateCallback}" :value="2">
            <div v-if="selectedExperiment || experiment" class="bg-bg pt-3 pb-3">
              <div class="rounded border-l-3 border-sage bg-sage-light px-3 py-2 text-sm">
                Some fields were autopopulated based on the selected experiment and should be inspected to ensure they
                are still relevant to this score set.
              </div>
            </div>
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>
              <ScoreSetFields
                :abstract-text="abstractText"
                :contributors="contributors"
                :data-usage-policy="dataUsagePolicy"
                :doi-identifiers="doiIdentifiers"
                :extra-metadata="extraMetadata"
                :has-custom-usage-policy="hasCustomUsagePolicy"
                :is-meta-analysis="isMetaAnalysis"
                :license-id="licenseId"
                :licenses="licenses as License[]"
                :method-text="methodText"
                :primary-publication-identifiers="primaryPublicationIdentifiers"
                :publication-identifiers="publicationIdentifiers"
                :publication-search-loading="publicationSearchLoading"
                :publication-suggestions="publicationIdentifierSuggestionsList"
                :short-description="shortDescription"
                :title="title"
                :validation-errors="validationErrors"
                wizard-mode
                @clear-extra-metadata="fileCleared('extraMetadataFile')"
                @search-publications="searchPublicationIdentifiers($event)"
                @select-extra-metadata="fileSelected('extraMetadataFile', $event)"
                @update:abstract-text="abstractText = $event"
                @update:contributors="contributors = $event"
                @update:data-usage-policy="dataUsagePolicy = $event"
                @update:doi-identifiers="doiIdentifiers = $event"
                @update:has-custom-usage-policy="hasCustomUsagePolicy = $event"
                @update:license-id="licenseId = $event"
                @update:method-text="methodText = $event"
                @update:primary-publication-identifiers="primaryPublicationIdentifiers = $event"
                @update:publication-identifiers="publicationIdentifiers = $event"
                @update:short-description="shortDescription = $event"
                @update:title="title = $event"
                @view-extra-metadata="jsonToDisplay = JSON.stringify(extraMetadata, null, 2)"
              />
            </div>
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                @click="showNextWizardStepIfValid(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- Step 3: Target configuration -->
          <StepPanel v-slot="{activateCallback}" :value="3">
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>
              <!-- Is target sequence-based? -->
              <div class="wizard-row">
                <div class="wizard-help">
                  <label>Will you be uploading the target sequences used for your assay?</label>
                  <p class="wizard-help-detail">
                    The target sequence is the sequence that was mutagenized to create the variant library, such as in a
                    cDNA-based deep mutational scan. If your variants were generated by editing the genome directly
                    (e.g., using saturation genome editing or base editing), you should provide an Ensembl or RefSeq
                    accession instead of uploading the target locus sequence as your own target.
                  </p>
                </div>
                <div class="wizard-field flex items-center">
                  <ToggleSwitch v-model="isTargetSequence" aria-label="Upload target sequences" />
                  <div class="ml-3 text-sm">
                    {{
                      isTargetSequence
                        ? 'Yes, variants are described relative to a target sequence.'
                        : 'No, variants are described relative to a RefSeq or Ensembl accession (either a transcript or chromosome).'
                    }}
                  </div>
                </div>
              </div>

              <!-- Is base editor data? (accession mode only) -->
              <div v-if="!isTargetSequence" class="wizard-row">
                <div class="wizard-help">
                  <label>Does this score set represent base editor data?</label>
                  <p class="wizard-help-detail">
                    Base editor data is a type of functional assay that is similar in many respects to MAVE data. When
                    uploading base editor data, you must also include a 'guide_sequence' column in your uploaded scores
                    (and counts) file(s).
                  </p>
                </div>
                <div class="wizard-field flex items-center">
                  <ToggleSwitch v-model="isBaseEditor" aria-label="Base editor data" />
                  <div class="ml-3 text-sm">
                    {{
                      isBaseEditor
                        ? 'Yes, this score set represents base editor data.'
                        : 'No, this score set does not represent base editor data.'
                    }}
                  </div>
                </div>
              </div>

              <!-- Multiple targets? -->
              <div class="wizard-row">
                <div class="wizard-help">
                  <label>Does this score set describe variants with respect to more than one target?</label>
                  <p class="wizard-help-detail">
                    Some experiments might describe variants against two or more distinct target sequences. If this is
                    the case, your variants will need to be described explicitly from the target they came from.
                  </p>
                </div>
                <div class="wizard-field flex items-center">
                  <ToggleSwitch v-model="isMultiTarget" aria-label="Multiple targets" />
                  <div class="ml-3 text-sm">
                    {{
                      isMultiTarget
                        ? 'Yes, variants are described relative to multiple target sequences.'
                        : 'No, variants are described relative to a single target sequence.'
                    }}
                  </div>
                </div>
              </div>

              <!-- Number of targets (multi-target only) -->
              <div v-if="isMultiTarget" class="wizard-row">
                <div class="wizard-help">
                  <label>How many targets will be included with this score set?</label>
                </div>
                <div class="wizard-field">
                  <MvFloatField label="Targets">
                    <template #default="{id}">
                      <InputNumber
                        :id="id"
                        v-model="numTargets"
                        aria-label="Number of targets"
                        button-layout="stacked"
                        :min="2"
                        show-buttons
                        suffix=" targets"
                      />
                    </template>
                  </MvFloatField>
                </div>
              </div>
            </div>
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                @click="showNextWizardStepIfValid(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- Steps 4..4+N: Target gene details (one per target) -->
          <StepPanel
            v-for="(_, targetIdx) in numTargets"
            :key="targetIdx"
            v-slot="{activateCallback}"
            :value="targetIdx + 4"
          >
            <TargetEditor
              ref="targetEditors"
              :error-prefix="`targetGenes.${targetIdx}.targetGene`"
              :is-multi-target="isMultiTarget"
              :target-sequence-mode="isTargetSequence ? 'sequence' : 'coordinates'"
              :validation-errors="validationErrors"
              @update:valid="targetValidities[targetIdx] = $event"
            />
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                @click="showNextWizardStepIfValid(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- Score Calibration step -->
          <StepPanel v-slot="{activateCallback}" :value="numTargets + 4">
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>
              <div class="wizard-row">
                <div class="wizard-help">
                  <label>Will you be providing score calibrations for this score set?</label>
                  <p class="wizard-help-detail">
                    Score calibrations provide additional clinical context to the scores you upload. If you provide
                    score calibrations, you may classify each range as having either normal, abnormal, or an unspecified
                    function. If you provide a range with normal function, you should also provide a baseline score that
                    falls within the normal range.
                  </p>
                </div>
                <div class="wizard-field flex items-center">
                  <ToggleSwitch
                    v-model="investigatorIsProvidingScoreCalibrations"
                    aria-label="Provide score calibrations"
                  />
                  <div class="ml-3 text-sm">
                    {{
                      investigatorIsProvidingScoreCalibrations
                        ? 'Yes, I will be providing score range data.'
                        : 'No, I will not be providing score range data.'
                    }}
                  </div>
                </div>
              </div>
              <div v-if="investigatorIsProvidingScoreCalibrations">
                <CalibrationEditor
                  ref="calibrationEditor"
                  :allow-class-based="false"
                  @update:draft="calibrationDraft = $event"
                />
              </div>
            </div>
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Next"
                @click="showNextWizardStepIfValid(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- Variant Scores step -->
          <StepPanel v-slot="{activateCallback}" :value="numTargets + 5">
            <div v-if="hasAccessionTarget || numTargets > 1" class="bg-bg px-2.5 pt-2 pb-1">
              <Message v-if="hasAccessionTarget" class="mb-0" closable severity="info">
                When defining variants against an accession based target, uploaded variant coordinates should be fully
                qualified with respect to target names or target accessions (e.g: NC_000001.1:c.1A>C).
              </Message>
              <Message v-else class="mb-0" closable severity="info">
                When defining variants against multiple targets, uploaded variant coordinates should be fully qualified
                with respect to target names or target accessions.
              </Message>
            </div>
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>
              <VariantScoreFields
                ref="variantScoreFields"
                :count-columns-metadata="countColumnsMetadata"
                :has-accession-target="hasAccessionTarget"
                :has-multiple-targets="numTargets > 1"
                :score-columns-metadata="scoreColumnsMetadata"
                :validation-errors="validationErrors"
                wizard-mode
                @file-cleared="(inputName) => fileCleared(inputName)"
                @file-selected="(inputName, evt) => fileSelected(inputName, evt)"
                @view-json="jsonToDisplay = JSON.stringify($event, null, 2)"
              />
            </div>
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton
                :disabled="maxWizardStepValidated < activeWizardStep"
                icon="pi pi-arrow-right"
                icon-pos="right"
                label="Save"
                @click="validateAndSave()"
              />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>
    </div>

    <ProgressSpinner v-if="progressVisible" class="fixed bottom-5 right-5 z-50" />
    <PDialog
      :close-on-escape="true"
      modal
      :style="{maxWidth: '90%', width: '50rem'}"
      :visible="!!jsonToDisplay"
      @update:visible="jsonToDisplay = null"
    >
      <span style="white-space: pre-wrap; font-family: monospace">{{ jsonToDisplay }}</span>
    </PDialog>
  </MvLayout>
</template>

<script lang="ts">
import _ from 'lodash'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Step from 'primevue/step'
import StepList from 'primevue/steplist'
import StepPanel from 'primevue/steppanel'
import StepPanels from 'primevue/steppanels'
import Stepper from 'primevue/stepper'
import ToggleSwitch from 'primevue/toggleswitch'
import {ref} from 'vue'
import {useHead} from '@unhead/vue'

import {getExperiment, searchMyExperiments, createScoreSet, uploadVariantData, getErrorResponse} from '@/api/mavedb'
import CalibrationEditor from '@/components/calibration/CalibrationEditor.vue'
import MvEmailPrompt from '@/components/common/MvEmailPrompt.vue'
import ScoreSetContextFields from '@/components/forms/ScoreSetContextFields.vue'
import ScoreSetFields from '@/components/forms/ScoreSetFields.vue'
import TargetEditor from '@/components/forms/TargetEditor.vue'
import VariantScoreFields from '@/components/forms/VariantScoreFields.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import {useAutocomplete} from '@/composables/use-autocomplete'
import type {FileUploadSelectEvent} from 'primevue/fileupload'
import {useJsonFileField, type JsonFileInputName} from '@/composables/use-json-file-field'
import {usePublicationIdentifiers} from '@/composables/use-publication-identifiers'
import {type TargetEditorRef} from '@/composables/use-target-gene'
import {useValidationErrors} from '@/composables/use-validation-errors'
import {type VariantScoreFieldsRef} from '@/components/forms/VariantScoreFields.vue'
import {suggestionsForAutocomplete, normalizeDoiArray, normalizeContributorArray} from '@/lib/form-helpers'
import {parseScoreSetValidationErrors} from '@/lib/form-validation'
import type {DraftScoreCalibration} from '@/lib/calibration-types'
import {components} from '@/schema/openapi'

type Contributor = components['schemas']['Contributor']
type DoiIdentifier = components['schemas']['DoiIdentifier']
type Experiment = components['schemas']['Experiment']
type License = components['schemas']['License']
type ScoreSet = components['schemas']['ScoreSet']
type ShortScoreSet = components['schemas']['ShortScoreSet']

export default {
  name: 'ScoreSetCreator',

  components: {
    PButton: Button,
    CalibrationEditor,
    PDialog: Dialog,
    MvFloatField,
    InputNumber,
    Message,
    MvLayout,
    MvPageHeader,
    MvEmailPrompt,
    ProgressSpinner,
    ScoreSetContextFields,
    ScoreSetFields,
    Step,
    StepList,
    StepPanel,
    StepPanels,
    Stepper,
    TargetEditor,
    ToggleSwitch,
    VariantScoreFields
  },

  props: {
    experimentUrn: {
      type: String,
      required: false,
      default: null
    }
  },

  setup: () => {
    useHead({title: 'New score set'})

    const publications = usePublicationIdentifiers()
    const licenseSearch = useAutocomplete<License>('/licenses/active')

    const extractScoreSets = (data: unknown) => ((data as Record<string, unknown>)?.scoreSets as ShortScoreSet[]) || []
    const supersededSearch = useAutocomplete<ShortScoreSet>('/me/score-sets/search', {
      method: 'POST',
      extract: extractScoreSets
    })
    const metaAnalyzesSearch = useAutocomplete<ShortScoreSet>('/score-sets/search', {
      method: 'POST',
      extract: extractScoreSets
    })

    const extraMetadataField = useJsonFileField('extraMetadata')
    const scoreColumnsMetadataField = useJsonFileField('scoreColumnsMetadata')
    const countColumnsMetadataField = useJsonFileField('countColumnsMetadata')
    const validation = useValidationErrors()

    licenseSearch.search()

    // ── Autocomplete search handlers. These could be extracted to a composable as in use-publication-identifiers,
    // but it's probably more effort than it's worth as they are not reused elsewhere ──

    function searchSupersededScoreSets(event: {query?: string}) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        supersededSearch.search(searchText)
      }
    }

    function searchMetaAnalyzesScoreSets(event: {query?: string}) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        metaAnalyzesSearch.search(searchText)
      }
    }

    return {
      ...publications,
      ...validation,
      licenses: licenseSearch.items,
      editableExperiments: ref([]),
      supersededScoreSetSuggestions: supersededSearch.items,
      supersededScoreSetSuggestionsLoading: supersededSearch.loading,
      searchSupersededScoreSets,
      metaAnalyzesScoreSetSuggestions: metaAnalyzesSearch.items,
      metaAnalyzesScoreSetSuggestionsLoading: metaAnalyzesSearch.loading,
      searchMetaAnalyzesScoreSets,
      extraMetadata: extraMetadataField.data,
      extraMetadataField,
      scoreColumnsMetadata: scoreColumnsMetadataField.data,
      scoreColumnsMetadataField,
      countColumnsMetadata: countColumnsMetadataField.data,
      countColumnsMetadataField
    }
  },

  data: () => ({
    // Step 1: Context
    isSupersedingScoreSet: false,
    supersededScoreSet: null as ScoreSet | null,
    isMetaAnalysis: false,
    metaAnalyzesScoreSets: [] as ScoreSet[],
    selectedExperiment: null as Experiment | null,
    experiment: null as Experiment | null,

    // Step 2: Score set info
    title: null as string | null,
    shortDescription: null as string | null,
    abstractText: null as string | null,
    methodText: null as string | null,
    licenseId: null as number | null,
    hasCustomUsagePolicy: false,
    dataUsagePolicy: null,
    contributors: [] as Contributor[],
    doiIdentifiers: [] as DoiIdentifier[],

    // Step 3: Target config
    isTargetSequence: true,
    isBaseEditor: false,
    isMultiTarget: false,
    numTargets: 1,

    // Calibration
    investigatorIsProvidingScoreCalibrations: false,
    calibrationDraft: null as DraftScoreCalibration | null,
    // UI state
    progressVisible: false,
    jsonToDisplay: null as string | null,
    activeWizardStep: 1,
    maxWizardStepEntered: 1,
    targetValidities: [] as boolean[]
  }),

  computed: {
    numSteps() {
      return 5 + this.numTargets
    },

    stepFields(): Record<number, string[]> {
      const fields: Record<number, string[]> = {
        1: ['experiment', 'supersededScoreSetUrn', 'metaAnalyzesScoreSetUrns'],
        2: [
          'title',
          'shortDescription',
          'methodText',
          'abstractText',
          'publicationIdentifiers',
          'primaryPublicationIdentifiers',
          'extraMetadata',
          'dataUsagePolicy'
        ],
        3: ['targets']
      }
      for (let i = 0; i < this.numTargets; i++) {
        fields[4 + i] = [`targetGenes.${i}.targetGene`]
      }
      fields[4 + this.numTargets] = ['scoreCalibrations']
      fields[5 + this.numTargets] = ['scoresFile', 'countsFile', 'scoreColumnsMetadataFile', 'countColumnsMetadataFile']
      return fields
    },

    maxWizardStepValidated() {
      const firstUnvalidatedStep = _.find(_.range(1, this.numSteps + 1), (step) => !this.validateWizardStep(step))
      return firstUnvalidatedStep ? firstUnvalidatedStep - 1 : this.numSteps
    },

    hasAccessionTarget() {
      return !this.isTargetSequence
    },

    metaAnalyzesScoreSetSuggestionsList() {
      return suggestionsForAutocomplete(this.metaAnalyzesScoreSetSuggestions)
    },

    supersededScoreSetSuggestionsList() {
      return suggestionsForAutocomplete(this.supersededScoreSetSuggestions)
    },

    defaultLicenseId(): number | null {
      return this.licenses
        ? ((this.licenses as License[]).find((license) => license.shortName === 'CC0')?.id ?? null)
        : null
    }
  },

  watch: {
    experimentUrn: {
      immediate: true,
      async handler(newValue, oldValue) {
        if (newValue !== oldValue && newValue) {
          try {
            const experiment = await getExperiment(this.experimentUrn)
            this.experiment = experiment
            this.populateExperimentMetadata(experiment)
            this.activeWizardStep = 1
          } catch {
            this.$toast.add({severity: 'error', summary: `Could not fetch experiment with urn ${this.experimentUrn}`})
          }
        }
      }
    },

    defaultLicenseId() {
      if (this.licenseId == null) {
        this.licenseId = this.defaultLicenseId
      }
    },

    isMultiTarget(newValue, oldValue) {
      if (newValue === oldValue) return
      this.numTargets = newValue ? 2 : 1
    }
  },

  async mounted() {
    await this.loadEditableExperiments()
  },

  methods: {
    // ── Context step helpers ──
    async loadEditableExperiments() {
      try {
        this.editableExperiments = await searchMyExperiments({metaAnalysis: false})
      } catch {
        this.editableExperiments = []
      }
    },

    onExperimentSelected(experiment: Experiment) {
      this.selectedExperiment = experiment
      if (experiment) {
        this.populateExperimentMetadata(experiment)
      }
    },

    populateExperimentMetadata(experiment: Experiment) {
      this.abstractText = experiment.abstractText ?? null
      this.contributors = experiment.contributors ?? []
      this.doiIdentifiers = experiment.doiIdentifiers ?? []
      this.loadPublications(
        experiment.primaryPublicationIdentifiers ?? [],
        experiment.secondaryPublicationIdentifiers ?? []
      )
    },

    populateSupersededScoreSetMetadata(event: {value?: ScoreSet}) {
      this.contributors = event.value?.contributors || []
    },

    // ── File handling ──
    fileCleared(inputName: JsonFileInputName) {
      const fieldMap = {
        extraMetadataFile: this.extraMetadataField,
        scoreColumnsMetadataFile: this.scoreColumnsMetadataField,
        countColumnsMetadataFile: this.countColumnsMetadataField
      }
      const field = fieldMap[inputName]
      if (field) {
        field.onClear()
        this.clearClientError(inputName.replace('File', ''))
      }
    },

    async fileSelected(inputName: JsonFileInputName, event: FileUploadSelectEvent) {
      const fieldMap = {
        extraMetadataFile: {field: this.extraMetadataField, key: 'extraMetadata'},
        scoreColumnsMetadataFile: {field: this.scoreColumnsMetadataField, key: 'scoreColumnsMetadata'},
        countColumnsMetadataFile: {field: this.countColumnsMetadataField, key: 'countColumnsMetadata'}
      }
      const entry = fieldMap[inputName]
      if (entry) {
        await entry.field.onSelect(event)
        if (entry.field.error.value) {
          this.setClientError(entry.key, entry.field.error.value)
        } else {
          this.clearClientError(entry.key)
        }
      }
    },

    // ── Validation ──
    validateWizardStep(step: number) {
      switch (true) {
        case step === 1:
          return (
            !!(this.isMetaAnalysis && this.metaAnalyzesScoreSets.length > 0) ||
            !!(this.isSupersedingScoreSet && this.supersededScoreSet) ||
            !!(
              (!this.isMetaAnalysis && !this.isSupersedingScoreSet && (this.selectedExperiment || this.experiment)) ||
              this.experimentUrn
            )
          )
        case step === 2:
          return this.title && this.shortDescription && this.abstractText && this.methodText
        case step === 3:
          return this.numTargets > 0
        case step > 3 && step <= 3 + this.numTargets:
          return this.targetValidities[step - 4] ?? false
        case step === 4 + this.numTargets: {
          if (!this.investigatorIsProvidingScoreCalibrations) return true
          if (!this.calibrationDraft) return false
          for (const scoreRange of this.calibrationDraft.functionalClassifications || []) {
            if (!scoreRange.label || !scoreRange.functionalClassification) return false
          }
          return (
            (this.calibrationDraft.functionalClassifications?.length ?? 0) > 0 ||
            this.calibrationDraft.baselineScore !== null
          )
        }
        default:
          return true
      }
    },

    minStepWithError() {
      for (let i = 1; i <= this.numSteps; i++) {
        if (this.wizardStepHasError(i)) return i
      }
      return this.numSteps
    },

    wizardStepHasError(step: number) {
      return !this.stepFields[step]?.every((field) => {
        for (const v of Object.keys(this.validationErrors)) {
          if (v.startsWith(field)) return false
        }
        return true
      })
    },

    showNextWizardStepIfValid(navigate: (step: number) => void) {
      if (this.maxWizardStepValidated >= this.activeWizardStep) {
        this.maxWizardStepEntered = Math.max(this.maxWizardStepEntered, this.activeWizardStep + 1)
        navigate(this.activeWizardStep + 1)
      }
    },

    // ── Form reset ──
    resetForm() {
      this.selectedExperiment = null
      this.supersededScoreSet = null
      this.isSupersedingScoreSet = false
      this.metaAnalyzesScoreSets = []
      this.isMetaAnalysis = false
      this.title = null
      this.shortDescription = null
      this.abstractText = null
      this.methodText = null
      this.licenseId = this.defaultLicenseId
      this.hasCustomUsagePolicy = false
      this.dataUsagePolicy = null
      this.contributors = []
      this.doiIdentifiers = []
      this.publicationIdentifiers = []
      this.primaryPublicationIdentifiers = []
      this.extraMetadataField.onClear()
      this.scoreColumnsMetadataField.onClear()
      this.countColumnsMetadataField.onClear()
      this.investigatorIsProvidingScoreCalibrations = false
      this.numTargets = 1
      this.isMultiTarget = false
      this.isTargetSequence = true
      this.isBaseEditor = false
      const editors = (this.$refs.targetEditors as TargetEditorRef[]) || []
      editors.forEach((editor) => editor?.reset())
      this.clearValidationState()
      this.activeWizardStep = 1
      this.maxWizardStepEntered = 1
    },

    // ── Save ──
    async save() {
      const supersededScoreSetUrn = this.supersededScoreSet ? this.supersededScoreSet.urn : null
      const metaAnalyzesScoreSetUrns = this.metaAnalyzesScoreSets.map((s) => s.urn)

      const editedFields = {
        experimentUrn:
          metaAnalyzesScoreSetUrns.length === 0 && supersededScoreSetUrn
            ? this.supersededScoreSet!.experiment.urn
            : this.experimentUrn || this.selectedExperiment?.urn,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        licenseId: this.licenseId,
        contributors: normalizeContributorArray(this.contributors),
        doiIdentifiers: normalizeDoiArray(this.doiIdentifiers),
        ...this.getPublicationPayload(),
        dataUsagePolicy: this.hasCustomUsagePolicy ? this.dataUsagePolicy : null,
        extraMetadata: this.extraMetadata || {},
        datasetColumns: {
          scoreColumnsMetadata: this.scoreColumnsMetadata || {},
          countColumnsMetadata: this.countColumnsMetadata || {}
        },
        scoreCalibrations:
          this.investigatorIsProvidingScoreCalibrations && this.calibrationDraft ? [this.calibrationDraft] : [],
        targetGenes: ((this.$refs.targetEditors as TargetEditorRef[]) || []).map((editor) =>
          editor.getPayload({isBaseEditor: this.isBaseEditor})
        ),
        supersededScoreSetUrn,
        metaAnalyzesScoreSetUrns
      }

      this.progressVisible = true
      let response
      try {
        response = await createScoreSet(editedFields)
      } catch (e: unknown) {
        response = getErrorResponse(e)
        this.$toast.add({severity: 'error', summary: 'Encountered an error while saving score set.', life: 3000})
      }
      this.progressVisible = false

      if (response.status === 200) {
        const savedItem = response.data
        this.clearValidationState()
        await this.uploadData(savedItem)
      } else if (response.data?.detail) {
        const result = parseScoreSetValidationErrors(response.data.detail, editedFields.targetGenes)
        if (result) {
          const calibrationEditor = this.$refs.calibrationEditor as InstanceType<typeof CalibrationEditor> | undefined
          if (calibrationEditor) {
            calibrationEditor.setServerErrors(result.calibrationErrors)
          }
          this.setServerErrors(result.formErrors)
          this.activeWizardStep = this.minStepWithError()
          const count = response.data.detail.length
          this.$toast.add({
            severity: 'error',
            summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
            life: 5000
          })
        } else {
          this.$toast.add({
            severity: 'error',
            summary: `Encountered an error saving score set: ${response.data.detail}`
          })
        }
      }
    },

    async uploadData(scoreSet: ScoreSet) {
      const variantFields = this.$refs.variantScoreFields as VariantScoreFieldsRef | undefined
      const scoresFile = variantFields?.scoresFile
      const countsFile = variantFields?.countsFile

      if (!scoresFile) {
        this.validationErrors = {scoresFile: 'Required'}
        return
      }

      const formData = new FormData()
      formData.append('scores_file', scoresFile)
      if (countsFile) {
        formData.append('counts_file', countsFile)
      }
      if (this.scoreColumnsMetadata) {
        formData.append('score_columns_metadata', JSON.stringify(this.scoreColumnsMetadata))
      }
      if (this.countColumnsMetadata) {
        formData.append('count_columns_metadata', JSON.stringify(this.countColumnsMetadata))
      }

      this.progressVisible = true
      let response
      try {
        response = await uploadVariantData(scoreSet.urn, formData)
      } catch (e: unknown) {
        response = getErrorResponse(e)
      }
      this.progressVisible = false

      if (response.status === 200) {
        this.$router.replace({path: `/score-sets/submit-completion/${scoreSet.urn}`})
        this.$toast.add({severity: 'success', summary: 'The new score set was saved.', life: 3000})
      } else {
        this.$toast.add({
          severity: 'error',
          summary: `The score and count files could not be imported. ${response.data?.detail || ''}`,
          life: 3000
        })
      }
    },

    async validateAndSave() {
      this.clearServerErrors()
      const variantFields = this.$refs.variantScoreFields as VariantScoreFieldsRef | undefined
      if (!variantFields?.scoresFile) {
        this.setClientError('scoresFile', 'Required')
      }
      if (!this.hasValidationErrors) {
        await this.save()
      } else {
        this.activeWizardStep = this.minStepWithError()
        const count = Object.keys(this.validationErrors).length
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      }
    },

    // ── Navigation ──
    backDashboard() {
      this.$router.replace({path: '/dashboard'})
    }
  }
}
</script>

<style scoped>
/* Only show the title on the active step to keep the stepper compact */
:deep(.p-step:not(.p-step-active) .p-step-title) {
  display: none;
}
</style>
