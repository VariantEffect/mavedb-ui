<template>
  <div class="flex flex-col h-full">
    <FloatLabel v-if="alphaFoldData?.length > 1" class="m-2" variant="on">
      <Select :id="scopedId('alphafold-id')" v-model="selectedAlphaFold" option-label="id" :options="alphaFoldData" />
      <label :for="scopedId('alphafold-id')">AlphaFold ID</label>
    </FloatLabel>
    <div class="flex items-center">
      <span class="ml-2">Color by:</span>
      <SelectButton v-model="colorBy" class="ml-2" option-label="name" option-value="value" :options="colorByOptions" />
      <SplitButton
        :id="scopedId('download')"
        :button-props="{class: 'p-button-sm p-button-secondary'}"
        class="ml-auto mr-2"
        :disabled="!selectedModel"
        icon="pi pi-download"
        label="Download"
        :menu-button-props="{class: 'p-button-sm p-button-secondary'}"
        :model="downloadMenuItems"
        @click="downloadMenuItems[0]?.command?.()"
      />
    </div>
    <div v-show="selectedAlphaFold" id="pdbe-molstar-viewer-container" class="flex-1 relative z-5000"></div>
    <div v-if="!selectedAlphaFold" class="m-auto">No AlphaFold entry found</div>
    <ul class="list-disc text-xs italic text-gray-400 ml-5 px-2 py-1">
      <li>Jumper, J et al. Highly accurate protein structure prediction with AlphaFold. <em>Nature</em> (2021)</li>
      <li>Fleming J. et al. AlphaFold Protein Structure Database and 3D-Beacons: New Data and Capabilities. <em>Journal of Molecular Biology</em> (2025)</li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios'
import $ from 'jquery'
import FloatLabel from 'primevue/floatlabel'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import SplitButton from 'primevue/splitbutton'
import {PDBeMolstarPlugin} from 'pdbe-molstar/lib/viewer'
import 'pdbe-molstar/build/pdbe-molstar-light.css'
import _ from 'lodash'
import {watch, ref} from 'vue'

import useScopedId from '@/composables/scoped-id'

