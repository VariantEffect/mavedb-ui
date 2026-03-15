<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader max-width="1280px" title="Create a new experiment" variant="toolbar">
        <template #actions>
          <PButton severity="secondary" size="small" @click="resetForm">Clear</PButton>
          <PButton severity="warn" size="small" @click="backDashboard">Cancel</PButton>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto max-w-screen-xl py-6 w-full">
      <Stepper v-model:value="activeWizardStep">
        <StepList>
          <Step :value="1">Experiment information</Step>
          <Step
            :disabled="maxWizardStepEntered < activeWizardStep || maxWizardStepValidated < activeWizardStep - 1"
            :value="2"
          >
            Keywords
          </Step>
        </StepList>
        <StepPanels>
          <!-- Step 1: Experiment information -->
          <StepPanel v-slot="{activateCallback}" :value="1">
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>

              <!-- Experiment set info (creator-specific) -->
              <div class="wizard-row">
                <div class="wizard-help">
                  <label class="font-bold" :for="scopedId('field-value-experiment-set')">Experiment set:</label>
                  <span :id="scopedId('field-value-experiment-set')" class="ml-1">
                    {{ experimentSetUrn || '(New experiment set)' }}
                  </span>
                  <MvFieldError :error="validationErrors.experimentSetUrn" />
                </div>
                <div class="wizard-field">
                  <p v-if="experimentSetUrn" class="text-sm text-text-muted">
                    This experiment will be added to experiment set {{ experimentSetUrn }}. This cannot be changed after
                    the experiment is created. To use a different set, navigate to it and click "Add experiment."
                  </p>
                  <p v-else class="text-sm italic text-text-muted">
                    A new experiment set will be created for this experiment. This cannot be changed after creating the
                    experiment. To add to an existing set, navigate to it and click "Add experiment."
                  </p>
                </div>
              </div>

              <!-- All experiment fields rendered as wizard rows -->
              <ExperimentFields
                :abstract-text="abstractText"
                :contributors="contributors"
                :doi-identifiers="doiIdentifiers"
                entity-label="this experiment"
                :extra-metadata="extraMetadata"
                :method-text="methodText"
                :primary-publication-identifiers="primaryPublicationIdentifiers"
                :publication-identifiers="publicationIdentifiers"
                :publication-search-loading="publicationSearchLoading"
                :publication-suggestions="publicationIdentifierSuggestionsList"
                :raw-read-identifiers="rawReadIdentifiers"
                :short-description="shortDescription"
                :title="title"
                :validation-errors="validationErrors"
                wizard-mode
                @clear-extra-metadata="fileCleared('extraMetadataFile')"
                @search-publications="searchPublicationIdentifiers($event)"
                @select-extra-metadata="fileSelected('extraMetadataFile', $event)"
                @update:abstract-text="abstractText = $event"
                @update:contributors="contributors = $event"
                @update:doi-identifiers="doiIdentifiers = $event"
                @update:method-text="methodText = $event"
                @update:primary-publication-identifiers="primaryPublicationIdentifiers = $event"
                @update:publication-identifiers="publicationIdentifiers = $event"
                @update:raw-read-identifiers="rawReadIdentifiers = $event"
                @update:short-description="shortDescription = $event"
                @update:title="title = $event"
                @view-extra-metadata="jsonToDisplay = JSON.stringify(extraMetadata, null, 2)"
              />
            </div>

            <!-- Step controls -->
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

          <!-- Step 2: Keywords -->
          <StepPanel v-slot="{activateCallback}" :value="2">
            <div class="bg-bg pt-3 pb-3">
              <div class="rounded border-l-3 border-sage bg-sage-light px-3 py-2 text-sm">
                Keywords help others discover and categorize your experiment. In a future release, keyword selection
                will become mandatory.
              </div>
            </div>
            <div class="wizard-form">
              <div class="wizard-form-content-bg"></div>

              <KeywordFields
                :keyword-descriptions="keywordDescriptions"
                :keyword-keys="keywordKeys"
                :keyword-options="keywordOptionsRecord"
                :keyword-text-visible="keywordTextVisible"
                :validation-errors="validationErrors"
                wizard-mode
                @toggle-description="keywordToggleInput($event)"
                @update:keyword-description="(key: string, val: string) => (keywordDescriptions[key] = val)"
                @update:keyword-key="updateKeywordKey"
              />
            </div>

            <!-- Step controls -->
            <div class="flex justify-between bg-bg px-2.5 pt-4 pb-2">
              <PButton
                icon="pi pi-arrow-left"
                label="Back"
                severity="secondary"
                @click="activateCallback(activeWizardStep - 1)"
              />
              <PButton icon="pi pi-arrow-right" icon-pos="right" label="Save" @click="validateAndSave()" />
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
import PButton from 'primevue/button'
import PDialog from 'primevue/dialog'
import type {FileUploadSelectEvent} from 'primevue/fileupload'
import ProgressSpinner from 'primevue/progressspinner'
import Step from 'primevue/step'
import StepList from 'primevue/steplist'
import StepPanel from 'primevue/steppanel'
import StepPanels from 'primevue/steppanels'
import Stepper from 'primevue/stepper'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import ExperimentFields from '@/components/forms/ExperimentFields.vue'
import KeywordFields from '@/components/forms/KeywordFields.vue'
import useScopedId from '@/composables/scoped-id'
import {useExperimentKeywords} from '@/composables/use-experiment-keywords'
import {useJsonFileField} from '@/composables/use-json-file-field'
import {usePublicationIdentifiers} from '@/composables/use-publication-identifiers'
import {createExperiment, getErrorResponse} from '@/api/mavedb'
import useAuth from '@/composition/auth'
import {useKeywordOptions} from '@/composables/use-keyword-options'
import {normalizeDoiArray, normalizeRawReadArray, normalizeContributorArray} from '@/lib/form-helpers'
import {useValidationErrors} from '@/composables/use-validation-errors'
import {parseApiValidationErrors} from '@/lib/form-validation'
import type {components} from '@/schema/openapi'

