<template>
  <div v-if="entityType != null" class="sfs-table-and-property-sheet">
    <div class="sfs-page-header-and-table">
      <div class="sfs-page-header">
        <div class="sfs-page-header-info">
          <div class="sfs-title">{{title || titleCase(pluralize(entityType.commonTitle))}}</div>
          <div v-if="draftBatch != null" class="sfs-draft-info">
            Draft batch
            <span v-if="draftBatch.history.creation.timestamp != null">started {{ draftBatchCreatedAtFormatted }}</span>
          </div>
        </div>
        <div class="sfs-page-header-controls">
          <SelectButton v-if="availableEntityTypes != null" v-model="currentEntityTypeName" :options="availableEntityTypes" class="sfs-detail-editor-view-choice" :optionLabel="pluralizeEntityTypeCommonTitle" optionValue="name" />
          <FilterView v-if="entityType && filterProperties && !draftBatchId" v-model:filter="filter" :entityType="entityType" :filterProperties="filterProperties" :quickFilters="resolvedQuickFilters" />
          <SelectButton v-if="allowDetailEditorViewChoice && ((detailEditorViews || []).length > 1)" v-model="userChosenEditorViewName" :options="detailEditorViews" class="sfs-detail-editor-view-choice" optionLabel="title" optionValue="name" />
          <template v-if="draftBatchId != null">
            <Button class="p-button-warning p-button-sm" label="Discard Draft" @click="discardDraftBatch" />
            <Button class="p-button-secondary p-button-sm" label="Keep as Draft" @click="closeDraftBatch" />
            <Button class="p-button-primary p-button-sm" label="Save Batch" @click="commitDraftBatch" />
          </template>
          <Button v-if="canCreate && draftBatchId == null" class="p-button-primary" :label="`Add ${indefiniteArticle(titleCase(entityType.commonTitle))}`" v-tooltip.top="keyboardShortcutText('cmd', 'M')" @click="addItem()" />
          <Button v-if="canCreate && draftsEnabled && (draftBatchId == null)" class="p-button-primary" label="Start a Draft" @click="startDraftBatch" />
        </div>
      </div>
      <ItemsTable v-if="entityType != null" ref="itemsTable" class="sfs-table" :entityType="entityType" :sortable="draftBatchId == null" :stateNamespace="stateNamespace" :tableOptions="tableOptions" :viewName="editedState.tableViewName" />
    </div>
    <div v-if="canShowDetailViews && (detailComponent != null) && currentEntityTypeName && (detailItems.length == 1) && detailItems[0]._id" class="sfs-detail-view-pane" :style="detailViewStyle">
      <component :entityTypeName="currentEntityTypeName" :is="detailComponent" :itemId="detailItems[0]._id" />
    </div>
    <PropertySheet v-if="canShowDetailViews && (detailComponent == null) && entityType && (detailItems.length > 0)" class="sfs-property-sheet" :autoAdvance="autoAdvanceDetailEditor" :editing="editingDetailItems" :entityType="entityType" :draftBatchId="draftBatchId" :items="detailItems" :stateNamespace="stateNamespace" :viewNames="currentDetailEditorViewNames" />
  </div>
  <Dialog header="New Draft" v-model:visible="newDraftBatchSizeDialogVisible" :closable="false" closeOnEscape modal @hide="cancelNewDraftBatchSize">
    How many {{pluralize(entityType.commonTitle)}} would you like to add to this batch?
    <InputNumber v-model="newDraftBatchSize" mode="decimal" autofocus />
    (You can always add more.)
    <template #footer>
      <Button label="Leave Empty" icon="pi pi-times" class="p-button-text" @click="cancelNewDraftBatchSize" />
      <Button :label="`Add ${titleCase(pluralize(entityType.commonTitle))}`" icon="pi pi-check" @click="applyNewDraftBatchSize" />
    </template>
  </Dialog>
  <DraftBatchesManager ref="draftBatchesManager" />
</template>

<script>

