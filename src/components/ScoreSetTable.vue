<template>
  <div class="mavedb-table-view">
    <FlexDataTable
      :data="data"
      :options="tableOptions"
      :scrollX="scrollX"
      :scrollY="scrollY"
      :loading="loading"
      rowIdPath="urn"
    />
  </div>
</template>

<script>
import $ from "jquery";
import _ from "lodash";

import { textForTargetGeneCategory } from "@/lib/target-genes"
import useFormatters from "@/composition/formatters";
import FlexDataTable from "@/components/common/FlexDataTable";

export default {
  name: "PublicationIdentifierView",
  components: { FlexDataTable },

  setup: () => {
    return {
      ...useFormatters(),
      textForTargetGeneCategory: textForTargetGeneCategory
    };
  },

  props: {
    data: {
      type: Array,
      required: true,
    },
    language: {
      type: Object,
      required: true,
    },
    scrollX: {
      type: Boolean,
      required: false,
      default: false,
    },
    scrollY: {
      type: Boolean,
      required: false,
      default: false,
    },
    loading: {
      type: Boolean,
      required: false,
      default: false,
    }
  },

  data() {
    const self = this;
    return {
      tableOptions: {
        columns: [
          {
            data: "urn",
            title: "URN",
            width: "17.5%",
            render: function (data) {
              var urn = data;
              var urnDisplay = urn;
              const url = self.$router.resolve({
                path: `/score-sets/${urn}`,
              }).href;
              return '<a href="' + url + '">' + urnDisplay + "</a>"; // TODO Escape the text.
            },
          },
          { data: "shortDescription", title: "Description", width: "40%" },
          // TODO: Surface target genes besides the first one in the data table.
          {
            data: (x) => _.get(x, "targetGenes[0].name", "null name"),
            title: "Target",
          },
          {
            data: (x) => textForTargetGeneCategory(_.get(x, "targetGenes[0].category", undefined)) || "null category",
            title: "Target type",
          },
          {
            data: (x) =>
              _.get(
                x,
                "targetGenes[0].targetSequence.taxonomy.organismName",
                _.get(x, "targetGenes[0].targetAccession.assembly", null)
              ),
            title: "Target organism/assembly",
          },
          {
            data: (x) =>
              _.get(
                x,
                "targetGenes[0].targetAccession.accession",
                "Internal Sequence"
              ),
            title: "Target accession",
          },
        ],
        language: this.language,
        rowGroup: {
          dataSrc: "experiment.urn",
          startRender: function (rows, group) {
            const experimentUrn = group;
            const experimentUrnDisplay = experimentUrn;
            const experimentDescription = _.get(
              rows.data()[0],
              "experiment.shortDescription",
              null
            );
            const url = self.$router.resolve({
              path: `/experiments/${experimentUrn}`,
            }).href;

            const link =
              '<a href="' + url + '">' + experimentUrnDisplay + "</a>";

            return $("<tr/>")
              .append('<td colSpan="1">' + link + "</td>")
              .append('<td colSpan="5">' + experimentDescription + "</td>"); // increment if adding columns
          },
        },
        searching: false,
      },
    };
  },
};
</script>

<style scoped>
/* Table */

.mavedb-table-view {
  flex: 1 1 400px;
  position: relative;
}

/* Override control bar padding applied in FlexDataTable. */
.mavedb-table-view::v-deep .samplify-data-table .dataTables_wrapper {
  padding-top: 0;
}

/* Override background applied in FlexDataTable. */
.mavedb-table-view::v-deep .samplify-data-table .dataTables_wrapper {
  background-color: #fff;
}

.mavedb-table-view::v-deep .samplify-data-table thead th {
  background-color: #dadff1;
}

.mavedb-table-view::v-deep .samplify-data-table td,
.mavedb-table-view::v-deep .samplify-data-table th {
  padding: 0.75rem;
  border: 1px solid #fff;
  font-size: 14px;
}

.mavedb-table-view::v-deep .samplify-data-table td:first-child {
  padding-left: 2em;
}

.mavedb-table-view::v-deep .samplify-data-table td:last-child {
  font-style: italic;
}

.mavedb-table-view::v-deep
  .samplify-data-table
  tr.samplify-data-table-group-row {
  background-color: #eeeeee;
  font-weight: bold;
}

.mavedb-table-view::v-deep
  .samplify-data-table
  tr.samplify-data-table-group-row
  td:first-child {
  padding-left: 0.75rem;
}

.mavedb-table-view::v-deep
  .samplify-data-table
  tr.samplify-data-table-group-row
  td:last-child {
  font-style: normal;
}
</style>
