<template>
  <EmailPrompt
    dialog="You must add an email address to your account to create or edit a score set. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <DefaultLayout :require-auth="true">
    <div v-if="itemId && itemStatus == 'Loaded'" class="mave-score-set-editor">
      <div class="grid">
        <div class="col-12">
          <div class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit score set {{ item.urn }}</div>
            <div class="mavedb-screen-title-controls">
              <Button @click="saveEditContent">Save changes</Button>
              <Button class="p-button-help" @click="resetForm">Reset</Button>
              <Button class="p-button-warning" @click="viewItem">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #title>Parent experiment and context</template>
            <template #content>
              <div v-if="item.experiment">
                Experiment:
                <router-link :to="{name: 'experiment', params: {urn: item.experiment.urn}}">{{
                  item.experiment.title
                }}</router-link>
              </div>
              <div v-else>
                <div class="field">
                  <span class="p-float-label">
                    <Select
                      :id="scopedId('input-experiment')"
                      v-model="experiment"
                      option-label="title"
                      :options="editableExperiments"
                      style="width: 50%"
                      @change="populateExperimentMetadata"
                    />
                    <label :for="scopedId('input-experiment')">Experiment</label>
                  </span>
                  <span v-if="validationErrors.experiment" class="mave-field-error">{{
                    validationErrors.experiment
                  }}</span>
                </div>
              </div>
              <div v-if="supersedesScoreSet">
                Supersedes:
                <router-link :to="{name: 'scoreSet', params: {urn: supersedesScoreSet.urn}}">{{
                  supersedesScoreSet.title
                }}</router-link>
              </div>
              <div v-if="item?.metaAnalyzesScoreSetUrns?.length > 0">
                Meta-analysis for:<br />
                <div v-for="metaAnalyzesScoreSetUrn of item.metaAnalyzesScoreSetUrns" :key="metaAnalyzesScoreSetUrn">
                  <EntityLink entity-type="scoreSet" :urn="metaAnalyzesScoreSetUrn"></EntityLink>
                </div>
              </div>
            </template>
          </Card>
          <Card>
            <template #title>Score set information</template>
            <template #content>
              <div class="field">
                <span class="p-float-label">
                  <InputText :id="scopedId('input-title')" v-model="title" />
                  <label :for="scopedId('input-title')">Title</label>
                </span>
                <span v-if="validationErrors.title" class="mave-field-error">{{ validationErrors.title }}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Textarea :id="scopedId('input-shortDescription')" v-model="shortDescription" rows="4" />
                  <label :for="scopedId('input-shortDescription')">Short description</label>
                </span>
                <span v-if="validationErrors.shortDescription" class="mave-field-error">{{
                  validationErrors.shortDescription
                }}</span>
              </div>
              <div class="field">
                <Tabs value="0">
                  <TabList>
                    <Tab value="0">Edit</Tab>
                    <Tab value="1">Preview</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel header="Edit" value="0">
                      <span class="p-float-label">
                        <Textarea :id="scopedId('input-abstractText')" v-model="abstractText" rows="4" />
                        <label :for="scopedId('input-abstractText')">Abstract</label>
                      </span>
                    </TabPanel>
                    <TabPanel header="Preview" value="1">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div v-html="markdownToHtml(abstractText)"></div>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
                <span v-if="validationErrors.abstractText" class="mave-field-error">{{
                  validationErrors.abstractText
                }}</span>
              </div>
              <div class="field">
                <Tabs value="0">
                  <TabList>
                    <Tab value="0">Edit</Tab>
                    <Tab value="1">Preview</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel header="Edit" value="0">
                      <span class="p-float-label">
                        <Textarea :id="scopedId('input-methodText')" v-model="methodText" rows="4" />
                        <label :for="scopedId('input-methodText')">Methods</label>
                      </span>
                    </TabPanel>
                    <TabPanel header="Preview" value="1">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div v-html="markdownToHtml(methodText)"></div>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
                <span v-if="validationErrors.methodText" class="mave-field-error">{{
                  validationErrors.methodText
                }}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <AutoComplete
                    :id="scopedId('input-contributors')"
                    v-model="contributors"
                    fluid
                    multiple
                    :option-label="(x) => x.givenName || x.familyName ? `${x.givenName} ${x.familyName} (${x.orcidId})` : x.orcidId"
                    :typeahead="false"
                    @blur="updateContributors"
                    @keyup.escape="clearAutoCompleteInput"
                    @keyup.space="updateContributors"
                    @update:model-value="newContributorsAdded"
                  />
                  <label :for="scopedId('input-contributors')">Contributors</label>
                </span>
                <span v-if="validationErrors.contributors" class="mave-field-error">{{
                  validationErrors.contributors
                }}</span>
              </div>
              <div>
                <div class="field">
                  <span class="p-float-label">
                    <Select
                      :id="scopedId('input-targetLicenseId')"
                      v-model="licenseId"
                      option-label="longName"
                      option-value="id"
                      :options="selectableLicenses"
                      style="width: 100%"
                    />
                    <label :for="scopedId('input-targetLicenseId')">License</label>
                  </span>
                  <span v-if="validationErrors.licenseId" class="mave-field-error">{{
                    validationErrors.licenseId
                  }}</span>
                </div>
                <div v-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.active !== true">
                  <Message severity="warn">
                    The currently selected license is outdated and no longer supported for new score sets. We highly
                    recommend switching to an updated license to ensure your dataset is not excluded from data
                    federation and aggregation by MaveDB collaborators.
                  </Message>
                </div>
                <div v-else-if="licenseId && licenses && licenses.find((l) => l.id == licenseId)?.shortName != 'CC0'">
                  <Message severity="warn">
                    Choosing a license with these restrictions may cause your dataset to be excluded from data
                    federation and aggregation by MaveDB collaborators.
                  </Message>
                </div>
                <div class="field">
                  <span class="p-float-label">
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
                    <label :for="scopedId('input-doiIdentifiers')">DOIs</label>
                  </span>
                  <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{
                    validationErrors.doiIdentifiers
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <AutoComplete
                      :id="scopedId('input-publicationIdentifiers')"
                      ref="publicationIdentifiersInput"
                      v-model="publicationIdentifiers"
                      class="p-inputwrapper-filled"
                      :multiple="true"
                      option-label="identifier"
                      :suggestions="publicationIdentifierSuggestionsList"
                      @complete="searchPublicationIdentifiers"
                      @keyup.escape="clearPublicationIdentifierSearch"
                      @option-select="acceptNewPublicationIdentifier"
                    >
                      <template #chip="slotProps">
                        <div class="p-inputchips-chip-item">
                          {{ slotProps.value.identifier }}: {{ truncatePublicationTitle(slotProps.value.title) }}
                          <div>
                            <i class="pi pi-times-circle" @click="removePublicationIdentifier(slotProps.value)"></i>
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
                    <label :for="scopedId('input-publicationIdentifiers')">Publication identifiers</label>
                  </span>
                  <span v-if="validationErrors.publicationIdentifiers" class="mave-field-error">{{
                    validationErrors.publicationIdentifiers
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
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
                  </span>
                  <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{
                    validationErrors.primaryPublicationIdentifiers
                  }}</span>
                </div>
                <Message v-if="experiment" closable severity="info">
                  Some fields were autopopulated based on the selected experiment and should be inspected to ensure they
                  are still relevant to this score set.
                </Message>
                <div class="field">
                  <span class="p-float-label">
                    <div v-if="extraMetadata">
                      <span class="mr-2"> Extra metadata</span>
                      <i class="pi pi-check mr-3"></i>
                      <Button
                        v-tooltip="{value: 'View extra metadata'}"
                        class="p-button-info mr-2"
                        icon="pi pi-eye"
                        @click="jsonToDisplay = JSON.stringify(extraMetadata, null, 2)"
                      ></Button>
                      <Button
                        v-tooltip="{value: 'Delete extra metadata'}"
                        class="p-button-danger mr-2"
                        icon="pi pi-times"
                        @click="fileCleared('extraMetadataFile')"
                      ></Button>
                    </div>
                    <FileUpload
                      v-else
                      :id="scopedId('input-extraMetadataFile')"
                      :key="inputExtraMetadataFileKey"
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
                        <p>Drop a JSON file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{
                    validationErrors.extraMetadata
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Textarea :id="scopedId('input-dataUsagePolicy')" v-model="dataUsagePolicy" rows="4" />
                    <label :for="scopedId('input-dataUsagePolicy')">Data usage policy</label>
                  </span>
                  <span v-if="validationErrors.dataUsagePolicy" class="mave-field-error">{{
                    validationErrors.dataUsagePolicy
                  }}</span>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <div class="col-12 md:col-6">
          <div v-if="item.private">
            <Card>
              <template #title>Targets</template>
              <template #content>
                <div>
                  <Tabs value="0" class="field">
                    <TabList>
                      <Tab value="0">Target Sequence</Tab>
                      <Tab value="1">Genomic Coordinates</Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel value="0">
                        <div class="field">
                          <span class="p-float-label">
                            <AutoComplete
                              :id="scopedId('input-existingTargetGene')"
                            ref="existingTargetGeneInput"
                            v-model="existingTargetGene"
                            field="name"
                            :force-selection="true"
                            :suggestions="targetGeneSuggestionsList"
                            @complete="searchTargetGenes"
                            >
                              <template #item="slotProps">
                                <div>
                                  <div>Name: {{ slotProps.item.name }}</div>
                                  <div>Category: {{ textForTargetGeneCategory(slotProps.item.category) }}</div>
                                  <div
                                    v-for="externalIdentifier of slotProps.item.externalIdentifiers"
                                    :key="externalIdentifier.identifier"
                                  >
                                    {{ externalIdentifier.identifier.dbName }}:
                                    {{ externalIdentifier.identifier.identifier }}, Offset:
                                    {{ externalIdentifier.offset }}
                                  </div>
                                </div>
                              </template>
                            </AutoComplete>
                            <label :for="scopedId('input-existingTargetGene')">Copy from an existing target gene</label>
                          </span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <InputText :id="scopedId('input-targetGeneName')" v-model="targetGene.name" />
                            <label :for="scopedId('input-targetGeneName')">Target name</label>
                          </span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <InputText
                              :id="scopedId('input-targetSequenceLabel')"
                              v-model="targetGene.targetSequence.label"
                            />
                            <label :for="scopedId('input-targetSequenceLabel')"
                              >Target label (only required when providing multiple targets)</label
                            >
                          </span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <SelectButton
                              :id="scopedId('input-targetGeneCategory')"
                              v-model="targetGene.category"
                              :option-label="textForTargetGeneCategory"
                              :options="targetGeneCategories"
                            />
                          </span>
                        </div>
                        <div v-for="dbName of externalGeneDatabases" :key="dbName" class="field field-columns">
                          <div class="field-column">
                            <span class="p-float-label">
                              <AutoComplete
                                :id="scopedId(`input-${dbName.toLowerCase()}Identifier`)"
                                :ref="`${dbName.toLowerCase()}IdentifierInput`"
                                v-model="targetGene.externalIdentifiers[dbName].identifier"
                                field="identifier"
                                :suggestions="targetGeneIdentifierSuggestionsList[dbName]"
                                @blur="acceptNewTargetGeneIdentifier(dbName)"
                                @complete="searchTargetGeneIdentifiers(dbName, $event)"
                                @keyup.enter="acceptNewTargetGeneIdentifier(dbName)"
                                @keyup.escape="clearTargetGeneIdentifierSearch(dbName)"
                              />
                              <label :for="scopedId(`input-${dbName.toLowerCase()}Identifier`)"
                                >{{ dbName }} identifier</label
                              >
                            </span>
                          </div>
                          <div class="field-column">
                            <span class="p-float-label">
                              <InputNumber
                                :id="scopedId(`input-${dbName.toLowerCase()}Offset`)"
                                v-model="targetGene.externalIdentifiers[dbName].offset"
                                button-layout="stacked"
                                :min="0"
                                show-buttons
                                suffix=" bp"
                              />
                              <label :for="scopedId(`input-${dbName.toLowerCase()}Offset`)">Offset</label>
                            </span>
                          </div>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <AutoComplete
                              :id="scopedId('input-targetSequenceTaxonomy')"
                              ref="taxonomyInput"
                              v-model="taxonomy"
                              dropdown
                              field="organismName"
                              :multiple="false"
                              :options="taxonomies"
                              :suggestions="taxonomySuggestionsList"
                              @complete="searchTaxonomies"
                              @keyup.escape="clearTaxonomySearch"
                            >
                              <template #item="slotProps">
                                {{ slotProps.item.code }} - {{ slotProps.item.organismName }}
                                <template
                                  v-if="slotProps.item.commonName !== 'NULL' && slotProps.item.commonName !== null"
                                  >/ {{ slotProps.item.commonName }}</template
                                >
                              </template>
                            </AutoComplete>
                            <label :for="scopedId('input-targetSequenceTaxonomy')">Taxonomy</label>
                          </span>
                          <span v-if="validationErrors['targetGene.targetSequence.taxonomy']" class="mave-field-error">{{
                            validationErrors['targetGene.targetSequence.taxonomy']
                          }}</span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <FileUpload
                              :id="scopedId('input-targetGeneTargetSequenceSequenceFile')"
                              ref="sequenceFileUpload"
                              :auto="false"
                              choose-label="Reference sequence"
                              :class="inputClasses.targetGeneTargetSequenceSequenceFile"
                              :custom-upload="true"
                              :file-limit="1"
                              :show-cancel-button="false"
                              :show-upload-button="false"
                              @remove="fileCleared('targetGeneTargetSequenceSequenceFile')"
                              @select="fileSelected('targetGeneTargetSequenceSequenceFile', $event)"
                            >
                              <template #empty>
                                <p>Drop a FASTA file here.</p>
                              </template>
                            </FileUpload>
                          </span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <SelectButton
                              :id="scopedId('input-targetGeneTargetSequenceSequenceType')"
                              v-model="targetGene.targetSequence.sequenceType"
                              :options="sequenceTypes"
                            />
                          </span>
                        </div>
                        <div>
                          <Button icon="pi pi-check" label="Add Target" @click="addTarget" />
                          <Button
                            class="p-button-help"
                            icon="pi pi-times"
                            label="Clear Target"
                            severity="secondary"
                            style="margin-left: 0.5em"
                            @click="resetTarget"
                          />
                        </div>
                      </TabPanel>
                      <TabPanel header="Genomic Coordinates" value="1">
                        <div class="field field-columns">
                          <div class="field-column">
                            <span class="p-float-label">
                              <InputText
                                :id="scopedId('input-targetGeneName')"
                                v-model="targetGene.name"
                                style="width: 100%"
                              />
                              <label :for="scopedId('input-targetGene')">Target gene name</label>
                            </span>
                          </div>
                          <div class="field-column">
                            <span class="p-float-label">
                              <!-- Assembly is the reference genome property in coordinate cases -->
                              <Select
                                :id="scopedId('input-targetGeneAssembly')"
                                v-model="assembly"
                                :options="assemblies"
                                style="width: 100%"
                              />
                              <label :for="scopedId('input-targetGeneAssembly')">Assembly</label>
                            </span>
                          </div>
                          <div class="field-column">
                            <span class="p-float-label">
                              <Select
                                :id="scopedId('input-targetGeneGeneNames')"
                                v-model="geneName"
                                filter
                                option-label="name"
                                :options="geneNamesAsObject"
                                style="width: 100%"
                                :virtual-scroller-options="{itemSize: 50}"
                                @change="autofillGeneName"
                              />
                              <label :for="scopedId('input-targetGeneAssembly')">HGNC Name</label>
                            </span>
                          </div>
                        </div>
                        <div class="field">
                          <span class="p-float-label pb-2">
                            Autocomplete By:
                            <SelectButton v-model="targetAutocomplete" aria-labelledby="basic" :options="targetOptions" />
                          </span>
                          <span class="p-float-label">
                            <AutoComplete
                              :id="scopedId('input-targetGene-accession')"
                              v-model="targetGene.targetAccession.accession"
                              :dropdown="true"
                              :force-selection="true"
                              :suggestions="targetGeneAccessionSuggestionsList"
                              @complete="fetchTargetAccessions"
                            />
                            <label :for="scopedId('input-targetGene-accession')">Accession/Transcript Identifier</label>
                          </span>
                        </div>
                        <div class="field">
                          <span class="p-float-label">
                            <SelectButton
                              :id="scopedId('input-targetGeneCategory')"
                              v-model="targetGene.category"
                              :option-label="textForTargetGeneCategory"
                              :options="targetGeneCategories"
                            />
                          </span>
                        </div>
                        <div>
                          <Button
                            icon="pi pi-check"
                            label="Add Target"
                            size="small"
                            @click="addTarget"
                          />
                          <Button
                            icon="pi pi-arrows-h"
                            label="Switch to Protein Accession"
                            severity="info"
                            size="small"
                            style="margin-left: 0.5em"
                            @click="swapNucleotideProteinAccessions"
                          />
                          <Button
                            class="p-button-help"
                            icon="pi pi-times"
                            label="Clear Target"
                            severity="secondary"
                            size="small"
                            style="margin-left: 0.5em"
                            @click="resetTarget"
                          />
                        </div>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </div>
              </template>
              <template #footer>
                <div class="field">
                  <span v-if="targetGenes.length > 0">
                    <DataTable v-model:expanded-rows="expandedTargetGeneRows" data-key="name" :value="targetGenes">
                      <template #header>
                        <h3 class="target-header">Created Targets</h3>
                      </template>
                      <Column expander style="width: 5rem" />
                      <Column field="name" header="Name"></Column>
                      <Column field="category" header="Category"></Column>
                      <Column>
                        <template #body="slotProps">
                          <Button
                            class="p-button-help"
                            icon="pi pi-minus-circle"
                            label="Remove"
                            severity="secondary"
                            size="small"
                            @click="targetDeleted(slotProps.data)"
                          />
                        </template>
                      </Column>
                      <template #expansion="slotProps">
                        <span
                          v-if="validationErrors[`targetGenes.${slotProps.data.index}.name`]"
                          class="mave-field-error"
                          >Gene Name {{ validationErrors[`targetGenes.${slotProps.data.index}.name`] }}</span
                        >
                        <span
                          v-if="validationErrors[`targetGenes.${slotProps.data.index}.category`]"
                          class="mave-field-error"
                          >Gene Category {{ validationErrors[`targetGenes.${slotProps.data.index}.category`] }}</span
                        >
                        <Card v-if="slotProps.data.targetSequence?.sequence" class="field">
                          <template #content>
                            <h3 class="compact-target">Genomic Sequence Data</h3>
                            <p v-if="slotProps.data.targetSequence.label" class="compact-target">
                              <strong>Sequence Label:</strong> {{ slotProps.data.targetSequence.label }}<br />
                              <span
                                v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.label`]"
                                class="mave-field-error"
                                >{{ validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.label`] }}<br
                              /></span>
                            </p>
                            <p class="compact-target">
                              <strong>Sequence Type:</strong> {{ slotProps.data.targetSequence.sequenceType }}<br />
                              <span
                                v-if="
                                  validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequenceType`]
                                "
                                class="mave-field-error"
                                >{{ validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequenceType`]
                                }}<br
                              /></span>
                              <strong>Taxonomy Organism Name:</strong>
                              {{ slotProps.data.targetSequence.taxonomy.organismName }}<br />
                              <span
                                v-if="validationErrors[`targetGenes.${slotProps.data.index}.taxonomy`]"
                                class="mave-field-error"
                                >{{ validationErrors[`targetGenes.${slotProps.data.index}.taxonomy`] }}<br
                              /></span>
                              <strong>Taxonomy Common Name:</strong>
                              {{ slotProps.data.targetSequence.taxonomy.commonName }}
                            </p>
                            <span
                              v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequence`]"
                              class="mave-field-error"
                              >{{
                                validationErrors[`targetGenes.${slotProps.data.index}.targetSequence.sequence`]
                              }}</span
                            >
                          </template>
                        </Card>
                        <Card v-if="slotProps.data.targetAccession?.accession">
                          <template #content>
                            <h3 class="compact-target">Accession Data</h3>
                            <p class="compact-target">
                              <strong>Assembly:</strong> {{ slotProps.data.targetAccession.assembly || 'N/A' }}<br />
                              <span
                                v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.assembly`]"
                                class="mave-field-error"
                                >{{ validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.assembly`]
                                }}<br
                              /></span>
                              <strong>Gene:</strong> {{ slotProps.data.targetAccession.gene || 'N/A' }}<br />
                              <span
                                v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.gene`]"
                                class="mave-field-error"
                                >{{ validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.gene`] }}<br
                              /></span>
                              <strong>Accession:</strong> {{ slotProps.data.targetAccession.accession }}<br />
                              <span
                                v-if="validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.accession`]"
                                class="mave-field-error"
                                >{{
                                  validationErrors[`targetGenes.${slotProps.data.index}.targetAccession.accession`]
                                }}</span
                              >
                            </p>
                          </template>
                        </Card>
                        <Card v-if="slotProps.data.externalIdentifiers.length > 0">
                          <template #content>
                            <h3 class="target-header">External Identifier Data</h3>
                            <div
                              v-for="externalId of slotProps.data.externalIdentifiers"
                              :key="externalId"
                              class="compact-target"
                            >
                              <p class="compact-target">
                                <strong>{{ externalId.identifier.dbName }}:</strong>
                                {{ externalId.identifier.identifier }}, <strong>Offset:</strong> {{ externalId.offset }}
                              </p>
                              <span
                                v-if="
                                  validationErrors[
                                    `targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.identifier`
                                  ]
                                "
                                class="mave-field-error"
                                >{{
                                  validationErrors[
                                    `targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.identifier`
                                  ]
                                }}</span
                              ><br />
                              <span
                                v-if="
                                  validationErrors[
                                    `targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.offset`
                                  ]
                                "
                                class="mave-field-error"
                                >{{
                                  validationErrors[
                                    `targetGenes.${slotProps.data.index}.externalIdentifiers.${externalId.identifier.dbName}.offset`
                                  ]
                                }}</span
                              >
                            </div>
                          </template>
                        </Card>
                      </template>
                      <template #footer>
                        <div class="flex flex-wrap justify-content-start gap-2">
                          <Button
                            class="p-button-help"
                            icon="pi pi-times-circle"
                            label="Clear all"
                            severity="secondary"
                            size="small"
                            @click="targetsCleared"
                          />
                        </div>
                      </template>
                    </DataTable>
                  </span>

                  <div class="field-column">
                    <div class="field" style="margin-top: 1em">
                      <ToggleSwitch v-model="isBaseEditor" :aria-labelledby="scopedId('input-isBaseEditorData')" />
                      <span style="margin-left: 1em">{{
                        isBaseEditor
                          ? 'This score set represents base editor data.'
                          : 'This score set does not represent base editor data.'
                      }}</span>
                    </div>
                  </div>
                </div>
                <span v-if="validationErrors['targetGenes']" class="mave-field-error">{{
                  validationErrors['targetGenes']
                }}</span>
                <div class="field">
                  <Message v-if="targetGenes[0]?.targetAccession?.accession" severity="info">
                    When defining variants against an accession based target, uploaded variant coordinates should be
                    fully qualified with respect to target names or target accessions (e.g: NC_000001.1:c.1A>C).
                  </Message>
                  <Message v-else-if="targetGenes?.length > 1" severity="info">
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
                <div v-else>Load a scores file and an optional counts file:</div>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload
                      :id="scopedId('input-scoresFile')"
                      ref="scoresFileUpload"
                      accept="text/csv"
                      :auto="false"
                      choose-label="Scores file"
                      :class="inputClasses.scoresFile || ''"
                      :custom-upload="true"
                      :file-limit="1"
                      :show-cancel-button="false"
                      :show-upload-button="false"
                    >
                      <template #empty>
                        <p>Drop a file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.scoresFile" class="mave-field-error">{{
                    validationErrors.scoresFile
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <div v-if="scoreColumnsMetadata">
                      <span class="mr-2">Scores column metadata</span>
                      <i class="pi pi-check mr-3"></i>
                      <Button
                        v-tooltip="{value: 'View scores column metadata'}"
                        class="p-button-info mr-2"
                        icon="pi pi-eye"
                        @click="jsonToDisplay = JSON.stringify(scoreColumnsMetadata, null, 2)"
                      ></Button>
                      <Button
                        v-tooltip="{value: 'Delete scores column metadata'}"
                        class="p-button-danger mr-2"
                        icon="pi pi-times"
                        @click="fileCleared('scoreColumnsMetadataFile')"
                      ></Button>
                    </div>
                    <FileUpload
                      v-else
                      :id="scopedId('input-scoreColumnsMetadataFile')"
                      accept="application/json"
                      :auto="false"
                      choose-label="Scores column metadata file"
                      :class="inputClasses.scoreColumnsMetadataFile || ''"
                      :custom-upload="true"
                      :file-limit="1"
                      :show-cancel-button="false"
                      :show-upload-button="false"
                      @remove="fileCleared('scoreColumnsMetadataFile')"
                      @select="fileSelected('scoreColumnsMetadataFile', $event)"
                    >
                      <template #empty>
                        <p>Drop a JSON file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.scoreColumnsMetadataFile" class="mave-field-error">{{
                    validationErrors.scoreColumnsMetadataFile
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <FileUpload
                      :id="scopedId('input-countsFile')"
                      ref="countsFileUpload"
                      accept="text/csv"
                      :auto="false"
                      choose-label="Counts file"
                      :class="inputClasses.countsFile || ''"
                      :custom-upload="true"
                      :file-limit="1"
                      :show-cancel-button="false"
                      :show-upload-button="false"
                    >
                      <template #empty>
                        <p>Drop a file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.countsFile" class="mave-field-error">{{
                    validationErrors.countsFile
                  }}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <div v-if="countColumnsMetadata">
                      <span class="mr-2">Counts column metadata</span>
                      <i class="pi pi-check mr-3"></i>
                      <Button
                        v-tooltip="{value: 'View counts column metadata'}"
                        class="p-button-info mr-2"
                        icon="pi pi-eye"
                        @click="jsonToDisplay = JSON.stringify(countColumnsMetadata, null, 2)"
                      ></Button>
                      <Button
                        v-tooltip="{value: 'Delete counts column metadata'}"
                        class="p-button-danger mr-2"
                        icon="pi pi-times"
                        @click="fileCleared('countColumnsMetadataFile')"
                      ></Button>
                    </div>
                    <FileUpload
                      v-else
                      :id="scopedId('input-countColumnsMetadataFile')"
                      accept="application/json"
                      :auto="false"
                      choose-label="Counts column metadata file"
                      :class="inputClasses.countColumnsMetadataFile || ''"
                      :custom-upload="true"
                      :file-limit="1"
                      :show-cancel-button="false"
                      :show-upload-button="false"
                      @remove="fileCleared('countColumnsMetadataFile')"
                      @select="fileSelected('countColumnsMetadataFile', $event)"
                    >
                      <template #empty>
                        <p>Drop a JSON file here.</p>
                      </template>
                    </FileUpload>
                  </span>
                  <span v-if="validationErrors.countColumnsMetadataFile" class="mave-field-error">{{
                    validationErrors.countColumnsMetadataFile
                  }}</span>
                </div>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </div>
    <ProgressSpinner v-if="progressVisible" class="mave-progress" />
    <Dialog
      v-model:visible="jsonToDisplay"
      :close-on-escape="true"
      modal
      :style="{maxWidth: '90%', width: '50rem'}"
      @close="jsonToDisplay = null"
    >
      <span style="white-space: pre-wrap; font-family: monospace">
        {{ jsonToDisplay }}
      </span>
    </Dialog>
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
import DataTable from 'primevue/datatable'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import Multiselect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import Tabs from 'primevue/tabs'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'
import {ref} from 'vue'
import {useHead} from '@unhead/vue'

