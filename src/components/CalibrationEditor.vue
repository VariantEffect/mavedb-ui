<template>
  <div class="mavedb-wizard">
    <div class="mavedb-wizard-form">
      <div class="mavedb-wizard-form-content-background"></div>
      <!-- Score set selector -->
      <div v-if="!(!$props.scoreSetUrn && !$props.calibrationUrn)" class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <p>Select the score set to which this calibration will apply.</p>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <Dropdown
              :id="scopedId('input-containing-score-set')"
              v-model="selectedScoreSet"
              option-label="title"
              :options="editableScoreSets"
              style="width: 100%"
            >
              <template #option="slotProps">
                <div>
                  <div>Title: {{ slotProps.option.title }}</div>
                  <div>Description: {{ slotProps.option.shortDescription }}</div>
                </div>
              </template>
            </Dropdown>
            <label :for="scopedId('input-containing-score-set')">Score Set</label>
          </span>
          <span v-if="validationErrors['scoreSetUrn']" class="mave-field-error">{{
            validationErrors['scoreSetUrn']
          }}</span>
        </div>
      </div>
      <!-- Calibration title -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label>Provide a title for the calibration.</label>
          <div class="mavedb-help-small">Display name for this calibration used in visualizations and listings.</div>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <InputText :id="scopedId('input-calibration-title')" v-model="draft.title" style="width: 100%" />
            <label :for="scopedId('input-calibration-title')">Calibration Title</label>
          </span>
          <span v-if="validationErrors['title']" class="mave-field-error">{{ validationErrors['title'] }}</span>
        </div>
      </div>
      <!-- Notes -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label>Provide additional notes or context for the calibration.</label>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <PrimeTextarea :id="scopedId('input-calibration-notes')" v-model="draft.notes" style="width: 100%" />
            <label :for="scopedId('input-calibration-notes')">Calibration Notes (optional)</label>
          </span>
          <span v-if="validationErrors['notes']" class="mave-field-error">{{ validationErrors['notes'] }}</span>
        </div>
      </div>
      <!-- Baseline score -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorProvidedBaselineScore')"
            >What is the baseline score for this score set?</label
          >
          <div class="mavedb-help-small">This number should not be in a range classified as abnormal.</div>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <InputNumber
              v-model="draft.baselineScore"
              :aria-labelledby="scopedId('input-investigatorProvidedBaselineScore')"
              :max-fraction-digits="10"
              :min-fraction-digits="1"
              style="width: 100%"
            />
            <label :for="scopedId('input-investigatorProvidedBaselineScore')">Baseline Score</label>
          </span>
          <span v-if="validationErrors['baselineScore']" class="mave-field-error">{{
            validationErrors['baselineScore']
          }}</span>
        </div>
      </div>
      <!-- Baseline description -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorProvidedBaselineScoreDescription')"
            >Enter a description for the baseline score</label
          >
          <div class="mavedb-help-small">
            This might include additional details about how the baseline score was determined or what it is intended to
            represent.
          </div>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <PrimeTextarea
              v-model="draft.baselineScoreDescription"
              :aria-labelledby="scopedId('input-investigatorProvidedBaselineScoreDescription')"
              auto-resize
              rows="5"
              style="width: 100%"
            />
            <label :for="scopedId('input-investigatorProvidedBaselineScoreDescription')"
              >Baseline Score Description (optional)</label
            >
          </span>
          <span v-if="validationErrors['baselineScoreDescription']" class="mave-field-error">{{
            validationErrors['baselineScoreDescription']
          }}</span>
        </div>
      </div>
    </div>
    <!-- Functional ranges loop -->
    <div v-for="(rangeObj, rangeIdx) in draft.functionalRanges" :key="rangeIdx">
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-content">
          <div>
            Functional Range {{ rangeIdx + 1 }}
            <PrimeButton
              icon="pi pi-times"
              rounded
              severity="danger"
              style="float: right"
              text
              @click="removeFunctionalRange(rangeIdx)"
            />
          </div>
          <hr />
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}`]
          }}</span>
        </div>
      </div>
      <!-- Range label -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)"
            >Enter a label for this functional range</label
          >
          <div class="mavedb-help-small">Display name used in visualizations.</div>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <InputText
              v-model="rangeObj.label"
              :aria-labelledby="scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)"
              style="width: 100%"
            />
            <label :for="scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)">Functional range label</label>
          </span>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.label`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.label`]
          }}</span>
        </div>
      </div>
      <!-- Range description -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)"
            >Enter a description for this functional range</label
          >
          <div class="mavedb-help-small">Provide contextual meaning for the range.</div>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label">
            <PrimeTextarea
              v-model="rangeObj.description"
              :aria-labelledby="scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)"
              auto-resize
              rows="5"
              style="width: 100%"
            />
            <label :for="scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)"
              >Functional range description (optional)</label
            >
          </span>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.description`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.description`]
          }}</span>
        </div>
      </div>
      <!-- Range classification -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId(`input-investigatorProvidedRangeClassification-${rangeIdx}`)"
            >How should this range be classified?</label
          >
          <div class="mavedb-help-small">Normal, abnormal, or not specified.</div>
        </div>
        <div class="mavedb-wizard-content">
          <SelectButton
            :id="scopedId(`input-investigatorProvidedRangeClassification-${rangeIdx}`)"
            v-model="rangeObj.classification"
            option-label="label"
            option-value="value"
            :options="rangeClassifications"
            @change="updateClassificationValuesBasedOnRangeInformation(rangeIdx)"
          />
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.classification`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.classification`]
          }}</span>
        </div>
      </div>
      <!-- Range boundaries -->
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId(`input-investigatorProvidedRangeBoundaries-${rangeIdx}`)">Upper and lower bounds.</label>
          <div class="mavedb-help-small">Use toggle buttons for inclusive/exclusive and infinity.</div>
        </div>
        <div class="mavedb-wizard-content">
          <InputGroup>
            <PrimeButton
              class="score-range-toggle-button"
              :outlined="!functionalRangeHelpers[rangeIdx].infiniteLower"
              @click="toggleInfinity(rangeIdx, 'lower')"
              ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-infinity"
            /></PrimeButton>
            <PrimeButton
              class="score-range-toggle-button"
              :disabled="functionalRangeHelpers[rangeIdx].infiniteLower"
              :outlined="!rangeObj.inclusiveLowerBound"
              @click="toggleBoundary(rangeIdx, 'lower')"
              ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-circle-half-stroke"
            /></PrimeButton>
            <span class="p-float-label">
              <InputNumber
                v-model="rangeObj.range[0]"
                :aria-labelledby="scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)"
                :disabled="functionalRangeHelpers[rangeIdx].infiniteLower"
              />
              <label :for="scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)">{{
                functionalRangeHelpers[rangeIdx].infiniteLower
                  ? '-infinity'
                  : rangeObj.inclusiveLowerBound
                    ? 'Lower Bound (inclusive)'
                    : 'Lower Bound (exclusive)'
              }}</label>
            </span>
            <InputGroupAddon>to</InputGroupAddon>
            <span class="p-float-label">
              <InputNumber
                v-model="rangeObj.range[1]"
                :aria-labelledby="scopedId(`input-investigatorProvidedRangeUpper-${rangeIdx}`)"
                :disabled="functionalRangeHelpers[rangeIdx].infiniteUpper"
              />
              <label :for="scopedId(`input-investigatorProvidedRangeUpper-${rangeIdx}`)">{{
                functionalRangeHelpers[rangeIdx].infiniteUpper
                  ? 'infinity'
                  : rangeObj.inclusiveUpperBound
                    ? 'Upper Bound (inclusive)'
                    : 'Upper Bound (exclusive)'
              }}</label>
            </span>
            <PrimeButton
              class="score-range-toggle-button"
              :disabled="functionalRangeHelpers[rangeIdx].infiniteUpper"
              :outlined="!rangeObj.inclusiveUpperBound"
              @click="toggleBoundary(rangeIdx, 'upper')"
              ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-circle-half-stroke"
            /></PrimeButton>
            <PrimeButton
              class="score-range-toggle-button"
              :outlined="!functionalRangeHelpers[rangeIdx].infiniteUpper"
              @click="toggleInfinity(rangeIdx, 'upper')"
              ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-infinity"
            /></PrimeButton>
          </InputGroup>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.range`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.range`]
          }}</span>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.inclusiveLowerBound`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.range`]
          }}</span>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.inclusiveUpperBound`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.inclusiveUpperBound`]
          }}</span>
        </div>
      </div>
      <!-- ACMG classification toggle -->
      <div
        v-if="rangeObj.classification === 'normal' || rangeObj.classification === 'abnormal'"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorIsProvidingClassification')">Provide an evidence strength for this functional range?</label>
          <div class="mavedb-help-small">Optionally, you can provide a description of the evidence supporting this classification.</div>
        </div>
        <div class="mavedb-wizard-content">
          <InputSwitch
            v-model="functionalRangeHelpers[rangeIdx].isProvidingClassification"
            :aria-labelledby="scopedId('input-investigatorIsProvidingClassification')"
            @change="updateClassificationValuesBasedOnRangeInformation(rangeIdx)"
          />
          <div class="mavedb-switch-value">
            {{
              functionalRangeHelpers[rangeIdx].isProvidingClassification
                ? 'Providing evidence strengths.'
                : 'No evidence strengths.'
            }}
          </div>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.acmgClassification`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.acmgClassification`]
          }}</span>
        </div>
      </div>
      <!-- ACMG classification details -->
      <div
        v-if="functionalRangeHelpers[rangeIdx].isProvidingClassification && rangeObj.acmgClassification"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorProvidedOddsPathEvidence')">Criterion and evidence strength.</label>
        </div>
        <div class="mavedb-wizard-content">
          <InputGroup>
            <span class="p-float-label">
              <Dropdown
                v-model="rangeObj.acmgClassification.criterion"
                :aria-labelledby="scopedId('input-investigatorProvidedOddsPathEvidence')"
                disabled
                :options="criterions"
                style="width: 25%"
              />
              <label :for="scopedId('input-investigatorProvidedOddspathsCriterion')">Criterion</label>
            </span>
            <span class="p-float-label">
              <Dropdown
                v-model="rangeObj.acmgClassification.evidenceStrength"
                :aria-labelledby="scopedId('input-investigatorProvidedOddsPathEvidence')"
                option-label="label"
                option-value="value"
                :options="evidenceStrengths"
                style="width: 75%"
              />
              <label :for="scopedId('input-investigatorProvidedOddsPathEvidence')">Evidence Strength</label>
            </span>
          </InputGroup>
          <span
            v-if="validationErrors[`functionalRanges.${rangeIdx}.acmgClassification.criterion`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalRanges.${rangeIdx}.acmgClassification.criterion`] }}</span
          >
          <span
            v-if="validationErrors[`functionalRanges.${rangeIdx}.acmgClassification.evidenceStrength`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalRanges.${rangeIdx}.acmgClassification.evidenceStrength`] }}</span
          >
        </div>
      </div>
      <!-- OddsPaths toggle -->
      <div
        v-if="rangeObj.classification === 'normal' || rangeObj.classification === 'abnormal'"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorIsProvidingOddsPath')">Provide OddsPaths?</label>
        </div>
        <div class="mavedb-wizard-content">
          <InputSwitch
            v-model="functionalRangeHelpers[rangeIdx].isProvidingOddspaths"
            :aria-labelledby="scopedId('input-investigatorIsProvidingOddsPath')"
          />
          <div class="mavedb-switch-value">
            {{ functionalRangeHelpers[rangeIdx].isProvidingOddspaths ? 'Providing OddsPaths.' : 'No OddsPaths.' }}
          </div>
        </div>
      </div>
      <!-- OddsPaths ratio -->
      <div v-if="functionalRangeHelpers[rangeIdx].isProvidingOddspaths" class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorProvidedOddsPathRatio')">OddsPaths ratio.</label>
        </div>
        <div class="mavedb-wizard-content">
          <span class="p-float-label" style="margin-right: 1em">
            <InputNumber
              v-model="rangeObj.oddspathsRatio"
              :aria-labelledby="scopedId('input-investigatorProvidedOddsPathRatio')"
              :max-fraction-digits="10"
              :min-fraction-digits="1"
              style="width: 100%"
            />
            <label :for="scopedId('input-oddsPathRatio')">OddsPaths Ratio</label>
          </span>
          <span v-if="validationErrors[`functionalRanges.${rangeIdx}.oddspathsRatio`]" class="mave-field-error">{{
            validationErrors[`functionalRanges.${rangeIdx}.oddspathsRatio`]
          }}</span>
        </div>
      </div>
    </div>
    <!-- Add functional range button -->
    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-content">
        <PrimeButton
          icon="pi pi-plus"
          :label="`Add ${draft.functionalRanges.length > 0 ? 'another' : 'a'} functional range`"
          style="float: right"
          @click="addFunctionalRange"
        />
      </div>
    </div>
    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-help">
        <label>Mark this calibration as 'research use only'?</label>
        <div class="mavedb-help-small">
          Selecting this option indicates that the calibration is intended for research purposes only and should not be
          used for variant interpretation.
        </div>
      </div>
      <div class="mavedb-wizard-content">
        <InputSwitch v-model="draft.researchUseOnly" />
        <div class="mavedb-switch-value">
          {{
            draft.researchUseOnly
              ? 'Calibration will be marked as research use only.'
              : 'Calibration will be marked as general use.'
          }}
        </div>
        <span v-if="validationErrors['researchUseOnly']" class="mave-field-error">{{
          validationErrors['researchUseOnly']
        }}</span>
      </div>
    </div>
    <!-- Threshold sources -->
    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-help">
        <label>Provide sources for calibration thresholds.</label>
        <div class="mavedb-help-small">
          These publications should describe the evidence used to set the functional range thresholds.
        </div>
      </div>
      <div class="mavedb-wizard-content">
        <span class="p-float-label">
          <AutoComplete
            :id="scopedId('input-threshold-sources')"
            ref="thresholdSourcesInput"
            v-model="draft.thresholdSources"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @item-select="acceptNewPublicationIdentifier(draft.thresholdSources)"
            @keyup.escape="clearPublicationIdentifierSearch('thresholdSourcesInput')"
          >
            <template #chip="slotProps">
              <div>{{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}</div>
            </template>
            <template #item="slotProps">
              <div>
                <div>Title: {{ slotProps.item.title }}</div>
                <div>DOI: {{ slotProps.item.doi }}</div>
                <div>Identifier: {{ slotProps.item.identifier }}</div>
                <div>Database: {{ slotProps.item.dbName }}</div>
              </div>
            </template>
          </AutoComplete>
          <label :for="scopedId('input-threshold-sources-publication-identifiers')">Publication identifiers</label>
          <span v-if="validationErrors['thresholdSources']" class="mave-field-error">{{
            validationErrors['thresholdSources']
          }}</span>
        </span>
      </div>
    </div>

    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-help">
        <label>Provide sources for calibration classifications.</label>
        <div class="mavedb-help-small">
          These publications should describe the evidence used to assign classifications to functional ranges.
        </div>
      </div>
      <div class="mavedb-wizard-content">
        <span class="p-float-label">
          <AutoComplete
            :id="scopedId('input-classification-sources-publication-identifiers')"
            ref="classificationSourcesInput"
            v-model="draft.classificationSources"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @item-select="acceptNewPublicationIdentifier(draft.classificationSources)"
            @keyup.escape="clearPublicationIdentifierSearch('classificationSourcesInput')"
          >
            <template #chip="slotProps">
              <div>
                <div>{{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}</div>
              </div>
            </template>
            <template #item="slotProps">
              <div>
                <div>Title: {{ slotProps.item.title }}</div>
                <div>DOI: {{ slotProps.item.doi }}</div>
                <div>Identifier: {{ slotProps.item.identifier }}</div>
                <div>Database: {{ slotProps.item.dbName }}</div>
              </div>
            </template>
          </AutoComplete>
          <label :for="scopedId('input-classification-sources-publication-identifiers')">Publication identifiers</label>
          <span v-if="validationErrors['classificationSources']" class="mave-field-error">{{
            validationErrors['classificationSources']
          }}</span>
        </span>
      </div>
    </div>

    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-help">
        <label>Provide sources for classification methods.</label>
        <div class="mavedb-help-small">
          These publications should describe the method by which evidence strengths were determined.
        </div>
      </div>
      <div class="mavedb-wizard-content">
        <span class="p-float-label">
          <AutoComplete
            :id="scopedId('input-method-sources-publication-identifiers')"
            ref="methodSourcesInput"
            v-model="draft.methodSources"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @item-select="acceptNewPublicationIdentifier(draft.methodSources)"
            @keyup.escape="clearPublicationIdentifierSearch('methodSourcesInput')"
          >
            <template #chip="slotProps">
              <div>
                <div>{{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}</div>
              </div>
            </template>
            <template #item="slotProps">
              <div>
                <div>Title: {{ slotProps.item.title }}</div>
                <div>DOI: {{ slotProps.item.doi }}</div>
                <div>Identifier: {{ slotProps.item.identifier }}</div>
                <div>Database: {{ slotProps.item.dbName }}</div>
              </div>
            </template>
          </AutoComplete>
          <label :for="scopedId('input-method-sources-publication-identifiers')">Publication identifiers</label>
          <span v-if="validationErrors['methodSources']" class="mave-field-error">{{
            validationErrors['methodSources']
          }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {useHead} from '@unhead/vue'
import config from '@/config'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import axios from 'axios'
import SelectButton from 'primevue/selectbutton'
import Dropdown from 'primevue/dropdown'
import {reactive, ref} from 'vue'
import type {PropType} from 'vue'
import InputText from 'primevue/inputtext'
import PrimeButton from 'primevue/button'
import PrimeTextarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import AutoComplete from 'primevue/autocomplete'
import useItems from '@/composition/items'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import InputGroup from 'primevue/inputgroup'
import InputNumber from 'primevue/inputnumber'
import InputGroupAddon from 'primevue/inputgroupaddon'
import _, {cloneDeep} from 'lodash'
import {PublicationIdentifier} from '@/lib/publication'
import {
  ACMGEvidenceStrength,
  EVIDENCE_STRENGTH,
  BENIGN_CRITERION,
  PATHOGENIC_CRITERION,
  DraftScoreCalibration as DraftScoreCalibrationWithNullableFunctionalRanges,
  FunctionalRange
} from '@/lib/calibrations'

type MinimalScoreSet = {
  urn: string
  title: string
  shortDescription: string | null
}

export interface DraftScoreCalibration extends DraftScoreCalibrationWithNullableFunctionalRanges {
  functionalRanges: FunctionalRange[]
}

export default {
  name: 'CalibrationEditor',
  components: {
    InputText,
    PrimeButton,
    PrimeTextarea,
    InputSwitch,
    AutoComplete,
    FontAwesomeIcon,
    InputGroup,
    InputGroupAddon,
    InputNumber,
    SelectButton,
    Dropdown
  },

  props: {
    calibrationUrn: {
      type: String,
      required: false,
      default: null
    },
    scoreSetUrn: {
      type: String,
      required: false,
      default: null
    },
    calibrationDraftRef: {
      type: Object as PropType<{value: DraftScoreCalibration | null}>,
      required: false,
      default: null
    },
    validationErrors: {
      type: Object as PropType<{[key: string]: string}>,
      required: false,
      default: () => ({})
    }
  },

  emits: ['canceled', 'saved'],

  setup: (props) => {
    const head = useHead({
      title: props.calibrationUrn
        ? `Edit Calibration ${props.calibrationUrn}`
        : `Create Calibration in ${props.scoreSetUrn}`
    })
    const {userIsAuthenticated} = useAuth()

    if (props.calibrationUrn && props.scoreSetUrn) {
      console.warn('Both calibrationUrn and scoreSetUrn are provided; only one should be set.')
    }

    // Helper to build a blank draft (create mode seed)
    const buildBlankDraft = () => ({
      urn: props.calibrationUrn || null,
      scoreSetUrn: props.scoreSetUrn || null,
      title: '',
      notes: null,
      baselineScore: null,
      baselineScoreDescription: null,
      researchUseOnly: false,
      private: true,
      primary: false,
      investigatorProvide: true,
      functionalRanges: [] as FunctionalRange[],
      thresholdSources: [] as PublicationIdentifier[],
      methodSources: [] as PublicationIdentifier[],
      classificationSources: [] as PublicationIdentifier[]
    })

    // Internal reactive draft calibration (object identity must remain stable)
    type DraftScoreCalibrationWithOriginal = DraftScoreCalibration & {__original: DraftScoreCalibration}
    const draftCalibrationBase = buildBlankDraft()
    const draftCalibration = reactive<DraftScoreCalibrationWithOriginal>({
      ...draftCalibrationBase,
      __original: cloneDeep(draftCalibrationBase)
    })

    // Maintain functional range helper information in a separate structure
    const functionalRangeHelpers = ref<
      {
        infiniteLower: boolean
        infiniteUpper: boolean
        isProvidingOddspaths: boolean
        isProvidingClassification: boolean
        lastOddsPathState: number | null
        lastClassificationState: ACMGEvidenceStrength | null
        lastLowerInclusiveState: boolean
        lastUpperInclusiveState: boolean
      }[]
    >([])

    // Apply server/prop data in-place (never replace the reactive root)
    const applyCalibrationData = (data: Partial<DraftScoreCalibration>) => {
      // Copy primitive / array fields
      const keys: (keyof DraftScoreCalibration)[] = [
        'urn',
        'scoreSetUrn',
        'title',
        'notes',
        'baselineScore',
        'baselineScoreDescription',
        'researchUseOnly',
        'thresholdSources',
        'methodSources',
        'classificationSources'
      ]
      keys.forEach((k) => {
        if (data[k] !== undefined) {
          // @ts-expect-error index assignment
          draftCalibration[k] = data[k] as unknown
        }
      })

      // functionalRanges require helper flags; build each helper from functional range data
      if (data.functionalRanges) {
        draftCalibration.functionalRanges.splice(0, draftCalibration.functionalRanges.length)

        data.functionalRanges.forEach((fr: FunctionalRange) => {
          const draftFunctionalRange: FunctionalRange = {
            label: fr.label || '',
            description: fr.description || null,
            range: fr.range || [null, null],
            inclusiveLowerBound: fr.inclusiveLowerBound ?? true,
            inclusiveUpperBound: fr.inclusiveUpperBound ?? true,
            classification: fr.classification || 'not_specified',
            acmgClassification: fr.acmgClassification || null,
            oddspathsRatio: fr.oddspathsRatio || null
          }

          draftCalibration.functionalRanges.push(draftFunctionalRange)

          const functionalRangeHelpersEntry = {
            infiniteLower: fr.range[0] == null || false,
            infiniteUpper: fr.range[1] == null || false,
            isProvidingOddspaths: fr.oddspathsRatio != null || false,
            isProvidingClassification: fr.acmgClassification != null || false,
            lastOddsPathState: fr.oddspathsRatio != null ? fr.oddspathsRatio : null,
            lastClassificationState: fr.acmgClassification != null ? fr.acmgClassification : null,
            lastLowerInclusiveState: fr.inclusiveLowerBound,
            lastUpperInclusiveState: fr.inclusiveUpperBound
          }
          functionalRangeHelpers.value.push(functionalRangeHelpersEntry)
        })
      }
    }

    // Fetch existing calibration (edit mode)
    const loadCalibration = async (urn: string) => {
      try {
        const resp = await axios.get(`${config.apiBaseUrl}/score-calibrations/${urn}`)
        applyCalibrationData(resp.data)
        draftCalibration.__original = cloneDeep(draftCalibration)
      } catch (e) {
        console.error('Failed to load calibration', urn, e)
      }
    }

    // Initialize for create mode
    const initCreateDraft = () => {
      applyCalibrationData(buildBlankDraft())
      draftCalibration.__original = cloneDeep(draftCalibration)
    }

    // Dirty / valid tracking refs (parent may also compute own if desired)
    const isDirty = ref(false)
    const isValid = ref(false)
    const recomputeMeta = () => {
      // Remove helper wrapper from comparison by mapping functionalRanges -> values
      const snapshot = (dc: DraftScoreCalibration) => ({
        urn: dc.urn,
        scoreSetUrn: dc.scoreSetUrn,
        title: dc.title,
        notes: dc.notes,
        baselineScore: dc.baselineScore,
        baselineScoreDescription: dc.baselineScoreDescription,
        researchUseOnly: dc.researchUseOnly,
        functionalRanges: dc.functionalRanges,
        thresholdSources: dc.thresholdSources,
        methodSources: dc.methodSources,
        classificationSources: dc.classificationSources
      })
      isDirty.value = !_.isEqual(snapshot(draftCalibration), snapshot(draftCalibration.__original))
      isValid.value = !!draftCalibration.title
    }

    // Expose manual recompute for methods below
    const markChanged = () => recomputeMeta()

    // Provide link of draft to parent
    if (props.calibrationDraftRef) {
      // eslint-disable-next-line vue/no-mutating-props
      props.calibrationDraftRef.value = draftCalibration
    }
    if (props.calibrationDraftRef) {
      // eslint-disable-next-line vue/no-mutating-props
      props.calibrationDraftRef.value = draftCalibration
    }

    // Determine initial mode and load the appropriate calibration data
    const inCreateMode = props.calibrationUrn ? false : true
    if (props.calibrationUrn) {
      loadCalibration(props.calibrationUrn)
    } else {
      initCreateDraft()
    }

    // @ts-expect-error dynamic store module typing
    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    // @ts-expect-error dynamic store module typing
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})

    const rangeClassifications = [
      {label: 'Normal', value: 'normal'},
      {label: 'Abnormal', value: 'abnormal'},
      {label: 'Not specified', value: 'not_specified'}
    ]

    return {
      head,
      config,
      userIsAuthenticated,
      inCreateMode,

      ...useScopedId(),

      // Publication identifier autocomplete
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text: string) => publicationIdentifierSuggestions.setRequestBody({text}),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text: string) =>
        externalPublicationIdentifierSuggestions.setRequestBody({text}),

      draft: draftCalibration,
      isDirty,
      isValid,
      applyCalibrationData,
      loadCalibration,
      initCreateDraft,
      markChanged,
      recomputeMeta,
      functionalRangeHelpers,
      rangeClassifications
    }
  },
  data() {
    return {
      evidenceStrengths: EVIDENCE_STRENGTH.map((es) => ({
        label: es,
        value: es.toLowerCase()
      })),
      criterions: [PATHOGENIC_CRITERION, BENIGN_CRITERION],
      editableScoreSets: ref<Array<MinimalScoreSet>>([]),
      selectedScoreSet: ref<MinimalScoreSet | null>(null)
    }
  },
  computed: {
    publicationIdentifierSuggestionsList: function () {
      const merged = _.unionBy(
        (this.publicationIdentifierSuggestions as PublicationIdentifier[]) || [],
        (this.externalPublicationIdentifierSuggestions as PublicationIdentifier[]) || [],
        'identifier'
      ) as PublicationIdentifier[]
      return this.suggestionsForAutocomplete(merged)
    }
  },
  watch: {
    // React to calibrationUrn changes (switch between edit/create dynamically)
    calibrationUrn: {
      async handler(newUrn: string | null, oldUrn: string | null) {
        if (newUrn && newUrn !== oldUrn) {
          await this.loadCalibration(newUrn)
          this.recomputeMeta()
        } else if (!newUrn && oldUrn) {
          // Transition to create mode
          this.initCreateDraft()
          this.recomputeMeta()
        }
      }
    },
    scoreSetUrn: {
      handler(newVal: string | null) {
        this.draft.scoreSetUrn = newVal
        this.draft.__original.scoreSetUrn = newVal

        this.selectScoreSetByUrn(newVal)
        this.recomputeMeta()
      }
    },
    selectedScoreSet: {
      handler(newValue, oldValue) {
        if (newValue !== oldValue) {
          this.draft.scoreSetUrn = newValue ? newValue.urn : null
          this.recomputeMeta()
        }
      }
    },
    editableScoreSets: {
      handler(newValue) {
        if (newValue && newValue.length > 0 && (this.draft.scoreSetUrn || this.scoreSetUrn)) {
          // Select the appropriate score set via URN
          this.selectScoreSetByUrn(this.draft.scoreSetUrn || this.scoreSetUrn)
          this.recomputeMeta()
        }
      }
    }
  },
  mounted: async function () {
    await this.loadEditableScoreSets()
  },
  methods: {
    loadEditableScoreSets: async function () {
      try {
        const response = await axios.post(`${config.apiBaseUrl}/me/score-sets/search`, {metaAnalysis: false})
        this.editableScoreSets = response.data
      } catch (error) {
        console.error('Error loading score sets:', error)
        this.editableScoreSets = [] // Reset in case of an error
      }
    },

    selectScoreSetByUrn: function (urn: string | null) {
      if (!urn) {
        this.selectedScoreSet = null
        return
      }

      const scoreSet = this.editableScoreSets.find((ss) => ss.urn === urn)
      if (scoreSet) {
        this.selectedScoreSet = scoreSet
      }
      // Fallback: fetch score set from server. This is only really applicable to admin users for now, but in the future we'll
      // want to decide how the score set dropdown should be populated in the first place when users have access to all score sets
      // as calibration targets. We'll likely want some sort of autocomplete.
      else {
        axios
          .get(`${this.config.apiBaseUrl}/score-sets/${urn}`)
          .then((response) => {
            this.selectedScoreSet = response.data
            this.editableScoreSets.push(response.data)
          })
          .catch((error) => {
            console.error(`Error loading score set with URN ${urn}:`, error)
          })
      }
    },

    acceptNewPublicationIdentifier: function (publicationList: PublicationIdentifier[]) {
      // We assume the newest value is the right-most one here. That seems to always be true in this version of Primevue,
      // but that may change in the future.
      const newIdx = publicationList.length - 1

      // Remove new value if it is a duplicate.
      const newIdentifier = publicationList[newIdx].identifier
      if (publicationList.findIndex((pub) => pub.identifier == newIdentifier) < newIdx) {
        publicationList.splice(newIdx, 1)
        this.$toast.add({
          severity: 'warn',
          summary: `Identifier "${newIdentifier}" is already associated with this calibration`,
          life: 3000
        })
      }
    },

    clearPublicationIdentifierSearch: function (refName: string) {
      // This could change with a new Primevue version.
      const input = this.$refs[refName]
      input.$refs.focusInput.value = ''
    },

    searchPublicationIdentifiers: function (event: {query: string}) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    truncatePublicationTitle: function (title: string) {
      return title.length > 50 ? title.slice(0, 50) + '...' : title
    },

    suggestionsForAutocomplete: function (suggestions: PublicationIdentifier[]) {
      // Return an empty array when there are no suggestions to keep typing sound.
      if (!suggestions || suggestions.length === 0) {
        return []
      }
      return suggestions
    },

    addFunctionalRange: function () {
      this.draft.functionalRanges.push({
        label: '',
        description: '',
        range: [null, null],

        inclusiveLowerBound: true,
        inclusiveUpperBound: false,
        classification: null,
        acmgClassification: null,
        oddspathsRatio: null
      })

      this.functionalRangeHelpers.push({
        infiniteLower: false,
        infiniteUpper: false,
        isProvidingOddspaths: false,
        isProvidingClassification: false,
        lastOddsPathState: null,
        lastClassificationState: null,
        lastLowerInclusiveState: true,
        lastUpperInclusiveState: false
      })
      this.recomputeMeta()
    },

    toggleBoundary: function (rangeIdx: number, boundType: 'lower' | 'upper') {
      const rangeObj = this.draft.functionalRanges[rangeIdx]
      if (!rangeObj) return
      if (boundType === 'lower') {
        rangeObj.inclusiveLowerBound = !rangeObj.inclusiveLowerBound
      } else if (boundType === 'upper') {
        rangeObj.inclusiveUpperBound = !rangeObj.inclusiveUpperBound
      }
    },

    toggleInfinity: function (rangeIdx: number, boundType: 'lower' | 'upper') {
      const rangeObj = this.draft.functionalRanges[rangeIdx]
      const rangeHelper = this.functionalRangeHelpers[rangeIdx]
      if (!rangeObj) return
      if (boundType === 'lower') {
        rangeHelper.infiniteLower = !rangeHelper.infiniteLower
        if (rangeHelper.infiniteLower) {
          rangeObj.range[0] = null
          rangeHelper.lastLowerInclusiveState = rangeObj.inclusiveLowerBound
          rangeObj.inclusiveLowerBound = false
        } else {
          rangeObj.inclusiveLowerBound = rangeHelper.lastLowerInclusiveState
        }
      } else if (boundType === 'upper') {
        rangeHelper.infiniteUpper = !rangeHelper.infiniteUpper
        if (rangeHelper.infiniteUpper) {
          rangeObj.range[1] = null
          rangeHelper.lastUpperInclusiveState = rangeObj.inclusiveUpperBound
          rangeObj.inclusiveUpperBound = false
        } else {
          rangeObj.inclusiveUpperBound = rangeHelper.lastUpperInclusiveState
        }
      }
    },

    updateClassificationValuesBasedOnRangeInformation: function (rangeIdx: number) {
      const rangeObj = this.draft.functionalRanges[rangeIdx]
      const rangeHelper = this.functionalRangeHelpers[rangeIdx]
      if (!rangeObj) return
      if (!rangeObj.classification || rangeObj.classification === 'not_specified') {
        // Clear ACMG classification if range classification is not specified
        rangeHelper.isProvidingClassification = false
      }

      if (rangeHelper.isProvidingClassification === false) {
        rangeHelper.lastClassificationState = rangeObj.acmgClassification!
        rangeObj.acmgClassification = null
        return
      } else {
        rangeObj.acmgClassification = {
          criterion:
            rangeObj.classification === 'normal'
              ? BENIGN_CRITERION
              : rangeObj.classification === 'abnormal'
                ? PATHOGENIC_CRITERION
                : null,
          evidenceStrength: rangeHelper.lastClassificationState?.evidenceStrength
            ? rangeHelper.lastClassificationState.evidenceStrength
            : null
        }
      }
    },

    removeFunctionalRange: function (rangeIdx: number) {
      this.draft.functionalRanges.splice(rangeIdx, 1)
      this.functionalRangeHelpers.splice(rangeIdx, 1)
      this.recomputeMeta()
    },

    saveCalibration: function () {
      this.$emit('saved', this.draft)
      // Update original snapshot after external save (parent may call back). We optimistically snapshot here.
      this.draft.__original = cloneDeep(this.draft)
      this.recomputeMeta()
    },

    resetCalibration: function () {
      if (this.draft && this.draft.__original) {
        // Restore each field except helper wrappers already aligned
        const original = this.draft.__original
        const keys = [
          'urn',
          'scoreSetUrn',
          'title',
          'notes',
          'baselineScore',
          'baselineScoreDescription',
          'researchUseOnly',
          'private',
          'primary',
          'investigatorProvide',
          'thresholdSources',
          'methodSources',
          'classificationSources'
        ]
        keys.forEach((k) => {
          // @ts-expect-error index
          this.draft[k] = original[k]
        })
        // Reset functionalRanges and their helpers
        this.draft.functionalRanges.splice(0, this.draft.functionalRanges.length)
        this.functionalRangeHelpers.splice(0, this.functionalRangeHelpers.length)
        original.functionalRanges.forEach((fr: FunctionalRange) => {
          this.draft.functionalRanges.push(fr)
          const functionalRangeHelpersEntry = {
            infiniteLower: fr.range[0] == null || false,
            infiniteUpper: fr.range[1] == null || false,
            isProvidingOddspaths: fr.oddspathsRatio != null || false,
            isProvidingClassification: fr.acmgClassification != null || false,
            lastOddsPathState: fr.oddspathsRatio != null ? fr.oddspathsRatio : null,
            lastClassificationState: fr.acmgClassification != null ? fr.acmgClassification : null,
            lastLowerInclusiveState: fr.inclusiveLowerBound,
            lastUpperInclusiveState: fr.inclusiveUpperBound
          }
          this.functionalRangeHelpers.push(functionalRangeHelpersEntry)
        })
        this.recomputeMeta()
      }
    }
  }
}
</script>

