<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center flex-wrap">
      <span class="ml-2">Color by:</span>
      <SelectButton v-model="colorBy" class="ml-2 mb-2" option-label="name" option-value="value" :options="colorByOptions" />
      <span v-if="showStructureSelector">
        <span class="ml-4">Segment:</span>
        <PSelect
          v-model="selectedModelId"
          class="ml-2"
          option-label="label"
          option-value="id"
          :options="structureModels"
          :pt="{listContainer: {style: {overscrollBehavior: 'contain'}}}"
          @change="onModelChange"
        />
      </span>
      <SplitButton
        :id="scopedId('download')"
        :button-props="{class: 'p-button-sm p-button-secondary'}"
        class="ml-auto mr-2 mb-2"
        :disabled="!selectedModel"
        icon="pi pi-download"
        label="Download"
        :menu-button-props="{class: 'p-button-sm p-button-secondary'}"
        :model="downloadMenuItems"
        @click="downloadStructure()"
      >
        <template #menuitemicon="{item, class: iconClass}">
          <span v-if="item.faIcons" :class="['protein-download-menu-icon', iconClass]">
            <FontAwesomeIcon v-for="faIcon in item.faIcons" :key="faIcon" :icon="faIcon" />
          </span>
        </template>
      </SplitButton>
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
import PSelect from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import SplitButton from 'primevue/splitbutton'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import {PDBeMolstarPlugin} from 'pdbe-molstar/lib/viewer'
import 'pdbe-molstar/build/pdbe-molstar-light.css'
import _ from 'lodash'
import {watch, ref} from 'vue'

import useScopedId from '@/composables/scoped-id'

