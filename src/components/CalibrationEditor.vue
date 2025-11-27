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
            <Select
              :id="scopedId('input-containing-score-set')"
              v-model="selectedScoreSet"
              class="w-full"
              option-label="title"
              :options="editableScoreSets"
            >
              <template #option="slotProps">
                <div>
                  <div>Title: {{ slotProps.option.title }}</div>
                  <div>Description: {{ slotProps.option.shortDescription }}</div>
                </div>
              </template>
            </Select>
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
    <template v-if="allowClassBased">
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-help">
          <label :id="scopedId(`input-functionalClassificationType`)"
            >Is this functional calibration defined by score ranges or categorical classes?</label
          >
          <div class="mavedb-help-small">
            You may define score calibrations by either providing numerical ranges or by providing categorical class
            names. When providing numerical ranges, these ranges will define variant classes based on the functional
            score of variants. If you provide class names, you should upload a CSV file containing the mapping of
            variants to classes and ensure that the class names match those you define below.
          </div>
        </div>
        <div class="mavedb-wizard-content">
          <ToggleSwitch v-model="classBased" :aria-labelledby="scopedId(`input-functionalClassificationType`)" />
          <div class="mavedb-switch-value">
            <span
              >This calibration is defined by <b>{{ classBased ? 'categorical classes' : 'score ranges' }}</b
              >.</span
            >
          </div>
        </div>
      </div>
    </template>
    <!-- Functional ranges loop -->
    <div v-for="(rangeObj, rangeIdx) in draft.functionalClassifications" :key="rangeIdx">
      <div class="mavedb-wizard-row">
        <div class="mavedb-wizard-content">
          <div>
            Functional Range {{ rangeIdx + 1 }}
            <PrimeButton
              class="float-right ml-2"
              icon="pi pi-times"
              rounded
              severity="danger"
              size="small"
              text
              @click="removefunctionalClassification(rangeIdx)"
            />
          </div>
          <hr />
          <span v-if="validationErrors[`functionalClassifications.${rangeIdx}`]" class="mave-field-error">{{
            validationErrors[`functionalClassifications.${rangeIdx}`]
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
          <span v-if="validationErrors[`functionalClassifications.${rangeIdx}.label`]" class="mave-field-error">{{
            validationErrors[`functionalClassifications.${rangeIdx}.label`]
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
          <span v-if="validationErrors[`functionalClassifications.${rangeIdx}.description`]" class="mave-field-error">{{
            validationErrors[`functionalClassifications.${rangeIdx}.description`]
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
            v-model="rangeObj.functionalClassification"
            option-label="label"
            option-value="value"
            :options="rangeClassifications"
            @change="updateClassificationValuesBasedOnRangeInformation(rangeIdx)"
          />
          <span
            v-if="validationErrors[`functionalClassifications.${rangeIdx}.classification`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalClassifications.${rangeIdx}.classification`] }}</span
          >
        </div>
      </div>
      <!-- Range boundaries -->
      <template v-if="!classBased">
        <div class="mavedb-wizard-row">
          <div class="mavedb-wizard-help">
            <label :id="scopedId(`input-investigatorProvidedRangeBoundaries-${rangeIdx}`)"
              >Upper and lower bounds.</label
            >
            <div class="mavedb-help-small">Use toggle buttons for inclusive/exclusive and infinity.</div>
          </div>
          <div class="mavedb-wizard-content">
            <InputGroup>
              <PrimeButton
                class="score-range-toggle-button"
                :outlined="!functionalClassificationHelpers[rangeIdx].infiniteLower"
                @click="toggleInfinity(rangeIdx, 'lower')"
                ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-infinity"
              /></PrimeButton>
              <PrimeButton
                class="score-range-toggle-button"
                :disabled="functionalClassificationHelpers[rangeIdx].infiniteLower"
                :outlined="!rangeObj.inclusiveLowerBound"
                @click="toggleBoundary(rangeIdx, 'lower')"
                ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-circle-half-stroke"
              /></PrimeButton>
              <span class="p-float-label">
                <InputNumber
                  v-model="rangeObj.range[0]"
                  :aria-labelledby="scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)"
                  class="w-full"
                  :disabled="functionalClassificationHelpers[rangeIdx].infiniteLower"
                  :max-fraction-digits="10"
                  :min-fraction-digits="0"
                  mode="decimal"
                  step="any"
                />
                <label :for="scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)">{{
                  functionalClassificationHelpers[rangeIdx].infiniteLower
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
                  class="w-full"
                  :disabled="functionalClassificationHelpers[rangeIdx].infiniteUpper"
                  :max-fraction-digits="10"
                  :min-fraction-digits="0"
                  mode="decimal"
                  step="any"
                />
                <label :for="scopedId(`input-investigatorProvidedRangeUpper-${rangeIdx}`)">{{
                  functionalClassificationHelpers[rangeIdx].infiniteUpper
                    ? 'infinity'
                    : rangeObj.inclusiveUpperBound
                      ? 'Upper Bound (inclusive)'
                      : 'Upper Bound (exclusive)'
                }}</label>
              </span>
              <PrimeButton
                class="score-range-toggle-button"
                :disabled="functionalClassificationHelpers[rangeIdx].infiniteUpper"
                :outlined="!rangeObj.inclusiveUpperBound"
                @click="toggleBoundary(rangeIdx, 'upper')"
                ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-circle-half-stroke"
              /></PrimeButton>
              <PrimeButton
                class="score-range-toggle-button"
                :outlined="!functionalClassificationHelpers[rangeIdx].infiniteUpper"
                @click="toggleInfinity(rangeIdx, 'upper')"
                ><FontAwesomeIcon class="score-range-toggle-icon" icon="fa-solid fa-infinity"
              /></PrimeButton>
            </InputGroup>
            <span v-if="validationErrors[`functionalClassifications.${rangeIdx}.range`]" class="mave-field-error">{{
              validationErrors[`functionalClassifications.${rangeIdx}.range`]
            }}</span>
            <span
              v-if="validationErrors[`functionalClassifications.${rangeIdx}.inclusiveLowerBound`]"
              class="mave-field-error"
              >{{ validationErrors[`functionalClassifications.${rangeIdx}.range`] }}</span
            >
            <span
              v-if="validationErrors[`functionalClassifications.${rangeIdx}.inclusiveUpperBound`]"
              class="mave-field-error"
              >{{ validationErrors[`functionalClassifications.${rangeIdx}.inclusiveUpperBound`] }}</span
            >
          </div>
        </div>
      </template>
      <template v-else>
        <div class="mavedb-wizard-row">
          <div class="mavedb-wizard-help">
            <label :id="scopedId(`input-functionalClassificationClass-${rangeIdx}`)"
              >The class name for this range</label
            >
            <div class="mavedb-help-small">
              This class name should be identical to the name provided in your accompanying CSV file.
            </div>
          </div>
          <div class="mavedb-wizard-content">
            <InputTextfunctionalClassification
              v-model="rangeObj.class"
              :aria-labelledby="scopedId(`input-functionalClassificationClass-${rangeIdx}`)"
              style="width: 100%"
            />
            <span v-if="validationErrors[`functionalClassifications.${rangeIdx}.class`]" class="mave-field-error">{{
              validationErrors[`functionalClassifications.${rangeIdx}.class`]
            }}</span>
          </div>
        </div>
      </template>
      <!-- ACMG classification toggle -->
      <div
        v-if="rangeObj.functionalClassification === 'normal' || rangeObj.functionalClassification === 'abnormal'"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorIsProvidingClassification')"
            >Provide an evidence strength for this functional range?</label
          >
          <div class="mavedb-help-small">
            Optionally, you can provide a description of the evidence supporting this classification.
          </div>
        </div>
        <div class="mavedb-wizard-content">
          <ToggleSwitch
            v-model="functionalClassificationHelpers[rangeIdx].isProvidingClassification"
            :aria-labelledby="scopedId('input-investigatorIsProvidingClassification')"
            @change="updateClassificationValuesBasedOnRangeInformation(rangeIdx)"
          />
          <div class="mavedb-switch-value">
            {{
              functionalClassificationHelpers[rangeIdx].isProvidingClassification
                ? 'Providing evidence strengths.'
                : 'No evidence strengths.'
            }}
          </div>
          <span
            v-if="validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification`] }}</span
          >
        </div>
      </div>
      <!-- ACMG classification details -->
      <div
        v-if="functionalClassificationHelpers[rangeIdx].isProvidingClassification && rangeObj.acmgClassification"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorProvidedOddsPathEvidence')">Criterion and evidence strength.</label>
        </div>
        <div class="mavedb-wizard-content">
          <InputGroup>
            <span class="p-float-label w-full">
              <Select
                v-model="rangeObj.acmgClassification.criterion"
                :aria-labelledby="scopedId('input-investigatorProvidedOddsPathEvidence')"
                class="w-full"
                disabled
                :options="criterions"
              />
              <label :for="scopedId('input-investigatorProvidedOddspathsCriterion')">Criterion</label>
            </span>
            <span class="p-float-label w-full">
              <Select
                v-model="rangeObj.acmgClassification.evidenceStrength"
                :aria-labelledby="scopedId('input-investigatorProvidedOddsPathEvidence')"
                class="w-full"
                option-label="label"
                option-value="value"
                :options="evidenceStrengths"
              />
              <label :for="scopedId('input-investigatorProvidedOddsPathEvidence')">Evidence Strength</label>
            </span>
          </InputGroup>
          <span
            v-if="validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification.criterion`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification.criterion`] }}</span
          >
          <span
            v-if="validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification.evidenceStrength`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalClassifications.${rangeIdx}.acmgClassification.evidenceStrength`] }}</span
          >
        </div>
      </div>
      <!-- OddsPaths toggle -->
      <div
        v-if="rangeObj.functionalClassification === 'normal' || rangeObj.functionalClassification === 'abnormal'"
        class="mavedb-wizard-row"
      >
        <div class="mavedb-wizard-help">
          <label :id="scopedId('input-investigatorIsProvidingOddsPath')">Provide OddsPaths?</label>
        </div>
        <div class="mavedb-wizard-content">
          <ToggleSwitch
            v-model="functionalClassificationHelpers[rangeIdx].isProvidingOddspaths"
            :aria-labelledby="scopedId('input-investigatorIsProvidingOddsPath')"
          />
          <div class="mavedb-switch-value">
            {{
              functionalClassificationHelpers[rangeIdx].isProvidingOddspaths ? 'Providing OddsPaths.' : 'No OddsPaths.'
            }}
          </div>
        </div>
      </div>
      <!-- OddsPaths ratio -->
      <div v-if="functionalClassificationHelpers[rangeIdx].isProvidingOddspaths" class="mavedb-wizard-row">
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
          <span
            v-if="validationErrors[`functionalClassifications.${rangeIdx}.oddspathsRatio`]"
            class="mave-field-error"
            >{{ validationErrors[`functionalClassifications.${rangeIdx}.oddspathsRatio`] }}</span
          >
        </div>
      </div>
    </div>
    <!-- Add functional range button -->
    <div class="mavedb-wizard-row">
      <div class="mavedb-wizard-content">
        <PrimeButton
          icon="pi pi-plus"
          :label="`Add ${draft.functionalClassifications && draft.functionalClassifications.length > 0 ? 'another' : 'a'} functional range`"
          style="float: right"
          @click="addfunctionalClassification"
        />
      </div>
    </div>
    <div v-if="classBased" class="mavedb-wizard-row">
      <div class="mavedb-wizard-help">
        <label>Class name CSV</label>
        <div class="mavedb-help-small">
          Since you are providing categorical class names, please upload a CSV file mapping variants to these classes.
          This file should contain the following columns:<br />
          - One of: `<code>variant_urn</code>`, `<code>hgvs_nt</code>`, `<code>hgvs_pro</code>`: The URN or HGVS
          notation of the variant. This column should be unique. <br />
          - <code>class_name</code>: The name of the class associated with the variant
        </div>
      </div>
      <div class="mavedb-wizard-content">
        <FileUpload
          :id="scopedId('input-classesFile')"
          ref="calibrationFileUpload"
          accept="text/csv"
          :auto="false"
          choose-label="Classes file"
          :custom-upload="true"
          :file-limit="1"
          :show-cancel-button="false"
          :show-upload-button="false"
          @remove="onClassesFileClear"
          @select="onClassesFileUpload($event)"
        >
          <template #empty>
            <p>Drop a file here.</p>
          </template>
        </FileUpload>
        <span v-if="validationErrors['classesFile']" class="mave-field-error">{{
          validationErrors['classesFile']
        }}</span>
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
        <ToggleSwitch v-model="draft.researchUseOnly" />
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
            class="p-inputwrapper-filled"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @keyup.escape="clearPublicationIdentifierSearch('thresholdSourcesInput')"
            @option-select="acceptNewPublicationIdentifier(draft.thresholdSources)"
          >
            <template #chip="slotProps">
              <div class="p-inputchips-chip-item">
                {{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}
                <div>
                  <i
                    class="pi pi-times-circle"
                    @click="removePublicationIdentifier(slotProps.value, draft.thresholdSources)"
                  ></i>
                </div>
              </div>
            </template>
            <template #option="slotProps">
              <div>
                <div>Title: {{ slotProps.option.title }}</div>
                <div>DOI: {{ slotProps.option.doi }}</div>
                <div>Identifier: {{ slotProps.option.identifier }}</div>
                <div>Database: {{ slotProps.option.dbName }}</div>
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
            class="p-inputwrapper-filled"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @keyup.escape="clearPublicationIdentifierSearch('classificationSourcesInput')"
            @option-select="acceptNewPublicationIdentifier(draft.classificationSources)"
          >
            <template #chip="slotProps">
              <div class="p-inputchips-chip-item">
                {{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}
                <div>
                  <i
                    class="pi pi-times-circle"
                    @click="removePublicationIdentifier(slotProps.value, draft.classificationSources)"
                  ></i>
                </div>
              </div>
            </template>
            <template #option="slotProps">
              <div>
                <div>Title: {{ slotProps.option.title }}</div>
                <div>DOI: {{ slotProps.option.doi }}</div>
                <div>Identifier: {{ slotProps.option.identifier }}</div>
                <div>Database: {{ slotProps.option.dbName }}</div>
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
            class="p-inputwrapper-filled"
            :multiple="true"
            option-label="identifier"
            :suggestions="publicationIdentifierSuggestionsList"
            @complete="searchPublicationIdentifiers"
            @keyup.escape="clearPublicationIdentifierSearch('methodSourcesInput')"
            @option-select="acceptNewPublicationIdentifier(draft.methodSources)"
          >
            <template #chip="slotProps">
              <div class="p-inputchips-chip-item">
                {{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}
                <div>
                  <i
                    class="pi pi-times-circle"
                    @click="removePublicationIdentifier(slotProps.value, draft.methodSources)"
                  ></i>
                </div>
              </div>
            </template>
            <template #option="slotProps">
              <div>
                <div>Title: {{ slotProps.option.title }}</div>
                <div>DOI: {{ slotProps.option.doi }}</div>
                <div>Identifier: {{ slotProps.option.identifier }}</div>
                <div>Database: {{ slotProps.option.dbName }}</div>
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
import {components} from '@/schema/openapi'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import axios from 'axios'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import {reactive, ref} from 'vue'
import type {PropType} from 'vue'
import InputText from 'primevue/inputtext'
import PrimeButton from 'primevue/button'
import PrimeTextarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import AutoComplete from 'primevue/autocomplete'
import FileUpload from 'primevue/fileupload'
import useItems from '@/composition/items'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import InputGroup from 'primevue/inputgroup'
import InputNumber from 'primevue/inputnumber'
import InputGroupAddon from 'primevue/inputgroupaddon'
import _, {cloneDeep} from 'lodash'
import {PublicationIdentifier} from '@/lib/publication'
import {EVIDENCE_STRENGTH, BENIGN_CRITERION, PATHOGENIC_CRITERION} from '@/lib/calibrations'

type MinimalScoreSet = {
  urn: string
  title: string
  shortDescription: string | null
}

// Type alias for ACMGClassification without server-managed fields
export type DraftAcmgClassification = Omit<
  components['schemas']['ACMGClassification'],
  'id' | 'creationDate' | 'createdBy' | 'modificationDate' | 'modifiedBy' | 'recordType'
>

// Type alias for FunctionalClassification without server-managed fields
export interface DraftFunctionalClassification
  extends Omit<
    components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'],
    'acmgClassification' | 'id' | 'creationDate' | 'createdBy' | 'modificationDate' | 'modifiedBy' | 'recordType'
  > {
  acmgClassification: DraftAcmgClassification | components['schemas']['ACMGClassification'] | null
}

// Type alias for ScoreCalibration without server-managed fields
export interface DraftScoreCalibration
  extends Omit<
    components['schemas']['ScoreCalibration'],
    | 'urn'
    | 'scoreSetUrn'
    | 'functionalClassifications'
    | 'id'
    | 'scoreSetId'
    | 'creationDate'
    | 'createdBy'
    | 'modificationDate'
    | 'modifiedBy'
    | 'recordType'
  > {
  urn: string | null
  scoreSetUrn: string | null
  functionalClassifications: DraftFunctionalClassification[] | null
}

export default {
  name: 'CalibrationEditor',
  components: {
    InputText,
    PrimeButton,
    PrimeTextarea,
    ToggleSwitch,
    AutoComplete,
    FileUpload,
    FontAwesomeIcon,
    InputGroup,
    InputGroupAddon,
    InputNumber,
    SelectButton,
    Select
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
    classesDraftRef: {
      type: Object as PropType<{value: File | null}>,
      required: false,
      default: null
    },
    validationErrors: {
      type: Object as PropType<{[key: string]: string}>,
      required: false,
      default: () => ({})
    },
    allowClassBased: {
      type: Boolean,
      required: false,
      default: true
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

    // Class based tracking ref
    const classBased = ref(false)
    const draftClassesFile = ref<File | null>(null)

    // Helper to build a blank draft (create mode seed)
    const buildBlankDraft = (): DraftScoreCalibration => ({
      urn: props.calibrationUrn || null,
      scoreSetUrn: props.scoreSetUrn || null,
      title: '',
      notes: null,
      baselineScore: null,
      baselineScoreDescription: null,
      researchUseOnly: false,
      private: true,
      primary: false,
      investigatorProvided: true,
      functionalClassifications: [] as DraftFunctionalClassification[],
      thresholdSources: [] as components['schemas']['PublicationIdentifier'][],
      methodSources: [] as components['schemas']['PublicationIdentifier'][],
      classificationSources: [] as components['schemas']['PublicationIdentifier'][]
    })

    // Internal reactive draft calibration (object identity must remain stable)
    type DraftScoreCalibrationWithOriginal = DraftScoreCalibration & {
      __original: DraftScoreCalibration
    }
    const draftCalibrationBase = buildBlankDraft()
    const draftCalibration = reactive<DraftScoreCalibrationWithOriginal>({
      ...draftCalibrationBase,
      __original: cloneDeep(draftCalibrationBase)
    })

    // Maintain functional range helper information in a separate structure
    const functionalClassificationHelpers = ref<
      {
        infiniteLower: boolean | null
        infiniteUpper: boolean | null
        isProvidingOddspaths: boolean
        isProvidingClassification: boolean

        lastOddsPathState: number | null
        lastClassificationState: DraftAcmgClassification | null
        lastLowerInclusiveState: boolean | null
        lastUpperInclusiveState: boolean | null
        lastRangeState: (number | null)[] | null
        lastClassState: string | null
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

      if (draftCalibration.functionalClassifications == null) {
        draftCalibration.functionalClassifications = []
        classBased.value = false
      } else {
        classBased.value = data.functionalClassifications?.length
          ? draftCalibration.functionalClassifications.every((fr) => fr.class != null)
          : false
      }

      // functionalClassifications require helper flags; build each helper from functional range data
      if (data.functionalClassifications && draftCalibration.functionalClassifications) {
        draftCalibration.functionalClassifications.splice(0, draftCalibration.functionalClassifications.length)

        data.functionalClassifications.forEach((fr: DraftFunctionalClassification) => {
          const draftfunctionalClassification: DraftFunctionalClassification = {
            label: fr.label || '',
            description: fr.description || null,
            range: classBased.value ? null : fr.range || [null, null],
            class: classBased.value ? fr.class || null : null,
            inclusiveLowerBound: classBased.value ? null : (fr.inclusiveLowerBound ?? true),
            inclusiveUpperBound: classBased.value ? null : (fr.inclusiveUpperBound ?? true),
            functionalClassification: fr.functionalClassification || 'not_specified',
            acmgClassification: fr.acmgClassification || null,
            oddspathsRatio: fr.oddspathsRatio || null
          }

          if (draftCalibration.functionalClassifications == null) {
            draftCalibration.functionalClassifications = []
          }
          draftCalibration.functionalClassifications.push(draftfunctionalClassification)

          const functionalClassificationHelpersEntry = {
            infiniteLower: fr.range != null ? null : (fr.range != null && fr.range[0] == null) || false,
            infiniteUpper: fr.range != null ? null : (fr.range != null && fr.range[1] == null) || false,
            isProvidingOddspaths: fr.oddspathsRatio != null || false,
            isProvidingClassification: fr.acmgClassification != null || false,
            lastOddsPathState: fr.oddspathsRatio != null ? fr.oddspathsRatio : null,
            lastClassificationState: fr.acmgClassification != null ? fr.acmgClassification : null,
            lastLowerInclusiveState: classBased.value ? null : fr.inclusiveLowerBound ? fr.inclusiveLowerBound : null,
            lastUpperInclusiveState: classBased.value ? null : fr.inclusiveUpperBound ? fr.inclusiveUpperBound : null,
            lastRangeState: classBased.value
              ? null
              : fr.range != null
                ? [fr.range[0] != null ? fr.range[0] : null, fr.range[1] != null ? fr.range[1] : null]
                : null,
            lastClassState: classBased.value ? (fr.class != null ? fr.class : null) : null
          }
          functionalClassificationHelpers.value.push(functionalClassificationHelpersEntry)
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
      // Remove helper wrapper from comparison by mapping functionalClassifications -> values
      const snapshot = (dc: DraftScoreCalibration) => ({
        urn: dc.urn,
        scoreSetUrn: dc.scoreSetUrn,
        title: dc.title,
        notes: dc.notes,
        baselineScore: dc.baselineScore,
        baselineScoreDescription: dc.baselineScoreDescription,
        researchUseOnly: dc.researchUseOnly,
        functionalClassifications: dc.functionalClassifications,
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
    if (props.classesDraftRef) {
      // eslint-disable-next-line vue/no-mutating-props
      props.classesDraftRef.value = draftClassesFile
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
      draftClassesFile,
      isDirty,
      isValid,
      classBased,
      applyCalibrationData,
      loadCalibration,
      initCreateDraft,
      markChanged,
      recomputeMeta,
      functionalClassificationHelpers,
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
    },
    classBased: {
      handler(newValue: boolean) {
        if (!this.draft.functionalClassifications) {
          return
        }

        this.draft.functionalClassifications.forEach((fr, idx) => {
          if (!this.functionalClassificationHelpers[idx]) {
            return
          }

          // store current state
          let currentRangeState: (number | null)[] | null = null
          if (fr.range) {
            currentRangeState = [fr.range[0] != null ? fr.range[0] : null, fr.range[1] != null ? fr.range[1] : null]
          }
          let currentClassState: string | null = null
          if (fr.class) {
            currentClassState = fr.class
          }

          // apply switch
          fr.range = newValue
            ? null
            : this.functionalClassificationHelpers[idx].lastRangeState
              ? [
                  this.functionalClassificationHelpers[idx].lastRangeState[0],
                  this.functionalClassificationHelpers[idx].lastRangeState[1]
                ]
              : [null, null]
          fr.class = newValue ? this.functionalClassificationHelpers[idx].lastClassState : null

          // update helper tracking
          this.functionalClassificationHelpers[idx].lastRangeState = currentRangeState
          this.functionalClassificationHelpers[idx].lastClassState = currentClassState
        })
      }
    }
  },
  mounted: async function () {
    await this.loadEditableScoreSets()
  },
  methods: {
    onClassesFileUpload: function (event: {files: File[]}) {
      // parent component will handle the file upload via the ref
      this.draftClassesFile = event.files[0] || null
    },
    onClassesFileClear: function () {
      this.draftClassesFile = null
    },
    loadEditableScoreSets: async function () {
      try {
        const response = await axios.post(`${config.apiBaseUrl}/me/score-sets/search`, {
          metaAnalysis: false,
          includeExperimentScoreSetUrnsAndCount: false
        })
        this.editableScoreSets = response.data.scoreSets || []
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

    acceptNewPublicationIdentifier: function (
      publicationList: components['schemas']['PublicationIdentifier'][] | null | undefined
    ) {
      if (!publicationList) {
        return
      }

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
      // @ts-expect-error access of unknown ref
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

    addfunctionalClassification: function () {
      if (!this.draft.functionalClassifications) {
        this.draft.functionalClassifications = []
      }

      this.draft.functionalClassifications.push({
        label: '',
        description: '',
        range: this.classBased ? null : [null, null],
        class: null,

        inclusiveLowerBound: this.classBased ? null : true,
        inclusiveUpperBound: this.classBased ? null : false,
        functionalClassification: 'not_specified',
        acmgClassification: null,
        oddspathsRatio: null
      })

      this.functionalClassificationHelpers.push({
        infiniteLower: false,
        infiniteUpper: false,
        isProvidingOddspaths: false,
        isProvidingClassification: false,
        lastOddsPathState: null,
        lastClassificationState: null,
        lastLowerInclusiveState: true,
        lastUpperInclusiveState: false,
        lastRangeState: this.classBased ? null : [null, null],
        lastClassState: null
      })
      this.recomputeMeta()
    },

    toggleBoundary: function (rangeIdx: number, boundType: 'lower' | 'upper') {
      if (!this.draft.functionalClassifications) return

      const rangeObj = this.draft.functionalClassifications[rangeIdx]
      if (!rangeObj) return
      if (boundType === 'lower') {
        rangeObj.inclusiveLowerBound = !rangeObj.inclusiveLowerBound
      } else if (boundType === 'upper') {
        rangeObj.inclusiveUpperBound = !rangeObj.inclusiveUpperBound
      }
    },

    toggleInfinity: function (rangeIdx: number, boundType: 'lower' | 'upper') {
      if (!this.draft.functionalClassifications) return

      const rangeObj = this.draft.functionalClassifications[rangeIdx]
      const rangeHelper = this.functionalClassificationHelpers[rangeIdx]
      if (!rangeObj) return

      if (boundType === 'lower') {
        rangeHelper.infiniteLower = !rangeHelper.infiniteLower
        if (rangeHelper.infiniteLower && rangeObj.range) {
          rangeObj.range[0] = null
          rangeHelper.lastLowerInclusiveState =
            rangeObj.inclusiveLowerBound != null ? rangeObj.inclusiveLowerBound : null
          rangeObj.inclusiveLowerBound = false
        } else {
          rangeObj.inclusiveLowerBound = rangeHelper.lastLowerInclusiveState
        }
      } else if (boundType === 'upper') {
        rangeHelper.infiniteUpper = !rangeHelper.infiniteUpper
        if (rangeHelper.infiniteUpper && rangeObj.range) {
          rangeObj.range[1] = null
          rangeHelper.lastUpperInclusiveState =
            rangeObj.inclusiveUpperBound != null ? rangeObj.inclusiveUpperBound : null
          rangeObj.inclusiveUpperBound = false
        } else {
          rangeObj.inclusiveUpperBound = rangeHelper.lastUpperInclusiveState
        }
      }
    },

    updateClassificationValuesBasedOnRangeInformation: function (rangeIdx: number) {
      if (!this.draft.functionalClassifications) return

      const rangeObj = this.draft.functionalClassifications[rangeIdx]
      const rangeHelper = this.functionalClassificationHelpers[rangeIdx]
      if (!rangeObj) return
      if (!rangeObj.functionalClassification || rangeObj.functionalClassification === 'not_specified') {
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
            rangeObj.functionalClassification === 'normal'
              ? BENIGN_CRITERION
              : rangeObj.functionalClassification === 'abnormal'
                ? PATHOGENIC_CRITERION
                : null,
          evidenceStrength: rangeHelper.lastClassificationState?.evidenceStrength
            ? rangeHelper.lastClassificationState.evidenceStrength
            : null
        }
      }
    },

    removefunctionalClassification: function (rangeIdx: number) {
      if (!this.draft.functionalClassifications) return

      this.draft.functionalClassifications.splice(rangeIdx, 1)
      this.functionalClassificationHelpers.splice(rangeIdx, 1)
      this.recomputeMeta()
    },

    removePublicationIdentifier: function (val: PublicationIdentifier, publicationList: PublicationIdentifier[]) {
      const removedIdentifier = val.identifier
      const publicationIdx = publicationList.findIndex((pub) => pub.identifier == removedIdentifier)
      if (publicationIdx != -1) {
        publicationList.splice(publicationIdx, 1)
      }
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
        // Reset functionalClassifications and their helpers
        if (!this.draft.functionalClassifications) {
          this.draft.functionalClassifications = []
        }
        this.draft.functionalClassifications.splice(0, this.draft.functionalClassifications?.length)
        this.functionalClassificationHelpers.splice(0, this.functionalClassificationHelpers.length)

        if (original.functionalClassifications) {
          original.functionalClassifications.forEach((fr: DraftFunctionalClassification) => {
            if (this.draft.functionalClassifications == null) {
              this.draft.functionalClassifications = []
            }

            this.draft.functionalClassifications.push(fr)
            const functionalClassificationHelpersEntry = {
              infiniteLower: fr.range != null ? null : (fr.range != null && fr.range[0] == null) || false,
              infiniteUpper: fr.range != null ? null : (fr.range != null && fr.range[1] == null) || false,
              isProvidingOddspaths: fr.oddspathsRatio != null || false,
              isProvidingClassification: fr.acmgClassification != null || false,
              lastOddsPathState: fr.oddspathsRatio != null ? fr.oddspathsRatio : null,
              lastClassificationState: fr.acmgClassification != null ? fr.acmgClassification : null,
              lastLowerInclusiveState: fr.inclusiveLowerBound != null ? fr.inclusiveLowerBound : null,
              lastUpperInclusiveState: fr.inclusiveUpperBound != null ? fr.inclusiveUpperBound : null,
              lastRangeState: fr.range != null ? fr.range : null,
              lastClassState: fr.class != null ? fr.class : null
            }
            this.functionalClassificationHelpers.push(functionalClassificationHelpersEntry)
          })
        }

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
.p-toggleswitch {
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
