<template>

<div :class="{'samplify-data-table': true, 'lims-flex-data-table-scroll-x': scrollX}" :style="containerStyle" ref="dataTableElement">
  <div class="samplify-data-table-liner" ref="tableLiner"></div>
</div>

</template>

<script>

import $ from 'jquery'
import _ from 'lodash'
import 'datatables.net'
import 'datatables.net-dt'
import 'datatables.net-dt/css/jquery.dataTables.css'
import 'datatables.net-buttons'
import 'datatables.net-buttons-dt'
import 'datatables.net-colreorder-dt'
import 'datatables.net-buttons/js/buttons.html5'
import 'datatables.net-buttons-dt/css/buttons.dataTables.css'
import 'datatables.net-buttons/js/buttons.colVis'
import 'datatables.net-buttons/js/buttons.print'
import 'datatables.net-fixedcolumns-dt'
import 'datatables.net-rowgroup-dt'
import 'datatables.net-scroller-dt'
import 'datatables.net-select-dt'
import jszip from 'jszip'
import 'pdfmake'

window.JSZip = jszip

export default {
  name: 'FlexDataTable',

  emits: [
    'did-click-checkbox',
    'did-click-row',
    'did-click-row-action',
    'did-deselect',
    'did-double-click-row',
    'did-select'
  ],

  props: {
    data: {
      type: Array,
      default: () => []
    },
    defaultColumnVisibility: {
      type: Object,
      default: () => ({})
    },
    scrollX: {
      type: Boolean,
      default: false
    },
    scrollY: {
      type: Boolean,
      default: false
    },
    options: {
      type: Object,
      default: () => ({})
    },
    rowClasses: {
      // Keys are data IDs.
      // Values can be either strings (class names) or arrays of strings.
      type: Object,
      default: () => ({})
    },
    rowIdPath: {
      type: String,
      required: true
    },
    rowIdToMakeVisible: {
      type: Number,
      default: null
    },
    selectedRowIds: {
      type: Array,
      default: () => []
    },
    showRowNumbers: {
      type: Boolean,
      default: false
    },
    sortable: {
      type: Boolean,
      default: true
    },
    status: {
      type: Object
    },
    virtualRows: {
      type: Boolean,
      default: true
    }
  },

  data: function() {
    return {
      //tableOptions: {},
      header: null,
      containerStyle: {},
      rangeSelectionStartRowId: null
    }
  },

  computed: {
    prependedColumns: function() {
      const prependedColumns = []
      if (this.showRowNumbers) {
        prependedColumns.unshift({
          data: () => '',
          title: '#',
          //render: () => '',
          orderable: false,
          visible: true
        })
      }
      return prependedColumns
    },

    columns: function() {
      const prependedColumns = _.cloneDeep(this.prependedColumns)
      const normalColumns = _.cloneDeep(_.get(this.options, 'columns') || [])
      const columns = [...prependedColumns, ...normalColumns]
      if (prependedColumns.length > 0) {
        for (const column of normalColumns) {
          if (column.orderData) {
            column.orderData = column.orderData.map(x => x + prependedColumns.length)
          }
        }
      }
      if (!this.sortable) {
        for (const column of columns) {
          column.orderable = false
        }
      }
      return columns
    },

    tableOptions: function() {
      const self = this
      let defaultOptions = {
        dom: '<"uk-hidden"T>Bfrt', // Was '<"uk-hidden"T>lBfrtp'

        ...(self.virtualRows ? {
          deferRender: true,
          scroller: true,
        } : {
          paging: false
        }),
        /*rowGroup: {
          className: 'samplify-data-table-group-row',
        },*/
        rowCallback: function(row, data) {
          self.applyClassesToRow(row, data)
        },
        // TODO Make row IDs unique by instance, or find a solution that doesn't assign DOM element IDs.
        // Row IDs are used as a way to find the row for a given data item.
        rowId: function(data) {
          return `row_${_.get(data, self.rowIdPath)}`
        },
        scrollCollapse: true,
        scrollX: self.scrollX,
        // The initial value of scrollY is overridden immediately by resizeTable if scrolling is enabled.
        scrollY: self.scrollY ? '200px' : null,
        buttons: [],
        language: {
          emptyTable: 'No data'
        }
        //ordering: self.sortable
      }

      let tableOptions = _.merge({}, defaultOptions, self.options)
      tableOptions.columns = self.columns
      if (tableOptions.rowGroup) {
        tableOptions.rowGroup.className = tableOptions.rowGroup.className || 'samplify-data-table-group-row'
      }
      const numPrependedColumns = self.prependedColumns.length
      // TODO Do this without modifying tableOptions
      if (numPrependedColumns > 0 && tableOptions.order) {
        for (const orderTerm of tableOptions.order) {
          orderTerm[0] += numPrependedColumns
        }
      }
      if (numPrependedColumns > 0 && tableOptions.orderFixed) {
        for (const orderTerm of tableOptions.orderFixed) {
          orderTerm[0] += numPrependedColumns
        }
      }
      return tableOptions
    }
  },

  mounted: function() {
    this.render()
  },

  created: function() {
    this.initializeComplexColumns()
  },

  beforeUnmount: function() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    if (this.dataTable) {
      //this.dataTable.off()
      // For some reason we can't use this.dataTable.off()
      //$(this.$refs.table).off() // abcd
      $('div.dataTables_filter input', this.$refs.dataTableElement).off()
      this.dataTable.destroy()
    }
  },

  watch: {
    data: {
      handler: function () {
        this.loadData()
        this.updateSelection()
        this.refreshButtonTitles()
        this.resizeTable() // Kluge, because the header height may not have been calculated correctly the first time
      },
      deep: true,
      immediate: true
    },
    defaultColumnVisibility: {
      deep: true,
      handler: function() {
        this.applyDefaultColumnVisibility()
      },
      immediate: true
    },
    rowClasses: {
      deep: true,
      handler: function() {
        this.applyClassesToAllRows()
      },
      immediate: false
    },
    selectedRowIds: {
      deep: true,
      handler: function() {
        this.updateSelection()
      },
      immediate: true
    },
    rowIdToMakeVisible: {
      handler: function(value) {
        if (value != null) {
          this.makeRowVisibleByDataId(value)
        }
      }
    },
    sortable: {
      handler: function() {
        //this.refreshSortability()
      }
    },
    tableOptions: {
      handler: function() {
        this.rerender()
      }
    }
  },

  methods: {
    initializeComplexColumns: function() {
      let row1 = []
      let row2 = []

      let prevGroup = null
      let colNum = 1
      for (let col of this.columns) {
        if (_.isNil(col.groupTitle)) {
          let cell = {colspan: 1, rowspan: 2, key: '1-' + colNum + '-' + col.name}
          if (col.titleHtml) {
            cell.html = col.titleHtml
          } else if (col.title) {
            cell.text = col.title
          }
          row1.push(cell)
        } else if (col.groupTitle == prevGroup) {
          row1[row1.length - 1].colspan++
          row2.push({html: col.titleHtml, text: col.title, key: '2-' + colNum + '-' + col.name})
        } else {
          row1.push({text: col.groupTitle, colspan: 1, rowspan: 1, key: '1-' + colNum + '-' + col.name})
          row2.push({html: col.titleHtml, text: col.title, key: '2-' + colNum + '-' + col.name})
          prevGroup = col.groupTitle
        }
        colNum++
      }
      if (row2.length == 0) {
        row1.forEach(cell => { cell.rowspan = 1 })
        row2 = null
      }
      this.header = {row1, row2} //(row2.length > 0) ? {row1, row2} : null
    },

    applyDefaultColumnVisibility: function() {
      if (this.dataTable && this.defaultColumnVisibility) {
        let visibleColumns = _.map(_.keys(_.pickBy(this.defaultColumnVisibility, _.identity)), c => c + ':name')
        let hiddenColumns = _.map(_.keys(_.pickBy(this.defaultColumnVisibility, v => !v)), c => c + ':name')
        this.dataTable.columns(visibleColumns).visible(true)
        this.dataTable.columns(hiddenColumns).visible(false)
        //_.forIn(this.defaultColumnVisibility, (visible, columnName) => this.dataTable.column(columnName + ':name').visible(visible))
      }
    },

    applyClassesToRow: function(rowElement, data) {
      const id = _.get(data, this.rowIdPath)
      if (id != null) {
        const rowClasses = this.rowClasses[id]
        if (rowClasses != null) {
          $(rowElement).addClass(rowClasses)
        } else {
          // TODO Kluge. We don't want to remove all classes, but we need to know what extra classes may have been applied before.
          $(rowElement).removeClass('sfs-invalid')
        }
      }
    },

    applyClassesToAllRows: function() {
      let self = this
      if (self.dataTable) {
        self.dataTable.rows().every(function() {
          self.applyClassesToRow(this.node(), this.data())
        })
      }
    },

    loadData: function() {
      if (this.dataTable) {
        if (!_.isNil(this.data)) {
          this.dataTable.clear().rows.add(this.data).draw()
        }
        this.dataTable.columns.adjust()
      }
    },

    /*refreshSortability: function() {
      for (let col of this.options.columns) {
        if (col.orderable !== false) {
          let $th = $(this.dataTable.column(`${col.name}:name`).header())
          if (this.sortable) {
            $th.addClass('sorting').removeClass('sorting_disabled')
          } else {
            $th.addClass('sorting_disabled').removeClass('sorting')
          }
        }
      }
    },*/

    rowIsFullyVisible: function(row) {
      let $scrollContainer = $(this.$el).find('.dataTables_scrollBody')
      let $row = $(row.node())

      return ($row.length > 0) && ($row.offset().top >= $scrollContainer.offset().top) && ($row.offset().top + $row.height() <= $scrollContainer.offset().top + $scrollContainer.height())
    },

    makeRowVisibleByDataId: function(dataId) {
      if (this.dataTable && (dataId != null)) {
        let row = this.dataTable.row(`#row_${dataId}`)
        this.makeRowVisible(row)
      }
    },

    makeRowVisible: function(row) {
      if (!this.rowIsFullyVisible(row)) {
        if (this.virtualRows) {
          // The scroller plugin is in use, so we can use it to scroll to the row. It will render the row and its neighbors if necessary.
          row.scrollTo()
        } else {
          // The scroller plugin is not in use, so we can assume that the row is already rendered, but we need to scroll to it manually.
          let $scrollContainer = $(this.$el).find('.dataTables_scrollBody')
          let $row = $(row.node())

          // Place the row in the middle of the visible area.
          let targetOffsetFromTop = ($scrollContainer.height() - $row.height()) / 2.0

          $scrollContainer.animate({
            scrollTop: $scrollContainer.scrollTop() + $row.offset().top - $scrollContainer.offset().top - targetOffsetFromTop
          })
        }
      }
    },

    refreshButtonTitles: function() {
      if (this.dataTable) {
        for (let buttonConfig of this.options.buttons || []) {
          if (_.isFunction(buttonConfig.text)) {
            let buttonName = _.isObject(buttonConfig) ? buttonConfig.name : buttonConfig
            let button = this.dataTable.button(buttonName + ':name')
            button.text(buttonConfig.text(self.dataTable, button.node(), buttonConfig))
          }
        }
      }
    },

    refreshButtonTitle: function(buttonApi, dataTableApi, buttonNode, buttonConfig) {
      if (_.isFunction(buttonConfig.text)) {
        buttonApi.text(buttonConfig.text(dataTableApi, buttonNode, buttonConfig))
      }
    },

    renderTableTemplate: function() {
      if (this.header) {
        const $thead = $('<thead />')
        const $tr1 = $('<tr />').appendTo($thead)
        for (const cell of this.header.row1) {
          const $th = $('<th />').attr({
            colspan: cell.colspan,
            rowspan: cell.rowspan
          })
          if (cell.html) {
            $th.html(cell.html)
          } else if (cell.text) {
            $th.text(cell.text)
          }
          $th.appendTo($tr1)
        }
        if (this.header.row2) {
          const $tr2 = $('<tr />').appendTo($thead)
          for (const cell of this.header.row2) {
            const $th = $('<th />')
            if (cell.html) {
              $th.html(cell.html)
            } else if (cell.text) {
              $th.text(cell.text)
            }
            $th.appendTo($tr2)
          }
        }
        $thead.appendTo($(this.prerenderedTableElement()))
      }
    },

    rerender: function() {
      if (this.dataTable) {
        //this.dataTable.off()
        // For some reason we can't use this.dataTable.off()
        // $(this.$refs.table).off() // abcd
        $('div.dataTables_filter input', this.$refs.dataTableElement).off()
        this.dataTable.clear().destroy()
        this.dataTable = null
        $(this.$refs.tableLiner).empty()
      }
      this.initializeComplexColumns()
      this.render()
    },

    prerenderedTableElement: function() {
      const $tableLiner = $(this.$refs.tableLiner)
      let $table = $tableLiner.children('table').first()
      if ($table.length == 0) {
        $table = $('<table class="cell-border compact hover stripe" ref="table" v-once></table>').appendTo($tableLiner)
      }
      return $table[0]
    },

    render: function() {
      let self = this

      self.renderTableTemplate()

      self.containerStyle = self.scrollY ? {
        position: 'absolute',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      } : {}

      self.dataTable = $(self.prerenderedTableElement()).DataTable(self.tableOptions)
      self.applyDefaultColumnVisibility()

      if (self.showRowNumbers) {
        self.dataTable.on('draw.dt', function() {
          self.dataTable.column(0, {search:'applied', order:'applied'}).nodes().each((cell, i) => {
            cell.innerHTML = i + 1
          })
        })
      }

      $(this.$refs.tableLiner).find('*').css('box-sizing','content-box').css('-moz-box-sizing','content-box')
      self.dataTable.columns.adjust()

      const doubleClickTolerance = 200 // milliseconds
      let doubleClickTimeoutId = null
      let clickedElement = null
      self.dataTable.on('click', 'tbody tr', function(event) {
        let doubleClick = false
        let element = this
        if (doubleClickTimeoutId) {
          window.clearTimeout(doubleClickTimeoutId)
          if ($(element).is(clickedElement)) {
            clickedElement = null
            doubleClick = true
            $(element).trigger('FlexDataTable:row-double-click', event)
          }
        }
        if (!doubleClick) {
          clickedElement = element
          doubleClickTimeoutId = window.setTimeout(() => {
            $(element).trigger('FlexDataTable:row-single-click', event)
          }, doubleClickTolerance)
        }
      })

      // Debounce searches.
      $('div.dataTables_filter input', self.$refs.dataTableElement).off('keyup.DT input.DT')
      var searchDelay = null
      $('div.dataTables_filter input', self.$refs.dataTableElement).on('keyup', function() {
        var search = $('div.dataTables_filter input', self.$refs.dataTableElement).val()
        clearTimeout(searchDelay)
        searchDelay = setTimeout(function() {
          if (search != null) {
            self.dataTable.search(search).draw()
          }
        }, 400)
      })

      self.dataTable.on('FlexDataTable:row-single-click', 'tbody tr', function(event, clickEvent) {
        const row = self.dataTable.row(this)
        let rangeSelectionRowIds = []
        if (self.rangeSelectionStartRowId != null) {
          let rowIndicesByRenderPosition = self.dataTable.rows().eq(0).toArray()
          const rangeSelectionStartRowIndex = self.dataTable.row('#' + self.rangeSelectionStartRowId).index()
          const rangeSelectionStartRowRenderPosition = rowIndicesByRenderPosition.indexOf(rangeSelectionStartRowIndex)
          const rowIndex = row.index()
          const rowRenderPosition = rowIndicesByRenderPosition.indexOf(rowIndex)
          if ((rowRenderPosition >= 0) && (rangeSelectionStartRowRenderPosition >= 0) && self.rowIdPath) {
            let renderPositionsToAdd = []
            if (rowRenderPosition != rangeSelectionStartRowRenderPosition) {
              renderPositionsToAdd = _.range(rowRenderPosition, rangeSelectionStartRowRenderPosition, (rowRenderPosition > rangeSelectionStartRowRenderPosition) ? -1 : 1)
            }
            let rowIndicesToAdd = renderPositionsToAdd.map(pos => rowIndicesByRenderPosition[pos])
            rangeSelectionRowIds = self.dataTable
                .rows(rowIndicesToAdd)
                .data()
                .toArray()
                .map(rowData => _.get(rowData, self.rowIdPath))
                .filter(Boolean)
          }
        }
        self.$emit('did-click-row', {row, data: row.data(), rangeSelectionRowIds, mouseEvent: clickEvent.originalEvent, shiftKey: _.get(event, 'originalEvent.shiftKey', false)})
      })

      self.dataTable.on('FlexDataTable:row-double-click', 'tbody tr', function() {
        let row = self.dataTable.row(this)
        self.$emit('did-double-click-row', {row, data: row.data(), mouseEvent: event.originalEvent, shiftKey: _.get(event, 'originalEvent.shiftKey', false)})
      })

      self.dataTable.on('click', 'input[type="checkbox"]', function() {
        let checkbox = this
        let row = self.dataTable.row(checkbox.closest('tr'))
        self.$emit('did-click-checkbox', {checkbox, row, data: row.data(), mouseEvent: event.originalEvent, shiftKey: _.get(event, 'originalEvent.shiftKey', false)})
      })

      /*
      // TODO Restore this, with some way of discerning that the click was on a "row action" link.
      self.dataTable.on('click', 'a', function(event) {
        let row = self.dataTable.row($(this).parents('tr'))
        self.$emit('did-click-row-action', {dataTable: self, row, data: row.data(), element: this, mouseEvent: event.originalEvent, shiftKey: _.get(event, 'originalEvent.shiftKey', false)})
        event.preventDefault()
        return false
      })
      */

      /*
      $(self.$refs.dataTableElement).on('click', 'th', function(event) {
        if (!self.sortable) {
          event.preventDefault()
        }
      })*/

      self.dataTable.on('select', function(event, dataTablesApi, selectionType, selectionIndices) {
        self.$emit('did-select', {sourceElement: this, dataTable: self, event, dataTablesApi, selectionType, selectionIndices})
      })

      self.dataTable.on('deselect', function(event, dataTablesApi, selectionType, selectionIndices) {
        self.$emit('did-deselect', {sourceElement: this, dataTable: self, event, dataTablesApi, selectionType, selectionIndices})
      })

      self.dataTable.on('buttons-action', function(event, buttonApi, dataTableApi, buttonNode, buttonConfig) {
        self.refreshButtonTitle(buttonApi, dataTableApi, buttonNode, buttonConfig)
      })

      self.resizeTable()

      self.loadData()
      self.updateSelection()

      if (!self.resizeObserver) {
        self.resizeObserver = new ResizeObserver(() => {
          self.resizeTable()
        })
        self.resizeObserver.observe(self.$el)
      }
    },

    resizeTable: function() {
      if (this.dataTable) {
        this.dataTable.columns.adjust()
      }
      if (this.dataTable && this.scrollY) {
        let componentHeight = $(this.$el).height()
        /*
        console.log('filter: ' + $(self.$el).find('.dataTables_filter').outerHeight(true))
        console.log('buttons: ' + $(this.$el).find('.dt-buttons').outerHeight(true))
        console.log('scroll head: ' + $(this.$el).find('.dataTables_scrollHead').outerHeight(true))
        console.log('info: ' + $(this.$el).find('.dataTables_info').outerHeight(true))
        */
        let scrollHeight = Math.max(100, componentHeight
            - Math.max(($(self.$el).find('.dataTables_filter').outerHeight(true) || 0), ($(this.$el).find('.dt-buttons').outerHeight(true) || 0))
            //- ($(self.$el).find('.dataTables_filter').outerHeight(true) || 0)
            - ($(this.$el).find('.dataTables_scrollHead').outerHeight(true) || 0)
            - ($(this.$el).find('.dataTables_info').outerHeight(true) || 0))
            - 4  // .samplify-data-table.dataTable_wrapper: padding-top
        $(this.$el).find('div.dataTables_scrollBody').height(scrollHeight).css({maxHeight: scrollHeight})
      }
    },

    updateSelection: function() {
      if (this.dataTable) {
        let oldSelectedRowIndices = this.dataTable.rows({selected: true}).indexes().toArray()
        let newSelectedRowIndices = this.dataTable.rows(_.map(this.selectedRowIds, id => `#row_${id}`)).indexes().toArray()
        let deselectedRowIndices = _.difference(oldSelectedRowIndices, newSelectedRowIndices)
        let newlySelectedRowIndices = _.difference(newSelectedRowIndices, oldSelectedRowIndices)
        if (newlySelectedRowIndices.length == 1) {
          // TODO This isn't quite right in every case: if the user has shift-selected just one more row, we should not change the range selection start point.
          let rangeSelectionStartRow = this.dataTable.row(newlySelectedRowIndices[0])
          this.rangeSelectionStartRowId = rangeSelectionStartRow ? rangeSelectionStartRow.id() : null
        }
        if (deselectedRowIndices.length > 0) {
          this.dataTable.rows(deselectedRowIndices).deselect()
        }
        if (newlySelectedRowIndices.length > 0) {
          this.dataTable.rows(newlySelectedRowIndices).select()

          let rowIndexToMakeVisible = newlySelectedRowIndices[0]
          this.makeRowVisible(this.dataTable.row(rowIndexToMakeVisible))
        }
      }
    },

    relativeRowRecordIds: function(recordId, startOffset, count = 1, step = 1) {
      if (this.dataTable) {
        const rowIndicesByRenderPosition = this.dataTable.rows().eq(0).toArray()
        const currentRow = this.dataTable.row(`#row_${recordId}`)
        const currentRowRenderPosition = rowIndicesByRenderPosition.indexOf(currentRow.index())
        if (step == 0) {
          step = 1
        }
        const startRenderPosition = currentRowRenderPosition + startOffset
        const renderPositionsToFind = _.range(startRenderPosition, startRenderPosition + (step * count), step)
        const rowIndicesToFind = renderPositionsToFind.map(pos => rowIndicesByRenderPosition[pos]).filter(index => index != null)
        return this.dataTable
            .rows(rowIndicesToFind)
            .data()
            .toArray()
            .map(rowData => _.get(rowData, this.rowIdPath))
            .filter(Boolean)
      }
      return []
    }
  }
}

