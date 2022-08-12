<template>
  <div class="sfs-filter-clause">
    <div class="sfs-filter-clause-element">
      <Dropdown v-model="filterProperty" class="sfs-filter-property" :options="filterPropertyOptions" optionLabel="title" optionValue="value" placeholder="Property to filter" />
    </div>
    <div class="sfs-filter-clause-element sfs-filter-clause-value" v-if="dataType && dataType.type == 'string' && (dataType.format == 'date' || dataType.format == 'date-time')">
      <Calendar ref="calendar" v-model="value" class="sfs-filter-calendar" inputClass="p-inputtext-sm" selectionMode="range" @date-select="selectedDate" />
    </div>
    <div class="sfs-filter-clause-element sfs-filter-clause-value" v-if="dataType && dataType.type == 'string' && dataType.format != 'date' && dataType.format != 'date-time'">
      <InputText ref="valueText" type="text" v-model="value" class="p-inputtext-sm" />
    </div>
    <div class="sfs-filter-clause-element sfs-filter-clause-value" v-if="dataType && dataType.type == 'boolean'">
      <Dropdown ref="valueBooleanDropdown" class="sfs-filter-value-dropdown" v-model="value" :options="[{title: 'Yes', value: true}, {title: 'No', value: [false, null]}]" optionLabel="title" optionValue="value" />
    </div>
  </div>
</template>

<script>

import _ from 'lodash'
import moment from 'moment'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'

// - The clause must be a simple clause, i.e. one with left (l) and right (r) sides and no logical operators (and, or, not).
// - The left side may be
//   - A property, identified by path;
//   - A bare expression (such as a function call or coalesce expression) whose canonical form matches the expression
//     property of some element of filterProperties;
//   - Or a wrapped expression whose canonical form matches the expression property of some element of filterProperties.
// - The right side may be
//   - A constant
//   - Or a range consisting of constants.