import _ from 'lodash'
import $ from 'jquery'
import indefinite from 'indefinite'
import moment from 'moment'
import pluralize from 'pluralize'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import SelectButton from 'primevue/selectbutton'
import {ref} from 'vue'
import { mapState, mapActions } from 'vuex'
import DraftBatchesManager from '@/components/DraftBatchesManager'
import ItemsTable from '@/components/common/ItemsTable'
import PropertySheet from '@/components/common/PropertySheet'
// import {validateDraftBatchItem} from '@/services/entity-types'
import useDraftBatch from '@/composition/draft-batch'
import useEntityTypes from '@/composition/entity-types'
import useItems from '@/composition/items'
import useKeyboardShortcuts from '@/composition/keyboard-shortcuts'
// import {detailViewsForEntityType, tableViewsForEntityType} from '@/lib/modules'
import FilterView from '@/components/common/FilterView'
import {removeEmptyPropertiesAndElements} from '@/lib/objects'
import {encodeState} from '@/lib/persistent-state'

const isMac = () => navigator.userAgent.indexOf('Mac OS X') != -1

function validateDraftBatchItem() {
  return true
}

// TODO Add an option to allow inheriting parent entity types' views
// TODO Merge views from the API with views from client-side modules. Merge all modules together too.
function detailViewsForEntityType(entityType) {
  /*
  const views = mergeExceptArrays({}, entityType.views.detail || {})
  for (const moduleName in modules) {
    const module = modules[moduleName]
    mergeExceptArrays(views, _.get(module, ['entity-types', entityType.name, 'views', 'detail']) || {})
  }
  return views
  */
  return entityType?.views?.detail || {}
}

// TODO Add an option to allow inheriting parent entity types' views
// TODO Merge views from the API with views from client-side modules. Merge all modules together too.
function tableViewsForEntityType() {
  /*
  const views = mergeExceptArrays({}, entityType.views.table || {})
  for (const moduleName in modules) {
    const module = modules[moduleName]
    mergeExceptArrays(views, _.get(module, ['entity-types', entityType.name, 'views', 'table']) || {})
  }
  return views
  */
  return {}
}

