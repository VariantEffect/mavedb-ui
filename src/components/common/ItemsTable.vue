<template>

<div :class="{'sfs-items-table': true, 'sfs-nowrap': nowrap}">
  <FlexDataTable
      v-if="columns.length > 0"
      ref="dataTable"
      rowIdPath="_id"
      :data="items"
      :options="assembledTableOptions"
      :rowClasses="rowClasses"
      :sortable="sortable"
      :scrollX="true"
      :scrollY="true"
      :selectedRowIds="selectedItemIds"
      :showRowNumbers="showRowNumbers"
      @did-click-row="onDidClickRow"
      @did-double-click-row="onDidDoubleClickRow"
  />
</div>

</template>

<script>

import 'datatables.net-dt'
import _ from 'lodash'
import $ from 'jquery'
import {JSONPath as jsonPath} from 'jsonpath-plus'
import pluralize from 'pluralize'
import {v4 as uuidv4} from 'uuid'
//import modules from '@/modules'
import FlexDataTable from '@/components/common/FlexDataTable'
import useItems from '@/composition/items'
// import {tableViewsForEntityType} from '@/lib/modules'

const isMac = () => navigator.userAgent.indexOf('Mac OS X') != -1

function tableViewsForEntityType(entityType) {
  return entityType.views.table
}

const modules = {}

