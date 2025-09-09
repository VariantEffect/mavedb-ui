<template>
  <DefaultLayout>
    <div v-if="itemStatus=='Loaded'" class="mave-score-set">
      <div class="mave-1000px-col">
        <div v-if="!item.publishedDate" class="variant-processing-status">
          <div v-if="item.processingState == 'success' && item.mappingState != 'processing' && item.mappingState != 'pending_variant_processing' && item.mappingState != 'queued'">
            <Message severity="success">
              Scores and/or counts have been successfully processed. This score set is ready to be published.
            </Message>
          </div>
          <div v-else-if="item.processingState == 'processing'">
            <Message severity="info">
                Scores and/or counts are being processed. Refresh this page in a few minutes to check on their status.
            </Message>
          </div>
          <div v-else-if="item.processingState == 'success' && (item.mappingState == 'pending_variant_processing' || item.mappingState == 'processing' || item.mappingState == 'queued')">
            <Message severity="info">
              Variants are being mapped to a reference. Refresh this page in a few minutes to check on their status.
            </Message>
          </div>
          <div v-else-if="item.processingState == 'failed'">
            <Message severity="error">
                  Failed to process score and/or count data: {{ item.processingErrors.exception }}. If there were issues with validation of individual variants, they will appear in the `Variants` section of this page.
            </Message>
          </div>
          <div v-else-if="item.processingState == 'incomplete'">
            <Message severity="warn">
              This score set is currently incomplete and may not be published. Please add any required fields and/or data files.
            </Message>
          </div>
        </div>
        <div class="mave-1000px-col">
          <div v-if="!item.publishedDate && item.processingState == 'success' && item.mappingState != 'pending_variant_processing' && item.mappingState != 'processing' && item.mappingState != 'queued'" class="mapping-status">
            <div v-if="item.mappingState == 'complete'">
              <Message severity="info">
                All variants mapped successfully to reference.
              </Message>
            </div>
            <div v-else-if="item.mappingState == 'incomplete'">
              <Message severity="info">
                Variant mapping completed, but some variants did not map successfully. The mapped variants file available on this page includes specific error messages for each failed variant mapping. Score set is still publishable.
              </Message>
            </div>
            <div v-else-if="item.mappingState == 'failed'">
              <Message severity="info">
                Variants could not be mapped to reference: {{  item.mappingErrors.error_message }}. This score set is still publishable.
              </Message>
            </div>
          </div>
        </div>
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">
            <span>{{ item.title || 'Untitled score set' }}</span>
            <span v-if="item.urn" class="mave-score-set-urn">{{ item.urn }}</span>
          </div>
          <div class="mave-collection-badges">
            <CollectionBadge
              v-for="officialCollection in item.officialCollections"
              :collection="officialCollection"
              :key="officialCollection.urn"
            />
          </div>
          <div v-if="userIsAuthenticated">
            <div v-if="!item.publishedDate" class="mave-screen-title-controls">
              <Button v-if="userIsAuthorized.update" class="p-button-sm" @click="editItem">Edit</Button>
              <Button v-if="userIsAuthorized.publish" class="p-button-sm" @click="publishItem">Publish</Button>
              <Button v-if="userIsAuthorized.delete" class="p-button-sm p-button-danger" @click="deleteItem">Delete</Button>
            </div>
            <div v-if="item.publishedDate" class="mave-screen-title-controls">
              <Button v-if="userIsAuthorized.update" class="p-button-sm" @click="editItem">Edit</Button>
            </div>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mave-score-set-description">{{ item.shortDescription }}</div>
      </div>
      <div v-if="scores?.length">
        <div class="mave-score-set-variant-search">
          <span class="p-float-label">
            <AutoComplete
              v-model="selectedVariant"
              :id="$scopedId('variant-search')"
              :suggestions="variantSearchSuggestions"
              optionLabel="mavedb_label"
              dropdown
              @complete="variantSearch"
              selectOnFocus
              scroll-height="175px"
              :virtualScrollerOptions="{ itemSize: 50 }"
              style="flex: 1;"
            />
            <label :for="$scopedId('variant-search')">Search for a variant in this score set</label>
            <Button
              icon="pi pi-times"
              severity="danger"
              aria-label="Clear"
              rounded
              @click="selectedVariant = null"
              :style="{visibility: variantToVisualize ? 'visible' : 'hidden'}"
            />
          </span>
        </div>
        <div class="mave-score-set-histogram-pane">
          <ScoreSetHistogram
            :scoreSet="item"
            :variants="scores"
            :externalSelection="variantToVisualize"
            @export-chart="setHistogramExport"
            ref="histogram"
          />
        </div>
        <div v-if="showHeatmap && !isScoreSetVisualizerVisible" class="mave-score-set-heatmap-pane">
          <ScoreSetHeatmap
            :scoreSet="item"
            :scores="scores"
            :externalSelection="variantToVisualize"
            :showProteinStructureButton="uniprotId!=null && config.CLINICAL_FEATURES_ENABLED"
            @variant-selected="childComponentSelectedVariant"
            @heatmap-visible="heatmapVisibilityUpdated"
            @export-chart="setHeatmapExport" ref="heatmap"
            @on-did-click-show-protein-structure="showProteinStructureModal"
          />
        </div>
      </div>
      <div class="mave-1000px-col">
        <AssayFactSheet
          :scoreSet = "item"
        />
        <div v-if="item.externalLinks?.ucscGenomeBrowser?.url">
            <a :href="item.externalLinks.ucscGenomeBrowser.url" target="blank">
              <img src="@/assets/logo-ucsc-genome-browser.png" alt="UCSC Genome Browser" style="height: 20px;" />
              View this score set on the UCSC Genome Browser
            </a>
        </div>
        <div v-if="item.creationDate">Created {{ formatDate(item.creationDate) }} <span v-if="item.createdBy">
            <a :href="`https://orcid.org/${item.createdBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                alt="ORCIDiD">{{ item.createdBy.firstName }} {{ item.createdBy.lastName }}</a></span>
        </div>
        <div v-if="item.modificationDate">Last updated {{ formatDate(item.modificationDate) }} <span v-if="item.modifiedBy">
            <a :href="`https://orcid.org/${item.modifiedBy.orcidId}`" target="blank"><img src="@/assets/ORCIDiD_icon.png"
                alt="ORCIDiD">{{ item.modifiedBy.firstName }} {{ item.modifiedBy.lastName }}</a></span>
        </div>
        <div v-if="contributors.length > 0">
          Contributors
          <a
            v-for="contributor in contributors"
            class="mave-contributor"
            :href="`https://orcid.org/${contributor.orcidId}`"
            :key="contributor.orcidId"
            target="blank"
          >
            <img src="@/assets/ORCIDiD_icon.png" alt="ORCIDiD">
            {{ contributor.givenName }} {{ contributor.familyName }}
          </a>
        </div>
        <div v-if="item.publishedDate">Published {{ formatDate(item.publishedDate) }}</div>
        <div v-if="item.license">
          License:
          <a v-if="item.license.link" :href="item.license.link">{{ item.license.longName || item.license.shortName }}</a>
          <span v-else>{{ item.license.longName || item.license.shortName }}</span>
        </div>
        <div v-if="item.dataUsagePolicy">Data usage policy: {{ item.dataUsagePolicy }}</div>
        <div v-if="item.experiment">Member of <router-link
            :to="{ name: 'experiment', params: { urn: item.experiment.urn } }">{{ item.experiment.urn }}</router-link></div>
        <div v-if="item.supersedingScoreSet">Current version <router-link
            :to="{ name: 'scoreSet', params: { urn: item.supersedingScoreSet.urn } }">{{ item.supersedingScoreSet.urn }}</router-link>
        </div>
        <div v-else>Current version <router-link
            :to="{ name: 'scoreSet', params: { urn: item.urn } }">{{ item.urn }}</router-link></div>
        <div v-if="sortedMetaAnalyzesScoreSetUrns.length > 0">
          Meta-analyzes
          <template v-for="(urn, index) of sortedMetaAnalyzesScoreSetUrns" :key="urn">
            <template v-if="index > 0"> · </template>
            <EntityLink entityType="scoreSet" :urn="urn" />
          </template>
        </div>
        <div>Download files and/or charts <Button class="p-button-outlined p-button-sm" @click="downloadFile('scores')">Scores</Button>&nbsp;
          <template v-if="countColumns.length != 0">
            <Button class="p-button-outlined p-button-sm" @click="downloadFile('counts')">Counts</Button>&nbsp;
          </template>
          <template v-if="isMetaDataEmpty != true">
            <Button class="p-button-outlined p-button-sm" @click="downloadMetadata">Metadata</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="downloadMappedVariants()">Mapped Variants</Button>&nbsp;
          <SplitButton :buttonProps="{class: 'p-button-outlined p-button-sm'}" :menuButtonProps="{class: 'p-button-sm'}" label="Annotated Variants" @click="annotatedVariantDownloadOptions[0].command" :model="annotatedVariantDownloadOptions"></SplitButton>&nbsp;
          <Button class="p-button-outlined p-button-sm" @click="histogramExport()">Histogram</Button>&nbsp;
          <template v-if="heatmapExists">
            <Button class="p-button-outlined p-button-sm" @click="heatmapExport()">Heatmap</Button>&nbsp;
          </template>
        </div>
        <CollectionAdder class="mave-save-to-collection-button" data-set-type="scoreSet" :data-set-urn="item.urn" />

        <div v-if="requestFromGalaxy == '1'"><br>Send files to <a :href="`${this.galaxyUrl}`">Galaxy</a> <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('scores')">Scores</Button>&nbsp;
          <template v-if="countColumns.length != 0">
            <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('counts')">Counts</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('mappedVariants')">Mapped Variants</Button>&nbsp;
        </div>
        <div v-if="item.abstractText">
          <div class="mave-score-set-section-title">Abstract</div>
          <div v-html="markdownToHtml(item.abstractText)" class="mave-score-set-abstract"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mave-score-set-section-title">Method</div>
          <div v-html="markdownToHtml(item.methodText)" class="mave-score-set-abstract"></div>
        </div>
        <div class="mave-score-set-section-title">Primary References</div>
        <div v-if="item.primaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.primaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type:square;">
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication: <a
                  :href="`${config.appBaseUrl}/publication-identifiers/${publication.dbName}/${encodeURIComponent(publication.identifier)}`">{{
                    publication.identifier }}</a>
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated primary publications.</div>
        <div class="mave-score-set-section-title">Secondary References</div>
        <div v-if="item.secondaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.secondaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type:square;">
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication: <a
                  :href="`${config.appBaseUrl}/publication-identifiers/${publication.dbName}/${encodeURIComponent(publication.identifier)}`">{{
                    publication.identifier }}</a>
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated secondary publications.</div>
        <div class="mave-score-set-section-title">Data Usage Policy</div>
        <div v-if="item.dataUsagePolicy">
          <div v-html="markdownToHtml(item.dataUsagePolicy)" class="mave-score-set-abstract"></div>
        </div>
        <div v-else>Not specified</div>
        <div v-if="item.targetGenes">
          <div class="mave-score-set-section-title">Targets</div>
          <div v-for="targetGene of item.targetGenes" :key="targetGene">
            <div v-if="targetGene.name"><strong>Name:</strong> {{ targetGene.name }}</div>
            <div v-if="targetGene.category"><strong>Type:</strong> {{ textForTargetGeneCategory(targetGene.category) }}</div>

            <div v-if="targetGene.targetAccession?.accession" style="word-break: break-word">
              <div v-if="targetGene.targetAccession?.assembly"><strong>Assembly:</strong>
                {{ targetGene.targetAccession.assembly }}</div>
              <div v-if="targetGene.targetAccession?.gene"><strong>HGNC:</strong> {{ targetGene.targetAccession.gene }}
              </div>
              <strong>Accession Number: </strong>
              {{ targetGene.targetAccession.accession }}
            </div>

            <div v-if="targetGene.targetSequence?.taxonomy?.taxId">
                <div v-if="targetGene.targetSequence.taxonomy?.url"> <strong>Taxonomy ID:</strong>
                  &nbsp;<a :href="`${targetGene.targetSequence.taxonomy.url}`" target="blank">{{targetGene.targetSequence.taxonomy.taxId}}</a>
                </div>
            </div>
            <div v-if="targetGene.targetSequence?.sequence" style="word-break: break-word">
              <div v-if="targetGene.targetSequence.taxonomy?.organismName"><strong>Organism:</strong>
                {{ targetGene.targetSequence.taxonomy.organismName }}</div>
              <div v-if="targetGene.targetSequence.taxonomy?.commonName"><strong>Common Name:</strong>
                {{ targetGene.targetSequence.taxonomy.commonName }}</div>
              <div v-if="targetGene.id"><strong>Target ID:</strong> {{ targetGene.id }}</div>
              <strong>Reference sequence: </strong>
              <template v-if="targetGene.targetSequence.sequence.length >= 500">
                <template v-if="readMore == true">{{ targetGene.targetSequence.sequence.substring(0, 500) + "...." }}
                </template>
                <template v-if="readMore == false">{{ targetGene.targetSequence.sequence }}</template>
                <Button @click="showMore" v-if="readMore == true" class="p-button-text p-button-sm p-button-info">Show
                  more</Button>
                <Button @click="showLess" v-if="readMore == false" class="p-button-text p-button-sm p-button-info">Show
                  less</Button>
              </template><template v-else>{{ targetGene.targetSequence.sequence }}</template>
            </div>
            <!--One for loop can't handle the order so separating them into three parts.-->
            <div v-if="targetGene.externalIdentifiers?.[0]?.identifier">
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'UniProt'"><strong>UniProt:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'RefSeq'"><strong>RefSeq:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
              <div v-for="i in targetGene.externalIdentifiers" :key="i">
                <div v-if="i.identifier.dbName === 'Ensembl'"><strong>Ensembl:</strong> {{ i.identifier.identifier }} <span
                    v-if="i.offset != 0"> with offset {{ i.offset }}</span></div>
              </div>
            </div>
            <br>
          </div>
          <div v-if="item.targetGenes[0].targetAccession">
            <div v-if="item.targetGenes[0].targetAccession.isBaseEditor">
              <strong>*This score set represents base editor data.</strong>
            </div>
          </div>
        </div>

        <div class="mave-score-set-section-title">External identifier</div>
        <strong>DOI: </strong>
        <div v-if="item.doiIdentifiers.length != 0">
          <ul style="list-style-type:square">
            <li v-for="(doi, i) of item.doiIdentifiers" :key="i"><a :href="`${doi.url}`"
                target="blank">{{ doi.identifier }}</a></li>
          </ul>
        </div><template v-else>No associated DOIs<br /></template>

        <div class="mave-score-set-section-title" id="variants">Variants</div>
        <div v-if="item.processingState == 'failed' && item.processingErrors.detail">
          <Accordion :active-index="0">
              <AccordionTab>
                  <template #header>
                      <i class="pi pi-exclamation-triangle" style="font-size: 3em"></i>
                      <div v-if="item.processingErrors.detail" style="margin: 0px 10px; font-weight: bold">Scores and/or counts could not be processed. Please remedy the {{ item.processingErrors.detail.length }} errors below, then try submitting again.</div>
                      <div v-else style="margin: 0px 10px; font-weight: bold">Scores and/or counts could not be processed.</div>
                  </template>
                  <ScrollPanel style="width: 100%; height: 200px">
                    <div v-if="item.processingErrors.detail">
                      <div v-for="err of item.processingErrors.detail">
                        <span>{{ err }}</span>
                      </div>
                    </div>
                  </ScrollPanel>
              </AccordionTab>
            </Accordion>
        </div>
        <div v-else>
          <div v-if="item.numVariants > 10">Below is a sample of the first 10 variants (out of {{ item.numVariants }} total variants).
            Please download the file on the top page if you want to read the whole variants list.</div>
          <br />
          <TabView>
            <TabPanel header="Scores">
              <!--Default table-layout is fixed meaning the cell widths do not depend on their content.
              If you require cells to scale based on their contents set autoLayout property to true.
              Note that Scrollable and/or Resizable tables do not support auto layout due to technical limitations.
              Scrollable, column can be frozen but columns and rows don't match so that add width;
              Autolayout, column can't be frozen but columns and rows can match
              We can keep the frozen codes first. Maybe we can figure the bug in the future-->
              <!---->
              <div style="overflow-y: scroll; overflow-x: scroll;">
                <DataTable :value="scoresTable" :showGridlines="true" :stripedRows="true">
                  <Column v-for="column of scoreColumns.slice(0, sliceNumInDataTable)" :field="column" :header="column" :key="column"
                    style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                    <!--:frozen="columnIsAllNa(scoresTable, column)"-->
                    <template #body="scoresTable">{{ scoresTable.data[column] }}</template>
                  </Column>
                  <Column v-for="column of scoreColumns.slice(sliceNumInDataTable, scoreColumns.length)" :field="column" :header="column"
                    :key="column" style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                    <template #body="scoresTable">{{ convertToThreeDecimal(scoresTable.data[column]) }}</template>
                  </Column>
                </DataTable>
              </div>
            </TabPanel>
            <TabPanel header="Counts">

              <div style="overflow-y: scroll; overflow-x: scroll;">
                <DataTable :value="countsTable" :showGridlines="true" :stripedRows="true">
                  <template v-if="countColumns.length == 0">No count data available.</template>
                  <template v-else>
                    <DataTable :value="countsTable" :showGridlines="true" :stripedRows="true">
                      <Column v-for="column of countColumns.slice(0, sliceNumInDataTable)" :field="column" :header="column" :key="column"
                        style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                        <!--:frozen="columnIsAllNa(countsTable, column)" bodyStyle="text-align:left"-->
                        <template #body="countsTable">{{ countsTable.data[column] }}</template>
                        <!--:style="{overflow: 'hidden'}"-->
                      </Column>
                      <Column v-for="column of countColumns.slice(sliceNumInDataTable, countColumns.length)" :field="column" :header="column"
                        :key="column" style="overflow:hidden" headerStyle="background-color:#A1D8C8; font-weight: bold">
                        <template #body="countsTable">{{ convertToThreeDecimal(countsTable.data[column]) }}</template>
                      </Column>
                    </DataTable>
                  </template>
                </DataTable>
              </div>
              <!--<table>
                <tr>
                  <th v-for="column in countColumns" :key="column">{{column}}</th>
                </tr>
                <tr v-for="row in countsTable" :key="row">
                  <td v-for="column in countColumns" :key="column">{{row[column]}}</td>
                </tr>
              </table>-->
            </TabPanel>
          </TabView>
        </div>
      </div>
    </div>
    <div v-else-if="itemStatus=='Loading' || itemStatus=='NotLoaded'">
      <PageLoading/>
    </div>
    <div v-else>
      <ItemNotFound model="score set" :itemId="itemId"/>
    </div>
  </DefaultLayout>
  <div class="card flex justify-content-center">
      <Sidebar class="scoreset-viz-sidebar" v-model:visible="isScoreSetVisualizerVisible" :header="item.title" position="full">
          <ScoreSetVisualizer
            :scoreSet="item"
            :scores="scores"
            :uniprotId="uniprotId"
            :externalSelection="variantToVisualize"
          />
      </Sidebar>
  </div>
