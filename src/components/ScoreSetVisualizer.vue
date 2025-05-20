<template>
  <Splitter ref="splitterRef" style="height:725px;">
    <SplitterPanel size="50">
      <div v-if="scores" class="mave-score-set-heatmap-pane">
        <ScoreSetHeatmap
          ref="scoreSetHeatmap"
          :highlightedResidueRange="highlightedResidueRange"
          :scoreSet="scoreSet"
          :scores="scores"
          :selectedResidueRange="selectedResidueRange"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel size="50">
      <ProteinStructureView
          ref="proteinStructureViewer"
          :highlightedResidueRange="highlightedResidueRange"
          :selectedResidueRange="selectedResidueRange"
          @clickedResidue="didSelectResidue($event.residueNumber)"
          @hoveredOverResidue="didHighlightResidue($event.residueNumber)"
          @clickedHideButton="hideProteinStructure"
          @isHidden="hideProteinStructureView"
      />
    </SplitterPanel>
  </Splitter>
</template>

<script>

import ProteinStructureView from '@/components/ProteinStructureView'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'

import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button'

export default {
  name: 'ScoreSetVisualizer',
  components: {ProteinStructureView, ScoreSetHeatmap, Splitter, SplitterPanel, Button},

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
    selectedResidueRange: null,
    hideProteinStructure: true,
    splitterRef: null,
  }),

  methods: {
    hideProteinStructureView: function(event) {
      this.$refs.proteinStructureViewer.$el.parentElement.style.maxWidth = event ? '3rem' : null
    },
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
    },
  }
}

</script>
