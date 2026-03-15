<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader
        v-if="itemStatus !== 'NotLoaded'"
        eyebrow="Edit Experiment"
        max-width="1280px"
        :title="title || 'Untitled'"
        variant="editor"
      >
        <template #subtitle>
          <div class="mt-0.5 font-mono text-sm text-text-muted">{{ item?.urn }}</div>
        </template>
        <template v-if="item" #actions>
          <PButton size="small" @click="validateAndSave">Save changes</PButton>
          <PButton severity="secondary" size="small" @click="resetForm">Reset</PButton>
          <PButton severity="warn" size="small" @click="viewItem">Cancel</PButton>
        </template>
      </MvPageHeader>
    </template>

    <div class="py-7">
      <div class="space-y-5 max-w-screen-lg mx-auto">
        <!-- Experiment Information Card -->
        <div class="editor-card">
          <h3 class="mb-4 text-[15px] font-bold text-text-primary">Experiment Information</h3>
          <ExperimentFields v-bind="fieldProps" section="info" />
        </div>

        <!-- References and Contributors Card -->
        <div class="editor-card">
          <h3 class="mb-4 text-[15px] font-bold text-text-primary">References &amp; Contributors</h3>
          <ExperimentFields v-bind="fieldProps" section="references" />
        </div>

        <!-- Keywords Card -->
        <div class="editor-card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-[15px] font-bold text-text-primary">Keywords</h3>
            <div class="flex items-center gap-2">
              <PButton
                icon="pi pi-refresh"
                label="Reset"
                severity="secondary"
                size="small"
                @click="resetKeywords(item?.keywords)"
              />
              <PButton icon="pi pi-times" label="Clear all" severity="danger" size="small" @click="clearKeywords" />
            </div>
          </div>
          <KeywordFields
            :keyword-descriptions="keywordDescriptions"
            :keyword-keys="keywordKeys"
            :keyword-options="keywordOptionsRecord"
            :keyword-text-visible="keywordTextVisible"
            :validation-errors="validationErrors"
            @toggle-description="keywordToggleInput($event)"
            @update:keyword-description="(key, val) => (keywordDescriptions[key] = val)"
            @update:keyword-key="updateKeywordKey"
          />
        </div>

        <!-- Score sets card (read-only) -->
        <div v-if="item?.scoreSetUrns?.length" class="editor-card">
          <h3 class="text-[15px] font-bold text-text-primary">Score Sets</h3>
          <p class="mb-3 text-xs italic leading-relaxed text-text-muted">
            Score sets cannot be edited from this page. Click a score set below to view or edit it.
          </p>
          <ul class="list-disc pl-5 space-y-1 text-sm">
            <li v-for="urn in item.scoreSetUrns" :key="urn">
              <EntityLink :display="scoreSetDisplay" entity-type="scoreSet" :urn="urn" :use-cache="true" />
            </li>
          </ul>
        </div>
      </div>
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
import type {FileUploadSelectEvent} from 'primevue/fileupload'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import EntityLink from '@/components/common/EntityLink.vue'
import ExperimentFields from '@/components/forms/ExperimentFields.vue'
import KeywordFields from '@/components/forms/KeywordFields.vue'
import {useExperimentKeywords} from '@/composables/use-experiment-keywords'
import {useJsonFileField} from '@/composables/use-json-file-field'
import {usePublicationIdentifiers, type PublicationIdentifier} from '@/composables/use-publication-identifiers'
import useAuth from '@/composition/auth'
import {updateExperiment, getErrorResponse} from '@/api/mavedb'
import useItem from '@/composition/item.ts'
import {useKeywordOptions} from '@/composables/use-keyword-options'
import {normalizeDoiArray, normalizeRawReadArray, normalizeContributorArray} from '@/lib/form-helpers'
import {useValidationErrors} from '@/composables/use-validation-errors'
import {parseApiValidationErrors} from '@/lib/form-validation'
import type {components} from '@/schema/openapi'

type DoiIdentifier = components['schemas']['DoiIdentifier']
type RawReadIdentifier = components['schemas']['RawReadIdentifier']
type Contributor = components['schemas']['Contributor']
type ScoreSet = components['schemas']['ScoreSet']
type Experiment = components['schemas']['Experiment']