<style scoped src="../assets/forms.css"></style>

<style scoped>
/* One form within a wizard. Needed as the parent of .mavedb-sizard-content-background. */
.mavedb-wizard-form {
  position: relative;
  z-index: 0;
}

/* Give the right side of the wizard a white background, without gaps between rows. */
.mavedb-wizard-form-content-background {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 60%;
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
  width: 40%;
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
  width: 60%;
  padding: 22px 10px 10px 10px;
}

.mavedb-wizard-subcontent {
  padding: 5px 0px 5px 5px;
}

.mavedb-wizard-content-pane {
  float: right;
  width: 60%;
  padding: 0 10px;
  background-color: #fff;
}

/* Switches */
.p-inputswitch {
  margin: 10px 0;
  vertical-align: middle;
}

.mavedb-switch-value {
  display: inline-block;
  margin: 10px 1em;
}

/* Make sure autocomplete text input is the same width as the autocomplete */
.p-autocomplete:deep(.p-autocomplete-multiple-container) {
  width: 100%;
}
.p-autocomplete {
  width: 100%;
}

.mavedb-calibration-editor-actions {
  margin-top: 20px;
  text-align: right;
}

.mavedb-calibration-editor-actions .p-button {
  margin-left: 10px;
}

.score-range-toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-range-toggle-icon {
  margin: 0 auto;
}
</style>
