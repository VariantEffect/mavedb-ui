<template>
  <Splitter ref="splitterRef" style="border: 0px;height: 100%;">
    <SplitterPanel :size="50">
      <div class="mave-score-set-heatmap-pane" >
        <ScoreSetHeatmap
          ref="scoreSetHeatmap"
          :scoreSet="scoreSet"
          :scores="scores"
          :showProteinStructureButton="false"
          mode="protein-viz"
          @variantColumnRangesSelected="didSelectHeatmapResidues"
          @variantRowSelected="didSelectHeatmapRow"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel :size="50">
      <ProteinStructureView
          ref="proteinStructureViewer"
          :selectedResidueRanges="selectedResidueRanges"
          :uniprotId="uniprotId"
          :selectionData="selectionData"
          :residueTooltips="residueTooltips"
          :rowSelected="rowSelected"
          @clickedResidue="didClickResidue($event.residueNumber)"
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
import _ from 'lodash'

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
    selectionData: [],
    residueTooltips: [],
    rowSelected: null,
  }),

  methods: {
    didClickResidue: function(residueNumber) {
      this.$refs.scoreSetHeatmap.heatmap.selectRangeByIndex({x: residueNumber, y: 0}, {x: residueNumber, y: 0})
      const lastSelectedDOMPoint = this.$refs.scoreSetHeatmap.heatmap.lastSelectedDOMPoint()
      this.$refs.scoreSetHeatmap.scrollToPosition(lastSelectedDOMPoint?.x)
    },
    didHighlightResidue: function(residueNumber) {
      // TODO: Implement highlighting logic
      // console.log('didHighlightResidue', residueNumber)
    },
    didSelectHeatmapResidues: function(ranges) {
      this.selectedResidueRanges = ranges
    },
    didSelectHeatmapRow: function(data) {
      this.rowSelected = _.get(data, '0.y', null)
    },
    rgbToHex: (rgb) => {
      const nums = _.words(rgb, /[0-9]+/g)
      const hex = _.map(nums, (num) => {
        const as16 = _.parseInt(num).toString(16)
        return `${_.size(as16) === 1 ? '0' : ''}${as16}`
      })
      return `#${hex.join('')}`
    }
  },

  mounted: function(){
    const simpleAndWtVariants = this.$refs.scoreSetHeatmap.simpleAndWtVariants
    const heatmap = this.$refs.scoreSetHeatmap.heatmap
    const heatmapColorScale = heatmap.colorScale()

    this.selectionData = _(simpleAndWtVariants)
      .groupBy('x')
      .map((simpleVariant, id) => {
        const simpleVariantWithMeanScore = _.filter(simpleVariant, 'meanScore')
        const meanScore = _.meanBy(simpleVariantWithMeanScore, 'meanScore')
        const missenseVariants = _.filter(simpleVariantWithMeanScore, (v) => v.y <= 19)
        const maxMissenseScore = _.get(_.maxBy(missenseVariants, 'meanScore'), 'meanScore')
        const minMissenseScore = _.get(_.minBy(missenseVariants, 'meanScore'), 'meanScore')
        const x = parseInt(id)
        return {
          start_residue_number: x,
          end_residue_number: x,
          ..._.mapValues(_.keyBy(simpleVariant, 'y'), (value) => {
            if (value.details.wt) {
              return {wt: true, score: value.meanScore, color: '#ddbb00'}
            } else {
              return {
                score: value.meanScore,
                color: value.meanScore ? this.rgbToHex(heatmapColorScale(value.meanScore)) : '#000',
              }
            }
          }),
          mean: {score: meanScore, color: this.rgbToHex(heatmapColorScale(meanScore))},
          maxMissense: {score: maxMissenseScore, color: this.rgbToHex(heatmapColorScale(maxMissenseScore))},
          minMissense: {score: minMissenseScore, color: this.rgbToHex(heatmapColorScale(minMissenseScore))},
        }
      })
      .value()

    this.residueTooltips = _.map(this.selectionData, (simpleVariant) => {
      return {
        start_residue_number: simpleVariant.start_residue_number,
        end_residue_number: simpleVariant.end_residue_number,
        tooltip: `Mean score: ${simpleVariant.mean.score}<br>Min. missense score: ${simpleVariant.minMissense.score}<br>Max. missense score: ${simpleVariant.maxMissense.score}`
      }
    })
  },
}
</script>
<style scoped>
.mave-score-set-heatmap-pane {
  height: 100%;
  overflow-y: scroll;
}
</style>