export default defineComponent({
  name: 'ExperimentEditor',

  components: {
    PButton: Button,
    PDialog: Dialog,
    EmailPrompt,
    EntityLink,
    ExperimentFields,
    KeywordFields,
    MvLayout,
    MvPageHeader,
    ProgressSpinner
  },

  props: {
    itemId: {
      type: String,
      required: false,
      default: null
    }
  },

  setup: () => {
    useHead({title: 'Edit experiment'})
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
      ...useItem<Experiment>({itemTypeName: 'experiment'}),
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
    jsonToDisplay: null as string | null
  }),

  computed: {
    fieldProps() {
      return {
        title: this.title ?? undefined,
        shortDescription: this.shortDescription ?? undefined,
        abstractText: this.abstractText ?? undefined,
        methodText: this.methodText ?? undefined,
        doiIdentifiers: this.doiIdentifiers,
        publicationIdentifiers: this.publicationIdentifiers,
        primaryPublicationIdentifiers: this.primaryPublicationIdentifiers,
        rawReadIdentifiers: this.rawReadIdentifiers,
        contributors: this.contributors,
        extraMetadata: this.extraMetadata ?? undefined,
        validationErrors: this.validationErrors,
        publicationSuggestions: this.publicationIdentifierSuggestionsList,
        publicationSearchLoading: this.publicationSearchLoading,
        entityLabel: 'this experiment',
        'onUpdate:title': (v: string | null) => (this.title = v),
        'onUpdate:shortDescription': (v: string | null) => (this.shortDescription = v),
        'onUpdate:abstractText': (v: string | null) => (this.abstractText = v),
        'onUpdate:methodText': (v: string | null) => (this.methodText = v),
        'onUpdate:doiIdentifiers': (v: DoiIdentifier[]) => (this.doiIdentifiers = v),
        'onUpdate:publicationIdentifiers': (v: PublicationIdentifier[]) => (this.publicationIdentifiers = v),
        'onUpdate:primaryPublicationIdentifiers': (v: PublicationIdentifier[]) =>
          (this.primaryPublicationIdentifiers = v),
        'onUpdate:rawReadIdentifiers': (v: RawReadIdentifier[]) => (this.rawReadIdentifiers = v),
        'onUpdate:contributors': (v: Contributor[]) => (this.contributors = v),
        onSearchPublications: this.searchPublicationIdentifiers,
        onViewExtraMetadata: () => (this.jsonToDisplay = JSON.stringify(this.extraMetadata, null, 2)),
        onClearExtraMetadata: () => this.fileCleared('extraMetadataFile'),
        onSelectExtraMetadata: (v: FileUploadSelectEvent) => this.fileSelected('extraMetadataFile', v)
      }
    }
  },

  watch: {
    item: {
      handler() {
        this.resetForm()
      }
    },
    itemId: {
      handler() {
        this.setItemId(this.itemId)
      },
      immediate: true
    }
  },

  mounted() {
    this.resetForm()
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

    resetForm() {
      if (this.item) {
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText ?? null
        this.methodText = this.item.methodText ?? null
        this.contributors = _.sortBy(this.item.contributors, ['familyName', 'givenName', 'orcidId'])
        this.doiIdentifiers = this.item.doiIdentifiers
        this.loadPublications(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
        this.rawReadIdentifiers = this.item.rawReadIdentifiers
        this.extraMetadata = (this.item.extraMetadata as Record<string, unknown>) ?? null
      }
      this.resetKeywords(this.item?.keywords as Parameters<typeof this.resetKeywords>[0])
      this.clearValidationState()
    },

    async save() {
      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        contributors: normalizeContributorArray(this.contributors),
        doiIdentifiers: normalizeDoiArray(this.doiIdentifiers),
        rawReadIdentifiers: normalizeRawReadArray(this.rawReadIdentifiers),
        ...this.buildKeywordsPayload(),
        ...this.getPublicationPayload(),
        extraMetadata: this.extraMetadata
      }

      // Deep-clone the item and clear array fields on the clone so that
      // deleted items aren't merged back. We must not mutate this.item
      // directly — it may be Vuex store state, and clearing it would cause
      // data loss if the save request fails.
      const baseItem = _.cloneDeep(this.item) as Experiment
      baseItem.contributors = []
      baseItem.keywords = []
      baseItem.doiIdentifiers = []
      baseItem.primaryPublicationIdentifiers = []
      baseItem.secondaryPublicationIdentifiers = []
      baseItem.rawReadIdentifiers = []

      const editedItem = _.merge({}, baseItem, editedFields)
      let response
      try {
        response = await updateExperiment(this.item!.urn, editedItem)
      } catch (e: unknown) {
        response = getErrorResponse(e)
      }

      if (response.status === 200) {
        const savedItem = response.data
        this.clearValidationState()
        this.$router.replace({path: `/experiments/${savedItem.urn}`})
        this.$toast.add({severity: 'success', summary: 'Your changes were saved.', life: 3000})
      } else if (response.data?.detail) {
        const fieldErrors = parseApiValidationErrors(response.data.detail)
        if (fieldErrors) {
          this.setServerErrors(fieldErrors)
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
        const count = Object.keys(this.validationErrors).length
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      }
    },

    scoreSetDisplay(e: ScoreSet) {
      return `${e.urn}: ${e.title}`
    },

    viewItem() {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}`})
      }
    }
  }
})
</script>
