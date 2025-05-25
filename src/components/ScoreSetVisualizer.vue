<template>
  <Splitter ref="splitterRef" style="border: 0px;">
    <SplitterPanel :size="50">
      <div class="mave-score-set-heatmap-pane" >
        <ScoreSetHeatmap
          ref="scoreSetHeatmap"
          :scoreSet="scoreSet"
          :scores="scores"
          :showProteinStructureButton="false"
          mode="protein-viz"
          @variantColumnRangesSelected="didSelectResidues"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel :size="50">
      <ProteinStructureView
          ref="proteinStructureViewer"
          :selectedResidueRanges="selectedResidueRanges"
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
    selectedResidueRanges: null,
    splitterRef: null,
  }),

  methods: {
    // didSelectResidue: function(datum) {
    //   this.didSelectResidues([{start: datum.x, end: datum.x}])
    // },
    didSelectResidues: function(ranges) {
      this.selectedResidueRanges = ranges
    },
  }
}

</script>