export default {
  name: 'ItemsTable',

  components: {FlexDataTable},

  setup: (props) => {
    const fixedFilterQuery = (entityType) => {
      if (!entityType) {
        return null
      }
      const tableView = _.get(tableViewsForEntityType(entityType), props.viewName, null)
      return _.get(tableView, 'fixedFilterQuery', null)
    }
    const filterQuery = fixedFilterQuery

    const referencePathsToExpand = (entityType) => {
      if (!entityType) {
        console.log('here')
        return null
      }
      console.log(props.viewName)
      const tableView = _.get(tableViewsForEntityType(entityType), props.viewName, null)
      return _.get(tableView, 'referencePathsToExpand', [])
    }

    const {
      items,
      invalidItems,
      selectedItems,
      stateNamespace: itemsStateNamespace,
      resetItems,
      addItem,
      deselectItems,
      ensureItemsloaded,
      selectItems
    } = useItems({
      entityType: props.entityType,
      stateNamespace: props.stateNamespace,
      options: {
        restCollectionUrl: props.restCollectionUrl,
        filter: {query: filterQuery},
        referencePathsToExpand
      }
    })
    return {
      items,
      invalidItems,
      selectedItems,
      itemsStateNamespace,
      resetItems,
      addItem,
      deselectItems,
      ensureItemsloaded,
      selectItems
    }
  },

  props: {
    isDraftBatch: {
      type: Boolean,
      default: false
    },
    showRowNumbers: {
      type: Boolean,
      default: false
    },
    stateNamespace: {
      type: String,
      default: ''
    },
    entityType: {
      type: Object,
    },
    noun: {
      type: String,
      default: 'item'
    },
    nowrap: {
      type: Boolean,
      default: true
    },
    sortable: {
      type: Boolean,
      default: true
    },
    tableOptions: {
      type: Object,
      default: () => ({})
    },
    autoAdvance: {
      type: Boolean,
      default: false
    },
    allowMultipleSelection: {
      type: Boolean,
      default: true
    },
    restCollectionUrl: {
      type: String,
      required: false,
      default: null
    },
    viewName: {
      type: String,
      required: true,
      default: 'default'
    }
  },

  computed: {
    columns: function() {
      return ((this.view ? this.view.columns : null) || []).map(column => this.prepareColumn(column))
    },
    defaultSortOrder: function() {
      return (_.get(this, 'view.sorting.default') || []).map(sortItem => [sortItem.columnIndex, sortItem.order])
    },
    view: function() {
      const viewName = this.viewName || 'default'
      return this.entityType ? _.get(tableViewsForEntityType(this.entityType), viewName, null) : null
    },
    assembledTableOptions: function() {
      let self = this
      return _.mergeWith(
        {},
        self.defaultTableOptions,
        {order: self.defaultSortOrder},
        self.tableOptions,
        {
          columns: self.columns.map(col => {
            let colClone = _.clone(col)
            if (colClone.titleHtml != null) {
              colClone.title = undefined
            }
            return colClone
          })
        },
        (value, srcValue) => {
          if (_.isArray(value) && (srcValue !== undefined)) {
            return srcValue
          }
          return undefined
        }
      )
    },
    rowClasses: function() {
      return _.mapValues(
        _.keyBy(this.invalidItems, '_id'),
        () => 'sfs-invalid'
      )
    },
    selectedItemIds: function() {
      return this.selectedItems.map(x => x._id)
    }
  },

  watch: {
    entityType: {
      handler: function(newValue, oldValue) {
        console.log(newValue)
        if (newValue != oldValue) {
          this.resetItems({entityType: this.entityType, stateNamespace: this.stateNamespace})
        }
      },
      immediate: true
    },
    stateNamespace: {
      handler: function(newValue, oldValue) {
        console.log(newValue)
        if (newValue != oldValue) {
          this.resetItems({entityType: this.entityType, stateNamespace: this.stateNamespace})
        }
      }
    },
    items: {
      handler: function() {
        console.log(this.items)
      },
      immediate: true
    }
  },

  data: function() {
    let self = this
    return {
      defaultTableOptions: {
        buttons: [
          'copy',
          'csv',
          'excel',
          'print',
          {
            text: 'New ' + self.noun,
            action: () => self.addItem()
          }
        ],
        colReorder: false,
        select: {
          style: 'api'
        }
      },
      lastSelectedRowIndex: null
    }
  },

  created: function() {
    let self = this
    self.onDidPressKey = function() {
      let command = isMac() ? event.metaKey : event.ctrlKey
      if ((command) && (event.key == 'a')) {
        if (!$(event.target).is('input') && !$(event.target).is('textarea')) {
          self.selectAllIfAllowed()
          window.getSelection().removeAllRanges()
          event.preventDefault() // Prevent selecting all text
        }
      }
    }
    $(document).on('keydown', self.onDidPressKey);
  },

  beforeUnmount: function() {
    let self = this
    $(document).off('keydown', self.onDidPressKey);
  },

  methods: {

    findProperty(path) {
      const property = this.findPropertyInSchema(path.split('.'), this.entityType.schema)
      if (property == null) {
        console.log(`WARNING: In ItemsTable, unknown property (path="${path}")`)
      }
      return property
    },

    findPropertyInSchema(path, schema) {
      switch (schema.type) {
      case 'object':
        {
          const subschema = _.get(schema, ['properties', path[0]], null)
          if ((path.length == 1) || (subschema == null)) {
            return subschema
          } else {
            return this.findPropertyInSchema(_.slice(path, 1), subschema)
          }
        }
      default:
        // TODO Warn that we're trying to find a property in a non-object schema.
        return null
      }
    },

    prepareColumn: function(viewColumn) {
      const self = this
      // TODO Can we get the schema definition for a property specified by JSONPath instead of simple path?
      const schemaProperty = viewColumn.path ? this.findProperty(viewColumn.path) : null

      let render = viewColumn.render ? eval(viewColumn.render) : (this.formatterForProperty(viewColumn, schemaProperty) || undefined)

      let addLink = null
      if (viewColumn.link) {
        switch (viewColumn.link.type) {
          case 'item-detail':
            if (viewColumn.link.entityTypeName && viewColumn.link.idPath) {
              addLink = (cellContent, item) => {
                const itemId = _.get(item, viewColumn.link.idPath)
                if (cellContent && itemId) {
                  const url = self.$router.resolve({path: `/${pluralize(viewColumn.link.entityTypeName)}/${itemId}`}).href
                  if (url) {
                    // TODO Do we need to escape the URL?
                    return `<a href="${url}">${cellContent}</a>`
                  }
                }
                return cellContent
              }
            }
            break
          default:
            break
        }
      }
      if (addLink) {
        const innerRender = render || ((data) => data)
        render = (data, type, row, meta) => {
          if (type == 'display') {
            return addLink(innerRender(data, type, row, meta), row)
          }
          return innerRender(data, type, row, meta)
        }
      }
      return {
        name: viewColumn.name || `column-${uuidv4()}`,
        className: viewColumn.className,
        title: viewColumn.title || ((viewColumn.path != null) ? _.capitalize(_.lowerCase(_.last(viewColumn.path.split('.')))) : undefined),
        titleHtml: viewColumn.titleHtml,
        render: render,
        data: viewColumn.getData ?
            eval(viewColumn.getData) // TODO Move dynamic data getters to the front end so that we can eliminate evals (even in UI).
            : viewColumn.path ?
                ((row) => _.get(row, viewColumn.path, null))
                : viewColumn.paths ?
                    ((row) => {
                      const path = viewColumn.paths.find((p) => !_.isNil(_.get(row, p)))
                      return path ? _.get(row, path) : null
                    })
                    : viewColumn.jsonPath ?
                        ((row) => jsonPath(viewColumn.jsonPath, row))
                        : viewColumn.jsonPaths ?
                            ((row) => {
                              const path = viewColumn.jsonPaths.find((jp) => jsonPath(jp, row) != null)
                              return path ? jsonPath(path, row) : null
                            })
                            : undefined,
        orderData: viewColumn.orderData,
        visible: _.isObject(viewColumn.visible) ? (this.isDraftBatch ? !!viewColumn.visible.draft : !!viewColumn.visible.default) : viewColumn.visible
      }
    },

    formatterForProperty: function(viewColumn, schemaProperty) {
      let format = this.formatForProperty(viewColumn, schemaProperty)
      if (format) {
        return _.get(_.get(modules, format), 'format', null)
      }
      return null
    },

    formatForProperty: function(viewColumn, schemaProperty) {
      if (viewColumn.format) {
        return viewColumn.format
      }
      if (schemaProperty) {
        switch (schemaProperty.type) {
        case 'string':
          switch (schemaProperty.format) {
          case 'date':
            return 'default.formats.date'
          case 'date-time':
            return 'default.formats.dateTime'
          case 'time':
            return 'default.formats.time'
          default:
            break
          }
          break
        default:
          break
        }
      }
      return null
    },

    selectAllIfAllowed: function() {
      const self = this
      if (self.items.length < 101) {
        const itemIds = self.items.map(x => x._id)
        self.selectItems({itemIds})
      }
    },

    onDidClickRow: function(event) {
      let self = this
      const { rangeSelectionRowIds, data, mouseEvent: { shiftKey, ctrlKey, metaKey } = {} } = event
      let multiSelect = this.allowMultipleSelection && (isMac() ? metaKey : ctrlKey)
      let rangeSelect = this.allowMultipleSelection && shiftKey
      let itemId = _.get(data, this.entityType.primaryKey) // TODO What about PK functions?
      if (itemId != null) {
        if (rangeSelect && (rangeSelectionRowIds != null)) {
          self.selectItems({itemIds: rangeSelectionRowIds, addToSelection: true})
          window.getSelection().removeAllRanges()
        } else if ((multiSelect || (self.selectedItemIds.length == 1)) && self.selectedItemIds.includes(itemId)) {
          self.lastSelectedRowIndex = null
          self.deselectItems({itemIds: [itemId]})
        } else {
          self.lastSelectedRowIndex = null
          self.selectItems({itemIds: [itemId], addToSelection: multiSelect})
        }
      }
    },

    onDidDoubleClickRow: function(event) {
      let self = this
      const { rangeSelectionRowIds, data, mouseEvent: { shiftKey, ctrlKey, metaKey } = {} } = event
      let multiSelect = this.allowMultipleSelection && (isMac() ? metaKey : ctrlKey)
      let rangeSelect = this.allowMultipleSelection && shiftKey
      let itemId = _.get(data, "_id");
      if (itemId != null) {
        if (rangeSelect && (rangeSelectionRowIds != null)) {
          self.selectItems({itemIds: rangeSelectionRowIds, addToSelection: true, edit: true})
          window.getSelection().removeAllRanges()
        } else if ((multiSelect || (self.selectedItemIds.length == 1)) && self.selectedItemIds.includes(itemId)) {
          self.lastSelectedRowIndex = null
          self.deselectItems({itemIds: [itemId]})
        } else {
          self.lastSelectedRowIndex = null
          self.selectItems({itemIds: [itemId], addToSelection: multiSelect, edit: true})
        }
      }
    },

    relativeRowRecordIds: function(recordId, startOffset, count = 1, step = 1) {
      return this.$refs.dataTable?.relativeRowRecordIds(recordId, startOffset, count, step) || []
    }
  }
}

