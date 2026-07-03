<template>
  <div class="flex flex-col h-full">
    <div class="flex">
      <span class="ml-2">Color by:</span>
      <SelectButton v-model="colorBy" class="ml-2" option-label="name" option-value="value" :options="colorByOptions" />
    </div>
    <div id="pdbe-molstar-viewer-container" class="flex-1 relative z-5000"></div>
    <ul class="list-disc text-xs italic text-gray-400 ml-5 px-2 py-1">
      <li>Jumper, J et al. Highly accurate protein structure prediction with AlphaFold. <em>Nature</em> (2021)</li>
      <li>Fleming J. et al. AlphaFold Protein Structure Database and 3D-Beacons: New Data and Capabilities. <em>Journal of Molecular Biology</em> (2025)</li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios'
import SelectButton from 'primevue/selectbutton'
import {PDBeMolstarPlugin} from 'pdbe-molstar/lib/viewer'
import 'pdbe-molstar/build/pdbe-molstar-light.css'
import _ from 'lodash'
import {watch, ref} from 'vue'

import useScopedId from '@/composables/scoped-id'

export default {
  name: 'ProteinStructureView',

  components: {SelectButton},

  props: {
    uniprotId: {
      type: String,
      default: null
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
      default: null
    },
    rowGroupSelected: {
      type: Object,
      default: null
    },
    residueTooltips: {
      type: Array,
      default: () => []
    },
    nonSelectedColor: {
      type: String,
      default: '#FFFFFF'
    }
  },

  emits: ['hoveredOverResidue', 'clickedResidue'],

  setup(props) {
    const colorBy = ref('mean.color')

    watch(
      () => props.rowSelected,
      (newValue) => {
        if (_.isNumber(newValue?.rowNumber)) {
          colorBy.value = [newValue.rowNumber, 'color']
        }
      }
    )

    watch(
      () => props.rowGroupSelected,
      (newValue) => {
        if (newValue?.colorBy && newValue.colorBy !== colorBy.value) {
          colorBy.value = newValue.colorBy
        }
      }
    )

    return {
      ...useScopedId(),
      colorBy
    }
  },

  data: () => ({
    viewerInstance: null,
  }),

  computed: {
    colorByOptions: function () {
      const baseOptions = [
        {name: 'Mean Score', value: 'mean.color'},
        {name: 'Min Missense Score', value: 'minMissense.color'},
        {name: 'Max Missense Score', value: 'maxMissense.color'}
      ]
      if (_.isNumber(this.rowSelected?.rowNumber) && this.rowSelected?.label) {
        return [...baseOptions, {name: this.rowSelected.label, value: [this.rowSelected.rowNumber, 'color']}]
      } else if (this.rowGroupSelected?.label && this.rowGroupSelected?.colorBy) {
        return [...baseOptions, {name: this.rowGroupSelected.label, value: this.rowGroupSelected.colorBy}]
      }
      return baseOptions
    },
    selectionDataWithSelectedColorBy: function () {
      return _.map(this.selectionData, (x) => ({
        start_residue_number: x.start_residue_number,
        end_residue_number: x.end_residue_number,
        color: _.get(x, this.colorBy, '#ffffff')
      }))
    },
  },

  watch: {
    colorBy: {
      handler: function () {
        if (this.viewerInstance)
          this.viewerInstance.visual.select({
            data: this.selectionDataWithSelectedColorBy,
            nonSelectedColor: this.nonSelectedColor
          })
      }
    },
    selectedResidueRanges: {
      handler: function (newValue) {
        if (this.viewerInstance) {
          const selectedRanges = newValue.map((x) => ({
            start_residue_number: x.start,
            end_residue_number: x.end,
            color: null,
            focus: true
          }))
          this.viewerInstance.visual.select({
            data: [...this.selectionDataWithSelectedColorBy, ...selectedRanges],
            nonSelectedColor: this.nonSelectedColor
          })
          this.viewerInstance.visual.highlight({
            data: selectedRanges
          })
        }
      },
      deep: true
    },
    uniprotId: {
      handler: async function () {
        this.render()
      },
      immediate: true
    }
  },

  beforeUnmount: function () {
    this.destroyViewer()
  },

  methods: {
    clickedResidue: function (e) {
      this.$emit('clickedResidue', e.eventData)
    },
    hoveredOverResidue: function (e) {
      this.$emit('hoveredOverResidue', e.eventData)
    },
    fetchAlphaFoldCifUrl: async function () {
      const response = await axios.get(`https://alphafold.ebi.ac.uk/api/prediction/${this.uniprotId}`)
      const predictionModels = _.isArray(response.data) ? response.data : [response.data]

      // response may contain multiple entries (e.g. UniProt ID: P42167), we want to select the one with entryId = AF-<uniprotId>-F1
      const selectedModel = predictionModels.find((x) => x.entryId === `AF-${this.uniprotId}-F1`)
      return selectedModel?.cifUrl || null
    },

    destroyViewer: function () {
      if (this.viewerInstance) {
        document.removeEventListener('PDB.molstar.click', this.clickedResidue)
        document.removeEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
        this.viewerInstance = null
      }
    },

    render: async function () {
      this.destroyViewer()

      if (this.uniprotId) {
        let alphafoldCifUrl
        try {
          alphafoldCifUrl = await this.fetchAlphaFoldCifUrl()
          if (!alphafoldCifUrl) {
            throw new Error('AlphaFold cifUrl not found')
          }
        } catch (error) {
          this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to fetch AlphaFold structure metadata'})
          return
        }

        const viewerInstance = new PDBeMolstarPlugin()
        const options = {
          customData: {
            url: alphafoldCifUrl,
            format: 'cif'
          },
          /** This applies AlphaFold confidence score colouring theme for AlphaFold model */
          // alphafoldView: true,
          hideControls: true,
          bgColor: {r: 255, g: 255, b: 255},
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
            nonSelectedColor: this.nonSelectedColor
          },
          selectInteraction: false
        }
        const viewerContainer = document.getElementById('pdbe-molstar-viewer-container')
        viewerInstance.render(viewerContainer, options)
        viewerInstance.events.loadComplete.subscribe(() => {
          // if structureRefMap is empty, it means AlphaFold structure failed to load
          if (!_.size(viewerInstance.structureRefMap)) {
            this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to load AlphaFold structure'})
          } else {
            viewerInstance.plugin.layout.context.canvas3d.camera.state.fog = 0
            viewerInstance.plugin.layout.context.canvas3d.camera.state.clipFar = false
            viewerInstance.visual.tooltips({data: this.residueTooltips})
          }
        })

        document.addEventListener('PDB.molstar.click', this.clickedResidue)
        document.addEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
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
