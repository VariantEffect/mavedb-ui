import _ from 'lodash'

// TODO Needs adjustment to handle related items within arrays.
export function findRelatedItemDefinitionsInSchema(schema, path, currentPath = []) {
  let relatedItems = []
  if (!_.isArray(path)) {
    path = path.split('.')
  }
  if (path.length == 0) {
    // TODO Warn about an invalid path
    return relatedItems
  }
  switch (schema.type) {
    case 'object':
      {
        if (schema.entityType) {
          relatedItems.push({path: currentPath.join('.'), schema})
        }
        const subschema = _.get(schema, ['properties', path[0]], null)
        if (!subschema) {
          // TODO Warn
        } else {
          relatedItems = relatedItems.concat(
            findRelatedItemDefinitionsInSchema(subschema, _.slice(path, 1), [...currentPath, path[0]])
          )
        }
      }
      break
    case 'array':
      {
        const subschema = _.get(schema, ['items'], null)
        if (!subschema) {
          // TODO Warn about missing items in schema
        } else {
          relatedItems = relatedItems.concat(
            findRelatedItemDefinitionsInSchema(subschema, _.slice(path, 1), [...currentPath, path[0]])
          )
        }
      }
      break
    default:
      break
  }
  return relatedItems
}

export function findPropertyInSchema(schema, path) {
  if (!_.isArray(path)) {
    path = path.split('.')
  }
  if (path.length == 0) {
    // TODO Warn about an invalid path
    return null
  }
  switch (schema.type) {
    case 'object': {
      const subschema = _.get(schema, ['properties', path[0]], null)
      if (path.length == 1 || subschema == null) {
        return subschema
      } else {
        return findPropertyInSchema(subschema, _.slice(path, 1))
      }
    }
    case 'array': {
      const subschema = _.get(schema, ['items'], null)
      if (subschema == null) {
        // TODO Warn about missing items in schema
        return null
      } else {
        return findPropertyInSchema(subschema, _.slice(path, 1))
      }
    }
    default:
      // TODO Warn that we're trying to find a property in a non-object schema.
      return null
  }
}

export function schemaPropertyIsRequired(schema, path) {
  if (!_.isArray(path)) {
    path = path.split('.')
  }
  switch (schema.type) {
    case 'object': {
      if (!(schema.required || []).includes(path[0])) {
        return false
      }
      const subschema = _.get(schema, ['properties', path[0]], null)
      if (path.length == 1 || subschema == null) {
        return true
      } else {
        return schemaPropertyIsRequired(subschema, _.slice(path, 1))
      }
    }
    default:
      return true
  }
}
