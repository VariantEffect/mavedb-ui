<template>
  <span v-if="alphaFoldData?.length > 1" class="p-float-label" style="margin-top: 10px; margin-bottom:4px">
    <Dropdown :id="$scopedId('alphafold-id')" style="height:3em" v-model="selectedAlphaFold" :options="alphaFoldData" optionLabel="id" />
    <label :for="$scopedId('alphafold-id')">AlphaFold ID</label>
  </span>
  <div id="pdbe-molstar-viewer-container" style="width: 100%; height: 100%; position: relative"></div>
</template>

<script>

import axios from 'axios'
import $ from 'jquery'
import Dropdown from 'primevue/dropdown'

export default {
  name: 'ProteinStructureView',
  components: {Dropdown},
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
    highlightedResidueRange: {
      type: Array,
      default: null
    }
  },

  data: () => ({
    uniprotData: null,
    // selectedPdb: null,
    viewerInstance: null,
    selectedAlphaFold: null,
    stage: null,
    // mainComponent: null,
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
    selectionRepresentations: []
  }),

  computed: {
    alphaFoldData: function() {
        if (!this.uniprotData) {
          return []
        }
        return $('entry dbReference[type="AlphaFoldDB"]', this.uniprotData).map((i, element) => {
          const $element = $(element)
          return {
            id: $element.attr('id'),
            method: $element.find('property[type="method"]').first().attr('value'),
            resolution: $element.find('property[type="resolution"]').first().attr('value'),
            chains: $element.find('property[type="chains"]').first().attr('value')
          }
        }).get().filter((x) => x.id != null)
    },
  },

  mounted: function() {
    this.render()
  },

  watch: {
    selectedResidueRanges: {
      handler: function(newValue) {
        const selectedRanges = newValue.map((x) => ({
          start_residue_number: x.start,
          end_residue_number: x.end,
          color: { r: 255, g: 255, b: 0 },
          focus: true
        }))
        if (newValue.length == 1) {
          this.viewerInstance.visual.select({data: selectedRanges})
        }
      },
      deep: true,
    },
    hidden: {
      handler: function() {
        this.$emit('isHidden', this.hidden)
      }
    },
    alphaFoldData: {
      handler: function() {
        let newSelectedAlphaFold = null
        if (this.selectedAlphaFold) {
          newSelectedAlphaFold = this.alphaFoldData.find((x) => x.id == newSelectedAlphaFold.id)
        }
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
        };
        const viewerContainer = document.getElementById('pdbe-molstar-viewer-container')
        viewerInstance.render(viewerContainer, options)
        viewerInstance.events.loadComplete.subscribe(() => {
            viewerInstance.plugin.layout.context.canvas3d.camera.state.fog = 0
            viewerInstance.plugin.layout.context.canvas3d.camera.state.clipFar = false
        })
        this.viewerInstance = viewerInstance
      }
    }
  }
}

</script>

<style>
.msp-plugin .msp-layout-standard {
  border: 0;
}
</style>
<style scoped>

.mavedb-protein-structure-viewer-container {
  height: 600px;
  width: 600px;
}

</style>
