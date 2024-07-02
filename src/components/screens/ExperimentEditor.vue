<template>
  <DefaultLayout>
    <EmailPrompt
      dialog="You must add an email address to your account to create or edit an experiment. You can do so below, or on the 'Settings' page."
      :isFirstLoginPrompt="false"
    />
    {{ experimentSetUrn }}
    <div class="mave-experiment-editor">
      <div class="grid">
        <div class="col-12">
          <div v-if="itemStatus != 'NotLoaded'" class="mave-screen-title-bar">
            <div class="mave-screen-title">Edit experiment {{this.item.urn}}</div>
            <div v-if="item" class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save changes</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="viewItem" class="p-button-warning">Cancel</Button>
            </div>
          </div>
          <div v-else class="mave-screen-title-bar">
            <div class="mave-screen-title">Create a new experiment</div>
            <div class="mave-screen-title-controls">
              <Button @click="validateAndSave">Save experiment</Button>
              <Button @click="resetForm" class="p-button-help">Clear</Button>
              <Button @click="backDashboard" class="p-button-warning">Cancel</Button>
            </div>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
              <div v-if="experimentSetUrn" class="field">
                <label :for="$scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px;">Experiment set:</label>
                <span :id="$scopedId('field-value-experiment-set')">{{ experimentSetUrn }}</span>
                <span v-if="validationErrors.experimentSetUrn" class="mave-field-error">{{validationErrors.experimentSetUrn}}</span>
                <div v-if="!item" class="mave-field-help">
                  To add an experiment to a different set, please navigate to the experiment set first and click "Add experiment."
                </div>
              </div>
              <div class="field" v-else>
                <label :for="$scopedId('field-value-experiment-set')" style="font-weight: bold; margin-right: 5px;">Experiment set:</label>
                <span :id="$scopedId('field-value-experiment-set')">(New experiment set)</span>
                <div class="mave-field-help">
                  To add an experiment to an existing set, please navigate to the experiment set first and click "Add experiment."
                </div>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <InputText v-model="title" :id="$scopedId('input-title')" />
                  <label :for="$scopedId('input-title')">Title</label>
                </span>
                <span v-if="validationErrors.title" class="mave-field-error">{{validationErrors.title}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Textarea v-model="shortDescription" :id="$scopedId('input-shortDescription')" rows="4" />
                  <label :for="$scopedId('input-shortDescription')">Short description</label>
                </span>
                <span v-if="validationErrors.shortDescription" class="mave-field-error">{{validationErrors.shortDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Chips
                      ref="doiIdentifiersInput"
                      v-model="doiIdentifiers"
                      :id="$scopedId('input-doiIdentifiers')"
                      :addOnBlur="true"
                      :allowDuplicate="false"
                      @add="acceptNewDoiIdentifier"
                      @keyup.escape="clearDoiIdentifierSearch"
                    >
                      <template #chip="slotProps">
                        <div>
                            <span>{{ slotProps.value.identifier }}</span>
                        </div>
                    </template>
                  </Chips>
                  <label :for="$scopedId('input-doiIdentifiers')">DOIs</label>
                </span>
                <span v-if="validationErrors.doiIdentifiers" class="mave-field-error">{{validationErrors.doiIdentifiers}}</span>
              </div>
              <div class="field">
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
              <div class="field">
                <span class="p-float-label" style="display:block">
                  <Multiselect
                    ref="primaryPublicationIdentifiersInput"
                    v-model="primaryPublicationIdentifiers"
                    :id="$scopedId('input-primaryPublicationIdentifiers')"
                    :options="publicationIdentifiers"
                    optionLabel="identifier"
                    placeholder="Select a primary publication (Where the dataset is described)"
                    :selectionLimit="1"
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
                  <label :for="$scopedId('input-primaryPublicationIdentifiers')">Primary publication</label>
                </span>
                <span v-if="validationErrors.primaryPublicationIdentifiers" class="mave-field-error">{{validationErrors.primaryPublicationIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Chips
                      ref="rawReadIdentifiersInput"
                      v-model="rawReadIdentifiers"
                      :id="$scopedId('input-rawReadIdentifiers')"
                      :addOnBlur="true"
                      :allowDuplicate="false"
                      @add="acceptNewRawReadIdentifier">
                      @keyup.escape="clearRawReadIdentifierSearch"
                      <template #chip="slotProps">
                        <div>
                            <span>{{ slotProps.value.identifier }}</span>
                        </div>
                    </template>
                  </Chips>
                  <label :for="$scopedId('input-rawReadIdentifiers')">Raw Read</label>
                </span>
                <span v-if="validationErrors.rawReadIdentifiers" class="mave-field-error">{{validationErrors.rawReadIdentifiers}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <FileUpload
                      :id="$scopedId('input-extraMetadataFile')"
                      :auto="false"
                      chooseLabel="Extra metadata"
                      :class="inputClasses.extraMetadataFile"
                      :customUpload="true"
                      :fileLimit="1"
                      :showCancelButton="false"
                      :showUploadButton="false"
                      @remove="fileCleared('extraMetadataFile')"
                      @select="fileSelected('extraMetadataFile', $event)"
                  >
                    <template #empty>
                      <p>Drop a JSON file here.</p>
                    </template>
                  </FileUpload>
                </span>
                <span v-if="validationErrors.extraMetadata" class="mave-field-error">{{validationErrors.extraMetadata}}</span>
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
                <span v-if="validationErrors.abstractText" class="mave-field-error">{{validationErrors.abstractText}}</span>
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
                <span v-if="validationErrors.methodText" class="mave-field-error">{{validationErrors.methodText}}</span>
              </div>
            </template>
          </Card>
        </div>
        <div class="col-12 md:col-6">
          <Card>
            <template #content>
              <div class="field">Please click <Button icon="pi pi-plus" aria-label="Filter" size="small"/> if you  would like to add a description. </div>
              <div class="field">
                <Button class="p-button-help" @click="resetKeywords">Clear Keywords</Button>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="variantLibraryKeyword"
                      :id="$scopedId('input-variant-library-keywords')"
                      :options="variantLibraryKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('input-variant-library-keywords')">Variant Library Creation Method</label>
                  &nbsp;<Button :icon="(keywordTextVisible['variantLibrary'] || variantLibraryKeyword === 'Other') ? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('variantLibrary')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['variantLibrary'] || variantLibraryKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="variantLibraryKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Variant Library Creation Method Description {{variantLibraryKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div v-if="variantLibraryKeyword === 'Endogenous locus library method'">
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                        v-model="endogenousSystemKeyword"
                        :id="$scopedId('input-endogenous-system-keywords')"
                        :options="endogenousSystemKeywordOptions"
                        optionLabel="value"
                        optionValue="value"
                        style="width: 450px"
                    />
                    <label :for="$scopedId('input-endogenous-system-keywords')">Endogenous Locus Library Method System</label>
                    &nbsp;<Button :icon="(keywordTextVisible['endogenousSystem']  || endogenousSystemKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('endogenousSystem')" aria-label="Filter" size="large"/>
                  </span>
                  <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
                </div>
                <div class="field" v-if="keywordTextVisible['endogenousSystem'] || endogenousSystemKeyword==='Other'">
                  <span class="p-float-label">
                    <Textarea v-model="endogenousSystemKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                    <label :for="$scopedId('input-title')">Endogenous Locus Library Method System Description {{endogenousSystemKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                  </span>
                  <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                        v-model="endogenousMechanismKeyword"
                        :id="$scopedId('input-endogenous-mechanism-keywords')"
                        :options="endogenousMechanismKeywordOptions"
                        optionLabel="value"
                        optionValue="value"
                        style="width: 450px"
                    />
                    <label :for="$scopedId('input-endogenous-mechanism-keywords')">Endogenous Locus Library Method Mechanism</label>
                    &nbsp;<Button :icon="(keywordTextVisible['endogenousMechanism'] || endogenousMechanismKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('endogenousMechanism')" aria-label="Filter" size="large"/>
                  </span>
                  <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
                </div>
                <div class="field" v-if="keywordTextVisible['endogenousMechanism'] || endogenousMechanismKeyword==='Other'">
                  <span class="p-float-label">
                    <Textarea v-model="endogenousMechanismKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                    <label :for="$scopedId('input-title')">Endogenous Locus Library Method Mechanism Description {{endogenousMechanismKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                  </span>
                  <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
                </div>
              </div>
              <div v-if="variantLibraryKeyword === 'In vitro construct library method'">
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                        v-model="inVitroSystemKeyword"
                        :id="$scopedId('input-in-vitro-system-keywords')"
                        :options="inVitroSystemKeywordOptions"
                        optionLabel="value"
                        optionValue="value"
                        style="width: 450px"
                    />
                    <label :for="$scopedId('input-in-vitro-system-keywords')">In Vitro Construct Library Method System</label>
                    &nbsp;<Button :icon="(keywordTextVisible['inVitroSystem'] || inVitroSystemKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('inVitroSystem')" aria-label="Filter" size="large"/>
                  </span>
                  <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
                </div>
                <div class="field" v-if="keywordTextVisible['inVitroSystem'] || inVitroSystemKeyword==='Other'">
                  <span class="p-float-label">
                    <Textarea v-model="inVitroSystemKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                    <label :for="$scopedId('input-title')">In Vitro Construct Library Method System Description {{inVitroSystemKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                  </span>
                  <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
                </div>
                <div class="field">
                  <span class="p-float-label">
                    <Dropdown
                        v-model="inVitroMechanismKeyword"
                        :id="$scopedId('input-in-vitro-mechanism-keywords')"
                        :options="inVitroMechanismKeywordOptions"
                        optionLabel="value"
                        optionValue="value"
                        style="width: 450px"
                    />
                    <label :for="$scopedId('input-in-vitro-mechanism-keywords')">In Vitro Construct Library Method Mechanism</label>
                    &nbsp;<Button :icon="(keywordTextVisible['inVitroMechanism'] || inVitroMechanismKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('inVitroMechanism')" aria-label="Filter" size="large"/>
                  </span>
                  <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
                </div>  
                <div class="field" v-if="keywordTextVisible['inVitroMechanism'] || inVitroMechanismKeyword==='Other'">
                  <span class="p-float-label">
                    <Textarea v-model="inVitroMechanismKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                    <label :for="$scopedId('input-title')">In Vitro Construct Library Method Mechanism Description {{inVitroMechanismKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                  </span>
                  <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
                </div>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="deliveryMethodKeyword"
                      :id="$scopedId('delivery-method-keywords')"
                      :options="deliveryMethodKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('delivery-method-keywords')">Delivery Method</label>
                  &nbsp;<Button :icon="(keywordTextVisible['deliveryMethod'] || deliveryMethodKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('deliveryMethod')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['deliveryMethod'] || deliveryMethodKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="deliveryMethodKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Delivery Method Description {{deliveryMethodKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="phenotypicDimensionalityKeyword"
                      :id="$scopedId('phenotypic-dimensionality-keywords')"
                      :options="phenotypicDimensionalityKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('phenotypic-dimensionality-keywords')">Phenotypic Assay Dimensionality</label>
                  &nbsp;<Button :icon="(keywordTextVisible['phenotypicDimensionality'] || phenotypicDimensionalityKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('phenotypicDimensionality')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['phenotypicDimensionality'] || phenotypicDimensionalityKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="phenotypicDimensionalityKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Phenotypic Assay Dimensionality Description {{phenotypicDimensionalityKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="phenotypicMethodKeyword"
                      :id="$scopedId('phenotypic-method-keywords')"
                      :options="phenotypicMethodKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('phenotypic-method-keywords')">Phenotypic Assay Method</label>
                  &nbsp;<Button :icon="(keywordTextVisible['phenotypicMethod'] || phenotypicMethodKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('phenotypicMethod')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['phenotypicMethod'] || phenotypicMethodKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="phenotypicMethodKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Phenotypic Assay Method Description {{phenotypicMethodKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="phenotypicModelSystemKeyword"
                      :id="$scopedId('phenotypic-model-system-keywords')"
                      :options="phenotypicModelSystemKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('phenotypic-model-system-keywords')">Phenotypic Assay Model System</label>
                  &nbsp;<Button :icon="(keywordTextVisible['phenotypicModelSystem'] || phenotypicModelSystemKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('phenotypicModelSystem')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['phenotypicModelSystem'] || phenotypicModelSystemKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="phenotypicModelSystemKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Phenotypic Assay Model System Description {{phenotypicModelSystemKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="phenotypicProfilingStrategyKeyword"
                      :id="$scopedId('phenotypic-profiling-strategy-keywords')"
                      :options="phenotypicProfilingStrategyKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('phenotypic-profiling-strategy-keywords')">Phenotypic Assay Profiling Strategy</label>
                  &nbsp;<Button :icon="(keywordTextVisible['phenotypicProfilingStrategy'] || phenotypicProfilingStrategyKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('phenotypicProfilingStrategy')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['phenotypicProfilingStrategy'] || phenotypicProfilingStrategyKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="phenotypicProfilingStrategyKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Phenotypic Assay Profiling Strategy Description {{phenotypicProfilingStrategyKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
              <div class="field">
                <span class="p-float-label">
                  <Dropdown
                      v-model="phenotypicSequencingTypeKeyword"
                      :id="$scopedId('phenotypic-sequencing-type-keywords')"
                      :options="phenotypicSequencingTypeKeywordOptions"
                      optionLabel="value"
                      optionValue="value"
                      style="width: 450px"
                  />
                  <label :for="$scopedId('phenotypic-sequencing-type-keywords')">Phenotypic Assay Sequencing Read Type</label>
                  &nbsp;<Button :icon="(keywordTextVisible['phenotypicSequencingType'] || phenotypicSequencingTypeKeyword==='Other')? 'pi pi-minus' : 'pi pi-plus'" @click="keywordToggleInput('phenotypicSequencingType')" aria-label="Filter" size="large"/>
                </span>
                <span v-if="validationErrors.keywords" class="mave-field-error">{{validationErrors.keywords}}</span>
              </div>
              <div class="field" v-if="keywordTextVisible['phenotypicSequencingType'] || phenotypicSequencingTypeKeyword==='Other'">
                <span class="p-float-label">
                  <Textarea v-model="phenotypicSequencingTypeKeywordDescription" :id="$scopedId('input-title')" rows="4"/>
                  <label :for="$scopedId('input-title')">Phenotypic Assay Sequencing Read Type Description {{phenotypicSequencingTypeKeyword==='Other' ? '(Required)' : '(Optional)'}}</label>
                </span>
                <span v-if="validationErrors.variantLibraryKeywordDescription" class="mave-field-error">{{validationErrors.variantLibraryKeywordDescription}}</span>
              </div>
            </template>
          </Card>
          <Card v-if="item?.scoreSetUrns">
            <template #content>
              <div>{{item.scoreSetUrns?.length}} score sets loaded</div>
            </template>
          </Card>
        </div>
      </div>
    </div>
    <ProgressSpinner v-if="progressVisible" class="mave-progress" />
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import {marked} from 'marked'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Chips from 'primevue/chips'
import Dropdown from 'primevue/dropdown'
import Multiselect from 'primevue/multiselect'
import FileUpload from 'primevue/fileupload'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Textarea from 'primevue/textarea'

import DefaultLayout from '@/components/layout/DefaultLayout'
import EmailPrompt from '@/components/common/EmailPrompt'
import useItem from '@/composition/item'
import useItems from '@/composition/items'
import config from '@/config'
import {normalizeDoi, normalizePubmedId, normalizeRawRead, validateDoi, validatePubmedId, validateRawRead} from '@/lib/identifiers'
import useFormatters from '@/composition/formatters'

const controlledKeywordKeys = ['variantLibrary', 'endogenousSystem', 'endogenousMechanism', 'inVitroSystem', 'inVitroMechanism', 'deliveryMethod',
  'phenotypicDimensionality', 'phenotypicMethod', 'phenotypicModelSystem', 'phenotypicProfilingStrategy', 'phenotypicSequencingType', 'phenotypicSequencingType'
]

export default {
  name: 'ExperimentEditor',
  components: { AutoComplete, Button, Card, Chips, Dropdown, Multiselect, DefaultLayout, EmailPrompt, FileUpload, InputText, ProgressSpinner, TabPanel, TabView, Textarea },

  setup: () => {
    const variantLibraryKeywordOptions = useItems({itemTypeName: `controlled-keywords-variant-search`})
    const endogenousSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-system-search`})
    const endogenousMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-endo-mechanism-search`})
    const inVitroSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-system-search`})
    const inVitroMechanismKeywordOptions = useItems({itemTypeName: `controlled-keywords-in-vitro-mechanism-search`})
    const deliveryMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-delivery-search`})
    const phenotypicDimensionalityKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-dimensionality-search`})
    const phenotypicMethodKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-method-search`})
    const phenotypicModelSystemKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-modle-system-search`})
    const phenotypicProfilingStrategyKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-profiling-strategy-search`})
    const phenotypicSequencingTypeKeywordOptions = useItems({itemTypeName: `controlled-keywords-phenotypic-sequencing-type-search`})
    const publicationIdentifierSuggestions = useItems({itemTypeName: 'publication-identifier-search'})
    const externalPublicationIdentifierSuggestions = useItems({itemTypeName: 'external-publication-identifier-search'})
    return {
      ...useFormatters(),
      ...useItem({itemTypeName: 'experiment'}),
      variantLibraryKeywordOptions: variantLibraryKeywordOptions.items,
      endogenousSystemKeywordOptions: endogenousSystemKeywordOptions.items,
      endogenousMechanismKeywordOptions: endogenousMechanismKeywordOptions.items,
      inVitroSystemKeywordOptions: inVitroSystemKeywordOptions.items,
      inVitroMechanismKeywordOptions: inVitroMechanismKeywordOptions.items,
      deliveryMethodKeywordOptions: deliveryMethodKeywordOptions.items,
      phenotypicDimensionalityKeywordOptions: phenotypicDimensionalityKeywordOptions.items,
      phenotypicMethodKeywordOptions: phenotypicMethodKeywordOptions.items,
      phenotypicModelSystemKeywordOptions: phenotypicModelSystemKeywordOptions.items,
      phenotypicProfilingStrategyKeywordOptions: phenotypicProfilingStrategyKeywordOptions.items,
      phenotypicSequencingTypeKeywordOptions: phenotypicSequencingTypeKeywordOptions.items,
      publicationIdentifierSuggestions: publicationIdentifierSuggestions.items,
      setPublicationIdentifierSearch: (text) => publicationIdentifierSuggestions.setRequestBody({text}),
      externalPublicationIdentifierSuggestions: externalPublicationIdentifierSuggestions.items,
      setExternalPublicationIdentifierSearch: (text) => externalPublicationIdentifierSuggestions.setRequestBody({text}),
    }
  },

  props: {
    experimentSetUrn: {
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
    title: null,
    shortDescription: null,
    abstractText: null,
    methodText: null,
    variantLibraryKeyword: null,
    variantLibraryKeywordDescription: null,
    endogenousSystemKeyword: null,
    endogenousSystemKeywordDescription: null,
    endogenousMechanismKeyword: null,
    endogenousMechanismKeywordDescription: null,
    inVitroSystemKeyword: null,
    inVitroSystemKeywordDescription: null,
    inVitroMechanismKeyword: null,
    inVitroMechanismKeywordDescription: null,
    deliveryMethodKeyword: null,
    deliveryMethodKeywordDescription: null,
    phenotypicDimensionalityKeyword: null,
    phenotypicDimensionalityKeywordDescription: null,
    phenotypicMethodKeyword: null,
    phenotypicMethodKeywordDescription: null,
    phenotypicModelSystemKeyword: null,
    phenotypicModelSystemKeywordDescription: null,
    phenotypicProfilingStrategyKeyword: null,
    phenotypicProfilingStrategyKeywordDescription: null,
    phenotypicSequencingTypeKeyword: null,
    phenotypicSequencingTypeKeywordDescription: null,
    keywords: [],
    keywordTextVisible:{
        variantLibrary: false,
        endogenousSystem: false,
        endogenousMechanism: false,
        inVitroSystem: false,
        inVitroMechanism: false,
        deliveryMethod: false,
        phenotypicDimensionality: false,
        phenotypicMethod: false,
        phenotypicModelSystem: false,
        phenotypicProfilingStrategy: false,
        phenotypicSequencingType: false
      },
    doiIdentifiers: [],
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    publicationIdentifiers: [],
    rawReadIdentifiers: [],
    extraMetadata: {},

    progressVisible: false,
    serverSideValidationErrors: {},
    clientSideValidationErrors: {},
    inputClasses: {
      countsFile: null,
      extraMetadataFile: null,
      scoresFile: null
    },
    validationErrors: {},
  }),

  computed: {
    publicationIdentifierSuggestionsList: function() {
      // The PrimeVue AutoComplete doesn't seem to like it if we set the suggestion list to [].
      // This causes the drop-down to stop appearing when we later populate the list.
      let publicationIdentifierSuggestions = _.unionBy(this.publicationIdentifierSuggestions, this.externalPublicationIdentifierSuggestions, 'identifier')
      if (!Array.isArray(publicationIdentifierSuggestions) || !publicationIdentifierSuggestions.length) {
        // array does not exist, is not an array, or is empty
        return [{}]
      } else {
        return publicationIdentifierSuggestions
      }
    },
  },

  watch: {
    item: {
      handler: function() {
        this.resetForm()
      }
    },
    itemId: {
      handler: function() {
        this.setItemId(this.itemId)
      },
      immediate: true
    },
    variantLibraryKeyword(newValue) {
      if (newValue !== 'Endogenous locus library method') {
        this.endogenousSystemKeyword = null
        this.endogenousMechanismKeyword = null
      }
      if (newValue !== 'In vitro construct library method') {
        this.inVitroSystemKeyword = null
        this.inVitroMechanismKeyword = null
      }
    }
  },

  methods: {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Form fields
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
        this.$toast.add({severity:'warning', summary: `DOI "${newDoi}" is already associated with this experiment`, life: 3000})
      } else if (validateDoi(searchText)) {
        this.doiIdentifiers.splice(idx, 1, { identifier: newDoi })
      } else {
        this.doiIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `"${searchText}" is not a valid DOI`, life: 3000})
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
        this.$toast.add({severity:'warning', summary: `Identifier "${newIdentifier}" is already associated with this experiment`, life: 3000})
      }
    },

    clearPublicationIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.publicationIdentifiersInput
      input.$refs.focusInput.value = ''
    },

    searchPublicationIdentifiers: function(event) {
      const searchText = (event.query || '').trim()
      if (searchText.length > 0) {
        this.setPublicationIdentifierSearch(event.query)
        this.setExternalPublicationIdentifierSearch(event.query)
      }
    },

    acceptNewRawReadIdentifier: function() {
      // Remove new string item from the model and add new structured item in its place if it validates and is not a duplicate.
      const idx = this.rawReadIdentifiers.findIndex((item) => typeof item === 'string' || item instanceof String)
      if (idx == -1) {
        return
      }

      const searchText = this.rawReadIdentifiers[idx]
      const newRawRead = normalizeRawRead(searchText)
      if (this.rawReadIdentifiers.find((item) => item.identifier == newRawRead)) {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `Raw Read identifier "${newRawRead}" is already associated with this experiment`, life: 3000})
      } else if (validateRawRead(searchText)) {
        this.rawReadIdentifiers.splice(idx, 1, { identifier: newRawRead })
      } else {
        this.rawReadIdentifiers.splice(idx, 1)
        this.$toast.add({severity:'warning', summary: `"${searchText}" is not a valid Raw Read identifier`, life: 3000})
      }
    },

    clearRawReadIdentifierSearch: function() {
      // This could change with a new Primevue version.
      const input = this.$refs.rawReadIdentifiersInput
      input.$refs.input.value = ''
    },

    fileCleared: function(inputName) {
      if (inputName == 'extraMetadataFile') {
        this.extraMetadata = null
        delete this.clientSideValidationErrors.extraMetadata
      }
      this.inputClasses[inputName] = 'mave-file-input-empty'
      this.mergeValidationErrors()
    },

    fileSelected: async function(inputName, event) {
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
        }
        this.inputClasses[inputName] = 'mave-file-input-full'
      }
      this.mergeValidationErrors()
    },

    resetKeywords: function() {
      if (this.item && this.item.keywords.length !== 0) {
        // Keywords could be an empty list now. Will modify it back to compulsory when we get final list. 
        const setKeyword = (key, keywordProp, descriptionProp) => {
          const keywordObj = this.item.keywords.find(keyword => keyword.keyword.key === key)
          this[keywordProp] = keywordObj ? keywordObj.keyword.value : null
          this[descriptionProp] = keywordObj ? keywordObj.description : null
        }
        setKeyword("Variant Library Creation Method", "variantLibraryKeyword", "variantLibraryKeywordDescription")
        setKeyword("Endogenous Locus Library Method System", "endogenousSystemKeyword", "endogenousSystemKeywordDescription")
        setKeyword("Endogenous Locus Library Method Mechanism", "endogenousMechanismKeyword", "endogenousMechanismKeywordDescription")
        setKeyword("In Vitro Construct Library Method System", "inVitroSystemKeyword", "inVitroSystemKeywordDescription")
        setKeyword("In Vitro Construct Library Method Mechanism", "inVitroMechanismKeyword", "inVitroMechanismKeywordDescription")
        setKeyword("Delivery method", "deliveryMethodKeyword", "deliveryMethodKeywordDescription")
        setKeyword("Phenotypic Assay Dimensionality", "phenotypicDimensionalityKeyword", "phenotypicDimensionalityKeywordDescription")
        setKeyword("Phenotypic Assay Method", "phenotypicMethodKeyword", "phenotypicMethodKeywordDescription")
        setKeyword("Phenotypic Assay Model System", "phenotypicModelSystemKeyword", "phenotypicModelSystemKeywordDescription")
        setKeyword("Phenotypic Assay Profiling Strategy", "phenotypicProfilingStrategyKeyword", "phenotypicProfilingStrategyKeywordDescription")
        setKeyword("Phenotypic Assay Sequencing Read Type", "phenotypicSequencingTypeKeyword", "phenotypicSequencingTypeKeywordDescription")
      } else {
        this.keywords = []
        this.variantLibraryKeyword = null
        this.variantLibraryKeywordDescription = null
        this.endogenousSystemKeyword = null
        this.endogenousSystemKeywordDescription = null
        this.endogenousMechanismKeyword = null
        this.endogenousMechanismKeywordDescription = null
        this.inVitroSystemKeyword = null
        this.inVitroSystemKeywordDescription = null
        this.inVitroMechanismKeyword = null
        this.inVitroMechanismKeywordDescription = null
        this.deliveryMethodKeyword = null
        this.deliveryMethodKeywordDescription = null
        this.phenotypicDimensionalityKeyword = null
        this.phenotypicDimensionalityKeywordDescription = null
        this.phenotypicMethodKeyword = null
        this.phenotypicMethodKeywordDescription = null
        this.phenotypicModelSystemKeyword = null
        this.phenotypicModelSystemKeywordDescription = null
        this.phenotypicProfilingStrategyKeyword = null
        this.phenotypicProfilingStrategyKeywordDescription = null
        this.phenotypicSequencingTypeKeyword = null
        this.phenotypicSequencingTypeKeywordDescription = null
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Validation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    mergeValidationErrors: function() {
      this.validationErrors = _.merge({}, this.serverSideValidationErrors, this.clientSideValidationErrors)
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Converting between view model and form model
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    resetForm: function() {
      if (this.item) {
        this.title = this.item.title
        this.shortDescription = this.item.shortDescription
        this.abstractText = this.item.abstractText
        this.methodText = this.item.methodText
        this.doiIdentifiers = this.item.doiIdentifiers
        // So that the multiselect can populate correctly, build the primary publication identifiers
        // indirectly by filtering publication identifiers list for those publications we know to be
        // primary.
        this.publicationIdentifiers = _.concat(this.item.primaryPublicationIdentifiers, this.item.secondaryPublicationIdentifiers)
        this.primaryPublicationIdentifiers = this.item.primaryPublicationIdentifiers.filter((publication) => {
          return this.publicationIdentifiers.some((primary) => {
            return primary.identifier === publication.identifier
          })
        })
        this.secondaryPublicationIdentifiers = this.item.secondaryPublicationIdentifiers
        this.rawReadIdentifiers = this.item.rawReadIdentifiers
        this.extraMetadata = this.item.extraMetadata
      } else {
        this.title = null
        this.shortDescription = null
        this.abstractText = null
        this.methodText = null
        this.doiIdentifiers = []
        this.primaryPublicationIdentifiers = []
        this.secondaryPublicationIdentifiers = []
        this.publicationIdentifiers = []
        this.rawReadIdentifiers = []
        this.extraMetadata = {}
      }
      this.resetKeywords()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Saving changes
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO It would be nice to let the items state module handle saving.
    // Currently there is some special handling here, though, so we will leave that for a later refactoring.

    save: async function() {
      // Remove primary identifier from publications to construct secondary identifiers
      const primaryPublicationIdentifiers = this.primaryPublicationIdentifiers.map((identifier) => _.pick(identifier, ['identifier', 'dbName']))
      const secondaryPublicationIdentifiers = this.publicationIdentifiers.map(
        (identifier) => _.pick(identifier, ['identifier', 'dbName'])
      ).filter(
          secondary => !primaryPublicationIdentifiers.some(primary => primary.identifier == secondary.identifier && primary.dbName == secondary.dbName)
      )
      const combinedKeywords = []
      let variantKeywords = []
      if(this.variantLibraryKeyword === "Endogenous locus library method") {
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.variantLibraryKeyword},
            "description": this.variantLibraryKeywordDescription,
          },
          {
            "keyword": {"key": "Endogenous Locus Library Method System", "value": this.endogenousSystemKeyword},
            "description": this.endogenousSystemKeywordDescription,
          },
          {
            "keyword": {"key": "Endogenous Locus Library Method Mechanism", "value": this.endogenousMechanismKeyword},
            "description": this.endogenousMechanismKeywordDescription,
          }
        ]
      }else if(this.variantLibraryKeyword === "In vitro construct library method"){
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.variantLibraryKeyword},
            "description": this.variantLibraryKeywordDescription,
          },
          {
            "keyword": {"key": "In Vitro Construct Library Method System", "value": this.inVitroSystemKeyword},
            "description": this.inVitroSystemKeywordDescription,
          },
          {
            "keyword": {"key": "In Vitro Construct Library Method Mechanism", "value": this.inVitroMechanismKeyword},
            "description": this.inVitroMechanismKeywordDescription,
          }
        ]
      }else if(this.variantLibraryKeyword === "Other"){
        variantKeywords = [{
            "keyword": {"key": "Variant Library Creation Method", "value": this.variantLibraryKeyword},
            "description": this.variantLibraryKeywordDescription,
          }
        ]
      }
      combinedKeywords.push(...variantKeywords)
      const phenotypicKeywords = [
        {
          "keyword": {"key": "Delivery method", "value": this.deliveryMethodKeyword},
          "description": this.deliveryMethodKeywordDescription,
        },
        {
          "keyword": {"key": "Phenotypic Assay Dimensionality", "value": this.phenotypicDimensionalityKeyword},
          "description": this.phenotypicDimensionalityKeywordDescription,
        },
        {
          "keyword": {"key": "Phenotypic Assay Method", "value": this.phenotypicMethodKeyword},
          "description": this.phenotypicMethodKeywordDescription,
        },
        {
          "keyword": {"key": "Phenotypic Assay Model System", "value": this.phenotypicModelSystemKeyword},
          "description": this.phenotypicModelSystemKeywordDescription,
        },
        {
          "keyword": {"key": "Phenotypic Assay Profiling Strategy", "value": this.phenotypicProfilingStrategyKeyword},
          "description": this.phenotypicProfilingStrategyKeywordDescription,
        },
        {
          "keyword": {"key": "Phenotypic Assay Sequencing Read Type", "value": this.phenotypicSequencingTypeKeyword},
          "description": this.phenotypicSequencingTypeKeywordDescription,
        }
      ]
      combinedKeywords.push(...phenotypicKeywords)
      this.keywords = combinedKeywords
      const editedFields = {
        title: this.title,
        shortDescription: this.shortDescription,
        abstractText: this.abstractText,
        methodText: this.methodText,
        keywords: this.keywords,
        doiIdentifiers: this.doiIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        primaryPublicationIdentifiers: primaryPublicationIdentifiers,
        secondaryPublicationIdentifiers: secondaryPublicationIdentifiers,
        rawReadIdentifiers: this.rawReadIdentifiers.map((identifier) => _.pick(identifier, 'identifier')),
        extraMetadata: {}
      }
      // empty item arrays so that deleted items aren't merged back into editedItem object
      if(this.item) {
        this.item.keywords = []
        this.item.doiIdentifiers = []
        this.item.publicationIdentifiers = []
        this.item.primaryPublicationIdentifiers = []
        this.item.rawReadIdentifiers = []
      }

      const editedItem = _.merge({}, this.item || {}, editedFields)
      console.log(editedItem)
      let response
      try {
        if (this.item) {
          response = await axios.put(`${config.apiBaseUrl}/experiments/${this.item.urn}`, editedItem)
        } else {
          if (this.experimentSetUrn) {
            editedItem.experimentSetUrn = this.experimentSetUrn
          }
          response = await axios.post(`${config.apiBaseUrl}/experiments/`, editedItem)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }

      if (response.status == 200) {
        const savedItem = response.data
        this.validationErrors = {}
        if (this.item) {
          console.log('Updated item')
          //this.reloadItem()
          this.$router.replace({path: `/experiments/${savedItem.urn}`})
          this.$toast.add({severity:'success', summary: 'Your changes were saved.', life: 3000})
        } else {
          console.log('Created item')
          this.$router.replace({path: `/experiments/${savedItem.urn}`})
          this.$toast.add({severity:'success', summary: 'The new experiment was saved.', life: 3000})
        }
      } else if (response.data && response.data.detail) {
        if (typeof response.data.detail === 'string' || response.data.detail instanceof String) {
          // Handle generic errors that are not surfaced by the API as objects
          this.$toast.add({ severity: 'error', summary: `Encountered an error saving experiment: ${response.data.detail}` })
        }
        else {
          const formValidationErrors = {}
          for (const error of response.data.detail) {
            let path = error.loc
            if (path[0] == 'body') {
              path = path.slice(1)
            }
            path = path.join('.')
            formValidationErrors[path] = error.msg
          }
          this.serverSideValidationErrors = formValidationErrors
          this.mergeValidationErrors()
        }
      }
    },

    validateAndSave: async function() {
      this.serverSideValidationErrors = {}
      this.mergeValidationErrors()

      if (_.isEmpty(this.validationErrors)) {
        await this.save()
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Navigation
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    viewItem: function() {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}`})
      }
    },

    //Back to Dashboard
    backDashboard: function() {
      this.$router.replace({path: `/dashboard`})
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Rendering utilities
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    markdownToHtml: function(markdown) {
      return marked(markdown || '')
    },

    get(...args) {
      return _.get(...args)
    },

    keywordToggleInput: function(field) {
      this.keywordTextVisible[field] = !this.keywordTextVisible[field]
    }

  }
}

</script>

<style scoped src="../../assets/forms.css"></style>

<style scoped>

/* Keywords */

.custom-keyword-dropdown .p-dropdown-trigger {
  width: 600px; 
}

/* Cards */

.mave-experiment-editor:deep(.p-card) {
  margin: 1em 0;
  background: rgba(0,0,0,0.05);
}

.mave-experiment-editor:deep(.p-card .p-card-title) {
  font-size: 1.2em;
  font-weight: normal;
  color: #3f51B5;
  margin-bottom: 0;
}

/* Progress indicator */

.mave-progress {
  position: absolute;
  bottom: 5px;
  right: 5px;
  z-index: 1001;
}

</style>