</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import {marked} from 'marked'
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ScrollPanel from 'primevue/scrollpanel';
import SplitButton from 'primevue/splitbutton'
import Dialog from 'primevue/dialog'
import Sidebar from 'primevue/sidebar'

import AssayFactSheet from '@/components/AssayFactSheet.vue'
import CollectionAdder from '@/components/CollectionAdder'
import CollectionBadge from '@/components/CollectionBadge'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'
import ScoreSetHistogram from '@/components/ScoreSetHistogram'
import EntityLink from '@/components/common/EntityLink'
import PageLoading from '@/components/common/PageLoading'
import ItemNotFound from '@/components/common/ItemNotFound'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useAuth from '@/composition/auth'
import useFormatters from '@/composition/formatters'
import useItem from '@/composition/item'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import { textForTargetGeneCategory } from '@/lib/target-genes';
import { parseScoresOrCounts } from '@/lib/scores'
import { preferredVariantLabel, variantNotNullOrNA } from '@/lib/mave-hgvs';
import { mapState } from 'vuex'
import { ref } from 'vue'
import ScoreSetVisualizer from '../ScoreSetVisualizer.vue';

export default {
  name: 'ScoreSetView',
  components: { Accordion, AccordionTab, AssayFactSheet, AutoComplete, Button, Chip, Sidebar, CollectionAdder, CollectionBadge, DefaultLayout, EntityLink, ScoreSetHeatmap, ScoreSetHistogram, ScoreSetVisualizer, TabView, TabPanel, Message, DataTable, Column, ProgressSpinner, ScrollPanel, SplitButton, PageLoading, ItemNotFound, AssayFactSheet },
  computed: {
    annotatedVariantDownloadOptions: function () {
      const annotatatedVariantOptions = []

      if (this.item?.scoreCalibrations) {
        annotatatedVariantOptions.push({
          label: 'Pathogenicity Evidence Line',
          command: () => {
            this.downloadAnnotatedVariants('pathogenicity-evidence-line')
          }
        })
      }

      if (this.item?.scoreRanges) {
        annotatatedVariantOptions.push({
          label: 'Functional Impact Statement',
          command: () => {
            this.downloadAnnotatedVariants('functional-impact-statement')
          }
        })
      }

      annotatatedVariantOptions.push({
        label: 'Functional Impact Study Result',
        command: () => {
          this.downloadAnnotatedVariants('functional-study-result')
        }
      })

      return annotatatedVariantOptions
    },
    uniprotId: function() {
      // If there is only one target gene, return its UniProt ID that has been set from mapped metadata.
      return _.size(this.item.targetGenes) == 1 ? _.get(this.item.targetGenes, [0, 'uniprotIdFromMappedMetadata'], null) : null
    },
    contributors: function() {
      return _.sortBy(
        (this.item?.contributors || []).filter((c) => c.orcidId != this.item?.createdBy?.orcidId),
        ['familyName', 'givenName', 'orcidId']
      )
    },
    isMetaDataEmpty: function() {
      //If extraMetadata is empty, return value will be true.
      return Object.keys(this.item.extraMetadata).length === 0
    },
    sortedMetaAnalyzesScoreSetUrns: function() {
      return _.sortBy(this.item?.metaAnalyzesScoreSetUrns || [])
    },
    variantToVisualize: function() {
      // While a user is autocompleting, `this.selectedVariant` is a string. Once selected, it will become an object and we can pass it as a prop.
      return typeof this.selectedVariant === 'object' ? this.selectedVariant : null
    },
    urlVariant: function() {
      return this.$route.query.variant
    },
    ...mapState({
      galaxyUrl: state => state.routeProps.galaxyUrl,
      toolId: state => state.routeProps.toolId,
      requestFromGalaxy: state => state.routeProps.requestFromGalaxy
    })
  },
  setup: () => {
    const {userIsAuthenticated} = useAuth()
    const scoresRemoteData = useRemoteData()
    const variantSearchSuggestions = ref([])

    return {
      config: config,
      userIsAuthenticated,

      ...useFormatters(),
      ...useItem({ itemTypeName: 'scoreSet' }),
      scoresData: scoresRemoteData.data,
      scoresDataStatus: scoresRemoteData.dataStatus,
      setScoresDataUrl: scoresRemoteData.setDataUrl,
      ensureScoresDataLoaded: scoresRemoteData.ensureDataLoaded,
      variantSearchSuggestions,
      textForTargetGeneCategory: textForTargetGeneCategory
    }
  },
  props: {
    itemId: {
      type: String,
      required: true
    }
  },
  data: () => ({
    scores: null,
    scoreColumns: [],
    scoresTable: [],
    countColumns: [],
    countsTable: [],
    sliceNumInDataTable: 0,
    readMore: true,
    showHeatmap: true,
    isScoreSetVisualizerVisible: false,
    heatmapExists: false,
    selectedVariant: null,
    userIsAuthorized: {
      delete: false,
      publish: false,
      update: false,
    },
  }),
  mounted: async function() {
    await this.checkUserAuthorization()
  },
  watch: {
    itemId: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)

          let scoresUrl = null
          if (this.itemType && this.itemType.restCollectionName && this.itemId) {
            scoresUrl = `${config.apiBaseUrl}/${this.itemType.restCollectionName}/${this.itemId}/scores`
          }
          this.setScoresDataUrl(scoresUrl)
          this.ensureScoresDataLoaded()
        }
      },
      immediate: true
    },
    item: {
      handler: function () {
        this.loadTableScores()
        this.loadTableCounts()
      }
    },
    scoresData: {
      handler: function(newValue) {
        this.scores = newValue ? Object.freeze(parseScoresOrCounts(newValue)) : null
        this.applyUrlState()
      }
    },
    selectedVariant: {
      handler: function(newValue) {
        this.$router.push({query: {
          ...(this.selectedVariant && this.selectedVariant.accession) ? {variant: this.selectedVariant.accession} : {},
        }})
      }
    },
  },
  methods: {
    showProteinStructureModal: function() {
      this.isScoreSetVisualizerVisible = true
    },
    variantNotNullOrNA,
    checkUserAuthorization: async function() {
      await this.checkAuthorization()
    },
    checkAuthorization: async function() {
      // Response should be true to get authorization
      const actions = ['delete', 'publish', 'update']
      try {
        for (const action of actions) {
          let response = await axios.get(`${config.apiBaseUrl}/permissions/user-is-permitted/score-set/${this.itemId}/${action}`)
          this.userIsAuthorized[action] = response.data
        }
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },
    editItem: function() {
      if (this.item) {
        this.$router.replace({ path: `/score-sets/${this.item.urn}/edit` })
      }
    },
    sendToGalaxy: async function(download_type) {
      try {
        const galaxyUrl = this.galaxyUrl;
        let params = {};
        if (this.item) {
          const baseApiUrl = `${config.apiBaseUrl}/score-sets/${this.item.urn}`;

          let endpoint, outputType;
          switch (download_type) {
            case "counts":
              endpoint = "counts";
              outputType = "table";
              break;
            case "scores":
              endpoint = "scores";
              outputType = "table";
              break;
            case "mappedVariants":
              endpoint = "mapped-variants";
              outputType = "json";
              break;
            default:
              break;
          }

          const apiUrl = `${baseApiUrl}/${endpoint}`;

          params = {
            toolId: this.toolId,
            maveData: download_type,
            urn: this.item.urn,
            outputType: outputType,
            URL: apiUrl
          };
          const submitGalaxyUrl = `${galaxyUrl}?tool_id=${params.toolId}&maveData=${params.maveData}&urn=${params
          .urn}&outputType=${params
          .outputType}&URL=${encodeURIComponent(params.URL)}`;
          window.location.href = submitGalaxyUrl;
          localStorage.removeItem('galaxyUrl');
          localStorage.removeItem('toolId');
          localStorage.removeItem('requestFromGalaxy');
        }
      } catch (error) {
        console.error('Error sending data:', error);
      }
    },
    deleteItem: async function() {
      let response = null
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (this.item) {
            try {
              response = await axios.delete(`${config.apiBaseUrl}/score-sets/${this.item.urn}`, this.item)
            } catch (e) {
              response = e.response || { status: 500 }
            }

            if (response.status == 200) {
              // display toast message here
              //const deletedItem = response.data
              console.log('Deleted item')
              this.$router.replace({ path: `/dashboard` })
              this.$toast.add({ severity: 'success', summary: 'Your score set was successfully deleted.', life: 3000 })
            } else if (response.data && response.data.detail) {
              const formValidationErrors = {}
              for (const error of response.data.detail) {
                let path = error.loc
                if (path[0] == 'body') {
                  path = path.slice(1)
                }
                path = path.join('.')
                formValidationErrors[path] = error.msg
              }
            }
          }
        },
        reject: () => {
          //callback to execute when user rejects the action
          //do nothing
        }
      });
    },
    markdownToHtml: function(markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    publishItem: async function() {
      let response = null
      this.$confirm.require({
        message: 'Are you sure you want to publish this score set? Once published, you will be unable to edit scores, counts, or targets. You will also be unable to delete this score set.',
        header: 'Confirm Score Set Publication',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Publish',
        rejectLabel: 'Cancel',
        rejectClass: 'p-button-danger',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        accept: async () => {
          try {
            if (this.item) {
              response = await axios.post(`${config.apiBaseUrl}/score-sets/${this.item.urn}/publish`, this.item)
              // make sure scroesets cannot be published twice API, but also remove the button on UI side
            }
          } catch (e) {
            response = e.response || { status: 500 }
          }

          if (response.status == 200) {
            // display toast message here
            const publishedItem = response.data
            if (this.item) {
              console.log('Published item')
              this.$router.replace({ path: `/score-sets/${publishedItem.urn}` })
              this.$toast.add({ severity: 'success', summary: 'Your score set was successfully published.', life: 3000 })
            }
          } else if (response.data && response.data.detail) {
            const formValidationErrors = {}
            for (const error of response.data.detail) {
              let path = error.loc
              if (path[0] == 'body') {
                path = path.slice(1)
              }
              path = path.join('.')
              formValidationErrors[path] = error.msg
            }
          }
        },
        reject: () => {
          //callback to execute when user rejects the action
          //do nothing
        }
      })
    },
    //Download scores or counts
    downloadFile: async function(download_type) {
      let response = null
      try {
        if (this.item && download_type == "counts") {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/counts?drop_na_columns=true`)
        } else if (this.item && download_type == "scores") {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/scores?drop_na_columns=true`)
        }
      } catch (e) {
        response = e.response || { status: 500 }
      }
      if (response.status == 200) {
        const file = response.data
        const anchor = document.createElement('a');
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        if (download_type == "counts") {
          anchor.download = this.item.urn + '_counts.csv';
        } else if (download_type == "scores") {
          anchor.download = this.item.urn + '_scores.csv';
        }
        anchor.click();
      } else if (response.data && response.data.detail) {
        const formValidationErrors = {}
        for (const error of response.data.detail) {
          let path = error.loc
          if (path[0] == 'body') {
            path = path.slice(1)
          }
          path = path.join('.')
          formValidationErrors[path] = error.msg
        }
      }
    },
    downloadMappedVariants: async function() {
      let response = null
      try {
        if (this.item) {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/mapped-variants`)
        }
      }
      catch (e) {
        response = e.response || { status: 500 }
      }
      if (response.status == 200) {
        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        //file default name
        anchor.download = this.item.urn + '_mapped_variants.json';
        anchor.click();
      } else {
        this.$toast.add({ severity: 'error', summary: 'No downloadable mapped variants text file', life: 3000 })
      }
    },
    downloadAnnotatedVariants: async function(mappedVariantType) {
      let response = null
      try {
        if (this.item) {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/annotated-variants/${mappedVariantType}`)
        }
      }
      catch (e) {
        response = e.response || { status: 500 }
      }
      if (response.status == 200) {
        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file);
        anchor.target = '_blank';
        //file default name
        anchor.download = this.item.urn + '_annotated_variants.json';
        anchor.click();
      } else {
        this.$toast.add({ severity: 'error', summary: 'No downloadable annotated variants text file', life: 3000 })
      }
    },
    downloadMetadata: async function() {
      //convert object to Json. extraMetadata is an object.
      var metadata = JSON.stringify(this.item.extraMetadata)
      const anchor = document.createElement('a');
      anchor.href = 'data:text/txt;charset=utf-8,' + encodeURIComponent(metadata);
      anchor.target = '_blank';
      //file default name
      anchor.download = this.item.urn + '_metadata.txt';
      anchor.click();
    },
    setHistogramExport: function(fn) {
      this.histogramExport = fn
    },
    setHeatmapExport: function(fn) {
      this.heatmapExport = fn
    },
    loadTableScores: async function() {
      if (this.item) {
        const response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/scores?drop_na_columns=true`)
        if (response.data) {
          const fixedColumns = ['hgvs_nt', 'hgvs_splice', 'hgvs_pro']

          this.scoresTable = parseScoresOrCounts(response.data)
          this.scoreColumns = Object.keys(this.scoresTable[0]).filter(col => col !== 'accession')  // drop 'accession'
          this.sliceNumInDataTable = fixedColumns.filter(col => this.scoreColumns.includes(col)).length

          this.scoresTable = this.item.numVariants <= 10 ? this.scoresTable : this.scoresTable.slice(0, 10)
        }
      }
    },
    loadTableCounts: async function() {
      if (this.item) {
        const response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/counts?drop_na_columns=true`)
        if (response.data) {
          this.countsTable = parseScoresOrCounts(response.data)
          const columns = Object.keys(this.countsTable[0]).filter(col => col !== 'accession')  // drop 'accession'
          // the response data have at lease one of the below column even though it doesn't have any other column.
          const hasOtherColumns = columns.some(col => !['hgvs_nt', 'hgvs_splice', 'hgvs_pro'].includes(col))
          if (hasOtherColumns) {
            this.countColumns = columns
            this.countsTable = this.item.numVariants <= 10 ? parsed : parsed.slice(0, 10)
          }
        }
      }
    },
    variantSearch: function(event) {
      const matches = []
      for (const variant of this.scores) {
        if (variantNotNullOrNA(variant.hgvs_nt) && variant.hgvs_nt.toLowerCase().includes(event.query.toLowerCase())) {
            matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_nt}))
        } else if (variantNotNullOrNA(variant.hgvs_splice) && variant.hgvs_splice.toLowerCase().includes(event.query.toLowerCase())) {
            matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_splice}))
        } else if (variantNotNullOrNA(variant.hgvs_pro) && variant.hgvs_pro.toLowerCase().includes(event.query.toLowerCase())) {
            matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_pro}))
        } else if (variantNotNullOrNA(variant.accession) && variant.accession.toLowerCase().includes(event.query.toLowerCase())) {
            matches.push(Object.assign(variant, {mavedb_label: variant.accession}))
        }
      }

      this.variantSearchSuggestions = matches
    },
    childComponentSelectedVariant: function(variant) {
      if (variant == null) {
        this.selectedVariant = null
      }

      if (!variant?.accession) {
        return
      }

      const selectedVariant = this.scores.find((v) => v.accession == variant.accession)
      this.selectedVariant = Object.assign(selectedVariant, preferredVariantLabel(selectedVariant))
    },
    applyUrlState: function() {
      if (this.$route.query.variant) {
        const selectedVariant = this.scores.find((v) => v.accession == this.$route.query.variant)
        this.selectedVariant = Object.assign(selectedVariant, preferredVariantLabel(selectedVariant))
      }
    },
    heatmapVisibilityUpdated: function(visible) {
      this.heatmapExists = visible
    },
    convertToThreeDecimal: function(value) {
      let numStr = String(value)
      let decimalNumber = 0
      if (numStr.includes('.')) {
        decimalNumber = numStr.split('.')[1].length;
      }
      if (decimalNumber < 4) {
        return value
      } else {
        return parseFloat(value).toFixed(3)
      }
    },
    // Check whether all columns values are NA.
    columnIsAllNa: function(tableData, column) {
      let sliceData = tableData.slice(0, 10)
      let frozen = true
      let count = 0
      for (let i = 0; i < sliceData.length; i++) {
        //NA is a string
        if (sliceData[i][column] == "NA") {
          count += 1
        }
      }
      if (count == 10) {
        frozen = false
      }
      return frozen
    },
    showMore: function() {
      this.readMore = false
      return this.readMore
    },
    showLess: function() {
      this.readMore = true
      return this.readMore
    },
  },
}

