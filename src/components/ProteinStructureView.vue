<template>
  <div style="display:flex; flex-flow: column; height: 100%;">
    <span v-if="alphaFoldData?.length > 1" class="p-float-label" style="margin-top: 10px; margin-bottom:4px">
      <Dropdown :id="scopedId('alphafold-id')" style="height:3em" v-model="selectedAlphaFold" :options="alphaFoldData" optionLabel="id" />
      <label :for="scopedId('alphafold-id')">AlphaFold ID</label>
    </span>
    <div class="flex">
      <span class="ml-2">Color by:</span>
      <SelectButton class="protein-viz-colorby-button ml-2" v-model="colorBy" optionLabel="name" optionValue="value" :options="colorByOptions" />
    </div>
    <div v-show="selectedAlphaFold" id="pdbe-molstar-viewer-container" style="flex: 1; position: relative"></div>
    <div v-if="!selectedAlphaFold" style="flex: 1; position: relative; margin: auto; align-content: center;"> No AlphaFold entry found</div>
  </div>
  </template>
<script>

import axios from 'axios'
import $ from 'jquery'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import { PDBeMolstarPlugin } from 'pdbe-molstar/lib/viewer'
import 'pdbe-molstar/build/pdbe-molstar-light.css'
import _ from 'lodash'
import { watch, ref } from 'vue'

import useScopedId from '@/composables/scoped-id'

