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
          @variantColumnRangesSelected="didSelectResidues"
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
  }),

  methods: {
    // didSelectResidue: function(datum) {
    //   this.didSelectResidues([{start: datum.x, end: datum.x}])
    // },
    didSelectResidues: function(ranges) {
      this.selectedResidueRanges = ranges
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
    const simpleVariants = this.$refs.scoreSetHeatmap.simpleVariants
    const heatmap = this.$refs.scoreSetHeatmap.heatmap
    const heatmapColorScale = heatmap.colorScale()

    const simpleVariantsCalcs = _(_.filter(simpleVariants, 'meanScore'))
      .groupBy('x')
      .map((simpleVariant, id) => ({
        x: parseInt(id),
        meanScore: _.meanBy(simpleVariant, 'meanScore'),
        maxMissenseScore: _.get(_.maxBy(_.filter(simpleVariant, (v) => v.y <= 19), 'meanScore'), 'meanScore'),
        minMissenseScore: _.get(_.minBy(_.filter(simpleVariant, (v) => v.y <= 19), 'meanScore'), 'meanScore'),
      }))
      .value()

    const simpleVariantsCalcsWithColor = _.map(simpleVariantsCalcs, (simpleVariant) => {
      const color = heatmapColorScale(simpleVariant.meanScore)
      return {
        ...simpleVariant,
        color: color,
      }
    })

    this.selectionData.value = _.map(simpleVariantsCalcsWithColor, (simpleVariant) => {
      return {
        start_residue_number: simpleVariant.x,
        end_residue_number: simpleVariant.x,
        color: this.rgbToHex(simpleVariant.color),
      }
    })
    this.residueTooltips.value = _.map(simpleVariantsCalcsWithColor, (simpleVariant) => {
      return {
        start_residue_number: simpleVariant.x,
        end_residue_number: simpleVariant.x,
        tooltip: `Mean score: ${simpleVariant.meanScore}<br>Min missense score: ${simpleVariant.minMissenseScore}`
      }
    })
  },
}
</script>
