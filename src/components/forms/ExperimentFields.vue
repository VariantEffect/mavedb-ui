<template>
  <div :class="wizardMode ? '' : 'mv-field-dividers'">
    <!-- Title -->
    <div v-if="showSection('info')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.title.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.title.detail" class="wizard-help-detail" v-html="desc.title.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField :error="validationErrors.title" :hint="wizardMode ? undefined : desc.title.hint" label="Title">
          <template #default="{id, invalid}">
            <PInputText
              :id="id"
              class="w-full"
              fluid
              :invalid="invalid"
              :model-value="title"
              @update:model-value="$emit('update:title', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Short description -->
    <div v-if="showSection('info')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.shortDescription.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.shortDescription.detail" class="wizard-help-detail" v-html="desc.shortDescription.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField
          :error="validationErrors.shortDescription"
          :hint="wizardMode ? undefined : desc.shortDescription.hint"
          label="Short description"
        >
          <template #default="{id, invalid}">
            <PTextarea
              :id="id"
              class="w-full"
              fluid
              :invalid="invalid"
              :model-value="shortDescription"
              :rows="4"
              @update:model-value="$emit('update:shortDescription', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Abstract -->
    <div v-if="showSection('info')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.abstractText.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.abstractText.detail" class="wizard-help-detail" v-html="desc.abstractText.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvMarkdownField
          :error="validationErrors.abstractText"
          :hint="wizardMode ? undefined : desc.abstractText.hint"
          label="Abstract"
          :model-value="abstractText"
          :rows="wizardMode ? 10 : 4"
          @update:model-value="$emit('update:abstractText', $event)"
        />
      </div>
    </div>

    <!-- Methods -->
    <div v-if="showSection('info')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.methodText.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.methodText.detail" class="wizard-help-detail" v-html="desc.methodText.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvMarkdownField
          :error="validationErrors.methodText"
          :hint="wizardMode ? undefined : desc.methodText.hint"
          label="Methods"
          :model-value="methodText"
          :rows="wizardMode ? 10 : 4"
          @update:model-value="$emit('update:methodText', $event)"
        />
      </div>
    </div>

    <!-- DOIs -->
    <div v-if="showSection('references')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.doiIdentifiers.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.doiIdentifiers.detail" class="wizard-help-detail" v-html="desc.doiIdentifiers.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvTagField
          :error="validationErrors.doiIdentifiers"
          :hint="wizardMode ? undefined : desc.doiIdentifiers.hint"
          label="DOIs"
          :model-value="doiIdentifiers"
          option-label="identifier"
          @blur="onDoiBlur"
          @escape="onClearInput"
          @update:model-value="onDoiUpdate"
        />
      </div>
    </div>

    <!-- Publication identifiers -->
    <div v-if="showSection('references')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.publicationIdentifiers.help }}</label>
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="desc.publicationIdentifiers.detail"
          class="wizard-help-detail"
          v-html="desc.publicationIdentifiers.detail"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvTagField
          :error="validationErrors.publicationIdentifiers"
          :force-selection="true"
          :hint="wizardMode ? undefined : desc.publicationIdentifiers.hint"
          label="Publication identifiers"
          :loading="publicationSearchLoading"
          :model-value="publicationIdentifiers"
          :option-label="pubOptionLabel"
          :suggestions="publicationSuggestions"
          :typeahead="true"
          @blur="onClearInput"
          @complete="$emit('search-publications', $event)"
          @escape="onClearInput"
          @option-select="onPublicationAccepted"
          @update:model-value="$emit('update:publicationIdentifiers', $event)"
        >
          <template #option="slotProps">
            <div>
              <div>Title: {{ slotProps.option.title }}</div>
              <div>DOI: {{ slotProps.option.doi }}</div>
              <div>Identifier: {{ slotProps.option.identifier }}</div>
              <div>Database: {{ slotProps.option.dbName }}</div>
            </div>
          </template>
        </MvTagField>
      </div>
    </div>

    <!-- Primary publication (wizard: only when >1 pub; flat: when >0) -->
    <div
      v-if="showSection('references') && publicationIdentifiers.length > (wizardMode ? 1 : 0)"
      :class="wizardMode && 'wizard-row'"
    >
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.primaryPublication.help }}</label>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField
          :error="validationErrors.primaryPublicationIdentifiers"
          :hint="wizardMode ? undefined : desc.primaryPublication.hint"
          label="Primary publication"
        >
          <template #default="{id, invalid}">
            <Multiselect
              :id="id"
              v-model="localPrimaryPubs"
              class="p-inputwrapper-filled"
              fluid
              :invalid="invalid"
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
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Raw read identifiers (experiments only) -->
    <div v-if="showSection('references') && showRawReads" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.rawReadIdentifiers.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.rawReadIdentifiers.detail" class="wizard-help-detail" v-html="desc.rawReadIdentifiers.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvTagField
          :error="validationErrors.rawReadIdentifiers"
          :hint="wizardMode ? undefined : desc.rawReadIdentifiers.hint"
          label="Raw Read"
          :model-value="rawReadIdentifiers"
          option-label="identifier"
          @blur="onRawReadBlur"
          @escape="onClearInput"
          @update:model-value="onRawReadUpdate"
        />
      </div>
    </div>

    <!-- Contributors -->
    <div v-if="showSection('references')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <label v-html="desc.contributors.help" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.contributors.detail" class="wizard-help-detail" v-html="desc.contributors.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvTagField
          :error="validationErrors.contributors"
          fluid
          :hint="wizardMode ? undefined : desc.contributors.hint"
          label="Contributors"
          :model-value="contributors"
          :option-label="contributorLabel"
          @escape="onClearInput"
          @update:model-value="onContributorUpdate"
        />
      </div>
    </div>

    <!-- Extra metadata file -->
    <div v-if="showSection('info')" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.extraMetadata.help }}</label>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFileStatus
          v-if="extraMetadata && Object.keys(extraMetadata).length > 0"
          label="Extra metadata"
          @delete="$emit('clear-extra-metadata')"
          @view="$emit('view-extra-metadata')"
        />
        <div v-else>
          <MvUploadField
            accept="application/json"
            empty-text="Drop a JSON file here"
            :error="validationErrors.extraMetadata"
            label="Extra metadata"
            :show-label="!wizardMode"
            @select="$emit('select-extra-metadata', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Multiselect from 'primevue/multiselect'

