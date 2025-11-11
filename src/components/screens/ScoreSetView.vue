<template>
  <DefaultLayout>
    <div v-if="itemStatus == 'Loaded' && item" class="mavedb-score-set">
      <div class="mavedb-1000px-col">
        <ScoreSetProcessingStatus :score-set="item" />
        <div class="mave-screen-title-bar">
          <div class="mave-screen-title">
            <span>{{ item.title || 'Untitled score set' }}</span>
            <span v-if="item.urn" class="mavedb-score-set-urn">{{ item.urn }}</span>
          </div>
          <div class="mave-collection-badges">
            <CollectionBadge
              v-for="officialCollection in item.officialCollections"
              :key="officialCollection.urn"
              :collection="officialCollection"
            />
          </div>
          <div v-if="userIsAuthenticated" class="mavedb-screen-title-controls">
            <Button
              class="p-butto p-button-sm"
              icon="pi pi-external-link"
              label="Score set calibrations"
              @click="$router.push({path: `/score-sets/${item.urn}/calibrations`})"
            />
            <Button
              v-if="userIsAuthorized.addCalibration"
              class="p-button p-button-sm"
              @click="calibrationEditorVisible = true"
              >Add calibration</Button
            >
            <template v-if="!item.publishedDate">
              <Button v-if="userIsAuthorized.update" class="p-button p-button-sm" @click="editItem">Edit</Button>
              <Button v-if="userIsAuthorized.publish" class="p-button p-button-sm" @click="publishItem">Publish</Button>
              <Button v-if="userIsAuthorized.delete" class="p-button p-button-sm p-button-danger" @click="deleteItem"
                >Delete</Button
              >
            </template>
            <template v-if="item.publishedDate">
              <Button v-if="userIsAuthorized.update" class="p-button p-button-sm" @click="editItem">Edit</Button>
            </template>
          </div>
        </div>
        <div v-if="item.shortDescription" class="mavedb-score-set-description">{{ item.shortDescription }}</div>
      </div>
      <div v-if="variants?.length">
        <div class="mavedb-score-set-variant-search">
          <span class="p-float-label">
            <AutoComplete
              :id="scopedId('variant-search')"
              v-model="selectedVariant"
              dropdown
              option-label="mavedb_label"
              scroll-height="175px"
              select-on-focus
              style="flex: 1"
              :suggestions="variantSearchSuggestions"
              :virtual-scroller-options="{itemSize: 50}"
              @complete="variantSearch"
            />
            <label :for="scopedId('variant-search')">Search for a variant in this score set</label>
            <Button
              aria-label="Clear"
              icon="pi pi-times"
              rounded
              severity="danger"
              :style="{visibility: variantToVisualize ? 'visible' : 'hidden'}"
              @click="selectedVariant = null"
            />
          </span>
          <span v-if="config.CLINICAL_FEATURES_ENABLED" class="mavedb-clinical-mode-control-container">
            <span :class="clinicalMode ? 'mavedb-clinical-mode-option-off' : 'mavedb-clinical-mode-option-on'"
              >Raw data</span
            >
            <InputSwitch
              v-model="clinicalMode"
              :aria-label="`Click to change to ${clinicalMode ? 'raw data' : 'clinical view'}.`"
            />
            <span :class="clinicalMode ? 'mavedb-clinical-mode-option-on' : 'mavedb-clinical-mode-option-off'"
              >Mapped variant coordinates for clinical use</span
            >
            <Button
              v-tooltip="clinicalModeHelpText"
              aria-label="About raw vs. clinical mode"
              class="p-button-help mavedb-help-tooltip-button"
              icon="pi pi-info"
              outlined
              rounded
            />
          </span>
        </div>
        <div class="mavedb-score-set-histogram-pane">
          <ScoreSetHistogram
            ref="histogram"
            :coordinates="clinicalMode ? 'mapped' : 'raw'"
            :default-histogram="'distribution'"
            :external-selection="variantToVisualize"
            :hide-start-and-stop-loss-by-default="hideStartAndStopLoss"
            :score-set="item"
            :selected-calibration="selectedCalibration"
            :variants="variants"
            @calibration-changed="childComponentSelectedCalibration"
            @export-chart="setHistogramExport"
          />
          <template v-if="hasClinicalVariants">
            <ScoreSetHistogram
              ref="histogram"
              :coordinates="clinicalMode ? 'mapped' : 'raw'"
              :default-histogram="'clinical'"
              :external-selection="variantToVisualize"
              :hide-start-and-stop-loss-by-default="hideStartAndStopLoss"
              :score-set="item"
              :variants="variants"
              @export-chart="setHistogramExport"
            />
          </template>
        </div>
        <div v-if="showHeatmap && !isScoreSetVisualizerVisible" class="mavedb-score-set-heatmap-pane">
          <ScoreSetHeatmap
            ref="heatmap"
            :coordinates="clinicalMode ? 'mapped' : 'raw'"
            :external-selection="variantToVisualize"
            :hide-start-and-stop-loss="hideStartAndStopLoss"
            :score-set="item"
            :show-protein-structure-button="uniprotId != null && config.CLINICAL_FEATURES_ENABLED"
            :variants="variants"
            @export-chart="setHeatmapExport"
            @heatmap-visible="heatmapVisibilityUpdated"
            @on-did-click-show-protein-structure="showProteinStructureModal"
            @variant-selected="childComponentSelectedVariant"
          />
        </div>
      </div>
      <div v-else-if="scoresDataStatus == 'Loading' || scoresDataStatus == 'NotLoaded'">
        <ProgressSpinner style="width: 36px; height: 36px; margin: 12px auto; display: block" />
      </div>
      <div class="mave-1000px-col">
        <div class="clearfix">
          <div v-if="config.CLINICAL_FEATURES_ENABLED" class="mavedb-assay-facts-container">
            <AssayFactSheet :score-set="item" />
          </div>
          <div>
            <ScoreSetSecondaryMetadata :score-set="item" />
          </div>
        </div>
        <div>
          Download files and/or charts
          <Button class="p-button-outlined p-button-sm" @click="downloadFile('scores')">Scores</Button>&nbsp;
          <template v-if="hasCounts">
            <Button class="p-button-outlined p-button-sm" @click="downloadFile('counts')">Counts</Button>&nbsp;
          </template>
          <template v-if="isMetaDataEmpty != true">
            <Button class="p-button-outlined p-button-sm" @click="downloadMetadata">Metadata</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="downloadMappedVariants()">Mapped Variants</Button>&nbsp;
          <SplitButton
            :button-props="{class: 'p-button-outlined p-button-sm'}"
            label="Annotated Variants"
            :menu-button-props="{class: 'p-button-sm'}"
            :model="annotatedVariantDownloadOptions"
            @click="annotatedVariantDownloadOptions[0].command"
          ></SplitButton
          >&nbsp; <Button class="p-button-outlined p-button-sm" @click="histogramExport()">Histogram</Button>&nbsp;
          <template v-if="heatmapExists">
            <Button class="p-button-outlined p-button-sm" @click="heatmapExport()">Heatmap</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="showOptions()"> Custom Data </Button>
          <Dialog
            v-model:visible="optionsVisible"
            :base-z-index="901"
            :breakpoints="{'1199px': '75vw', '575px': '90vw'}"
            header="Data Options"
            modal
            :style="{width: '50vw'}"
          >
            <div v-for="dataOption of dataTypeOptions" :key="dataOption.value" class="flex gap-1 align-items-center">
              <Checkbox
                :id="scopedId('input-' + dataOption.value)"
                v-model="selectedDataOptions"
                :value="dataOption.value"
              />
              <label :for="scopedId('input-' + dataOption.value)">{{ dataOption.label }}</label>
            </div>
            <p />
            <Button class="p-button-outlined p-button-sm" label="Download" @click="downloadMultipleData"
              >Download</Button
            >
            &nbsp;
            <Button class="p-button-warning p-button-sm" label="Cancel" @click="optionsVisible = false">Cancel</Button>
          </Dialog>
          <br />
        </div>
        <CollectionAdder class="mave-save-to-collection-button" data-set-type="scoreSet" :data-set-urn="item.urn" />

        <div v-if="requestFromGalaxy == '1'">
          <br />Send files to <a :href="galaxyUrl">Galaxy</a>
          <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('scores')">Scores</Button>&nbsp;
          <template v-if="hasCounts">
            <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('counts')">Counts</Button>&nbsp;
          </template>
          <Button class="p-button-outlined p-button-sm" @click="sendToGalaxy('mappedVariants')">Mapped Variants</Button
          >&nbsp;
        </div>
        <div v-if="item.abstractText">
          <div class="mavedb-score-set-section-title">Abstract</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mavedb-score-set-abstract" v-html="markdownToHtml(item.abstractText)"></div>
        </div>
        <div v-if="item.methodText">
          <div class="mavedb-score-set-section-title">Method</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mavedb-score-set-abstract" v-html="markdownToHtml(item.methodText)"></div>
        </div>
        <div class="mavedb-score-set-section-title">Primary References</div>
        <div v-if="item.primaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.primaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type: square">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication:
                <a
                  :href="`${config.appBaseUrl}/publication-identifiers/${publication.dbName}/${encodeURIComponent(publication.identifier)}`"
                  >{{ publication.identifier }}</a
                >
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated primary publications.</div>
        <div class="mavedb-score-set-section-title">Secondary References</div>
        <div v-if="item.secondaryPublicationIdentifiers.length > 0">
          <div v-for="publication in item.secondaryPublicationIdentifiers" :key="publication">
            <ul style="list-style-type: square">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <li v-html="markdownToHtml(publication.referenceHtml)"></li>
              <div>
                Publication:
                <a
                  :href="`${config.appBaseUrl}/publication-identifiers/${publication.dbName}/${encodeURIComponent(publication.identifier)}`"
                  >{{ publication.identifier }}</a
                >
              </div>
              <div>
                <a :href="`${publication.url}`" target="_blank">View article on the web</a>
              </div>
            </ul>
          </div>
        </div>
        <div v-else>No associated secondary publications.</div>
        <div class="mavedb-score-set-section-title">Data Usage Policy</div>
        <div v-if="item.dataUsagePolicy">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mavedb-score-set-abstract" v-html="markdownToHtml(item.dataUsagePolicy)"></div>
        </div>
        <div v-else>Not specified</div>
        <div v-if="item.targetGenes">
          <div class="mavedb-score-set-section-title">Targets</div>
          <div v-for="targetGene of item.targetGenes" :key="targetGene">
            <TargetGene :target-gene="targetGene" />
            <br />
          </div>
          <div v-if="item.targetGenes[0].targetAccession">
            <div v-if="item.targetGenes[0].targetAccession.isBaseEditor">
              <strong>*This score set represents base editor data.</strong>
            </div>
          </div>
        </div>

        <div class="mavedb-score-set-section-title">External identifier</div>
        <strong>DOI: </strong>
        <div v-if="item.doiIdentifiers.length != 0">
          <ul style="list-style-type: square">
            <li v-for="(doi, i) of item.doiIdentifiers" :key="i">
              <a :href="`${doi.url}`" target="blank">{{ doi.identifier }}</a>
            </li>
          </ul>
        </div>
        <template v-else>No associated DOIs<br /></template>

        <div id="variants" class="mavedb-score-set-section-title">Variants</div>
        <div v-if="item.processingState == 'failed' && item.processingErrors.detail">
          <Accordion :active-index="0">
            <AccordionTab>
              <template #header>
                <i class="pi pi-exclamation-triangle" style="font-size: 3em"></i>
                <div v-if="item.processingErrors.detail" style="margin: 0px 10px; font-weight: bold">
                  Scores and/or counts could not be processed. Please remedy the
                  {{ item.processingErrors.detail.length }} errors below, then try submitting again.
                </div>
                <div v-else style="margin: 0px 10px; font-weight: bold">
                  Scores and/or counts could not be processed.
                </div>
              </template>
              <ScrollPanel style="width: 100%; height: 200px">
                <div v-if="item.processingErrors.detail">
                  <div v-for="err of item.processingErrors.detail" :key="err">
                    <span>{{ err }}</span>
                  </div>
                </div>
              </ScrollPanel>
            </AccordionTab>
          </Accordion>
        </div>
        <div v-else>
          <ScoreSetPreviewTable :score-set="item" />
        </div>
      </div>
    </div>
    <div v-else-if="itemStatus == 'Loading' || itemStatus == 'NotLoaded'">
      <PageLoading />
    </div>
    <div v-else>
      <ItemNotFound :item-id="itemId" model="score set" />
    </div>
  </DefaultLayout>
  <div v-if="itemStatus == 'Loaded'" class="card flex justify-content-center">
    <Sidebar
      v-model:visible="isScoreSetVisualizerVisible"
      class="scoreset-viz-sidebar"
      :header="item.title"
      position="full"
    >
      <ScoreSetVisualizer
        :external-selection="variantToVisualize"
        :heatmap-variants="variants"
        :score-set="item"
        :scores="variants"
        :uniprot-id="uniprotId"
      />
    </Sidebar>
  </div>
  <!-- Set z-index to ensure dialog appears above heatmap color legend -->
  <PrimeDialog
    v-model:visible="calibrationEditorVisible"
    :base-z-index="2003"
    :close-on-escape="true"
    header="Create New Calibration"
    modal
    :style="{maxWidth: '90%', width: '75rem'}"
  >
    <CalibrationEditor
      :calibration-draft-ref="calibrationDraftRef"
      :score-set-urn="item.urn"
      :validation-errors="editorValidationErrors"
      @canceled="calibrationEditorVisible = false"
    />
    <template #footer>
      <Button
        class="p-button p-component p-button-secondary"
        icon="pi pi-times"
        label="Close"
        @click="calibrationEditorVisible = false"
      />
      <Button
        class="p-button p-component p-button-success"
        icon="pi pi-save"
        label="Save Changes"
        @click="saveCreatedCalibration"
      />
    </template>
  </PrimeDialog>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import {marked} from 'marked'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputSwitch from 'primevue/inputswitch'