type DoiIdentifier = components['schemas']['DoiIdentifier']
type RawReadIdentifier = components['schemas']['RawReadIdentifier']
type Contributor = components['schemas']['Contributor']

export default defineComponent({
  name: 'ExperimentCreator',

  components: {
    PButton,
    PDialog,
    MvFieldError,
    MvLayout,
    MvPageHeader,
    ExperimentFields,
    KeywordFields,
    EmailPrompt,
    ProgressSpinner,
    Step,
    StepList,
    StepPanel,
    StepPanels,
    Stepper
  },

  props: {
    experimentSetUrn: {
      type: String,
      required: false,
      default: null
    }
  },

  setup: () => {
    useHead({title: 'New experiment'})
    const {userProfile} = useAuth()

    // Form validation
    const validation = useValidationErrors()

    // Publications
    const publications = usePublicationIdentifiers()

    // Keywords
    const {options: keywordOptionsRecord, loadAll: loadAllKeywordOptions} = useKeywordOptions()
    const experimentKeywords = useExperimentKeywords()

    // Extra metadata
    const extraMetadataField = useJsonFileField('extraMetadata')

    return {
      userProfile,
      ...useScopedId(),
      ...validation,
      ...publications,
      keywordOptionsRecord,
      loadAllKeywordOptions,
      ...experimentKeywords,
      extraMetadata: extraMetadataField.data,
      extraMetadataField
    }
  },

  data: () => ({
    // Form fields
    title: null as string | null,
    shortDescription: null as string | null,
    abstractText: null as string | null,
    methodText: null as string | null,
    contributors: [] as Contributor[],
    doiIdentifiers: [] as DoiIdentifier[],
    rawReadIdentifiers: [] as RawReadIdentifier[],

    // UI state
    progressVisible: false,
    jsonToDisplay: null as string | null,
    activeWizardStep: 1,
    maxWizardStepEntered: 1,
    stepFields: {
      1: [
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
      2: ['keywords']
    } as Record<number, string[]>
  }),

  computed: {
    numWizardSteps(): number {
      return Object.keys(this.stepFields).length
    },

    maxWizardStepValidated() {
      const maxStepValidated =
        _.findIndex(_.range(0, this.numWizardSteps), (step) => !this.validateWizardStep(step)) - 1
      return maxStepValidated === -2 ? this.numWizardSteps - 1 : maxStepValidated
    }
  },

  mounted() {
    this.loadAllKeywordOptions()
  },

  methods: {
    fileCleared(inputName: string) {
      if (inputName === 'extraMetadataFile') {
        this.extraMetadataField.onClear()
        this.clearClientError('extraMetadata')
      }
    },

    async fileSelected(inputName: string, event: FileUploadSelectEvent) {
      if (inputName === 'extraMetadataFile') {
        await this.extraMetadataField.onSelect(event)
        if (this.extraMetadataField.error.value) {
          this.setClientError('extraMetadata', this.extraMetadataField.error.value)
        } else {
          this.clearClientError('extraMetadata')
        }
      }
    },

    validateWizardStep(step: number) {
      switch (step) {
        case 0:
          return this.title && this.shortDescription && this.abstractText && this.methodText
        default:
          return true
      }
    },

    minStepWithError() {
      for (let i = 1; i <= this.numWizardSteps; i++) {
        if (this.wizardStepHasError(i)) return i
      }
      return this.numWizardSteps
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

    resetForm() {
      this.title = null
      this.shortDescription = null
      this.abstractText = null
      this.methodText = null
      this.contributors = this.userProfile?.sub
        ? [
            {
              orcidId: this.userProfile.sub,
              givenName: this.userProfile.given_name,
              familyName: this.userProfile.family_name
            }
          ]
        : []
      this.doiIdentifiers = []
      this.rawReadIdentifiers = []
      this.clearPublications()
      this.extraMetadataField.onClear()
      this.clearValidationState()
    },

    async save() {
      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        contributors: normalizeContributorArray(this.contributors),
        ...this.buildKeywordsPayload(),
        doiIdentifiers: normalizeDoiArray(this.doiIdentifiers),
        ...this.getPublicationPayload(),
        rawReadIdentifiers: normalizeRawReadArray(this.rawReadIdentifiers),
        extraMetadata: this.extraMetadata || {},
        experimentSetUrn: this.experimentSetUrn
      }

      this.progressVisible = true
      let response
      try {
        response = await createExperiment(editedFields)
      } catch (e: unknown) {
        response = getErrorResponse(e)
      }
      this.progressVisible = false

      if (response.status === 200) {
        const savedItem = response.data
        this.clearValidationState()
        this.$router.replace({path: `/experiments/${savedItem.urn}`})
        this.$toast.add({severity: 'success', summary: 'The new experiment was saved.', life: 3000})
      } else if (response.data?.detail) {
        const fieldErrors = parseApiValidationErrors(response.data.detail)
        if (fieldErrors) {
          this.setServerErrors(fieldErrors)
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
            summary: `Encountered an error saving experiment: ${response.data.detail}`
          })
        }
      }
    },

    async validateAndSave() {
      this.clearServerErrors()
      if (_.isEmpty(this.validationErrors)) {
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

    backDashboard() {
      this.$router.replace({path: '/dashboard'})
    }
  }
})
</script>