export default {
  name: 'ProteinStructureView',

  components: {FontAwesomeIcon, PSelect, SelectButton, SplitButton},

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
    allStructureModels: [],
    selectedModelId: null,
    userPickedModel: false,
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
    selectedModel: function () {
      return _.find(this.structureModels, {id: this.selectedModelId}) || null
    },
    // Score entries carry canonical UniProt residue numbers, remapped to how the selected structure
    // is addressed by molstar (see mapSelectionToModel).
    mappedSelectionData: function () {
      return this.mapSelectionToModel(this.selectionDataWithSelectedColorBy)
    },
    // Canonical UniProt residue span covered by the heatmap (the assayed positions), or null when
    // scores haven't loaded yet.
    scoredResidueRange: function () {
      const scored = this.selectionData || []
      if (!scored.length) {
        return null
      }
      return {
        low: _.min(_.map(scored, 'start_residue_number')),
        high: _.max(_.map(scored, 'end_residue_number'))
      }
    },
    // Structures offered in the viewer: only those overlapping the heatmapped residues, since a
    // structure covering an un-assayed region would render blank here. Before scores load (no range
    // yet), show everything fetched.
    structureModels: function () {
      const range = this.scoredResidueRange
      if (!range) {
        return this.allStructureModels
      }
      return _.filter(
        this.allStructureModels,
        (model) => this.modelScoresetOverlap(model, range) > 0
      )
    },
    // Show the structure selector whenever we're displaying a fragment of the protein — even a single
    // one, so the displayed region is clear. A single full-length model (AlphaFold) needs no selector.
    showStructureSelector: function () {
      const models = this.structureModels
      if (!models.length) {
        return false
      }
      return models.length > 1 || !models[0].fullLength
    },
    // Flat model for the SplitButton's internal TieredMenu. Disabled rows act as group headers (skipped by
    // the menu's keyboard navigation) and separators divide the groups so it reads like the grouped-select example.
    downloadMenuItems: function () {
      // One item per structure format the source provides (AlphaFold offers pdb/cif/bcif; 3D-Beacons
      // sources typically one).
      const structureItems = _.map(this.selectedModel?.downloads, (download) => ({
        label: download.label,
        faIcons: ['fa-solid fa-cube'],
        command: () => this.downloadStructure(download)
      }))
      // Coloring exports write canonical UniProt residue numbers, which match AlphaFold and SWISS-MODEL
      // (numbered by canonical position) but not PDBe structures (author numbering) — the colors would land
      // on the wrong residues. For PDBe, offer only the raw structure files.
      if (this.selectedModel?.provider === 'PDBe') {
        return structureItems
      }
      return [
        {label: 'Model', class: 'protein-download-menu-header', disabled: true},
        ...structureItems,
        {separator: true},
        {label: 'Coloring', class: 'protein-download-menu-header', disabled: true},
        {label: 'PyMOL Macro Language (.pml)', faIcons: ['fa-solid fa-palette'], command: () => this.downloadPml()},
        {label: 'ChimeraX command file (.cxc)', faIcons: ['fa-solid fa-palette'], command: () => this.downloadCxc()},
        {separator: true},
        {label: 'Model + Coloring', class: 'protein-download-menu-header', disabled: true},
        {label: 'MolViewSpec JSON (.mvsj)', faIcons: ['fa-solid fa-cube', 'fa-solid fa-palette'], command: () => this.downloadMvsj()}
      ]
    },
    currentColorByLabel: function () {
      const match = _.find(this.colorByOptions, (option) => _.isEqual(option.value, this.colorBy))
      return match?.name || 'Custom'
    },
    // Base name (no extension) for downloaded files. AlphaFold's file URLs already have clean, versioned
    // names (AF-<acc>-F1-model_v6), so keep them. 3D-Beacons URLs (PDBe, SWISS-MODEL) carry query strings
    // and their ids contain ":", so build a filesystem-safe name from the UniProt id and residue range.
    downloadBaseName: function () {
      const model = this.selectedModel
      if (!model) {
        return 'structure'
      }
      if (model.provider === 'AlphaFold DB') {
        return model.url.split('/').pop().replace(/\.[^.]+$/, '')
      }
      return `${this.uniprotId}_${model.start}-${model.end}`
    },
  },

  watch: {
    colorBy: {
      handler: function () {
        if (this.viewerInstance)
          this.viewerInstance.visual.select({
            data: this.mappedSelectionData,
            nonSelectedColor: this.nonSelectedColor
          })
      }
    },
    selectedResidueRanges: {
      handler: function (newValue) {
        if (this.viewerInstance) {
          const selectedRanges = this.mapSelectionToModel(
            newValue.map((x) => ({
              start_residue_number: x.start,
              end_residue_number: x.end,
              color: null,
              focus: true
            }))
          )
          this.viewerInstance.visual.select({
            data: [...this.mappedSelectionData, ...selectedRanges],
            nonSelectedColor: this.nonSelectedColor
          })
          this.viewerInstance.visual.highlight({
            data: selectedRanges
          })
        }
      },
      deep: true
    },
    selectionData: {
      handler: function () {
        // Score data can arrive (or change) after the structures are fetched. Re-sync so the offered
        // structures re-filter to those covering the scored residues and the selection stays valid.
        if (this.allStructureModels.length) {
          this.syncSelectedStructure(false)
        }
      },
      deep: true
    },
    uniprotId: {
      handler: async function () {
        this.loadStructures()
      },
      immediate: true
    }
  },

  beforeUnmount: function () {
    this.destroyViewer()
  },

  methods: {
    modelScoresetOverlap: function(model, range) {
      return Math.max(0, Math.min(model.end, range.high) - Math.max(model.start, range.low))
    },
    clickedResidue: function (e) {
      this.$emit('clickedResidue', this.toCanonicalResidueEvent(e.eventData))
    },
    hoveredOverResidue: function (e) {
      this.$emit('hoveredOverResidue', this.toCanonicalResidueEvent(e.eventData))
    },
    toCanonicalResidueEvent: function (eventData) {
      // The parent matches the heatmap by canonical UniProt position. For SIFTS-mapped structures
      // (PDBe) the clicked loci reports the structure's own residue number in `residueNumber`, so
      // substitute the UniProt residue number (unp_seq_id) when molstar resolved one for this entry.
      if (eventData && eventData.unp_accession === this.uniprotId && eventData.unp_seq_id != null) {
        return {...eventData, residueNumber: eventData.unp_seq_id}
      }
      return eventData
    },
    mapSelectionToModel: function (ranges) {
      // Score positions are canonical UniProt residue numbers. AlphaFold and SWISS-MODEL models are
      // numbered by canonical position, so they're used directly. PDBe experimental structures use
      // author numbering, but their _updated.cif carries the SIFTS UniProt mapping, so we select by
      // uniprot_accession + UniProt residue number and molstar resolves it to the right residues.
      if (this.selectedModel?.provider === 'PDBe' && this.uniprotId) {
        return _.map(ranges, (r) => ({
          ..._.omit(r, ['start_residue_number', 'end_residue_number']),
          uniprot_accession: this.uniprotId,
          start_uniprot_residue_number: r.start_residue_number,
          end_uniprot_residue_number: r.end_residue_number
        }))
      }
      return ranges
    },
    // The download formats offered for a structure, in a stable order (pdb, cif, bcif), skipping any the
    // source doesn't provide. Each entry drives one item in the download menu's Model group.
    structureDownloads: function (urlsByFormat) {
      return [
        {format: 'pdb', label: 'PDB (.pdb)'},
        {format: 'cif', label: 'mmCIF (.cif)'},
        {format: 'bcif', label: 'BinaryCIF (.bcif)'}
      ]
        .filter((f) => urlsByFormat[f.format])
        .map((f) => ({...f, url: urlsByFormat[f.format]}))
    },
    fetchStructureModels: async function () {
      // Prefer the canonical AlphaFold model when one exists (normal-length proteins).
      try {
        const {data} = await axios.get(`https://alphafold.ebi.ac.uk/api/prediction/${this.uniprotId}`)
        const predictions = _.isArray(data) ? data : [data]
        const canonical = predictions.find((x) => x.entryId === `AF-${this.uniprotId}-F1`)
        if (canonical) {
          return [
            {
              id: canonical.entryId,
              url: canonical.cifUrl,
              format: 'cif',
              provider: 'AlphaFold DB',
              start: canonical.uniprotStart,
              end: canonical.uniprotEnd,
              fullLength: true,
              label: `AlphaFold · ${canonical.uniprotStart}–${canonical.uniprotEnd}`,
              downloads: this.structureDownloads({pdb: canonical.pdbUrl, cif: canonical.cifUrl, bcif: canonical.bcifUrl})
            }
          ]
        }
      } catch {
        // AlphaFold has no single model for large canonical proteins (404); fall back below.
      }

      // Large canonical proteins: no single AlphaFold model exists. Gather experimental (PDBe) and
      // template (SWISS-MODEL) structures from 3D-Beacons; coverage is reported in canonical UniProt
      // coordinates, and each covers a segment of the protein. Score colouring maps onto all of them
      // (SWISS-MODEL by canonical numbering, PDBe via its SIFTS mapping — see mapSelectionToModel).
      const cifFormats = {MMCIF: 'cif', PDB: 'pdb', BCIF: 'bcif'}
      try {
        const {data} = await axios.get(
          `https://www.ebi.ac.uk/pdbe/pdbe-kb/3dbeacons/api/uniprot/summary/${this.uniprotId}.json`
        )
        return _.chain(data.structures)
          .map('summary')
          .filter((s) => s?.model_url && ['PDBe', 'SWISS-MODEL'].includes(s.provider))
          .map((s) => {
            const format = cifFormats[s.model_format] || 'cif'
            return {
              id: s.model_identifier,
              url: s.model_url,
              format,
              provider: s.provider,
              start: s.uniprot_start,
              end: s.uniprot_end,
              fullLength: false,
              label:
                `${s.provider} · ${s.uniprot_start}–${s.uniprot_end}` +
                (s.resolution ? ` · ${s.resolution.toFixed(1)}Å` : ''),
              downloads: this.structureDownloads({[format]: s.model_url})
            }
          })
          .sortBy('start')
          .value()
      } catch {
        return []
      }
    },

    pickDefaultModel: function (models) {
      // Among the offered (already overlap-filtered) structures, show the one that best covers the
      // scored residues first; fall back to the widest coverage when scores haven't loaded yet.
      const range = this.scoredResidueRange
      if (range) {
        const best = _.maxBy(models, (m) => this.modelScoresetOverlap(m, range))
        if (best && this.modelScoresetOverlap(best, range) > 0) {
          return best
        }
      }
      return _.maxBy(models, (m) => m.end - m.start)
    },

    loadStructures: async function () {
      this.destroyViewer()
      this.allStructureModels = []
      this.selectedModelId = null
      this.userPickedModel = false

      if (!this.uniprotId) {
        return
      }

      const models = await this.fetchStructureModels()
      if (!models.length) {
        this.$toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No protein structure is available for this UniProt entry'
        })
        return
      }

      this.allStructureModels = models
      this.syncSelectedStructure(true)
    },

    syncSelectedStructure: function (announceIfNone) {
      // Keep the selected structure valid for the current (overlap-filtered) options, then render.
      const models = this.structureModels
      if (!models.length) {
        // Structures were fetched, but none overlap the heatmapped residues.
        this.selectedModelId = null
        this.destroyViewer()
        if (announceIfNone) {
          this.$toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No protein structure covers the variants in this score set'
          })
        }
        return
      }
      if (!this.userPickedModel || !_.some(models, {id: this.selectedModelId})) {
        this.selectedModelId = this.pickDefaultModel(models).id
      }
      this.render()
    },

    onModelChange: function () {
      // Mark that the user chose a structure so late-arriving score data doesn't override it.
      this.userPickedModel = true
      this.render()
    },

    downloadStructure: async function (download) {
      // Default (main split-button click) to the first offered format.
      const target = download || this.selectedModel?.downloads?.[0]
      if (!target?.url) {
        return
      }
      try {
        // Fetch as a blob so any structure format (cif, bcif, pdb) downloads byte-for-byte intact.
        const response = await axios.get(target.url, {responseType: 'blob'})
        const filename = `${this.downloadBaseName}.${target.format}`
        this.downloadFile(response.data, filename)
      } catch {
        this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to download structure file'})
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
      const filename = `${this.downloadBaseName}-${_.kebabCase(this.currentColorByLabel)}.pml`
      this.downloadFile(new Blob([this.buildPml()], {type: 'text/plain'}), filename)
    },

    downloadCxc: function () {
      if (!this.selectedModel) {
        return
      }
      const filename = `${this.downloadBaseName}-${_.kebabCase(this.currentColorByLabel)}.cxc`
      this.downloadFile(new Blob([this.buildCxc()], {type: 'text/plain'}), filename)
    },

    downloadMvsj: function () {
      if (!this.selectedModel?.url) {
        return
      }
      const filename = `${this.downloadBaseName}-${_.kebabCase(this.currentColorByLabel)}.mvsj`
      this.downloadFile(new Blob([this.buildMvsj()], {type: 'application/json'}), filename)
    },

    /**
     * Build a PyMOL script that reproduces the coloring currently shown in the viewer. The same
     * (residue number, color) pairs are fed to the molstar viewer, so loading the companion structure
     * and running this script yields a display matching MaveDB.
     */
    buildPml: function () {
      const modelId = this.selectedModel?.id
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
      const modelId = this.selectedModel?.id
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
     * the selected structure by URL, so it is self-contained and needs no companion file. Residues
     * are selected by author numbering (auth_seq_id = UniProt position), matching MaveDB's numbers.
     */
    buildMvsj: function () {
      const modelId = this.selectedModel?.id
      const mvsFormats = {cif: 'mmcif', bcif: 'bcif', pdb: 'pdb'}
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
              params: {url: this.selectedModel.url},
              children: [
                {
                  kind: 'parse',
                  params: {format: mvsFormats[this.selectedModel.format] || 'mmcif'},
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
      if (this.viewerInstance) {
        document.removeEventListener('PDB.molstar.click', this.clickedResidue)
        document.removeEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
        // Fully tear down the previous molstar plugin so switching structures doesn't stack viewers.
        this.viewerInstance.plugin?.dispose?.()
        this.viewerInstance = null
      }
    },

    render: async function () {
      this.destroyViewer()

      if (!this.selectedModel) {
        return
      }

      const viewerInstance = new PDBeMolstarPlugin()
      const options = {
        customData: {
          url: this.selectedModel.url,
          format: this.selectedModel.format
        },
        hideControls: true,
        bgColor: {r: 255, g: 255, b: 255},
        landscape: true,
        highlightColor: '#ffffff',
        // Apply score colouring for every structure. mappedSelectionData carries canonical UniProt
        // positions remapped to the selected structure's addressing; nonSelectedColor paints the
        // rest a neutral colour so the viewer never falls back to molstar's per-chain default.
        selection: {
          data: this.mappedSelectionData,
          nonSelectedColor: this.nonSelectedColor
        },
        selectInteraction: false
      }
      const viewerContainer = document.getElementById('pdbe-molstar-viewer-container')
      viewerInstance.render(viewerContainer, options)
      viewerInstance.events.loadComplete.subscribe(() => {
        // if structureRefMap is empty, it means the structure failed to load
        if (!_.size(viewerInstance.structureRefMap)) {
          this.$toast.add({severity: 'error', summary: 'Error', detail: 'Failed to load protein structure'})
        } else {
          viewerInstance.plugin.layout.context.canvas3d.camera.state.fog = 0
          viewerInstance.plugin.layout.context.canvas3d.camera.state.clipFar = false
          viewerInstance.visual.tooltips({data: this.mapSelectionToModel(this.residueTooltips)})
        }
      })

      document.addEventListener('PDB.molstar.click', this.clickedResidue)
      document.addEventListener('PDB.molstar.mouseover', this.hoveredOverResidue)
      this.viewerInstance = viewerInstance
    }
  }
}
</script>

<style>
.msp-plugin .msp-layout-standard {
  border: 0;
}

/* Render the disabled group rows in the download menu as section headers rather than grayed-out items. */
.p-tieredmenu-item.protein-download-menu-header {
  opacity: 1;
}
.protein-download-menu-header .p-tieredmenu-item-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

/* Lay out the (possibly multiple) FontAwesome icons rendered for a download menu item. */
.protein-download-menu-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