export default {
  name: 'ProteinStructureView',
  components: {Dropdown, SelectButton},
  emits: ['hoveredOverResidue', 'clickedResidue'],

  props: {
    uniprotId: {
      type: String,
      required: true,
    },
    selectedResidueRanges: {
      type: Array,
      default: null
    },
    selectionData: {
      type: Array,
      default: () => []
    },
    rowSelected: {
      type: Object,
    },
    rowGroupSelected: {
      type: Object,
    },
    residueTooltips: {
      type: Array,
      default: () => []
    },
  },

  setup(props) {
    const colorBy = ref('mean.color')

    watch(() => props.rowSelected, (newValue) => {
      if (_.isNumber(newValue?.rowNumber)) {
        colorBy.value = [newValue.rowNumber, 'color']
      }
    })

    watch(() => props.rowGroupSelected, (newValue) => {
      if (newValue?.colorBy && newValue.colorBy !== colorBy.value) {
        colorBy.value = newValue.colorBy
      }
    })

    return {
      ...useScopedId(),
      colorBy,
    }
  },

  data: () => ({
    uniprotData: null,
    viewerInstance: null,
    selectedAlphaFold: null,
    stage: null,
    colorScheme: 'bfactor',
    colorSchemeOptions: [
      'atomindex',
      'bfactor',
      'chainid',
      'chainindex',
      'chainname',
      'densityfit',
      'electrostatic',
      'element',
      'entityindex',
      'entitytype',
      'geoquality',
      'hydrophobicity',
      'modelindex',
      'moleculetype',
      'occupancy',
      'random',
      'residueindex',
      'resname',
      'sstruc',
      'uniform',
      'value',
      'volume'
    ],
  }),

  computed: {
    colorByOptions: function() {
      const baseOptions = [
        {name: 'Mean Score', value: 'mean.color'},
        {name: 'Min Missense Score', value: 'minMissense.color'},
        {name: 'Max Missense Score', value: 'maxMissense.color'},
      ]
      if (_.isNumber(this.rowSelected?.rowNumber) && this.rowSelected?.label) {
        return [...baseOptions, {name: this.rowSelected.label, value: [this.rowSelected.rowNumber, 'color']}]
      } else if (this.rowGroupSelected?.label && this.rowGroupSelected?.colorBy) {
        return [...baseOptions, {name: this.rowGroupSelected.label, value: this.rowGroupSelected.colorBy}]
      }
      return baseOptions
    },
    selectionDataWithSelectedColorBy: function() {
        return _.map(this.selectionData, (x) => ({
          start_residue_number: x.start_residue_number,
          end_residue_number: x.end_residue_number,
          color: _.get(x, this.colorBy, '#000')
        }))
    },
    alphaFoldData: function() {
        if (!this.uniprotData) {
          return []
        }
        return $('entry dbReference[type="AlphaFoldDB"]', this.uniprotData).map((i, element) => {
          return {
            id: $(element).attr('id'),
          }
        }).get().filter((x) => x.id != null)
    },
  },

  watch: {
    colorBy: {
      handler: function() {
        if (this.viewerInstance) this.viewerInstance.visual.select({data: this.selectionDataWithSelectedColorBy})
      },
    },
    selectedResidueRanges: {
      handler: function(newValue) {
        if (this.viewerInstance) {
          const selectedRanges = newValue.map((x) => ({
            start_residue_number: x.start,
            end_residue_number: x.end,
            color: null,
            focus: true
          }))
          this.viewerInstance.visual.select({data:[...this.selectionDataWithSelectedColorBy, ...selectedRanges]})
          this.viewerInstance.visual.highlight({
              data: selectedRanges,
          })
        }
      },
      deep: true,
    },
    alphaFoldData: {
      handler: function() {
        if (!this.selectedAlphaFold && this.alphaFoldData.length > 0) {
          this.selectedAlphaFold = this.alphaFoldData[0]
        }
      }
    },
    selectedResidueRange: {
      handler: function() {
        this.refreshSelection()
      }
    },
    selectedAlphaFold: {
      handler: function() {
        this.render()
      }
    },
    colorScheme: {
      handler: function() {
        this.render()
      }
    },
    uniprotId: {
      handler: async function() {
        await this.fetchUniprotData()
      },
      immediate: true
    }
  },

  methods: {
    fetchUniprotData: async function() {
      const response = await axios.get(`https://rest.uniprot.org/uniprotkb/${this.uniprotId}.xml`)
      if (response.data) {
        const parser = new DOMParser()
        this.uniprotData = parser.parseFromString(response.data, 'text/xml')
      } else {
        this.uniprotData = null
      }
    },


    clickedResidue: function(e) { this.$emit('clickedResidue', e.eventData) },
    hoveredOverResidue: function(e) { this.$emit('hoveredOverResidue', e.eventData) },

    render: function() {
      if (this.selectedAlphaFold) {
        const viewerInstance = new PDBeMolstarPlugin()
        const options = {
          customData: {
            url: `https://alphafold.ebi.ac.uk/files/AF-${this.selectedAlphaFold.id}-F1-model_v4.cif`,
            format: 'cif',
          },
          /** This applies AlphaFold confidence score colouring theme for AlphaFold model */
          // alphafoldView: true,
          hideControls: true,
          bgColor: { r: 255, g: 255, b: 255 },
          // hideCanvasControls: [
          //   'selection',
          //   'animation',
          //   'controlToggle',
          //   'controlInfo',
          // ],
          // sequencePanel: true,
          landscape: true,
          highlightColor: '#ffffff',
          selection: {
            data: this.selectionDataWithSelectedColorBy,
          },
          selectInteraction: false,
        };
        const viewerContainer = document.getElementById('pdbe-molstar-viewer-container')
        viewerInstance.render(viewerContainer, options)
        viewerInstance.events.loadComplete.subscribe(() => {
            viewerInstance.plugin.layout.context.canvas3d.camera.state.fog = 0
            viewerInstance.plugin.layout.context.canvas3d.camera.state.clipFar = false
            viewerInstance.visual.tooltips({data:this.residueTooltips})
        })

        document.addEventListener('PDB.molstar.click', this.clickedResidue)
        document.addEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
        this.viewerInstance = viewerInstance
      }
    }
  },

  beforeUnmount: function() {
    document.removeEventListener('PDB.molstar.click', this.clickedResidue)
    document.removeEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
  },
}

</script>

<style>
.msp-plugin .msp-layout-standard {
  border: 0;
}
.protein-viz-colorby-button .p-button {
  padding: 2px !important;
  font-size: 0.8em;
}
</style>