</script>

<style scoped>

.sfs-items-table {
  display: block;
  /*font-size: 12px;*/
}

/* Table */

.sfs-items-table >>> .dataTables_scrollBody table {
  margin-bottom: 10px;
}

/* Table controls */

.sfs-items-table >>> .dt-buttons,
.sfs-items-table >>> .dataTables_filter {
  font-size: 12px;
}

/* Cells */

.sfs-items-table >>> th {
  background: #e8e8e8;
  font-weight: 400;
  color: #131313;
  border-width: 1px;
  border-style: solid;
  border-color: #d0dfea #bcbcbc #d0dfea #e8e8e8;
  transition: background-color .2s,border-color .2s,box-shadow .2s;
  padding: 1px 1px;
  border-collapse: collapse;
  font-size: 12px;
}

.sfs-items-table.sfs-nowrap >>> th {
  max-width: 300px;
}

.sfs-items-table >>> table.dataTable tbody td {
  padding: 5px 4px;
}

.sfs-items-table >>> table.dataTable tbody td a {
  text-decoration: none;
}

.sfs-items-table >>> td,
.sfs-items-table >>> .align-left {
  text-align: left;
}

.sfs-items-table >>> .align-center {
  text-align: center;
}

.sfs-items-table >>> .align-right {
  text-align: right;
}