import MvFileStatus from '@/components/forms/MvFileStatus.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import MvMarkdownField from '@/components/forms/MvMarkdownField.vue'
import MvTagField from '@/components/forms/MvTagField.vue'
import {addRawReadIdentifier, normalizeRawReadArray, pubOptionLabel, contributorLabel} from '@/lib/form-helpers'
import {useReferenceFields} from '@/composables/use-reference-fields'
import {experimentDescriptions} from '@/data/field-descriptions'
import MvUploadField from '@/components/forms/MvUploadField.vue'
import {components} from '@/schema/openapi'
import type {ValidationErrors} from '@/lib/form-validation'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

type DoiIdentifier = components['schemas']['DoiIdentifier']
type RawReadIdentifier = components['schemas']['RawReadIdentifier']
type Contributor = components['schemas']['Contributor']
type SavedPublicationIdentifier = components['schemas']['SavedPublicationIdentifier']
type ExternalPublicationIdentifier = components['schemas']['ExternalPublicationIdentifier']
type PublicationIdentifier = SavedPublicationIdentifier | ExternalPublicationIdentifier

export default defineComponent({
  name: 'ExperimentFields',

  components: {
    Multiselect,
    MvFileStatus,
    MvFloatField,
    MvMarkdownField,
    MvTagField,
    MvUploadField,
    PInputText: InputText,
    PTextarea: Textarea
  },

  props: {
    title: {type: String as PropType<string | null>, default: null},
    shortDescription: {type: String as PropType<string | null>, default: null},
    abstractText: {type: String as PropType<string | null>, default: null},
    methodText: {type: String as PropType<string | null>, default: null},
    doiIdentifiers: {type: Array as PropType<DoiIdentifier[]>, default: () => []},
    publicationIdentifiers: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    primaryPublicationIdentifiers: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    rawReadIdentifiers: {type: Array as PropType<RawReadIdentifier[]>, default: () => []},
    contributors: {type: Array as PropType<Contributor[]>, default: () => []},
    extraMetadata: {type: Object as PropType<Record<string, unknown> | null>, default: null},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})},
    publicationSuggestions: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    publicationSearchLoading: {type: Boolean, default: false},
    showRawReads: {type: Boolean, default: true},
    wizardMode: {type: Boolean, default: false},
    entityLabel: {type: String, default: 'this experiment'},
    section: {type: String as PropType<'all' | 'info' | 'references'>, default: 'all'}
  },

  emits: [
    'update:title',
    'update:shortDescription',
    'update:abstractText',
    'update:methodText',
    'update:doiIdentifiers',
    'update:publicationIdentifiers',
    'update:primaryPublicationIdentifiers',
    'update:rawReadIdentifiers',
    'update:contributors',
    'search-publications',
    'view-extra-metadata',
    'clear-extra-metadata',
    'select-extra-metadata'
  ],

  setup(props, {emit}) {
    const {toast, ...referenceFields} = useReferenceFields({
      doiIdentifiers: () => props.doiIdentifiers,
      publicationIdentifiers: () => props.publicationIdentifiers,
      primaryPublicationIdentifiers: () => props.primaryPublicationIdentifiers,
      contributors: () => props.contributors,
      entityLabel: () => props.entityLabel,
      emit
    })

    function onRawReadBlur(event: Event) {
      const target = event.target as HTMLInputElement | null
      const input = target?.value ?? ''
      const updated = addRawReadIdentifier(input, props.rawReadIdentifiers, toast, props.entityLabel)
      if (updated) emit('update:rawReadIdentifiers', updated)
      if (target) target.value = ''
    }

    function onRawReadUpdate(value: (RawReadIdentifier | string)[]) {
      emit('update:rawReadIdentifiers', normalizeRawReadArray(value, toast))
    }

    return {...referenceFields, pubOptionLabel, contributorLabel, onRawReadBlur, onRawReadUpdate}
  },

  computed: {
    desc() {
      return experimentDescriptions(this.entityLabel)
    },

    showSection() {
      return (name: string) => this.section === 'all' || this.section === name
    }
  }
})
</script>
