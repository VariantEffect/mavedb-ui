<template>
  <div class="mavedb-table-view">
    <FlexDataTable
      :data="data"
      :loading="loading"
      :options="tableOptions"
      row-id-path="urn"
      :scroll-x="scrollX"
      :scroll-y="scrollY"
    />
  </div>
</template>

<script>
import $ from 'jquery'
import _ from 'lodash'

import {getTargetGeneName, textForTargetGeneCategory} from '@/lib/target-genes'
import useFormatters from '@/composition/formatters'
import FlexDataTable from '@/components/common/FlexDataTable.vue'

export default {
  name: 'ScoreSetTable',

  components: {FlexDataTable},

  props: {
    data: {
      type: Array,
      required: true
    },
    language: {
      type: Object,
      required: true
    },
    scrollX: {
      type: Boolean,
      required: false,
      default: false
    },
    scrollY: {
      type: Boolean,
      required: false,
      default: false
    },
    loading: {
      type: Boolean,
      required: false,
      default: false
    }
  },

  setup: () => {
    return {
      ...useFormatters(),
      textForTargetGeneCategory: textForTargetGeneCategory
    }
  },

  data() {
    return {
      tableOptions: {
        columns: [
          {
            data: 'urn',
            title: 'URN',
            width: '17.5%',
            render: (data) => {
              const urn = data
              const url = this.$router.resolve({
                path: `/score-sets/${urn}`
              }).href
              return $('<a/>').attr('href', url).text(urn).prop('outerHTML')
            }
          },
          {data: 'shortDescription', title: 'Description', width: '40%'},
          // TODO: Surface target genes besides the first one in the data table.
          {
            data: (x) => {
              const target = _.get(x, 'targetGenes[0]')
              return target ? getTargetGeneName(target) : '—'
            },
            title: 'Target'
          },
          {
            data: (x) => textForTargetGeneCategory(_.get(x, 'targetGenes[0].category', undefined)) || '—',
            title: 'Target type'
          },
          {
            data: (x) =>
              _.get(
                x,
                'targetGenes[0].targetSequence.taxonomy.organismName',
                _.get(x, 'targetGenes[0].targetAccession.assembly', '—')
              ),
            title: 'Target organism/assembly'
          },
          {
            data: (x) => _.get(x, 'targetGenes[0].targetAccession.accession', 'Internal Sequence'),
            title: 'Target accession'
          }
        ],
        language: this.language,
        rowGroup: {
          dataSrc: 'experiment.urn',
          startRender: (rows, group) => {
            const experimentUrn = group
            const experimentUrnDisplay = experimentUrn
            const experimentDescription = _.get(rows.data()[0], 'experiment.shortDescription', null)
            const url = this.$router.resolve({
              path: `/experiments/${experimentUrn}`
            }).href

            const $link = $('<a/>').attr('href', url).text(experimentUrnDisplay)

            return $('<tr/>')
              .append($('<td/>').attr('colSpan', 1).append($link))
              .append($('<td/>').attr('colSpan', 5).text(experimentDescription || '')) // increment if adding columns
          }
        },
        searching: false
      }
    }
  }
}
</script>

<style scoped>
/* Table */

.mavedb-table-view {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 0 0 auto;
  position: relative;
}

/* Override control bar padding applied in FlexDataTable. */
.mavedb-table-view:deep(.samplify-data-table .dataTables_wrapper) {
  padding-top: 0;
}

/* Override background applied in FlexDataTable. */
.mavedb-table-view:deep(.samplify-data-table .dataTables_wrapper) {
  background-color: #fff;
}

.mavedb-table-view:deep(.samplify-data-table thead th) {
  background-color: #dadff1;
}

.mavedb-table-view:deep(.samplify-data-table td),
.mavedb-table-view:deep(.samplify-data-table th) {
  padding: 0.75rem;
  border: 1px solid #fff;
  font-size: 14px;
}

.mavedb-table-view:deep(.samplify-data-table td:first-child) {
  padding-left: 2em;
}

.mavedb-table-view:deep(.samplify-data-table td:last-child) {
  font-style: italic;
}

.mavedb-table-view:deep(.samplify-data-table tr.samplify-data-table-group-row) {
  background-color: #eeeeee;
  font-weight: bold;
}

.mavedb-table-view:deep(.samplify-data-table tr.samplify-data-table-group-row td:first-child) {
  padding-left: 0.75rem;
}

.mavedb-table-view:deep(.samplify-data-table tr.samplify-data-table-group-row td:last-child) {
  font-style: normal;
}
</style>
