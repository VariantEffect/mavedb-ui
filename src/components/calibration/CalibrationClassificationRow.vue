<template>
  <div>
    <!-- Row header -->
    <div class="wizard-row classification-row-header">
      <div class="wizard-help">
        <span class="classification-row-title">{{ classBased ? 'Class' : 'Range' }} {{ index + 1 }}</span>
      </div>
      <div class="wizard-field">
        <!-- Generic full class/range errors -->
        <PMessage
          v-if="validationErrors[`functionalClassifications.${index}`]"
          class="range-error-message mx-2"
          :closable="false"
          severity="error"
          size="small"
        >
          <template #icon>
            <i class="pi pi-exclamation-circle" />
          </template>
          {{ validationErrors[`functionalClassifications.${index}`] }}
        </PMessage>
      </div>
    </div>

    <!-- Label -->
    <div class="wizard-row">
      <div class="wizard-help">
        <label :id="scopedId(`input-rangeLabel-${index}`)">{{ desc.rangeLabel.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.rangeLabel.detail" class="wizard-help-detail" v-html="desc.rangeLabel.detail" />
      </div>
      <div class="wizard-field">
        <MvFloatField
          :error="validationErrors[`functionalClassifications.${index}.label`]"
          label="Functional range label"
        >
          <template #default="{id, invalid}">
            <InputText
              :id="id"
              :aria-labelledby="scopedId(`input-rangeLabel-${index}`)"
              fluid
              :invalid="invalid"
              :model-value="classification.label"
              @update:model-value="$emit('update:label', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Description -->
    <div class="wizard-row">
      <div class="wizard-help">
        <label :id="scopedId(`input-rangeDescription-${index}`)">{{ desc.rangeDescription.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.rangeDescription.detail" class="wizard-help-detail" v-html="desc.rangeDescription.detail" />
      </div>
      <div class="wizard-field">
        <MvFloatField
          :error="validationErrors[`functionalClassifications.${index}.description`]"
          label="Functional range description (optional)"
        >
          <template #default="{id, invalid}">
            <PTextarea
              :id="id"
              :aria-labelledby="scopedId(`input-rangeDescription-${index}`)"
              auto-resize
              fluid
              :invalid="invalid"
              :model-value="classification.description"
              rows="5"
              @update:model-value="$emit('update:description', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Classification (normal/abnormal/not_specified) -->
    <div class="wizard-row">
      <div class="wizard-help">
        <label :id="scopedId(`input-rangeClassification-${index}`)">{{ desc.rangeClassification.help }}</label>
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="desc.rangeClassification.detail"
          class="wizard-help-detail"
          v-html="desc.rangeClassification.detail"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
      <div class="wizard-field">
        <SelectButton
          :id="scopedId(`input-rangeClassification-${index}`)"
          :model-value="classification.functionalClassification"
          option-label="label"
          option-value="value"
          :options="rangeClassifications"
          @update:model-value="$emit('update:functionalClassification', $event)"
        />
        <MvFieldError :error="validationErrors[`functionalClassifications.${index}.classification`]" />
      </div>
    </div>

    <!-- Range boundaries (score-range mode) -->
    <template v-if="!classBased">
      <div class="wizard-row">
        <div class="wizard-help">
          <label :id="scopedId(`input-rangeBoundaries-${index}`)">{{ desc.rangeBoundaries.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.rangeBoundaries.detail" class="wizard-help-detail" v-html="desc.rangeBoundaries.detail" />
        </div>
        <div class="wizard-field">
          <div class="score-range-row">
            <MvFloatField
              class="score-range-bound"
              :label="
                helper.infiniteLower
                  ? '-\u221e'
                  : classification.inclusiveLowerBound
                    ? 'Lower (inclusive)'
                    : 'Lower (exclusive)'
              "
            >
              <template #default="{id}">
                <div :class="['score-range-input', {disabled: helper.infiniteLower}]">
                  <InputNumber
                    :id="id"
                    :disabled="helper.infiniteLower"
                    fluid
                    :max-fraction-digits="10"
                    :model-value="classification.range?.[0] ?? null"
                    @update:model-value="$emit('update:range-lower', $event)"
                  />
                  <PButton
                    :class="['score-range-toggle', {active: classification.inclusiveLowerBound}]"
                    :disabled="helper.infiniteLower"
                    text
                    @click="$emit('toggle-boundary', 'lower')"
                    ><FontAwesomeIcon icon="fa-solid fa-circle-half-stroke"
                  /></PButton>
                  <PButton
                    :class="['score-range-toggle', 'infinity', {active: helper.infiniteLower}]"
                    text
                    @click="$emit('toggle-infinity', 'lower')"
                    ><FontAwesomeIcon icon="fa-solid fa-infinity"
                  /></PButton>
                </div>
              </template>
            </MvFloatField>
            <span class="score-range-separator">to</span>
            <MvFloatField
              class="score-range-bound"
              :label="
                helper.infiniteUpper
                  ? '\u221e'
                  : classification.inclusiveUpperBound
                    ? 'Upper (inclusive)'
                    : 'Upper (exclusive)'
              "
            >
              <template #default="{id}">
                <div :class="['score-range-input', {disabled: helper.infiniteUpper}]">
                  <InputNumber
                    :id="id"
                    :disabled="helper.infiniteUpper"
                    fluid
                    :max-fraction-digits="10"
                    :model-value="classification.range?.[1] ?? null"
                    @update:model-value="$emit('update:range-upper', $event)"
                  />
                  <PButton
                    :class="['score-range-toggle', {active: classification.inclusiveUpperBound}]"
                    :disabled="helper.infiniteUpper"
                    text
                    @click="$emit('toggle-boundary', 'upper')"
                    ><FontAwesomeIcon icon="fa-solid fa-circle-half-stroke"
                  /></PButton>
                  <PButton
                    :class="['score-range-toggle', 'infinity', {active: helper.infiniteUpper}]"
                    text
                    @click="$emit('toggle-infinity', 'upper')"
                    ><FontAwesomeIcon icon="fa-solid fa-infinity"
                  /></PButton>
                </div>
              </template>
            </MvFloatField>
          </div>
          <MvFieldError :error="validationErrors[`functionalClassifications.${index}.range`]" />
          <MvFieldError :error="validationErrors[`functionalClassifications.${index}.inclusiveLowerBound`]" />
          <MvFieldError :error="validationErrors[`functionalClassifications.${index}.inclusiveUpperBound`]" />
        </div>
      </div>
    </template>

    <!-- Class name (class-based mode) -->
    <template v-else>
      <div class="wizard-row">
        <div class="wizard-help">
          <label :id="scopedId(`input-className-${index}`)">{{ desc.className.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.className.detail" class="wizard-help-detail" v-html="desc.className.detail" />
        </div>
        <div class="wizard-field">
          <MvFloatField :error="validationErrors[`functionalClassifications.${index}.class`]" label="Class name">
            <template #default="{id, invalid}">
              <InputText
                :id="id"
                :aria-labelledby="scopedId(`input-className-${index}`)"
                fluid
                :invalid="invalid"
                :model-value="classification.class"
                @update:model-value="$emit('update:class', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>
    </template>

    <!-- ACMG classification toggle -->
    <div
      v-if="
        classification.functionalClassification === 'normal' || classification.functionalClassification === 'abnormal'
      "
      class="wizard-row"
    >
      <div class="wizard-help">
        <label :id="scopedId(`input-acmgToggle-${index}`)">{{ desc.acmgClassification.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.acmgClassification.detail" class="wizard-help-detail" v-html="desc.acmgClassification.detail" />
      </div>
      <div class="wizard-field flex items-center">
        <ToggleSwitch
          :aria-labelledby="scopedId(`input-acmgToggle-${index}`)"
          :model-value="helper.isProvidingClassification"
          @update:model-value="$emit('toggle-acmg', $event)"
        />
        <div class="ml-3 text-sm">
          {{ helper.isProvidingClassification ? 'Providing evidence strengths.' : 'No evidence strengths.' }}
        </div>
        <MvFieldError :error="validationErrors[`functionalClassifications.${index}.acmgClassification`]" />
      </div>
    </div>

    <!-- ACMG classification details -->
    <div v-if="helper.isProvidingClassification && classification.acmgClassification" class="wizard-row">
      <div class="wizard-help">
        <label :id="scopedId(`input-acmgDetails-${index}`)">{{ desc.acmgDetails.help }}</label>
      </div>
      <div class="wizard-field">
        <div class="flex gap-2">
          <MvFloatField class="w-1/2" label="Criterion">
            <template #default="{id}">
              <PSelect
                :id="id"
                disabled
                fluid
                :model-value="classification.acmgClassification.criterion"
                :options="criterions"
              />
            </template>
          </MvFloatField>
          <MvFloatField class="w-1/2" label="Evidence Strength">
            <template #default="{id, invalid}">
              <PSelect
                :id="id"
                fluid
                :invalid="invalid"
                :model-value="classification.acmgClassification.evidenceStrength"
                option-label="label"
                option-value="value"
                :options="evidenceStrengths"
                @update:model-value="$emit('update:evidence-strength', $event)"
              />
            </template>
          </MvFloatField>
        </div>
        <MvFieldError :error="validationErrors[`functionalClassifications.${index}.acmgClassification.criterion`]" />
        <MvFieldError
          :error="validationErrors[`functionalClassifications.${index}.acmgClassification.evidenceStrength`]"
        />
      </div>
    </div>

    <!-- OddsPaths toggle -->
    <div
      v-if="
        classification.functionalClassification === 'normal' || classification.functionalClassification === 'abnormal'
      "
      class="wizard-row"
    >
      <div class="wizard-help">
        <label :id="scopedId(`input-oddsPathsToggle-${index}`)">{{ desc.oddsPathsToggle.help }}</label>
      </div>
      <div class="wizard-field flex items-center">
        <ToggleSwitch
          :aria-labelledby="scopedId(`input-oddsPathsToggle-${index}`)"
          :model-value="helper.isProvidingOddspaths"
          @update:model-value="$emit('toggle-oddspaths', $event)"
        />
        <div class="ml-3 text-sm">
          {{ helper.isProvidingOddspaths ? 'Providing OddsPaths.' : 'No OddsPaths.' }}
        </div>
      </div>
    </div>

    <!-- OddsPaths ratio -->
    <div v-if="helper.isProvidingOddspaths" class="wizard-row">
      <div class="wizard-help">
        <label :id="scopedId(`input-oddsPathsRatio-${index}`)">{{ desc.oddsPathsRatio.help }}</label>
      </div>
      <div class="wizard-field">
        <MvFloatField
          :error="validationErrors[`functionalClassifications.${index}.oddspathsRatio`]"
          label="OddsPaths Ratio"
        >
          <template #default="{id, invalid}">
            <InputNumber
              :id="id"
              :aria-labelledby="scopedId(`input-oddsPathsRatio-${index}`)"
              fluid
              :invalid="invalid"
              :max-fraction-digits="10"
              :min-fraction-digits="1"
              :model-value="classification.oddspathsRatio"
              @update:model-value="$emit('update:oddspaths-ratio', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Remove button -->
    <div class="wizard-row">
      <div class="wizard-help"></div>
      <div class="wizard-field flex justify-end">
        <PButton icon="pi pi-times" label="Remove" severity="danger" size="small" @click="$emit('remove')" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'

import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import useScopedId from '@/composables/scoped-id'
import {calibrationDescriptions} from '@/data/field-descriptions'
import type {DraftFunctionalClassification, FunctionalClassificationHelper} from '@/lib/calibration-types'
import type {ValidationErrors} from '@/lib/form-validation'

export default defineComponent({
  name: 'CalibrationClassificationRow',

  components: {
    FontAwesomeIcon,
    InputNumber,
    InputText,
    MvFieldError,
    MvFloatField,
    PMessage: Message,
    PButton: Button,
    PTextarea: Textarea,
    PSelect: Select,
    SelectButton,
    ToggleSwitch
  },

  props: {
    classification: {type: Object as PropType<DraftFunctionalClassification>, required: true},
    helper: {type: Object as PropType<FunctionalClassificationHelper>, required: true},
    index: {type: Number, required: true},
    classBased: {type: Boolean, required: true},
    rangeClassifications: {type: Array as PropType<{label: string; value: string}[]>, required: true},
    evidenceStrengths: {type: Array as PropType<{label: string; value: string}[]>, required: true},
    criterions: {type: Array as PropType<string[]>, required: true},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})}
  },

  emits: [
    'remove',
    'update:label',
    'update:description',
    'update:functionalClassification',
    'update:range-lower',
    'update:range-upper',
    'update:class',
    'toggle-boundary',
    'toggle-infinity',
    'toggle-acmg',
    'update:evidence-strength',
    'toggle-oddspaths',
    'update:oddspaths-ratio'
  ],

  setup() {
    return {
      ...useScopedId(),
      desc: calibrationDescriptions()
    }
  }
})
</script>

<style scoped>
.score-range-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-range-bound {
  flex: 1;
  min-width: 0;
}

.score-range-input {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid var(--p-inputtext-border-color);
  border-radius: var(--p-inputtext-border-radius);
  background: var(--p-inputtext-background);
  transition: border-color 0.15s;
}

.score-range-input.disabled {
  background: var(--color-bg);
}

.score-range-input.disabled :deep(.p-inputnumber) {
  opacity: 0.4;
}

.score-range-input.disabled :deep(.score-range-toggle:not(.infinity)) {
  opacity: 0.4;
}

.score-range-input:focus-within {
  border-color: var(--p-primary-color);
}

.score-range-input :deep(.p-inputnumber) {
  flex: 1;
  min-width: 0;
}

.score-range-input :deep(.p-inputtext) {
  border: none;
  box-shadow: none;
  background: transparent;
}

.score-range-input :deep(.score-range-toggle) {
  padding: 0 0.4rem;
  border: none;
  background: transparent;
  color: var(--p-text-muted-color);
  transition: color 0.15s;
}

.score-range-input :deep(.score-range-toggle.active) {
  color: var(--p-primary-color);
}

.score-range-input :deep(.score-range-toggle:hover:not(:disabled)) {
  background: transparent;
  color: var(--p-primary-color);
}

.score-range-separator {
  font-size: 13px;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

.classification-row-header {
  border-top: 1px solid var(--color-border);
}

.classification-row-title {
  font-size: 13px;
  font-weight: 800;
  color: #555;
}

.range-error-message :deep(.p-message-text) {
  font-size: 13px;
}
</style>
