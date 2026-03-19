<template>
  <Splitter ref="splitterRef" style="border: 0px; height: 100%">
    <SplitterPanel :size="50">
      <div class="mave-score-set-heatmap-pane">
        <ScoreSetHeatmap
          ref="scoreSetHeatmap"
          :allowed-sequence-types="['protein']"
          coordinates="mapped"
          mode="protein-viz"
          :score-set="scoreSet"
          :show-protein-structure-button="false"
          :variants="heatmapVariants || []"
          @variant-column-ranges-selected="didSelectHeatmapResidues"
          @variant-row-group-selected="didSelectHeatmapRowGroup"
          @variant-row-selected="didSelectHeatmapRow"
        />
      </div>
    </SplitterPanel>
    <SplitterPanel :size="50">
      <ProteinStructureView
        ref="proteinStructureViewer"
        :residue-tooltips="residueTooltips"
        :row-group-selected="rowGroupSelected"
        :row-selected="rowSelected"
        :selected-residue-ranges="selectedResidueRanges"
        :selection-data="selectionData"
        :uniprot-id="uniprotId"
        @clicked-residue="didClickResidue($event.residueNumber)"
        @hovered-over-residue="didHighlightResidue($event.residueNumber)"
      />
    </SplitterPanel>
  </Splitter>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import ProteinStructureView from '@/components/score-set/ProteinStructureView.vue'
import ScoreSetHeatmap from '@/components/score-set/ScoreSetHeatmap.vue'

import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import _ from 'lodash'
import {AMINO_ACIDS} from '@/lib/amino-acids'
import type {Variant} from '@/lib/variants'
import type {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HeatmapRef = any

export default defineComponent({
  name: 'ScoreSetVisualizer',
  components: {ProteinStructureView, ScoreSetHeatmap, Splitter, SplitterPanel},

  props: {
    heatmapVariants: {type: Array as PropType<Variant[] | null>, default: null},
    scores: {type: Array as PropType<Variant[] | null>, default: null},
    scoreSet: {type: Object as PropType<ScoreSet | null>, default: null},
    uniprotId: {type: String as PropType<string | null>, default: null}
  },

  data() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedResidueRanges: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectionData: [] as any[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      residueTooltips: [] as any[],
      rowSelected: null as {rowNumber: number; label: string} | null,
      rowGroupSelected: null as {label: string; colorBy: string} | null
    }
  },

  mounted() {
    const heatmapRef = this.$refs.scoreSetHeatmap as HeatmapRef
    const simpleAndWtVariants = heatmapRef.heatmapData
    const heatmap = heatmapRef.heatmap
    const heatmapColorScale = heatmap.colorScale()

    this.selectionData = _(simpleAndWtVariants)
      .groupBy('x')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((simpleVariant: any[], id: string) => {
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
            if (value.wt) {
              return {wt: true, score: value.meanScore, color: '#ddbb00'}
            } else {
              return {
                score: value.meanScore,
                color: value.meanScore ? this.rgbToHex(heatmapColorScale(value.meanScore)) : '#000'
              }
            }
          }),
          mean: {score: meanScore, color: this.rgbToHex(heatmapColorScale(meanScore))},
          maxMissense: {score: maxMissenseScore, color: this.rgbToHex(heatmapColorScale(maxMissenseScore))},
          minMissense: {score: minMissenseScore, color: this.rgbToHex(heatmapColorScale(minMissenseScore))}
        }
      })
      .value()

    this.residueTooltips = _.map(this.selectionData, (simpleVariant) => ({
      start_residue_number: simpleVariant.start_residue_number,
      end_residue_number: simpleVariant.end_residue_number,
      tooltip: `Mean score: ${simpleVariant.mean.score}<br>Min. missense score: ${simpleVariant.minMissense.score}<br>Max. missense score: ${simpleVariant.maxMissense.score}`
    }))
  },

  methods: {
    didClickResidue(residueNumber: number) {
      const heatmapRef = this.$refs.scoreSetHeatmap as HeatmapRef
      heatmapRef.heatmap.selectRangeByIndex({x: residueNumber, y: 0}, {x: residueNumber, y: 0})
      const lastSelectedDOMPoint = heatmapRef.heatmap.lastSelectedDOMPoint()
      heatmapRef.scrollToPosition(lastSelectedDOMPoint?.x)
    },
    didHighlightResidue(_residueNumber: number) {
      // TODO: Implement highlighting logic
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didSelectHeatmapResidues(ranges: any[]) {
      this.selectedResidueRanges = ranges.map((r) => ({start: r.start, end: r.end}))
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didSelectHeatmapRow(data: any) {
      this.rowSelected = null
      this.rowGroupSelected = null

      const heatmapRef = this.$refs.scoreSetHeatmap as HeatmapRef
      const aaRows = heatmapRef.heatmapRows
      const rowNumber = _.get(data, '0.y', null)
      if (!_.isNumber(rowNumber)) return

      const selectedRow = aaRows[aaRows.length - rowNumber - 1]
      const aa = AMINO_ACIDS.find((a) => a.codes?.single === selectedRow?.code)
      this.rowSelected = {
        rowNumber,
        label: aa?.name || selectedRow?.code
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didSelectHeatmapRowGroup(selectedGroup: any) {
      const {groupCode, data} = selectedGroup

      this.rowSelected = null
      this.rowGroupSelected = null

      const heatmapRef = this.$refs.scoreSetHeatmap as HeatmapRef
      const heatmapColorScale = heatmapRef?.heatmap?.colorScale()

      if (heatmapColorScale) {
        const numRows = data.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maxX = _.max(_.map(data, (rowData: any) => _.max(_.map(rowData, 'x')))) as number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const minX = _.min(_.map(data, (rowData: any) => _.min(_.map(rowData, 'x')))) as number

        for (let x = minX; x <= maxX; x++) {
          let scoreSum = 0
          let scoreCount = 0
          for (let i = 0; i < numRows; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cellData = _.find(data[i], (d: any) => d.x === x)
            if (_.isNumber(cellData?.meanScore)) {
              scoreCount += 1
              scoreSum += cellData.meanScore
            }
          }
          const meanScore = scoreSum / scoreCount

          const selectionDatum = _.find(this.selectionData, (d) => d.start_residue_number === x)
          if (selectionDatum) {
            _.set(selectionDatum, _.camelCase(groupCode), {
              score: meanScore,
              color: _.isNumber(meanScore) ? this.rgbToHex(heatmapColorScale(meanScore)) : '#000'
            })
          }
        }
        this.rowGroupSelected = {
          label: groupCode,
          colorBy: `${_.camelCase(groupCode)}.color`
        }
      }
    },
    rgbToHex(rgb: string): string {
      const nums = _.words(rgb, /[0-9]+/g)
      const hex = _.map(nums, (num) => {
        const as16 = _.parseInt(num).toString(16)
        return `${_.size(as16) === 1 ? '0' : ''}${as16}`
      })
      return `#${hex.join('')}`
    }
  }
})
</script>
<style scoped>
.mave-score-set-heatmap-pane {
  height: 100%;
  overflow-y: scroll;
}
</style>
