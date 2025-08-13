<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit a score set. You can do so below, or on the 'Settings' page."
    :isFirstLoginPrompt="false"
  />
  <DefaultLayout>
    <div class="mave-score-set-editor">
      <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
        <div class="mave-screen-title">Edit score set {{ this.item.urn }}</div>
        <div v-if="item" class="mave-screen-title-controls">
          <Button @click="saveEditContent">Save changes</Button>
          <Button @click="resetForm" class="p-button-help">Clear</Button>
          <Button @click="viewItem" class="p-button-warning">Cancel</Button>
        </div>
      </div>
      <div v-else class="mave-screen-title-bar">
        <div class="mave-screen-title">Create a new score set</div>
        <div class="mave-screen-title-controls">
          <Button @click="validateAndSave">Save</Button>
          <Button @click="resetForm" class="p-button-help">Clear</Button>
          <Button @click="backDashboard" class="p-button-warning">Cancel</Button>
        </div>
      </div>
      <div class="mavedb-wizard">
        <Stepper v-model:activeStep="activeWizardStep">
          <StepperPanel>
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Parent experiment and context</span>
              </button>
            </template>
            <template #content="{nextCallback: showNextWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-if="experimentUrn && this.experiment">
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-experiment')">
                        Experiment: {{ experimentUrn }}
                      </label>
                      <div class="mavedb-help-small">
                        To add a score set to a different experiment, supercede a score set or add a score set to meta-analysis, please navigate to "New score set".
                        For more on the relationship between score sets and experiments, see the
                        <a target="_blank" :href="`${config.appBaseUrl}/docs/mavedb/record_types.html#record-types`">documentation</a>.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      Experiment title: {{ this.experiment.title }}
                    </div>
                  </div>
                </div>
                <div v-else>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-superseding-score-set-label')">
                        Does this score set correct errors in and replace a score set previously published on MaveDB that you created?
                      </label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <InputSwitch v-model="isSupersedingScoreSet" :aria-labelledby="$scopedId('input-superseding-score-set-label')" />
                      <div class="mavedb-switch-value">{{ isSupersedingScoreSet ? 'Yes, this supersedes another score set' : 'No, this does not supersede another score set' }}</div>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-is-meta-analysis-label')">Is this score set a meta-analysis?</label>
                      <div class="mavedb-help-small">
                        Meta-analyses are score sets derived from data in other score sets that were created by you or other users.
                        For example:
                        <ul>
                          <li>a score set that combines data from two other score sets to produce new scores, or</li>
                          <li>a score set that adds imputed missing values to the scores in another score set.</li>
                        </ul>
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <InputSwitch v-model="isMetaAnalysis" :aria-labelledby="$scopedId('input-is-meta-analysis-label')" />
                      <div class="mavedb-switch-value">{{ isMetaAnalysis ? 'Yes, this is a meta-analysis' : 'No, this is not a meta-analysis' }}</div>
                    </div>
                  </div>
                  <div v-if="!isSupersedingScoreSet && !isMetaAnalysis" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      To which experiment does this score set belong?
                      <div class="mavedb-help-small">
                        For more on the relationship between score sets and experiments, see the
                        <a target="_blank" :href="`${config.appBaseUrl}/docs/mavedb/record_types.html#record-types`">documentation</a>.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div v-if="itemStatus != 'NotLoaded' && item.experiment">
                        Experiment:
                        <router-link :to="{ name: 'experiment', params: { urn: item.experiment.urn } }">{{ item.experiment.title
                        }}</router-link>
                      </div>
                      <div v-else style="position: relative;">
                        <span class="p-float-label">
                          <Dropdown
                            ref="experimentInput"
                            v-model="experiment"
                            :id="$scopedId('input-experiment')"
                            filter optionLabel="title"
                            :options="editableExperiments"
                            :virtualScrollerOptions="{ itemSize: 50 }"
                            @change="populateExperimentMetadata"
                            style="width: 100%;"
                          >
                            <template #option="slotProps">
                              {{ slotProps.option.urn }}: {{ slotProps.option.title }}
                            </template>
                            <template #empty>
                              <div style="padding: 10px; text-align:center;">
                                No experiments found.
                              </div>
                            </template>
                          </Dropdown>
                          <label :for="$scopedId('input-experiment')">Experiment</label>
                        </span>
                        <span v-if="validationErrors.experiment" class="mave-field-error">{{ validationErrors.experiment }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="isSupersedingScoreSet" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      What score set does this supersede?
                      <div class="mavedb-help-small">Type the superseded score set's MaveDB URN here and select it from the list.</div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div v-if="itemStatus != 'NotLoaded' && supersedesScoreSet">
                        Supersedes:
                        <router-link :to="{ name: 'scoreSet', params: { urn: supersedesScoreSet.urn } }">{{ supersedesScoreSet.title }}</router-link>
                      </div>
                      <div v-if="itemStatus == 'NotLoaded'" class="field">
                        <span class="p-float-label">
                          <AutoComplete
                            ref="supersededScoreSetInput"
                            v-model="supersededScoreSet"
                            :id="$scopedId('input-supersededScoreSet')"
                            field="title"
                            :forceSelection="true"
                            :suggestions="supersededScoreSetSuggestionsList"
                            @change="populateSupersededScoreSetMetadata"
                            @complete="searchSupersededScoreSets"
                          >
                            <template #item="slotProps">
                              {{ slotProps.item.urn }}: {{ slotProps.item.title }}
                            </template>
                          </AutoComplete>
                          <label :for="$scopedId('input-supersededScoreSet')">Supersedes</label>
                        </span>
                        <span v-if="validationErrors.supersededScoreSetUrn" class="mave-field-error">{{
                          validationErrors.supersededScoreSetUrn }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="isMetaAnalysis" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      What score set(s) does this score set analyze?
                      <div class="mavedb-help-small">Type a score set's MaveDB URN here and select it from the list. You may choose more than one score set.</div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <div v-if="itemStatus != 'NotLoaded' && item?.metaAnalyzesScoreSetUrns?.length > 0">
                        Meta-analysis for:<br />
                        <div v-for="metaAnalyzesScoreSetUrn of item.metaAnalyzesScoreSetUrns" :key="metaAnalyzesScoreSetUrn">
                          <EntityLink entityType="scoreSet" :urn="metaAnalyzesScoreSetUrn"></EntityLink>
                        </div>
                      </div>
                      <div v-if="itemStatus == 'NotLoaded'" class="field">
                        <span class="p-float-label">
                          <AutoComplete ref="metaAnalyzesScoreSetsInput" v-model="metaAnalyzesScoreSets"
                            :id="$scopedId('input-metaAnalyzesScoreSets')" field="title" :forceSelection="true" :multiple="true"
                            :suggestions="metaAnalyzesScoreSetSuggestionsList" @complete="searchMetaAnalyzesScoreSets">
                            <template #item="slotProps">
                              {{ slotProps.item.urn }}: {{ slotProps.item.title }}
                            </template>
                          </AutoComplete>
                          <label :for="$scopedId('input-metaAnalyzesScoreSets')">Meta-analysis for</label>
                        </span>
                        <span v-if="validationErrors.metaAnalyzesScoreSetUrns" class="mave-field-error">{{
                          validationErrors.metaAnalyzesScoreSetUrns }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-end mavedb-wizard-step-controls pt-4">
                  <Button label="Next" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="showNextWizardStepIfValid(showNextWizardStep)" />
                </div>
              </div>
            </template>
          </StepperPanel>
          <StepperPanel>
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Score set information</span>
              </button>
            </template>
            <template #content="{prevCallback: showPreviousWizardStep, nextCallback: showNextWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row" v-if="experiment">
                  <div class="mavedb-wizard-content-pane">
                    <Message severity="info">
                      Some fields were autopopulated based on the selected experiment and should be inspected to ensure they
                      are still relevant to this score set.
                    </Message>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>A short title for the score set, to be displayed at the top of the score set's own page.</label>
                    <div class="mavedb-help-small">
                      Examples: CBS low-B6 imputed and refined, NUDT15 protein stability assay, Arrestin-1 binding,
                      SpCas9 positive selection
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <span class="p-float-label">
                      <InputText v-model="title" :id="$scopedId('input-title')"/>
                      <label :for="$scopedId('input-title')">Title</label>
                    </span>
                    <span v-if="validationErrors.title" class="mave-field-error">{{ validationErrors.title }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>
                      A high-level description of the score set in one or two sentences, to be displayed in search results.
                    </label>
                    <div class="mavedb-help-small">
                      Example: A Deep Mutational Scan of the human cystathionine-beta-synthase (CBS) using functional
                      complementation in yeast via DMS-TileSeq at low levels of Vitamin B6.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <span class="p-float-label">
                      <Textarea v-model="shortDescription" :id="$scopedId('input-shortDescription')" rows="4"/>
                      <label :for="$scopedId('input-shortDescription')">Short description</label>
                    </span>
                    <span v-if="validationErrors.shortDescription" class="mave-field-error">{{
                      validationErrors.shortDescription }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>
                      The motivation for and approach of the score set.
                    </label>
                    <div class="mavedb-help-small">
                      May be formatted using <a target="_blank" href="https://daringfireball.net/projects/markdown/syntax">Markdown</a>.
                      It is common for a score set to have the same abstract text as the experiment that it belongs to.
                      The focus should be on the MAVE data, rather than the full research contribution, so use your judgement
                      when deciding what details are relevant.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <TabView>
                      <TabPanel header="Edit">
                        <span class="p-float-label">
                          <Textarea v-model="abstractText" :id="$scopedId('input-abstractText')" rows="10" />
                          <label :for="$scopedId('input-abstractText')">Abstract</label>
                        </span>
                      </TabPanel>
                      <TabPanel header="Preview">
                        <div class="mavedb-wizard-rendered-markdown" v-html="markdownToHtml(abstractText)"></div>
                      </TabPanel>
                    </TabView>
                    <span v-if="validationErrors.abstractText" class="mave-field-error">{{ validationErrors.abstractText
                    }}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>
                      A condensed description of the data analysis, starting from raw sequence data,
                      suitable for a specialist audience of MAVE researchers.
                    </label>
                    <div class="mavedb-help-small">
                      May be formatted using <a target="_blank" href="https://daringfireball.net/projects/markdown/syntax">Markdown</a>.
                      Should include:
                      <ul>
                        <template v-if="isMetaAnalysis">
                          <li>a description of how the scores in this score set were generated from the data in the analyzed score sets, and</li>
                        </template>
                        <template v-else>
                          <li>a description of how scores were generated from raw data, including any normalization,</li>
                          <li>the sequence read filtering approach used,</li>
                          <li>details of how replicates were combined (if applicable), and</li>
                        </template>
                        <li>a description of any additional data columns included in the score and count tables, including column naming conventions.</li>
                      </ul>
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <TabView>
                      <TabPanel header="Edit">
                        <span class="p-float-label">
                          <Textarea v-model="methodText" :id="$scopedId('input-methodText')" rows="10" />
                          <label :for="$scopedId('input-methodText')">Methods</label>
                        </span>
                      </TabPanel>
                      <TabPanel header="Preview">
                        <div class="mavedb-wizard-rendered-markdown" v-html="markdownToHtml(methodText)"></div>
                      </TabPanel>
                    </TabView>
                    <span v-if="validationErrors.methodText" class="mave-field-error">{{ validationErrors.methodText }}</span>
                  </div>
                </div>
                <div v-if="itemStatus == 'NotLoaded' || this.item.private == true">
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        The license under which the data in the score set is made available to the public.
                      </label>
                      <div class="mavedb-help-small">
                        For more on data licensing in MaveDB, see the
                        <a target="_blank" :href="`${config.appBaseUrl}/docs/mavedb/data_licensing.html#data-licensing`">documentation</a>.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Dropdown v-model="licenseId" :id="$scopedId('input-targetLicenseId')" :options="licenses"
                          optionLabel="longName" optionValue="id" style="min-width: 500px"/>
                        <label :for="$scopedId('input-targetLicenseId')">License</label>
                      </span>
                      <Message v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName != 'CC0'"
                        severity="warn">
                        Choosing a license with these restrictions may cause your score set to be excluded from data federation
                        and aggregation by MaveDB collaborators.
                      </Message>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      Would you like to define any additional restrictions governing the usage of data within this score set?
                    </div>
                    <div class="mavedb-wizard-content">
                      <InputSwitch v-model="hasCustomUsagePolicy" :aria-labelledby="$scopedId('input-has-custom-usage-policy')" />
                      <div class="mavedb-switch-value">{{ hasCustomUsagePolicy ? 'Yes, I would like to define additional usage guidelines' : 'No, I do not need to define additional usage guidenlines' }}</div>
                    </div>
                  </div>
                  <div v-if="hasCustomUsagePolicy"
                    class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Any additional guidelines governing the usage of the data in this score set.
                      </label>
                      <div class="mavedb-help-small">
                        This may assert, for example, the original author's right to publish the data first.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Textarea v-model="dataUsagePolicy" :id="$scopedId('input-dataUsagePolicy')" rows="4" />
                        <label :for="$scopedId('input-dataUsagePolicy')">Data usage guidelines</label>
                      </span>
                      <span v-if="validationErrors.dataUsagePolicy" class="mave-field-error">{{
                        validationErrors.dataUsagePolicy }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Contributors who may edit this score set. Enter each contributor's
                        <a href="https://orcid.org" target="_blank">ORCID</a> ID and confirm their name.
                      </label>
                      <div class="mavedb-help-small">
                        Examples: 1111-1111-1111-1111
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Chips
                          ref="contributorsInput"
                          v-model="contributors"
                          :id="$scopedId('input-contributors')"
                          :addOnBlur="true"
                          :allowDuplicate="false"
                          placeholder="Type or paste ORCID IDs here."
                          @add="newContributorsAdded"
                          @keyup.escape="clearContributorSearch"
                        >
                          <template #chip="slotProps">
                            <div>
                              <div v-if="slotProps.value.givenName || slotProps.value.familyName">{{ slotProps.value.givenName }} {{ slotProps.value.familyName }} ({{ slotProps.value.orcidId }})</div>
                              <div v-else>{{ slotProps.value.orcidId }}</div>
                            </div>
                          </template>
                        </Chips>
                        <label :for="$scopedId('input-contributors')">Contributors</label>
                      </span>
                      <span v-if="validationErrors.contributors" class="mave-field-error">{{validationErrors.contributors}}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-doiIdentifiers')">
                        The DOIs of any digital resources associated with the score set.
                      </label>
                      <div class="mavedb-help-small">
                        Please note: If you would like to associate publications with this score set via their DOI, please do not do so here.
                        Instead, use the publication identifiers field below.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Chips
                            v-model="doiIdentifiers"
                            :id="$scopedId('input-doiIdentifiers')"
                            :addOnBlur="true"
                            :allowDuplicate="false"
                            @add="acceptNewDoiIdentifier"
                        >
                          <template #chip="slotProps">
                            <div>
                              <div>{{ slotProps.value.identifier }}</div>
                            </div>
                          </template>
                        </Chips>
                        <label :for="$scopedId('input-doiIdentifiers')">DOI identifiers</label>
                      </span>
                      <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{validationErrors.doiIdentifiers}}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Any publications associated with the score set.
                        You can search for publications to add by DOI, PubMed ID, bioRxiv ID, or medRxiv ID.
                      </label>
                      <div class="mavedb-help-small">
                        Example searches: https://doi.org/10.1038/s41467-023-43041-4 (DOI as link), 10.1038/s41467-023-43041-4 (DOI),
                        38057330 (a Pubmed ID), 2022.06.10.22276179 (a bioRxiv or medRxiv ID)
                      </div>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <AutoComplete
                            ref="publicationIdentifiersInput"
                            v-model="publicationIdentifiers"
                            :id="$scopedId('input-publicationIdentifiers')"
                            :multiple="true"
                            :suggestions="publicationIdentifierSuggestionsList"
                            @complete="searchPublicationIdentifiers"
                            @item-select="acceptNewPublicationIdentifier"
                            @keyup.escape="clearPublicationIdentifierSearch"
                            option-label="identifier"
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
                        <label :for="$scopedId('input-publicationIdentifiers')">Publication identifiers</label>
                      </span>
                      <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{validationErrors.publicationIdentifiers}}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row" v-if="publicationIdentifiers.length > 1">
                    <div class="mavedb-wizard-help">
                      <label>
                        Of the above publications, the primary publication that describes the score set.
                      </label>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Multiselect ref="primaryPublicationIdentifiersInput" v-model="primaryPublicationIdentifiers"
                          :id="$scopedId('input-primaryPublicationIdentifiers')" :options="publicationIdentifiers"
                          optionLabel="identifier" placeholder="Select a primary publication (Where the dataset is described)"
                          :selectionLimit="1" style="width: 100%;">
                          <template #option="slotProps">
                            <div class="field">
                              <div>Title: {{ slotProps.option.title }}</div>
                              <div>DOI: {{ slotProps.option.doi }}</div>
                              <div>Identifier: {{ slotProps.option.identifier }}</div>
                              <div>Database: {{ slotProps.option.dbName }}</div>
                            </div>
                          </template>
                        </Multiselect>
                        <label :for="$scopedId('input-primaryPublicationIdentifiers')">Primary publication</label>
                      </span>
                      <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{
                        validationErrors.primaryPublicationIdentifiers }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        Any additional metadata about the score set, as a JSON file.
                      </label>
                    </div>
                    <div class="mavedb-wizard-content field">
                    <span class="p-float-label">
                      <FileUpload :id="$scopedId('input-extraMetadataFile')" :auto="false" chooseLabel="Extra metadata"
                        :class="inputClasses.extraMetadataFile" :customUpload="true" :fileLimit="1"
                        :showCancelButton="false" :showUploadButton="false" @remove="fileCleared('extraMetadataFile')"
                        @select="fileSelected('extraMetadataFile', $event)">
                        <template #empty>
                          <p>Upload a JSON file here.</p>
                        </template>
                      </FileUpload>
                    </span>
                    <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{ validationErrors.extraMetadata
                    }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="showPreviousWizardStep" />
                  <Button label="Next" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="showNextWizardStepIfValid(showNextWizardStep)" />
                </div>
              </div>
            </template>
          </StepperPanel>

          <StepperPanel v-if="itemStatus == 'NotLoaded' || this.item.private">
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Targets</span>
              </button>
            </template>
            <template #content="{prevCallback: showPreviousWizardStep, nextCallback: showNextWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="$scopedId('input-scoreSetIsSequenceBasedLabel')">Will you be uploading the target sequences used for your assay?</label>
                    <div class="mavedb-help-small">
                      The target sequence is the sequence that was mutagenized to create the variant library, such as in a cDNA-based deep mutational scan.
                      If your variants were generated by editing the genome directly (e.g., using saturation genome editing or base editing), you should provide
                      an Ensembl or RefSeq accession instead of uploading the target locus sequence as your own target.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <InputSwitch v-model="isTargetSequence" :aria-labelledby="$scopedId('input-scoreSetIsSequenceBasedLabel')" />
                    <div class="mavedb-switch-value">{{ isTargetSequence ? 'Yes, variants are described relative to a target sequence.' : 'No, variants are described relative to a RefSeq or Ensembl accession (either a transcript or chromosome).' }}</div>
                  </div>
                </div>

                <div v-if="!isTargetSequence" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="$scopedId('input-isBaseEditorData')">Does this score set reperesent base editor data?</label>
                    <div class="mavedb-help-small">
                      Base editor data is a type of functional assay that is similar in many respects to MAVE data. When uploading base editor data, you must
                      also include a 'guide_sequence' column in your uploaded scores (and counts) file(s).
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <InputSwitch v-model="isBaseEditor" :aria-labelledby="$scopedId('input-isBaseEditorData')"/>
                    <div class="mavedb-switch-value">{{ isBaseEditor ? 'Yes, this score set represents base editor data.' : 'No, this score set does not represent base editor data.' }}</div>
                  </div>
                </div>

                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="$scopedId('input-scoreSetHasMultipleTargetsLabel')">Does this score set describe variants with respect to more than one target?</label>
                    <div class="mavedb-help-small">
                      Some experiments might describe variants against two or more distinct target sequences. If this is the case, your variants will need to be described explicitly
                      from the target they came from.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <InputSwitch v-model="isMultiTarget" :aria-labelledby="$scopedId('input-scoreSetHasMultipleTargetsLabel')" />
                    <div class="mavedb-switch-value">{{ isMultiTarget ? 'Yes, variants are described relative to multiple target sequences.' : 'No, variants are described relative to a single target sequence.' }}</div>
                  </div>
                </div>

                <div v-if="isMultiTarget" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>How many targets will be included with this score set?</label>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <span class="p-float-label">
                      <InputNumber v-model="numTargets"
                            :id="$scopedId(`input-numTargets`)" buttonLayout="stacked" :min="isMultiTarget ? 2 : 1"
                            showButtons suffix=" targets" />
                      <label :for="$scopedId(`input-numTargets`)">Targets</label>
                    </span>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="showPreviousWizardStep" />
                  <Button label="Next" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="showNextWizardStepIfValid(showNextWizardStep)" />
                </div>
              </div>
            </template>
          </StepperPanel>

          <!-- Annoyingly, `idx in numTargets` is 1-indexed. -->
          <StepperPanel v-for="(targetNum, targetIdx) in numTargets" :key="targetIdx">
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Target {{ targetNum }}</span>
              </button>
            </template>
            <template #content="{prevCallback: showPreviousWizardStep, nextCallback: showNextWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div v-if="isTargetSequence" class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>Copy target from a previously created target</label>
                    <div class="mavedb-help-small">
                      Use this autocomplete field to find an existing target from one of your published or unpublished score sets in MaveDB and fill this target with its metadata. You'll still be able to edit any fields below.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                    <span class="p-float-label">
                    <AutoComplete ref="existingTargetGeneInput" v-model="createdTargetGenes[targetIdx].autofilledTargetGene"
                      :id="$scopedId('input-existingTargetGene')" field="name" :forceSelection="true"
                      :suggestions="targetGeneSuggestionsList" @complete="searchTargetGenes" @item-select="autofillFromExistingTarget($event, targetIdx)">
                      <template #item="slotProps">
                        <div>
                            <div>Name: {{ slotProps.item.name }}</div>
                            <div>Category: {{ textForTargetGeneCategory(slotProps.item.category) }}</div>
                            <div v-for="externalIdentifier of slotProps.item.externalIdentifiers" :key=externalIdentifier.identifier>
                              {{ externalIdentifier.identifier.dbName }}: {{ externalIdentifier.identifier.identifier }}, Offset: {{ externalIdentifier.offset }}
                            </div>
                        </div>
                      </template>
                    </AutoComplete>
                    <label :for="$scopedId('input-existingTargetGene')">Copy from an existing target</label>
                    </span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label>The name of the target</label>
                    <div class="mavedb-help-small">
                      This name will be used to identify the target on the score set page and can be used to autofill from this target in the future.
                      Most users choose to name this target after the associated gene, if applicable.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <InputText v-model="createdTargetGenes[targetIdx].targetGene.name" :id="$scopedId('input-targetGeneName')" style="width: 100%" />
                        <label :for="$scopedId('input-targetGeneName')">Target name</label>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.name`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.name`] }}</span>
                  </div>
                </div>

                <div v-if="isTargetSequence">
                  <div v-if="numTargets > 1" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>The label of the target</label>
                      <div class="mavedb-help-small">
                        This label is what you use in your variants file to indicate which of your targets the variant is described relative to.
                        Because it is used with MAVE-HGVS strings, it may not contain any spaces or colons.
                      </div>
                    </div>
                      <div class="mavedb-wizard-content field">
                        <span class="p-float-label">
                          <InputText v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.label" :id="$scopedId('input-targetGeneLabel')" style="width: 100%"/>
                          <label :for="$scopedId('input-targetGeneLabel')">Target label</label>
                        </span>
                        <span v-if="validationErrors[`targetGene.${targetIdx}.targetSequence.label`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetSequence.label`] }}</span>
                    </div>
                  </div>

                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneCategory')">The functional category of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <span class="p-float-label">
                          <SelectButton v-model="createdTargetGenes[targetIdx].targetGene.category" :id="$scopedId('input-targetGeneCategory')"
                            :options="targetGeneCategories" :optionLabel="textForTargetGeneCategory" />
                        </span>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.category`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.category`] }}</span>
                    </div>
                  </div>

                  <div class="mavedb-wizard-row" v-for="dbName of externalGeneDatabases" :key="dbName">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId(`input-targetGeneExternalDatabase${dbName}Label`)">Link this target to a {{dbName}} accession</label>
                      <!-- only display this verbose help on the first of the external gene database selections. -->
                      <div class="mavedb-help-small" v-if="dbName === externalGeneDatabases[0]">
                        If the target sequence provided to MaveDB starts partway through the linked sequence (such as an assay targeting a single functional domain),
                        the target should also have an “offset”. The offset is the integer value that should be added to the MaveDB coordinates (which are relative
                        to the target sequence) in order to match the coordinates in the linked sequence.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <InputSwitch v-model="createdTargetGenes[targetIdx].linkedAccessions[dbName]" :aria-labelledby="$scopedId(`input-targetGeneExternalDatabase${dbName}Label`)" />
                      <div class="mavedb-switch-value">{{ createdTargetGenes[targetIdx].linkedAccessions[dbName] ? `Yes, link this target to a ${dbName} accession.` : `No, do not link this target to a ${dbName} accession.` }}</div>
                      <div class="mavedb-wizard-subcontent field-columns" v-if="createdTargetGenes[targetIdx].linkedAccessions[dbName]">
                          <div class="p-float-label field-column">
                            <AutoComplete style="width: 100%;"
                                v-model="createdTargetGenes[targetIdx].targetGene.externalIdentifiers[dbName].identifier"
                                :id="$scopedId(`input-${dbName.toLowerCase()}Identifier`)" field="identifier"
                                :suggestions="targetGeneIdentifierSuggestionsList[dbName]" :forceSelection="false"
                                @complete="searchTargetGeneIdentifiers(dbName, $event)"
                                @change="addDefaultOffset(dbName, targetIdx); externalIdentifierTextToObject(dbName, targetIdx, $event)"
                              />
                            <label :for="$scopedId(`input-${dbName.toLowerCase()}Identifier`)">{{ dbName }} identifier</label>
                          </div>
                          <span class="p-float-label">
                            <InputNumber v-model="createdTargetGenes[targetIdx].targetGene.externalIdentifiers[dbName].offset"
                              :id="$scopedId(`input-${dbName.toLowerCase()}Offset`)" buttonLayout="stacked" :min="0"
                              showButtons suffix=" bp" />
                            <label :for="$scopedId(`input-${dbName.toLowerCase()}Offset`)">Offset</label>
                          </span>
                        </div>
                        <span v-if="validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}`] }}</span>
                        <span v-if="validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}.identifier`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}.identifier`] }}</span>
                        <span v-if="validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}.offset`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.externalIdentifiers.${dbName}.offset`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneTaxonomyLabel')">The taxonomy group to which this target belongs</label>
                      <div class="mavedb-help-small">
                        For more details about taxonomy, see the <a target="_blank" href="https://www.ncbi.nlm.nih.gov/books/NBK53758/">NCBI taxonomy help page.</a>
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <AutoComplete
                          ref="taxonomyInput"
                          v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.taxonomy"
                          dropdown
                          :id="$scopedId('input-targetGeneTaxonomyLabel')"
                          :suggestions="taxonomySuggestionsList"
                          field="organismName"
                          forceSelection
                          :multiple="false"
                          :options="taxonomies"
                          @complete="searchTaxonomies"
                          @keyup.escape="clearTaxonomySearch"
                          style="width: 100%;"
                        >
                          <template #item="slotProps">
                            {{slotProps.item.taxId}} - {{slotProps.item.organismName}} <template v-if="slotProps.item.commonName!=='NULL' && slotProps.item.commonName!== null">/ {{slotProps.item.commonName}}</template>
                          </template>
                        </AutoComplete>
                        <label :for="$scopedId('input-targetGeneTaxonomyLabel')">Taxonomy</label>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetSequence.taxonomy`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetSequence.taxonomy`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneSequenceTypeLabel')">The sequence type of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <SelectButton v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.sequenceType"
                          :id="$scopedId('input-targetGeneSequenceType')" :options="sequenceTypes" />
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetSequence.sequenceType`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetSequence.sequenceType`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneSequenceFileLabel')">The sequence of the target</label>
                      <div class="mavedb-help-small">
                        Variants will be validated against this sequence. Note that the first position in the sequence is numbered as position 1 when validating variants.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <FileUpload ref="sequenceFileUpload"
                          :id="$scopedId('input-targetGeneSequenceFileLabel')" :auto="false"
                          chooseLabel="Reference sequence" :class="inputClasses.targetGeneTargetSequenceSequenceFile"
                          :customUpload="true" :fileLimit="1" :showCancelButton="false" :showUploadButton="false"
                          @remove="fileCleared('targetGeneTargetSequenceSequenceFile', targetIdx)"
                          @select="fileSelected('targetGeneTargetSequenceSequenceFile', $event, targetIdx)" >
                          <template #empty>
                            <div v-if="createdTargetGenes[targetIdx].targetGene.targetSequence.sequence != null" >
                              <Textarea v-model="createdTargetGenes[targetIdx].targetGene.targetSequence.sequence" rows=5 disabled style="width:100%; max-width:60em; word-wrap:break-word; font-family: monospace;" />
                              <small>This sequence was set by the autofilled target. To use a different sequence, upload a new FASTA file.</small>
                            </div>
                            <div v-else>
                              <p>Drop a <a target="_blank" href="https://blast.ncbi.nlm.nih.gov/doc/blast-topics/#fasta">FASTA</a> file here</p>
                            </div>
                          </template>
                        </FileUpload>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetSequence.sequence`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetSequence.sequence`] }}</span>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetDescribesChromosomeLabel')">Does this target represent a whole chromosome?</label>
                      <div class="mavedb-help-small">
                        Some score sets might describe variants relative to an entire chromosome, while others will describe variants relative to a
                        RefSeq or Ensembl accession representing a gene.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <InputSwitch v-model="createdTargetGenes[targetIdx].isRelativeToChromosome" :aria-labelledby="$scopedId('input-targetDescribesChromosomeLabel')" @change="refreshAccessionOptions(targetIdx)" />
                      <div class="mavedb-switch-value">{{ createdTargetGenes[targetIdx].isRelativeToChromosome ? 'Yes, this target represents an entire chromosome.' : 'No, this target represents a gene.' }}</div>
                    </div>
                  </div>
                  <div v-if="createdTargetGenes[targetIdx].isRelativeToChromosome" class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneAssemblyLabel')">The assembly for this accession</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <!-- Assembly is the reference genome property in coordinate cases -->
                        <Dropdown v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.assembly" :aria-labelledby="$scopedId('input-targetGeneAssemblyLabel')" :options="assemblies" style="width: 100%" @change="refreshAccessionOptions(targetIdx)"/>
                        <label :for="$scopedId('input-targetGeneAssemblyLabel')">Assembly</label>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetAccession.assembly`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetAccession.assembly`] }}</span>
                    </div>
                  </div>
                  <div v-else class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneGeneNameLabel')">The gene name for this accession</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <Dropdown v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.gene" :id="$scopedId('input-targetGeneGeneNameLabel')"
                            :options="geneNamesAsObject" optionLabel="name" filter
                            :virtualScrollerOptions="{ itemSize: 50 }" @change="autofillGeneName($event, targetIdx)" style="width: 100%"/>
                          <label :for="$scopedId('input-targetGeneGeneNameLabel')">HGNC Name</label>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetAccession.gene`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetAccession.gene`] }}</span>
                    </div>
                  </div>

                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneAccessionLabel')">The accession identifier for this target</label>
                      <div class="mavedb-help-small">
                        This will be the sequence that your variants are described against. It may be a RefSeq or Ensemble identifier. Available accessions matching the
                        {{ createdTargetGenes[targetIdx].isRelativeToChromosome ? "assembly" : "gene name" }} will be displayed once one is selected.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <AutoComplete v-model="createdTargetGenes[targetIdx].targetGene.targetAccession.accession"
                          :id="$scopedId('input-targetGeneAccessionLabel')"
                          :suggestions="targetGeneAccessionSuggestionsList" :force-selection="true" :dropdown="true"
                          @complete="fetchTargetAccessions($event)" style="width: 100%"/>
                        <label :for="$scopedId('input-targetGeneAccessionLabel')"> Accession Identifier </label>
                      </span>
                      <div v-if="createdTargetGenes[targetIdx].targetGene.targetAccession.accession && !createdTargetGenes[targetIdx].targetGene.targetAccession.accession?.startsWith('NP')" class="mavedb-wizard-subcontent">
                        <Button @click="swapNucleotideProteinAccessions(targetIdx)" icon="pi pi-arrows-h"
                          label="Switch to Protein Accession" severity="info" />
                      </div>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.targetAccession.accession`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.targetAccession.accession`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-targetGeneCategoryLabel')">The genetic category of the target</label>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <span class="p-float-label">
                          <SelectButton v-model="createdTargetGenes[targetIdx].targetGene.category" :id="$scopedId('input-targetGeneCategoryLabel')"
                            :options="targetGeneCategories" :optionLabel="textForTargetGeneCategory" />
                        </span>
                      </span>
                      <span v-if="validationErrors[`targetGene.${targetIdx}.category`]" class="mave-field-error">{{ validationErrors[`targetGene.${targetIdx}.category`] }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="showPreviousWizardStep" />
                  <Button label="Next" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="showNextWizardStepIfValid(showNextWizardStep)" />
                </div>
              </div>
            </template>
          </StepperPanel>

          <StepperPanel v-if="itemStatus == 'NotLoaded' || this.item.private" header="Score Ranges">
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Score Ranges</span>
              </button>
            </template>
            <template #content="{prevCallback: showPreviousWizardStep, nextCallback: showNextWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="$scopedId('input-investigatorIsProvidingScoreRanges')">Will you be providing score ranges for this score set?</label>
                    <div class="mavedb-help-small">
                      Score ranges provide additional clinical context to the scores you upload. If you provide score ranges, you may
                      classify each range as having either normal, abnormal, or an unspecified function. If you provide a range with normal
                      function, you should also provide a baseline score that falls within the normal range. This score is the expected
                      score for baseline variants.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <InputSwitch v-model="investigatorIsProvidingScoreRanges" :aria-labelledby="$scopedId('input-investigatorIsProvidingScoreRanges')" />
                    <div class="mavedb-switch-value">{{ investigatorIsProvidingScoreRanges ? 'Yes, I will be providing score range data.' : 'No, I will not be providing score range data.' }}</div>
                  </div>
                </div>
                <div v-if="investigatorIsProvidingScoreRanges">
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId('input-investigatorProvidedBaselineScore')">What is the baseline score for this score set?</label>
                      <div class="mavedb-help-small">
                        This number should be within the range of normal scores for your score data.
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <InputNumber v-model="scoreRanges.investigatorProvided.baselineScore" :aria-labelledby="$scopedId('input-investigatorProvidedBaselineScore')" style="width:100%;" :minFractionDigits="1" :maxFractionDigits="10" />
                        <label :for="$scopedId('input-investigatorProvidedBaselineScore')"> Baseline Score </label>
                      </span>
                      <span v-if="validationErrors[`scoreRanges.investigatorProvided.baselineScore`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.baselineScore`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label :id="$scopedId(`input-investigatorProvidedBaselineScoreDescription`)">Enter an (optional) description for the baseline score</label>
                      <div class="mavedb-help-small">
                        This description should provide additional details about the baseline score if necessary. e.g., "median synonymous value of the 95% of variants around the mean, normalized to 0."
                      </div>
                    </div>
                    <div class="mavedb-wizard-content">
                      <span class="p-float-label">
                        <Textarea v-model="scoreRanges.investigatorProvided.baselineScoreDescription" :aria-labelledby="$scopedId(`input-investigatorProvidedBaselineScoreDescription`)" autoResize rows="5" style="width:100%;" />
                        <label :for="$scopedId(`input-investigatorProvidedBaselineScoreDescription`)"> Baseline Score Description </label>
                      </span>
                      <span v-if="validationErrors[`scoreRanges.investigatorProvided.baselineScoreDescription`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.baselineScoreDescription`] }}</span>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row" v-if="publicationIdentifiers.length">
                    <div class="mavedb-wizard-help">
                      <label>
                        Of the previously provided publications, optionally select a publication to use as the source of the score ranges.
                      </label>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Multiselect ref="investigatorProvidedScoreRangesPublicationIdentifiersInput" v-model="scoreRanges.investigatorProvided.source"
                          :id="$scopedId('input-investigatorProvidedScoreRangesPublicationIdentifiersInput')" :options="publicationIdentifiers"
                          optionLabel="identifier" placeholder="Select a source for the score ranges."
                          :selectionLimit="1" style="width: 100%;">
                          <template #option="slotProps">
                            <div class="field">
                              <div>Title: {{ slotProps.option.title }}</div>
                              <div>DOI: {{ slotProps.option.doi }}</div>
                              <div>Identifier: {{ slotProps.option.identifier }}</div>
                              <div>Database: {{ slotProps.option.dbName }}</div>
                            </div>
                          </template>
                        </Multiselect>
                        <label :for="$scopedId('input-investigatorProvidedScoreRangesPublicationIdentifiersInput')">Score range source (optional)</label>
                      </span>
                      <span v-if="validationErrors[`scoreRanges.investigatorProvided.source`]" class="mave-field-error">{{
                        validationErrors[`scoreRanges.investigatorProvided.source`] }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="investigatorIsProvidingScoreRanges">
                  <div v-for="(rangeObj, rangeIdx) in scoreRanges.investigatorProvided.ranges" :key="rangeIdx">
                    <div class="mavedb-wizard-row">
                      <div class="mavedb-wizard-content">
                        <div>
                          Score Range {{  rangeIdx + 1 }}
                          <Button label="Remove" severity="danger" icon="pi pi-times" style="float:right;" @click="removeScoreRange(rangeIdx)"></Button>
                        </div>
                        <hr>
                        <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}`] }}</span>
                      </div>
                    </div>
                    <div class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)">Enter a label for this score range</label>
                        <div class="mavedb-help-small">
                          This label will be used to describe this range on visualizations of this score data.
                        </div>
                      </div>
                      <div class="mavedb-wizard-content">
                        <span class="p-float-label">
                          <InputText v-model="rangeObj.value.label" :aria-labelledby="$scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)" style="width:100%;" />
                          <label :for="$scopedId(`input-investigatorProvidedRangeLabel-${rangeIdx}`)"> Score range label </label>
                        </span>
                        <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.label`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.label`] }}</span>
                      </div>
                    </div>
                    <div class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)">Enter an (optional) description for this score range</label>
                        <div class="mavedb-help-small">
                          This description should provide additional details about this score range if necessary.
                        </div>
                      </div>
                      <div class="mavedb-wizard-content">
                        <span class="p-float-label">
                          <Textarea v-model="rangeObj.value.description" :aria-labelledby="$scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)" autoResize rows="5" style="width:100%;" />
                          <label :for="$scopedId(`input-investigatorProvidedRangeDescription-${rangeIdx}`)"> Score range description </label>
                        </span>
                        <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.description`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.description`] }}</span>
                      </div>
                    </div>
                    <div class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId(`input-investigatorProvidedRangeClassification-${rangeIdx}`)">How should this range be classified?</label>
                        <div class="mavedb-help-small">
                          You may classify a range as having either normal, abnormal, or an unspecified function.
                        </div>
                      </div>
                      <div class="mavedb-wizard-content">
                          <SelectButton v-model="rangeObj.value.classification" :id="$scopedId(`input-investigatorProvidedRangeClassification-${rangeIdx}`)"
                          :options="rangeClassifications" optionLabel="label" optionValue="value" />
                          <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.classification`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.classification`] }}</span>
                      </div>
                    </div>
                    <div class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId(`input-investigatorProvidedRangeBoundaries-${rangeIdx}`)">What are the upper and lower bounds of this score range?</label>
                        <div class="mavedb-help-small">
                          The lower bound is inclusive while the upper bound is exclusive of the provided value. Score range boundaries should not overlap with the boundaries
                          of other score ranges. If a range does not have an upper or lower bound, the value will be treated as either positive or negative infinity.
                        </div>
                      </div>
                      <div class="mavedb-wizard-content">
                          <InputGroup>
                            <span class=p-float-label>
                              <InputText v-model="rangeObj.value.range[0]" :aria-labelledby="$scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)" :disabled="rangeObj.infiniteLower"/>
                              <label :for="$scopedId(`input-investigatorProvidedRangeLower-${rangeIdx}`)"> {{ rangeObj.infiniteLower ? "-infinity" : "Lower Bound" }} </label>
                            </span>
                            <InputGroupAddon>to</InputGroupAddon>
                            <span class=p-float-label>
                              <InputText v-model="rangeObj.value.range[1]" :aria-labelledby="$scopedId(`input-investigatorProvidedRangeUpper-${rangeIdx}`)" :disabled="rangeObj.infiniteUpper"/>
                              <label :for="$scopedId(`input-investigatorProvidedRangeUpper-${rangeIdx}`)"> {{ rangeObj.infiniteUpper ? "infinity" : "Upper Bound" }} </label>
                            </span>
                          </InputGroup>
                          <span>
                            <Checkbox :binary="true" v-model="rangeObj.infiniteLower" inputId="lowerBound" name="lower" @change="boundaryLimitUpdated(rangeIdx, 'lower')"/>
                            <label for="lowerBound" class="ml-2"> No lower bound </label>
                          </span>
                          <span style="float:right;">
                            <label for="upperBound" class="ml-2"> No upper bound </label>
                            <Checkbox :binary="true" v-model="rangeObj.infiniteUpper" inputId="upperBound" name="upper" @change="boundaryLimitUpdated(rangeIdx, 'upper')"/>
                          </span>
                          <span style="float:left;" v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.range`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.range`] }}</span>
                      </div>
                    </div>
                    <div v-if="rangeObj.value.classification === 'normal' || rangeObj.value.classification === 'abnormal'" class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId('input-investigatorIsProvidingOddsPath')">Will you be providing odds of pathogenicity (OddsPath) ratios for this score range?</label>
                        <div class="mavedb-help-small">
                          An OddsPath calculation can be determined by evaluating previously classified control variants against the scores in normal and abnormal ranges for an assay.
                          For additional information about OddsPath, please see <a href="https://pubmed.ncbi.nlm.nih.gov/31892348/">PubMed 31892348</a>.
                        </div>
                      </div>
                      <div class="mavedb-wizard-content">
                        <InputSwitch v-model="rangeObj.isProvidingOddsPath" :aria-labelledby="$scopedId('input-investigatorIsProvidingOddsPath')" />
                        <div class="mavedb-switch-value">{{ rangeObj.isProvidingOddsPath ? 'Yes, I will be providing OddsPath data for this score range.' : 'No, I will not be providing OddsPath data for this score range.' }}</div>
                      </div>
                    </div>
                    <div v-if="rangeObj.isProvidingOddsPath" class="mavedb-wizard-row">
                      <div class="mavedb-wizard-help">
                        <label :id="$scopedId('input-investigatorProvidedOddsPathRatio')">What is the OddsPath ratio and evidence strength for this score range?</label>
                      </div>
                      <div class="mavedb-wizard-content">
                        <InputGroup>
                          <span class=p-float-label style="margin-right: 1em;">
                            <InputNumber v-model="rangeObj.value.oddsPath.ratio" :aria-labelledby="$scopedId('input-investigatorProvidedOddsPathRatio')" style="width:50%;" :minFractionDigits="1" :maxFractionDigits="10" />
                            <label :for="$scopedId('input-oddsPathRatio')"> OddsPath Normal </label>
                          </span>
                          <span class=p-float-label>
                            <Dropdown v-model="rangeObj.value.oddsPath.evidence" :aria-labelledby="$scopedId('input-investigatorProvidedOddsPathEvidence')" style="width:50%;" :options="evidenceStrengths[rangeObj.value.classification].concat(evidenceStrengths.indeterminate)"></Dropdown>
                            <label :for="$scopedId('input-investigatorProvidedOddsPathEvidence')"> OddsPath Evidence Strength (optional) </label>
                          </span>
                        </InputGroup>
                        <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.ratio`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.ratio`] }}</span>
                        <span v-if="validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.evidence`]" class="mave-field-error">{{ validationErrors[`scoreRanges.investigatorProvided.ranges.${rangeIdx}.oddsPath.evidence`] }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="mavedb-wizard-row">
                    <div class="mavedb-wizard-content">
                      <Button label="Add another range" icon="pi pi-plus" style="float:right;" @click="addScoreRange"></Button>
                    </div>
                  </div>
                </div>
                <div class="mavedb-wizard-row" v-if="scoreRanges.investigatorProvided.ranges.some(range => range.isProvidingOddsPath) && publicationIdentifiers.length">
                    <div class="mavedb-wizard-help">
                      <label>
                        Of the previously provided publications, optionally select a publication to use as the source of the OddsPath.
                      </label>
                    </div>
                    <div class="mavedb-wizard-content field">
                      <span class="p-float-label">
                        <Multiselect ref="investigatorProvidedOddsPathPublicationIdentifiersInput" v-model="scoreRanges.investigatorProvided.oddsPathSource"
                          :id="$scopedId('input-investigatorProvidedOddsPathPublicationIdentifiersInput')" :options="publicationIdentifiers"
                          optionLabel="identifier" placeholder="Select a source for the OddsPath calculation."
                          :selectionLimit="1" style="width: 100%;">
                          <template #option="slotProps">
                            <div class="field">
                              <div>Title: {{ slotProps.option.title }}</div>
                              <div>DOI: {{ slotProps.option.doi }}</div>
                              <div>Identifier: {{ slotProps.option.identifier }}</div>
                              <div>Database: {{ slotProps.option.dbName }}</div>
                            </div>
                          </template>
                        </Multiselect>
                        <label :for="$scopedId('input-investigatorProvidedOddsPathPublicationIdentifiersInput')">OddsPath Source (optional)</label>
                      </span>
                      <span v-if="validationErrors[`scoreRanges.investigatorProvided.oddsPathSource`]" class="mave-field-error">{{
                        validationErrors[`scoreRanges.investigatorProvided.oddsPathSource`] }}</span>
                    </div>
                  </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-5">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="showPreviousWizardStep" />
                  <Button label="Next" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="showNextWizardStepIfValid(showNextWizardStep)" />
                </div>
              </div>
            </template>
          </StepperPanel>

          <StepperPanel v-if="itemStatus == 'NotLoaded' || this.item.private" header="Variant scores">
            <template #header="{index, clickCallback}">
              <button class="p-stepper-action" :disabled="maxWizardStepEntered < index || maxWizardStepValidated < index - 1" role="tab" @click="clickCallback">
                <span class="p-stepper-number">{{ index + 1 }}</span>
                <span class="p-stepper-title">Variant scores</span>
              </button>
            </template>
            <template #content="{prevCallback: showPreviousWizardStep}">
              <div class="mavedb-wizard-form">
                <div class="mavedb-wizard-form-content-background"></div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-content">
                    <Message v-if="createdTargetGenes[0]?.targetAccession?.accession" severity="info">
                      When defining variants against an accession based target, uploaded variant coordinates should be fully
                      qualified with respect to target names or target accessions (e.g: NC_000001.1:c.1A>C).
                    </Message>
                    <Message v-else-if="numTargets > 1" severity="info">
                      When defining variants against multiple targets, uploaded variant coordinates should be fully
                      qualified with respect to target names or target accessions.
                    </Message>
                  </div>

                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <div v-if="item">
                      <div>{{ formatInt(item.numVariants) }} variants are included in this score set.</div>
                      <label :id="$scopedId('input-scoresFile')">Load a new scores file to replace existing variants</label>
                    </div>
                    <div v-else>
                      <label :id="$scopedId('input-scoresFile')">Load a scores file</label>
                    </div>
                    <div class="mavedb-help-small">
                      This file is required and should be a CSV file, with each row of the table describing a single variant. For more information about what this file can include and how it should be formatted, please take a look at
                      <a target="_blank" :href="`${config.appBaseUrl}/docs/mavedb/data_formats.html#data-table-formats`">our documentation</a>.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <span class="p-float-label">
                      <FileUpload ref="scoresFileUpload" :id="$scopedId('input-scoresFile')" :auto="false"
                        chooseLabel="Scores file" :class="inputClasses.scoresFile || ''" :customUpload="true" :fileLimit="1"
                        :showCancelButton="false" :showUploadButton="false">
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </span>
                    <span v-if="validationErrors.scoresFile" class="mave-field-error">{{ validationErrors.scoresFile}}</span>
                  </div>
                </div>
                <div class="mavedb-wizard-row">
                  <div class="mavedb-wizard-help">
                    <label :id="$scopedId('input-countsFile')">Load a counts file</label>
                    <div class="mavedb-help-small">
                      This file is optional, but recommended. There are no required columns for your count data, but you should describe the meaning of any columns in your methods section.
                    </div>
                  </div>
                  <div class="mavedb-wizard-content">
                    <span class="p-float-label">
                      <FileUpload ref="countsFileUpload" :id="$scopedId('input-countsFile')" :auto="false"
                        chooseLabel="Counts file" :class="inputClasses.countsFile || ''" :customUpload="true" :fileLimit="1"
                        :showCancelButton="false" :showUploadButton="false">
                        <template #empty>
                          <p>Drop a file here.</p>
                        </template>
                      </FileUpload>
                    </span>
                    <span v-if="validationErrors.countsFile" class="mave-field-error">{{ validationErrors.countsFile}}</span>
                  </div>
                </div>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
                  <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="showPreviousWizardStep" />
                  <Button label="Save" :disabled="this.maxWizardStepValidated < activeWizardStep" icon="pi pi-arrow-right" iconPos="right" @click="item ? saveEditContent() : validateAndSave()" />
                </div>
              </div>
            </template>
          </StepperPanel>
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
import Card from 'primevue/card'
import Chips from 'primevue/chips'
import Checkbox from 'primevue/checkbox'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import Stepper from 'primevue/stepper'
import StepperPanel from 'primevue/stepperpanel'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable'
import {useRestResource} from 'rest-client-vue'
import {ref} from 'vue'