export default {
  name: 'ItemsView',

  setup: (props) => {
    const currentEntityTypeName = ref(props.entityTypeName || (props.entityTypeNames ?  props.entityTypeNames[0] : null))
    const draftBatchModule = useDraftBatch()

    const filter = ref(null)

    const fixedFilterQuery = (entityType) => {
      if (!entityType) {
        return null
      }
      const tableView = _.get(tableViewsForEntityType(entityType), props.tableViewName || 'default', null)
      return _.get(tableView, 'fixedFilterQuery', null)
    }

    const referencePathsToExpand = (entityType) => {
      if (!entityType) {
        return null
      }
      const tableView = _.get(tableViewsForEntityType(entityType), props.tableViewName || 'default', null)
      return _.get(tableView, 'referencePathsToExpand', [])
    }

    const filterQuery = (entityType) => {
      if (!entityType) {
        return null
      }
      const fixedQuery = fixedFilterQuery(entityType)
      const userQuery = _.isFunction(filter.value) ? filter.value(entityType) : filter.value
      const queries = [fixedQuery, userQuery].filter((q) => q != null)
      if (queries.length == 0) {
        return null
      }
      if (queries.length == 1) {
        return queries[0]
      }
      return {and: queries}
    }

    const itemsStoreOptions = _.merge({
      /* detail: {
        allowMultiple: true,
        autoFromMultipleSelection: true,
        autoEdit: !!draftBatchModule.draftBatchId.value
      }, */
      loading: {
        firstPageSize: 500
      },
      filter: {query: filterQuery},
      referencePathsToExpand,
      /* order: [
        [{path: 'history.creation.timestamp'}, 'desc'],
        [{path: 'history.creation.orderInBatch'}, 'desc']
      ] */
      restCollectionUrl: props.restCollectionUrl,
    }, props.itemsStoreOptions)

    return {
      currentEntityTypeName,
      filter,
      filterQuery,
      ...draftBatchModule,
      ...useEntityTypes(),
      ...useItems({
        draftBatchId: draftBatchModule.draftBatchId,
        itemTypeName: currentEntityTypeName.value || (props.entityTypeNames ?  props.entityTypeNames[0] : null),
        // itemType: 
        options: itemsStoreOptions
        /* options: {
          restCollectionUrl: props.restCollectionUrl,
          filter: {query: filterQuery}
        } */
      }),
      ...useKeyboardShortcuts()
    }
  },

  components: {Button, Dialog, DraftBatchesManager, FilterView, InputNumber, PropertySheet, ItemsTable, SelectButton},

  props: {
    allowDrafts: {
      type: Boolean,
      default: true
    },
    allowAutoAdvancingDetailEditor: {
      type: Boolean,
      default: true
    },
    canCreate: {
      type: Boolean,
      default: true
    },
    canDelete: {
      type: Boolean,
      default: true
    },
    canShowDetailViews: {
      type: Boolean,
      default: true
    },
    canUpdate: {
      type: Boolean,
      default: true
    },
    defaultFilter: {
      type: Object,
      default: () => undefined
    },
    entityTypeName: {
      type: String,
      required: false,
      default: null
    },
    entityTypeNames: {
      type: Array,
      required: false,
      default: null
    },
    defaultDetailEditorViewNames: {
      type: Array,
      default: () => ['default-edit', 'default']
    },
    detailEditorViews: {
      type: Array, // Array of objects with name and title properties
      default: () => []
    },
    displayOnlyDetailViewNames: {
      type: Array,
      default: () => ['default-view', 'default']
    },
    state: {
      type: Object,
      default: () => ({})
    },
    quickFilters: {
      type: Array,
      default: () => null
    },
    restCollectionUrl: {
      type: String,
      required: false,
      default: null
    },
    tableViewName: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    }
  },

  data: function(props) {
    let self = this
    console.log(_.cloneDeep(props.state))
    return {
      draftBatchCreatedAtFormatted: null,
      headingRefreshTimer: null,
      newDraftBatchSize: 20,
      newDraftBatchSizeDialogVisible: false,
      editedState: _.cloneDeep(props.state),
      tableOptions: {
        buttons: [ // TODO Make configurable
          'copy',
          'csv',
          'excel',
          'print'
        ]
        //order: [[1, 'asc']] // TODO Configure in view
      },
      userChosenEditorViewName: function() {
        let viewName = null
        if (self.detailEditorViews.length > 0) {
          const defaultViewNames = self.editingDetailItems ? self.defaultDetailEditorViewNames : self.displayOnlyDetailViewNames
          viewName = _.first(_.intersection(defaultViewNames, self.detailEditorViews.map(viewOption => viewOption.name)))
          if (viewName == null) {
            viewName = self.detailEditorViews[0].name
          }
        }
        return viewName
      }
    }
  },

  computed: {
    tableView: function() {
      return this.entityType ? _.get(tableViewsForEntityType(this.entityType), this.editedState?.tableViewName || 'default', null) : null
    },
    filterProperties: function() {
      return this.tableView ? this.tableView.filterProperties : null
    },
    resolvedQuickFilters: function() {
      return this.quickFilters || (this.tableView ? this.tableView.quickFilters : null) || []
    },
    detailViews: function() {
      return !this.canShowDetailViews ? {} : this.entityType ? detailViewsForEntityType(this.entityType) : {}
    },
    detailView: function() {
      if (!this.canShowDetailViews) {
        return null
      }
      for (const viewName of this.currentDetailEditorViewNames) {
        if (_.has(this.detailViews, viewName)) {
          return this.detailViews[viewName]
        }
      }
      return null
    },
    detailViewStyle: function() {
      return this.detailView ?
          {
            ...this.detailView.preferredWidth ? {
              flex: `0 0.1 ${this.detailView.preferredWidth}px`
            } : null
          }
          : null
    },
    detailComponent: function() {
      return this.detailView ? this.detailView.component : null
    },
    availableEntityTypes: function() {
      if (this.entityTypeNames && (this.entityTypeNames.length > 1) && this.entityTypes) {
        return this.entityTypeNames.map((name) => this.getEntityType(name))
      }
      return null
    },
    allowDetailEditorViewChoice: function() {
      return this.canShowDetailViews && (this.detailEditorViews.length > 0) && (this.draftBatch != null)
    },
    autoAdvanceDetailEditor: function() {
      return this.allowAutoAdvancingDetailEditor // && (this.draftBatch != null)
    },
    currentDetailEditorViewNames: function() {
      return this.allowDetailEditorViewChoice ? [this.userChosenEditorViewName] : (this.editingDetailItems ? this.defaultDetailEditorViewNames : this.displayOnlyDetailViewNames)
    },
    draftsEnabled: function() {
      return this.allowDrafts && this.entityType && this.entityType.allowsDrafts
    },
    ...mapState('myDraftBatches', {
      draftBatches: (state) => state.items
    })
  },

  watch: {
    currentEntityTypeName: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          this.resetItems({entityTypeName: newValue})
        }
      }
    },
    draftBatch: {
      handler: function() {
        this.refreshHeading()
      },
      immediate: true
    },
    entityType: {
      handler: function() {
        console.log(this.entityType)
        if (this.ensureItemsStore()) {
          this.registerTableAsListNavigator()
          this.performInitialLoad()
        }
      },
      immediate: true
    },
    filter: {
      immediate: true,
      handler: function() {
        const filterQuery = this.filterQuery(this.entityType)
        this.setQuery(filterQuery)
      }
    },
    state: {
      handler: function() {
        if (!_.isEqual(this.state, this.editedState)) {
          this.editedState = this.state
          console.log(this.editedState)
        }
      },
      immediate: true,
    },
    editedState: {
      handler: function() {
        if (!_.isEqual(this.state, this.editedState)) {
          console.log('setting state ', this.editedState)
          const query = removeEmptyPropertiesAndElements({
            ...this.$route.query,
            s: encodeState(this.editedState)
          })
          // this.$router.replace({query: {s: JSON.stringify(this.editedState)}})
          this.$router.replace({query})
        }
      },
      deep: true
    },
    stateNamespace: {
      handler: function() {
        if (this.ensureItemsStore()) {
          this.registerTableAsListNavigator()
          this.performInitialLoad()
        }
      },
      immediate: true
    },
    tableView: {
      handler: function(newValue, oldValue) {
        if (newValue != oldValue) {
          const buttons = [
            'copy',
            'csv',
            'excel',
            'print'
          ]
          if (!newValue) {
            this.filter = null
          } else {
            if (newValue.columnGroups) {
              buttons.push(...[
                ...(newValue?.columnGroups || []).map((columnGroup) => ({
                  extend: 'columnToggle',
                  text: columnGroup.title || 'Columns',
                  columns: (columnGroup.columns || [])
                      .filter((column) => column.name)
                      .map((column) => `${column.name}:name`)
                }))
              ])
            }
            this.filter = this.draftBatchId ? null : this.defaultFilter === undefined ? newValue.defaultFilterQuery : this.defaultFilter
          }
          this.tableOptions = _.assign({}, this.tableOptions, {buttons})
        }
      },
      immediate: true
    },
    tableViewName: {
      handler: function() {
        this.updateState()
      },
      immediate: true
    },
    itemsStoreReady: {
      handler: function(newValue, oldValue) {
        if (newValue && !oldValue) {
          this.registerTableAsListNavigator()
          this.performInitialLoad()
        }
      }
    }
  },

  created: function() {
    const self = this
    self.headingRefreshTimer = setInterval(this.refreshHeading, 60000)
    self.onDidPressKey = function() {
      let command = isMac() ? event.metaKey : event.ctrlKey
      switch (event.key) {
      case 'm':
        if (command) {
          event.preventDefault()
          event.stopPropagation()
          self.addItem()
        }
        break
      default:
        break
      }
    }
    $(document).on('keydown', self.onDidPressKey)
    this.performInitialLoad()
  },

  beforeUnmount: function() {
    $(document).off('keydown', this.onDidPressKey)
    clearInterval(this.headingRefreshTimer)

    // TODO Does this actually get called before stateNamespace has changed?
    //this.deregisterListNavigator({name: 'Items', listNavigator: this.$refs.itemsTable})
  },

  methods: {
    updateState: function() {
      this.editedState = {
        tableViewName: this.state.tableViewName || this.tableViewName
      }
    },

    registerTableAsListNavigator: function() {
      if (this.$refs.itemsTable) {
        this.registerListNavigator({name: 'Items', listNavigator: this.$refs.itemsTable})
      }
    },

    refreshHeading: function() {
      const self = this
      if (self.draftBatch && _.get(self.draftBatch, 'history.creation.timestamp')) {
        self.draftBatchCreatedAtFormatted = self.formatRelativeDateTime(self.draftBatch.history.creation.timestamp)
      } else {
        self.draftBatchCreatedAtFormatted = null
      }
    },

    applyNewDraftBatchSize: function() {
      this.newDraftBatchSizeDialogVisible = false
      if (this.newDraftBatchSize > 0) {
        this.createDraftBatchItems(this.newDraftBatchSize)
      }
    },

    cancelNewDraftBatchSize: function() {
      this.newDraftBatchSizeDialogVisible = false
    },

    performInitialLoad: async function() {
      let self = this
      let promises = [self.loadItems()]
      promises.push(self.ensureEntityTypesLoaded())
      if (this.draftBatchId) {
        promises.push(self.ensureDraftBatchesLoaded())
      }
      await Promise.all(promises)
      if (self.draftBatchId && (self.items.length == 0)) {
        self.newDraftBatchSizeDialogVisible = true
      }
    },

    closeDraftBatch: function() {
      if (this.entityType && (this.draftBatchId != null)) {
        this.$router.push({ path: `/${pluralize(this.entityType.name)}` })
      }
    },

    commitDraftBatch: async function() {
      if (this.entityType && this.draftBatchId) {
        if (this.validateDraftBatch()) {
          await this.$refs.draftBatchesManager.commitDraftBatch(this.draftBatchId)
          this.$router.replace({path: `/${pluralize(this.entityType.name)}`})
        } else {
          this.setBatchSaveAttempted(true)
        }
      }
    },

    validateDraftBatch: function() {
      let invalidItemIds = []
      for (let item of this.items) {
        if (!validateDraftBatchItem(this.entityType, item, this.items)) {
          invalidItemIds.push(item._id)
        }
      }
      this.setInvalidItemIds(invalidItemIds)
      return invalidItemIds.length == 0
    },

    createDraftBatchItems: async function(numItems) {
      let newItemIds = []
      for (let i = 0; i < numItems; i++) {
        const itemId = (await this.saveItem({item: {}}))._id
        newItemIds.push(itemId)
      }
      this.selectItems({itemIds: newItemIds})
    },

    discardDraftBatch: async function() {
      if (this.draftBatchId != null) {
        await this.$refs.draftBatchesManager.deleteDraftBatch(this.draftBatchId)
        this.$router.replace({path: `/${pluralize(this.entityType.name)}`})
      }
    },

    startDraftBatch: async function() {
      let draftBatchId = await this.$refs.draftBatchesManager.createDraftBatch({draftType: this.entityType.name})
      if (this.entityType && draftBatchId) {
        this.$router.push({path: `/draft-batches/${draftBatchId}/${pluralize(this.entityType.name)}`})
      }
    },

    formatRelativeDateTime: function(dateTime) {
      return moment(dateTime).fromNow()
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // String formatting functions for use in templates
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    pluralizeEntityTypeCommonTitle: function(entityType) {
      return _.startCase(pluralize(entityType.commonTitle))
    },

    indefiniteArticle: function(...args) {
      return indefinite(...args)
    },

    pluralize: function(...args) {
      return pluralize(...args)
    },

    titleCase: function(s) {
      return _.startCase(_.lowerCase(s))
    },

    ...mapActions('myDraftBatches', { ensureDraftBatchesLoaded: 'ensureItemsLoaded' }),
  }
}

