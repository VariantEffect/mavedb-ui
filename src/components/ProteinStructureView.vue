<template>
  <div class="mavedb-protein-structure-viewer-container" ref="container"></div>
  <Dropdown v-model="selectedPdb" :options="pdbs" optionLabel="id" />
  <Dropdown v-model="colorScheme" :options="colorSchemeOptions" />
</template>

<script>

import axios from 'axios'
import $ from 'jquery'
import * as NGL from 'ngl'
import Dropdown from 'primevue/dropdown'

export default {
  name: 'ProteinStructureView',
  components: {Dropdown},
  emits: ['hoveredOverResidue', 'clickedResidue'],

  props: {
    uniprotId: {
      type: String,
      required: true,
      default: 'P02829'
    },
    selectedResidueRange: {
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
    selectedPdb: null,
    stage: null,
    mainComponent: null,
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
    pdbs: function() {
      if (!this.uniprotData) {
        return []
      }
      return $('entry dbReference[type="PDB"]', this.uniprotData).map((i, element) => {
        const $element = $(element)
        return {
          id: $element.attr('id'),
          method: $element.find('property[type="method"]').first().attr('value'),
          resolution: $element.find('property[type="resolution"]').first().attr('value'),
          chains: $element.find('property[type="chains"]').first().attr('value')
        }
      }).get().filter((pdb) => pdb.id != null)
    }
  },

  mounted: function() {
    this.render()
  },

  watch: {
    pdbs: {
      handler: function() {
        let newSelectedPdb = null
        if (this.selectedPdb) {
          newSelectedPdb = this.pdbs.find((pdb) => pdb.id == newSelectedPdb.id)
        }
        if (!this.selectedPdb && this.pdbs.length > 0) {
          this.selectedPdb = this.pdbs[0]
        }
      }
    },
    selectedResidueRange: {
      handler: function() {
        this.refreshSelection()
      }
    },
    selectedPdb: {
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
    refreshSelection: function() {
      if (this.stage && this.mainComponent) {
        for (const representation of this.selectionRepresentations) {
          console.log(representation)
          //representation.setVisibility(false)
          this.mainComponent.removeAllRepresentations()
          this.mainComponent.removeRepresentation(representation)
        }
        this.selectionRepresentations = []
        if (this.selectedResidueRange) {
          // Get all atoms within 5 Angstroms.
          var selection = new NGL.Selection(`${this.selectedResidueRange[0]}-${this.selectedResidueRange[1]}`);
          var radius = 5
          var atomSet = this.mainComponent.structure.getAtomSetWithinSelection( selection, radius );
          // Expand selection to complete groups
          var atomSet2 = this.mainComponent.structure.getAtomSetWithinGroup(atomSet)
          this.selectionRepresentations.push(
            this.mainComponent.addRepresentation('cartoon', {sele: atomSet2.toSeleString(), colorScheme: 'resname'})
          )
          console.log(this.selectionRepresentations)
          //this.mainComponent.autoView()
        }
      }
    },

    fetchUniprotData: async function() {
      const response = await axios.get(`https://www.uniprot.org/uniprot/${this.uniprotId}.xml`)
      if (response.data) {
        const parser = new DOMParser()
        this.uniprotData = parser.parseFromString(response.data, 'text/xml')
      } else {
        this.uniprotData = null
      }
    },

    render: function() {
      const self = this
      if (this.selectedPdb) {
        if (!this.stage) {
          this.stage = new NGL.Stage(this.$refs.container)
          this.stage.signals.clicked.add((pickingProxy) => {
            if (pickingProxy) {
              const atom = pickingProxy.atom || pickingProxy.closestBondAtom
              if (atom?.residueIndex != null) {
                this.$emit('clickedResidue', {residueNumber: atom.residueIndex + 1})
              }
              // console.log(atom.qualifiedName())
            }
          })
          this.stage.signals.hovered.add((pickingProxy) => {
            if (pickingProxy) {
              const atom = pickingProxy.atom || pickingProxy.closestBondAtom
              if (atom?.residueIndex != null) {
                this.$emit('hoveredOverResidue', {residueNumber: atom.residueIndex + 1})
              }
              // console.log(atom.qualifiedName())
            }
          })
        }
        // rcsb://1crn
        this.stage.removeAllComponents()
        this.stage.loadFile(`rcsb://${this.selectedPdb.id}`, /*{defaultRepresentation: true}*/).then((component) => {
          this.mainComponent = component
          component.addRepresentation('cartoon', {colorScheme: self.colorScheme})
          //this.stage.autoView()
        })
      } else {
        //
      }
    }
  }
}

</script>

<style scoped>

.mavedb-protein-structure-viewer-container {
  height: 600px;
  width: 600px;
}

</style>
