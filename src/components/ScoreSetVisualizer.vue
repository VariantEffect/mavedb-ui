<template>
  <Splitter ref="splitterRef" style="border: 0px; height:fit-content;">
    <SplitterPanel :size="50">
      <div class="mave-score-set-heatmap-pane" >
        <ScoreSetHeatmap
          ref="scoreSetHeatmap"
          :highlightedResidueRange="highlightedResidueRange"
          :scoreSet="scoreSet"
          :scores="scores"
          :selectedResidueRange="selectedResidueRange"
          :showProteinStructureButton="false"
          mode="protein-viz"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel :size="50">
      <ProteinStructureView
          ref="proteinStructureViewer"
          :highlightedResidueRange="highlightedResidueRange"
          :selectedResidueRange="selectedResidueRange"
          :uniprotId="uniprotId"
          @clickedResidue="didSelectResidue($event.residueNumber)"
          @hoveredOverResidue="didHighlightResidue($event.residueNumber)"
      />
    </SplitterPanel>
  </Splitter>
</template>

<script>

import ProteinStructureView from '@/components/ProteinStructureView'
import ScoreSetHeatmap from '@/components/ScoreSetHeatmap'

import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'

export default {
  name: 'ScoreSetVisualizer',
  components: {ProteinStructureView, ScoreSetHeatmap, Splitter, SplitterPanel},

  props: {
    scores: {
      type: Array,
      required: true
    },
    scoreSet: {
      type: Object,
      required: true
    },
    uniprotId: {
      type: String,
      required: true
    }
  },

  data: () => ({
    highlightedResidueRange: null,
    selectedResidueRange: null,
    splitterRef: null,
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
    },
  }
}

</script>