</script>

<style scoped>
/* General layout */

.mave-full-height {
  height: 100%;
}

.mave-scroll-vertical {
  overflow-y: auto;
}

.mave-1000px-col {
  position: relative;
  width: 1000px;
  margin: 0 auto;
  text-align: left;
  overflow-x: hide;
}

/* Score set */

.mave-score-set {
  padding: 20px;
}

.mave-score-set-heatmap-pane {
  margin: 10px 0;
}

.mave-score-set-variant-search {
  margin-top: 40px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}

.mave-score-set-variant-search > span {
  width: 50%;
  display: flex;
  align-items: center;
  column-gap: .5em;
}

.p-float-label {
  display: flex;
  width: 100%;
}

/* Score set details */

.mave-score-set-section-title {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
}

.mave-score-set-description {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 0 10px 0;
}

.mave-score-set-urn {
  font-size: 20px;
  color: gray;
  margin-left: 12px;
}

.mave-contributor {
  margin: 0 0.5em;
}

/* Formatting in Markdown blocks */

.mave-score-set-abstract {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 20px;
}

.mave-score-set-abstract::v-deep code {
  color: #987cb8;
  font-size: 87.5%;
  word-wrap: break-word;
}

.samplify-data-table .samplify-data-table-spinner-container {
  align-items: center;
  display: flex;
  justify-content: center;
  padding-top: 18px;
  width: 100%;
}

.samplify-data-table .samplify-data-table-progress {
  height: 50px;
  width: 50px;
}

.mave-save-to-collection-button {
  margin: 1em 0;
}

</style>

<style>
.scoreset-viz-sidebar .p-sidebar-header {
  padding: 0 5px 0;
  height: 2em;
}
</style>
