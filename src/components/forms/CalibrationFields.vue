<template>
  <div>
    <div class="wizard-form">
      <div class="wizard-form-content-bg"></div>

      <!-- Score set selector -->
      <div v-if="showScoreSetSelector" class="wizard-row">
        <div class="wizard-help">
          <p>{{ desc.scoreSet.help }}</p>
        </div>
        <div class="wizard-field">
          <MvFloatField :error="validationErrors['scoreSetUrn']" label="Score Set">
            <template #default="{id, invalid}">
              <PSelect
                :id="id"
                fluid
                :invalid="invalid"
                :model-value="selectedScoreSet"
                option-label="title"
                :options="editableScoreSets"
                @update:model-value="$emit('update:selectedScoreSet', $event)"
              >
                <template #option="slotProps">
                  <div>
                    <div>Title: {{ slotProps.option.title }}</div>
                    <div>Description: {{ slotProps.option.shortDescription }}</div>
                  </div>
                </template>
              </PSelect>
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Calibration title -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.title.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.title.detail" class="wizard-help-detail" v-html="desc.title.detail" />
        </div>
        <div class="wizard-field">
          <MvFloatField :error="validationErrors['title']" label="Calibration Title">
            <template #default="{id, invalid}">
              <InputText
                :id="id"
                fluid
                :invalid="invalid"
                :model-value="title"
                @update:model-value="$emit('update:title', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Notes -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.notes.help }}</label>
        </div>
        <div class="wizard-field">
          <MvFloatField :error="validationErrors['notes']" label="Calibration Notes (optional)">
            <template #default="{id, invalid}">
              <PTextarea
                :id="id"
                fluid
                :invalid="invalid"
                :model-value="notes"
                @update:model-value="$emit('update:notes', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Baseline score -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.baselineScore.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.baselineScore.detail" class="wizard-help-detail" v-html="desc.baselineScore.detail" />
        </div>
        <div class="wizard-field">
          <MvFloatField :error="validationErrors['baselineScore']" label="Baseline Score">
            <template #default="{id, invalid}">
              <InputNumber
                :id="id"
                fluid
                :invalid="invalid"
                :max-fraction-digits="10"
                :min-fraction-digits="1"
                :model-value="baselineScore"
                @update:model-value="$emit('update:baselineScore', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Baseline description -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.baselineScoreDescription.help }}</label>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="desc.baselineScoreDescription.detail"
            class="wizard-help-detail"
            v-html="desc.baselineScoreDescription.detail"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
        <div class="wizard-field">
          <MvFloatField
            :error="validationErrors['baselineScoreDescription']"
            label="Baseline Score Description (optional)"
          >
            <template #default="{id, invalid}">
              <PTextarea
                :id="id"
                auto-resize
                fluid
                :invalid="invalid"
                :model-value="baselineScoreDescription"
                rows="5"
                @update:model-value="$emit('update:baselineScoreDescription', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Research use only -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.researchUseOnly.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.researchUseOnly.detail" class="wizard-help-detail" v-html="desc.researchUseOnly.detail" />
        </div>
        <div class="wizard-field flex items-center">
          <ToggleSwitch :model-value="researchUseOnly" @update:model-value="$emit('update:researchUseOnly', $event)" />
          <div class="ml-3 text-sm">
            Calibration will be marked as <b>{{ researchUseOnly ? 'research use only.' : 'general use' }}</b
            >.
          </div>
          <MvFieldError :error="validationErrors['researchUseOnly']" />
        </div>
      </div>

      <!-- Method sources -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.methodSources.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.methodSources.detail" class="wizard-help-detail" v-html="desc.methodSources.detail" />
        </div>
        <div class="wizard-field">
          <MvTagField
            :error="validationErrors['methodSources']"
            :force-selection="true"
            label="Method sources"
            :loading="publicationSearchLoading"
            :model-value="methodSources"
            :option-label="pubOptionLabel"
            :suggestions="publicationSuggestions"
            :typeahead="true"
            @complete="$emit('search-publications', $event)"
            @escape="onClearInput"
            @option-select="$emit('publication-selected', 'methodSources')"
            @update:model-value="$emit('update:methodSources', $event)"
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

      <!-- Threshold sources -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.thresholdSources.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.thresholdSources.detail" class="wizard-help-detail" v-html="desc.thresholdSources.detail" />
        </div>
        <div class="wizard-field">
          <MvTagField
            :error="validationErrors['thresholdSources']"
            :force-selection="true"
            label="Threshold sources"
            :loading="publicationSearchLoading"
            :model-value="thresholdSources"
            :option-label="pubOptionLabel"
            :suggestions="publicationSuggestions"
            :typeahead="true"
            @complete="$emit('search-publications', $event)"
            @escape="onClearInput"
            @option-select="$emit('publication-selected', 'thresholdSources')"
            @update:model-value="$emit('update:thresholdSources', $event)"
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

      <!-- Evidence sources -->
      <div class="wizard-row">
        <div class="wizard-help">
          <label>{{ desc.evidenceSources.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.evidenceSources.detail" class="wizard-help-detail" v-html="desc.evidenceSources.detail" />
        </div>
        <div class="wizard-field">
          <MvTagField
            :error="validationErrors['evidenceSources']"
            :force-selection="true"
            label="Evidence sources"
            :loading="publicationSearchLoading"
            :model-value="evidenceSources"
            :option-label="pubOptionLabel"
            :suggestions="publicationSuggestions"
            :typeahead="true"
            @complete="$emit('search-publications', $event)"
            @escape="onClearInput"
            @option-select="$emit('publication-selected', 'evidenceSources')"
            @update:model-value="$emit('update:evidenceSources', $event)"
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

      <!-- Class-based toggle -->
      <template v-if="allowClassBased">
        <div class="wizard-row">
          <div class="wizard-help">
            <label>{{ desc.classificationType.help }}</label>
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="desc.classificationType.detail"
              class="wizard-help-detail"
              v-html="desc.classificationType.detail"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>
          <div class="wizard-field flex items-top">
            <ToggleSwitch :model-value="classBased" @update:model-value="$emit('update:classBased', $event)" />
            <div class="ml-3 text-sm">
              <span
                >This calibration is defined by <b>{{ classBased ? 'categorical classes' : 'score ranges' }}</b
                >.</span
              >
            </div>
          </div>
        </div>

        <!-- Classes file (class-based mode) -->
        <div v-if="classBased" class="wizard-row">
          <div class="wizard-help">
            <label>{{ desc.classesFile.help }}</label>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="desc.classesFile.detail" class="wizard-help-detail" v-html="desc.classesFile.detail" />
          </div>
          <div class="wizard-field">
            <MvFileStatus
              v-if="classesFileName"
              :label="classesFileName"
              :viewable="false"
              @delete="$emit('classes-file-cleared')"
            />
            <MvUploadField
              v-else
              accept="text/csv"
              empty-text="Drop a CSV file here"
              :error="validationErrors['classesFile']"
              label="Classes file"
              :show-label="false"
              @select="$emit('classes-file-selected', $event)"
            />
          </div>
        </div>
      </template>

      <!-- ─── Functional Classifications ─────────────────────────── -->

      <div class="wizard-row wizard-classifications-header">
        <div class="wizard-help">
          <span class="wizard-classifications-title">{{ classBased ? 'Functional Classes' : 'Functional Ranges' }}</span>
        </div>
        <div class="wizard-field flex justify-end">
          <PButton
            icon="pi pi-plus"
            :label="`Add ${functionalClassifications && functionalClassifications.length > 0 ? 'another' : 'a'} ${classBased ? 'class' : 'range'}`"
            severity="success"
            size="small"
            @click="$emit('add-classification')"
          />
        </div>
      </div>

      <CalibrationClassificationRow
        v-for="(fc, idx) in functionalClassifications"
        :key="idx"
        :class-based="classBased"
        :classification="fc"
        :criterions="criterions"
        :evidence-strengths="evidenceStrengths"
        :helper="functionalClassificationHelpers[idx]"
        :index="idx"
        :range-classifications="rangeClassifications"
        :validation-errors="validationErrors"
        @remove="$emit('remove-classification', idx)"
        @toggle-acmg="$emit('toggle-acmg', idx, $event)"
        @toggle-boundary="$emit('toggle-boundary', idx, $event)"
        @toggle-infinity="$emit('toggle-infinity', idx, $event)"
        @toggle-oddspaths="$emit('toggle-oddspaths', idx, $event)"
        @update:class="$emit('update:classification-field', idx, 'class', $event)"
        @update:description="$emit('update:classification-field', idx, 'description', $event)"
        @update:evidence-strength="$emit('update:evidence-strength', idx, $event)"
        @update:functional-classification="
          $emit('update:classification-field', idx, 'functionalClassification', $event)
        "
        @update:label="$emit('update:classification-field', idx, 'label', $event)"
        @update:oddspaths-ratio="$emit('update:classification-field', idx, 'oddspathsRatio', $event)"
        @update:range-lower="$emit('update:range-value', idx, 0, $event)"
        @update:range-upper="$emit('update:range-value', idx, 1, $event)"
      />

      <div
        v-if="!functionalClassifications || functionalClassifications.length === 0"
        class="wizard-row wizard-classifications-empty"
      >
        <div class="wizard-help">
          <p class="wizard-classifications-empty-title">No functional {{ classBased ? 'classes' : 'ranges' }} yet</p>
        </div>
        <div class="wizard-field">
          <p class="wizard-classifications-empty-hint">
            Click <b>Add a {{ classBased ? 'class' : 'range' }}</b> above to define how scores map to functional
            classifications.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'

import CalibrationClassificationRow from '@/components/forms/CalibrationClassificationRow.vue'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvFileStatus from '@/components/forms/MvFileStatus.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import MvTagField from '@/components/forms/MvTagField.vue'
import MvUploadField from '@/components/forms/MvUploadField.vue'
import {calibrationDescriptions} from '@/data/field-descriptions'
import {clearAutoCompleteInput, pubOptionLabel} from '@/lib/form-helpers'
import type {
  DraftFunctionalClassification,
  FunctionalClassificationHelper,
  MinimalScoreSet
} from '@/lib/calibration-types'
import type {ValidationErrors} from '@/lib/form-validation'
import {components} from '@/schema/openapi'

type PublicationIdentifier = components['schemas']['PublicationIdentifier']

export default defineComponent({
  name: 'CalibrationFields',

  components: {
    CalibrationClassificationRow,
    InputNumber,
    InputText,
    MvFieldError,
    MvFileStatus,
    MvFloatField,
    MvTagField,
    MvUploadField,
    PButton: Button,
    PTextarea: Textarea,
    PSelect: Select,
    ToggleSwitch
  },

  props: {
    title: {type: String, default: ''},
    notes: {type: String as PropType<string | null>, default: null},
    baselineScore: {type: Number as PropType<number | null>, default: null},
    baselineScoreDescription: {type: String as PropType<string | null>, default: null},
    researchUseOnly: {type: Boolean, default: false},
    classBased: {type: Boolean, default: false},
    classesFileName: {type: String as PropType<string | null>, default: null},
    allowClassBased: {type: Boolean, default: true},
    functionalClassifications: {type: Array as PropType<DraftFunctionalClassification[]>, default: () => []},
    functionalClassificationHelpers: {type: Array as PropType<FunctionalClassificationHelper[]>, default: () => []},
    rangeClassifications: {type: Array as PropType<{label: string; value: string}[]>, required: true},
    evidenceStrengths: {type: Array as PropType<{label: string; value: string}[]>, required: true},
    criterions: {type: Array as PropType<string[]>, required: true},
    methodSources: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    thresholdSources: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    evidenceSources: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    publicationSuggestions: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    publicationSearchLoading: {type: Boolean, default: false},
    editableScoreSets: {type: Array as PropType<MinimalScoreSet[]>, default: () => []},
    selectedScoreSet: {type: Object as PropType<MinimalScoreSet | null>, default: null},
    showScoreSetSelector: {type: Boolean, default: false},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})}
  },

  emits: [
    'update:title',
    'update:notes',
    'update:baselineScore',
    'update:baselineScoreDescription',
    'update:researchUseOnly',
    'update:classBased',
    'update:selectedScoreSet',
    'update:methodSources',
    'update:thresholdSources',
    'update:evidenceSources',
    'update:classification-field',
    'update:range-value',
    'update:evidence-strength',
    'add-classification',
    'remove-classification',
    'toggle-boundary',
    'toggle-infinity',
    'toggle-acmg',
    'toggle-oddspaths',
    'search-publications',
    'publication-selected',
    'classes-file-selected',
    'classes-file-cleared'
  ],

  setup() {
    return {desc: calibrationDescriptions(), pubOptionLabel, onClearInput: clearAutoCompleteInput}
  }
})
</script>
