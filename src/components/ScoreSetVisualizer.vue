<template>
  <ProteinStructureView
      :highlightedResidueRange="highlightedResidueRange"
      :selectedResidueRange="selectedResidueRange"
      @clickedResidue="didSelectResidue($event.residueNumber)"
      @hoveredOverResidue="didHighlightResidue($event.residueNumber)"
  />
  <div v-if="scores" class="mave-score-set-heatmap-pane">
    <ScoreSetHeatmap :highlightedResidueRange="highlightedResidueRange" :scoreSet="scoreSet" :scores="scores" :selectedResidueRange="selectedResidueRange" />
  </div>
</template>

<script>

import ProteinStructureView from '@/components/ProteinStructureView'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'

export default {
  name: 'ScoreSetVisualizer',
  components: {ProteinStructureView, ScoreSetHeatmap},

  props: {
    scores: {
      type: Array,
      required: true
    },
    scoreSet: {
      type: Object,
      required: true
    }
  },

  data: () => ({
    highlightedResidueRange: null,
    selectedResidueRange: null
  }),

  methods: {
    didHighlightResidue: function(residueNumber) {
      console.log(residueNumber)
      this.didHighlightResidues(residueNumber, residueNumber + 1)
    },
    didHighlightResidues: function(start, end) {
      this.highlightedResidueRange = [start, end]
    },
    didSelectResidue: function(residueNumber) {
      console.log(residueNumber)
      this.didSelectResidues(residueNumber, residueNumber + 1)
    },
    didSelectResidues: function(start, end) {
      this.selectedResidueRange = [start, end]
    }
  }
}

</script>