</script>

<style>

/* Data table */

.samplify-data-table .dataTables_scrollHeadInner {
  min-width: 100% !important;
}

.samplify-data-table .dataTables_scrollHeadInner table {
  min-width: 100% !important;
}

.samplify-data-table .dataTable {
  min-width: 100% !important;
}

/* If the table has horizontal scrolling enabled, add space below the last row to allow for a scrollbar on Windows. */
.samplify-data-table.lims-flex-data-table-scroll-x .dataTables_wrapper.no-footer .dataTables_scrollBody > table {
  border-bottom: 40px solid white;
}

/* Table */

.samplify-data-table table {
  border-collapse: collapse;
}

.samplify-data-table .dataTables_wrapper {
  padding-top: 4px;
  background: #eee;
}

/* Rows */

.samplify-data-table tr {
  outline-color: #bfd1f6;
  color: #131313;
  background: #fff;
}

.samplify-data-table tr.samplify-data-table-group-row {
  background-color: #e0e0e0;
  font-weight: bold;
}

.samplify-data-table table.dataTable.stripe tbody tr.odd,
.samplify-data-table table.dataTable.display tbody tr.odd {
  background: #fff;
}

.samplify-data-table table.dataTable.stripe tbody tr.even,
.samplify-data-table table.dataTable.display tbody tr.even {
  background: #f1f8ff;
}

.samplify-data-table table.dataTable.stripe tbody tr:hover,
.samplify-data-table table.dataTable.display tbody tr:hover {
  background: #abd6ff;
}

.samplify-data-table table.dataTable.stripe tbody tr.selected,
.samplify-data-table table.dataTable.display tbody tr.selected {
  background: #b0bed9;
}

/* Cells */

.samplify-data-table td {
  border: 1px solid #ccc;
}

/* Table header & controls */

.samplify-data-table div.dt-button-collection {
  width: 600px;
  padding-bottom: 1px;
  -webkit-column-count: 4;
  -moz-column-count: 4;
  -ms-column-count: 4;
  -o-column-count: 4;
  column-count: 4;
}

.samplify-data-table .dt-buttons {
  float: left;
  margin-left: 1em;
  vertical-align: middle;
}

.samplify-data-table .dataTables_wrapper .dataTables_filter {
  float: left;
  margin: 0 1em;
  vertical-align: middle;
}

.samplify-data-table .dataTables_wrapper .dataTables_filter input {
  background: #fff;
}

.samplify-data-table .dataTables_scrollBody .dts_label {
  display: none;
}

</style>