import EntityLink from '@/components/common/EntityLink'
import DefaultLayout from '@/components/layout/DefaultLayout'
import EmailPrompt from '@/components/common/EmailPrompt'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import { TARGET_GENE_CATEGORIES, textForTargetGeneCategory } from '@/lib/target-genes'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import { normalizeDoi, validateDoi} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'
import { NORMAL_RANGE_EVIDENCE, ABNORMAL_RANGE_EVIDENCE, INDETERMINATE_RANGE_EVIDENCE } from '@/lib/ranges'

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
        taxonomy: null,
      },
      targetAccession: {
        accession: null,
        assembly: null,
        gene: null
      },
      externalIdentifiers: _.fromPairs(
        externalGeneDatabases.map((dbName) => [dbName, { identifier: null, offset: null }])
      )
    },
    linkedAccessions: _.fromPairs(
      externalGeneDatabases.map((dbName) => [dbName, false])
    ),
    autofilledTargetGene: null
  }
}

function emptyScoreRangeWizardObj() {
  return {
    value: {
      label: null,
      description: null,
      range: [null, null],
      classification: null,
      oddsPath:{
        ratio: null,
        evidence: null,
      },
    },
    infiniteLower: false,
    infiniteUpper: false,
    isProvidingOddsPath: false,
  }
}

