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
                        <a target="_blank" href="https://mavedb.org/docs/mavedb/record_types.html#record-types">documentation</a>.
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
                        <a target="_blank" href="https://mavedb.org/docs/mavedb/record_types.html#record-types">documentation</a>.
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
                            v-model="experiment"
                            :id="$scopedId('input-experiment')"
                            :options="editableExperiments"
                            optionLabel="title"
                            optionValue=""
                            style="width: 50%"
                            @change="populateExperimentMetadata"
                          />
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
                        <a target="_blank" href="https://mavedb.org/docs/mavedb/data_licensing.html#data-licensing">documentation</a>.
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
                  <div v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName == 'Other - See Data Usage Guidelines'"
                    class="mavedb-wizard-row">
                    <div class="mavedb-wizard-help">
                      <label>
                        A license and/or any restrictions governing the usage of the data in this score set.
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
                              <div>{{ slotProps.value.identifier }}</div>
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
                          :selectionLimit="1">
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
              <div>
                <TabView class="field">
                  <TabPanel header="Target Sequence">
                    <div class="field">
                      <span class="p-float-label">
                        <AutoComplete ref="existingTargetGeneInput" v-model="existingTargetGene"
                          :id="$scopedId('input-existingTargetGene')" field="name" :forceSelection="true"
                          :suggestions="targetGeneSuggestionsList" @complete="searchTargetGenes">
                          <template #item="slotProps">
                            <div>
                                <div>Name: {{ slotProps.item.name }}</div>
                                <div>Category: {{ slotProps.item.category }}</div>
                                <div v-for="externalIdentifier of slotProps.item.externalIdentifiers" :key=externalIdentifier.identifier>
                                  {{ externalIdentifier.identifier.dbName }}: {{ externalIdentifier.identifier.identifier }}, Offset: {{ externalIdentifier.offset }}
                                </div>
                            </div>
                          </template>
                        </AutoComplete>
                        <label :for="$scopedId('input-existingTargetGene')">Copy from an existing target gene</label>
                      </span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <InputText v-model="targetGene.name" :id="$scopedId('input-targetGeneName')" />
                        <label :for="$scopedId('input-targetGeneName')">Target name</label>
                      </span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <InputText v-model="targetGene.targetSequence.label"
                          :id="$scopedId('input-targetSequenceLabel')" />
                        <label :for="$scopedId('input-targetSequenceLabel')">Target label (only required when providing
                          multiple targets)</label>
                      </span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <SelectButton v-model="targetGene.category" :id="$scopedId('input-targetGeneCategory')"
                          :options="targetGeneCategories" />
                      </span>
                    </div>
                    <div v-for="dbName of externalGeneDatabases" class="field field-columns" :key="dbName">
                      <div class="field-column">
                        <span class="p-float-label">
                          <AutoComplete :ref="`${dbName.toLowerCase()}IdentifierInput`"
                            v-model="targetGene.externalIdentifiers[dbName].identifier"
                            :id="$scopedId(`input-${dbName.toLowerCase()}Identifier`)" field="identifier"
                            :suggestions="targetGeneIdentifierSuggestionsList[dbName]"
                            @blur="acceptNewTargetGeneIdentifier(dbName)"
                            @complete="searchTargetGeneIdentifiers(dbName, $event)"
                            @keyup.enter="acceptNewTargetGeneIdentifier(dbName)"
                            @keyup.escape="clearTargetGeneIdentifierSearch(dbName)" />
                          <label :for="$scopedId(`input-${dbName.toLowerCase()}Identifier`)">{{ dbName }}
                            identifier</label>
                        </span>
                      </div>
                      <div class="field-column">
                        <span class="p-float-label">
                          <InputNumber v-model="targetGene.externalIdentifiers[dbName].offset"
                            :id="$scopedId(`input-${dbName.toLowerCase()}Offset`)" buttonLayout="stacked" :min="0"
                            showButtons suffix=" bp" />
                          <label :for="$scopedId(`input-${dbName.toLowerCase()}Offset`)">Offset</label>
                        </span>
                      </div>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <AutoComplete
                          ref="taxonomyInput"
                          v-model="taxonomy"
                          dropdown
                          :id="$scopedId('input-targetSequenceTaxonomy')"
                          :suggestions="taxonomySuggestionsList"
                          field="organismName"
                          forceSelection
                          :multiple="false"
                          :options="taxonomies"
                          @complete="searchTaxonomies"
                          @keyup.escape="clearTaxonomySearch">
                          <template #item="slotProps">
                            {{slotProps.item.taxId}} - {{slotProps.item.organismName}} <template v-if="slotProps.item.commonName!=='NULL' && slotProps.item.commonName!== null">/ {{slotProps.item.commonName}}</template>
                          </template>
                        </AutoComplete>
                        <label :for="$scopedId('input-targetSequenceTaxonomy')">Taxonomy</label>
                      </span>
                      <span v-if="validationErrors['targetGene.targetSequence.taxonomy']" class="mave-field-error">{{validationErrors['targetGene.targetSequence.taxonomy']}}</span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <FileUpload ref="sequenceFileUpload"
                          :id="$scopedId('input-targetGeneTargetSequenceSequenceFile')" :auto="false"
                          chooseLabel="Reference sequence" :class="inputClasses.targetGeneTargetSequenceSequenceFile"
                          :customUpload="true" :fileLimit="1" :showCancelButton="false" :showUploadButton="false"
                          @remove="fileCleared('targetGeneTargetSequenceSequenceFile')"
                          @select="fileSelected('targetGeneTargetSequenceSequenceFile', $event)">
                          <template #empty>
                            <p>Drop a FASTA file here.</p>
                          </template>
                        </FileUpload>
                      </span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <SelectButton v-model="targetGene.targetSequence.sequenceType"
                          :id="$scopedId('input-targetGeneTargetSequenceSequenceType')" :options="sequenceTypes" />
                      </span>
                    </div>
                    <div>
                      <Button @click="addTarget" icon="pi pi-check" label="Add Target" />
                      <Button @click="resetTarget" class="p-button-help" icon="pi pi-times" label="Clear Target"
                        severity="secondary" style="margin-left: 0.5em" />
                    </div>
                  </TabPanel>
                  <TabPanel header="Genomic Coordinates">
                    <div class="field field-columns">
                      <div class="field-column">
                        <span class="p-float-label">
                          <InputText v-model="targetGene.name" :id="$scopedId('input-targetGeneName')" style="width: 100%"/>
                          <label :for="$scopedId('input-targetGene')">Target gene name</label>
                        </span>
                      </div>
                      <div class="field-column">
                        <span class="p-float-label">
                          <!-- Assembly is the reference genome property in coordinate cases -->
                          <Dropdown v-model="assembly" :id="$scopedId('input-targetGeneAssembly')" :options="assemblies" style="width: 100%"/>
                          <label :for="$scopedId('input-targetGeneAssembly')">Assembly</label>
                        </span>
                      </div>
                      <div class="field-column">
                        <span class="p-float-label">
                          <Dropdown v-model="geneName" :id="$scopedId('input-targetGeneGeneNames')"
                            :options="geneNamesAsObject" optionLabel="name" filter
                            :virtualScrollerOptions="{ itemSize: 50 }" @change="autofillGeneName" style="width: 100%"/>
                          <label :for="$scopedId('input-targetGeneAssembly')">HGNC Name</label>
                        </span>
                      </div>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        Autocomplete By:
                        <SelectButton v-model="targetAutocomplete" :options="targetOptions" aria-labelledby="basic" />
                      </span>
                      <span class="p-float-label">
                        <AutoComplete v-model="targetGene.targetAccession.accession"
                          :id="$scopedId('input-targetGene-accession')"
                          :suggestions="targetGeneAccessionSuggestionsList" :force-selection="true" :dropdown="true"
                          @complete="fetchTargetAccessions" />
                        <label :for="$scopedId('input-targetGene-accession')">Accession/Transcript Identifier</label>
                      </span>
                    </div>
                    <div class="field">
                      <span class="p-float-label">
                        <SelectButton v-model="targetGene.category" :id="$scopedId('input-targetGeneCategory')"
                          :options="targetGeneCategories" />
                      </span>
                    </div>
                    <div>
                      <Button @click="addTarget" icon="pi pi-check" label="Add Target" />
                      <Button @click="swapNucleotideProteinAccessions" icon="pi pi-arrows-h"
                        label="Switch to Protein Accession" severity="info" style="margin-left: 0.5em" />
                      <Button @click="resetTarget" class="p-button-help" icon="pi pi-times" label="Clear Target"
                        severity="secondary" style="margin-left: 0.5em" />
                    </div>
                  </TabPanel>
                </TabView>
              </div>
              <div class="field">
                <span v-if="targetGenes.length > 0">
                  <DataTable v-model:expandedRows="expandedTargetGeneRows" :value="targetGenes" dataKey="index">
                    <template #header>
                      <h3 class="target-header">Created Targets</h3>
                    </template>
                    <Column expander style="width: 5rem" />
                    <Column field="name" header="Name"></Column>
                    <Column field="category" header="Category"></Column>
                    <Column>
                      <template #body="slotProps">
                        <Button icon="pi pi-minus-circle" label="Remove" class="p-button-help" severity="secondary"
                          @click="targetDeleted(slotProps.data)" />
                      </template>
                    </Column>
                    <template #expansion="slotProps">
                      <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.name`]"
                        class="mave-field-error">Gene Name {{ validationErrors[`targetGenes.${slotProps.data.index}.name`]
                        }}</span>
                      <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.category`]"
                        class="mave-field-error">Gene Category {{ validationErrors[`targetGenes.${slotProps.data.index}.category`]
                        }}</span>
                      <Card v-if="slotProps.data.targetSequence?.sequence" class="field">
                        <template #content>
                          <h3 class="compact-target">Genomic Sequence Data</h3>
                          <p v-if="slotProps.data.targetSequence.label" class="compact-target">
                            <strong>Sequence Label:</strong> {{ slotProps.data.targetSequence.label }}<br>
                            <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.label`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.label`] }}<br></span>
                          </p>
                          <p class="compact-target">
                            <strong>Sequence Type:</strong> {{ slotProps.data.targetSequence.sequenceType }}<br>
                            <span
                              v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequenceType`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequenceType`]
                              }}<br></span>
                            <strong>Taxonomy Organism Name:</strong> {{ slotProps.data.targetSequence.taxonomy.organismName }}<br>
                            <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.taxonomy`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.taxonomy`] }}<br></span>
                            <strong>Taxonomy Common Name:</strong> {{ slotProps.data.targetSequence.taxonomy.commonName
                            }}
                          </p>
                          <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequence`]"
                            class="mave-field-error">{{
                              validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequence`] }}</span>
                        </template>
                      </Card>
                      <Card v-if="slotProps.data.targetAccession?.accession">
                        <template #content>
                          <h3 class="compact-target">Accession Data</h3>
                          <p class="compact-target">
                            <strong>Assembly:</strong> {{ slotProps.data.targetAccession.assembly || 'N/A' }}<br>
                            <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.assembly`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.assembly`]
                              }}<br></span>
                            <strong>Gene:</strong> {{ slotProps.data.targetAccession.gene || 'N/A' }}<br>
                            <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.gene`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.gene`] }}<br></span>
                            <strong>Accession:</strong> {{ slotProps.data.targetAccession.accession }}<br>
                            <span
                              v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.accession`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.accession`] }}</span>
                          </p>
                        </template>
                      </Card>
                      <Card v-if="slotProps.data.externalIdentifiers.length > 0">
                        <template #content>
                          <h3 class="target-header">External Identifier Data</h3>
                          <div v-for="externalId of slotProps.data.externalIdentifiers" class="compact-target"
                            :key="externalId">
                            <p class="compact-target">
                              <strong>{{ externalId.identifier.dbName }}:</strong> {{ externalId.identifier.identifier
                              }}, <strong>Offset:</strong> {{ externalId.offset }}
                            </p>
                            <span
                              v-if="validationErrors[`targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.identifier`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.identifier`]
                              }}</span><br>
                            <span
                              v-if="validationErrors[`targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.offset`]"
                              class="mave-field-error">{{
                                validationErrors[`targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.offset`]
                              }}</span>
                          </div>
                        </template>
                      </Card>
                    </template>
                    <template #footer>
                      <div class="flex flex-wrap justify-content-start gap-2">
                        <Button icon="pi pi-times-circle" label="Clear all" severity="secondary" class="p-button-help"
                          @click="targetsCleared" />
                      </div>
                    </template>
                  </DataTable>
                </span>
              </div>
              <span v-if="validationErrors['targetGenes']" class="mave-field-error">{{validationErrors['targetGenes']}}</span>
              <div class="field">
                <Message v-if="targetGenes?.length > 1" severity="info">
                  When defining variants against multiple targets, uploaded variant coordinates should be fully
                  qualified with respect to target names or target accessions.
                </Message>
              </div>
              <div class="mavedb-wizard-step-controls-row">
                <div class="flex justify-content-between mavedb-wizard-step-controls pt-4">
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
              <div v-if="item">
                <div>{{ formatInt(item.numVariants) }} variants are included in this score set.</div>
                <div>To replace the variants, choose a new scores file and optional counts file:</div>
              </div>
              <div v-else>
                Load a scores file and an optional counts file:
              </div>
              <div class="field">
                <span class="p-float-label">
                  <FileUpload ref="scoresFileUpload" :id="$scopedId('input-scoresFile')" :auto="false"
                    chooseLabel="Scores file" :class="inputClasses.scoresFile || ''" :customUpload="true" :fileLimit="1"
                    :showCancelButton="false" :showUploadButton="false">
                    <template #empty>
                      <p>Drop a file here.</p>
                    </template>
                  </FileUpload>
                </span>
                <span v-if="validationErrors.scoresFile" class="mave-field-error">{{ validationErrors.scoresFile
                }}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <FileUpload ref="countsFileUpload" :id="$scopedId('input-countsFile')" :auto="false"
                    chooseLabel="Counts file" :class="inputClasses.countsFile || ''" :customUpload="true" :fileLimit="1"
                    :showCancelButton="false" :showUploadButton="false">
                    <template #empty>
                      <p>Drop a file here.</p>
                    </template>
                  </FileUpload>
                </span>
                <span v-if="validationErrors.countsFile" class="mave-field-error">{{ validationErrors.countsFile
                }}</span>
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
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'
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
import {normalizeDoi, normalizeIdentifier, normalizePubmedId, validateDoi, validateIdentifier, validatePubmedId} from '@/lib/identifiers'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import useFormatters from '@/composition/formatters'

