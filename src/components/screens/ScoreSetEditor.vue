<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit a score set. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader
        v-if="itemStatus !== 'NotLoaded'"
        eyebrow="Edit Score Set"
        max-width="1000px"
        :title="title || 'Untitled'"
        variant="editor"
      >
        <template #subtitle>
          <div class="mt-0.5 font-mono text-xs text-text-muted">{{ item?.urn }}</div>
        </template>
        <template v-if="item" #actions>
          <PButton size="small" @click="validateAndSave()">Save changes</PButton>
          <PButton severity="secondary" size="small" @click="resetForm">Reset</PButton>
          <PButton severity="warn" size="small" @click="viewItem">Cancel</PButton>
        </template>
      </MvPageHeader>
    </template>

    <div v-if="itemId && itemStatus === 'Loaded' && item" class="mx-auto max-w-[1000px] py-7">
      <div class="space-y-5">
        <!-- Parent experiment and context -->
        <div class="editor-card">
          <h3 class="text-[15px] font-bold text-text-primary">Parent experiment and context</h3>
          <p v-if="experiment" class="mb-3 text-xs italic leading-relaxed text-text-muted">
            The parent experiment cannot be changed after the score set has been created.
          </p>
          <ScoreSetContextFields
            :editable-experiments="editableExperiments"
            :experiment="experiment"
            :fixed-experiment-title="experiment?.title"
            :fixed-experiment-urn="experiment?.urn"
            :validation-errors="validationErrors"
            @update:experiment="onExperimentSelected($event)"
          />
        </div>

        <!-- Score set information -->
        <div class="editor-card">
          <h3 class="mb-4 text-[15px] font-bold text-text-primary">Score set information</h3>
          <ScoreSetFields v-bind="fieldProps" section="info" />
        </div>

        <!-- References & Contributors -->
        <div class="editor-card">
          <h3 class="mb-4 text-[15px] font-bold text-text-primary">References &amp; Contributors</h3>
          <ScoreSetFields v-bind="fieldProps" section="references" />
        </div>

        <!-- Targets (only editable when private) -->
        <div v-if="item.private" class="editor-card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-[15px] font-bold text-text-primary">Targets</h3>
            <div class="flex items-center gap-2">
              <template v-if="targetGenes.length > 0">
                <PButton icon="pi pi-plus" label="Add target" size="small" @click="targetEditorVisible = true" />
                <PButton icon="pi pi-refresh" label="Reset" severity="secondary" size="small" @click="resetTargets" />
                <PButton icon="pi pi-times" label="Clear all" severity="danger" size="small" @click="targetsCleared" />
              </template>
            </div>
          </div>

          <MvEmptyState
            v-if="targetGenes.length === 0"
            action-label="+ Add target"
            description="Targets define the reference sequences or genomic accessions that variants are described against."
            title="No targets added yet"
            @action="targetEditorVisible = true"
          />

          <div v-else class="space-y-2">
            <div
              v-for="(tg, idx) in targetGenes"
              :key="idx"
              class="flex items-start gap-3 rounded-md border border-border bg-bg-secondary px-3 py-2.5"
            >
              <!-- Number badge -->
              <div
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/20 text-xs font-semibold text-sage-dark"
              >
                {{ idx + 1 }}
              </div>

              <!-- Target details -->
              <div class="min-w-0 flex-1">
                <div class="text-[15px] font-semibold text-text-primary">{{ tg.name || 'Unnamed target' }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    v-if="tg.category"
                    class="inline-flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-sage-dark"
                  >
                    <span class="font-medium text-text-muted">Category:</span> {{ formatCategory(tg.category) }}
                  </span>
                  <span
                    v-if="tg.targetSequence?.taxonomy"
                    class="inline-flex items-center gap-1 rounded-full bg-mint/10 px-2 py-0.5 text-text-secondary"
                  >
                    <span class="font-medium text-text-muted">Organism:</span>
                    {{ tg.targetSequence.taxonomy.organismName }}
                  </span>
                  <span
                    v-if="tg.targetSequence?.sequenceType"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-text-secondary"
                  >
                    <span class="font-medium text-text-muted">Type:</span> {{ tg.targetSequence.sequenceType }}
                  </span>
                  <span
                    v-if="tg.targetAccession?.accession"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-text-secondary"
                  >
                    <span class="font-medium font-sans text-text-muted">Accession:</span>
                    {{ tg.targetAccession.accession }}
                  </span>
                  <span
                    v-if="tg.targetAccession?.assembly"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-text-secondary"
                  >
                    <span class="font-medium text-text-muted">Assembly:</span> {{ tg.targetAccession.assembly }}
                  </span>
                  <span
                    v-if="tg.targetAccession?.gene"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-text-secondary"
                  >
                    <span class="font-medium text-text-muted">Gene:</span> {{ tg.targetAccession.gene }}
                  </span>
                  <template v-if="tg.externalIdentifiers?.length">
                    <span
                      v-for="eid in tg.externalIdentifiers"
                      :key="eid.identifier?.identifier"
                      class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-text-secondary"
                    >
                      <span class="font-medium font-sans text-text-muted">{{ eid.identifier?.dbName }}:</span>
                      {{ eid.identifier?.identifier }}
                      <template v-if="eid.offset"> (offset {{ eid.offset }})</template>
                    </span>
                  </template>
                </div>
                <span v-if="validationErrors[`targetGenes.${idx}.name`]" class="mt-1 block text-xs text-danger">
                  Gene Name {{ validationErrors[`targetGenes.${idx}.name`] }}
                </span>
              </div>

              <PButton icon="pi pi-trash" severity="danger" size="small" text @click="targetDeleted(idx)" />
            </div>
          </div>

          <!-- Base editor toggle (only for reference-based targets) -->
          <div
            v-if="targetGenes.some((tg) => tg.targetAccession?.accession)"
            class="mt-4 rounded-md border border-border/60 bg-bg-secondary/50 px-4 py-3"
          >
            <div class="flex items-center">
              <ToggleSwitch v-model="isBaseEditor" />
              <span class="ml-3 text-sm">
                This score set
                <strong>{{ isBaseEditor ? 'does' : 'does not' }}</strong>
                represent base editor data.
              </span>
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-text-muted">
              Base editor experiments use targeted nucleotide changes rather than saturation mutagenesis. Enable this if
              your assay uses a base editing system (e.g. ABE, CBE).
            </p>
          </div>

          <span v-if="validationErrors['targetGenes']" class="mt-2 block text-sm text-danger">
            {{ validationErrors['targetGenes'] }}
          </span>
        </div>

        <!-- Variant scores -->
        <div class="editor-card">
          <h3 class="mb-4 text-[15px] font-bold text-text-primary">Variant scores</h3>
          <VariantScoreFields
            ref="variantScoreFields"
            :count-columns-metadata="countColumnsMetadata"
            :existing-variant-count="item.numVariants"
            :has-accession-target="targetGenes.length > 0 && !!targetGenes[0]?.targetAccession?.accession"
            :has-multiple-targets="targetGenes.length > 1"
            :score-columns-metadata="scoreColumnsMetadata"
            :validation-errors="validationErrors"
            @file-cleared="(inputName) => fileCleared(inputName)"
            @file-selected="(inputName, evt) => fileSelected(inputName, evt)"
            @view-json="jsonToDisplay = JSON.stringify($event, null, 2)"
          />
        </div>

        <!-- Calibrations card (read-only) -->
        <div v-if="item.scoreCalibrations?.length" class="editor-card">
          <h3 class="text-[15px] font-bold text-text-primary">Calibrations</h3>
          <p class="mb-3 text-xs italic leading-relaxed text-text-muted">
            Calibrations cannot be edited from this page.
            <router-link
              class="text-link hover:underline"
              :to="{name: 'scoreSetCalibrations', params: {urn: item.urn}}"
            >
              Manage calibrations
            </router-link>
          </p>
          <ul class="list-disc pl-5 space-y-1 text-sm">
            <li v-for="cal in item.scoreCalibrations" :key="cal.id">
              <router-link
                class="text-link hover:underline"
                :to="{name: 'scoreSetCalibrations', params: {urn: item.urn}}"
              >
                {{ cal.title }}
              </router-link>
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

    <PDialog
      v-model:visible="targetEditorVisible"
      :close-on-escape="false"
      header="Add Target"
      modal
      :style="{maxWidth: '90%', width: '75rem'}"
    >
      <TargetEditor ref="targetEditor" :target-sequence-mode="existingTargetMode" @save="onTargetAdded($event)" />
      <template #footer>
        <PButton label="Cancel" severity="secondary" @click="targetEditorVisible = false" />
        <PButton label="Add Target" @click="saveTargetEditor()" />
      </template>
    </PDialog>
  </MvLayout>
</template>

<script lang="ts">
import _ from 'lodash'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import type {FileUploadSelectEvent} from 'primevue/fileupload'
import ProgressSpinner from 'primevue/progressspinner'
import {defineComponent, ref} from 'vue'
import {useHead} from '@unhead/vue'

import ToggleSwitch from 'primevue/toggleswitch'

import {searchMyExperiments, updateScoreSetWithVariants, getErrorResponse} from '@/api/mavedb'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import ScoreSetContextFields from '@/components/forms/ScoreSetContextFields.vue'
import ScoreSetFields from '@/components/forms/ScoreSetFields.vue'
import TargetEditor from '@/components/forms/TargetEditor.vue'
import VariantScoreFields, {type VariantScoreFieldsRef} from '@/components/forms/VariantScoreFields.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import {useAutocomplete} from '@/composables/use-autocomplete'
import {useJsonFileField, type JsonFileInputName} from '@/composables/use-json-file-field'
import {usePublicationIdentifiers} from '@/composables/use-publication-identifiers'
import {type TargetEditorRef} from '@/composables/use-target-gene'
import {useValidationErrors} from '@/composables/use-validation-errors'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item.ts'
import {normalizeDoiArray, normalizeContributorArray} from '@/lib/form-helpers'
import {parseApiValidationErrors} from '@/lib/form-validation'
import {TargetGeneCategory, textForTargetGeneCategory} from '@/lib/target-genes'
import {type PublicationIdentifier} from '@/lib/publication'
import {components} from '@/schema/openapi'

type Contributor = components['schemas']['Contributor']
type DoiIdentifier = components['schemas']['DoiIdentifier']
type Experiment = components['schemas']['Experiment']
type License = components['schemas']['License']
type ShorterScoreSet = components['schemas']['ShorterScoreSet']
type ScoreSet = components['schemas']['ScoreSet']
type TargetGene = components['schemas']['TargetGene']

export default defineComponent({
  name: 'ScoreSetEditor',

  components: {
    PButton: Button,
    PDialog: Dialog,
    EmailPrompt,
    MvEmptyState,
    MvLayout,
    MvPageHeader,
    ProgressSpinner,
    ScoreSetContextFields,
    ScoreSetFields,
    TargetEditor,
    ToggleSwitch,
    VariantScoreFields
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    useHead({title: 'Edit score set'})

    const validation = useValidationErrors()
    const publications = usePublicationIdentifiers()
    const licenseSearch = useAutocomplete<License>('/licenses/active')
    const extraMetadataField = useJsonFileField('extraMetadata')
    const scoreColumnsMetadataField = useJsonFileField('scoreColumnsMetadata')
    const countColumnsMetadataField = useJsonFileField('countColumnsMetadata')

    return {
      ...useFormatters(),
      ...useItem<ScoreSet>({itemTypeName: 'scoreSet'}),
      ...publications,
      ...validation,
      licenses: licenseSearch.items,
      licenseSearch: licenseSearch.search,
      editableExperiments: ref([]),
      extraMetadata: extraMetadataField.data,
      extraMetadataField,
      scoreColumnsMetadata: scoreColumnsMetadataField.data,
      scoreColumnsMetadataField,
      countColumnsMetadata: countColumnsMetadataField.data,
      countColumnsMetadataField
    }
  },

  data: () => ({
    experiment: null as Experiment | null,
    metaAnalyzesScoreSetUrns: [] as string[],
    supersededScoreSet: null as ShorterScoreSet | null,
    licenseId: null as number | null,
    title: null as string | null,
    shortDescription: null as string | null,
    abstractText: null as string | null,
    methodText: null as string | null,
    doiIdentifiers: [] as DoiIdentifier[],
    secondaryPublicationIdentifiers: [] as PublicationIdentifier[],
    contributors: [] as Contributor[],
    dataUsagePolicy: null as string | null,

    // Target state
    targetGenes: [] as TargetGene[],
    isBaseEditor: false,
    targetEditorVisible: false,

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
        licenseId: this.licenseId ?? undefined,
        licenses: this.licenses as License[],
        hasCustomUsagePolicy: !!this.dataUsagePolicy,
        dataUsagePolicy: this.dataUsagePolicy ?? undefined,
        doiIdentifiers: this.doiIdentifiers,
        publicationIdentifiers: this.publicationIdentifiers,
        primaryPublicationIdentifiers: this.primaryPublicationIdentifiers,
        contributors: this.contributors,
        extraMetadata: this.extraMetadata ?? undefined,
        validationErrors: this.validationErrors,
        publicationSuggestions: this.publicationIdentifierSuggestionsList,
        publicationSearchLoading: this.publicationSearchLoading,
        'onUpdate:title': (v: string | null) => (this.title = v),
        'onUpdate:shortDescription': (v: string | null) => (this.shortDescription = v),
        'onUpdate:abstractText': (v: string | null) => (this.abstractText = v),
        'onUpdate:methodText': (v: string | null) => (this.methodText = v),
        'onUpdate:licenseId': (v: number | null) => (this.licenseId = v),
        'onUpdate:hasCustomUsagePolicy': (v: boolean) => {
          if (!v) this.dataUsagePolicy = null
        },
        'onUpdate:dataUsagePolicy': (v: string | null) => (this.dataUsagePolicy = v),
        'onUpdate:doiIdentifiers': (v: DoiIdentifier[]) => (this.doiIdentifiers = v),
        'onUpdate:publicationIdentifiers': (v: PublicationIdentifier[]) => (this.publicationIdentifiers = v),
        'onUpdate:primaryPublicationIdentifiers': (v: PublicationIdentifier[]) =>
          (this.primaryPublicationIdentifiers = v),
        'onUpdate:contributors': (v: Contributor[]) => (this.contributors = v),
        onSearchPublications: this.searchPublicationIdentifiers,
        onViewExtraMetadata: () => (this.jsonToDisplay = JSON.stringify(this.extraMetadata, null, 2)),
        onClearExtraMetadata: () => this.fileCleared('extraMetadataFile'),
        onSelectExtraMetadata: (v: FileUploadSelectEvent) => this.fileSelected('extraMetadataFile', v)
      }
    },
    defaultLicenseId(): number | null {
      return this.licenses ? ((this.licenses as License[]).find((l) => l.shortName === 'CC0')?.id ?? null) : null
    },
    selectableLicenses(): License[] {
      return this.licenses
        ? (this.licenses as License[]).filter((l) => l.active || this.item?.license?.id === l.id)
        : []
    },

    existingTargetMode(): string | undefined {
      if (this.targetGenes.length === 0) return undefined
      const hasSequence = this.targetGenes.some((t) => t.targetSequence?.sequence)
      return hasSequence ? 'sequence' : 'coordinates'
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
    },
    defaultLicenseId() {
      if (this.licenseId == null) {
        this.licenseId = this.defaultLicenseId
      }
    }
  },

  async mounted() {
    await this.loadEditableExperiments()
    this.licenseSearch()
  },

  methods: {
    saveTargetEditor() {
      ;(this.$refs.targetEditor as TargetEditorRef).save()
    },

    formatCategory(category: TargetGeneCategory) {
      return textForTargetGeneCategory(category) || category
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Experiment
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async loadEditableExperiments() {
      try {
        this.editableExperiments = await searchMyExperiments({metaAnalysis: false})
      } catch {
        this.editableExperiments = []
      }
    },

    onExperimentSelected(experiment: Experiment | null) {
      this.experiment = experiment
      if (experiment) {
        this.doiIdentifiers = experiment.doiIdentifiers || []
        this.loadPublications(
          experiment.primaryPublicationIdentifiers || [],
          experiment.secondaryPublicationIdentifiers || []
        )
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Target management
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    onTargetAdded(target: TargetGene) {
      this.targetGenes.push(_.clone(target))
      this.targetEditorVisible = false
    },

    targetDeleted(idx: number) {
      this.targetGenes.splice(idx, 1)
    },

    targetsCleared() {
      this.targetGenes = []
    },

    resetTargets() {
      if (this.item?.targetGenes) {
        this.targetGenes = _.cloneDeep(this.item.targetGenes)
        if (this.targetGenes[0]?.targetAccession) {
          this.isBaseEditor = this.targetGenes[0].targetAccession.isBaseEditor
        }
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // File handling
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    fileCleared(inputName: JsonFileInputName) {
      this.jsonToDisplay = null
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
      this.clearValidationState()
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
          this.clearClientError(inputName.replace('File', ''))
        }
      }
      this.clearValidationState()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form management
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetForm() {
      if (!this.item) return
      this.experiment = this.item.experiment
      this.metaAnalyzesScoreSetUrns = this.item.metaAnalyzesScoreSetUrns || []
      this.supersededScoreSet = this.item.supersededScoreSet || null
      this.licenseId = this.item.license?.id
      this.title = this.item.title
      this.shortDescription = this.item.shortDescription
      this.abstractText = this.item.abstractText
      this.methodText = this.item.methodText
      this.contributors = _.sortBy(this.item.contributors, ['familyName', 'givenName', 'orcidId'])
      this.doiIdentifiers = this.item.doiIdentifiers
      this.loadPublications(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
      this.secondaryPublicationIdentifiers = this.item.secondaryPublicationIdentifiers
      this.dataUsagePolicy = this.item.dataUsagePolicy ?? null
      this.targetGenes = this.item.targetGenes
      this.extraMetadata = !_.isEmpty(this.item.extraMetadata) ? this.item.extraMetadata : null
      this.scoreColumnsMetadata = !_.isEmpty(this.item.datasetColumns?.scoreColumnsMetadata)
        ? this.item.datasetColumns.scoreColumnsMetadata
        : null
      this.countColumnsMetadata = !_.isEmpty(this.item.datasetColumns?.countColumnsMetadata)
        ? this.item.datasetColumns.countColumnsMetadata
        : null
      if (this.targetGenes[0]?.targetAccession) {
        this.isBaseEditor = this.targetGenes[0].targetAccession.isBaseEditor
      }
      this.clearValidationState()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Save
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async save() {
      if (!this.item) {
        this.$toast.add({severity: 'error', summary: 'No score set to save.'})
        return
      }

      const editedFields = {
        experimentUrn: this.experiment?.urn,
        licenseId: this.licenseId,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        contributors: normalizeContributorArray(this.contributors),
        doiIdentifiers: normalizeDoiArray(this.doiIdentifiers),
        ...this.getPublicationPayload(),
        dataUsagePolicy: this.dataUsagePolicy,
        extraMetadata: this.extraMetadata || {},
        scoreColumnsMetadata: this.scoreColumnsMetadata || {},
        countColumnsMetadata: this.countColumnsMetadata || {},
        targetGenes: this.targetGenes.map((target) => {
          if (target.targetAccession) {
            target.targetAccession.isBaseEditor = this.isBaseEditor
          }
          return target
        })
      }

      // Deep-clone the item and clear array fields on the clone so that
      // deleted items aren't merged back. We must not mutate this.item
      // directly — it may be Vuex store state, and clearing it would cause
      // data loss if the save request fails.
      const baseItem = _.cloneDeep(this.item) as ScoreSet
      baseItem.contributors = []
      baseItem.doiIdentifiers = []
      baseItem.primaryPublicationIdentifiers = []
      baseItem.secondaryPublicationIdentifiers = []
      baseItem.targetGenes = []
      baseItem.extraMetadata = null

      const editedItem = _.merge({}, baseItem, editedFields) as Record<string, unknown>
      const formData = new FormData()
      for (const key in editedItem) {
        const value = editedItem[key]
        if (_.isArray(value) || _.isObject(value)) {
          formData.append(_.snakeCase(key), JSON.stringify(value))
        } else if (value !== null && value !== undefined) {
          formData.append(_.snakeCase(key), String(value))
        }
      }

      // Add upload files from VariantScoreFields
      const variantFields = this.$refs.variantScoreFields as VariantScoreFieldsRef | undefined
      if (variantFields?.scoresFile) {
        formData.append('scores_file', variantFields.scoresFile)
      }
      if (variantFields?.countsFile) {
        formData.append('counts_file', variantFields.countsFile)
      }

      this.progressVisible = true
      let response = null
      try {
        response = await updateScoreSetWithVariants(this.item.urn, formData)
      } catch (e: unknown) {
        response = getErrorResponse(e)
        this.$toast.add({severity: 'error', summary: 'Error', life: 3000})
      }
      this.progressVisible = false

      if (response.status === 200) {
        this.clearValidationState()
        this.$router.replace({path: `/score-sets/${this.item.urn}`})
        this.$toast.add({severity: 'success', summary: 'Your changes were saved.', life: 3000})
      } else if (response.data?.detail) {
        const fieldErrors = parseApiValidationErrors(response.data.detail)
        if (fieldErrors) {
          this.setServerErrors(fieldErrors)
          this.$toast.add({
            severity: 'error',
            summary: `Please fix ${this.totalValidationErrors} validation ${this.totalValidationErrors === 1 ? 'error' : 'errors'} before saving.`,
            life: 5000
          })
        } else {
          this.$toast.add({
            severity: 'error',
            summary: `Encountered an error saving score set: ${response.data.detail}`,
            life: 10000
          })
        }
      }
    },

    async validateAndSave() {
      this.clearServerErrors()
      const variantFields = this.$refs.variantScoreFields as VariantScoreFieldsRef | undefined
      if (variantFields?.countsFile && !variantFields?.scoresFile) {
        this.setClientError('scoresFile', 'Required')
      }
      if (!this.hasValidationErrors) {
        await this.save()
      } else {
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${this.totalValidationErrors} validation ${this.totalValidationErrors === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem() {
      if (this.item) {
        this.$router.replace({path: `/score-sets/${this.item.urn}`})
      }
    }
  }
})
</script>