export default {
  name: 'ScoreSetEditor',
  components: {
    AutoComplete,
    Button,
    Card,
    Chips,
    Checkbox,
    Column,
    DataTable,
    DefaultLayout,
    Dropdown,
    EmailPrompt,
    EntityLink,
    FileUpload,
    InputNumber,
    InputSwitch,
    InputText,
    InputGroup,
    InputGroupAddon,
    Message,
    Multiselect,
    ProgressSpinner,
    SelectButton,
    Stepper,
    StepperPanel,
    TabPanel,
    TabView,
    Textarea,
  },

  setup: () => {
    const publicationIdentifierSuggestions = useItems({ itemTypeName: 'publication-identifier-search' })
    const externalPublicationIdentifierSuggestions = useItems({ itemTypeName: 'external-publication-identifier-search' })

    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({ itemTypeName: `${dbName.toLowerCase()}-identifier-search` })
    }

    const licenses = useItems({itemTypeName: 'active-license'})
    const taxonomies = useItems({itemTypeName: 'taxonomy'})
    const taxonomySuggestions = useItems({itemTypeName: 'taxonomy-search'})
    const geneNames = useItems({ itemTypeName: 'gene-names' })
    const assemblies = useItems({ itemTypeName: 'assemblies' })
    const targetGeneSuggestions = useItems({ itemTypeName: 'target-gene-search' })

    return {
      config: config,

      ...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      editableExperiments: ref([]),
      licenses: licenses.items,
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({ text }),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text) => externalPublicationIdentifierSuggestions.setRequestBody({ text }),
      targetGeneSuggestions: targetGeneSuggestions.items,
      setTargetGeneSearch: (text) => targetGeneSuggestions.setRequestBody({ text }),
      targetGeneIdentifierSuggestions: ref({
        ..._.mapValues(targetGeneIdentifierSuggestions, (itemsModule) => itemsModule.items)
      }),
      setTargetGeneIdentifierSearch: _.mapValues(targetGeneIdentifierSuggestions, (itemsModule) =>
        (text) => {
          itemsModule.setRequestBody({ text })
          itemsModule.ensureItemsLoaded()
        }
      ),
      taxonomies: taxonomies.items,
      taxonomySuggestions: taxonomySuggestions.items,
      setTaxonomySearch: (text) => taxonomySuggestions.setRequestBody({text}),
      assemblies: assemblies.items,
      geneNames: geneNames.items,
      textForTargetGeneCategory: textForTargetGeneCategory
    }
  },

  props: {
    experimentUrn: {
      type: String,
      required: false
    },
    itemId: {
      type: String,
      required: false
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
    extraMetadata: {},

    createdTargetGenes: [emptyTargetGeneWizardObj()],
    numTargets: 1,

    assemblySuggestions: [],
    geneNameSuggestions: [],
    accessionSuggestions: [],

    scoreRanges: {
      investigatorProvided: {
        baselineScore: null,
        baselineScoreDescription: null,
        ranges: [],
        oddsPathSource: [],
        source: [],
      }
    },

    // Static sets of options:
    sequenceTypes: [
      'DNA',
      'protein'
    ],
    targetGeneCategories: TARGET_GENE_CATEGORIES,
    rangeClassifications: [
      {value: "normal", label: "Normal"},
      {value: "abnormal", label: "Abnormal"},
      {value: "not_specified", label: "Not Specified"}
    ],
    evidenceStrengths: {
      normal: NORMAL_RANGE_EVIDENCE,
      abnormal: ABNORMAL_RANGE_EVIDENCE,
      indeterminate: INDETERMINATE_RANGE_EVIDENCE,
    },

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null
    },
    externalGeneDatabases,
    validationErrors: {},

    isTargetSequence: true,
    isBaseEditor: false,
    isMultiTarget: false,
    investigatorIsProvidingScoreRanges: false,

    // track this separately, since it is a pain to reconstruct steps from target paths (targetGenes.**step**.rest.of.error.path)
    minTargetGeneStepWithError: Infinity,

    /** The currently active step. */
    activeWizardStep: 0,

    /** The highest step that the user has entered. This can be used to prevent the user from jumping ahead. */
    maxWizardStepEntered: 0,

    stepFields: [
      ['experiment', 'supersededScoreSetUrn', 'metaAnalyzesScoreSetUrns'],
      [
        'title', 'shortDescription', 'methodText', 'abstractText',
        'publicationIdentifiers', 'primaryPublicationIdentifiers', 'extraMetadata', 'dataUsagePolicy'
      ],
      ['targets'],
      ['targetGene'],
      ['scoreRanges'],
      ['scoresFile', 'countsFile'],
    ],
  }),

  computed: {
    maxWizardStepValidated: function() {
      const numSteps = 5 + this.numTargets
      // This yields the index of the maximum step validated, -1 if step 0 is not valid, and -2 if all steps are valid.
      const maxStepValidated = _.findIndex(_.range(0, numSteps), (step) => !this.validateWizardStep(step)) - 1
      return maxStepValidated == -2 ? numSteps - 1 : maxStepValidated
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
      return this.suggestionsForAutocomplete(_.unionBy(this.publicationIdentifierSuggestions, this.externalPublicationIdentifierSuggestions, 'identifier'))
    },
    supersededScoreSetSuggestionsList: function () {
      return this.suggestionsForAutocomplete(this.supersededScoreSetSuggestions)
    },
    targetGeneSuggestionsList: function () {
      const geneSuggestions = this.targetGeneSuggestions || []
      const filteredGeneSuggestions = geneSuggestions.filter(gene => {
        const seq = gene?.targetSequence
        return seq && seq.sequence && seq.sequenceType
      })
      return this.suggestionsForAutocomplete(filteredGeneSuggestions)
    },
    taxonomySuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.taxonomySuggestions)
    },
    targetGeneAccessionSuggestionsList: function () {
      if (!this.accessionSuggestions || this.accessionSuggestions.length == 0) {
        return ['']
      }
      return this.accessionSuggestions
    },
    defaultLicenseId: function () {
      return this.licenses ? this.licenses.find((license) => license.shortName == 'CC0')?.id : null
    },
    geneNamesAsObject: function () {
      // Heinous workaround for string filtration, see: https://github.com/primefaces/primevue/issues/2059
      // When this is fixed, we'll need to also remove object accessors in other miscellaneous helpers below.
      if (!this.geneNames || this.geneNames.length == 0) {
        return [{}]
      }
      else {
        return this.geneNames.map(name => ({ name }))
      }
    },
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
              response = e.response || { status: 500 }
          }

          if (response.status == 200) {
            this.experiment = response.data
            this.populateExperimentMetadata({value: this.experiment})
            this.activeWizardStep = 0
          } else {
              this.$toast.add({ severity: 'error', summary: `Could not fetch experiment with urn ${this.experimentUrn}` })
          }
        }
      }
    },
    'targetGene.externalIdentifiers': {
      deep: true,
      handler: function (newValue) {
        if (!newValue) {
          return
        }
        // If an identifier has been set, set the offset to 0 by default.
        for (const dbName of externalGeneDatabases) {
          if (newValue[dbName]?.identifier?.identifier != null && newValue[dbName]?.offset == null) {
            this.targetGene.externalIdentifiers[dbName].offset = 0
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
          }
          else {
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
            autopopulatedExternalIdentifiers[dbName] = (targetGene.externalIdentifiers || [])
              .find(({ identifier }) => identifier?.dbName == dbName) || {
              identifier: null,
              offset: null
            }
          }
          targetGene.externalIdentifiers = autopopulatedExternalIdentifiers
          this.targetGene = targetGene
        }
      },
    },
    publicationIdentifiers: {
      handler: function(newValue, oldValue) {
        if (newValue.length == 1) {
          this.primaryPublicationIdentifiers = newValue
        } else if (newValue.length == 0 || (newValue.length > 1 && oldValue.length == 1)) {
          // Clear primary publication if we have just added a second ID, or if we have deleted all IDs.
          this.primaryPublicationIdentifiers = []
        }
      }
    },
    item: {
      handler: function () {
        this.resetForm()
      }
    },
    itemId: {
      handler: function () {
        this.setItemId(this.itemId)
      },
      immediate: true
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
          return;
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
          return;
        }
        if (this.createdTargetGenes.length < this.numTargets) {
          for (let i = this.createdTargetGenes.length; i < this.numTargets; i++) {
            this.createdTargetGenes.push(emptyTargetGeneWizardObj())
            this.stepFields.splice(3, 0, ['targetGene'])
          }
        } else if (this.createdTargetGenes.length > this.numTargets) {
          this.createdTargetGenes = this.createdTargetGenes.slice(0, this.numTargets)
          this.stepFields.splice(3, oldValue-newValue)
        }
      }
    },
    investigatorIsProvidingScoreRanges: {
      handler: function (newValue) {
        if (newValue && this.scoreRanges.investigatorProvided.ranges.length === 0) {
          this.scoreRanges.investigatorProvided.ranges.push(emptyScoreRangeWizardObj())
        }
      }
    },
  },

  mounted: async function() {
    await this.loadEditableExperiment()
  },

  methods: {
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Contributors
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    clearContributorSearch: function() {
      // This could change with a new PrimeVue version.
      const input = this.$refs.contributorsInput
      input.$refs.input.value = ''
    },

    lookupOrcidUser: async function(orcidId) {
      let orcidUser = null
      try {
        orcidUser = (await axios.get(`${config.apiBaseUrl}/orcid/users/${orcidId}`)).data
      } catch (err) {
        // Assume that the error was 404 Not Found.
      }
      return orcidUser
    },

    newContributorsAdded: async function(event) {
      const newContributors = event.value

      // Convert any strings to ORCID users without names. Remove whitespace from new entries.
      this.contributors = this.contributors.map((c) => _.isString(c) ? {orcidId: c.trim()} : c)

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

    validateWizardStep: function(step) {
      // Later, this may depend on server-side validation.
      switch (true) {
        case step == 0: {
          // Step 0 is valid if
          // - The score set is a meta-analysis and at least one meta-analyzed score set has been chosen..
          // - The score set is a superseding score set, and the superseded score set has been chosen.
          // - Or the score set is neither, and its parent experiment has been chosen in dropdown or from experiment view page.
          return !!(this.isMetaAnalysis && this.metaAnalyzesScoreSets.length > 0)
              || !!(this.isSupersedingScoreSet && this.supersededScoreSet)
              || !!(!this.isMetaAnalysis && !this.isSupersedingScoreSet && this.experiment || this.experimentUrn)
        }
        case step == 1: {
          return this.title && this.shortDescription && this.abstractText && this.methodText
        }
        case step == 2: {
          return this.numTargets > 0
        }
        case ((step > 2) && (step < 3 + this.numTargets)): {
          const currentTargetGene = this.createdTargetGenes[step-3].targetGene
          if (this.isTargetSequence) {
            return currentTargetGene.name
              && currentTargetGene.category
              && (currentTargetGene.targetSequence.sequence && currentTargetGene.targetSequence.sequenceType)
              // Don't allow the user to advance if the taxonomy has been searched for but not selected,
              && currentTargetGene.targetSequence.taxonomy?.id
          } else {
            return currentTargetGene.name
              && currentTargetGene.category
              && (currentTargetGene.targetAccession.accession
                && (currentTargetGene.targetAccession.assembly || currentTargetGene.targetAccession.gene)
              )
          }
        }
        case (step == 3 + this.numTargets): {
          let allInvestigatorProvidedRangesCompleted = true
          for (const scoreRange of this.scoreRanges.investigatorProvided.ranges) {
            if (!scoreRange.value.label || !scoreRange.value.classification || (!scoreRange.value.range[0] && !scoreRange.infiniteLower) || (!scoreRange.value.range[1] && !scoreRange.infiniteUpper)) {
              allInvestigatorProvidedRangesCompleted = false
              break
            }
          }
          return !(this.investigatorIsProvidingScoreRanges) || (allInvestigatorProvidedRangesCompleted && this.scoreRanges.investigatorProvided.baselineScore !== null)
        }
        default:
          return true
      }
    },

    minStepWithError: function() {
      const numSteps = this.stepFields.length
      for (let i = 0; i < numSteps; i++) {
        if (this.wizardStepHasError(i)) {
          // errors in the target creation step
          if (i > 2 && i < 3 + this.numTargets) {
            return this.minTargetGeneStepWithError + 3
          }
          return i;
        }
      }
      return numSteps - 1
    },

    wizardStepHasError: function(step) {
      if (step >= this.stepFields.length) {
        return false
      }
      return !this.stepFields[step].every((field) => {
        for (const v of Object.keys(this.validationErrors)) {
          if (v.startsWith(field)) {
            return false
          }
        }
        return true
      })
    },

    showNextWizardStepIfValid: function(navigate) {
      if (this.maxWizardStepValidated >= this.activeWizardStep) {
        this.maxWizardStepEntered = Math.max(this.maxWizardStepEntered, this.activeWizardStep + 1)
        navigate()
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
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.supersededScoreSetSuggestions = await this.searchScoreSets(searchText, true)
      }
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
        return response.data || []
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

    scoreRangeWithWizardProperties(existingRange) {
      const scoreRange = this.emptyScoreRangeWizardObj()
      scoreRange.value = existingRange
      return scoreRange
    },

    refreshAccessionOptions: async function (targetIdx) {
      const currentTarget = this.createdTargetGenes[targetIdx]

      // if we are refreshing the accession options, we can't retain the currently selected accession
      if (currentTarget.targetGene.targetAccession.accession) {
        currentTarget.targetGene.targetAccession.accession = null
      }

      if (currentTarget.isRelativeToChromosome && currentTarget.targetGene.targetAccession.assembly) {
        this.accessionSuggestions = await this.fetchTargetAccessionsByAssembly(currentTarget.targetGene.targetAccession.assembly)
      }
      else if (!currentTarget.isRelativeToChromosome && currentTarget.targetGene.targetAccession.gene) {
        this.accessionSuggestions = await this.fetchTargetAccessionsByGene(currentTarget.targetGene.targetAccession.gene.name)
      }

      if (!this.accessionSuggestions) {
        this.$toast.add({ severity: 'warn', summary: `No accession identifiers were found for ${currentTarget.isRelativeToChromosome ? currentTarget.targetGene.targetAccession.assembly : currentTarget.targetGene.targetAccession.gene.name}`, life: 3000 })
      }
    },

    fetchTargetAccessions: async function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
          this.accessionSuggestions = this.accessionSuggestions.filter(s => s?.toLowerCase().includes(searchText.toLowerCase()))
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
      if (currentTargetGene.targetAccession.accession.startsWith("NP")) {
        // Don't do anything if we already are operating on a protein transcript
        this.$toast.add({ severity: 'info', summary: `${currentTargetGene.targetAccession.accession} is already a protein accession.`, life: 3000 })
        return
      }
      const url = `${config.apiBaseUrl}/hgvs/protein/${currentTargetGene.targetAccession.accession}`
      try {
        const response = await axios.get(
          url,
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        currentTargetGene.targetAccession.accession = response.data
      } catch (err) {
        if (err.response.status == 404) {
          this.$toast.add({ severity: 'error', summary: err.response.data.detail, life: 3000 })
        } else {
          this.$toast.add({ severity: 'error', summary: `Could not fetch protein accession for ${currentTargetGene.targetAccession.accession}`})
          console.log("Request to swap protein accession failed", err)
        }
      }
    },

    fetchTargetAccessionsByAssembly: async function (assembly) {
      const url = `${config.apiBaseUrl}/hgvs/${assembly.trim()}/accessions`
      try {
        const response = await axios.get(
          url,
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
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
        const response = await axios.get(
          url,
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        // TODO (#130) catch errors in response
        return response.data || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },

    boundaryLimitUpdated: function(rangeIdx, boundary) {
      const updatedRange = this.scoreRanges.investigatorProvided.ranges[rangeIdx]
      if (boundary === "upper") {
        updatedRange.value.range[1] = null
      }
      else if (boundary == "lower") {
        updatedRange.value.range[0] = null
      }
    },

    addScoreRange: function() {
      this.scoreRanges.investigatorProvided.ranges.push(emptyScoreRangeWizardObj())
    },

    removeScoreRange: function(rangeIdx) {
      this.scoreRanges.investigatorProvided.ranges.splice(rangeIdx, 1)
      if (this.scoreRanges.investigatorProvided.ranges.length === 0) {
        this.investigatorIsProvidingScoreRanges = false
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    loadEditableExperiment: async function() {
      try {
        const response = await axios.post(`${config.apiBaseUrl}/me/experiments/search`, {metaAnalysis: false})
        this.editableExperiments = response.data
      } catch (error) {
        console.error("Error loading experiments:", error)
        this.editableExperiments = [] // Reset in case of an error
      }
    },

    populateExperimentMetadata: function (event) {
      this.abstractText = event.value.abstractText
      this.contributors = event.value.contributors || []
      this.doiIdentifiers = event.value.doiIdentifiers
      this.publicationIdentifiers = _.concat(event.value.primaryPublicationIdentifiers, event.value.secondaryPublicationIdentifiers)
      this.primaryPublicationIdentifiers = event.value.primaryPublicationIdentifiers.filter((primary) => {
        return this.publicationIdentifiers.some((publication) => {
          return primary.identifier === publication.identifier
        })
      })
    },

    populateSupersededScoreSetMetadata: function(event) {
      this.contributors = event.value.contributors || []
    },

    acceptNewDoiIdentifier: function() {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.doiIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.doiIdentifiers[idx]
      const newDoi = normalizeDoi(searchText)
      if (this.doiIdentifiers.find((item) => item.identifier == newDoi)) {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warn', summary: `DOI "${newDoi}" is already associated with this score set`, life: 3000})
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, { identifier: newDoi })
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warn', summary: `"${searchText}" is not a valid DOI`, life: 3000})
      }
    },

    acceptNewPublicationIdentifier: function() {
      // We assume the newest value is the right-most one here. That seems to always be true in this version of Primevue,
      // but that may change in the future.
      const newIdx = this.publicationIdentifiers.length - 1

      // Remove new value if it is a duplicate.
      const newIdentifier = this.publicationIdentifiers[newIdx].identifier
      if (this.publicationIdentifiers.findIndex((pub) => pub.identifier == newIdentifier) < newIdx) {
        this.publicationIdentifiers.splice(newIdx, 1)
        this.$toast.add({severity:'warn', summary: `Identifier "${newIdentifier}" is already associated with this experiment`, life: 3000})
      }
    },

    clearPublicationIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.publicationIdentifiersInput
      input.$refs.focusInput.value = ''
    },

    searchPublicationIdentifiers: function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    truncatePublicationTitle: function(title) {
      return title.length > 50 ? title.slice(0, 50) + "..." : title
    },

    addDefaultOffset: function (dbName, targetIdx) {
      const currentTargetGene = this.createdTargetGenes[targetIdx].targetGene
      if (!currentTargetGene.externalIdentifiers[dbName]?.offset){
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
        externalIdentifier.identifier = { identifier: event.value, dbName: dbName }
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

    autofillFromExistingTarget: function(event, targetIdx) {
      const autofilledTargetGene = this.createdTargetGenes[targetIdx].autofilledTargetGene

      this.resetTarget(targetIdx)
      const createdTarget = this.createdTargetGenes[targetIdx]

      createdTarget.targetGene.category = autofilledTargetGene.category
      createdTarget.targetGene.name = autofilledTargetGene.name

      if (this.isTargetSequence) {
        createdTarget.targetGene.targetSequence = autofilledTargetGene.targetSequence
        // dna comes back from the API as a lower cased string. Make it upper case to match the button definition.
        if (createdTarget.targetGene.targetSequence.sequenceType == "dna") {
          createdTarget.targetGene.targetSequence.sequenceType = createdTarget.targetGene.targetSequence.sequenceType.toUpperCase()
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

    clearTaxonomySearch: function() {
      const input = this.$refs.taxonomyInput
      input.inputTextValue = null
    },

    searchTaxonomies: function(event) {
      // if no search text, then return all taxonomy list. Otherwise, return the searching results.
      // If not do in this way, dropdown button can't work.
      this.setTaxonomySearch(event.query)
    },

    fileCleared: function (inputName) {
      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
      }
      // ensure files are cleared from sequence loader even when remove button not used
      else if (inputName == 'targetGeneTargetSequenceSequenceFile') {
        this.$refs.sequenceFileUpload.files = []
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    fileSelected: async function (inputName, event, targetIdx) {
      const file = event.files[0]
      if (file) {
        switch (inputName) {
          case 'extraMetadataFile':
            {
              const text = await file.text()
              try {
                this.extraMetadata = JSON.parse(text)
                if (!_.isObject(this.extraMetadata) || _.isArray(this.extraMetadata)) {
                  this.clientSideValidationErrors.extraMetadata = 'Extra metadata must be a JSON object (not an array or simple value).'
                } else {
                  this.clientSideValidationErrors.extraMetadata = null
                }
              } catch (e) {
                this.extraMetadata = null
                this.clientSideValidationErrors.extraMetadata = 'The file did not contain valid JSON text.'
                console.log('Extra metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'targetGeneTargetSequenceSequenceFile':
            {
              const text = await file.text()
              try {
                const fastaParser = new fasta()
                /*new Fasta({
                  'definition': 'gi|accession|description',
                  'delimiter': '|'
                })*/
                const rawFastaData = fastaParser.parse(text)
                const fastaData = rawFastaData.map(entry => ({
                  ...entry,
                  id: entry.id.replace(/[\r\n]/g, ''),
                  sequence: entry.sequence.replace(/[\r\n]/g, ''),
                }))
                if (fastaData.length == 0) {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = 'The FASTA file contains no sequences.'
                } else if (fastaData.length > 1) {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = 'The FASTA file contains more than one sequence.'
                } else {
                  this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = fastaData[0].sequence
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = null
                }
              } catch (e) {
                this.createdTargetGenes[targetIdx].targetGene.targetSequence.sequence = null
                this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = 'The file was not a valid FASTA file.'
                console.log('Reference sequence file was not a valid FASTA file.')
              }
            }
            break
        }
        this.inputClasses[inputName] = 'mave-file-input-full'
      }
      this.mergeValidationErrors()
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
      if (this.item) {
        this.experiment = this.item.experiment
        this.supersededScoreSet = this.item.supersededScoreSet
        this.isSupersedingScoreSet = this.supersededScoreSet ? true : false
        // metaAnalyzesScoreSets is only used when editing a new score set, so we don't need to populate it from URNs.
        this.metaAnalyzesScoreSets = []
        this.isMetaAnalysis = false,

        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.licenseId = this.item.license.id
        this.dataUsagePolicy = this.item.dataUsagePolicy
        this.hasCustomUsagePolicy = this.dataUsagePolicy ? true : false

        this.contributors = _.sortBy(this.item.contributors, ['familyName', 'givenName', 'orcidId'])
        this.doiIdentifiers = this.item.doiIdentifiers
        // So that the multiselect can populate correctly, build the primary publication identifiers
        // indirectly by filtering a merged list of secondary and primary publication identifiers
        this.publicationIdentifiers = _.concat(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
        this.primaryPublicationIdentifiers = this.item.primaryPublicationIdentifiers.filter((publication) => {
          return this.publicationIdentifiers.some((primary) => {
            return primary.identifier === publication.identifier
          })
        })
        this.secondaryPublicationIdentifiers = this.item.secondaryPublicationIdentifiers
        this.extraMetadata = this.item.extraMetadata

        this.scoreRanges = {
          investigatorProvided: {
            baselineScore: this.item.scoreRanges?.ranges?.investigatorProvided?.baselineScore,
            baselineScoreDescription: this.item.scoreRanges?.ranges?.investigatorProvided?.baselineScoreDescription,
            ranges: this.item.scoreRanges?.ranges?.investigatorProvided?.ranges.map(range => this.scoreRangeWithWizardProperties(range)),
            oddsPathSource: this.item.scoreRanges?.ranges?.investigatorProvided?.oddsPathSource || [],
            source: this.item.scoreRanges?.ranges?.investigatorProvided?.source || []
          },
        }
        this.investigatorIsProvidingScoreRanges = this.scoreRanges.length > 0

        this.createdTargetGenes = this.item.targetGenes.map(target => this.targetGeneWithWizardProperties(target))
        this.numTargets = this.createdTargetGenes.length
        this.isMultiTarget = this.numTargets == 1 ? false : true
        this.isTargetSequence = this.createdTargetGenes[0].targetGene?.targetSequence ? true : false
      } else {
        this.experiment = null
        this.supersededScoreSet = null
        this.isSupersedingScoreSet = false
        this.metaAnalyzesScoreSets = []
        this.isMetaAnalysis = false,

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
        this.extraMetadata = {}

        this.scoreRanges = {
          investigatorProvided: {
            baselineScore: null,
            baselineScoreDescription: null,
            ranges: [],
            oddsPathSource: [],
            source: []
          }
        }
        this.investigatorIsProvidingScoreRanges = false

        this.createdTargetGenes = [emptyTargetGeneWizardObj()]
        this.numTargets = 1
        this.isMultiTarget = false
        this.isTargetSequence = true
      }
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
      const primaryPublicationIdentifiers = this.primaryPublicationIdentifiers.map((identifier) => _.pick(identifier, ['identifier', 'dbName']))
      const secondaryPublicationIdentifiers = this.publicationIdentifiers.map(
        (identifier) => _.pick(identifier, ['identifier', 'dbName'])
      ).filter(
        secondary => !primaryPublicationIdentifiers.some(primary => primary.identifier == secondary.identifier && primary.dbName == secondary.dbName)
      )

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
        extraMetadata: {},

        scoreRanges: {
          investigatorProvided: {
            baselineScore: this.scoreRanges.investigatorProvided.baselineScore,
            baselineScoreDescription: this.scoreRanges.investigatorProvided.baselineScoreDescription,
            ranges: this.scoreRanges.investigatorProvided.ranges.map((range) => {
              range.value.oddsPath = range.isProvidingOddsPath ? range.value.oddsPath : null
              return range.value
            }),
            oddsPathSource: this.scoreRanges.investigatorProvided.oddsPathSource.map((identifier) => _.pick(identifier, ['identifier', 'dbName'])),
            source: this.scoreRanges.investigatorProvided.source.map((identifier) => _.pick(identifier, ['identifier', 'dbName'])),
          },
        },

        targetGenes: this.createdTargetGenes.map(
          (target) => {
            const targetGene = {
              name: target.targetGene.name,
              category: target.targetGene.category,
              targetSequence: this.isTargetSequence ? target.targetGene.targetSequence : null,
              targetAccession: !this.isTargetSequence ? target.targetGene.targetAccession : null,
              externalIdentifiers: []
            }

            for (const [db, linked] of Object.entries(target.linkedAccessions)) {
              if (linked) {
                targetGene.externalIdentifiers.push(target.targetGene.externalIdentifiers[db])
              }
            }

            if (!this.isTargetSequence && !target.isRelativeToChromosome) {
              targetGene.targetAccession.gene = targetGene.targetAccession.gene.name
            }

            if (!this.isTargetSequence) {
              targetGene.targetAccession.isBaseEditor = this.isBaseEditor
            }

            return targetGene
          }
        )
      }
      if (!this.investigatorIsProvidingScoreRanges) {
        delete editedFields.scoreRanges
      }
      if (!this.item) {
        editedFields.supersededScoreSetUrn = this.supersededScoreSet ? this.supersededScoreSet.urn : null
        editedFields.metaAnalyzesScoreSetUrns = this.metaAnalyzesScoreSets.map((s) => s.urn)
        if ( editedFields.metaAnalyzesScoreSetUrns.length===0 && editedFields.supersededScoreSetUrn ) {
          editedFields.experimentUrn = this.supersededScoreSet.experiment.urn
        }
      }
      else {
        // empty item arrays so that deleted items aren't merged back into editedItem object
        this.item.contributors = []
        this.item.doiIdentifiers = []
        this.item.primaryPublicationIdentifiers = []
        this.item.publicationIdentifiers = []
        this.item.rawReadIdentifiers = []
        this.item.targetGenes = []
        this.item.scoreRanges = {
          investigatorProvided: {
            baselineScore: null,
            baselineScoreDescription: null,
            ranges: [],
            oddsPathSource: [],
            source: []
          }
        }
      }

      const editedItem = _.merge({}, this.item || {}, editedFields)

      this.progressVisible = true
      let response = null
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/score-sets/${this.item.urn}`, editedItem)
        } else {
          response = await axios.post(`${config.apiBaseUrl}/score-sets/`, editedItem)
        }
      } catch (e) {
        response = e.response || { status: 500 }
        this.$toast.add({ severity: 'error', summary: 'Error', life: 3000 })
      }
      this.progressVisible = false
      if (response.status == 200) {
        const savedItem = response.data
        this.validationErrors = {}
        if (this.item) {
          if (this.$refs.scoresFileUpload?.files?.length == 1) {
            await this.uploadData(savedItem)
          } else {
            this.$router.replace({ path: `/score-sets/${this.item.urn}` })
            this.$toast.add({ severity: 'success', summary: 'Your changes were saved.', life: 3000 })
          }
        } else {
          console.log('Created item')
          await this.uploadData(savedItem)
        }
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({ severity: 'error', summary: `Encountered an error saving score set: ${response.data.detail}` })
        }
        else {
          for (const error of response.data.detail) {
            console.log(error)
            let path = error.loc
            if (path[0] == 'body') {
              path = path.slice(1)
            }

            if (_.isEqual(_.slice(path, 0, 1), ['targetGene'])){
              this.minTargetGeneStepWithError = Math.min(this.minTargetGeneStepWithError, path[1])

              // Map errors on indexed external gene identifiers to inputs named for the identifier's database.
              if (_.isEqual(_.slice(path, 2, 3), ['externalIdentifiers'])) {
                const identifierIndex = path[3]
                const identifierOffset = editedFields.targetGenes[path[1]].externalIdentifiers[identifierIndex]
                // Potentially incorrect to fall back on index of the external gene database to induce the name, but displaying the error in the wrong spot is
                // preferable to not displaying the error.
                path.splice(3, 2, identifierOffset?.identifier?.dbName ? identifierOffset.identifier.dbName : this.externalGeneDatabases[identifierIndex])
              }
            }

            path = path.join('.')
            formValidationErrors[path] = error.msg
          }
        }
        this.serverSideValidationErrors = formValidationErrors
        this.mergeValidationErrors()
        this.activeWizardStep = this.minStepWithError()
      }
    },

    uploadData: async function (scoreSet) {
      if (this.$refs.scoresFileUpload.files.length != 1) {
        this.validationErrors = { scores: 'Required' }
      } else {
        const formData = new FormData()
        formData.append('scores_file', this.$refs.scoresFileUpload.files[0])
        if (this.$refs.countsFileUpload.files.length == 1) {
          formData.append('counts_file', this.$refs.countsFileUpload.files[0])
        }
        this.progressVisible = true
        let response
        try {
          response = await axios.post(
            `${config.apiBaseUrl}/score-sets/${scoreSet.urn}/variants/data`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            }
          )
        } catch (e) {
          response = e.response || { status: 500 }
        }
        this.progressVisible = false

        if (response.status == 200) {
          console.log('Imported score set data.')
          if (this.item) {
            // this.reloadItem()
            this.$router.replace({ path: `/score-sets/${scoreSet.urn}` })
            this.$toast.add({ severity: 'success', summary: 'Your changes were saved.', life: 3000 })
          } else {
            this.$router.replace({ path: `/score-sets/${scoreSet.urn}` })
            this.$toast.add({ severity: 'success', summary: 'The new score set was saved.', life: 3000 })
          }
        } else {
          this.$toast.add({ severity: 'error', summary: `The score and count files could not be imported. ${response.data.detail}`, life: 3000 })
          // Delete the score set if just created.
          // Warn if the score set already exists.
        }
      }
    },

    validateAndSave: async function () {
      this.clientSideValidationErrors = {}

      const hasScoresFile = this.$refs.scoresFileUpload.files.length == 1
      const hasCountsFile = this.$refs.countsFileUpload.files.length == 1
      if (hasCountsFile && !hasScoresFile) {
        this.clientSideValidationErrors.scoresFile = 'Required'
      }
      if (!this.item && !hasScoresFile) {
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

    viewItem: function () {
      if (this.item) {
        this.$router.replace({ path: `/score-sets/${this.item.urn}` })
      }
    },

    //Back to Dashboard
    backDashboard: function () {
      this.$router.replace({ path: `/dashboard` })
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

<style scoped src="../../assets/forms.css">
</style>

<style scoped>

.mavedb-wizard:deep(.p-stepper) {
  min-width: 1180px; /* Design is not responsive past this point. */
}

/* Remove the stepper panel's background color. */
.mavedb-wizard:deep(.p-stepper .p-stepper-panels) {
  background-color: transparent;
}

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
  width: 676px;
  background-color: #fff;
}

.mavedb-wizard-row {
  position: relative;
  z-index: 1;
}

/* Clear floats after each wizard form row. */
.mavedb-wizard-row:after {
  content: "";
  clear: both;
  display: table;
}

/* The help block for one wizard form row. */
.mavedb-wizard-help {
  float: left;
  width: 480px;
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
  width: 676px;
  padding: 22px 10px 10px 10px;
  background-color: #fff;
}

.mavedb-wizard-subcontent {
  padding: 5px 0px 5px 5px;
}

.mavedb-wizard-content-pane {
  float: right;
  width: 676px;
  padding: 0 10px;
  background-color: #fff;
}

/* Wizard step controls */
.mavedb-wizard-step-controls-row {
  position: relative;
}

.mavedb-wizard-step-controls-row:after {
  content: "";
  clear: both;
  display: table;
}

/* Ensure the step controls are never off-screen. */
.mavedb-wizard-step-controls {
  padding-left: 10px;
  max-width: 100vw;
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

/* Cards */

.mave-score-set-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0, 0, 0, 0.05);
}

.mave-score-set-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51B5;
  margin-bottom: 0;
}

.dropdown-option-group {
  font-weight: bold;
  color: #3f51B5;
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

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item {

  padding: 0;
}

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
  background: #eef;
}

.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-taxonomy-common-name,
.mave-taxonomy-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-taxonomy-organism-name {
  background: #eef;
}
</style>