</script>

<style scoped>

/* Table and property sheet */

.sfs-table-and-property-sheet {
  display: flex;
  flex-direction: row;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

.sfs-page-header-and-table {
  flex: 1 2 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

.sfs-page-header {
  flex: 0 0 auto;
  position: relative;
  width: 100%;
  padding: 5px 10px;
}

.sfs-page-header-info {
  float: left;
}

.sfs-page-header .sfs-title {
  font-size: 19px;
  text-align: left;
}

.sfs-page-header .sfs-title:first-child:last-child {
  line-height: 37px;
}

.sfs-page-header .sfs-draft-info {
}

.sfs-page-header-controls {
  float: right;
}

.sfs-page-header-controls button {
  margin: 0 5px;
}

.sfs-page-header-controls button:first-child {
  margin: 0 5px 0 0;
}

.sfs-page-header-controls button:last-child {
  margin: 0 0 0 5px;
}

.sfs-page-header-and-table > .sfs-table {
  flex: 1 1 auto;
  position: relative;
  width: 100%;
}

.sfs-table-and-property-sheet > .sfs-property-sheet {
  flex: 0 0 584px;
  position: relative;
  height: 100%;
  overflow: auto;
}

.sfs-table-and-property-sheet > .sfs-detail-view-pane {
  flex: 0 0 584px;
  position: relative;
  height: 100%;
  overflow: auto;
}

/* Controls */

.sfs-detail-editor-view-choice {
  display: inline;
  margin: 0 5px;
}

/* Match .p-button-sm (almost). */
.sfs-detail-editor-view-choice >>> .p-button {
  font-size: 0.875rem;
  padding: 0.499625rem 0.65625rem;
}

</style>