const externalGeneDatabases = ['UniProt', 'Ensembl', 'RefSeq']

function emptyTargetGene() {
  return {
    index: null,
    name: null,
    category: null,
    type: null,
    targetSequence: {
      sequenceType: null,
      sequence: null,
      label: null,
      reference: null
    },
    targetAccession: {
      accession: null,
      assembly: null,
      gene: null
    },
    externalIdentifiers: _.fromPairs(
      externalGeneDatabases.map((dbName) => [dbName, { identifier: null, offset: null }])
    )
  }
}

export default {
  name: 'ScoreSetEditor',
  components: {
    AutoComplete,
    Button,
    Card,
    Chips,
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
    Message,
    Multiselect,
    ProgressSpinner,
    SelectButton,
    Stepper,
    StepperPanel,
    TabPanel,
    TabView,
    Textarea
  },

  setup: () => {
    const editableExperiments = useItems({
      itemTypeName: 'experiment',
      options: {
        filter: {
          query: { l: { path: 'something' }, r: { constant: 'value' } }
        }
      }
    })
    const publicationIdentifierSuggestions = useItems({ itemTypeName: 'publication-identifier-search' })
    const externalPublicationIdentifierSuggestions = useItems({ itemTypeName: 'external-publication-identifier-search' })
    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({ itemTypeName: `${dbName.toLowerCase()}-identifier-search` })
    }
    const licenses = useItems({itemTypeName: 'license'})
    const taxonomies = useItems({itemTypeName: 'taxonomy'})
    const taxonomySuggestions = useItems({itemTypeName: 'taxonomy-search'})
    const geneNames = useItems({ itemTypeName: 'gene-names' })
    const assemblies = useItems({ itemTypeName: 'assemblies' })
    const targetGeneSuggestions = useItems({ itemTypeName: 'target-gene-search' })
    const expandedTargetGeneRows = ref([])

    return {
      ...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      editableExperiments: editableExperiments.items,
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
      expandedTargetGeneRows
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
    experiment: null,
    licenseId: null,
    title: null,
    metaAnalyzesScoreSets: [],
    supersededScoreSet: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    contributors: [],
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    dataUsagePolicy: null,
    taxonomy: null,
    lastTaxonomySearch: null,
    targetGene: emptyTargetGene(),
    assembly: null,
    assemblySuggestions: [],
    assemblyDropdownValue: null,
    geneName: null,
    geneNameAccessionSuggestions: [],
    geneNameDropdownValue: null,
    targetOptions: ["Assembly", "HGNC"],
    targetAutocomplete: 'HGNC',
    extraMetadata: {},

    existingTargetGene: null,
    targetGenes: [],

    // Static sets of options:
    sequenceTypes: [
      'DNA',
      'protein'
    ],
    targetGeneCategories: [
      'Protein coding',
      'Regulatory',
      'Other noncoding'
    ],

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null
    },
    externalGeneDatabases,
    metaAnalyzesScoreSetSuggestions: [],
    supersededScoreSetSuggestions: [],
    targetGeneAccessionSuggestions: [],
    validationErrors: {},

    isSupersedingScoreSet: false,
    isMetaAnalysis: false,

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
      ['targetGene', 'targetGenes'],
      ['scoresFile', 'countsFile'],
    ],
  }),

  computed: {
    maxWizardStepValidated: function() {
      const numSteps = 4
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
      return this.suggestionsForAutocomplete(this.targetGeneSuggestions)
    },
    taxonomySuggestionsList: function() {
      return this.suggestionsForAutocomplete(this.taxonomySuggestions)
    },
    targetGeneAccessionSuggestionsList: function () {
      if (!this.targetGeneAccessionSuggestions || this.targetGeneAccessionSuggestions.length == 0) {
        return ['']
      }
      return this.targetGeneAccessionSuggestions
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
    geneName: {
      handler: async function(newValue, oldValue) {
        if (newValue == oldValue) {
          return;
        }
        this.geneNameDropdownValue = this.geneName?.name || null
        if (this.geneNameDropdownValue) {
          this.geneNameAccessionSuggestions = await this.fetchTargetAccessionsByGene(this.geneNameDropdownValue)
        }
      }
    },
    assembly: {
      handler: async function(newValue, oldValue) {
        if (newValue == oldValue) {
          return;
        }
        this.assemblyDropdownValue = this.assembly?.trim() || null
        if (this.assemblyDropdownValue) {
          this.assemblySuggestions = await this.fetchTargetAccessionsByAssembly(this.assemblyDropdownValue)
        }
      }
    }
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

      // Convert any strings to ORCID users without names.
      this.contributors = this.contributors.map((c) => _.isString(c) ? {orcidId: c} : c)

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

    suggestionsForAutocomplete: function (suggestions) {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      if (!suggestions || suggestions.length == 0) {
        return [{}]
      }
      return suggestions
    },

    validateWizardStep: function(step) {
      // Later, this may depend on server-side validation.
      switch (step) {
        case 0: {
          // Step 0 is valid if
          // - The score set is a meta-analysis and at least one meta-analyzed score set has been chosen..
          // - The score set is a superseding score set, and the superseded score set has been chosen.
          // - Or the score set is neither, and its parent experiment has been chosen in dropdown or from experiment view page.
          return !!(this.isMetaAnalysis && this.metaAnalyzesScoreSets.length > 0)
              || !!(this.isSupersedingScoreSet && this.supersededScoreSet)
              || !!(!this.isMetaAnalysis && !this.isSupersedingScoreSet && this.experiment || this.experimentUrn)
        }
        case 1: {
          return this.title && this.shortDescription && this.abstractText && this.methodText
        }
        case 2: {
          return this.targetGenes.length > 0
        }
        default:
          return true
      }
    },

    minStepWithError: function() {
      const numSteps = this.stepFields.length
      for (let i = 0; i < numSteps; i++) {
        if (this.wizardStepHasError(i)) {
          return i;
        }
      }
      return numSteps - 1
    },

    wizardStepHasError: function(step) {
      if (step >= this.stepFields.length) {
        return false
      }
      let ret = false
      this.stepFields[step].forEach((field) => {
        Object.keys(this.validationErrors).forEach((key) => {
          if (key.startsWith(field)) {
            ret = true
          }
        })
      })
      return ret
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

    fetchTargetAccessions: async function (event) {
      if (this.targetAutocomplete == 'Assembly' ) {
        if (this.assemblyDropdownValue) {
          this.targetGeneAccessionSuggestions = this.assemblySuggestions
        }
      }
      else {
        if (this.geneNameDropdownValue) {
          this.targetGeneAccessionSuggestions = this.geneNameAccessionSuggestions
        }
      }

      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
          this.targetGeneAccessionSuggestions = this.targetGeneAccessionSuggestions.filter(s => s?.toLowerCase().includes(searchText.toLowerCase()))
      }
    },

    fetchTargetAccessionsByAssembly: async function (assembly) {
      const url = `${config.apiBaseUrl}/hgvs/${assembly}/accessions`
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
      const url = `${config.apiBaseUrl}/hgvs/transcripts/gene/${gene}`
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

    autofillGeneName: function (changeEvent) {
      if (!this.targetGene.name) {
        this.targetGene.name = changeEvent.value.name // Gene Name string object
      }
    },


    swapNucleotideProteinAccessions: async function () {
      if (this.targetGene.targetAccession.accession.startsWith("NP")) {
        // Don't do anything if we already are operating on a protein transcript
        this.$toast.add({ severity: 'info', summary: `${this.targetGene.targetAccession.accession} is already a protein accession.`, life: 3000 })
        return
      }
      const url = `${config.apiBaseUrl}/hgvs/transcripts/protein/${this.targetGene.targetAccession.accession}`
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
        if (!response.data) {
          this.$toast.add({ severity: 'error', summary: `No matching protein accession found for ${this.targetGene.targetAccession.accession}`, life: 3000 })
        }
        this.targetGene.targetAccession.accession = response.data || this.targetGene.targetAccession.accession // Maintain current accession when response is empty
      } catch (err) {
        console.log(`Error while loading protein accession")`, err)
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    acceptNewDoiIdentifier: function(event) {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.doiIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.doiIdentifiers[idx]
      const newDoi = normalizeDoi(searchText)
      if (this.doiIdentifiers.find((item) => item.identifier == newDoi)) {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warn', summary: `DOI "${newDoi}" is already associated with this experiment`, life: 3000})
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, { identifier: newDoi })
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warn', summary: `"${searchText}" is not a valid DOI`, life: 3000})
      }
    },

    clearDoiIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.doiIdentifiersInput
      input.$refs.input.value = ''
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

    acceptNewTargetGeneIdentifier: function (dbName) {
      const input = this.$refs[`${dbName.toLowerCase()}IdentifierInput`][0]
      const searchText = (input.modelValue || '').trim()

      // Only accept the current search text if we haven't set an identifier. When the user starts typing, the current
      // identifier is cleared.
      const currentIdentifier = this.targetGene.externalIdentifiers[dbName]?.identifier
      if (!currentIdentifier) {
        if (searchText == '') {
          this.targetGene.externalIdentifiers[dbName].identifier = null
        } else if (validateIdentifier(dbName, searchText)) {
          const identifier = normalizeIdentifier(dbName, searchText)
          this.targetGene.externalIdentifiers[dbName].identifier = { identifier }
          input.modelValue = null

          // Clear the text input.
          // TODO This depends on PrimeVue internals more than I'd like:
          input.$refs.input.value = ''
        }
      }
    },

    clearTargetGeneIdentifierSearch: function (dbName) {
      const input = this.$refs[`${dbName.toLowerCase()}IdentifierInput`][0]
      this.targetGene.externalIdentifiers[dbName].identifier = null
      input.modelValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
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

    clearTaxonomySearch: function() {
      const input = this.$refs.taxonomyInput
      input.inputTextValue = null
    },

    searchTaxonomies: function(event) {
      // if no search text, then return all taxonomy list. Otherwise, return the searching results.
      // If not do in this way, dropdown button can't work.
      this.setTaxonomySearch(event.query)
    },

    targetsCleared: function () {
      this.targetGenes = [];
    },

    targetDeleted: function (target) {
      this.targetGenes = this.targetGenes.filter(val => val !== target);
      this.targetGenes.forEach(function (target, index) {
        target.index = index;
      });
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

    fileSelected: async function (inputName, event) {
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
                const fastaData = fastaParser.parse(text)
                if (fastaData.length == 0) {
                  this.targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = 'The FASTA file contains no sequences.'
                } else if (fastaData.length > 1) {
                  this.targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = 'The FASTA file contains more than one sequence.'
                } else {
                  this.targetGene.targetSequence.sequence = fastaData[0].sequence
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] = null
                }
              } catch (e) {
                this.targetGene.targetSequence.sequence = null
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
        this.licenseId = this.item.license.id
        // metaAnalyzesScoreSets is only used when editing a new score set, so we don't need to populate it from URNs.
        this.metaAnalyzesScoreSets = []
        this.supersededScoreSet = this.item.supersededScoreSet
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
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
        this.dataUsagePolicy = this.item.dataUsagePolicy
        this.taxonomy = this.item.taxonomy
        this.targetGene = emptyTargetGene()
        this.assembly = this.item.assembly
        this.targetGenes = this.item.targetGenes
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.experiment = null
        this.licenseId = this.defaultLicenseId
        this.metaAnalyzesScoreSets = []
        this.supersededScoreSet = null
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.contributors = []
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
        this.dataUsagePolicy = null
        this.taxonomy = null
        this.extraMetadata = {}
        this.resetTarget()
        this.targetGenes = []
      }
    },

    resetTarget: function () {
      this.taxonomy = null
      this.assembly = null
      this.assemblySuggestions = []
      this.assemblyDropdownValue = null
      this.existingTargetGene = null
      this.geneName = null
      this.geneNameAccessionSuggestions = []
      this.geneNameDropdownValue =  null
      this.fileCleared('targetGeneTargetSequenceSequenceFile')
      this.referenceGenome = null
      this.targetGene = emptyTargetGene()
    },

    addTarget: function () {
      if (this.targetGene.name && this.taxonomy) {
        if ( !this.targetGene.category ) {
          this.$toast.add({ severity: 'error', summary: 'Please choose protein coding, regulatory or other noncoding for the target gene type.' })
          return null
        }
        if ( !this.targetGene.targetSequence.sequence ) {
          this.$toast.add({ severity: 'error', summary: 'Please upload reference sequence FAST file.' })
          return null
        }
        if ( !this.targetGene.targetSequence.sequenceType ) {
          this.$toast.add({ severity: 'error', summary: 'Please choose DNA or protein for the sequence type.' })
          return null
        }
        this.targetGene.targetSequence.taxonomy = this.taxonomy
        delete this.targetGene.targetAccession;
      }
      else if (this.geneName && this.assembly) {
        if ( !this.targetGene.category ) {
          this.$toast.add({ severity: 'error', summary: 'Please choose protein coding, regulatory or other noncoding for the target gene type.' })
          return null
        }
        this.targetGene.targetAccession.assembly = this.assemblyDropdownValue
        this.targetGene.targetAccession.gene = this.geneNameDropdownValue // Name property on string object array
        delete this.targetGene.targetSequence;
      }
      else {
        this.$toast.add({ severity: 'error', summary: 'Target must include taxonomy or assembly and gene name.' })
        return null // target must include one of the above objects
      }
      this.targetGene.externalIdentifiers = _.keys(
        this.targetGene.externalIdentifiers).map(
          (dbName) => {
            const identifierOffset = this.targetGene.externalIdentifiers[dbName]
            if (identifierOffset.identifier != null || (identifierOffset != null && identifierOffset.offset > 0)) {
              return {
                offset: identifierOffset.offset,
                identifier: {
                  identifier: identifierOffset.identifier?.identifier,
                  dbName
                }
              }
            } else {
              return null
            }
          }
        ).filter(Boolean)
      this.targetGenes.push(_.clone(this.targetGene))
      // set index property on each target gene to surface error data
      this.targetGenes.forEach(function (target, index) {
        target.index = index;
      });
      this.$toast.add({ severity: 'success', summary: `Target ${this.targetGene.name} was added successfully.`, life: 3000 })
      this.resetTarget()
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
        licenseId: this.licenseId,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        contributors: this.contributors,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: primaryPublicationIdentifiers,
        secondaryPublicationIdentifiers: secondaryPublicationIdentifiers,
        dataUsagePolicy: this.dataUsagePolicy,
        extraMetadata: {},
        // eslint-disable-next-line no-unused-vars
        targetGenes: this.targetGenes.map(({ index, ...target }) => target) // drop index property from target genes before save
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

            // expand all rows of target genes table if there are errors
            // so users can view error messages.
            // TODO: Expand only the problematic target.
            if (_.isEqual(_.slice(path, 0, 1), ['targetGenes'])) {
              this.expandedTargetGeneRows = this.targetGenes
              console.log(this.expandedTargetGeneRows)
            }

            // Map errors on indexed external gene identifiers to inputs named for the identifier's database.
            if (_.isEqual(_.slice(path, 0, 1), ['targetGenes']) && _.isEqual(_.slice(path, 2, 3), ['externalIdentifiers'])) {
              const identifierIndex = path[3]
              const identifierOffset = editedFields.targetGene[path[1]].externalIdentifiers[identifierIndex]
              if (identifierOffset?.identifier?.dbName) {
                path.splice(3, 2, identifierOffset.identifier.dbName)
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
  flex-direction: row
}

.field-column {
  position: relative;
  flex: 1 1 0;
  margin-left: 10px;
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
