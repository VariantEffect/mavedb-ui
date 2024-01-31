<template>
  <DefaultLayout>
    <div class="mave-score-set-editor">
      <div class="grid">
        <div class="col-12">
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
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #title>Parent experiment and context</template>
            <template #content>
              <div v-if="itemStatus != 'NotLoaded' && item.experiment">
                Experiment:
                <router-link :to="{ name: 'experiment', params: { urn: item.experiment.urn } }">{{ item.experiment.title
                }}</router-link>
              </div>
              <div v-else>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown v-model="experiment" :id="$scopedId('input-experiment')" :options="editableExperiments"
                      optionLabel="title" v-on:change="populateExperimentMetadata" style="width: 50%"/>
                    <label :for="$scopedId('input-experiment')">Experiment</label>
                  </span>
                  <span v-if="validationErrors.experiment" class="mave-field-error">{{ validationErrors.experiment
                  }}</span>
                </div>
              </div>
              <div v-if="itemStatus != 'NotLoaded' && supersedesScoreSet">
                Supersedes:
                <router-link :to="{ name: 'scoreSet', params: { urn: supersedesScoreSet.urn } }">{{
                  supersedesScoreSet.title }}</router-link>
              </div>
              <div v-if="itemStatus == 'NotLoaded'" class="field">
                <span class="p-float-label">
                  <AutoComplete ref="supersededScoreSetInput" v-model="supersededScoreSet"
                    :id="$scopedId('input-supersededScoreSet')" field="title" :forceSelection="true"
                    :suggestions="supersededScoreSetSuggestionsList" @complete="searchSupersededScoreSets">
                    <template #item="slotProps">
                      {{ slotProps.item.urn }}: {{ slotProps.item.title }}
                    </template>
                  </AutoComplete>
                  <label :for="$scopedId('input-supersededScoreSet')">Supersedes</label>
                </span>
                <span v-if="validationErrors.supersededScoreSetUrn" class="mave-field-error">{{
                  validationErrors.supersededScoreSetUrn }}</span>
              </div>
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
            </template>
          </Card>
          <Card>
            <template #title>Score set information</template>
            <template #content>
              <div class="field">
                <span class="p-float-label">
                  <InputText v-model="title" :id="$scopedId('input-title')" />
                  <label :for="$scopedId('input-title')">Title</label>
                </span>
                <span v-if="validationErrors.title" class="mave-field-error">{{ validationErrors.title }}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Textarea v-model="shortDescription" :id="$scopedId('input-shortDescription')" rows="4" />
                  <label :for="$scopedId('input-shortDescription')">Short description</label>
                </span>
                <span v-if="validationErrors.shortDescription" class="mave-field-error">{{
                  validationErrors.shortDescription }}</span>
              </div>
              <div class="field">
                <TabView>
                  <TabPanel header="Edit">
                    <span class="p-float-label">
                      <Textarea v-model="abstractText" :id="$scopedId('input-abstractText')" rows="4" />
                      <label :for="$scopedId('input-abstractText')">Abstract</label>
                    </span>
                  </TabPanel>
                  <TabPanel header="Preview">
                    <div v-html="markdownToHtml(abstractText)"></div>
                  </TabPanel>
                </TabView>
                <span v-if="validationErrors.abstractText" class="mave-field-error">{{ validationErrors.abstractText
                }}</span>
              </div>
              <div class="field">
                <TabView>
                  <TabPanel header="Edit">
                    <span class="p-float-label">
                      <Textarea v-model="methodText" :id="$scopedId('input-methodText')" rows="4" />
                      <label :for="$scopedId('input-methodText')">Methods</label>
                    </span>
                  </TabPanel>
                  <TabPanel header="Preview">
                    <div v-html="markdownToHtml(methodText)"></div>
                  </TabPanel>
                </TabView>
                <span v-if="validationErrors.methodText" class="mave-field-error">{{ validationErrors.methodText }}</span>
              </div>
              <div v-if="itemStatus == 'NotLoaded' || this.item.private == true">
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown v-model="licenseId" :id="$scopedId('input-targetLicenseId')" :options="licenses"
                      optionLabel="longName" optionValue="id" style="width: 50%"/>
                    <label :for="$scopedId('input-targetLicenseId')">License</label>
                  </span>
                  <span v-if="validationErrors.referenceGenome" class="mave-field-error">{{
                    validationErrors.referenceGenome }}</span>
                </div>
                <Message v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName != 'CC0'"
                  severity="warn">
                  Choosing a license with these restrictions may cause your dataset to be excluded from data federation
                  and aggregation by MaveDB collaborators.
                </Message>
                <div class="field">
                  <span class="p-float-label">
                    <Chips v-model="keywords" :id="$scopedId('input-keywords')" :addOnBlur="true"
                      :allowDuplicate="false" />
                    <label :for="$scopedId('input-keywords')">Keywords</label>
                  </span>
                  <span v-if="validationErrors.keywords" class="mave-field-error">{{ validationErrors.keywords }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <AutoComplete ref="doiIdentifiersInput" v-model="doiIdentifiers"
                      :id="$scopedId('input-doiIdentifiers')" field="identifier" :multiple="true"
                      :suggestions="doiIdentifierSuggestionsList" @complete="searchDoiIdentifiers"
                      @keyup.enter="acceptNewDoiIdentifier" @keyup.escape="clearDoiIdentifierSearch" />
                    <label :for="$scopedId('input-doiIdentifiers')">DOIs</label>
                  </span>
                  <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{ validationErrors.doiIdentifiers
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <AutoComplete ref="publicationIdentifiersInput" v-model="publicationIdentifiers"
                      :id="$scopedId('input-publicationIdentifiers')" :multiple="true"
                      :suggestions="publicationIdentifierSuggestionsList" @complete="searchPublicationIdentifiers"
                      @keyup.enter="acceptNewPublicationIdentifier" @keyup.escape="clearPublicationIdentifierSearch"
                      forceSelection>
                      <template #chip="slotProps">
                        <div>
                          <div>{{ slotProps.value.identifier }}</div>
                        </div>
                      </template>
                      <template #item="slotProps">
                        <div class="field">
                          <div>Title: {{ slotProps.item.title }}</div>
                          <div>DOI: {{ slotProps.item.publicationDoi || slotProps.item.preprintDoi }}</div>
                          <div>Identifier: {{ slotProps.item.identifier }}</div>
                          <div>Database: {{ slotProps.item.dbName }}</div>
                        </div>
                      </template>
                    </AutoComplete>
                    <label :for="$scopedId('input-publicationIdentifiers')">PubMed IDs</label>
                  </span>
                  <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{
                    validationErrors.publicationIdentifiers }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Multiselect ref="primaryPublicationIdentifiersInput" v-model="primaryPublicationIdentifiers"
                      :id="$scopedId('input-primaryPublicationIdentifiers')" :options="publicationIdentifiers"
                      optionLabel="identifier" placeholder="Select a primary publication (Where the dataset is described)"
                      :selectionLimit="1">
                      <template #option="slotProps">
                        <div class="field">
                          <div>Title: {{ slotProps.option.title }}</div>
                          <div>DOI: {{ slotProps.option.publicationDoi || slotProps.option.preprintDoi }}</div>
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
                <Message v-if="experiment" severity="info">
                  Some fields were autopopulated based on the selected experiment and should be inspected to ensure they
                  are still relevant to this score set.
                </Message>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload :id="$scopedId('input-extraMetadataFile')" :auto="false" chooseLabel="Extra metadata"
                      :class="inputClasses.extraMetadataFile" :customUpload="true" :fileLimit="1"
                      :showCancelButton="false" :showUploadButton="false" @remove="fileCleared('extraMetadataFile')"
                      @select="fileSelected('extraMetadataFile', $event)">
                      <template #empty>
                        <p>Drop a JSON file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{ validationErrors.extraMetadata
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Textarea v-model="dataUsagePolicy" :id="$scopedId('input-dataUsagePolicy')" rows="4" />
                    <label :for="$scopedId('input-dataUsagePolicy')">Data usage policy</label>
                  </span>
                  <span v-if="validationErrors.dataUsagePolicy" class="mave-field-error">{{
                    validationErrors.dataUsagePolicy }}</span>
                </div>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 md:col-6">
          <div v-if="itemStatus == 'NotLoaded' || this.item.private">
            <Card>
              <template #title>Targets</template>
              <template #content>
                <div>
                  <TabView class="field">
                    <TabPanel header="Target Sequence">
                      <div class="field">
                        <span class="p-float-label">
                          <AutoComplete ref="existingTargetGeneInput" v-model="existingTargetGene"
                            :id="$scopedId('input-existingTargetGene')" field="name" :forceSelection="true"
                            :suggestions="targetGeneSuggestionsList" @complete="searchTargetGenes" />
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
                          <Dropdown v-model="referenceGenome" :id="$scopedId('input-targetGeneReferenceGenome')"
                            :options="referenceGenomes" panelClass="mave-reference-genome-dropdown-panel">
                            <template #value="slotProps">
                              <div v-if="slotProps.value" class="mave-reference-genome-value">
                                <div class="mave-reference-genome-name">{{ slotProps.value.shortName }}</div>
                                <div class="mave-reference-genome-organism-name">{{ slotProps.value.organismName }}</div>
                              </div>
                              <div v-else class="mave-reference-genome-none">&nbsp;</div>
                            </template>
                            <template #option="slotProps">
                              <div class="mave-reference-genome-name">{{ slotProps.option.shortName }}</div>
                              <div class="mave-reference-genome-organism-name">{{ slotProps.option.organismName }}</div>
                            </template>
                          </Dropdown>
                          <label :for="$scopedId('input-targetGeneReferenceGenome')">Reference genome</label>
                        </span>
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
                            <Dropdown v-model="assembly" :id="$scopedId('input-targetGeneAssembly')" :options="assemblies"
                              optionGroupLabel="type" optionGroupChildren="assemblies" style="width: 100%">
                              <template #optiongroup="slotProps">
                                <div class="flex align-items-center dropdown-option-group">
                                  <div>{{ slotProps.option.type }}</div>
                                </div>
                              </template>
                            </Dropdown>

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
              </template>
              <template #footer>
                <div class="field">
                  <span v-if="targetGenes.length > 0">
                    <DataTable v-model:expandedRows="expandedTargetGeneRows" :value="targetGenes" dataKey="name">
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
                              <strong>Reference Name:</strong> {{ slotProps.data.targetSequence.reference.shortName }}<br>
                              <span v-if="validationErrors[`targetGenes.${slotProps.data.index}.referenceGenome`]"
                                class="mave-field-error">{{
                                  validationErrors[`targetGenes.${slotProps.data.index}.referenceGenome`] }}<br></span>
                              <strong>Reference Organism:</strong> {{ slotProps.data.targetSequence.reference.organismName
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
                <div class="field">
                  <Message v-if="targetGenes?.length > 1" severity="info">
                    When defining variants against multiple targets, uploaded variant coordinates should be fully
                    qualified with respect to target names or target accessions.
                  </Message>
                </div>
              </template>
            </Card>
            <Card>
              <template #title>Variant scores</template>
              <template #content>
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
              </template>
            </Card>
          </div>
        </div>
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
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable';
import { ref } from 'vue'

import EntityLink from '@/components/common/EntityLink'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import { normalizeDoi, normalizeIdentifier, normalizePubmedId, validateDoi, validateIdentifier, validatePubmedId } from '@/lib/identifiers'
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
  components: { AutoComplete, Button, Card, Chips, Column, DataTable, DefaultLayout, Dropdown, EntityLink, FileUpload, InputNumber, InputText, Message, Multiselect, ProgressSpinner, SelectButton, TabPanel, TabView, Textarea },

  setup: () => {
    const editableExperiments = useItems({
      itemTypeName: 'experiment',
      options: {
        filter: {
          query: { l: { path: 'something' }, r: { constant: 'value' } }
        }
      }
    })
    const doiIdentifierSuggestions = useItems({ itemTypeName: 'doi-identifier-search' })
    const publicationIdentifierSuggestions = useItems({ itemTypeName: 'publication-identifier-search' })
    const externalPublicationIdentifierSuggestions = useItems({ itemTypeName: 'external-publication-identifier-search' })
    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({ itemTypeName: `${dbName.toLowerCase()}-identifier-search` })
    }
    const licenses = useItems({ itemTypeName: 'license' })
    const referenceGenomes = useItems({ itemTypeName: 'reference-genome' })
    const geneNames = useItems({ itemTypeName: 'gene-names' })
    const assemblies = useItems({ itemTypeName: 'grouped-assemblies' })
    const targetGeneSuggestions = useItems({ itemTypeName: 'target-gene-search' })

    const expandedTargetGeneRows = ref([])

    return {
      ...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      editableExperiments: editableExperiments.items,
      licenses: licenses.items,
      doiIdentifierSuggestions: doiIdentifierSuggestions.items,
      setDoiIdentifierSearch: (text) => doiIdentifierSuggestions.setRequestBody({ text }),
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
      referenceGenomes: referenceGenomes.items,
      assemblies: assemblies.items,
      geneNames: geneNames.items,
      expandedTargetGeneRows
    }
  },

  props: {
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
    keywords: [],
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    dataUsagePolicy: null,
    targetGene: emptyTargetGene(),
    referenceGenome: null,
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
  }),

  computed: {
    targetGeneIdentifierSuggestionsList: function () {
      return _.fromPairs(
        externalGeneDatabases.map((dbName) => {
          const suggestions = this.targetGeneIdentifierSuggestions[dbName]
          return [dbName, this.suggestionsForAutocomplete(suggestions)]
        })
      )
    },
    doiIdentifierSuggestionsList: function () {
      return this.suggestionsForAutocomplete(this.doiIdentifierSuggestions)
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
    existingTargetGene: function () {
      if (_.isObject(this.existingTargetGene)) {
        // _.cloneDeep is needed because the target gene has been frozen.
        // this.targetGene = _.cloneDeep(this.existingTargetGene)
        const targetGene = _.cloneDeep(this.existingTargetGene)
        this.targetGene = _.merge({
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
            assembly: null,
            accession: null
          }
        }, targetGene)
        this.targetGene.externalIdentifiers = {}
        for (const dbName of externalGeneDatabases) {
          this.targetGene.externalIdentifiers[dbName] = (targetGene.externalIdentifiers || [])
            .find(({ identifier }) => identifier?.dbName == dbName) || {
            identifier: null,
            offset: null
          }
        }

        const referenceGenomeId = _.get(this.targetGene, 'targetSequence.reference.genome.id')
        this.referenceGenome = this.referenceGenomes.find((rg) => rg.id == referenceGenomeId)
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
    },
  },

  methods: {

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
        // TODO catch errors in response
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
        // TODO catch errors in response
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
        // TODO catch errors in response
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
        // TODO catch errors in response
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
      this.doiIdentifiers = event.value.doiIdentifiers
      this.keywords = event.value.keywords
      this.publicationIdentifiers = _.concat(event.value.primaryPublicationIdentifiers, event.value.secondaryPublicationIdentifiers)
      this.primaryPublicationIdentifiers = event.value.primaryPublicationIdentifiers.filter((primary) => {
        return this.publicationIdentifiers.some((publication) => {
          return primary.identifier === publication.identifier
        })
      })
    },

    acceptNewDoiIdentifier: function () {
      const input = this.$refs.doiIdentifiersInput
      const searchText = (input.modelValue || '').trim()
      if (validateDoi(searchText)) {
        const doi = normalizeDoi(searchText)
        this.doiIdentifiers = _.uniqBy([...this.doiIdentifiers, { identifier: doi }])
        input.modelValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        // input.$refs.input.value = ''
      }
    },

    clearDoiIdentifierSearch: function () {
      const input = this.$refs.doiIdentifiersInput
      input.modelValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      // input.$refs.input.value = ''
    },

    searchDoiIdentifiers: function (event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setDoiIdentifierSearch(event.query)
      }
    },

    // TODO accept other publication identifiers besides pubmed
    acceptNewPublicationIdentifier: function () {
      const input = this.$refs.publicationIdentifiersInput
      const searchText = (input.modelValue || '').trim()
      if (validatePubmedId(searchText)) {
        const pubmedId = normalizePubmedId(searchText)
        this.publicationIdentifiers = _.uniqBy([...this.publicationIdentifiers, { identifier: pubmedId }])
        input.modelValue = null

        // Clear the text input.
        // TODO This depends on PrimeVue internals more than I'd like:
        input.$refs.input.value = ''
      }
    },

    clearPublicationIdentifierSearch: function () {
      const input = this.$refs.publicationIdentifiersInput
      input.modelValue = null

      // Clear the text input.
      // TODO This depends on PrimeVue internals more than I'd like:
      input.$refs.input.value = ''
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
        this.keywords = this.item.keywords
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
        this.targetGene = emptyTargetGene()
        this.referenceGenome = this.item.referenceGenome
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
        this.keywords = []
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
        this.dataUsagePolicy = null
        this.extraMetadata = {}
        this.resetTarget()
        this.targetGenes = []
      }
    },

    resetTarget: function () {
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
      if (this.referenceGenome) {
        this.targetGene.targetSequence.reference = this.referenceGenome
        delete this.targetGene.targetAccession;
      }
      else if (this.assembly || this.geneName) {
        this.targetGene.targetAccession.assembly = this.assemblyDropdownValue
        this.targetGene.targetAccession.gene = this.geneNameDropdownValue // Name property on string object array
        delete this.targetGene.targetSequence;
      }
      else {
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
        experimentUrn: this.experiment?.urn,
        licenseId: this.licenseId,
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
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
      }
      else {
        // empty item arrays so that deleted items aren't merged back into editedItem object
        this.item.keywords = []
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
          this.$toast.add({ severity: 'error', summary: `Encountered an error saving score set: ${response.data.detail}`, life: 3000 })
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

.mave-reference-genome-none {
  min-width: 300px;
}

.mave-reference-genome-name {
  float: left;
  padding: 10px;
  min-width: 120px;
  margin: 0 5px 0 0;
  background: #eee;
}

.mave-reference-genome-organism-name {
  padding: 10px;
  margin-left: 125px;
  background: #f9f9f9;
}

.p-dropdown-item:nth-child(even) .mave-reference-genome-name {
  background: #ddd;
}

.p-dropdown-item:nth-child(even) .mave-reference-genome-organism-name {
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
</style>

<style>.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item {
  padding: 0;
}

.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
  background: #eef;
}

.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-reference-genome-name,
.mave-reference-genome-dropdown-panel.p-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover .mave-reference-genome-organism-name {
  background: #eef;
}
</style>