export default {
  name: 'ProteinStructureView',

  components: {FloatLabel, Select, SelectButton, SplitButton},

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
    uniprotData: null,
    viewerInstance: null,
    selectedAlphaFold: null,
    selectedModel: null
  }),

  computed: {
    downloadMenuItems: function () {
      return [
        {label: 'PDB structure', icon: 'pi pi-download', command: () => this.downloadPdb()},
        {label: 'PyMOL coloring script (.pml)', icon: 'pi pi-palette', command: () => this.downloadPml()},
        {label: 'ChimeraX coloring script (.cxc)', icon: 'pi pi-palette', command: () => this.downloadCxc()},
        {label: 'Mol* coloring script (.mvsj)', icon: 'pi pi-palette', command: () => this.downloadMvsj()}
      ]
    },
    currentColorByLabel: function () {
      const match = _.find(this.colorByOptions, (option) => _.isEqual(option.value, this.colorBy))
      return match?.name || 'Custom'
    },
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
    alphaFoldData: function () {
      if (!this.uniprotData) {
        return []
      }
      return $('entry dbReference[type="AlphaFoldDB"]', this.uniprotData)
        .map((i, element) => {
          return {
            id: $(element).attr('id')
          }
        })
        .get()
        .filter((x) => x.id != null)
    }
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
    alphaFoldData: {
      handler: function () {
        if (!this.selectedAlphaFold && this.alphaFoldData.length > 0) {
          this.selectedAlphaFold = this.alphaFoldData[0]
        }
      }
    },
    selectedAlphaFold: {
      handler: function () {
        this.render()
      }
    },
    uniprotId: {
      handler: async function () {
        await this.fetchUniprotData()
      },
      immediate: true
    }
  },

  beforeUnmount: function () {
    this.destroyViewer()
  },

  methods: {
    fetchUniprotData: async function () {
      const response = await axios.get(`https://rest.uniprot.org/uniprotkb/${encodeURIComponent(this.uniprotId)}.xml`)
      if (response.data) {
        const parser = new DOMParser()
        this.uniprotData = parser.parseFromString(response.data, 'text/xml')
      } else {
        this.uniprotData = null
      }
    },

    clickedResidue: function (e) {
      this.$emit('clickedResidue', e.eventData)
    },
    hoveredOverResidue: function (e) {
      this.$emit('hoveredOverResidue', e.eventData)
    },
    fetchAlphaFoldModel: async function () {
      const response = await axios.get(`https://alphafold.ebi.ac.uk/api/prediction/${this.selectedAlphaFold.id}`)
      const predictionModels = _.isArray(response.data) ? response.data : [response.data]
      return predictionModels.find((x) => x.entryId === `AF-${this.selectedAlphaFold.id}-F1`) || null
    },

    downloadPdb: async function () {
      const pdbUrl = this.selectedModel?.pdbUrl
      if (!pdbUrl) {
        return
      }
      try {
        const response = await axios.get(pdbUrl, {responseType: 'text'})
        const filename = pdbUrl.split('/').pop() || `${this.selectedAlphaFold.id}.pdb`
        this.downloadFile(new Blob([response.data], {type: 'chemical/x-pdb'}), filename)
      } catch (error) {
        this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to download PDB file'})
      }
    },

    downloadFile: function (blob, filename) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    },

    downloadPml: function () {
      if (!this.selectedModel) {
        return
      }
      const pdbName = this.selectedModel.pdbUrl?.split('/').pop() || `AF-${this.selectedAlphaFold?.id}-F1.pdb`
      const filename = `${pdbName.replace(/\.pdb$/i, '')}-${_.kebabCase(this.currentColorByLabel)}.pml`
      this.downloadFile(new Blob([this.buildPml()], {type: 'text/plain'}), filename)
    },

    downloadCxc: function () {
      if (!this.selectedModel) {
        return
      }
      const pdbName = this.selectedModel.pdbUrl?.split('/').pop() || `AF-${this.selectedAlphaFold?.id}-F1.pdb`
      const filename = `${pdbName.replace(/\.pdb$/i, '')}-${_.kebabCase(this.currentColorByLabel)}.cxc`
      this.downloadFile(new Blob([this.buildCxc()], {type: 'text/plain'}), filename)
    },

    downloadMvsj: function () {
      if (!this.selectedModel?.cifUrl) {
        return
      }
      const pdbName = this.selectedModel.pdbUrl?.split('/').pop() || `AF-${this.selectedAlphaFold?.id}-F1.pdb`
      const filename = `${pdbName.replace(/\.pdb$/i, '')}-${_.kebabCase(this.currentColorByLabel)}.mvsj`
      this.downloadFile(new Blob([this.buildMvsj()], {type: 'application/json'}), filename)
    },

    /**
     * Build a PyMOL script that reproduces the coloring currently shown in the viewer. The same
     * (residue number, color) pairs are fed to the molstar viewer, so loading the companion PDB
     * and running this script yields a display matching MaveDB.
     */
    buildPml: function () {
      const modelId = this.selectedModel?.entryId || `AF-${this.selectedAlphaFold?.id}-F1`
      const lines = [
        '# PyMOL coloring script generated by MaveDB',
        `# Model: ${modelId}`,
        `# Color by: ${this.currentColorByLabel}`,
        '# Load the matching PDB structure into PyMOL, then run this script',
        '# (File > Run Script..., or `@<this-file>.pml` on the PyMOL command line).',
        ''
      ]

      const definedColors = new Set()
      const defineColor = (hex) => {
        if (!definedColors.has(hex)) {
          const [r, g, b] = this.hexToRgbFloats(hex)
          lines.push(`set_color mave_${hex}, [${r}, ${g}, ${b}]`)
          definedColors.add(hex)
        }
      }

      // Base color for residues that are not part of the score coloring.
      const nonSelected = this.normalizeHex(this.nonSelectedColor)
      if (nonSelected) {
        defineColor(nonSelected)
        lines.push(`color mave_${nonSelected}`)
        lines.push('')
      }

      // Group residues by their displayed color, then emit one selection per color.
      const residuesByColor = this.groupResiduesByColor()
      for (const hex of Object.keys(residuesByColor)) {
        const selection = this.compressResidues(residuesByColor[hex])
        if (selection) {
          defineColor(hex)
          lines.push(`color mave_${hex}, resi ${selection}`)
        }
      }

      return lines.join('\n') + '\n'
    },

    /**
     * Build a UCSF ChimeraX command script that reproduces the coloring shown in the viewer.
     * Mirrors the PyMOL script: a whole-chain base color, then one `color` command per unique
     * color. ChimeraX accepts hex colors directly and writes residue lists as "5-8,12".
     */
    buildCxc: function () {
      const modelId = this.selectedModel?.entryId || `AF-${this.selectedAlphaFold?.id}-F1`
      const lines = [
        '# ChimeraX coloring script generated by MaveDB',
        `# Model: ${modelId}`,
        `# Color by: ${this.currentColorByLabel}`,
        '# Open the matching PDB/CIF structure in ChimeraX, then open this file',
        '# (or drag it into the window) to apply the coloring.',
        ''
      ]

      // Base color for residues that are not part of the score coloring.
      const nonSelected = this.normalizeHex(this.nonSelectedColor)
      if (nonSelected) {
        lines.push(`color /A #${nonSelected} target acs`)
      }

      const residuesByColor = this.groupResiduesByColor()
      for (const hex of Object.keys(residuesByColor)) {
        const selection = this.residueRuns(residuesByColor[hex])
          .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
          .join(',')
        if (selection) {
          lines.push(`color /A:${selection} #${hex} target acs`)
        }
      }

      return lines.join('\n') + '\n'
    },

    /**
     * Build a MolViewSpec (.mvsj) document that reproduces the coloring shown in the viewer, for
     * loading in the Mol* viewer (drag-and-drop, or the ?mvs-url= parameter). The document fetches
     * the AlphaFold structure by URL, so it is self-contained and needs no companion file. Residues
     * are selected by author numbering (auth_seq_id = UniProt position), matching MaveDB's numbers.
     */
    buildMvsj: function () {
      const modelId = this.selectedModel?.entryId || `AF-${this.selectedAlphaFold?.id}-F1`
      const colorNodes = []

      // Base color for residues that are not part of the score coloring (selector defaults to "all").
      const nonSelected = this.normalizeHex(this.nonSelectedColor)
      if (nonSelected) {
        colorNodes.push({kind: 'color', params: {color: `#${nonSelected}`}})
      }

      const residuesByColor = this.groupResiduesByColor()
      for (const hex of Object.keys(residuesByColor)) {
        const expressions = this.residueRuns(residuesByColor[hex]).map(([start, end]) => ({
          auth_asym_id: 'A',
          beg_auth_seq_id: start,
          end_auth_seq_id: end
        }))
        if (expressions.length > 0) {
          colorNodes.push({
            kind: 'color',
            params: {selector: expressions.length === 1 ? expressions[0] : expressions, color: `#${hex}`}
          })
        }
      }

      const tree = {
        metadata: {version: '1', title: `MaveDB — ${modelId} — ${this.currentColorByLabel}`},
        root: {
          kind: 'root',
          children: [
            {
              kind: 'download',
              params: {url: this.selectedModel.cifUrl},
              children: [
                {
                  kind: 'parse',
                  params: {format: 'mmcif'},
                  children: [
                    {
                      kind: 'structure',
                      params: {type: 'model'},
                      children: [
                        {
                          kind: 'component',
                          params: {selector: 'polymer'},
                          children: [{kind: 'representation', params: {type: 'cartoon'}, children: colorNodes}]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }

      return JSON.stringify(tree, null, 2) + '\n'
    },

    // Normalize a CSS hex color (#rgb or #rrggbb, any case) to lowercase 6-digit hex, or null.
    normalizeHex: function (color) {
      if (!color) {
        return null
      }
      let hex = String(color).trim().replace(/^#/, '')
      if (/^[0-9a-f]{3}$/i.test(hex)) {
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('')
      }
      return /^[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : null
    },

    // Convert 6-digit hex to PyMOL's [r, g, b] floats in the 0-1 range.
    hexToRgbFloats: function (hex) {
      return [0, 2, 4].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3))
    },

    // Group the currently displayed residues by their normalized hex color: {hex: [residueNumbers]}.
    groupResiduesByColor: function () {
      const residuesByColor = {}
      for (const datum of this.selectionDataWithSelectedColorBy) {
        const hex = this.normalizeHex(datum.color)
        if (!hex) {
          continue
        }
        if (!residuesByColor[hex]) {
          residuesByColor[hex] = []
        }
        for (let n = datum.start_residue_number; n <= datum.end_residue_number; n++) {
          residuesByColor[hex].push(n)
        }
      }
      return residuesByColor
    },

    // Collapse a list of residue numbers into sorted, contiguous [start, end] runs.
    residueRuns: function (residueNumbers) {
      const sorted = _.uniq(residueNumbers).sort((a, b) => a - b)
      const runs = []
      let start = null
      let prev = null
      for (const n of sorted) {
        if (start === null) {
          start = prev = n
        } else if (n === prev + 1) {
          prev = n
        } else {
          runs.push([start, prev])
          start = prev = n
        }
      }
      if (start !== null) {
        runs.push([start, prev])
      }
      return runs
    },

    // Compress a list of residue numbers into a PyMOL resi selection, e.g. "5-8+12+20".
    compressResidues: function (residueNumbers) {
      return this.residueRuns(residueNumbers)
        .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
        .join('+')
    },

    destroyViewer: function () {
      this.selectedModel = null
      if (this.viewerInstance) {
        document.removeEventListener('PDB.molstar.click', this.clickedResidue)
        document.removeEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
        this.viewerInstance = null
      }
    },

    render: async function () {
      this.destroyViewer()

      if (this.selectedAlphaFold) {
        let model
        try {
          model = await this.fetchAlphaFoldModel()
          if (!model?.cifUrl) {
            throw new Error('AlphaFold cifUrl not found')
          }
        } catch (error) {
          this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to fetch AlphaFold structure metadata'})
          return
        }
        this.selectedModel = model

        const viewerInstance = new PDBeMolstarPlugin()
        const options = {
          customData: {
            url: model.cifUrl,
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