export default {
  name: 'FilterClauseEditor',

  components: {Calendar, Dropdown, InputText},
  emits: ['update:clause'],

  props: {
    clause: {
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
    }
  },

  data: function() {
    return {
      filterProperty: null,
      value: null,
      valuesByType: {}
    }
  },

  computed: {
    filterPropertyOptions: function() {
      return this.filterProperties.map((filterProperty) => {
        if (filterProperty.path) {
          const property = this.findPropertyInSchema(filterProperty.path.split('.'), this.entityType.schema)
          if (!property) {
            return null
          }
          return {
            title: filterProperty.title || _.capitalize(_.lowerCase(_.last(filterProperty.path.split('.')))),
            value: filterProperty
          }
        } else if (filterProperty.text) {
          return {
            title: filterProperty.title || 'Any text',
            value: filterProperty
          }
        } else if (filterProperty.expression) {
          if (!filterProperty.title) {
            return null
          }
          return {
            title: filterProperty.title,
            value: filterProperty
          }
        } else {
          return null
        }
      }).filter((option) => option != null)
    },

    // /////////////////////////////////////////////////////////////////////////////////////////////////
    // Properties calculated from user input
    // /////////////////////////////////////////////////////////////////////////////////////////////////

    dataType: function() {
      if (this.filterProperty == null) {
        return null
      }
      if (this.filterProperty.dataType) {
        return this.filterProperty.dataType
      } else if (this.filterProperty.path) {
        const property = this.findPropertyInSchema(this.filterProperty.path.split('.'), this.entityType.schema)
        if (!property) {
          return null
        }
        return {
          type: property.type,
          format: property.format
        }
      } else if (this.filterProperty.text) {
        return {type: 'string'}
      } else {
        return null
      }
    },

    dataTypeStr: function() {
      if (this.dataType == null) {
        return null
      }
      return [this.dataType.type, this.dataType.format].filter((x) => x != null).join(':')
    },

    // TODO Base this on user's selection of operator
    rangeValueExpected: function() {
      const type = _.get(this.dataType, 'type')
      const format = _.get(this.dataType, 'format')
      switch (type) {
        case 'string':
          switch (format) {
            case 'date':
            case 'date-time':
              return true
            default:
              return false
          }
        default:
        return false
      }
    },

    rightSide: function() {
      const value = this.valuesByType[this.dataTypeStr]
      if (this.dataType.type == 'string' && this.dataType.format == 'date') {
        if (!value || value.length != 2 || !value[0] || !value[1]) {
          return null
        }
        return {range: [
          {constant: new moment(value[0]).format('YYYY-MM-DD')},
          {constant: new moment(value[1]).format('YYYY-MM-DD')}
        ]}
      } else if (this.dataType.type == 'string' && this.dataType.format == 'date-time') {
        if (!value || value.length != 2 || !value[0] || !value[1]) {
          return null
        }
        return {range: [
          {constant: new moment(value[0]).toISOString()},
          {constant: new moment(value[1]).add(1, 'days').subtract(1, 'milliseconds').toISOString()}
        ]}
      } else if (this.dataType.type == 'string') {
        if (!value || value.length == 0) {
          return null
        }
        return {constant: value}
      } else if (this.dataType.type == 'boolean') {
        if (value == null) {
          return null
        }
        return {constant: value}
      }
      return null
    },

    currentClause: function() {
      if (this.filterProperty == null) { //} || this.dataType == null) {
        return null
      }
      const leftSide = this.filterProperty.path ? {path: this.filterProperty.path}
          : this.filterProperty.text ? {text: this.filterProperty.text}
          : this.filterProperty.expression
      if (leftSide == null) {
        return null
      }
      const rightSide = this.rightSide
      if (rightSide == null) {
        return {l: leftSide} // Return an incomplete clause.
      }
      if (this.dataType.type == 'string' && ['date', 'date-time'].includes(this.dataType.format)) {
        return {l: leftSide, r: rightSide, operator: 'between'}
      } else if (this.dataType.type == 'string') {
        return {l: leftSide, r: rightSide, operator: 'contains'}
      } else {
        // TODO This is a kluge to decide whether the operator should be IN or =. We shouldn't really depend on
        // rightSide.constant.
        const operator = (rightSide.constant && _.isArray(rightSide.constant)) ? 'in' : '='
        return {l: leftSide, r: rightSide, operator}
      }
      // return null
    },

    completeCurrentClause: function() {
      if (this.currentClause && this.currentClause.l && this.currentClause.r && this.currentClause.operator) {
        return this.currentClause
      }
      return this.clause
    },

    // /////////////////////////////////////////////////////////////////////////////////////////////////
    // Properties calculated from the clause prop
    // /////////////////////////////////////////////////////////////////////////////////////////////////

    filterPropertyFromClause: function() {
      let leftSide = _.get(this.clause, 'l', null)
      if (!leftSide) {
        return null
      }
      if (leftSide.path) {
        return this.filterProperties.find((fp) => fp.path == leftSide.path)
      } else if (leftSide.text) {
        return this.filterProperties.find((fp) => fp.text == leftSide.text)
      } else {
        while (leftSide.expression) {
          leftSide = leftSide.expression
        }
        return this.filterProperties.find((fp) => _.isEqual(fp.expression, leftSide))
      }
    },

    valueFromClause: function() {
      const rightSide = _.get(this.clause, 'r', null)
      if (!rightSide) {
        return null
      }
      if (rightSide.constant != null) {
        return this.valueFromClauseValue(rightSide.constant, this.dataType, false)
      } else if (rightSide.range) {
        if (_.isArray(rightSide.range) && rightSide.range.length == 2 && rightSide.range[0].constant && rightSide.range[1].constant) {
          return [
            this.valueFromClauseValue(rightSide.range[0].constant, this.dataType, true),
            this.valueFromClauseValue(rightSide.range[1].constant, this.dataType, true)
          ]
        }
      }
      return null
    }
  },

  watch: {
    filterProperty: {
      handler: function() {
        // console.log('Filter property changed:', this.filterProperty)
        if (this.dataTypeStr && (this.value != this.valuesByType[this.dataTypeStr])) {
          this.value = this.valuesByType[this.dataTypeStr]
          // console.log(`Fetched cached value of type ${this.dataTypeStr}`, this.value)
        }
      }
    },
    value: {
      handler: function(newValue) {
        if (this.dataTypeStr) {
          // console.log(`Caching value of type ${this.dataTypeStr}:`, newValue)
          this.valuesByType[this.dataTypeStr] = newValue
        }
      }
    },
    completeCurrentClause: {
      handler: function(newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          // console.log('Emitting new clause:', _.cloneDeep(newValue))
          this.$emit('update:clause', newValue)
        }
      }
    },
    clause: {
      handler: function() {
        // console.log('Clause prop was set:', this.clause)
        this.filterProperty = this.filterPropertyFromClause
        this.dataType // Force recalculation before we get the right-side value.
        this.value = this.valueFromClause
      },
      immediate: true
    }
  },

  methods: {
    valueFromClauseValue(valueFromClause, dataType, isFromRange) {
      if (valueFromClause == null) {
        return valueFromClause
      }

      const type = _.get(dataType, 'type', null)
      const format = _.get(dataType, 'format', null)

      switch (type) {
        case 'string':
          switch (format) {
            case 'date-time':
              if (isFromRange) {
                return new moment(valueFromClause).startOf('day').toDate() //.format('YYYY-MM-DD')
              //} else if (indexInRange != null) {
              //  return new moment(valueFromClause).toDate() //.format('YYYY-MM-DD')
              }
              return valueFromClause
            case 'date':
              return new moment(valueFromClause).toDate()
            default:
              return valueFromClause
          }
        default:
          return valueFromClause
      }
    },

    selectedDate: function() {
      if (this.value && this.value.length == 2 && this.value[0] && this.value[1]) {
        this.$refs.calendar.overlayVisible = false
      }
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
    }
  }
}

</script>

<style scoped>

.sfs-filter-clause {
  display: inline-block;
  white-space: nowrap;
}

.sfs-filter-clause-element {
  display: inline-block;
  margin: 0 5px;
}

</style>

<style>

.sfs-filter-value-dropdown > span,
.sfs-filter-property > span {
  height: 30.5px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 0.875rem;
  line-height: 30.5px;
}

.sfs-filter-clause-value > input.p-inputtext.p-inputtext-sm,
.sfs-filter-calendar > input.p-inputtext.p-inputtext-sm {
  height: 32.5px;
}

</style>
