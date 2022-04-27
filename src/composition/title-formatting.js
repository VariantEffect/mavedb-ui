import _ from 'lodash'
import indefinite from 'indefinite'
import pluralize from 'pluralize'

export default () => {
  return {
    indefiniteArticle: function(...args) {
      return indefinite(...args)
    },
    pluralize: function(...args) {
      return pluralize(...args)
    },
    pluralizeEntityTypeCommonTitle: function(entityType) {
      return _.startCase(pluralize(entityType.commonTitle))
    },
    titleCase: function(s) {
      return _.startCase(_.lowerCase(s))
    }
  }
}
