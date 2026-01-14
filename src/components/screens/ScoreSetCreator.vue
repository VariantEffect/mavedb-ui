<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit a score set. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <DefaultLayout :require-auth="true">
    <div class="mave-score-set-editor">
      <div class="mave-screen-title-bar">
        <div class="mave-screen-title">Create a new score set</div>
        <div class="mavedb-screen-title-controls">
          <Button severity="help" @click="resetForm">Clear</Button>
          <Button severity="warn" @click="backDashboard">Cancel</Button>
        </div>
      </div>
      <div class="mavedb-wizard">
        <Stepper v-model:value="activeWizardStep">
          <StepList>
            <Step :value="1">Parent experiment and context</Step>
            <Step :disabled="maxWizardStepValidated < 1" :value="2">Score set information</Step>
            <Step :disabled="maxWizardStepValidated < 2" :value="3">Targets</Step>
            <Step
              v-for="(targetNum, targetIdx) in numTargets"
              :key="targetIdx"
              :disabled="maxWizardStepValidated < targetIdx + 3"
              :value="targetIdx + 4"
              >Target {{ targetIdx + 1 }}</Step
            >
            <Step :disabled="maxWizardStepValidated < numTargets + 3" :value="numTargets + 4">Score Calibration</Step>
            <Step :disabled="maxWizardStepValidated < numTargets + 4" :value="numTargets + 5">Variant Scores</Step>
          </StepList>
          <StepPanels>
            <StepPanel v-slot="{activateCallback}" :value="1">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-if="experimentUrn && experiment">
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-experiment')"> Experiment: {{ experimentUrn }} </label>
                      <div class="mavedb-help-small">
                        To add a score set to a different experiment, supercede a score set or add a score set to
                        meta-analysis, please navigate to "New score set". For more on the relationship between score
                        sets and experiments, see the
                        <a :href="`${config.appBaseUrl}/docs/mavedb/record_types.html#record-types`" target="_blank"
                          >documentation</a
                        >.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      Experiment title:
                      <router-link :to="{name: 'experiment', params: {urn: experimentUrn}}">
                        {{ experiment.title }}
                      </router-link>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-superseding-score-set-label')">
                        Does this score set correct errors in and replace a score set previously published on MaveDB
                        that you created?
                      </label>
                    </div>
                    <div class="mavedb-wizard-content flex items-center">
                      <ToggleSwitch
                        v-model="isSupersedingScoreSet"
                        :aria-labelledby="scopedId('input-superseding-score-set-label')"
                      />
                      <div class="mavedb-switch-value">
                        {{
                          isSupersedingScoreSet
                            ? 'Yes, this supersedes another score set'
                            : 'No, this does not supersede another score set'
                        }}
                      </div>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-is-meta-analysis-label')">Is this score set a meta-analysis?</label>
                      <div class="mavedb-help-small">
                        Meta-analyses are score sets derived from data in other score sets that were created by you or
                        other users. For example:
                        <ul class="list-disc ml-5">
                          <li>a score set that combines data from two other score sets to produce new scores, or</li>
                          <li>a score set that adds imputed missing values to the scores in another score set.</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mavedb-wizard-content flex items-center">
                      <ToggleSwitch
                        v-model="isMetaAnalysis"
                        :aria-labelledby="scopedId('input-is-meta-analysis-label')"
                      />
                      <div class="mavedb-switch-value">
                        {{ isMetaAnalysis ? 'Yes, this is a meta-analysis' : 'No, this is not a meta-analysis' }}
                      </div>
                    </div>
                  </div>
                  <div v-if="!isSupersedingScoreSet && !isMetaAnalysis" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      To which experiment does this score set belong?
                      <div class="mavedb-help-small">
                        For more on the relationship between score sets and experiments, see the
                        <a :href="`${config.appBaseUrl}/docs/mavedb/record_types.html#record-types`" target="_blank"
                          >documentation</a
                        >.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div style="position: relative">
                        <FloatLabel variant="on">
                          <Select
                            :id="scopedId('input-experiment')"
                            ref="experimentInput"
                            v-model="experiment"
                            filter
                            option-label="title"
                            :options="editableExperiments"
                            style="width: 100%"
                            :virtual-scroller-options="{itemSize: 50}"
                            @change="populateExperimentMetadata"
                          >
                            <template #option="slotProps">
                              {{ slotProps.option.urn }}: {{ slotProps.option.title }}
                            </template>
                            <template #empty>
                              <div style="padding: 10px; text-align: center">No experiments found.</div>
                            </template>
                          </Select>
                          <label :for="scopedId('input-experiment')">Experiment</label>
                        </FloatLabel>
                        <span v-if="validationErrors.experiment" class="mave-field-error">{{
                          validationErrors.experiment
                        }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="isSupersedingScoreSet" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      What score set does this supersede?
                      <div class="mavedb-help-small">
                        Type the superseded score set's MaveDB URN here and select it from the list.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div class="field">
                        <FloatLabel variant="on">
                          <AutoComplete
                            :id="scopedId('input-supersededScoreSet')"
                            ref="supersededScoreSetInput"
                            v-model="supersededScoreSet"
                            field="title"
                            :force-selection="true"
                            :loading="supersededScoreSetSuggestionsLoading"
                            option-label="title"
                            :suggestions="supersededScoreSetSuggestionsList"
                            @change="populateSupersededScoreSetMetadata"
                            @complete="searchSupersededScoreSets"
                            @option-select="populateSupersededScoreSetMetadata"
                          >
                            <template #option="slotProps">
                              <div v-if="slotProps.option.urn && slotProps.option.title">
                                {{ slotProps.option.urn }}: {{ slotProps.option.title }}
                              </div>
                            </template>
                          </AutoComplete>
                          <label :for="scopedId('input-supersededScoreSet')">Supersedes</label>
                        </FloatLabel>
                        <span v-if="validationErrors.supersededScoreSetUrn" class="mave-field-error">{{
                          validationErrors.supersededScoreSetUrn
                        }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="isMetaAnalysis" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      What score set(s) does this score set analyze?
                      <div class="mavedb-help-small">
                        Type a score set's MaveDB URN here and select it from the list. You may choose more than one
                        score set.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div class="field">
                        <FloatLabel variant="on">
                          <AutoComplete
                            :id="scopedId('input-metaAnalyzesScoreSets')"
                            ref="metaAnalyzesScoreSetsInput"
                            v-model="metaAnalyzesScoreSets"
                            field="title"
                            :force-selection="true"
                            :multiple="true"
                            :suggestions="metaAnalyzesScoreSetSuggestionsList"
                            @complete="searchMetaAnalyzesScoreSets"
                          >
                            <template #item="slotProps">
                              {{ slotProps.item.urn }}: {{ slotProps.item.title }}
                            </template>
                          </AutoComplete>
                          <label :for="scopedId('input-metaAnalyzesScoreSets')">Meta-analysis for</label>
                        </FloatLabel>
                        <span v-if="validationErrors.metaAnalyzesScoreSetUrns" class="mave-field-error">{{
                          validationErrors.metaAnalyzesScoreSetUrns
                        }}</span>
                      </div>
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
            <StepPanel v-slot="{activateCallback}" :value="2">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-if="experiment" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-content-pane">
                    <Message class="mb-1 mt-1" closable severity="info">
                      Some fields were autopopulated based on the selected experiment and should be inspected to ensure
                      they are still relevant to this score set.
                    </Message>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label
                      >A short title for the score set, to be displayed at the top of the score set's own page.</label
                    >
                    <div class="mavedb-help-small">
                      Examples: CBS low-B6 imputed and refined, NUDT15 protein stability assay, Arrestin-1 binding,
                      SpCas9 positive selection
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
                      A high-level description of the score set in one or two sentences, to be displayed in search
                      results.
                    </label>
                    <div class="mavedb-help-small">
                      Example: A Deep Mutational Scan of the human cystathionine-beta-synthase (CBS) using functional
                      complementation in yeast via DMS-TileSeq at low levels of Vitamin B6.
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
                    <label> The motivation for and approach of the score set. </label>
                    <div class="mavedb-help-small">
                      May be formatted using
                      <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. It is
                      common for a score set to have the same abstract text as the experiment that it belongs to. The
                      focus should be on the MAVE data, rather than the full research contribution, so use your
                      judgement when deciding what details are relevant.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <Tabs value="0">
                      <TabList>
                        <Tab value="0">Edit</Tab>
                        <Tab value="1">Preview</Tab>
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
                        <template v-if="isMetaAnalysis">
                          <li>
                            a description of how the scores in this score set were generated from the data in the
                            analyzed score sets, and
                          </li>
                        </template>
                        <template v-else>
                          <li>
                            a description of how scores were generated from raw data, including any normalization,
                          </li>
                          <li>the sequence read filtering approach used,</li>
                          <li>details of how replicates were combined (if applicable), and</li>
                        </template>
                        <li>
                          a description of any additional data columns included in the score and count tables, including
                          column naming conventions.
                        </li>
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
                <div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        The license under which the data in the score set is made available to the public.
                      </label>
                      <div class="mavedb-help-small">
                        For more on data licensing in MaveDB, see the
                        <a :href="`${config.appBaseUrl}/docs/mavedb/data_licensing.html#data-licensing`" target="_blank"
                          >documentation</a
                        >.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <FloatLabel variant="on">
                        <Select
                          :id="scopedId('input-targetLicenseId')"
                          v-model="licenseId"
                          option-label="longName"
                          option-value="id"
                          :options="licenses"
                          style="min-width: 500px"
                        />
                        <label :for="scopedId('input-targetLicenseId')">License</label>
                      </FloatLabel>
                      <Message
                        v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName != 'CC0'"
                        closable
                        severity="warn"
                      >
                        Choosing a license with these restrictions may cause your score set to be excluded from data
                        federation and aggregation by MaveDB collaborators.
                      </Message>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      Would you like to define any additional restrictions governing the usage of data within this score
                      set?
                    </div>
                    <div class="mavedb-wizard-content flex items-center">
                      <ToggleSwitch
                        v-model="hasCustomUsagePolicy"
                        :aria-labelledby="scopedId('input-has-custom-usage-policy')"
                      />
                      <div class="mavedb-switch-value">
                        {{
                          hasCustomUsagePolicy
                            ? 'Yes, I would like to define additional usage guidelines'
                            : 'No, I do not need to define additional usage guidenlines'
                        }}
                      </div>
                    </div>
                  </div>
                  <div v-if="hasCustomUsagePolicy" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label> Any additional guidelines governing the usage of the data in this score set. </label>
                      <div class="mavedb-help-small">
                        This may assert, for example, the original author's right to publish the data first.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <FloatLabel variant="on">
                        <Textarea :id="scopedId('input-dataUsagePolicy')" v-model="dataUsagePolicy" rows="4" />
                        <label :for="scopedId('input-dataUsagePolicy')">Data usage guidelines</label>
                      </FloatLabel>
                      <span v-if="validationErrors.dataUsagePolicy" class="mave-field-error">{{
                        validationErrors.dataUsagePolicy
                      }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Contributors who may edit this score set. Enter each contributor's
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
                          :option-label="
                            (x) =>
                              x.givenName || x.familyName ? `${x.givenName} ${x.familyName} (${x.orcidId})` : x.orcidId
                          "
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
                      <label :id="scopedId('input-doiIdentifiers')">
                        The DOIs of any digital resources associated with the score set.
                      </label>
                      <div class="mavedb-help-small">
                        Please note: If you would like to associate publications with this score set via their DOI,
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
                        <label :for="scopedId('input-doiIdentifiers')">DOI identifiers</label>
                      </FloatLabel>
                      <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{
                        validationErrors.doiIdentifiers
                      }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Any publications associated with the score set. You can search for publications to add by DOI,
                        PubMed ID, bioRxiv ID, or medRxiv ID.
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
                          ref="primaryPublicationIdentifiersInput"
                          v-model="primaryPublicationIdentifiers"
                          class="p-inputwrapper-filled"
                          option-label="identifier"
                          :options="publicationIdentifiers"
                          placeholder="Select a primary publication (Where the dataset is described)"
                          :selection-limit="1"
                          style="width: 100%"
                        >
                          <template #option="slotProps">
                            <div class="field">
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
                      <label> Any additional metadata about the score set, as a JSON file. </label>
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
                            <p>Upload a JSON file here.</p>
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
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back"
                    severity="secondary"
                    @click="activateCallback(activeWizardStep - 1)"
                  />
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
            <StepPanel v-slot="{activateCallback}" :value="3">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-scoreSetIsSequenceBasedLabel')"
                      >Will you be uploading the target sequences used for your assay?</label
                    >
                    <div class="mavedb-help-small">
                      The target sequence is the sequence that was mutagenized to create the variant library, such as in
                      a cDNA-based deep mutational scan. If your variants were generated by editing the genome directly
                      (e.g., using saturation genome editing or base editing), you should provide an Ensembl or RefSeq
                      accession instead of uploading the target locus sequence as your own target.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content flex items-center">
                    <ToggleSwitch
                      v-model="isTargetSequence"
                      :aria-labelledby="scopedId('input-scoreSetIsSequenceBasedLabel')"
                    />
                    <div class="mavedb-switch-value">
                      {{
                        isTargetSequence
                          ? 'Yes, variants are described relative to a target sequence.'
                          : 'No, variants are described relative to a RefSeq or Ensembl accession (either a transcript or chromosome).'
                      }}
                    </div>
                  </div>
                </div>

                <div v-if="!isTargetSequence" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-isBaseEditorData')"
                      >Does this score set reperesent base editor data?</label
                    >
                    <div class="mavedb-help-small">
                      Base editor data is a type of functional assay that is similar in many respects to MAVE data. When
                      uploading base editor data, you must also include a 'guide_sequence' column in your uploaded
                      scores (and counts) file(s).
                    </div>
                  </div>
                  <div class="mavedb-wizard-content flex items-center">
                    <ToggleSwitch v-model="isBaseEditor" :aria-labelledby="scopedId('input-isBaseEditorData')" />
                    <div class="mavedb-switch-value">
                      {{
                        isBaseEditor
                          ? 'Yes, this score set represents base editor data.'
                          : 'No, this score set does not represent base editor data.'
                      }}
                    </div>
                  </div>
                </div>

                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-scoreSetHasMultipleTargetsLabel')"
                      >Does this score set describe variants with respect to more than one target?</label
                    >
                    <div class="mavedb-help-small">
                      Some experiments might describe variants against two or more distinct target sequences. If this is
                      the case, your variants will need to be described explicitly from the target they came from.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content flex items-center">
                    <ToggleSwitch
                      v-model="isMultiTarget"
                      :aria-labelledby="scopedId('input-scoreSetHasMultipleTargetsLabel')"
                    />
                    <div class="mavedb-switch-value">
                      {{
                        isMultiTarget
                          ? 'Yes, variants are described relative to multiple target sequences.'
                          : 'No, variants are described relative to a single target sequence.'
                      }}
                    </div>
                  </div>
                </div>

                <div v-if="isMultiTarget" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>How many targets will be included with this score set?</label>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <InputNumber
                        :id="scopedId(`input-numTargets`)"
                        v-model="numTargets"
                        button-layout="stacked"
                        :min="isMultiTarget ? 2 : 1"
                        show-buttons
                        suffix=" targets"
                      />
                      <label :for="scopedId(`input-numTargets`)">Targets</label>
                    </FloatLabel>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back"
                    severity="secondary"
                    @click="activateCallback(activeWizardStep - 1)"
                  />
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
            <StepPanel
              v-for="(targetNum, targetIdx) in numTargets"
              v-slot="{activateCallback}"
              :key="targetIdx"
              :value="targetIdx + 4"
            >
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-if="isTargetSequence" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>Copy target from a previously created target</label>
                    <div class="mavedb-help-small">
                      Use this autocomplete field to find an existing target from one of your published or unpublished
                      score sets in MaveDB and fill this target with its metadata. You'll still be able to edit any
                      fields below.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <AutoComplete
                        :id="scopedId('input-existingTargetGene')"
                        ref="existingTargetGeneInput"
                        v-model="createdTargetGenes[targetIdx].autofilledTargetGene"
                        field="name"
                        :force-selection="true"
                        option-label="name"
                        :suggestions="targetGeneSuggestionsList"
                        @complete="searchTargetGenes"
                        @option-select="autofillFromExistingTarget($event, targetIdx)"
                      >
                        <template #option="slotProps">
                          <div>
                            <div>Name: {{ slotProps.option.name }}</div>
                            <div>Category: {{ textForTargetGeneCategory(slotProps.option.category) }}</div>
                            <div
                              v-for="externalIdentifier of slotProps.option.externalIdentifiers"
                              :key="externalIdentifier.identifier"
                            >
                              {{ externalIdentifier.identifier.dbName }}:
                              {{ externalIdentifier.identifier.identifier }}, Offset: {{ externalIdentifier.offset }}
                            </div>
                          </div>
                        </template>
                      </AutoComplete>
                      <label :for="scopedId('input-existingTargetGene')">Copy from an existing target</label>
                    </FloatLabel>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>The name of the target</label>
                    <div class="mavedb-help-small">
                      This name will be used to identify the target on the score set page and can be used to autofill
                      from this target in the future. Most users choose to name this target after the associated gene,
                      if applicable.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <FloatLabel variant="on">
                      <InputText
                        :id="scopedId('input-targetGeneName')"
                        v-model="createdTargetGenes[targetIdx].targetGene.name"
                        style="width: 100%"
                      />
                      <label :for="scopedId('input-targetGeneName')">Target name</label>
                    </FloatLabel>
                    <span
                      v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.name`]"
                      class="mave-field-error"
                      >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.name`] }}</span
                    >
                  </div>
                </div>

                <div v-if="isTargetSequence">
                  <div v-if="numTargets > 1" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>The label of the target</label>
                      <div class="mavedb-help-small">
                        This label is what you use in your variants file to indicate which of your targets the variant
                        is described relative to. Because it is used with MAVE-HGVS strings, it may not contain any
                        spaces or colons.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <FloatLabel variant="on">
                        <InputText
                          :id="scopedId('input-targetGeneLabel')"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.label"
                          style="width: 100%"
                        />
                        <label :for="scopedId('input-targetGeneLabel')">Target label</label>
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.label`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.label`] }}</span
                      >
                    </div>
                  </div>

                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneCategory')">The functional category of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span>
                        <SelectButton
                          :id="scopedId('input-targetGeneCategory')"
                          v-model="createdTargetGenes[targetIdx].targetGene.category"
                          :option-label="textForTargetGeneCategory"
                          :options="targetGeneCategories"
                        />
                      </span>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.category`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.category`] }}</span
                      >
                    </div>
                  </div>

                  <div v-for="dbName of externalGeneDatabases" :key="dbName" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId(`input-targetGeneExternalDatabase${dbName}Label`)"
                        >Link this target to a {{ dbName }} accession</label
                      >
                      <!-- only display this verbose help on the first of the external gene database selections. -->
                      <div v-if="dbName === externalGeneDatabases[0]" class="mavedb-help-small">
                        If the target sequence provided to MaveDB starts partway through the linked sequence (such as an
                        assay targeting a single functional domain), the target should also have an “offset”. The offset
                        is the integer value that should be added to the MaveDB coordinates (which are relative to the
                        target sequence) in order to match the coordinates in the linked sequence.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content flex items-center">
                      <ToggleSwitch
                        v-model="createdTargetGenes[targetIdx].linkedAccessions[dbName]"
                        :aria-labelledby="scopedId(`input-targetGeneExternalDatabase${dbName}Label`)"
                      />
                      <div class="mavedb-switch-value">
                        {{
                          createdTargetGenes[targetIdx].linkedAccessions[dbName]
                            ? `Yes, link this target to a ${dbName} accession.`
                            : `No, do not link this target to a ${dbName} accession.`
                        }}
                      </div>
                      <div
                        v-if="createdTargetGenes[targetIdx].linkedAccessions[dbName]"
                        class="mavedb-wizard-subcontent field-columns"
                      >
                        <div class="field-column">
                          <FloatLabel variant="on">
                            <AutoComplete
                              :id="scopedId(`input-${dbName.toLowerCase()}Identifier`)"
                              v-model="createdTargetGenes[targetIdx].targetGene.externalIdentifiers[dbName].identifier"
                              class="w-full"
                              field="identifier"
                              :force-selection="false"
                              option-label="identifier"
                              :suggestions="targetGeneIdentifierSuggestionsList[dbName]"
                              @change="externalTargetIdentifierChanged(dbName, targetIdx, $event)"
                              @complete="searchTargetGeneIdentifiers(dbName, $event)"
                            />
                            <label :for="scopedId(`input-${dbName.toLowerCase()}Identifier`)"
                              >{{ dbName }} identifier</label
                            >
                          </FloatLabel>
                          <span
                            v-if="
                              validationErrors[
                                `targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}.identifier.identifier`
                              ]
                            "
                            class="mave-field-error"
                            >{{
                              validationErrors[
                                `targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}.identifier.identifier`
                              ]
                            }}</span
                          >
                        </div>
                        <div class="field-column">
                          <FloatLabel variant="on">
                            <InputNumber
                              :id="scopedId(`input-${dbName.toLowerCase()}Offset`)"
                              v-model="createdTargetGenes[targetIdx].targetGene.externalIdentifiers[dbName].offset"
                              button-layout="stacked"
                              :min="0"
                              show-buttons
                              suffix=" bp"
                            />
                            <label :for="scopedId(`input-${dbName.toLowerCase()}Offset`)">Offset</label>
                          </FloatLabel>
                          <span
                            v-if="
                              validationErrors[
                                `targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}.offset`
                              ]
                            "
                            class="mave-field-error"
                            >{{
                              validationErrors[
                                `targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}.offset`
                              ]
                            }}</span
                          >
                        </div>
                      </div>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}`]"
                        class="mave-field-error"
                        >{{
                          validationErrors[`targetGenes.${targetIdx}.targetGene.externalIdentifiers.${dbName}`]
                        }}</span
                      >
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneTaxonomyLabel')"
                        >The taxonomy group to which this target belongs</label
                      >
                      <div class="mavedb-help-small">
                        For more details about taxonomy, see the
                        <a href="https://www.ncbi.nlm.nih.gov/books/NBK53758/" target="_blank"
                          >NCBI taxonomy help page.</a
                        >
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <AutoComplete
                          :id="scopedId('input-targetGeneTaxonomyLabel')"
                          ref="taxonomyInput"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.taxonomy"
                          dropdown
                          field="organismName"
                          force-selection
                          :multiple="false"
                          option-label="organismName"
                          :options="taxonomies"
                          style="width: 100%"
                          :suggestions="taxonomySuggestionsList"
                          @complete="searchTaxonomies"
                          @keyup.escape="clearTaxonomySearch"
                        >
                          <template #option="slotProps">
                            {{ slotProps.option.code }} - {{ slotProps.option.organismName }}
                            <template
                              v-if="slotProps.option.commonName !== 'NULL' && slotProps.option.commonName !== null"
                              >/ {{ slotProps.option.commonName }}</template
                            >
                          </template>
                        </AutoComplete>
                        <label :for="scopedId('input-targetGeneTaxonomyLabel')">Taxonomy</label>
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.taxonomy`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.taxonomy`] }}</span
                      >
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneSequenceTypeLabel')">The sequence type of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <SelectButton
                          :id="scopedId('input-targetGeneSequenceType')"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.sequenceType"
                          :options="sequenceTypes"
                        />
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequenceType`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequenceType`] }}</span
                      >
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneSequenceFileLabel')">The sequence of the target</label>
                      <div class="mavedb-help-small">
                        Variants will be validated against this sequence. Note that the first position in the sequence
                        is numbered as position 1 when validating variants.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <FileUpload
                          :id="scopedId('input-targetGeneSequenceFileLabel')"
                          ref="sequenceFileUpload"
                          :auto="false"
                          choose-label="Reference sequence"
                          :class="inputClasses.targetGeneTargetSequenceSequenceFile"
                          :custom-upload="true"
                          :file-limit="1"
                          :show-cancel-button="false"
                          :show-upload-button="false"
                          @remove="fileCleared('targetGeneTargetSequenceSequenceFile', targetIdx)"
                          @select="fileSelected('targetGeneTargetSequenceSequenceFile', $event, targetIdx)"
                        >
                          <template #empty>
                            <div v-if="createdTargetGenes[targetIdx].targetGene.targetSequence.sequence != null">
                              <Textarea
                                v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.sequence"
                                disabled
                                rows="5"
                                style="width: 100%; max-width: 60em; word-wrap: break-word; font-family: monospace"
                              />
                              <small
                                >This sequence was set by the autofilled target. To use a different sequence, upload a
                                new FASTA file.</small
                              >
                            </div>
                            <div v-else>
                              <p>
                                Drop a
                                <a href="https://blast.ncbi.nlm.nih.gov/doc/blast-topics/#fasta" target="_blank"
                                  >FASTA</a
                                >
                                file here
                              </p>
                            </div>
                          </template>
                        </FileUpload>
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`] }}</span
                      >
                    </div>
                  </div>
                </div>
                <div v-else>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetDescribesChromosomeLabel')"
                        >Does this target represent a whole chromosome?</label
                      >
                      <div class="mavedb-help-small">
                        Some score sets might describe variants relative to an entire chromosome, while others will
                        describe variants relative to a RefSeq or Ensembl accession representing a gene.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content flex items-center">
                      <ToggleSwitch
                        v-model="createdTargetGenes[targetIdx].isRelativeToChromosome"
                        :aria-labelledby="scopedId('input-targetDescribesChromosomeLabel')"
                        @change="refreshAccessionOptions(targetIdx)"
                      />
                      <div class="mavedb-switch-value">
                        {{
                          createdTargetGenes[targetIdx].isRelativeToChromosome
                            ? 'Yes, this target represents an entire chromosome.'
                            : 'No, this target represents a gene.'
                        }}
                      </div>
                    </div>
                  </div>
                  <div v-if="createdTargetGenes[targetIdx].isRelativeToChromosome" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneAssemblyLabel')">The assembly for this accession</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <!-- Assembly is the reference genome property in coordinate cases -->
                        <Select
                          v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.assembly"
                          :aria-labelledby="scopedId('input-targetGeneAssemblyLabel')"
                          :options="assemblies"
                          style="width: 100%"
                          @change="refreshAccessionOptions(targetIdx)"
                        />
                        <label :for="scopedId('input-targetGeneAssemblyLabel')">Assembly</label>
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.assembly`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.assembly`] }}</span
                      >
                    </div>
                  </div>
                  <div v-else class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneGeneNameLabel')">The gene name for this accession</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <Select
                          :id="scopedId('input-targetGeneGeneNameLabel')"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.gene"
                          filter
                          option-label="name"
                          :options="geneNamesAsObject"
                          style="width: 100%"
                          :virtual-scroller-options="{itemSize: 50}"
                          @change="autofillGeneName($event, targetIdx)"
                        />
                        <label :for="scopedId('input-targetGeneGeneNameLabel')">HGNC Name</label>
                      </FloatLabel>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.gene`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.gene`] }}</span
                      >
                    </div>
                  </div>

                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneAccessionLabel')"
                        >The accession identifier for this target</label
                      >
                      <div class="mavedb-help-small">
                        This will be the sequence that your variants are described against. It may be a RefSeq or
                        Ensemble identifier. Available accessions matching the
                        {{ createdTargetGenes[targetIdx].isRelativeToChromosome ? 'assembly' : 'gene name' }} will be
                        displayed once one is selected.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <FloatLabel variant="on">
                        <AutoComplete
                          :id="scopedId('input-targetGeneAccessionLabel')"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.accession"
                          :dropdown="true"
                          :force-selection="true"
                          style="width: 100%"
                          :suggestions="accessionSuggestions"
                          @complete="fetchTargetAccessions($event)"
                        />
                        <label :for="scopedId('input-targetGeneAccessionLabel')"> Accession Identifier </label>
                      </FloatLabel>
                      <div v-if="showSwitchToProteinAccessionButton(targetIdx)" class="mavedb-wizard-subcontent">
                        <Button
                          icon="pi pi-arrows-h"
                          label="Switch to Protein Accession"
                          severity="info"
                          @click="swapNucleotideProteinAccessions(targetIdx)"
                        />
                      </div>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.accession`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.targetAccession.accession`] }}</span
                      >
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="scopedId('input-targetGeneCategoryLabel')">The genetic category of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span>
                        <SelectButton
                          :id="scopedId('input-targetGeneCategoryLabel')"
                          v-model="createdTargetGenes[targetIdx].targetGene.category"
                          :option-label="textForTargetGeneCategory"
                          :options="targetGeneCategories"
                        />
                      </span>
                      <span
                        v-if="validationErrors[`targetGenes.${targetIdx}.targetGene.category`]"
                        class="mave-field-error"
                        >{{ validationErrors[`targetGenes.${targetIdx}.targetGene.category`] }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back"
                    severity="secondary"
                    @click="activateCallback(activeWizardStep - 1)"
                  />
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
            <StepPanel v-slot="{activateCallback}" :value="numTargets + 4">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-investigatorIsProvidingScoreCalibrations')"
                      >Will you be providing score calibrations for this score set?</label
                    >
                    <div class="mavedb-help-small">
                      Score calibrations provide additional clinical context to the scores you upload. If you provide
                      score calibrations, you may classify each range as having either normal, abnormal, or an
                      unspecified function. If you provide a range with normal function, you should also provide a
                      baseline score that falls within the normal range. This score is the expected score for baseline
                      variants.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content flex items-center">
                    <ToggleSwitch
                      v-model="investigatorIsProvidingScoreCalibrations"
                      :aria-labelledby="scopedId('input-investigatorIsProvidingScoreCalibrations')"
                    />
                    <div class="mavedb-switch-value">
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
                    :allow-class-based="false"
                    :calibration-draft-ref="calibrationCreateDraft"
                    :validation-errors="calibrationValidationErrors || {}"
                  />
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-5">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back"
                    severity="secondary"
                    @click="activateCallback(activeWizardStep - 1)"
                  />
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
            <StepPanel v-slot="{activateCallback}" :value="numTargets + 5">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-content">
                    <Message v-if="createdTargetGenes[0]?.targetAccession?.accession" closable severity="info">
                      When defining variants against an accession based target, uploaded variant coordinates should be
                      fully qualified with respect to target names or target accessions (e.g: NC_000001.1:c.1A>C).
                    </Message>
                    <Message v-else-if="numTargets > 1" closable severity="info">
                      When defining variants against multiple targets, uploaded variant coordinates should be fully
                      qualified with respect to target names or target accessions.
                    </Message>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <div>
                      <label :id="scopedId('input-scoresFile')">Load a scores file</label>
                    </div>
                    <div class="mavedb-help-small">
                      This file is required and should be a CSV file, with each row of the table describing a single
                      variant. For more information about what this file can include and how it should be formatted,
                      please take a look at
                      <a :href="`${config.appBaseUrl}/docs/mavedb/data_formats.html#data-table-formats`" target="_blank"
                        >our documentation</a
                      >.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <FloatLabel variant="on">
                      <FileUpload
                        :id="scopedId('input-scoresFile')"
                        ref="scoresFileUpload"
                        accept="text/csv"
                        :auto="false"
                        choose-label="Scores file"
                        :class="inputClasses.scoresFile || ''"
                        :custom-upload="true"
                        :disabled="scoresFileCount !== 0"
                        :file-limit="1"
                        :show-cancel-button="false"
                        :show-upload-button="false"
                        @remove="fileCleared('scoresFile')"
                        @select="fileSelected('scoresFile', $event)"
                      >
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </FloatLabel>
                    <span v-if="validationErrors.scoresFile" class="mave-field-error">{{
                      validationErrors.scoresFile
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :for="scopedId('input-scoreColumnsMetadataFile')">Load a scores column metadata file</label>
                    <div class="mavedb-help-small">
                      This file is optional, but recommended. If provided, it should be a JSON file containing a single
                      object. The keys of that object should be limited to columns of the score data, while values
                      should include a string description and an optional string details.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <FloatLabel variant="on">
                      <FileUpload
                        :id="scopedId('input-scoreColumnsMetadataFile')"
                        ref="scoreColumnsMetadataFileUpload"
                        accept="application/json"
                        :auto="false"
                        choose-label="Scores column metadata file"
                        :class="inputClasses.scoreColumnsMetadataFile || ''"
                        :custom-upload="true"
                        :disabled="scoresFileCount !== 1 || scoreColumnsMetadataFileCount !== 0"
                        :file-limit="1"
                        :show-cancel-button="false"
                        :show-upload-button="false"
                        @remove="fileCleared('scoreColumnsMetadataFile')"
                        @select="fileSelected('scoreColumnsMetadataFile', $event)"
                      >
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </FloatLabel>
                    <span v-if="validationErrors.scoreColumnsMetadataFile" class="mave-field-error">{{
                      validationErrors.scoreColumnsMetadataFile
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="scopedId('input-countsFile')">Load a counts file</label>
                    <div class="mavedb-help-small">
                      This file is optional, but recommended. There are no required columns for your count data, but you
                      should describe the meaning of any columns by uploading a column metadata file and providing any
                      additional information in your methods section.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <FloatLabel variant="on">
                      <FileUpload
                        :id="scopedId('input-countsFile')"
                        ref="countsFileUpload"
                        accept="text/csv"
                        :auto="false"
                        choose-label="Counts file"
                        :class="inputClasses.countsFile || ''"
                        :custom-upload="true"
                        :disabled="countsFileCount !== 0"
                        :file-limit="1"
                        :show-cancel-button="false"
                        :show-upload-button="false"
                        @remove="fileCleared('countsFile')"
                        @select="fileSelected('countsFile', $event)"
                      >
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </FloatLabel>
                    <span v-if="validationErrors.countsFile" class="mave-field-error">{{
                      validationErrors.countsFile
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :for="scopedId('input-countColumnsMetadataFile')">Load a counts column metadata file</label>
                    <div class="mavedb-help-small">
                      This file is optional, but recommended. If provided, it should be a JSON file containing a single
                      object. The keys of that object should be limited to columns of the count data, while values
                      should include a string description and an optional string details.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <FloatLabel variant="on">
                      <FileUpload
                        :id="scopedId('input-countColumnsMetadataFile')"
                        ref="countColumnsMetadataFileUpload"
                        accept="application/json"
                        :auto="false"
                        choose-label="Counts column metadata file"
                        :class="inputClasses.countColumnsMetadataFile || ''"
                        :custom-upload="true"
                        :disabled="countsFileCount !== 1 || countColumnsMetadataFileCount !== 0"
                        :file-limit="1"
                        :show-cancel-button="false"
                        :show-upload-button="false"
                        @remove="fileCleared('countColumnsMetadataFile')"
                        @select="fileSelected('countColumnsMetadataFile', $event)"
                      >
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </FloatLabel>
                    <span v-if="validationErrors.countColumnsMetadataFile" class="mave-field-error">{{
                      validationErrors.countColumnsMetadataFile
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back"
                    severity="secondary"
                    @click="activateCallback(activeWizardStep - 1)"
                  />
                  <Button
                    :disabled="maxWizardStepValidated < activeWizardStep"
                    icon="pi pi-arrow-right"
                    icon-pos="right"
                    label="Save"
                    @click="validateAndSave()"
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
import fasta from 'fasta-js'
import _ from 'lodash'
import {marked} from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
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
import {ref} from 'vue'
import {useHead} from '@unhead/vue'

import CalibrationEditor from '@/components/CalibrationEditor.vue'
import EmailPrompt from '@/components/common/EmailPrompt'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useScopedId from '@/composables/scoped-id'
import useFormatters from '@/composition/formatters'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, validateDoi} from '@/lib/identifiers'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import {
  NORMAL_CALIBRATION_EVIDENCE,
  ABNORMAL_CALIBRATION_EVIDENCE,
  INDETERMINATE_CALIBRATION_EVIDENCE
} from '@/lib/calibrations'
import {TARGET_GENE_CATEGORIES, textForTargetGeneCategory} from '@/lib/target-genes'

const externalGeneDatabases = ['UniProt', 'Ensembl', 'RefSeq']

function emptyTargetGeneWizardObj() {
  return {
    isRelativeToChromosome: false,
    targetGene: {
      name: null,
      category: null,
      type: null,
      targetSequence: {
        sequenceType: null,
        sequence: null,
        label: null,
        reference: null,
        taxonomy: null
      },
      targetAccession: {
        accession: null,
        assembly: null,
        gene: null
      },
      externalIdentifiers: _.fromPairs(
        externalGeneDatabases.map((dbName) => [dbName, {identifier: null, offset: null}])
      )
    },
    linkedAccessions: _.fromPairs(externalGeneDatabases.map((dbName) => [dbName, false])),
    autofilledTargetGene: null
  }
}

export default {
  name: 'ScoreSetCreator',
  components: {
    AutoComplete,
    Button,
    CalibrationEditor,
    DefaultLayout,
    Select,
    EmailPrompt,
    FileUpload,
    FloatLabel,
    InputNumber,
    ToggleSwitch,
    InputText,
    Message,
    Multiselect,
    ProgressSpinner,
    SelectButton,
    Stepper,
    StepPanel,
    StepPanels,
    StepList,
    Step,
    TabPanel,
    Tabs,
    Tab,
    TabList,
    TabPanels,
    Textarea
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

    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})

    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({itemTypeName: `${dbName.toLowerCase()}-identifier-search`})
    }

    const licenses = useItems({itemTypeName: 'active-license'})
    const taxonomies = useItems({itemTypeName: 'taxonomy'})
    const taxonomySuggestions = useItems({itemTypeName: 'taxonomy-search'})
    const geneNames = useItems({itemTypeName: 'gene-names'})
    const assemblies = useItems({itemTypeName: 'assemblies'})
    const targetGeneSuggestions = useItems({itemTypeName: 'target-gene-search'})

    const calibrationCreateDraft = ref({value: null})

    return {
      config: config,

      ...useFormatters(),
      ...useScopedId(),
      editableExperiments: ref([]),
      licenses: licenses.items,
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({text}),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text) => externalPublicationIdentifierSuggestions.setRequestBody({text}),
      targetGeneSuggestions: targetGeneSuggestions.items,
      setTargetGeneSearch: (text) => targetGeneSuggestions.setRequestBody({text}),
      targetGeneIdentifierSuggestions: ref({
        ..._.mapValues(targetGeneIdentifierSuggestions, (itemsModule) => itemsModule.items)
      }),
      setTargetGeneIdentifierSearch: _.mapValues(targetGeneIdentifierSuggestions, (itemsModule) => (text) => {
        itemsModule.setRequestBody({text})
        itemsModule.ensureItemsLoaded()
      }),
      taxonomies: taxonomies.items,
      taxonomySuggestions: taxonomySuggestions.items,
      setTaxonomySearch: (text) => taxonomySuggestions.setRequestBody({text}),
      assemblies: assemblies.items,
      geneNames: geneNames.items,
      textForTargetGeneCategory: textForTargetGeneCategory,
      calibrationCreateDraft: calibrationCreateDraft
    }
  },

  data: () => ({
    // Form fields
    isSupersedingScoreSet: false,
    supersededScoreSet: null,
    supersededScoreSetSuggestions: [],
    isMetaAnalysis: false,
    metaAnalyzesScoreSets: [],
    metaAnalyzesScoreSetSuggestions: [],
    experiment: null,

    title: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    licenseId: null,
    hasCustomUsagePolicy: false,
    dataUsagePolicy: null,

    contributors: [],
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    extraMetadata: null,
    countColumnsMetadata: null,
    scoreColumnsMetadata: null,

    createdTargetGenes: [emptyTargetGeneWizardObj()],
    numTargets: 1,

    assemblySuggestions: [],
    geneNameSuggestions: [],
    accessionSuggestions: [],

    // Static sets of options:
    sequenceTypes: ['DNA', 'protein'],
    targetGeneCategories: TARGET_GENE_CATEGORIES,
    rangeClassifications: [
      {value: 'normal', label: 'Normal'},
      {value: 'abnormal', label: 'Abnormal'},
      {value: 'not_specified', label: 'Not Specified'}
    ],
    evidenceStrengths: {
      normal: NORMAL_CALIBRATION_EVIDENCE,
      abnormal: ABNORMAL_CALIBRATION_EVIDENCE,
      indeterminate: INDETERMINATE_CALIBRATION_EVIDENCE
    },

    supersededScoreSetSuggestionsLoading: false,
    progressVisible: false,
    calibrationValidationErrors: {},
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null,
      countColumnsMetadataFile: null,
      scoreColumnsMetadataFile: null
    },
    externalGeneDatabases,
    validationErrors: {},

    // File upload states - reactive replacements for refs
    scoresFileCount: 0,
    countsFileCount: 0,
    scoreColumnsMetadataFileCount: 0,
    countColumnsMetadataFileCount: 0,

    isTargetSequence: true,
    isBaseEditor: false,
    isMultiTarget: false,
    investigatorIsProvidingScoreCalibrations: false,

    /** The currently active step. */
    activeWizardStep: 1,

    /** The highest step that the user has entered. This can be used to prevent the user from jumping ahead. */
    maxWizardStepEntered: 1
  }),

  computed: {
    numSteps: function () {
      return 5 + this.numTargets
    },

    stepFields: function () {
      const fields = {
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

    maxWizardStepValidated: function () {
      // This yields the value of maximum step validated, 0 if step 1 is not valid.
      const firstUnvalidatedStep = _.find(_.range(1, this.numSteps + 1), (step) => !this.validateWizardStep(step))
      return firstUnvalidatedStep ? firstUnvalidatedStep - 1 : this.numSteps
    },

    targetGeneIdentifierSuggestionsList: function () {
      return _.fromPairs(
        externalGeneDatabases.map((dbName) => {
          const suggestions = this.targetGeneIdentifierSuggestions[dbName]
          return [dbName, this.suggestionsForAutocomplete(suggestions)]
        })
      )
    },
    metaAnalyzesScoreSetSuggestionsList: function () {
      return this.suggestionsForAutocomplete(this.metaAnalyzesScoreSetSuggestions)
    },
    publicationIdentifierSuggestionsList: function () {
      return this.suggestionsForAutocomplete(
        _.unionBy(this.publicationIdentifierSuggestions, this.externalPublicationIdentifierSuggestions, 'identifier')
      )
    },
    supersededScoreSetSuggestionsList: function () {
      return this.suggestionsForAutocomplete(this.supersededScoreSetSuggestions)
    },
    targetGeneSuggestionsList: function () {
      const geneSuggestions = this.targetGeneSuggestions || []
      const filteredGeneSuggestions = geneSuggestions.filter((gene) => {
        const seq = gene?.targetSequence
        return seq && seq.sequence && seq.sequenceType
      })
      return this.suggestionsForAutocomplete(filteredGeneSuggestions)
    },
    taxonomySuggestionsList: function () {
      return this.suggestionsForAutocomplete(this.taxonomySuggestions)
    },
    defaultLicenseId: function () {
      return this.licenses ? this.licenses.find((license) => license.shortName == 'CC0')?.id : null
    },
    geneNamesAsObject: function () {
      // Heinous workaround for string filtration, see: https://github.com/primefaces/primevue/issues/2059
      // When this is fixed, we'll need to also remove object accessors in other miscellaneous helpers below.
      if (!this.geneNames || this.geneNames.length == 0) {
        return [{}]
      } else {
        return this.geneNames.map((name) => ({name}))
      }
    }
  },

  watch: {
    experimentUrn: {
      immediate: true,
      handler: async function (newValue, oldValue) {
        if (newValue != oldValue) {
          let response = null
          try {
            response = await axios.get(`${config.apiBaseUrl}/experiments/${this.experimentUrn}`)
          } catch (e) {
            response = e.response || {status: 500}
          }

          if (response.status == 200) {
            this.experiment = response.data
            this.populateExperimentMetadata({value: this.experiment})
            this.activeWizardStep = 1
          } else {
            this.$toast.add({severity: 'error', summary: `Could not fetch experiment with urn ${this.experimentUrn}`})
          }
        }
      }
    },
    existingTargetGene: {
      immediate: true,
      handler: function () {
        if (_.isObject(this.existingTargetGene)) {
          // _.cloneDeep is needed because the target gene has been frozen.
          const targetGene = _.cloneDeep(this.existingTargetGene)
          if (!targetGene.targetSequence) {
            targetGene.targetSequence = {
              sequenceType: null,
              sequence: null,
              label: null,
              taxonomy: null
            }
          } else {
            this.taxonomy = targetGene.targetSequence.taxonomy
          }
          if (!targetGene.targetAccession) {
            targetGene.targetAccession = {
              assembly: null,
              accession: null
            }
          }
          // Reactivity is handled by separate fields for target accession properties.
          else {
            this.assembly = targetGene.targetAccession.assembly
            this.accession = targetGene.targetAccession.accession
          }
          const autopopulatedExternalIdentifiers = {}
          for (const dbName of externalGeneDatabases) {
            autopopulatedExternalIdentifiers[dbName] = (targetGene.externalIdentifiers || []).find(
              ({identifier}) => identifier?.dbName == dbName
            ) || {
              identifier: null,
              offset: null
            }
          }
          targetGene.externalIdentifiers = autopopulatedExternalIdentifiers
          this.targetGene = targetGene
        }
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
            !newValue.map((pi) => pi.identifier).includes(this.primaryPublicationIdentifiers[0].identifier))
        ) {
          // Clear primary publication if we have just added a second ID, or if we have deleted all IDs,
          // or if the primary publication is no longer in the list of publications.
          this.primaryPublicationIdentifiers = []
        }
      }
    },
    defaultLicenseId: {
      handler: function () {
        if (this.licenseId == null) {
          this.licenseId = this.defaultLicenseId
        }
      }
    },
    isMultiTarget: {
      handler: function (newValue, oldValue) {
        if (newValue == oldValue) {
          return
        }
        if (newValue) {
          this.numTargets = 2
        } else {
          this.numTargets = 1
        }
      }
    },
    numTargets: {
      handler: function (newValue, oldValue) {
        if (newValue == oldValue) {
          return
        }
        if (this.createdTargetGenes.length < this.numTargets) {
          for (let i = this.createdTargetGenes.length; i < this.numTargets; i++) {
            this.createdTargetGenes.push(emptyTargetGeneWizardObj())
            // this.stepFields.splice(3, 0, ['targetGene'])
          }
        } else if (this.createdTargetGenes.length > this.numTargets) {
          this.createdTargetGenes = this.createdTargetGenes.slice(0, this.numTargets)
          // this.stepFields.splice(3, oldValue - newValue)
        }
      }
    }
  },

  mounted: async function () {
    await this.loadEditableExperiment()
  },

  methods: {
    clearAutoCompleteInput: function (event) {
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
                  contributor.orcidId = contributor.orcidId.trim()
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

    validateWizardStep: function (step) {
      // Later, this may depend on server-side validation.
      switch (true) {
        case step == 1: {
          // Step 0 is valid if
          // - The score set is a meta-analysis and at least one meta-analyzed score set has been chosen..
          // - The score set is a superseding score set, and the superseded score set has been chosen.
          // - Or the score set is neither, and its parent experiment has been chosen in dropdown or from experiment view page.
          return (
            !!(this.isMetaAnalysis && this.metaAnalyzesScoreSets.length > 0) ||
            !!(this.isSupersedingScoreSet && this.supersededScoreSet) ||
            !!((!this.isMetaAnalysis && !this.isSupersedingScoreSet && this.experiment) || this.experimentUrn)
          )
        }
        case step == 2: {
          return this.title && this.shortDescription && this.abstractText && this.methodText
        }
        case step == 3: {
          return this.numTargets > 0
        }
        case step > 3 && step <= 3 + this.numTargets: {
          const currentTargetGene = this.createdTargetGenes[step - 4].targetGene
          if (this.isTargetSequence) {
            return (
              currentTargetGene.name &&
              currentTargetGene.category &&
              currentTargetGene.targetSequence.sequence &&
              currentTargetGene.targetSequence.sequenceType &&
              // Don't allow the user to advance if the taxonomy has been searched for but not selected,
              currentTargetGene.targetSequence.taxonomy?.id
            )
          } else {
            return (
              currentTargetGene.name &&
              currentTargetGene.category &&
              currentTargetGene.targetAccession.accession &&
              (currentTargetGene.targetAccession.assembly || currentTargetGene.targetAccession.gene)
            )
          }
        }
        case step == 4 + this.numTargets: {
          if (!this.investigatorIsProvidingScoreCalibrations) {
            return true
          }

          // If a user has begun to provide functional ranges, ensure that they have provided at least a label, functionalClassification
          // and min/max value for all functional ranges.
          for (const scoreRange of this.calibrationCreateDraft.value?.functionalClassifications || []) {
            if (!scoreRange.label || !scoreRange.functionalClassification) {
              return false
            }
            // Since infinite bounds are handled by null values, it's not trivial to check the bounds are complete. We'll leave
            // that validation to the server for now.
          }

          // Allow progress if all functional ranges have minimum info, and at least one of the following is true:
          // - At least one functional range has been provided.
          // - A baseline score has been provided.
          return (
            this.calibrationCreateDraft.value?.functionalClassifications.length ||
            this.calibrationCreateDraft.value?.baselineScore !== null
          )
        }
        default:
          return true
      }
    },

    minStepWithError: function () {
      for (let i = 1; i <= this.numSteps; i++) {
        if (this.wizardStepHasError(i)) {
          return i
        }
      }
      return this.numSteps
    },

    wizardStepHasError: function (step) {
      return !this.stepFields[step].every((field) => {
        for (const v of Object.keys(this.validationErrors)) {
          if (v.startsWith(field)) {
            return false
          }
        }
        return true
      })
    },

    showNextWizardStepIfValid: function (navigate) {
      if (this.maxWizardStepValidated >= this.activeWizardStep) {
        this.maxWizardStepEntered = Math.max(this.maxWizardStepEntered, this.activeWizardStep + 1)
        navigate(this.activeWizardStep + 1)
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

    searchMetaAnalyzesScoreSets: async function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.metaAnalyzesScoreSetSuggestions = await this.searchScoreSets(searchText)
      }
    },

    searchSupersededScoreSets: async function (event) {
      this.supersededScoreSetSuggestionsLoading = true
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.supersededScoreSetSuggestions = await this.searchScoreSets(searchText, true)
      }
      this.supersededScoreSetSuggestionsLoading = false
    },

    searchScoreSets: async function (searchText, mine = false) {
      const url = mine ? `${config.apiBaseUrl}/me/score-sets/search` : `${config.apiBaseUrl}/score-sets/search`
      try {
        const response = await axios.post(
          url,
          {
            text: searchText || null
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        return response.data?.scoreSets || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
        return []
      }
    },

    targetGeneWithWizardProperties(existingTarget) {
      const targetGene = this.emptyTargetGeneWizardObj()
      targetGene.targetGene = existingTarget

      return targetGene
    },

    refreshAccessionOptions: async function (targetIdx) {
      const currentTarget = this.createdTargetGenes[targetIdx]
      this.accessionSuggestions = []

      // if we are refreshing the accession options, we can't retain the currently selected accession
      if (currentTarget.targetGene.targetAccession.accession) {
        currentTarget.targetGene.targetAccession.accession = null
      }

      if (currentTarget.isRelativeToChromosome && currentTarget.targetGene.targetAccession.assembly) {
        this.accessionSuggestions = await this.fetchTargetAccessionsByAssembly(
          currentTarget.targetGene.targetAccession.assembly
        )
      } else if (!currentTarget.isRelativeToChromosome && currentTarget.targetGene.targetAccession.gene) {
        this.accessionSuggestions = await this.fetchTargetAccessionsByGene(
          currentTarget.targetGene.targetAccession.gene.name
        )
      }

      if (!this.accessionSuggestions) {
        this.accessionSuggestions = []
        this.$toast.add({
          severity: 'warn',
          summary: `No accession identifiers were found for ${currentTarget.isRelativeToChromosome ? currentTarget.targetGene.targetAccession.assembly : currentTarget.targetGene.targetAccession.gene.name}`,
          life: 3000
        })
      }
    },

    fetchTargetAccessions: async function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.accessionSuggestions = this.accessionSuggestions.filter((s) =>
          s?.toLowerCase().includes(searchText.toLowerCase())
        )
      } else {
        this.accessionSuggestions = [...this.accessionSuggestions] // PrimeVue AutoComplete quirk
      }
    },

    autofillGeneName: function (changeEvent, targetIdx) {
      if (!this.createdTargetGenes[targetIdx].targetGene.name) {
        this.createdTargetGenes[targetIdx].targetGene.name = changeEvent.value.name // Gene Name string object
      }

      this.refreshAccessionOptions(targetIdx)
    },

    swapNucleotideProteinAccessions: async function (targetIdx) {
      const currentTargetGene = this.createdTargetGenes[targetIdx].targetGene
      if (currentTargetGene.targetAccession.accession.startsWith('NP')) {
        // Don't do anything if we already are operating on a protein transcript
        this.$toast.add({
          severity: 'info',
          summary: `${currentTargetGene.targetAccession.accession} is already a protein accession.`,
          life: 3000
        })
        return
      }
      const url = `${config.apiBaseUrl}/hgvs/protein/${currentTargetGene.targetAccession.accession}`
      try {
        const response = await axios.get(url, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        currentTargetGene.targetAccession.accession = response.data
      } catch (err) {
        if (err.response.status == 404) {
          this.$toast.add({severity: 'error', summary: err.response.data.detail, life: 3000})
        } else {
          this.$toast.add({
            severity: 'error',
            summary: `Could not fetch protein accession for ${currentTargetGene.targetAccession.accession}`
          })
          console.log('Request to swap protein accession failed', err)
        }
      }
    },

    fetchTargetAccessionsByAssembly: async function (assembly) {
      const url = `${config.apiBaseUrl}/hgvs/${assembly.trim()}/accessions`
      try {
        const response = await axios.get(url, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
        return []
      }
    },

    fetchTargetAccessionsByGene: async function (gene) {
      const url = `${config.apiBaseUrl}/hgvs/gene/${gene.trim()}`
      try {
        const response = await axios.get(url, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    loadEditableExperiment: async function () {
      try {
        const response = await axios.post(`${config.apiBaseUrl}/me/experiments/search`, {metaAnalysis: false})
        this.editableExperiments = response.data
      } catch (error) {
        console.error('Error loading experiments:', error)
        this.editableExperiments = [] // Reset in case of an error
      }
    },

    populateExperimentMetadata: function (event) {
      this.abstractText = event.value.abstractText
      this.contributors = event.value.contributors || []
      this.doiIdentifiers = event.value.doiIdentifiers
      this.publicationIdentifiers = _.concat(
        event.value.primaryPublicationIdentifiers,
        event.value.secondaryPublicationIdentifiers
      )
      this.primaryPublicationIdentifiers = event.value.primaryPublicationIdentifiers.filter((primary) => {
        return this.publicationIdentifiers.some((publication) => {
          return primary.identifier === publication.identifier
        })
      })
    },

    populateSupersededScoreSetMetadata: function (event) {
      this.contributors = event.value.contributors || []
    },

    externalTargetIdentifierChanged: function (dbName, targetIdx, event) {
      this.addDefaultOffset(dbName, targetIdx)
      this.externalIdentifierTextToObject(dbName, targetIdx, event)
    },

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
          summary: `DOI "${newDoi}" is already associated with this score set`,
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

    removeContributor: function (contributor) {
      const index = this.contributors.findIndex((c) => c.orcidId === contributor.orcidId)
      if (index !== -1) {
        this.contributors.splice(index, 1)
      }
    },
    removeDoiIdentifier: function (doiIdentifier) {
      const index = this.doiIdentifiers.findIndex((d) => d.identifier === doiIdentifier.identifier)
      if (index !== -1) {
        this.doiIdentifiers.splice(index, 1)
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

    addDefaultOffset: function (dbName, targetIdx) {
      const currentTargetGene = this.createdTargetGenes[targetIdx].targetGene
      if (!currentTargetGene.externalIdentifiers[dbName]?.offset) {
        currentTargetGene.externalIdentifiers[dbName].offset = 0
      }
    },

    externalIdentifierTextToObject: function (dbName, targetIdx, event) {
      const currentTargetGene = this.createdTargetGenes[targetIdx].targetGene
      const externalIdentifier = currentTargetGene.externalIdentifiers[dbName]

      if (!event.value) {
        externalIdentifier.identifier = null
        return
      }

      if (!externalIdentifier.identifier?.identifier) {
        externalIdentifier.identifier = {identifier: event.value, dbName: dbName}
      }
    },

    searchTargetGeneIdentifiers: function (dbName, event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setTargetGeneIdentifierSearch[dbName](searchText)
      }
    },

    searchTargetGenes: function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setTargetGeneSearch(event.query)
      }
    },

    autofillFromExistingTarget: function (event, targetIdx) {
      const autofilledTargetGene = this.createdTargetGenes[targetIdx].autofilledTargetGene

      this.resetTarget(targetIdx)
      const createdTarget = this.createdTargetGenes[targetIdx]

      createdTarget.targetGene.category = autofilledTargetGene.category
      createdTarget.targetGene.name = autofilledTargetGene.name

      if (this.isTargetSequence) {
        createdTarget.targetGene.targetSequence = autofilledTargetGene.targetSequence
        // dna comes back from the API as a lower cased string. Make it upper case to match the button definition.
        if (createdTarget.targetGene.targetSequence.sequenceType == 'dna') {
          createdTarget.targetGene.targetSequence.sequenceType =
            createdTarget.targetGene.targetSequence.sequenceType.toUpperCase()
        }
      } else {
        createdTarget.targetGene.targetAccession = autofilledTargetGene.targetAccession
      }

      autofilledTargetGene.externalIdentifiers.forEach((externalIdentifier) => {
        createdTarget.linkedAccessions[externalIdentifier.identifier.dbName] = true
        createdTarget.targetGene.externalIdentifiers[externalIdentifier.identifier.dbName] = externalIdentifier
      })

      createdTarget.autofilledTargetGene = autofilledTargetGene
    },

    clearTaxonomySearch: function () {
      const input = this.$refs.taxonomyInput
      input.inputTextValue = null
    },

    searchTaxonomies: function (event) {
      // if no search text, then return all taxonomy list. Otherwise, return the searching results.
      // If not do in this way, dropdown button can't work.
      this.setTaxonomySearch(event.query)
    },

    fileCleared: function (inputName) {
      // Update reactive file counts
      this.updateFileCount(inputName, 0)

      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
      } else if (inputName == 'countColumnsMetadataFile') {
        this.countColumnsMetadata = null
      } else if (inputName == 'scoreColumnsMetadataFile') {
        this.scoreColumnsMetadata = null
      }
      // ensure files are cleared from sequence loader even when remove button not used
      else if (inputName == 'targetGeneTargetSequenceSequenceFile') {
        this.$refs.sequenceFileUpload.files = []
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    updateFileCount: function (inputName, count) {
      switch (inputName) {
        case 'scoresFile':
          this.scoresFileCount = count
          break
        case 'countsFile':
          this.countsFileCount = count
          break
        case 'scoreColumnsMetadataFile':
          this.scoreColumnsMetadataFileCount = count
          break
        case 'countColumnsMetadataFile':
          this.countColumnsMetadataFileCount = count
          break
      }
    },

    validateJsonObject: function (data, fieldName) {
      if (!_.isObject(data) || _.isArray(data)) {
        this.clientSideValidationErrors[fieldName] =
          `${_.startCase(fieldName)} must be a JSON object (not an array or simple value).`
      } else {
        delete this.clientSideValidationErrors[fieldName]
      }
    },

    fileSelected: async function (inputName, event, targetIdx) {
      const file = event.files[0]

      // Update reactive file counts
      this.updateFileCount(inputName, event.files.length)

      if (file) {
        const text = await file.text()
        switch (inputName) {
          case 'extraMetadataFile':
            {
              try {
                this.extraMetadata = JSON.parse(text)
                this.validateJsonObject(this.extraMetadata, 'extraMetadata')
              } catch {
                this.extraMetadata = null
                this.clientSideValidationErrors.extraMetadata = 'The file did not contain valid JSON text.'
                console.log('Extra metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'countColumnsMetadataFile':
            {
              try {
                this.countColumnsMetadata = JSON.parse(text)
                this.validateJsonObject(this.countColumnsMetadata, 'countColumnsMetadata')
              } catch {
                this.countColumnsMetadata = null
                this.clientSideValidationErrors.countColumnsMetadata = 'The file did not contain valid JSON text.'
                console.log('Count columns metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'scoreColumnsMetadataFile':
            {
              try {
                this.scoreColumnsMetadata = JSON.parse(text)
                this.validateJsonObject(this.scoreColumnsMetadata, 'scoreColumnsMetadata')
              } catch {
                this.scoreColumnsMetadata = null
                this.clientSideValidationErrors.scoreColumnsMetadata = 'The file did not contain valid JSON text.'
                console.log('Score columns metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'targetGeneTargetSequenceSequenceFile':
            {
              try {
                const fastaParser = new fasta()
                /*new Fasta({
                  'definition': 'gi|accession|description',
                  'delimiter': '|'
                })*/
                const rawFastaData = fastaParser.parse(text)
                const fastaData = rawFastaData.map((entry) => ({
                  ...entry,
                  id: entry.id.replace(/[\r\n]/g, ''),
                  sequence: entry.sequence.replace(/[\r\n]/g, '')
                }))
                if (fastaData.length == 0) {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`] =
                    'The FASTA file contains no sequences.'
                } else if (fastaData.length > 1) {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`] =
                    'The FASTA file contains more than one sequence.'
                } else {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = fastaData[0].sequence
                  delete this.clientSideValidationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`]
                }
              } catch (e) {
                this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                this.clientSideValidationErrors[`targetGenes.${targetIdx}.targetGene.targetSequence.sequence`] =
                  'The file was not a valid FASTA file.'
                console.log('Reference sequence file was not a valid FASTA file.')
              }
            }
            break
        }
        this.inputClasses[inputName] = 'mave-file-input-full'
      }
      this.mergeValidationErrors()
    },

    showSwitchToProteinAccessionButton: function (targetIdx) {
      const regex = /^(NP|ENSP|XP).*$/
      return (
        this.createdTargetGenes[targetIdx].targetGene.targetAccession.accession &&
        !this.createdTargetGenes[targetIdx].isRelativeToChromosome &&
        !regex.test(this.createdTargetGenes[targetIdx].targetGene.targetAccession.accession)
      )
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
      this.experiment = null
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
      this.secondaryPublicationIdentifiers = []
      this.extraMetadata = null
      this.countColumnsMetadata = null
      this.scoreColumnsMetadata = null

      this.scoreCalibrations = this.investigatorIsProvidingScoreCalibrations ? [this.calibrationCreateDraft.value] : []
      this.investigatorIsProvidingScoreCalibrations = false

      this.createdTargetGenes = [emptyTargetGeneWizardObj()]
      this.numTargets = 1
      this.isMultiTarget = false
      this.isTargetSequence = true
      this.isBaseEditor = false

      // clear validation errors
      this.clientSideValidationErrors = {}
      this.serverSideValidationErrors = {}
      this.validationErrors = {}

      // set form to step 0
      this.activeWizardStep = 1
      this.maxWizardStepValidated = 0
      this.maxWizardStepEntered = 1
    },

    resetTarget: function (targetIdx) {
      this.fileCleared('targetGeneTargetSequenceSequenceFile')
      this.createdTargetGenes[targetIdx] = emptyTargetGeneWizardObj()
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

      console.log('Preparing to save target genes:', this.createdTargetGenes)

      const editedFields = {
        experimentUrn: this.experimentUrn ? this.experimentUrn : this.experiment?.urn,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        licenseId: this.licenseId,

        contributors: this.contributors,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: primaryPublicationIdentifiers,
        secondaryPublicationIdentifiers: secondaryPublicationIdentifiers,
        dataUsagePolicy: this.hasCustomUsagePolicy ? this.dataUsagePolicy : null,
        extraMetadata: this.extraMetadata || {},
        datasetColumns: {
          scoreColumnsMetadata: this.scoreColumnsMetadata || {},
          countColumnsMetadata: this.countColumnsMetadata || {}
        },

        scoreCalibrations: this.investigatorIsProvidingScoreCalibrations ? [this.calibrationCreateDraft.value] : [],

        targetGenes: _.cloneDeep(this.createdTargetGenes).map((target) => {
          const targetGene = {
            name: target.targetGene.name,
            category: target.targetGene.category,
            targetSequence: this.isTargetSequence ? target.targetGene.targetSequence : null,
            targetAccession: !this.isTargetSequence ? target.targetGene.targetAccession : null,
            externalIdentifiers: []
          }

          for (const [db, linked] of Object.entries(target.linkedAccessions)) {
            console.log('Processing linked accession:', db, linked)
            if (linked) {
              const targetGeneExternalIdentifier = _.clone(target.targetGene.externalIdentifiers[db])
              if (!targetGeneExternalIdentifier.identifier) {
                targetGeneExternalIdentifier.identifier = {dbName: db}
              }
              targetGene.externalIdentifiers.push(targetGeneExternalIdentifier)
            }
          }

          if (!this.isTargetSequence && !target.isRelativeToChromosome) {
            targetGene.targetAccession.gene = targetGene.targetAccession.gene.name
          }

          if (!this.isTargetSequence) {
            targetGene.targetAccession.isBaseEditor = this.isBaseEditor
          }

          return targetGene
        })
      }

      editedFields.supersededScoreSetUrn = this.supersededScoreSet ? this.supersededScoreSet.urn : null
      editedFields.metaAnalyzesScoreSetUrns = this.metaAnalyzesScoreSets.map((s) => s.urn)
      if (editedFields.metaAnalyzesScoreSetUrns.length === 0 && editedFields.supersededScoreSetUrn) {
        editedFields.experimentUrn = this.supersededScoreSet.experiment.urn
      }

      this.progressVisible = true
      let response = null
      try {
        response = await axios.post(`${config.apiBaseUrl}/score-sets/`, editedFields)
      } catch (e) {
        response = e.response || {status: 500}
        this.$toast.add({severity: 'error', summary: 'Encountered an error while saving score set.', life: 3000})
      }
      this.progressVisible = false
      if (response.status == 200) {
        const savedItem = response.data
        this.validationErrors = {}
        console.log('Created item')
        await this.uploadData(savedItem)
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        const calibrationValidationErrors = {}
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({
            severity: 'error',
            summary: `Encountered an error saving score set: ${response.data.detail}`
          })
        } else {
          for (const error of response.data.detail) {
            // Induce custom error paths for model level validation errors.
            let path = error.loc
            if (path[0] == 'body') {
              path = path.slice(1)
            }

            let customPath = error.ctx?.error?.custom_loc
            if (customPath) {
              if (customPath[0] == 'body') {
                customPath = customPath.slice(1)
              }
            }

            if (customPath) {
              path = path.concat(customPath)
            }

            if (_.isEqual(_.first(path), 'targetGenes') && path.length >= 2) {
              // Map errors on indexed external gene identifiers to inputs named for the identifier's database.
              if (_.isEqual(_.slice(path, 2, 3), ['externalIdentifiers'])) {
                const identifierIndex = path[3]
                const identifierOffset = editedFields.targetGenes[path[1]].externalIdentifiers[identifierIndex]
                // Potentially incorrect to fall back on index of the external gene database to induce the name, but displaying the error in the wrong spot is
                // preferable to not displaying the error.
                path.splice(
                  3,
                  1,
                  identifierOffset?.identifier?.dbName
                    ? identifierOffset.identifier.dbName
                    : this.externalGeneDatabases[identifierIndex]
                )
              }
              // insert 'targetGene' after the targetGenes index to match the form's data structure
              path.splice(2, 0, 'targetGene')
            }

            // Add calibration errors to a separate object which is consumed by the calibration sub-component.
            if (_.isEqual(_.slice(path, 0, 1), ['scoreCalibrations'])) {
              // The second path element is an array index, which is irrelevant here as we only supply one calibration on score set creation.
              calibrationValidationErrors[path.slice(2).join('.')] = error.msg
            }

            path = path.join('.')
            formValidationErrors[path] = error.msg
          }
        }
        this.calibrationValidationErrors = calibrationValidationErrors
        this.serverSideValidationErrors = formValidationErrors
        this.mergeValidationErrors()
        this.activeWizardStep = this.minStepWithError()
      }
    },

    uploadData: async function (scoreSet) {
      if (this.scoresFileCount !== 1) {
        this.validationErrors = {scores: 'Required'}
      } else {
        const formData = new FormData()
        formData.append('scores_file', this.$refs.scoresFileUpload.files[0])
        if (this.countsFileCount === 1) {
          formData.append('counts_file', this.$refs.countsFileUpload.files[0])
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
          response = await axios.post(`${config.apiBaseUrl}/score-sets/${scoreSet.urn}/variants/data`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        } catch (e) {
          response = e.response || {status: 500}
        }
        this.progressVisible = false

        if (response.status == 200) {
          console.log('Imported score set data.')
          this.$router.replace({path: `/score-sets/submit-completion/${scoreSet.urn}`})
          this.$toast.add({severity: 'success', summary: 'The new score set was saved.', life: 3000})
        } else {
          this.$toast.add({
            severity: 'error',
            summary: `The score and count files could not be imported. ${response.data.detail}`,
            life: 3000
          })
          // Delete the score set if just created.
          // Warn if the score set already exists.
        }
      }
    },

    validateAndSave: async function () {
      this.clientSideValidationErrors = {}

      const hasScoresFile = this.scoresFileCount === 1
      const hasCountsFile = this.countsFileCount === 1
      if (hasCountsFile && !hasScoresFile) {
        this.clientSideValidationErrors.scoresFile = 'Required'
      }
      if (!hasScoresFile) {
        this.clientSideValidationErrors.scoresFile = 'Required'
      }

      this.serverSideValidationErrors = {}
      this.mergeValidationErrors()
      if (_.isEmpty(this.validationErrors)) {
        await this.save()
      }
    },

    //Editing published score set doesn't have scoresFileUpload.
    saveEditContent: async function () {
      await this.save()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    }
  }
}
</script>

<style src="../../assets/forms.css"></style>

<style scoped>
.mavedb-wizard:deep(.p-stepper) {
  min-width: 1180px; /* Design is not responsive past this point. */
}

/* Remove the stepper panel's background color. */
.mavedb-wizard:deep(.p-stepper .p-steppanels) {
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
  width: 60%;
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
  background-color: #fff;
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

/* Switches */
.p-ToggleSwitch {
  margin: 10px 0;
  vertical-align: middle;
}

.mavedb-switch-value {
  display: inline-block;
  margin: 10px 1em;
}

.field:deep(.mavedb-wizard-rendered-markdown) {
  width: 550px;
}

.field:deep(.mavedb-wizard-rendered-markdown :first-child) {
  margin-top: 0;
}

.target-header {
  display: flex;
  margin-bottom: 0;
  margin-top: 0;
}

.compact-target {
  margin-bottom: 0;
  margin-top: 0;
  display: block;
}

.field-columns {
  display: flex;
  flex-direction: row;
}

.field-column {
  position: relative;
  flex: 1 1 auto;
  margin-left: 10px;
  margin-right: 10px;
}

/* Make sure autocomplete text input is the same width as the autocomplete */
.p-autocomplete:deep(.p-autocomplete-input) {
  width: 100%;
}

.field-column:first-child {
  margin-left: 0;
}

/* Form fields */

.mave-taxonomy-none {
  min-width: 300px;
}

.mave-taxonomy-common-name {
  float: left;
  padding: 10px;
  min-width: 120px;
  margin: 0 5px 0 0;
  background: #eee;
}

.mave-taxonomy-organism-name {
  padding: 10px;
  margin-left: 125px;
  background: #f9f9f9;
}

.p-dropdown-item:nth-child(even) .mave-taxonomy-common-name {
  background: #ddd;
}

.p-dropdown-item:nth-child(even) .mave-taxonomy-organism-name {
  background: #e9e9e9;
}

.score-range-toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-range-toggle-icon {
  margin: 0 auto;
}

/* Cards */

.mave-score-set-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0, 0, 0, 0.05);
}

.mave-score-set-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51b5;
  margin-bottom: 0;
}

.dropdown-option-group {
  font-weight: bold;
  color: #3f51b5;
  margin-bottom: 0;
}

.mave-score-set-editor:deep(.p-card-content) {
  padding: 0;
}

/* Progress indicator */

.mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}

.mavedb-wizard:deep(.p-step-title) {
  font-size: 0.9em !important;
}

.p-inputwrapper,
.p-textarea,
.p-inputtext {
  width: 100%;
}
</style>
