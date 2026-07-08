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
import {PDBeMolstarPlugin} from 'pdbe-molstar/lib/viewer'
import 'pdbe-molstar/build/pdbe-molstar-light.css'
import _ from 'lodash'
import {watch, ref} from 'vue'

import useScopedId from '@/composables/scoped-id'

export default {
  name: 'ProteinStructureView',

  components: {PSelect, SelectButton},

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
        (m) => Math.max(0, Math.min(m.end, range.high) - Math.max(m.start, range.low)) > 0
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
              label: `AlphaFold · ${canonical.uniprotStart}–${canonical.uniprotEnd}`
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
          .map((s) => ({
            id: s.model_identifier,
            url: s.model_url,
            format: cifFormats[s.model_format] || 'cif',
            provider: s.provider,
            start: s.uniprot_start,
            end: s.uniprot_end,
            fullLength: false,
            label:
              `${s.provider} · ${s.uniprot_start}–${s.uniprot_end}` +
              (s.resolution ? ` · ${s.resolution.toFixed(1)}Å` : '')
          }))
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
        const overlap = (m) => Math.max(0, Math.min(m.end, range.high) - Math.max(m.start, range.low))
        const best = _.maxBy(models, overlap)
        if (best && overlap(best) > 0) {
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
</style>
