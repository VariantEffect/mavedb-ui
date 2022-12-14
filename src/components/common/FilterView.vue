<template>
  <div class="sfs-filter-view">
    <Button v-if="!filter" class="p-button-info p-button-sm" label="Filter" @click="toggleOverlay" />
    <FilterDescription v-if="filter" :filter="filter" :entityType="entityType" :filterProperties="filterProperties" @click="toggleOverlay" />
    <OverlayPanel ref="overlay">
      <div v-for="(clause, i) in clauses" :key="i">
        <Button icon="pi pi-plus" class="p-button-rounded p-button-outlined p-button-sm lims-add-remove-filter-button" @click="addClause(i + 1)" />
        <Button v-if="clauses.length > 1" icon="pi pi-minus" class="p-button-rounded p-button-outlined lims-add-remove-filter-button" @click="removeClause(i)" />
        <FilterClauseEditor v-model:clause="clauses[i]" :entityType="entityType" :filterProperties="filterProperties" />
      </div>
      <br />
      <br />
      <Button :disabled="!editedFilterIsValid" class="p-button-default p-button-sm" @click="applyFilter()">Apply filter</Button>
      &nbsp;
      <Button :disabled="!dirty" class="p-button-danger p-button-sm" @click="cancelChanges()">Cancel</Button>
      <br />
      <div v-if="quickFilters.length > 0">
        <br />
        Quick filters <i class="pi pi-question-circle" v-tooltip="'Hold Shift, Ctrl, Alt, or Command to add to existing filter'"></i><br />
        <span v-for="(quickFilter, i) of quickFilters" :key="i">
          <Button class="p-button-info p-button-sm" @click="applyQuickFilter($event, i)">{{quickFilter.title}}</Button>
          &nbsp;
        </span>
      </div>
    </OverlayPanel>
  </div>
</template>

<script>

import _ from 'lodash'
import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'
import Tooltip from 'primevue/tooltip'

import FilterDescription from '@/components/common/FilterDescription'
import FilterClauseEditor from '@/components/common/FilterClauseEditor'

// TODO Allow filters with more than one clause.

export default {
  name: 'FilterView',

  components: {Button, FilterDescription, FilterClauseEditor, OverlayPanel},
  emits: ['update:filter'],

  directives: {
    tooltip: Tooltip
  },

  props: {
    filter: {
      type: Object,
      default: () => null
    },
    entityType: {
      type: Object,
      required: true
    },
    filterProperties: {
      type: Array,
      required: true
    },
    quickFilters: {
      type: Array,
      default: () => []
    },
    filterRequired: {
      type: Boolean,
      default: true
    }
  },

  data: () => ({
    clauses: [null],
    editedFilter: null
  }),

  computed: {
    dirty: function() {
      return !_.isEqual(this.filter, this.editedFilter)
    },
    editedFilterIsValid: function() {
      // TODO Write a general filter validator. Here we assume there is just one clause, with an operator.
      const clauses = this.editedFilter.and || [this.editedFilter]
      return clauses.every((clause) => clause && clause.l && clause.r && clause.operator)
      // return (this.editedFilter && this.editedFilter.l && this.editedFilter.r && this.editedFilter.operator)
    }
  },

  watch: {
    filter: {
      handler: function(newValue) {
        console.log('filter changed')
        this.editedFilter = newValue
      },
      immediate: true
    },
    editedFilter: {
      handler: function(newValue, oldValue) {
        console.log('editedFilter changed')
        console.log(newValue)
        if (!_.isEqual(newValue, oldValue)) {
          this.clauses = newValue.and || [newValue]
          console.log(this.clauses)
        }
      },
      immediate: true
    },
    clauses: {
      handler: function(newValue, oldValue) {
        console.log('clauses changed')
        // console.log('Clause changed:', newValue)
        console.log(newValue)
        console.log(oldValue)
        if (newValue[0] != null) {
          const editedFilter = newValue.length > 1 ? {and: newValue} : newValue[0] || null
          if (!_.isEqual(editedFilter, this.editedFilter)) {
            this.editedFilter = editedFilter
          }
          console.log(this.editedFilter)
        }
        /*
        if (!_.isEqual(newValue, oldValue) && newValue != null) {
          this.editedFilter = newValue
        }
        */
      },
      deep: true
    }
  },

  methods: {
    addClause: function(insertionIndex) {
      this.clauses.splice(insertionIndex, 0, null)
    },

    removeClause: function(index) {
      this.clauses.splice(index, 1)
    },

    applyFilter: function() {
      console.log(this.editedFilterIsValid)
      console.log(this.editedFilter)
      if (this.editedFilterIsValid) {
        this.setFilter(this.editedFilter)
      }
    },

    applyQuickFilter: function(event, quickFilterIndex) {
      const quickFilter = this.quickFilters[quickFilterIndex]
      let newFilter = null
      if (event.altKey || event.metaKey || event.shiftKey) {
        newFilter = this.filter.and ? {and: [...this.filter.and, quickFilter.filter]} : {and: [this.filter, quickFilter.filter]}
      } else {
        newFilter = quickFilter.filter
      }
      this.setFilter(newFilter)
    },

    cancelChanges: function() {
      this.editedFilter = this.filter
    },

    setFilter: function(filter) {
      this.$emit('update:filter', filter)
    },

    toggleOverlay: function(event) {
      this.$refs.overlay.toggle(event)
    }
  }
}

</script>

<style scoped>

.p-button.p-button-icon-only.p-button-rounded.lims-add-remove-filter-button {
  height: 1.5rem;
  width: 1.5rem;
  margin: 2px;
  vertical-align: middle;
}

.sfs-filter-view {
  display: inline-block;
  vertical-align: bottom;
}

.sfs-filter-view:deep(.sfs-filter-clause-description) {
  font-family: Roboto, Helvetica Neue Light, Helvetica Neue, Helvetica, Arial, Lucida Grande, sans-serif;
}

</style>
