<template>
  <div class="sfs-filter-clause-description">
    {{text}}
  </div>
</template>

<script>

import _ from 'lodash'
import moment from 'moment'

export default {
  name: 'FilterClauseDescription',

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

  computed: {
    text: function() {
      return this.clauseText(this.clause) || ''
    }
  },

  methods: {
    filterPropertyTitle: function(filterProperty) {
      if (filterProperty == null) {
        return null
      }
      if (filterProperty.path) {
        return filterProperty.title || _.capitalize(_.lowerCase(_.last(filterProperty.path.split('.'))))
      }
      if (filterProperty.text) {
        return filterProperty.title || 'Any text'
      }
      return filterProperty.title
    },

    filterPropertyDataType: function(filterProperty) {
      if (filterProperty == null) {
        return null
      }
      if (filterProperty.dataType) {
        return filterProperty.dataType
      } else if (filterProperty.path) {
        const property = this.findPropertyInSchema(filterProperty.path.split('.'), this.entityType.schema)
        if (!property) {
          return null
        }
        return {
          type: property.type,
          format: property.format
        }
      } else if (filterProperty.text) {
        return {type: 'string'}
      } else {
        return null
      }
    },

    expressionDataType: function(expression) {
      if (expression.path) {
        const filterProperty = this.filterProperties.find((fp) => fp.path == this.clause.l.path)
        return filterProperty ? this.filterPropertyDataType(filterProperty) : null
      } if (expression.text) {
        return {type: 'string'}
      } else if (expression.expression) {
        const canonicalizedExpression = expression.expression // TODO
        const filterProperty = this.filterProperties.find((fp) => _.isEqual(fp.expression, canonicalizedExpression))
        if (filterProperty) {
          return this.filterPropertyDataType(filterProperty)
        }
        return this.expressionDataType(expression.expression)
      }
    },

    expressionText: function(expression, dataType = null) {
      if (expression.path) {
        const filterProperty = this.filterProperties.find((fp) => fp.path == this.clause.l.path)
        return filterProperty ? this.filterPropertyTitle(filterProperty) : null
      } else if (expression.text) {
        const filterProperty = this.filterProperties.find((fp) => fp.text == this.clause.l.text)
        return filterProperty ? this.filterPropertyTitle(filterProperty) : 'Any text'
      } else if (expression.expression) {
        return this.expressionText(expression.expression)
      } else if (expression.range) {
        return this.rangeText(expression.range)
      } else if (expression.constant != null) {
        const type = _.get(dataType, 'type', 'string')
        const format = _.get(dataType, 'format', null)
        switch (type) {
          case 'string':
            switch (format) {
              case 'date':
                return new moment(expression.constant).format('YYYY-MM-DD')
              case 'date-time':
                // TODO We currently assume that the granularity is really 'day'
                return new moment(expression.constant).format('YYYY-MM-DD')
              default:
                return expression.constant.toString()
            }
          case 'boolean':
            if (_.isArray(expression.constant) && _.xor(expression.constant, [false, null]).length == 0) {
              return 'No'
            } else {
              return expression.constant ? 'Yes' : 'No'
            }
        }
      } else {
        const canonicalizedExpression = expression // TODO
        const filterProperty = this.filterProperties.find((fp) => _.isEqual(fp.expression, canonicalizedExpression))
        if (filterProperty) {
          return this.filterPropertyTitle(filterProperty)
        }
        return null
      }
    },

    rangeText: function(range) {
      if (!range || !_.isArray(range) || range.length != 2) {
        return null
      }
      const min = this.expressionText(range[0])
      const max = this.expressionText(range[1])
      if (min && max) {
        return `${min} to ${max}`
      } else if (min) {
        return `>= ${min}`
      } else if (max) {
        return `<= ${min}`
      } else {
        return null
      }
    },

    clauseText: function(clause) {
      if (!clause.l || !clause.r) {
        return null
      }
      // Infer the data type from whichever side has a filter property.
      const dataType = this.expressionDataType(clause.l) || this.expressionDataType(clause.r)
      const leftText = this.expressionText(clause.l, dataType)
      const rightText = this.expressionText(clause.r, dataType)
      if (!leftText || !rightText) {
        return null
      }
      switch (clause.operator) {
        case 'contains':
          return `${leftText} contains ${rightText}`
        default:
          return `${leftText}: ${rightText}`
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

.sfs-filter-clause-description {
  display: inline-flex;
  height: 32.5px;
  padding: 0 4px;
  max-width: 250px;
  min-width: 100px;
  margin: 0 5px;
  background: #2196f3;
  cursor: pointer;
  font-size: 12px;
  color: #fff;
  border-radius: 5px;
  align-items: center;
  justify-content: center;
  vertical-align: bottom;
  overflow: hidden;
}

</style>
