import _ from 'lodash'

/**
 * Recursively remove nullish properties and array elements from an object, as well as empty objects and arrays.
 *
 * @param {*} o - An object to clean. If this is not an object, it will be returned unchanged. (But the test for
 *   objecthood is Lodash's _.isObject function, which allows arrays, functions, regexes and some other things.)
 * @param {boolean} [allowEmptyArrays=false] - For future use; currently ignored.
 * @return {Object} - A deep copy of the object, with nullish properties and elements, empty objects, and empty arrays
 *   removed.
 */
 export function removeEmptyPropertiesAndElements(o) { // allowEmptyArrays = false) {
    // TODO Revise and support allowEmptyArrays
    function internalClean(el) {
      return _.transform(el, function(result, value, key) {
        const isCollection = _.isObject(value)
        const cleaned = isCollection ? internalClean(value) : value
  
        if (isCollection && _.isEmpty(cleaned)) {
          return
        }
  
        if (cleaned == null) {
          if (_.isArray(result)) {
            result.push(cleaned)
          }
        } else {
          _.isArray(result) ? result.push(cleaned) : (result[key] = cleaned)
        }
      })
    }
  
    return _.isObject(o) ? internalClean(o) : o
  }
  