import PrimeDialog from 'primevue/dialog'
import ScrollPanel from 'primevue/scrollpanel'
import Sidebar from 'primevue/sidebar'
import SplitButton from 'primevue/splitbutton'
import {ref} from 'vue'
import {mapState} from 'vuex'
import {useHead} from '@unhead/vue'

import AssayFactSheet from '@/components/AssayFactSheet'
import CalibrationEditor from '../CalibrationEditor.vue'
import CollectionAdder from '@/components/CollectionAdder'
import CollectionBadge from '@/components/CollectionBadge'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'
import ScoreSetHistogram from '@/components/ScoreSetHistogram'
import ScoreSetPreviewTable from '@/components/ScoreSetPreviewTable'
import ScoreSetProcessingStatus from '@/components/ScoreSetProcessingStatus'
import ScoreSetSecondaryMetadata from '@/components/ScoreSetSecondaryMetadata'
import ScoreSetVisualizer from '@/components/ScoreSetVisualizer'
import TargetGene from '@/components/TargetGene'
import ItemNotFound from '@/components/common/ItemNotFound'
import PageLoading from '@/components/common/PageLoading'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item'
import useRemoteData from '@/composition/remote-data'
import config from '@/config'
import {preferredVariantLabel, variantNotNullOrNA} from '@/lib/mave-hgvs'
import {getScoreSetShortName} from '@/lib/score-sets'
import {parseScoresOrCounts} from '@/lib/scores'
import {parseSimpleCodingVariants, translateSimpleCodingVariants} from '@/lib/variants'