.sfs-items-table.sfs-nowrap >>> table.dataTable tbody td {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
.sfs-items-table >>> td.status-positive {
  background-color: #b3ffb3; /*#14b314;* /
}

.sfs-items-table >>> td.status-positive-control-passed {
  color: rgb(51, 51, 255);
}
*/

.sfs-items-table >>> .samplify-data-table table.dataTable.stripe tbody tr.sfs-invalid,
.sfs-items-table >>> .samplify-data-table table.dataTable.stripe tbody tr.sfs-invalid.odd,
.sfs-items-table >>> .samplify-data-table table.dataTable.display tbody tr.sfs-invalid.odd {
  background: #fdd;
}

.sfs-items-table >>> .samplify-data-table table.dataTable.stripe tbody tr.sfs-invalid.even,
.sfs-items-table >>> .samplify-data-table table.dataTable.display tbody tr.sfs-invalid.even {
  background: #fcc;
}

.sfs-items-table >>> .samplify-data-table table.dataTable.stripe tbody tr.sfs-invalid:hover,
.sfs-items-table >>> .samplify-data-table table.dataTable.display tbody tr.sfs-invalid:hover {
  background: #abd6ff;
}

.sfs-items-table >>> .samplify-data-table table.dataTable.stripe tbody tr.sfs-invalid.selected,
.sfs-items-table >>> .samplify-data-table table.dataTable.display tbody tr.sfs-invalid.selected {
  background: #faa;
}


</style>