import EmailPrompt from '@/components/common/EmailPrompt'
import EntityLink from '@/components/common/EntityLink'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useScopedId from '@/composables/scoped-id'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizeIdentifier, validateDoi, validateIdentifier} from '@/lib/identifiers'
import {ORCID_ID_REGEX} from '@/lib/orcid'
import {TARGET_GENE_CATEGORIES, textForTargetGeneCategory} from '@/lib/target-genes'

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
    externalIdentifiers: _.fromPairs(externalGeneDatabases.map((dbName) => [dbName, {identifier: null, offset: null}]))
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
    Select,
    EmailPrompt,
    EntityLink,
    FileUpload,
    InputNumber,
    InputText,
    ToggleSwitch,
    Message,
    Multiselect,
    ProgressSpinner,
    SelectButton,
    Tabs,
    Tab,
    TabList,
    TabPanels,
    TabPanel,
    Textarea,
    Dialog
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    useHead({title: 'Edit score set'})

    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})
    const targetGeneIdentifierSuggestions = {}
    for (const dbName of externalGeneDatabases) {
      targetGeneIdentifierSuggestions[dbName] = useItems({itemTypeName: `${dbName.toLowerCase()}-identifier-search`})
    }
    const licenses = useItems({itemTypeName: 'license'})
    const taxonomies = useItems({itemTypeName: 'taxonomy'})
    const taxonomySuggestions = useItems({itemTypeName: 'taxonomy-search'})
    const geneNames = useItems({itemTypeName: 'gene-names'})
    const assemblies = useItems({itemTypeName: 'assemblies'})
    const targetGeneSuggestions = useItems({itemTypeName: 'target-gene-search'})
    const expandedTargetGeneRows = ref([])

    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'scoreSet'}),
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
      expandedTargetGeneRows,
      textForTargetGeneCategory: textForTargetGeneCategory
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
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    contributors: [],
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
    targetOptions: ['Assembly', 'HGNC'],
    targetAutocomplete: 'HGNC',
    extraMetadata: null,
    scoreColumnsMetadata: null,
    countColumnsMetadata: null,
    inputExtraMetadataFileKey: 0,
    // inputScoreColumnsMetadataFileKey: 0,
    // inputCountColumnsMetadataFileKey: 0,
    jsonToDisplay: null,

    existingTargetGene: null,
    targetGenes: [],

    // Static sets of options:
    sequenceTypes: ['DNA', 'protein'],
    targetGeneCategories: TARGET_GENE_CATEGORIES,
    rangeClassifications: [
      {value: 'normal', label: 'Normal'},
      {value: 'abnormal', label: 'Abnormal'},
      {value: 'not_specified', label: 'Not Specified'}
    ],

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null,
      scoreColumnsMetadataFile: null,
      countColumnsMetadataFile: null
    },
    externalGeneDatabases,
    metaAnalyzesScoreSetSuggestions: [],
    supersededScoreSetSuggestions: [],
    targetGeneAccessionSuggestions: [],
    validationErrors: {},

    isBaseEditor: false
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
    targetGeneAccessionSuggestionsList: function () {
      if (!this.targetGeneAccessionSuggestions || this.targetGeneAccessionSuggestions.length == 0) {
        return ['']
      }
      return this.targetGeneAccessionSuggestions
    },
    defaultLicenseId: function () {
      return this.licenses ? this.licenses.find((license) => license.shortName == 'CC0')?.id : null
    },
    selectableLicenses: function () {
      return this.licenses ? this.licenses.filter((license) => this.licenseIsSelectable(license)) : []
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
      handler: async function (newValue, oldValue) {
        if (newValue == oldValue) {
          return
        }
        this.geneNameDropdownValue = this.geneName?.name || null
        if (this.geneNameDropdownValue) {
          this.geneNameAccessionSuggestions = await this.fetchTargetAccessionsByGene(this.geneNameDropdownValue)
        }
      }
    },
    assembly: {
      handler: async function (newValue, oldValue) {
        if (newValue == oldValue) {
          return
        }
        this.assemblyDropdownValue = this.assembly?.trim() || null
        if (this.assemblyDropdownValue) {
          this.assemblySuggestions = await this.fetchTargetAccessionsByAssembly(this.assemblyDropdownValue)
        }
      }
    }
  },

  mounted: async function () {
    await this.loadEditableExperiment()
  },

  methods: {
    clearAutoCompleteInput: function(event) {
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
        return response.data?.scoreSets || []
      } catch (err) {
        console.log(`Error while loading search results")`, err)
        return []
      }
    },

    fetchTargetAccessions: async function (event) {
      if (this.targetAutocomplete == 'Assembly') {
        if (this.assemblyDropdownValue) {
          this.targetGeneAccessionSuggestions = this.assemblySuggestions
        }
      } else {
        if (this.geneNameDropdownValue) {
          this.targetGeneAccessionSuggestions = this.geneNameAccessionSuggestions
        }
      }

      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.targetGeneAccessionSuggestions = this.targetGeneAccessionSuggestions.filter((s) =>
          s?.toLowerCase().includes(searchText.toLowerCase())
        )
      }
    },

    fetchTargetAccessionsByAssembly: async function (assembly) {
      const url = `${config.apiBaseUrl}/hgvs/${assembly}/accessions`
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
      const url = `${config.apiBaseUrl}/hgvs/gene/${gene}`
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

    autofillGeneName: function (changeEvent) {
      if (!this.targetGene.name) {
        this.targetGene.name = changeEvent.value.name // Gene Name string object
      }
    },

    swapNucleotideProteinAccessions: async function () {
      if (this.targetGene.targetAccession.accession.startsWith('NP')) {
        // Don't do anything if we already are operating on a protein transcript
        this.$toast.add({
          severity: 'info',
          summary: `${this.targetGene.targetAccession.accession} is already a protein accession.`,
          life: 3000
        })
        return
      }
      const url = `${config.apiBaseUrl}/hgvs/protein/${this.targetGene.targetAccession.accession}`
      try {
        const response = await axios.get(url, {
          headers: {
            accept: 'application/json'
          }
        })
        // TODO (#130) catch errors in response
        if (!response.data) {
          this.$toast.add({
            severity: 'error',
            summary: `No matching protein accession found for ${this.targetGene.targetAccession.accession}`,
            life: 3000
          })
        }
        this.targetGene.targetAccession.accession = response.data || this.targetGene.targetAccession.accession // Maintain current accession when response is empty
      } catch (err) {
        console.log(`Error while loading protein accession")`, err)
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
          summary: `DOI "${newDoi}" is already associated with this experiment`,
          life: 3000
        })
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, {identifier: newDoi})
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity: 'warn', summary: `"${searchText}" is not a valid DOI`, life: 3000})
      }
    },

    clearDoiIdentifierSearch: function () {
      // This could change with a new Primevue version.
      const input = this.$refs.doiIdentifiersInput
      input.$refs.input.value = ''
    },

    removeDoiIdentifier: function (doiIdentifier) {
      const index = this.doiIdentifiers.findIndex(d => d.identifier === doiIdentifier.identifier)
      if (index !== -1) {
        this.doiIdentifiers.splice(index, 1)
      }
    },

    acceptNewPublicationIdentifier: function () {
      // Assume the newest value is the right-most one. That seems to always be true in this version of PrimeVue, but it
      // might change in the future.
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

    removePublicationIdentifier: function (value) {
      const removedIdentifier = value.identifier
      const publicationIdx = this.publicationIdentifiers.findIndex((pub) => pub.identifier == removedIdentifier)
      if (publicationIdx != -1) {
        this.publicationIdentifiers.splice(publicationIdx, 1)
      }
      // If we are removing a primary publication identifier, also remove it from that list.
      const primaryIdx = this.primaryPublicationIdentifiers.findIndex((pub) => pub.identifier == removedIdentifier)
      if (primaryIdx != -1) {
        this.primaryPublicationIdentifiers.splice(primaryIdx, 1)
      }
    },

    clearPublicationIdentifierSearch: function () {
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

    truncatePublicationTitle: function (title) {
      return title.length > 50 ? title.slice(0, 50) + '...' : title
    },

    acceptNewTargetGeneIdentifier: function (dbName) {
      const input = this.$refs[`${dbName.toLowerCase()}IdentifierInput`][0]
      const searchText = (input.modelValue || '').trim()

      // Only accept the current search text if we haven't set an identifier. When the user starts typing, the current
      // identifier is cleared.
      const currentIdentifier = this.targetGene.externalIdentifiers[dbName]?.identifier?.identifier
      if (!currentIdentifier) {
        if (searchText == '') {
          this.targetGene.externalIdentifiers[dbName].identifier = null
        } else if (validateIdentifier(dbName, searchText)) {
          const identifier = normalizeIdentifier(dbName, searchText)
          this.targetGene.externalIdentifiers[dbName].identifier = {identifier: identifier, dbName: dbName}
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

    clearTaxonomySearch: function () {
      const input = this.$refs.taxonomyInput
      input.inputTextValue = null
    },

    searchTaxonomies: function (event) {
      // if no search text, then return all taxonomy list. Otherwise, return the searching results.
      // If not do in this way, dropdown button can't work.
      this.setTaxonomySearch(event.query)
    },

    // A license is selectable if it is the active license for a score set or if it is marked as active
    // in the backend.
    licenseIsSelectable: function (license) {
      if (this.item?.license.id === license.id) {
        return true
      } else {
        return license.active
      }
    },

    targetsCleared: function () {
      this.targetGenes = []
    },

    targetDeleted: function (target) {
      this.targetGenes = this.targetGenes.filter((val) => val !== target)
      this.targetGenes.forEach(function (target, index) {
        target.index = index
      })
    },

    fileCleared: function (inputName) {
      this.jsonToDisplay = null
      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
        this.inputExtraMetadataFileKey += 1 // force re-mount of file upload component, otherwise button doesn't re-appear
      } else if (inputName == 'scoreColumnsMetadataFile') {
        this.scoreColumnsMetadata = null
        delete this.clientSideValidationErrors.scoreColumnsMetadata
        this.inputScoreColumnsMetadataFileKey += 1
      } else if (inputName == 'countColumnsMetadataFile') {
        this.countColumnsMetadata = null
        delete this.clientSideValidationErrors.countColumnsMetadata
        this.inputCountColumnsMetadataFileKey += 1
      }
      // ensure files are cleared from sequence loader even when remove button not used
      else if (inputName == 'targetGeneTargetSequenceSequenceFile') {
        this.$refs.sequenceFileUpload.files = []
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    validateJsonObject: function (data, fieldName) {
      if (!_.isObject(data) || _.isArray(data)) {
        this.clientSideValidationErrors[fieldName] =
          `${_.startCase(fieldName)} must be a JSON object (not an array or simple value).`
      } else {
        delete this.clientSideValidationErrors[fieldName]
      }
    },

    fileSelected: async function (inputName, event) {
      const file = event.files[0]
      if (file) {
        const text = await file.text()
        switch (inputName) {
          case 'extraMetadataFile':
            {
              try {
                this.extraMetadata = JSON.parse(text)
                this.validateJsonObject(this.extraMetadata, 'extraMetadata')
              } catch {
                this.clientSideValidationErrors.extraMetadata = 'The file did not contain valid JSON text.'
                console.log('Extra metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'scoreColumnsMetadataFile':
            {
              try {
                this.scoreColumnsMetadata = JSON.parse(text)
                this.validateJsonObject(this.scoreColumnsMetadata, 'scoreColumnsMetadata')
              } catch {
                this.clientSideValidationErrors.scoreColumnsMetadata = 'The file did not contain valid JSON text.'
                console.log('Scores column metadata file did not contain valid JSON text.')
              }
            }
            break
          case 'countColumnsMetadataFile':
            {
              try {
                this.countColumnsMetadata = JSON.parse(text)
                this.validateJsonObject(this.countColumnsMetadata, 'countColumnsMetadata')
              } catch {
                this.clientSideValidationErrors.countColumnsMetadata = 'The file did not contain valid JSON text.'
                console.log('Counts column metadata file did not contain valid JSON text.')
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
                const fastaData = fastaParser.parse(text)
                if (fastaData.length == 0) {
                  this.targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] =
                    'The FASTA file contains no sequences.'
                } else if (fastaData.length > 1) {
                  this.targetGene.targetSequence.sequence = null
                  this.clientSideValidationErrors['targetGene.targetSequence.sequence'] =
                    'The FASTA file contains more than one sequence.'
                } else {
                  this.targetGene.targetSequence.sequence = fastaData[0].sequence
                  delete this.clientSideValidationErrors['targetGene.targetSequence.sequence']
                }
              } catch {
                this.targetGene.targetSequence.sequence = null
                this.clientSideValidationErrors['targetGene.targetSequence.sequence'] =
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
        this.publicationIdentifiers = _.concat(
          this.item.primaryPublicationIdentifiers,
          this.item.secondaryPublicationIdentifiers
        )
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
      this.geneNameDropdownValue = null
      this.fileCleared('targetGeneTargetSequenceSequenceFile')
      this.referenceGenome = null
      this.targetGene = emptyTargetGene()
    },

    addTarget: function () {
      if (this.taxonomy) {
        this.targetGene.targetSequence.taxonomy = this.taxonomy
        delete this.targetGene.targetAccession
      } else if (this.assembly || this.geneName) {
        this.targetGene.targetAccession.assembly = this.assemblyDropdownValue
        this.targetGene.targetAccession.gene = this.geneNameDropdownValue // Name property on string object array
        delete this.targetGene.targetSequence
      } else {
        this.$toast.add({severity: 'error', summary: 'Target must include taxonomy or assembly and gene name.'})
        return null // target must include one of the above objects
      }
      this.targetGene.externalIdentifiers = _.keys(this.targetGene.externalIdentifiers)
        .map((dbName) => {
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
        })
        .filter(Boolean)
      this.targetGenes.push(_.clone(this.targetGene))
      // set index property on each target gene to surface error data
      this.targetGenes.forEach(function (target, index) {
        target.index = index
      })
      this.$toast.add({
        severity: 'success',
        summary: `Target ${this.targetGene.name} was added successfully.`,
        life: 3000
      })
      this.resetTarget()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Saving changes
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO It would be nice to let the items state module handle saving.
    // Currently there is some special handling here, though, so we will leave that for a later refactoring.

    save: async function () {
      if (!this.item) {
        this.$toast.add({severity: 'error', summary: 'No score set to save.'})
        return
      }
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
      const editedFields = {
        experimentUrn: this.experiment?.urn,
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
        extraMetadata: this.extraMetadata || {},
        scoreColumnsMetadata: this.scoreColumnsMetadata || {},
        countColumnsMetadata: this.countColumnsMetadata || {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        targetGenes: this.targetGenes.map(({index, ...target}) => {
          // drop index property from target genes before save
          if (target.targetAccession) {
            target.targetAccession.isBaseEditor = this.isBaseEditor
          }
          return target
        })
      }

      // empty item arrays so that deleted items aren't merged back into editedItem object
      this.item.contributors = []
      this.item.doiIdentifiers = []
      this.item.primaryPublicationIdentifiers = []
      this.item.publicationIdentifiers = []
      this.item.rawReadIdentifiers = []
      this.item.targetGenes = []

      // clear objects so that deleted values aren't merged back into editedItem object
      this.item.extraMetadata = null
      //this.item.datasetColumns = null

      // const editedItem = _.merge({}, this.item, editedFields)
      const editedItem = editedFields

      this.progressVisible = true
      let response = null

      // convert editedItem to multi-part form data
      const formData = new FormData()
      for (const key in editedItem) {
        if (_.isArray(editedItem[key]) || _.isObject(editedItem[key])) {
          formData.append(_.snakeCase(key), JSON.stringify(editedItem[key]))
        } else if (_.has(editedItem, key) && editedItem[key] !== null && editedItem[key] !== undefined) {
          formData.append(_.snakeCase(key), editedItem[key])
        }
      }

      // Add upload files to form data
      if (this.$refs.scoresFileUpload?.files.length == 1) {
        formData.append('scores_file', this.$refs.scoresFileUpload.files[0])
      }
      if (this.$refs.countsFileUpload?.files.length == 1) {
        formData.append('counts_file', this.$refs.countsFileUpload.files[0])
      }
      // if (this.$refs.scoreColumnsMetadataFileUpload.files.length == 1) {
      //   formData.append('score_columns_metadata_file', this.$refs.scoreColumnsMetadataFileUpload.files[0])
      // }
      // if (this.$refs.countColumnsMetadataFileUpload.files.length == 1) {
      //   formData.append('count_columns_metadata_file', this.$refs.countColumnsMetadataFileUpload.files[0])
      // }

      try {
        this.progressVisible = true
        response = await axios.patch(`${config.apiBaseUrl}/score-sets-with-variants/${this.item.urn}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        this.progressVisible = false
      } catch (e) {
        response = e.response || {status: 500}
        this.$toast.add({severity: 'error', summary: 'Error', life: 3000})
      }
      this.progressVisible = false
      if (response.status == 200) {
        this.validationErrors = {}
        this.$router.replace({path: `/score-sets/${this.item.urn}`})
        this.$toast.add({severity: 'success', summary: 'Your changes were saved.', life: 3000})
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({
            severity: 'error',
            summary: `Encountered an error saving score set: ${response.data.detail}`,
            life: 10000
          })
        } else {
          for (const error of response.data.detail) {
            console.log(error)
            let path = _.map(error.loc, _.camelCase)
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
            if (
              _.isEqual(_.slice(path, 0, 1), ['targetGenes']) &&
              _.isEqual(_.slice(path, 2, 3), ['externalIdentifiers'])
            ) {
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

    validateAndSave: async function () {
      this.clientSideValidationErrors = {}

      const hasScoresFile = this.$refs.scoresFileUpload?.files.length == 1
      const hasCountsFile = this.$refs.countsFileUpload?.files.length == 1
      if (hasCountsFile && !hasScoresFile) {
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
        this.$router.replace({path: `/score-sets/${this.item.urn}`})
      }
    },

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

<style scoped src="../../assets/forms.css"></style>

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
  flex-direction: row;
}

.field-column {
  position: relative;
  flex: 1 1 0;
  margin-left: 10px;
}

.field-column:first-child {
  margin-left: 0;
}

.mavedb-score-range-container {
  display: flex;
  flex-direction: row;
  flex-flow: row wrap;
}

.mavedb-score-range-container > * {
  flex: 1 100%;
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

.p-inputwrapper, .p-textarea, .p-inputtext {
  width: 100%;
}

/* Progress indicator */

.mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}
</style>