export default {
  name: 'ScoreSetView',

  components: {
    Accordion,
    AccordionTab,
    AssayFactSheet,
    AutoComplete,
    Button,
    CalibrationEditor,
    Checkbox,
    CollectionAdder,
    CollectionBadge,
    DefaultLayout,
    Dialog,
    InputSwitch,
    ItemNotFound,
    PageLoading,
    PrimeDialog,
    ScoreSetHeatmap,
    ScoreSetHistogram,
    ScoreSetVisualizer,
    ScoreSetPreviewTable,
    ScoreSetProcessingStatus,
    ScoreSetSecondaryMetadata,
    ScrollPanel,
    Sidebar,
    SplitButton,
    TargetGene
  },

  props: {
    itemId: {
      type: String,
      required: true
    }
  },

  setup: () => {
    const head = useHead()

    const {userIsAuthenticated} = useAuth()
    const scoresRemoteData = useRemoteData()
    const variantSearchSuggestions = ref([])
    const calibrationDraftRef = ref({value: null})
    const editorValidationErrors = ref({})
    const selectedCalibration = ref(null)

    return {
      head,
      config: config,
      userIsAuthenticated,
      calibrationDraftRef,
      editorValidationErrors,
      selectedCalibration,

      ...useItem({itemTypeName: 'scoreSet'}),
      ...useScopedId(),
      scoresData: scoresRemoteData.data,
      scoresDataStatus: scoresRemoteData.dataStatus,
      setScoresDataUrl: scoresRemoteData.setDataUrl,
      ensureScoresDataLoaded: scoresRemoteData.ensureDataLoaded,
      variantSearchSuggestions
    }
  },

  data: () => ({
    clinicalMode: config.CLINICAL_FEATURES_ENABLED,
    variants: null,
    selectedDataOptions: [],
    showHeatmap: true,
    optionsVisible: false,
    isScoreSetVisualizerVisible: false,
    hasClinicalVariants: false,
    heatmapExists: false,
    selectedVariant: null,
    calibrationEditorVisible: false,
    userIsAuthorized: {
      delete: false,
      publish: false,
      update: false,
      addCalibration: false
    }
  }),

  computed: {
    clinicalModeHelpText: function () {
      if (this.item.targetGenes[0]?.targetSequence) {
        // Message for score sets from experiments with synthetic target sequences
        return 'In clinical mode, mapped variant coordinates are used when available, and start- and stop-loss codons are omitted because this score set was produced using a synthetic target sequence.'
      } else {
        return 'In clinical mode, mapped variant coordinates are used when available. For experiments with endogenously-edited targets, raw and mapped data are usually identical.'
      }
    },
    hasCounts: function () {
      const allCountColumns = this.item?.datasetColumns?.countColumns ?? []
      const countColumns = allCountColumns.filter((col) => col !== 'accession')
      return countColumns.length > 0
    },
    dataTypeOptions: function () {
      const options = [
        {label: 'Scores', value: 'scores'},
        {label: 'Mapped HGVS', value: 'mappedHgvs'},
        {label: 'Custom columns', value: 'includeCustomColumns'},
        {label: 'Without NA columns', value: 'dropNaColumns'}
      ]
      if (this.hasCounts) {
        options.splice(1, 0, {label: 'Counts', value: 'counts'})
      }
      return options
    },
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

      if (this.item?.scoreCalibrations) {
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
    hideStartAndStopLoss: function () {
      // In clinical mode, when the target is not endogenously edited (so it has a target sequence), omit start- and
      // stop-loss variants.
      return this.clinicalMode && this.item.targetGenes[0]?.targetSequence
    },
    uniprotId: function () {
      // If there is only one target gene, return its UniProt ID that has been set from mapped metadata.
      return _.size(this.item.targetGenes) == 1
        ? _.get(this.item.targetGenes, [0, 'uniprotIdFromMappedMetadata'], null)
        : null
    },
    isMetaDataEmpty: function () {
      //If extraMetadata is empty, return value will be true.
      return Object.keys(this.item.extraMetadata).length === 0
    },
    variantToVisualize: function () {
      // While a user is autocompleting, `this.selectedVariant` is a string. Once selected, it will become an object and we can pass it as a prop.
      return typeof this.selectedVariant === 'object' ? this.selectedVariant : null
    },
    urlVariant: function () {
      return this.$route.query.variant
    },
    urlCalibration: function () {
      return this.$route.query.calibration
    },
    ...mapState({
      galaxyUrl: (state) => state.routeProps.galaxyUrl,
      toolId: (state) => state.routeProps.toolId,
      requestFromGalaxy: (state) => state.routeProps.requestFromGalaxy
    })
  },

  watch: {
    item: {
      handler: function (newValue) {
        this.head.patch({
          title: newValue ? getScoreSetShortName(newValue) : undefined
        })
      }
    },
    itemId: {
      handler: function (newValue, oldValue) {
        if (newValue != oldValue) {
          this.setItemId(newValue)

          let scoresUrl = null
          if (this.itemType && this.itemType.restCollectionName && this.itemId) {
            scoresUrl = `${config.apiBaseUrl}/${this.itemType.restCollectionName}/${this.itemId}/variants/data`
          }
          this.setScoresDataUrl(scoresUrl)
          this.ensureScoresDataLoaded()
        }
      },
      immediate: true
    },
    scoresData: {
      handler: function (newValue) {
        const variants = newValue ? parseScoresOrCounts(newValue) : null
        if (variants) {
          parseSimpleCodingVariants(variants)
          translateSimpleCodingVariants(variants)
        }
        this.variants = variants ? Object.freeze(variants) : null
        this.applyUrlState()
      }
    },
    selectedVariant: 'refreshUrlState',
    selectedCalibration: 'refreshUrlState'
  },

  mounted: async function () {
    await this.checkUserAuthorization()
    await this.checkClinicalVariants()
  },

  methods: {
    refreshUrlState: async function () {
      const query = {...this.$route.query}

      if (this.selectedVariant) {
        query.variant = this.selectedVariant.accession
      } else {
        delete query.variant
      }

      if (this.selectedCalibration) {
        query.calibration = this.selectedCalibration
      } else {
        delete query.calibration
      }

      await this.$router.replace({path: this.$route.path, query: query})
    },
    showProteinStructureModal: function () {
      this.isScoreSetVisualizerVisible = true
    },
    variantNotNullOrNA,
    checkUserAuthorization: async function () {
      await this.checkAuthorization()
    },
    checkAuthorization: async function () {
      // Response should be true to get authorization
      const actions = ['delete', 'publish', 'update']
      try {
        for (const action of actions) {
          const response = await axios.get(
            `${config.apiBaseUrl}/permissions/user-is-permitted/score-set/${this.itemId}/${action}`
          )
          this.userIsAuthorized[action] = response.data
        }
        // If a user can update, they can also add calibrations
        this.userIsAuthorized.addCalibration = this.userIsAuthorized.update
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },
    checkClinicalVariants: async function () {
      if (this.item) {
        try {
          const response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/clinical-controls/options`)
          if (response.status == 200) {
            this.hasClinicalVariants = true
          }
        } catch (err) {
          console.log(`Error to get clinical variants:`, err)
        }
      }
    },
    editItem: function () {
      if (this.item) {
        this.$router.replace({path: `/score-sets/${this.item.urn}/edit`})
      }
    },
    sendToGalaxy: async function (download_type) {
      try {
        const galaxyUrl = this.galaxyUrl
        let params = {}
        if (this.item) {
          const baseApiUrl = `${config.apiBaseUrl}/score-sets/${this.item.urn}`

          let endpoint, outputType
          switch (download_type) {
            case 'counts':
              endpoint = 'counts'
              outputType = 'table'
              break
            case 'scores':
              endpoint = 'scores'
              outputType = 'table'
              break
            case 'mappedVariants':
              endpoint = 'mapped-variants'
              outputType = 'json'
              break
            default:
              break
          }

          const apiUrl = `${baseApiUrl}/${endpoint}`

          params = {
            toolId: this.toolId,
            maveData: download_type,
            urn: this.item.urn,
            outputType: outputType,
            URL: apiUrl
          }
          const submitGalaxyUrl = `${galaxyUrl}?tool_id=${params.toolId}&maveData=${params.maveData}&urn=${
            params.urn
          }&outputType=${params.outputType}&URL=${encodeURIComponent(params.URL)}`
          window.location.href = submitGalaxyUrl
          localStorage.removeItem('galaxyUrl')
          localStorage.removeItem('toolId')
          localStorage.removeItem('requestFromGalaxy')
        }
      } catch (error) {
        console.error('Error sending data:', error)
      }
    },
    deleteItem: async function () {
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
              response = e.response || {status: 500}
            }

            if (response.status == 200) {
              // display toast message here
              //const deletedItem = response.data
              console.log('Deleted item')
              this.$router.replace({path: `/dashboard`})
              this.$toast.add({severity: 'success', summary: 'Your score set was successfully deleted.', life: 3000})
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
      })
    },
    markdownToHtml: function (markdown) {
      return marked(markdown)
    },
    get(...args) {
      return _.get(...args)
    },
    publishItem: async function () {
      let response = null
      this.$confirm.require({
        message:
          'Are you sure you want to publish this score set? Once published, you will be unable to edit scores, counts, or targets. You will also be unable to delete this score set.',
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
            response = e.response || {status: 500}
          }

          if (response.status == 200) {
            // display toast message here
            const publishedItem = response.data
            if (this.item) {
              console.log('Published item')
              this.$router.replace({path: `/score-sets/${publishedItem.urn}`})
              this.$toast.add({severity: 'success', summary: 'Your score set was successfully published.', life: 3000})
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
    downloadFile: async function (download_type) {
      let response = null
      try {
        if (this.item && download_type == 'counts') {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/counts?drop_na_columns=true`)
        } else if (this.item && download_type == 'scores') {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/scores?drop_na_columns=true`)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      if (response.status == 200) {
        const file = response.data
        const anchor = document.createElement('a')
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file)
        anchor.target = '_blank'
        if (download_type == 'counts') {
          anchor.download = this.item.urn + '_counts.csv'
        } else if (download_type == 'scores') {
          anchor.download = this.item.urn + '_scores.csv'
        }
        anchor.click()
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
    downloadMappedVariants: async function () {
      let response = null
      try {
        if (this.item) {
          response = await axios.get(`${config.apiBaseUrl}/score-sets/${this.item.urn}/mapped-variants`)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      if (response.status == 200) {
        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file)
        anchor.target = '_blank'
        //file default name
        anchor.download = this.item.urn + '_mapped_variants.json'
        anchor.click()
      } else {
        this.$toast.add({severity: 'error', summary: 'No downloadable mapped variants text file', life: 3000})
      }
    },
    downloadAnnotatedVariants: async function (mappedVariantType) {
      let response = null
      try {
        if (this.item) {
          response = await axios.get(
            `${config.apiBaseUrl}/score-sets/${this.item.urn}/annotated-variants/${mappedVariantType}`
          )
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      if (response.status == 200) {
        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file)
        anchor.target = '_blank'
        //file default name
        anchor.download = this.item.urn + '_annotated_variants.json'
        anchor.click()
      } else {
        this.$toast.add({severity: 'error', summary: 'No downloadable annotated variants text file', life: 3000})
      }
    },
    downloadMetadata: async function () {
      //convert object to Json. extraMetadata is an object.
      const metadata = JSON.stringify(this.item.extraMetadata)
      const anchor = document.createElement('a')
      anchor.href = 'data:text/txt;charset=utf-8,' + encodeURIComponent(metadata)
      anchor.target = '_blank'
      //file default name
      anchor.download = this.item.urn + '_metadata.txt'
      anchor.click()
    },
    setHistogramExport: function (fn) {
      this.histogramExport = fn
    },
    setHeatmapExport: function (fn) {
      this.heatmapExport = fn
    },
    variantSearch: function (event) {
      const matches = []
      for (const variant of this.variants) {
        if (variantNotNullOrNA(variant.hgvs_nt) && variant.hgvs_nt.toLowerCase().includes(event.query.toLowerCase())) {
          matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_nt}))
        } else if (
          variantNotNullOrNA(variant.hgvs_splice) &&
          variant.hgvs_splice.toLowerCase().includes(event.query.toLowerCase())
        ) {
          matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_splice}))
        } else if (
          variantNotNullOrNA(variant.hgvs_pro) &&
          variant.hgvs_pro.toLowerCase().includes(event.query.toLowerCase())
        ) {
          matches.push(Object.assign(variant, {mavedb_label: variant.hgvs_pro}))
        } else if (
          variantNotNullOrNA(variant.accession) &&
          variant.accession.toLowerCase().includes(event.query.toLowerCase())
        ) {
          matches.push(Object.assign(variant, {mavedb_label: variant.accession}))
        }
      }

      this.variantSearchSuggestions = matches
    },
    downloadMultipleData: async function () {
      if (this.selectedDataOptions.length === 0) {
        this.$toast.add({
          severity: 'warn',
          summary: 'No data selected',
          detail: 'Please select at least one data type.',
          life: 3000
        })
        return
      }

      const baseUrl = new URL(`${config.apiBaseUrl}/score-sets/${this.item.urn}/variants/data`)
      const params = new URLSearchParams(baseUrl.params)
      let includeCustomColumns = false
      for (const option of this.selectedDataOptions) {
        if (['scores', 'counts'].includes(option)) {
          params.append('namespaces', option)
        }
        if (option === 'mappedHgvs') {
          params.append('include_post_mapped_hgvs', 'true')
        }
        if (option === 'counts' || option === 'includeCustomColumns') {
          includeCustomColumns = true
        }
        if (option === 'dropNaColumns') {
          params.append('drop_na_columns', 'true')
        }
      }
      if (includeCustomColumns) {
        params.append('include_custom_columns', 'true')
      }
      let response = null
      try {
        if (this.item) {
          response = await axios.get(`${baseUrl}?${params.toString()}`)
        }
      } catch (e) {
        response = e.response || {status: 500}
      }
      if (response.status == 200) {
        const file = response.data
        const anchor = document.createElement('a')
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(file)
        anchor.target = '_blank'
        anchor.download = this.item.urn + '.csv'
        anchor.click()
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
      this.optionsVisible = false
    },
    childComponentSelectedVariant: function (variant) {
      if (variant == null) {
        this.selectedVariant = null
      }

      if (!variant?.accession) {
        return
      }

      const selectedVariant = this.variants.find((v) => v.accession == variant.accession)
      this.selectedVariant = Object.assign(selectedVariant, preferredVariantLabel(selectedVariant))
    },
    childComponentSelectedCalibration: function (calibration) {
      this.selectedCalibration = calibration
    },
    applyUrlState: function () {
      if (this.$route.query.variant) {
        const selectedVariant = this.variants.find((v) => v.accession == this.$route.query.variant)
        this.selectedVariant = Object.assign(selectedVariant, preferredVariantLabel(selectedVariant))
      }
      if (this.$route.query.calibration) {
        const selectedCalibration = this.$route.query.calibration
        this.selectedCalibration = selectedCalibration
      }
    },
    heatmapVisibilityUpdated: function (visible) {
      this.heatmapExists = visible
    },
    // Check whether all columns values are NA.
    columnIsAllNa: function (tableData, column) {
      const sliceData = tableData.slice(0, 10)
      let frozen = true
      let count = 0
      for (let i = 0; i < sliceData.length; i++) {
        //NA is a string
        if (sliceData[i][column] == 'NA') {
          count += 1
        }
      }
      if (count == 10) {
        frozen = false
      }
      return frozen
    },
    saveCreatedCalibration: async function () {
      if (this.calibrationDraftRef.value) {
        let response = null
        try {
          response = await axios.post(`${config.apiBaseUrl}/score-calibrations`, this.calibrationDraftRef.value)
        } catch (e) {
          response = e.response || {status: 500}
        }

        if (response.status == 200) {
          const createdCalibration = response.data
          this.$toast.add({severity: 'success', summary: 'Your calibration was successfully created.', life: 3000})
          this.calibrationEditorVisible = false
          // Reset draft
          this.calibrationDraftRef.value = null
          // Reload item to get the new calibration and then select it
          await this.reloadItem()
          this.selectedCalibration = createdCalibration.urn
        } else if (response.data && response.data.detail) {
          const formValidationErrors = {}
          for (const error of response.data.detail) {
            let path = error.loc
            if (path[0] == 'body') {
              path = path.slice(1)
            }
            let customPath = error.ctx.custom_loc
            if (customPath && customPath[0] == 'body') {
              customPath = customPath.slice(1)
            }
            path = path.join('.')
            formValidationErrors[path] = error.msg
          }
          this.editorValidationErrors = formValidationErrors
        }
      }
    },
    showOptions: function () {
      this.optionsVisible = true
    }
  }
}
</script>

<style scoped>
/* Score set */

.mavedb-score-set {
  padding: 20px;
}

.mavedb-score-set-heatmap-pane {
  margin: 10px 0;
}

.mavedb-score-set-variant-search {
  margin-top: 40px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}

.mavedb-score-set-variant-search > span {
  width: 50%;
  display: flex;
  align-items: center;
  column-gap: 0.5em;
}

.p-float-label {
  display: flex;
  width: 100%;
}

/* Controls */

.mavedb-clinical-mode-control-container {
  margin-left: 1em;
}

.mavedb-clinical-mode-option-on {
  font-weight: bold;
}

/* Score set details */

.mavedb-score-set-section-title {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 24px;
  padding: 0 0 5px 0;
  border-bottom: 1px solid #ccc;
  margin: 20px 0 10px 0;
}

.mavedb-score-set-description {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  margin: 0 0 10px 0;
}

.mavedb-score-set-urn {
  font-size: 20px;
  color: gray;
  margin-left: 12px;
}

/* Formatting in Markdown blocks */

.mavedb-score-set-abstract {
  /*font-family: Helvetica, Verdana, Arial, sans-serif;*/
  font-size: 20px;
}

.mavedb-score-set-abstract:deep(code) {
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

.mavedb-assay-facts-container {
  float: left;
  margin: 0 1em 1em 0;
}

.clearfix::after {
  display: block;
  content: '';
  clear: both;
}

.mavedb-help-tooltip-button {
  height: 0.5rem;
  width: 0.5rem;
  vertical-align: middle;
  /* Remove extra vertical margin/padding if any. */
  margin-top: 0;
  margin-bottom: 0;
  /* Ensure that button is inline with text. */
  display: inline-flex;
  align-items: center;
  background: none;
}

.mavedb-help-tooltip-button:focus,
.mavedb-help-tooltip-button:active,
.mavedb-help-tooltip-button.p-focus {
  background: none;
}

.mavedb-help-tooltip-button:deep(.p-button-icon) {
  font-size: 0.5rem;
}
</style>

<style>
.scoreset-viz-sidebar .p-sidebar-header {
  padding: 0 5px 0;
  height: 2em;
}
</style>
